import { UserRole } from '../types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

export interface UserAccount {
  name: string;
  email: string;
  pass: string;
  role: UserRole;
  created_at?: string;
}

const STORAGE_KEY_USERS = 'eventpass_custom_users';

export const accountService = {
  getUsers(): UserAccount[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  },

  async signUp(email: string, pass: string, name: string, role: UserRole): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: pass,
          options: {
            data: { full_name: name, role }
          }
        });
        if (error) return { success: false, message: error.message };
      }
    }

    // Always fallback/persist to local for redundancy if requested, 
    // but the goal is to replace. For now, we keep it for "offline" mode until fully migrated.
    const users = this.getUsers();
    users.push({ name, email: cleanEmail, pass, role, created_at: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('eventpass:users_updated'));
    
    return { success: true, message: 'Account created successfully.' };
  },

  async signIn(email: string, pass: string): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });
        
        if (!error && data.user) {
          return {
            success: true,
            user: {
              name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
              email: cleanEmail,
              pass: '********', // Don't expose
              role: data.user.user_metadata?.role || 'organizer'
            }
          };
        }
      }
    }

    // Local fallback
    const users = this.getUsers();
    const found = users.find(u => u.email.toLowerCase() === cleanEmail && u.pass === pass);
    if (found) return { success: true, user: found };
    
    return { success: false, message: 'Invalid credentials.' };
  },

  deleteAccount(email: string): void {
    const users = this.getUsers().filter(u => u.email.toLowerCase() !== email.trim().toLowerCase());
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('eventpass:users_updated'));
  },

  getUserByEmail(email: string): UserAccount | undefined {
    return this.getUsers().find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  }
};
