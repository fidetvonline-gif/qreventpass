import { UserRole } from '../types';

export interface UserAccount {
  name: string;
  email: string;
  pass: string;
  role: UserRole;
  created_at?: string;
}

const STORAGE_KEY_USERS = 'eventpass_custom_users';

const DEMO_EMAILS = [
  'admin@godswillakpabioec.ng',
  'organizer@eventpass.ng',
  'emmanuel@gate.ng',
  'guest@attendee.ng'
];

const DEFAULT_USERS: UserAccount[] = [];

export const accountService = {
  getUsers(): UserAccount[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out legacy demo accounts
          const filtered = parsed.filter(
            u => u && u.email && !DEMO_EMAILS.includes(u.email.toLowerCase().trim())
          );
          if (filtered.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(filtered));
          }
          return filtered;
        }
      }
    } catch {}
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  },

  hasAccount(email: string): boolean {
    const users = this.getUsers();
    return users.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
  },

  getUserByEmail(email: string): UserAccount | undefined {
    const users = this.getUsers();
    return users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  },

  saveAccount(user: UserAccount): void {
    const users = this.getUsers();
    const cleanEmail = user.email.trim().toLowerCase();
    const existingIdx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);

    if (existingIdx >= 0) {
      users[existingIdx] = {
        ...users[existingIdx],
        ...user,
        email: cleanEmail,
      };
    } else {
      users.push({
        ...user,
        email: cleanEmail,
        created_at: user.created_at || new Date().toISOString(),
      });
    }

    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('eventpass:users_updated'));
  },

  updateRole(email: string, newRole: UserRole): boolean {
    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const target = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (target) {
      target.role = newRole;
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
      window.dispatchEvent(new CustomEvent('eventpass:users_updated'));
      return true;
    }
    return false;
  },

  deleteAccount(email: string): void {
    const users = this.getUsers().filter(u => u.email.toLowerCase() !== email.trim().toLowerCase());
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('eventpass:users_updated'));
  }
};
