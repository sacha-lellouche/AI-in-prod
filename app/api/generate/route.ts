import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Replicate from 'replicate'
import { v4 as uuidv4 } from 'uuid'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageUrl, prompt } = body

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: 'URL image et prompt requis' },
        { status: 400 }
      )
    }

    // Créer un nouveau projet dans la base de données avec l'URL de l'image
    const projectId = uuidv4()
    const { error: insertError } = await supabaseAdmin
      .from('projects')
      .insert({
        id: projectId,
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

    // Appeler Replicate pour générer l'image
    const output = await replicate.run(
      process.env.REPLICATE_MODEL as `${string}/${string}`,
      {
        input: {
          image_input: [imageUrl], // Le modèle attend un tableau d'images
          prompt: prompt,
          output_format: "png"
        }
      }
    ) as unknown as string // Le modèle retourne directement une URL (string), pas un tableau

    if (!output) {
      throw new Error('Aucune image générée par Replicate')
    }

    // Télécharger l'image générée
    const generatedImageUrl = output // output est déjà l'URL directe
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
