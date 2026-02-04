-- Enable Row Level Security
ALTER TABLE auth.users FORCE ROW LEVEL SECURITY;

-- VAULT SETTINGS (One per user)
-- Stores the wrapped Master Keys (MK) protected by Master Password (MP) and Recovery Key (RK).
CREATE TABLE public.vault_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Master Password KEK params (Public)
  salt_mp TEXT NOT NULL,
  argon2_params_mp JSONB NOT NULL,
  
  -- Wrapped MK (with MP)
  wrapped_mk_mp TEXT NOT NULL, -- Base64
  wrapped_mk_mp_nonce TEXT NOT NULL, -- Base64
  
  -- Recovery Key KEK params (Public)
  salt_rk TEXT,
  argon2_params_rk JSONB,
  
  -- Wrapped MK (with RK)
  wrapped_mk_rk TEXT, -- Base64
  wrapped_mk_rk_nonce TEXT, -- Base64
  
  -- Metadata
  crypto_alg TEXT DEFAULT 'XChaCha20-Poly1305',
  crypto_version INT DEFAULT 1,
  
  -- Status
  vault_status TEXT DEFAULT 'active' CHECK (vault_status IN ('active', 'pending_wipe', 'wiped')),
  wipe_requested_at TIMESTAMPTZ,
  wipe_confirmed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Only the owner can select/insert/update
ALTER TABLE public.vault_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own settings" ON public.vault_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- VAULT ITEMS (Passwords, Notes, Documents)
-- Content is fully encrypted (ciphertext). Metadata is minimal.
CREATE TABLE public.vault_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  kind TEXT NOT NULL CHECK (kind IN ('password', 'secure_note', 'document', 'image')),
  
  -- Encrypted Data Payload (JSON)
  ciphertext TEXT NOT NULL, -- Base64
  nonce TEXT NOT NULL, -- Base64
  
  -- Wrapped Data Encryption Key (DEK) for this item
  wrapped_dek TEXT NOT NULL, -- Base64
  wrapped_dek_nonce TEXT NOT NULL, -- Base64
  
  -- Optimistic Concurrency & Sync
  version INT DEFAULT 1,
  deleted_at TIMESTAMPTZ, -- Soft delete for sync
  
  -- File references (Blind)
  file_ref TEXT, -- UUID or Path pointer to Storage
  file_size BIGINT,
  mime_type TEXT, -- Optional, can serve as hint
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Only the owner can touch items
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own items" ON public.vault_items
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- INDEXES
CREATE INDEX idx_vault_items_user_updated ON public.vault_items(user_id, updated_at);
CREATE INDEX idx_vault_items_sync ON public.vault_items(user_id, version);

-- TRIGGER: Update timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vault_settings_time BEFORE UPDATE ON public.vault_settings FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
CREATE TRIGGER update_vault_items_time BEFORE UPDATE ON public.vault_items FOR EACH ROW EXECUTE PROCEDURE update_timestamp();


-- RPC: Request Wipe
CREATE OR REPLACE FUNCTION vault_request_wipe()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.vault_settings
  SET vault_status = 'pending_wipe',
      wipe_requested_at = NOW()
  WHERE user_id = auth.uid();
END;
$$;

-- RPC: Confirm Wipe (Destructive)
CREATE OR REPLACE FUNCTION vault_confirm_wipe()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := auth.uid();

  -- Verify pending status
  IF_NOT_EXISTS (SELECT 1 FROM public.vault_settings WHERE user_id = target_user_id AND vault_status = 'pending_wipe') THEN
    RAISE EXCEPTION 'Wipe not requested';
  END IF;

  -- 1. Hard Delete Items
  DELETE FROM public.vault_items WHERE user_id = target_user_id;
  
  -- 2. Reset Settings (Keep row, but clear keys)
  UPDATE public.vault_settings
  SET wrapped_mk_mp = '',
      wrapped_mk_mp_nonce = '',
      wrapped_mk_rk = NULL,
      wrapped_mk_rk_nonce = NULL,
      vault_status = 'wiped',
      wipe_confirmed_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Note: Storage files must be deleted via Storage API or specific trigger logic separately.
END;
$$;
