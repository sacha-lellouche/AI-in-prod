import { NextRequest, NextResponse } from 'next/server'

/**
 * Debug endpoint pour vérifier les variables d'environnement
 * À SUPPRIMER EN PRODUCTION pour des raisons de sécurité
 */
export async function GET(request: NextRequest) {
  // Vérifier que c'est en développement uniquement
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint disabled in production' },
      { status: 403 }
    )
  }

  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Not Set',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not Set',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Not Set',
    NEXT_PUBLIC_SUPABASE_INPUT_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_INPUT_BUCKET || 'input-images (default)',
    NEXT_PUBLIC_SUPABASE_OUTPUT_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_OUTPUT_BUCKET || 'output-images (default)',
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN ? '✓ Set' : '✗ Not Set',
    REPLICATE_MODEL: process.env.REPLICATE_MODEL || 'google/nano-banana (default)',
    NODE_ENV: process.env.NODE_ENV,
  }

  return NextResponse.json({
    message: 'Environment variables check',
    environment: envVars,
    warnings: [
      !process.env.NEXT_PUBLIC_SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL is not set',
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set',
      !process.env.SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY is not set',
      !process.env.REPLICATE_API_TOKEN && 'REPLICATE_API_TOKEN is not set',
    ].filter(Boolean)
  })
}
