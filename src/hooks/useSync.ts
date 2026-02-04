import { useEffect } from 'react';
import { AppState } from 'react-native';
import { SyncManager } from '../sync/SyncManager';
import { VaultSession } from '../security/VaultSession';

export const useSync = (userId: string) => {
    useEffect(() => {
        const handleAppState = (nextState: string) => {
            if (nextState === 'active' && VaultSession.isUnlocked()) {
                // Auto-sync on foreground
                SyncManager.sync(userId);
            }
        };

        const sub = AppState.addEventListener('change', handleAppState);

        // Initial sync verify
        if (VaultSession.isUnlocked()) {
            SyncManager.sync(userId);
        }

        return () => {
            sub.remove();
        };
    }, [userId]);

    return {
        syncNow: () => SyncManager.sync(userId)
    };
};
