import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Screen } from '../components/Screen';
import { Typography } from '../components/Typography';
import { Colors } from '../theme/tokens';
import { RecoveryService } from '../../domain/RecoveryService';
import { ClipboardGuard } from '../../security/ClipboardGuard';

export const RecoverySetupScreen = ({ navigation }: any) => {
    const [rk, setRk] = useState('');

    useEffect(() => {
        const key = RecoveryService.generateRecoveryKey();
        setRk(key);
    }, []);

    const confirm = async () => {
        try {
            await RecoveryService.setupRecovery(rk);
            Alert.alert('Success', 'Recovery Key Configured. Keep it safe!');
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', 'Failed to save recovery configuration.');
        }
    };

    return (
        <Screen style={{ padding: 20 }}>
            <Typography variant="h2" style={{ marginBottom: 10 }}>Recovery Setup</Typography>
            <Typography variant="body" color={Colors.TextSecondary} style={{ marginBottom: 30 }}>
                This key is the ONLY way to restore access if you forget your Master Password.
                Write it down or store it safely offline.
            </Typography>

            <View style={styles.codeBox}>
                <Typography variant="h3" style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                    {rk}
                </Typography>
            </View>

            <TouchableOpacity onPress={() => ClipboardGuard.copy(rk)} style={{ alignItems: 'center', marginVertical: 20 }}>
                <Typography variant="body" color={Colors.BrandPrimary}>Copy to Clipboard</Typography>
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity style={styles.btn} onPress={confirm}>
                <Typography variant="h3" color={Colors.TextInverse}>I Have Saved It</Typography>
            </TouchableOpacity>
        </Screen>
    );
};

const styles = StyleSheet.create({
    codeBox: {
        backgroundColor: Colors.BgElevated,
        padding: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.StatusWarning,
        marginVertical: 10
    },
    btn: {
        backgroundColor: Colors.BrandPrimary,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center'
    }
});
