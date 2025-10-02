import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Variables d\'environnement Supabase manquantes. Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY dans .env.local')
}

// Client pour le côté client (avec service role key)
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// Client pour le côté serveur (avec service role key)
const supabaseServiceRoleKeyServer = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = createClient(
  supabaseUrl, 
  supabaseServiceRoleKeyServer || supabaseServiceRoleKey, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Types pour la table projects
export interface Project {
  id: string
  created_at: string
  input_image_url: string | null
  output_image_url: string | null
  prompt: string | null
  status: string
}