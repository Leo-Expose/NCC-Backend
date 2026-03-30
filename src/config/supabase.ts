import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env variables.");
}

// Global service role client for privileged database operations
// DO NOT expose this to the frontend.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// A helper for creating a client scoped to the acting user
export const createUserClient = (token: string) => {
  return createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || supabaseServiceKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
};
