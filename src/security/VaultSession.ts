import { AppState, AppStateStatus } from 'react-native';
import { SecurityLogger } from '../utils/SecurityLogger';
import { CryptoCore } from '../crypto/CryptoCore';
import { MasterKey } from '../crypto/types';

// Configuration
const INACTIVITY_TIMEOUT_MS = 60 * 1000; // 1 minute default
const BACKGROUND_GRACE_PERIOD_MS = 10 * 1000; // 10 seconds to switch apps

type SessionStatus = 'LOCKED' | 'UNLOCKED';

interface SessionState {
    status: SessionStatus;
    masterKey: MasterKey | null;
    lastActiveAt: number;
}

class VaultSessionManager {
    private static instance: VaultSessionManager;

    private state: SessionState = {
        status: 'LOCKED',
        masterKey: null,
        lastActiveAt: Date.now(),
    };

    private listeners: ((status: SessionStatus) => void)[] = [];
    private backgroundTimestamp: number | null = null;
    private inactivityTimer: NodeJS.Timeout | null = null;

    private constructor() {
        // Determine initial state
        AppState.addEventListener('change', this.handleAppStateChange);
    }

    public static getInstance(): VaultSessionManager {
        if (!VaultSessionManager.instance) {
            VaultSessionManager.instance = new VaultSessionManager();
        }
        return VaultSessionManager.instance;
    }

    /**
     * Unlock the vault with the decrypted Master Key.
     * MK is stored ONLY in memory.
     */
    public unlock(mk: MasterKey) {
        if (!mk || mk.length !== 32) {
            throw new Error('Invalid Master Key');
        }
        this.state.masterKey = mk;
        this.state.status = 'UNLOCKED';
        this.touch();
        this.notifyListeners();
        SecurityLogger.info('VaultSession', 'Vault UNLOCKED');
    }

    /**
     * Lock the vault and wipe keys from memory.
     */
    public lock() {
        if (this.state.masterKey) {
            CryptoCore.zeroBuffer(this.state.masterKey);
        }
        this.state.masterKey = null;
        this.state.status = 'LOCKED';

        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }

        this.notifyListeners();
        SecurityLogger.info('VaultSession', 'Vault LOCKED');
    }

    /**
     * Access the Master Key.
     * Throws if locked.
     */
    public getMasterKey(): MasterKey {
        if (this.state.status === 'LOCKED' || !this.state.masterKey) {
            throw new Error('Vault is LOCKED. Cannot access Master Key.');
        }
        this.touch(); // refresh timer on access
        return this.state.masterKey;
    }

    public isUnlocked(): boolean {
        return this.state.status === 'UNLOCKED';
    }

    /**
     * Call this on user interaction to reset inactivity timer.
     */
    public touch() {
        if (this.state.status === 'LOCKED') return;

        this.state.lastActiveAt = Date.now();

        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);

        this.inactivityTimer = setTimeout(() => {
            SecurityLogger.info('VaultSession', 'Inactivity timeout reached');
            this.lock();
        }, INACTIVITY_TIMEOUT_MS);
    }

    public subscribe(callback: (status: SessionStatus) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(cb => cb(this.state.status));
    }

    private handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
            this.backgroundTimestamp = Date.now();
            SecurityLogger.info('VaultSession', 'App backgrounded');
        } else if (nextAppState === 'active') {
            if (this.backgroundTimestamp) {
                const timeInBackground = Date.now() - this.backgroundTimestamp;
                if (timeInBackground > BACKGROUND_GRACE_PERIOD_MS) {
                    SecurityLogger.info('VaultSession', 'Background time exceeded grace period. Locking.');
                    this.lock();
                } else {
                    // Came back quickly, just refresh touch
                    this.touch();
                }
                this.backgroundTimestamp = null;
            }
        }
    };
}

export const VaultSession = VaultSessionManager.getInstance();
