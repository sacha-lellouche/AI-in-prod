import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient, getSupabaseAdmin } from '@/lib/supabase-server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  
  try {
    // Vérifier l'authentification
    const supabase = await createServerComponentClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic'
    
    if (!allowedTypes.includes(file.type) && !isHeic) {
      return NextResponse.json(
        { error: 'Type de fichier non supporté. Utilisez JPEG, PNG, GIF, WEBP ou HEIC' },
        { status: 400 }
      )
    }

    // Vérifier la taille (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximum: 10MB' },
        { status: 400 }
      )
    }

    // Générer un nom de fichier unique
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${user.id}/${uuidv4()}-${Date.now()}.${fileExtension}`

    // Convertir le fichier en ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // Upload vers Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_INPUT_BUCKET || 'input-images')
      .upload(fileName, arrayBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      })

    if (uploadError) {
      console.error('Erreur upload Supabase:', uploadError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload vers le stockage' },
        { status: 500 }
      )
    }

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_INPUT_BUCKET || 'input-images')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('Erreur API upload:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}