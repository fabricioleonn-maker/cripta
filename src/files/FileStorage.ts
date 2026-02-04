import { supabase } from '../api/supabase';
import { SecurityLogger } from '../utils/SecurityLogger';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';

const USER_FILES_BUCKET = 'vault-files';

export const FileStorage = {

    async uploadFile(localPath: string, userId: string): Promise<string> {
        try {
            const fileContentBase64 = await RNFS.readFile(localPath, 'base64');
            const fileBuffer = Buffer.from(fileContentBase64, 'base64');

            // Generate random internal ID for storage (not the original filename)
            // In real app, we might use item ID.
            // For MVP, simple unique ID
            const storageId = `${userId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.enc`;

            const { data, error } = await supabase.storage
                .from(USER_FILES_BUCKET)
                .upload(storageId, fileBuffer, {
                    contentType: 'application/octet-stream',
                    upsert: false
                });

            if (error) throw error;

            return data.path; // returns reference
        } catch (e) {
            SecurityLogger.error('FileStorage', 'Upload error', e);
            throw e;
        }
    },

    async downloadFile(path: string): Promise<string> {
        try {
            const { data, error } = await supabase.storage
                .from(USER_FILES_BUCKET)
                .download(path);

            if (error) throw error;

            // Blob to local file
            // React Native binary handling with Supabase JS can be tricky.
            // data is a Blob. We need to save it to disk.

            const fr = new FileReader();
            return new Promise((resolve, reject) => {
                fr.onload = async () => {
                    try {
                        // @ts-ignore
                        const base64 = fr.result.split(',')[1];
                        const dest = `${RNFS.CachesDirectoryPath}/dl_${Date.now()}.enc`;
                        await RNFS.writeFile(dest, base64, 'base64');
                        resolve(dest);
                    } catch (e) {
                        reject(e);
                    }
                };
                fr.onerror = reject;
                fr.readAsDataURL(data);
            });

        } catch (e) {
            SecurityLogger.error('FileStorage', 'Download error', e);
            throw e;
        }
    }
};
