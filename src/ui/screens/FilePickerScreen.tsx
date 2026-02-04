import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { Screen } from '../components/Screen';
import { Typography } from '../components/Typography';
import { Colors } from '../theme/tokens';
import { VaultSession } from '../../security/VaultSession';
import { CryptoCore } from '../../crypto/CryptoCore';
import { FileCrypto } from '../../files/FileCrypto';
import { FileStorage } from '../../files/FileStorage';
import { VaultItemsRepo, LocalVaultItem } from '../../storage/VaultItemsRepo';
import { VaultHeader } from '../../crypto/types';
import { v4 as uuidv4 } from 'uuid';
import { SecurityLogger } from '../../utils/SecurityLogger';

export const FilePickerScreen = ({ navigation }: any) => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const pickAndUpload = async () => {
        try {
            setLoading(true);
            setStatus('Selecting file...');

            const result = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.allFiles],
                copyTo: 'cachesDirectory'
            });

            if (!result.fileCopyUri) throw new Error('Could not copy file');

            setStatus('Encrypting...');
            const mk = VaultSession.getMasterKey();
            const dek = CryptoCore.generateKey();
            const itemId = uuidv4();
            const userId = 'user-1';

            // 1. Encrypt File
            const { encPath, nonce: fileNonce, fileSize } = await FileCrypto.encryptFile(result.fileCopyUri, dek);

            setStatus('Uploading...');
            // 2. Upload Encrypted Body
            const fileRef = await FileStorage.uploadFile(encPath, userId);

            setStatus('Saving Metadata...');
            // 3. Encrypt Metadata (Filename, etc)
            const payloadData = {
                originalName: result.name,
                mimeType: result.type,
                size: fileSize,
                created: Date.now()
            };

            // header for AAD
            // const header: VaultHeader = { ... } // Simplified for MVP
            const encryptedMetadata = CryptoCore.encryptJSON(payloadData, dek, itemId);

            const wrappedDek = CryptoCore.wrapKey(dek, mk, itemId);

            const newItem: LocalVaultItem = {
                id: itemId,
                user_id: userId,
                kind: result.type?.startsWith('image/') ? 'image' : 'document',
                ciphertext: encryptedMetadata.cipherText,
                nonce: encryptedMetadata.nonce,
                wrapped_dek: wrappedDek.cipherText,
                wrapped_dek_nonce: wrappedDek.nonce,
                version: 1,
                updated_at: new Date().toISOString(),
                sync_state: 'dirty',
                file_ref: fileRef // Point to Supabase Storage path
            };

            VaultItemsRepo.save(newItem);

            SecurityLogger.info('FilePicker', 'File encrypted and saved', { fileRef });
            Alert.alert('Success', 'File encrypted and uploaded securely.');
            navigation.goBack();

        } catch (e: any) {
            if (!DocumentPicker.isCancel(e)) {
                SecurityLogger.error('FilePicker', 'Error', e);
                Alert.alert('Error', e.message);
            }
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    return (
        <Screen style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Typography variant="h2" style={{ marginBottom: 30 }}>Add File to Vault</Typography>

            {loading ? (
                <View style={{ alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator size="large" color={Colors.BrandPrimary} />
                    <Typography variant="body">{status}</Typography>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={pickAndUpload}
                    style={{
                        backgroundColor: Colors.BgSurface,
                        padding: 24,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: Colors.BrandPrimary,
                        alignItems: 'center',
                        width: '100%'
                    }}
                >
                    <Typography variant="h1">📄</Typography>
                    <Typography variant="h3" style={{ marginTop: 10 }}>Select Document</Typography>
                    <Typography variant="caption" style={{ marginTop: 5 }}>Max 25MB • Zero-Knowledge</Typography>
                </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 30 }}>
                <Typography variant="body" color={Colors.TextSecondary}>Cancel</Typography>
            </TouchableOpacity>
        </Screen>
    );
};
