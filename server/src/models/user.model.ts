import { supabaseClient } from '../config/db';
import { User, UserRole } from '../types';
import crypto from 'crypto';

// In-memory user store fallback for local development without live database connection
const inMemoryUsers: User[] = [];

export const UserModel = {
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase findByEmail Error:', error);
      }
      if (data) return data as User;
    }

    // In-memory fallback lookup
    const user = inMemoryUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    return user || null;
  },

  async findById(id: string): Promise<User | null> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase findById Error:', error);
      }
      if (data) return data as User;
    }

    // In-memory fallback lookup
    const user = inMemoryUsers.find((u) => u.id === id);
    return user || null;
  },

  async create(user: {
    name: string;
    email: string;
    password_hash: string;
    role: UserRole;
  }): Promise<User> {
    const normalizedEmail = user.email.toLowerCase().trim();
    const id = crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const newUser: User = {
      id,
      name: user.name,
      email: normalizedEmail,
      password_hash: user.password_hash,
      role: user.role,
      created_at: createdAt,
    };

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('users')
        .insert([{
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          password_hash: newUser.password_hash,
          role: newUser.role,
          created_at: newUser.created_at
        }])
        .select()
        .single();

      if (!error && data) {
        return data as User;
      }
      console.warn('Supabase insertion failed or table missing, falling back to local memory store.', error?.message);
    }

    // Save to in-memory store fallback
    inMemoryUsers.push(newUser);
    return newUser;
  },
};
