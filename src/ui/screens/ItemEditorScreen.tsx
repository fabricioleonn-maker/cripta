import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Screen } from '../components/Screen';
import { Typography } from '../components/Typography';
import { Colors } from '../theme/tokens';
import { VaultItemsRepo, LocalVaultItem } from '../../storage/VaultItemsRepo';
import { VaultSession } from '../../security/VaultSession';
import { CryptoCore } from '../../crypto/CryptoCore';
import { VaultHeader } from '../../crypto/types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { SecurityLogger } from '../../utils/SecurityLogger';

export const ItemEditorScreen = ({ navigation, route }: any) => {
    const [kind, setKind] = useState<'password' | 'secure_note'>('password');
    const [title, setTitle] = useState('');
    const [username, setUsername] = useState('');
    const [secret, setSecret] = useState(''); // Password or Note content

    const handleSave = async () => {
        try {
            if (!title || !secret) {
                Alert.alert('Validation', 'Title and Secret are required.');
                return;
            }

            const mk = VaultSession.getMasterKey(); // Throws if locked
            if (!mk) throw new Error('Vault Locked');

            const itemId = uuidv4();
            const userId = 'user-1'; // Mock user ID

            // 1. Generate DEK for this item
            const dek = CryptoCore.generateKey();

            // 2. Encrypt Payload
            // We include "title" inside encrypted payload so it's not visible
            const payloadData = {
                title,
                username: kind === 'password' ? username : undefined,
                secret,
                created: Date.now()
            };

            const header: VaultHeader = {
                user_id: userId,
                item_id: itemId,
                kind,
                crypto_version: 1,
                version: 1,
                created_at: Date.now(),
                updated_at: Date.now()
            };

            const encryptedPayload = CryptoCore.encryptJSON(payloadData, dek, itemId);

            // 3. Wrap DEK with MK
            // AAD for wrapping DEK could be just item_id or user_id
            const wrappedDek = CryptoCore.wrapKey(dek, mk, itemId);

            // 4. Construct Item
            const newItem: LocalVaultItem = {
                id: itemId,
                user_id: userId,
                kind,
                ciphertext: encryptedPayload.cipherText,
                nonce: encryptedPayload.nonce,
                wrapped_dek: wrappedDek.cipherText,
                wrapped_dek_nonce: wrappedDek.nonce,
                version: 1,
                updated_at: new Date().toISOString(),
                sync_state: 'dirty'
            };

            // 5. Save Local
            VaultItemsRepo.save(newItem);

            SecurityLogger.info('ItemEditor', 'Item encrypted and saved');
            navigation.goBack();

        } catch (e) {
            SecurityLogger.error('ItemEditor', 'Save failed', e);
            Alert.alert('Error', 'Failed to save encrypted item.');
        }
    };

    return (
        <Screen style={{ padding: 16 }}>
            <Typography variant="h2" style={{ marginBottom: 20 }}>
                New Item
            </Typography>

            <ScrollView contentContainerStyle={{ gap: 16 }}>
                {/* Kind Selector */}
                <View style={styles.kindSelector}>
                    {(['password', 'secure_note'] as const).map(k => (
                        <TouchableOpacity
                            key={k}
                            style={[styles.kindOption, kind === k && styles.activeKind]}
                            onPress={() => setKind(k)}
                        >
                            <Typography color={kind === k ? Colors.TextInverse : Colors.TextPrimary}>
                                {k === 'password' ? '🔑 Password' : '📝 Note'}
                            </Typography>
                        </TouchableOpacity>
                    ))}
                </View>

                <Input label="Title (Encrypted)" value={title} onChange={setTitle} placeholder="e.g. Gmail" />

                {kind === 'password' && (
                    <Input label="Username" value={username} onChange={setUsername} placeholder="user@email.com" />
                )}

                <Input
                    label={kind === 'password' ? "Password" : "Note Content"}
                    value={secret}
                    onChange={setSecret}
                    secure={kind === 'password'}
                    multiline={kind === 'secure_note'}
                    placeholder="Top Secret..."
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <Typography variant="h3" color={Colors.TextInverse}>Encrypt & Save</Typography>
                </TouchableOpacity>
            </ScrollView>
        </Screen>
    );
};

const Input = ({ label, value, onChange, secure, multiline, placeholder }: any) => (
    <View>
        <Typography variant="caption" style={{ marginBottom: 6 }}>{label}</Typography>
        <TextInput
            style={[styles.input, multiline && { height: 100, textAlignVertical: 'top' }]}
            value={value}
            onChangeText={onChange}
            secureTextEntry={secure}
            multiline={multiline}
            placeholder={placeholder}
            placeholderTextColor={Colors.TextDisabled}
        />
    </View>
);

const styles = StyleSheet.create({
    kindSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8
    },
    kindOption: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: Colors.BgSurface,
        borderWidth: 1,
        borderColor: Colors.BorderSubtle,
        flex: 1,
        alignItems: 'center'
    },
    activeKind: {
        backgroundColor: Colors.BrandPrimary,
        borderColor: Colors.BrandPrimary,
    },
    input: {
        backgroundColor: Colors.BgSurface,
        color: Colors.TextPrimary,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.BorderSubtle,
        fontSize: 16,
    },
    saveBtn: {
        marginTop: 24,
        backgroundColor: Colors.BrandPrimary,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: Colors.BrandPrimary,
        shadowOpacity: 0.3,
        elevation: 4
    }
});
