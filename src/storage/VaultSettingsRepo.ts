import { db } from './db';
import { VaultSettingsDTO } from '../api/vaultApi';
import { SecurityLogger } from '../utils/SecurityLogger';

export const VaultSettingsRepo = {

    get(userId: string): VaultSettingsDTO | null {
        try {
            const results = db.execute('SELECT * FROM vault_settings WHERE user_id = ?', [userId]);
            if (results.rows && results.rows.length > 0) {
                const raw = results.rows.item(0);
                return {
                    ...raw,
                    argon2_params_mp: JSON.parse(raw.argon2_params_mp),
                    argon2_params_rk: raw.argon2_params_rk ? JSON.parse(raw.argon2_params_rk) : null,
                } as VaultSettingsDTO;
            }
            return null;
        } catch (e) {
            SecurityLogger.error('VaultSettingsRepo', 'get error', e);
            return null;
        }
    },

    save(settings: VaultSettingsDTO) {
        try {
            db.execute(
                `INSERT OR REPLACE INTO vault_settings (
           user_id, salt_mp, argon2_params_mp, 
           wrapped_mk_mp, wrapped_mk_mp_nonce,
           salt_rk, argon2_params_rk,
           wrapped_mk_rk, wrapped_mk_rk_nonce,
           vault_status, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    settings.user_id,
                    settings.salt_mp,
                    JSON.stringify(settings.argon2_params_mp),
                    settings.wrapped_mk_mp,
                    settings.wrapped_mk_mp_nonce,
                    settings.salt_rk || null,
                    settings.argon2_params_rk ? JSON.stringify(settings.argon2_params_rk) : null,
                    settings.wrapped_mk_rk || null,
                    settings.wrapped_mk_rk_nonce || null,
                    settings.vault_status,
                    settings.updated_at
                ]
            );
        } catch (e) {
            SecurityLogger.error('VaultSettingsRepo', 'save error', e);
            throw e;
        }
    },

    wipeLocal(userId: string) {
        db.execute('DELETE FROM vault_settings WHERE user_id = ?', [userId]);
        db.execute('DELETE FROM vault_items WHERE user_id = ?', [userId]);
    }
};
