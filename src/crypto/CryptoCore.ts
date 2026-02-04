import QuickCrypto from 'react-native-quick-crypto';
import { Buffer } from 'buffer';
import { SecurityLogger } from '../utils/SecurityLogger';
import { Argon2Params, DEK, EncryptedKey, EncryptedPayload, KEK, MasterKey, VaultHeader } from './types';

// Constants
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const NONCE_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * CryptoCore
 * Handles all Zero-Knowledge encryption/decryption.
 * 
 * Rules:
 * 1. Never log keys.
 * 2. Always use random nonces.
 * 3. Authenticate everything (AEAD).
 */
export const CryptoCore = {

    /**
     * Generates a secure random 32-byte Key (MK or DEK).
     */
    generateKey: (): Uint8Array => {
        const bytes = QuickCrypto.randomBytes(KEY_LENGTH);
        return new Uint8Array(bytes);
    },

    /**
     * Generates a random nonce.
     */
    generateNonce: (): Uint8Array => {
        const bytes = QuickCrypto.randomBytes(NONCE_LENGTH);
        return new Uint8Array(bytes);
    },

    /**
     * Derives KEK from Master Password using Argon2id.
     * NOTE: This requires a native Argon2 library. 
     * For MVP/Mock purposes in this file, we simulate it with PBKDF2 if Argon2 isn't linked,
     * but in production you MUST use `react-native-argon2` or similar.
     */
    deriveKEK: async (password: string, salt: string, params: Argon2Params): Promise<KEK> => {
        // TODO: INTEGRATE REAL REACT-NATIVE-ARGON2 HERE.
        // Fallback/Placeholder using PBKDF2 for now to ensure code structure works 
        // without crashing if native lib is missing in dev.
        return new Promise((resolve, reject) => {
            try {
                const key = QuickCrypto.pbkdf2Sync(
                    password,
                    salt,
                    params.iterations,
                    KEY_LENGTH,
                    'sha512'
                );
                resolve(key);
            } catch (e) {
                SecurityLogger.error('CryptoCore', 'KEK derivation failed', e);
                reject(e);
            }
        });
    },

    /**
     * Encrypts a Key (MK or DEK) using a wrapping key (KEK or MK).
     * Returns Base64 format.
     */
    wrapKey: (keyToWrap: Uint8Array, wrappingKey: Uint8Array, aad: string): EncryptedKey => {
        try {
            if (wrappingKey.length !== KEY_LENGTH) throw new Error('Invalid wrapping key length');

            const nonce = CryptoCore.generateNonce();
            const cipher = QuickCrypto.createCipheriv(ALGORITHM, Buffer.from(wrappingKey) as any, Buffer.from(nonce) as any, {
                authTagLength: AUTH_TAG_LENGTH
            }) as any;

            cipher.setAAD(Buffer.from(aad, 'utf8'));

            const encrypted = Buffer.concat([cipher.update(Buffer.from(keyToWrap) as any), cipher.final()]);
            const authTag = cipher.getAuthTag();

            // Combine ciphertext + authTag for storage (common convention)
            // Or keep them separate. Here we append tag to ciphertext.
            const finalCiphertext = Buffer.concat([encrypted, authTag]);

            return {
                cipherText: finalCiphertext.toString('base64'),
                nonce: Buffer.from(nonce).toString('base64'),
                aad
            };
        } catch (e) {
            SecurityLogger.error('CryptoCore', 'Key wrap failed', e);
            throw e;
        }
    },

    /**
     * Decrypts a wrapped key.
     */
    unwrapKey: (wrapped: EncryptedKey, wrappingKey: Uint8Array): Uint8Array => {
        try {
            const nonce = Buffer.from(wrapped.nonce, 'base64');
            const fullCiphertext = Buffer.from(wrapped.cipherText, 'base64');

            // Extract Auth Tag (last 16 bytes)
            const authTag = fullCiphertext.subarray(fullCiphertext.length - AUTH_TAG_LENGTH);
            const cipherText = fullCiphertext.subarray(0, fullCiphertext.length - AUTH_TAG_LENGTH);

            const decipher = QuickCrypto.createDecipheriv(ALGORITHM, Buffer.from(wrappingKey) as any, nonce as any, {
                authTagLength: AUTH_TAG_LENGTH
            }) as any;

            decipher.setAAD(Buffer.from(wrapped.aad, 'utf8'));
            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
            return new Uint8Array(decrypted);
        } catch (e) {
            SecurityLogger.error('CryptoCore', 'Key unwrap failed - BAD MAC?', e);
            throw new Error('Decryption failed');
        }
    },

    /**
     * Encrypts generic JSON payload using DEK.
     * Accepts header object OR string AAD.
     */
    encryptJSON: (data: object, dek: DEK, headerOrAad: VaultHeader | string): EncryptedPayload => {
        try {
            const plaintext = JSON.stringify(data);
            const aad = typeof headerOrAad === 'string' ? headerOrAad : JSON.stringify(headerOrAad);
            const nonce = CryptoCore.generateNonce();

            const cipher = QuickCrypto.createCipheriv(ALGORITHM, Buffer.from(dek) as any, Buffer.from(nonce) as any, {
                authTagLength: AUTH_TAG_LENGTH
            }) as any;

            cipher.setAAD(Buffer.from(aad, 'utf8'));

            const encrypted = Buffer.concat([
                cipher.update(Buffer.from(plaintext, 'utf8')),
                cipher.final()
            ]);
            const authTag = cipher.getAuthTag();
            const finalCiphertext = Buffer.concat([encrypted, authTag]);

            return {
                cipherText: finalCiphertext.toString('base64'),
                nonce: Buffer.from(nonce).toString('base64'),
                aad
            };
        } catch (e) {
            SecurityLogger.error('CryptoCore', 'Encrypt JSON failed', e);
            throw e;
        }
    },

    /**
     * Decrypts generic JSON payload.
     */
    decryptJSON: <T>(payload: EncryptedPayload, dek: DEK): T => {
        try {
            const nonce = Buffer.from(payload.nonce, 'base64');
            const fullCiphertext = Buffer.from(payload.cipherText, 'base64');

            const authTag = fullCiphertext.subarray(fullCiphertext.length - AUTH_TAG_LENGTH);
            const cipherText = fullCiphertext.subarray(0, fullCiphertext.length - AUTH_TAG_LENGTH);

            const decipher = QuickCrypto.createDecipheriv(ALGORITHM, Buffer.from(dek) as any, nonce as any, {
                authTagLength: AUTH_TAG_LENGTH
            }) as any;

            decipher.setAAD(Buffer.from(payload.aad || '', 'utf8')); // Handle missing AAD gracefully if legacy? No strict.
            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
            const jsonString = decrypted.toString('utf8');

            return JSON.parse(jsonString) as T;
        } catch (e) {
            SecurityLogger.error('CryptoCore', 'Decrypt JSON failed', e);
            throw new Error('Decryption failed');
        }
    },

    /**
     * Best-effort buffer clearing.
     */
    zeroBuffer: (buf: Uint8Array | Buffer) => {
        if (!buf) return;
        for (let i = 0; i < buf.length; i++) {
            buf[i] = 0;
        }
    }
};
