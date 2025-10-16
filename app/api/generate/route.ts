import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient, getSupabaseAdmin } from '@/lib/supabase-server'
import Replicate from 'replicate'
import { v4 as uuidv4 } from 'uuid'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

const REPLICATE_MODEL = process.env.REPLICATE_MODEL || 'google/nano-banana'

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
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
    const { projectId: existingProjectId } = body

    if (!existingProjectId) {
      return NextResponse.json(
        { error: 'ID du projet requis' },
        { status: 400 }
      )
    }

    projectId = existingProjectId

    // Récupérer le projet et vérifier qu'il appartient à l'utilisateur
    const { data: project, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !project) {
      return NextResponse.json(
        { error: 'Projet non trouvé ou non autorisé' },
        { status: 404 }
      )
    }

    // ✅ VÉRIFICATION CRITIQUE: Le paiement doit être complété
    if (project.payment_status !== 'paid') {
      console.error('⚠️ Tentative de génération sans paiement:', projectId, '- Status:', project.payment_status)
      return NextResponse.json(
        { error: 'Le paiement doit être complété avant de générer l\'image' },
        { status: 403 }
      )
    }

    // Vérifier que l'image n'a pas déjà été générée
    if (project.status === 'completed' && project.output_image_url) {
      return NextResponse.json(
        { error: 'Cette image a déjà été générée' },
        { status: 400 }
      )
    }

    const imageUrl = project.input_image_url
    const prompt = project.prompt

    // Valider que l'URL est une vraie URL d'image
    try {
      const url = new URL(imageUrl)
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      const hasValidExtension = validExtensions.some(ext => 
        url.pathname.toLowerCase().includes(ext)
      )
      
      // Accepter les URLs de Supabase Storage (gmymedqrfxbjlgohuqoo.supabase.co)
      const isSupabaseStorage = url.hostname.includes('supabase.co')
      const isUnsplash = url.hostname.includes('unsplash.com')
      const isImageHost = url.hostname.includes('images.')
      
      if (!hasValidExtension && !isSupabaseStorage && !isUnsplash && !isImageHost) {
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

    // Mettre à jour le statut à 'processing'
    await supabaseAdmin
      .from('projects')
      .update({ status: 'processing' })
      .eq('id', projectId)

    // Appeler Replicate pour modifier l'image avec google/nano-banana
    console.log('Calling Replicate with:', {
      model: REPLICATE_MODEL,
      prompt,
      imageUrl
    })
    
    // Utiliser l'API asynchrone de Replicate avec wait()
    console.log('Creating prediction...')
    const prediction = await replicate.predictions.create({
      model: REPLICATE_MODEL as `${string}/${string}`,
      input: {
        prompt: prompt,
        image_input: [imageUrl],
        output_format: "png",
        aspect_ratio: "1:1"
      }
    })

    console.log('Prediction created:', prediction.id, 'Status:', prediction.status)
    
    // Attendre que la prédiction soit terminée
    console.log('Waiting for prediction to complete...')
    const completedPrediction = await replicate.wait(prediction, {
      interval: 1000, // Vérifier toutes les secondes
    })

    console.log('Prediction completed:', completedPrediction.status)
    const output = completedPrediction.output

    console.log('Replicate output type:', typeof output)
    console.log('Replicate output:', JSON.stringify(output, null, 2))

    // Gérer différents types de retour de Replicate
    let generatedImageUrl: string | undefined
    
    if (typeof output === 'string') {
      generatedImageUrl = output
      console.log('Output is string:', generatedImageUrl)
    } else if (Array.isArray(output)) {
      console.log('Output is array, length:', output.length)
      if (output.length > 0) {
        generatedImageUrl = output[0]
        console.log('First element:', generatedImageUrl)
      }
    } else if (output && typeof output === 'object') {
      console.log('Output is object, keys:', Object.keys(output))
      
      // Essayer différentes propriétés possibles
      const possibleKeys = ['url', 'output', 'image', 'images', 'result', 'data', '0']
      
      for (const key of possibleKeys) {
        if (key in output) {
          console.log(`Found key "${key}" in output`)
          const value = (output as Record<string, unknown>)[key]
          
          if (typeof value === 'string') {
            generatedImageUrl = value
            console.log(`Extracted URL from ${key}:`, generatedImageUrl)
            break
          } else if (Array.isArray(value) && value.length > 0) {
            generatedImageUrl = value[0]
            console.log(`Extracted URL from ${key}[0]:`, generatedImageUrl)
            break
          }
        }
      }
      
      // Si toujours pas trouvé, essayer de prendre la première valeur string
      if (!generatedImageUrl) {
        console.log('Trying to find first string value in object...')
        const values = Object.values(output)
        for (const value of values) {
          if (typeof value === 'string' && value.startsWith('http')) {
            generatedImageUrl = value
            console.log('Found URL in object values:', generatedImageUrl)
            break
          }
        }
      }
    }

    if (!generatedImageUrl || typeof generatedImageUrl !== 'string') {
      console.error('Failed to extract image URL from Replicate response')
      console.error('Output type:', typeof output)
      console.error('Output value:', JSON.stringify(output, null, 2))
      console.error('Available keys:', output && typeof output === 'object' ? Object.keys(output) : 'N/A')
      throw new Error(`Aucune URL d'image valide générée par Replicate. Format reçu: ${typeof output}. Keys: ${output && typeof output === 'object' ? Object.keys(output).join(', ') : 'none'}`)
    }

    console.log('Generated image URL:', generatedImageUrl)
    
    const imageResponse = await fetch(generatedImageUrl)
    
    if (!imageResponse.ok) {
      throw new Error('Erreur lors du téléchargement de l\'image générée')
    }

    const imageBuffer = await imageResponse.arrayBuffer()

    // Upload de l'image générée dans Supabase Storage
    const outputBucket = process.env.NEXT_PUBLIC_SUPABASE_OUTPUT_BUCKET?.trim() || 
                        process.env.SUPABASE_OUTPUT_BUCKET?.trim() || 
                        'output-images'
    const outputFileName = `${projectId}-output-${Date.now()}.png`
    
    console.log('Uploading to bucket:', outputBucket)
    console.log('Output file name:', outputFileName)
    
    const { error: outputUploadError } = await supabaseAdmin.storage
      .from(outputBucket)
      .upload(outputFileName, imageBuffer, {
        contentType: 'image/png',
      })

    if (outputUploadError) {
      console.error('Erreur upload output:', outputUploadError)
      throw new Error('Erreur lors de l\'upload de l\'image générée')
    }

    // Récupérer l'URL publique de l'image générée
    const { data: { publicUrl: outputImageUrl } } = supabaseAdmin.storage
      .from(outputBucket)
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
