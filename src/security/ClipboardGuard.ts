import { Clipboard } from 'react-native'; // NOTE: Requires install @react-native-clipboard/clipboard
import { AppState, AppStateStatus } from 'react-native';
import { SecurityLogger } from '../utils/SecurityLogger';

// Note: Standard React Native 'Clipboard' is deprecated. 
// Ideally use @react-native-clipboard/clipboard.
// For MVP we assume the interface exists or global.

const DEFAULT_TTL_MS = 30 * 1000; // 30 seconds

class ClipboardGuardManager {
    private static instance: ClipboardGuardManager;
    private clearTimer: NodeJS.Timeout | null = null;
    private lastCopiedSensitive: boolean = false;

    private constructor() {
        AppState.addEventListener('change', this.handleAppStateChange);
    }

    public static getInstance(): ClipboardGuardManager {
        if (!ClipboardGuardManager.instance) {
            ClipboardGuardManager.instance = new ClipboardGuardManager();
        }
        return ClipboardGuardManager.instance;
    }

    /**
     * Securely copy text to clipboard with automatic clearing.
     */
    public copy(text: string, ttlMs: number = DEFAULT_TTL_MS) {
        if (!text) return;

        // @ts-ignore - Assuming clipboard installed
        Clipboard.setString(text);
        this.lastCopiedSensitive = true;
        SecurityLogger.info('ClipboardGuard', 'Copied secure data to clipboard');

        if (this.clearTimer) clearTimeout(this.clearTimer);

        this.clearTimer = setTimeout(() => {
            this.clear();
            SecurityLogger.info('ClipboardGuard', 'Auto-cleared clipboard after timeout');
        }, ttlMs);
    }

    /**
     * Clears the clipboard.
     */
    public clear() {
        if (this.clearTimer) clearTimeout(this.clearTimer);
        this.clearTimer = null;

        // @ts-ignore
        Clipboard.setString('');
        this.lastCopiedSensitive = false;
    }

    private handleAppStateChange = (nextAppState: AppStateStatus) => {
        // AGRESSIVE: Clear clipboard immediately when going to background
        // if it contains sensitive data.
        if ((nextAppState === 'background' || nextAppState === 'inactive') && this.lastCopiedSensitive) {
            this.clear();
            SecurityLogger.info('ClipboardGuard', 'Auto-cleared clipboard on background');
        }
    };
}

export const ClipboardGuard = ClipboardGuardManager.getInstance();
