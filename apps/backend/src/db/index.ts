import { createClient } from '@supabase/supabase-js'

const supabaseUrl = Bun.env.SUPABASE_URL!;
const supabaseKey = Bun.env.SUPABASE_SERVICE_KEY!; 

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file");
}

export const db = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  }
})