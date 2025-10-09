import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient, supabaseAdmin } from '@/lib/supabase-server'
import Replicate from 'replicate'
import { v4 as uuidv4 } from 'uuid'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

export async function POST(request: NextRequest) {
  let projectId: string | null = null
  
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

    const body = await request.json()
    const { imageUrl, prompt } = body

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: 'URL image et prompt requis' },
        { status: 400 }
      )
    }

    // Valider que l'URL est une vraie URL d'image
    try {
      const url = new URL(imageUrl)
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      const hasValidExtension = validExtensions.some(ext => 
        url.pathname.toLowerCase().includes(ext)
      )
      
      if (!hasValidExtension && !url.hostname.includes('unsplash.com') && !url.hostname.includes('images.')) {
        return NextResponse.json(
          { error: 'URL d\'image invalide. Utilisez une URL qui pointe directement vers un fichier image (.jpg, .png, etc.)' },
          { status: 400 }
        )
      }
    } catch (_e) {
      return NextResponse.json(
        { error: 'URL invalide. Vérifiez le format de l\'URL.' },
        { status: 400 }
      )
    }

    // Créer un nouveau projet dans la base de données avec l'URL de l'image et l'user_id
    projectId = uuidv4()
    const { error: insertError } = await supabaseAdmin
      .from('projects')
      .insert({
        id: projectId,
        user_id: user.id, // Ajouter l'ID de l'utilisateur
        input_image_url: imageUrl,
        prompt,
        status: 'processing'
      })

    if (insertError) {
      console.error('Erreur insertion projet:', insertError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du projet' },
        { status: 500 }
      )
    }

    // Appeler Replicate pour modifier l'image avec google/nano-banana
    console.log('Calling Replicate with:', {
      model: process.env.REPLICATE_MODEL,
      prompt,
      imageUrl
    })
    
    const output = await replicate.run(
      process.env.REPLICATE_MODEL as `${string}/${string}`,
      {
        input: {
          prompt: prompt,
          image_input: [imageUrl],
          output_format: "png",
          aspect_ratio: "1:1"
        }
      }
    ) as unknown as string

    console.log('Replicate output:', output)

    if (!output) {
      throw new Error('Aucune image générée par Replicate')
    }

    const generatedImageUrl = output
    const imageResponse = await fetch(generatedImageUrl)
    
    if (!imageResponse.ok) {
      throw new Error('Erreur lors du téléchargement de l\'image générée')
    }

    const imageBuffer = await imageResponse.arrayBuffer()

    // Upload de l'image générée dans Supabase Storage
    const outputFileName = `${projectId}-output-${Date.now()}.png`
    const { error: outputUploadError } = await supabaseAdmin.storage
      .from(process.env.SUPABASE_OUTPUT_BUCKET!)
      .upload(outputFileName, imageBuffer, {
        contentType: 'image/png',
      })

    if (outputUploadError) {
      console.error('Erreur upload output:', outputUploadError)
      throw new Error('Erreur lors de l\'upload de l\'image générée')
    }

    // Récupérer l'URL publique de l'image générée
    const { data: { publicUrl: outputImageUrl } } = supabaseAdmin.storage
      .from(process.env.SUPABASE_OUTPUT_BUCKET!)
      .getPublicUrl(outputFileName)

    // Mettre à jour le projet avec l'URL de l'image générée et le statut
    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({
        output_image_url: outputImageUrl,
        status: 'completed'
      })
      .eq('id', projectId)

    if (updateError) {
      console.error('Erreur mise à jour projet:', updateError)
      throw new Error('Erreur lors de la mise à jour du projet')
    }

    return NextResponse.json({
      success: true,
      project_id: projectId,
      input_image_url: imageUrl,
      output_image_url: outputImageUrl,
    })

  } catch (error) {
    console.error('Erreur API generate:', error)
    
    // Mettre à jour le statut du projet en cas d'erreur (si le projet a été créé)
    if (projectId) {
      await supabaseAdmin
        .from('projects')
        .update({ status: 'failed' })
        .eq('id', projectId)
    }
    
    let errorMessage = 'Erreur interne du serveur'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
