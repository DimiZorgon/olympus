// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

export function createAdminSupabaseClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';

  if (!url || !serviceKey) {
    throw new Error('Variables Supabase manquantes dans .env.local');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}