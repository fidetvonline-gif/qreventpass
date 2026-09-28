import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let clientInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.trim().length > 0 &&
    supabaseAnonKey.trim().length > 0 &&
    supabaseUrl.startsWith('http')
  );
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!clientInstance && supabaseUrl && supabaseAnonKey) {
    try {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      clientInstance = null;
    }
  }

  return clientInstance;
}

export interface SupabaseConnectionStatus {
  isConfigured: boolean;
  url?: string;
  connected?: boolean;
  message?: string;
}

export async function checkSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  if (!isSupabaseConfigured()) {
    return {
      isConfigured: false,
      message: 'Supabase credentials not set in environment (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).',
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      isConfigured: false,
      message: 'Could not create Supabase client instance.',
    };
  }

  try {
    // Attempt a lightweight probe
    const { error } = await supabase.from('events').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      return {
        isConfigured: true,
        url: supabaseUrl,
        connected: false,
        message: `Connected to Supabase, but query returned: ${error.message}. Ensure the tables are created.`,
      };
    }
    return {
      isConfigured: true,
      url: supabaseUrl,
      connected: true,
      message: 'Successfully connected to Supabase database and Realtime engine.',
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      isConfigured: true,
      url: supabaseUrl,
      connected: false,
      message: `Network or configuration error: ${err}`,
    };
  }
}
