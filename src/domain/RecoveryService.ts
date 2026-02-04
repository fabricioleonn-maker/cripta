import { CryptoCore } from '../crypto/CryptoCore';
import { VaultSettingsRepo } from '../storage/VaultSettingsRepo';
import { SecurityLogger } from '../utils/SecurityLogger';
import { VaultSession } from '../security/VaultSession';
import { Arg2ParamsDefault, KEY_LENGTH } from '../crypto/types';

export const RecoveryService = {

    /**
     * Generates a new Recovery Key (random high entropy string)
     */
    generateRecoveryKey(): string {
        // 32 bytes of entropy for 256-bit security
        const entropy = CryptoCore.generateKey(); // Returns ArrayBuffer of KEY_LENGTH (32)
        // Convert ArrayBuffer to Hex String
        return Buffer.from(entropy).toString('hex');
    },

    /**
     * Sets up recovery for the first time or rotates it.
     */
    async setupRecovery(recoveryKeyHex: string) {
        try {
            const mk = VaultSession.getMasterKey();
            if (!mk) throw new Error('Vault Locked');

            const userId = 'user-1';
            const settings = VaultSettingsRepo.get(userId);
            if (!settings) throw new Error('Settings not found');

            const salt_rk = Buffer.from(CryptoCore.generateNonce()).toString('base64');

            // Derive KEK from RK
            const kek_rk = await CryptoCore.deriveKEK(recoveryKeyHex, salt_rk, Arg2ParamsDefault);

            // Wrap MK with KEK_rk
            const wrappedMkRk = CryptoCore.wrapKey(mk, kek_rk, 'Recovery');

            // Update Settings
            VaultSettingsRepo.save({
                ...settings,
                salt_rk,
                argon2_params_rk: Arg2ParamsDefault,
                wrapped_mk_rk: wrappedMkRk.cipherText,
                wrapped_mk_rk_nonce: wrappedMkRk.nonce,
                updated_at: new Date().toISOString()
            });

            SecurityLogger.info('RecoveryService', 'Recovery Key configured successfully');

        } catch (e) {
            SecurityLogger.error('RecoveryService', 'Setup failed', e);
            throw e;
        }
    },

    async recoverVault(recoveryKeyHex: string, newMasterPassword: string) {
        try {
            const userId = 'user-1';
            const settings = VaultSettingsRepo.get(userId);
            if (!settings || !settings.salt_rk || !settings.wrapped_mk_rk) {
                throw new Error('Recovery not set up');
            }

            // 1. Derive KEK_rk
            const kek_rk = await CryptoCore.deriveKEK(
                recoveryKeyHex,
                settings.salt_rk,
                settings.argon2_params_rk!
            );

            // 2. Unwrap MK
            const mk = CryptoCore.unwrapKey({
                cipherText: settings.wrapped_mk_rk!,
                nonce: settings.wrapped_mk_rk_nonce!,
                aad: 'Recovery'
            }, kek_rk);

            // 3. New MP setup
            const new_salt_mp = Buffer.from(CryptoCore.generateNonce()).toString('base64');
            const kek_mp = await CryptoCore.deriveKEK(newMasterPassword, new_salt_mp, Arg2ParamsDefault);

            // 4. Wrap MK with new MP
            const wrappedMkMp = CryptoCore.wrapKey(mk, kek_mp, 'MasterKey');

            // 5. Save
            VaultSettingsRepo.save({
                ...settings,
                salt_mp: new_salt_mp,
                argon2_params_mp: Arg2ParamsDefault,
                wrapped_mk_mp: wrappedMkMp.cipherText,
                wrapped_mk_mp_nonce: wrappedMkMp.nonce,
                updated_at: new Date().toISOString()
            });

            SecurityLogger.info('RecoveryService', 'Vault recovered and MP rotated');
        } catch (e) {
            SecurityLogger.error('RecoveryService', 'Recovery failed', e);
            throw e;
        }
    }
};
