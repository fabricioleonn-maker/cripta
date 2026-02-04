import { QuickSQLiteConnection, open } from 'react-native-quick-sqlite';
import { SecurityLogger } from '../utils/SecurityLogger';

export const db = open({ name: 'cripta_vault.db' });

export const initDatabase = () => {
  try {
    // Vault Settings Table
    db.execute(`
            CREATE TABLE IF NOT EXISTS vault_settings (
                user_id TEXT PRIMARY KEY,
                salt_mp TEXT NOT NULL,
                argon2_params_mp TEXT NOT NULL, 
                wrapped_mk_mp TEXT NOT NULL,
                wrapped_mk_mp_nonce TEXT NOT NULL,
                
                -- Recovery Fields (Added Gate 9)
                salt_rk TEXT,
                argon2_params_rk TEXT,
                wrapped_mk_rk TEXT,
                wrapped_mk_rk_nonce TEXT,

                vault_status TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        `);

    // Migration for existing tables without recovery fields (Simple approach)
    try {
      db.execute('ALTER TABLE vault_settings ADD COLUMN salt_rk TEXT');
      db.execute('ALTER TABLE vault_settings ADD COLUMN argon2_params_rk TEXT');
      db.execute('ALTER TABLE vault_settings ADD COLUMN wrapped_mk_rk TEXT');
      db.execute('ALTER TABLE vault_settings ADD COLUMN wrapped_mk_rk_nonce TEXT');
    } catch (e) {
      // Ignore error if columns exist
    }

    // Vault Items (for offline cache)
    db.execute(`
            CREATE TABLE IF NOT EXISTS vault_items (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                kind TEXT NOT NULL,
                ciphertext TEXT NOT NULL, 
                nonce TEXT NOT NULL,
                wrapped_dek TEXT NOT NULL,
                wrapped_dek_nonce TEXT NOT NULL,
                version INTEGER NOT NULL,
                deleted_at TEXT,
                file_ref TEXT,
                updated_at TEXT,
                sync_state TEXT DEFAULT 'clean' -- 'clean', 'dirty', 'error'
            );
        `);

    // Sync Queue Table (optional, or just use sync_state on items)
    // We use sync_state column for simplicity.

    SecurityLogger.info('DB', 'Database initialized locally');

  } catch (e) {
    SecurityLogger.error('DB', 'Failed to init database', e);
    // Fail hard? MVP: just log.
  }
};
