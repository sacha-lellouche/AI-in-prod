import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient, getSupabaseAdmin } from '@/lib/supabase-server'

export async function DELETE(request: NextRequest) {
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

    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'ID du projet requis' },
        { status: 400 }
      )
    }

    // Récupérer les informations du projet pour vérifier que l'utilisateur en est le propriétaire
    const { data: project, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id) // S'assurer que l'utilisateur est le propriétaire
      .single()

    if (fetchError || !project) {
      return NextResponse.json(
        { error: 'Projet non trouvé ou non autorisé' },
        { status: 404 }
      )
    }

    // Supprimer les images des buckets si elles existent
    const deletePromises = []

    // Supprimer l'image d'output si elle existe
    if (project.output_image_url && process.env.SUPABASE_OUTPUT_BUCKET) {
      try {
        // Extraire le nom du fichier de l'URL
        const url = new URL(project.output_image_url)
        const pathParts = url.pathname.split('/')
        const fileName = pathParts[pathParts.length - 1]
        
        if (fileName) {
          deletePromises.push(
            supabaseAdmin.storage
              .from(process.env.SUPABASE_OUTPUT_BUCKET)
              .remove([fileName])
          )
        }
      } catch (error) {
        console.error('Erreur lors de l\'extraction du nom de fichier output:', error)
      }
    }

    // Supprimer l'image d'input si elle provient de notre bucket
    if (project.input_image_url && process.env.SUPABASE_INPUT_BUCKET) {
      try {
        const url = new URL(project.input_image_url)
        // Vérifier si l'URL provient de notre bucket Supabase
        if (url.hostname.includes('supabase')) {
          const pathParts = url.pathname.split('/')
          const fileName = pathParts[pathParts.length - 1]
          
          if (fileName) {
            deletePromises.push(
              supabaseAdmin.storage
                .from(process.env.SUPABASE_INPUT_BUCKET)
                .remove([fileName])
            )
          }
        }
      } catch (error) {
        console.error('Erreur lors de l\'extraction du nom de fichier input:', error)
      }
    }

    // Exécuter les suppressions des fichiers en parallèle
    if (deletePromises.length > 0) {
      await Promise.allSettled(deletePromises)
    }

    // Supprimer le projet de la base de données
    const { error: deleteError } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Erreur suppression projet:', deleteError)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du projet' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Projet supprimé avec succès'
    })

  } catch (error) {
    console.error('Erreur API delete:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}