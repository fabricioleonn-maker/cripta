import QuickCrypto from 'react-native-quick-crypto';
import RNFS from 'react-native-fs'; // Assumed linked
import { CryptoCore } from '../crypto/CryptoCore';
import { DEK } from '../crypto/types';
import { SecurityLogger } from '../utils/SecurityLogger';
import { Buffer } from 'buffer';

const CHUNK_SIZE = 1024 * 512; // 512KB chunks for memory safety

export const FileCrypto = {

    /**
     * Encrypts a file at source path and writes encrypted content to destination path.
     * Returns keys and metadata.
     */
    encryptFile: async (sourcePath: string, key: DEK): Promise<{ encPath: string, nonce: string, fileSize: number }> => {
        // NOTE: True streaming in RN is hard without native-streams.
        // For MVP (Gate 7), we read chunks, encrypt, append to destination.

        // We assume sourcePath is accessible (e.g. cache dir after picker pick)
        const encPath = `${RNFS.CachesDirectoryPath}/temp_${Date.now()}.enc`;
        const nonce = CryptoCore.generateNonce();

        try {
            const stats = await RNFS.stat(sourcePath);
            const fileSize = stats.size;

            const cipher = QuickCrypto.createCipheriv('aes-256-gcm', Buffer.from(key) as any, Buffer.from(nonce) as any, { authTagLength: 16 }) as any;

            // In JS-land RN, we cannot easily pipe streams globally.
            // We will perform a "Chunked Read" -> "Update Cipher" -> "Append" loop.
            // NOTE: GCM requires entire stream for Auth Tag at end. 
            // If file is huge (>100MB), holding GCM state in JS might be heavy.
            // XChaCha20-Poly1305 (via LibSodium) is better for streams, but we stick to AES-GCM for consistency with previous files.
            // LIMITATION: Use smaller files for MVP (max 25MB as per Gate 7 req).

            let offset = 0;
            await RNFS.writeFile(encPath, '', 'base64'); // Create empty

            while (offset < fileSize) {
                // Read chunk (base64)
                const chunkBase64 = await RNFS.read(sourcePath, CHUNK_SIZE, offset, 'base64');
                const chunkBuffer = Buffer.from(chunkBase64, 'base64');

                // Encrypt chunk
                const encryptedChunk = cipher.update(chunkBuffer);

                // Append encrypted (base64)
                if (encryptedChunk.length > 0) {
                    await RNFS.appendFile(encPath, Buffer.from(encryptedChunk).toString('base64'), 'base64');
                }

                offset += CHUNK_SIZE;
            }

            const final = cipher.final();
            if (final.length > 0) {
                await RNFS.appendFile(encPath, Buffer.from(final).toString('base64'), 'base64');
            }

            // GCM Auth Tag MUST be appended at end
            const authTag = cipher.getAuthTag();
            await RNFS.appendFile(encPath, Buffer.from(authTag).toString('base64'), 'base64');

            return {
                encPath,
                nonce: Buffer.from(nonce).toString('base64'),
                fileSize
            };

        } catch (e) {
            SecurityLogger.error('FileCrypto', 'Encryption failed', e);
            throw e;
        }
    },

    /**
     * Decrypts file for viewing (e.g. temp cache).
     */
    decryptFile: async (encPath: string, key: DEK, nonceB64: string): Promise<string> => {
        const destPath = `${RNFS.CachesDirectoryPath}/dec_${Date.now()}.bin`; // Need extension hinting usually
        const nonce = Buffer.from(nonceB64, 'base64');

        try {
            const stats = await RNFS.stat(encPath);
            const fileSize = stats.size;

            const decipher = QuickCrypto.createDecipheriv('aes-256-gcm', Buffer.from(key) as any, nonce as any, { authTagLength: 16 }) as any;

            // We need to read AuthTag first? No, tag is at end for GCM.
            // But `decipher.setAuthTag()` usually must be called BEFORE update/final in some implementations,
            // OR passed as final argument. Node's crypto requires setAuthTag before final().
            // This means we must READ THE END OF FILE to get tag first if stream-processing!

            const TAG_LEN = 16;
            const dataSize = fileSize - TAG_LEN;

            // Read Tag
            // RNFS doesn't support "read from end easily" efficiently without offset calc. 
            // We know size.
            if (fileSize < TAG_LEN) throw new Error('File too short');

            const tagBase64 = await RNFS.read(encPath, TAG_LEN, dataSize, 'base64');
            const authTag = Buffer.from(tagBase64, 'base64');
            decipher.setAuthTag(authTag);

            // Decrypt Body
            let offset = 0;
            await RNFS.writeFile(destPath, '', 'base64');

            while (offset < dataSize) {
                const remaining = dataSize - offset;
                const readSize = Math.min(CHUNK_SIZE, remaining);

                const chunkBase64 = await RNFS.read(encPath, readSize, offset, 'base64');
                const chunkBuffer = Buffer.from(chunkBase64, 'base64');

                const decryptedChunk = decipher.update(chunkBuffer);

                if (decryptedChunk.length > 0) {
                    await RNFS.appendFile(destPath, Buffer.from(decryptedChunk).toString('base64'), 'base64');
                }

                offset += readSize;
            }

            const final = decipher.final(); // Validation happens here
            if (final.length > 0) {
                await RNFS.appendFile(destPath, Buffer.from(final).toString('base64'), 'base64');
            }

            return destPath;

        } catch (e) {
            SecurityLogger.error('FileCrypto', 'Decryption failed', e);
            // Clean up temp file on failure
            RNFS.unlink(destPath).catch(() => { });
            throw e;
        }
    }
};
