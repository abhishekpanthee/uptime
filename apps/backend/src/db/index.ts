import { createClient } from '@supabase/supabase-js'

const supabase = createClient(Bun.env.SUPABASE_URL!, Bun.env.SUPABASE_PUBLISHABLE_KEY!, {
  db: { schema: 'myschema' },
})

export const db=supabase