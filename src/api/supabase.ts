import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityLogger } from '../utils/SecurityLogger';

// Environment variables should replace these strings in production
// For now, placeholders or .env usage expected
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Logger hook for debugging DB errors in dev
const originalRpc = supabase.rpc;
// @ts-ignore
supabase.rpc = async (fn, args) => {
    try {
        const start = Date.now();
        const result = await originalRpc(fn, args);
        const duration = Date.now() - start;
        if (result.error) {
            SecurityLogger.error('SupabaseRPC', `Error in ${fn}`, result.error);
        } else {
            // Don't log args/result in prod as they might be encrypted blobs but still metadata leaks possible
            SecurityLogger.info('SupabaseRPC', `Success ${fn} (${duration}ms)`);
        }
        return result;
    } catch (e) {
        SecurityLogger.error('SupabaseRPC', `Exception in ${fn}`, e);
        throw e;
    }
};
