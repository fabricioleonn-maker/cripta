/**
 * Main Entry Point
 * Sets up Navigation and Global Providers
 */
import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Screen } from './ui/components/Screen';
import { Typography } from './ui/components/Typography';
import { Colors } from './ui/theme/tokens';
import { View, Alert } from 'react-native';
import { initDatabase } from './storage/db';
import { SecurityLogger } from './utils/SecurityLogger';
import { VaultListScreen } from './ui/screens/VaultListScreen';
import { ItemEditorScreen } from './ui/screens/ItemEditorScreen';
import { ItemViewerScreen } from './ui/screens/ItemViewerScreen';
import { FilePickerScreen } from './ui/screens/FilePickerScreen';
import { RecoverySetupScreen } from './ui/screens/RecoverySetupScreen';
import { WipeScreen } from './ui/screens/WipeScreen';
import { VaultSession } from './security/VaultSession';
import { CryptoCore } from './crypto/CryptoCore';

const Stack = createNativeStackNavigator();

const AppTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        background: Colors.BgRoot,
        card: Colors.BgSurface,
        text: Colors.TextPrimary,
        primary: Colors.BrandPrimary,
    },
};

const LoginScreen = ({ navigation }: any) => {
    useEffect(() => {
        initDatabase();
    }, []);

    const handleFakeUnlock = async () => {
        // SIMULATED UNLOCK FOR MVP
        try {
            // 1. Generate a disposable MK for this session since we don't have a persisted wrapped MK yet
            const fakeMk = CryptoCore.generateKey();
            VaultSession.unlock(fakeMk);

            navigation.replace('VaultList');
        } catch (e) {
            Alert.alert('Error', 'Unlock failed');
            SecurityLogger.error('Login', 'Unlock error', e);
        }
    };

    return (
        <Screen style={{ justifyContent: 'center', alignItems: 'center', gap: 20 }}>
            <Typography variant="h1">Cripta</Typography>
            <Typography variant="body" style={{ textAlign: 'center' }}>
                Secure Digital Vault
            </Typography>
            <View
                onTouchEnd={handleFakeUnlock}
                style={{
                    backgroundColor: Colors.BrandPrimary,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 8,
                    marginTop: 20
                }}>
                <Typography variant="h3" color={Colors.TextInverse}>Unlock (Dev Mode)</Typography>
            </View>
        </Screen>
    );
};

export default function Main() {
    return (
        <NavigationContainer theme={AppTheme}>
            <Stack.Navigator
                initialRouteName="Login"
                screenOptions={{
                    headerShown: false,
                    animation: 'fade_from_bottom'
                }}
            >
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="VaultList" component={VaultListScreen} />
                <Stack.Screen name="ItemEditor" component={ItemEditorScreen} options={{ presentation: 'modal' }} />
                <Stack.Screen name="FilePicker" component={FilePickerScreen} options={{ presentation: 'modal' }} />
                <Stack.Screen name="ItemViewer" component={ItemViewerScreen} />
                <Stack.Screen name="RecoverySetup" component={RecoverySetupScreen} />
                <Stack.Screen name="Wipe" component={WipeScreen} options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
