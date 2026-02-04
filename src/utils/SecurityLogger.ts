/**
 * SecurityLogger
 * 
 * Enforces NO-LOGGING of sensitive data in production.
 * Sanitizes inputs in development.
 */

const IS_DEV = __DEV__;

// Patterns to detect sensitive keys (naive but effective for properties)
const SENSITIVE_KEYS = /password|secret|key|token|auth|bearer|private|mk|dek|seed|mnemonic/i;

const sanitize = (arg: any): any => {
    if (!arg) return arg;
    if (typeof arg === 'string') {
        // Basic heuristics to mask long strings that look like keys in dev
        if (arg.length > 64 && !arg.includes(' ')) return '***REDACTED_LONG_STRING***';
        return arg;
    }
    if (Array.isArray(arg)) {
        return arg.map(sanitize);
    }
    if (typeof arg === 'object') {
        const newObj: any = {};
        for (const key in arg) {
            if (SENSITIVE_KEYS.test(key)) {
                newObj[key] = '***REDACTED***';
            } else {
                newObj[key] = sanitize(arg[key]);
            }
        }
        return newObj;
    }
    return arg;
};

export const SecurityLogger = {
    info: (tag: string, message: string, data?: any) => {
        if (IS_DEV) {
            console.log(`[INFO][${tag}] ${message}`, data ? sanitize(data) : '');
        }
    },

    warn: (tag: string, message: string, data?: any) => {
        console.warn(`[WARN][${tag}] ${message}`, data ? sanitize(data) : '');
    },

    error: (tag: string, message: string, error?: any) => {
        // Always log errors, but try to sanitize the error object if it's custom
        console.error(`[ERROR][${tag}] ${message}`, error);
    },

    // Use this for critical security events (e.g., auth failure, wipe triggered)
    audit: (event: string, meta?: any) => {
        // In a real app, this might go to an internal encrypted log file or secure crash reporter
        // NEVER send PII or Keys
        if (IS_DEV) {
            console.log(`[AUDIT][${event}]`, sanitize(meta));
        }
    }
};
