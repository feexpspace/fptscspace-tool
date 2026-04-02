// src/lib/supabase-server.ts — Server-side Supabase client (service role)
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
    if (!_client) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Missing Supabase environment variables');
        }

        _client = createClient(supabaseUrl, serviceRoleKey);
    }
    return _client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return getSupabaseAdmin()[prop as keyof SupabaseClient];
    },
});
