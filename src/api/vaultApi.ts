import { supabase } from './supabase';
import { VaultHeader, EncryptedKey, EncryptedPayload, Argon2Params } from '../crypto/types';
import { SecurityLogger } from '../utils/SecurityLogger';

/**
 * VaultSettingsDTO
 * Matches the 'vault_settings' table structure.
 */
export interface VaultSettingsDTO {
    user_id: string;
    salt_mp: string;
    argon2_params_mp: Argon2Params;
    wrapped_mk_mp: string;
    wrapped_mk_mp_nonce: string;

    // Recovery Fields
    salt_rk?: string;
    argon2_params_rk?: Argon2Params;
    wrapped_mk_rk?: string;
    wrapped_mk_rk_nonce?: string;

    vault_status: 'active' | 'pending_wipe' | 'wiped';
    updated_at: string;
}

export interface VaultItemDTO {
    id?: string;
    user_id: string;
    kind: string;
    ciphertext: string;
    nonce: string;
    wrapped_dek: string;
    wrapped_dek_nonce: string;
    version: number;
    deleted_at?: string | null;
    file_ref?: string;
    updated_at?: string;
}

export const VaultApi = {

    async getSettings(): Promise<VaultSettingsDTO | null> {
        const { data, error } = await supabase
            .from('vault_settings')
            .select('*')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            SecurityLogger.error('VaultApi', 'getSettings error', error);
            throw error;
        }

        return data as VaultSettingsDTO;
    },

    async upsertSettings(settings: Partial<VaultSettingsDTO>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const payload = {
            ...settings,
            user_id: user.id,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('vault_settings')
            .upsert(payload);

        if (error) {
            SecurityLogger.error('VaultApi', 'upsertSettings error', error);
            throw error;
        }
    },

    async syncItems(lastVersion: number): Promise<VaultItemDTO[]> {
        const { data, error } = await supabase
            .from('vault_items')
            .select('*')
            .gt('version', lastVersion)
            .order('version', { ascending: true });

        if (error) {
            SecurityLogger.error('VaultApi', 'syncItems error', error);
            throw error;
        }
        return data as VaultItemDTO[];
    },

    async pushItem(item: VaultItemDTO): Promise<VaultItemDTO> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const payload = {
            ...item,
            user_id: user.id,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('vault_items')
            .upsert(payload)
            .select()
            .single();

        if (error) {
            SecurityLogger.error('VaultApi', 'pushItem error', error);
            throw error;
        }
        return data as VaultItemDTO;
    },

    async requestWipe(): Promise<void> {
        const { error } = await supabase.rpc('vault_request_wipe');
        if (error) throw error;
    },

    async confirmWipe(): Promise<void> {
        const { error } = await supabase.rpc('vault_confirm_wipe');
        if (error) throw error;
    }
};
