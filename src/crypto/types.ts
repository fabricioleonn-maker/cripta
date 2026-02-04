export const KEY_LENGTH = 32;
export const NONCE_LENGTH = 12; // 96-bit for AES-GCM
export const SALT_LENGTH = 16;
export const TAG_LENGTH = 16;

export interface Argon2Params {
    iterations: number;
    memory: number; // in KB
    parallelism: number;
    hashLength: number;
}

// OWASP recommnds: 19 MiB memory, 2 iterations, 1 degree of parallelism
export const Arg2ParamsDefault: Argon2Params = {
    iterations: 2,
    memory: 19456,
    parallelism: 1,
    hashLength: 32
};

// Simplified types for compatibility with react-native-quick-crypto (which uses Uint8Array/Buffer)
export type MasterKey = Uint8Array;
export type DEK = Uint8Array;
export type KEK = Uint8Array;

export interface EncryptedKey {
    cipherText: string; // Base64
    nonce: string;      // Base64
    aad: string;       // Associated Data used
}

export interface EncryptedPayload {
    cipherText: string; // Base64
    nonce: string;      // Base64
    aad: string;       // Header verification
}

export interface VaultHeader {
    user_id: string;
    item_id: string;
    kind: string; // password, note, file...
    crypto_version: number;
    version: number;
    created_at: number;
    updated_at: number;
}
