import React from 'react';
import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Screen } from '../components/Screen';
import { Typography } from '../components/Typography';
import { Colors } from '../theme/tokens';
import { VaultApi } from '../../api/vaultApi';
import { VaultSettingsRepo } from '../../storage/VaultSettingsRepo';
import { VaultSession } from '../../security/VaultSession';
import { SecurityLogger } from '../../utils/SecurityLogger';

export const WipeScreen = ({ navigation }: any) => {

    const handleWipe = async () => {
        Alert.alert(
            'DANGER: Wipe Vault?',
            'This will PERMANENTLY DELETE all your data from the server and this device. There is no undo.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'DESTROY EVERYTHING', style: 'destructive', onPress: performWipe }
            ]
        );
    };

    const performWipe = async () => {
        try {
            // 1. Request Wipe on Server
            // (Note: In simple MVP this just does it potentially or sets flag)
            await VaultApi.requestWipe();

            // 2. Confirm Wipe (Actual Nuke)
            await VaultApi.confirmWipe();

            // 3. Local Wipe
            VaultSettingsRepo.wipeLocal('user-1');

            // 4. Lock & Reset Session
            VaultSession.lock();

            SecurityLogger.warn('WipeScreen', 'VAULT DESTROYED BY USER');
            Alert.alert('System', 'Vault has been wiped.');

            // Reset Nav
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });

        } catch (e: any) {
            Alert.alert('Error', `Wipe failed: ${e.message}`);
            SecurityLogger.error('WipeScreen', 'Wipe failed', e);
        }
    };

    return (
        <Screen style={{ padding: 20, justifyContent: 'center', alignItems: 'center' }}>
            <Typography variant="h1" color={Colors.StatusError} style={{ marginBottom: 20 }}>Danger Zone</Typography>

            <Typography variant="body" style={{ textAlign: 'center', marginBottom: 40 }}>
                You can request a complete vault wipe. This is useful if you believe your account is compromised or you want to start fresh.
            </Typography>

            <TouchableOpacity style={styles.nukeBtn} onPress={handleWipe}>
                <Typography variant="h2" color={Colors.TextInverse}>☢️ NUKE VAULT</Typography>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 30 }}>
                <Typography variant="body">Cancel</Typography>
            </TouchableOpacity>
        </Screen>
    );
};

const styles = StyleSheet.create({
    nukeBtn: {
        backgroundColor: Colors.StatusError,
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderRadius: 16,
        shadowColor: Colors.StatusError,
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10
    }
});
