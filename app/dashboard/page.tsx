'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import Header from '@/components/header'
import ImageUpload from '@/components/image-upload'

interface Project {
  id: string
  input_image_url: string | null
  output_image_url: string | null
  prompt: string
  status: string
  created_at: string
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [imageUrl, setImageUrl] = useState('')
  const [prompt, setPrompt] = useState('')
  const [uploading, setUploading] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchProjects()
    }
  }, [user])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erreur lors du chargement des projets:', error)
      } else {
        setProjects(data || [])
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageUrl || !prompt) return

    setUploading(true)
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          prompt,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setImageUrl('')
        setPrompt('')
        fetchProjects() // Recharger les projets
      } else {
        console.log('Response status:', response.status)
        console.log('Response statusText:', response.statusText)
        
        let error
        try {
          error = await response.json()
        } catch (e) {
          error = { error: `Erreur HTTP ${response.status}: ${response.statusText}` }
        }
        
        console.error('Erreur API:', error)
        alert(`Erreur: ${error.error || `HTTP ${response.status}: ${response.statusText}`}`)
      }
    } catch (error) {
      console.error('Erreur lors de la génération:', error)
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setUploading(false)
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      })

      if (response.ok) {
        fetchProjects() // Recharger les projets
      } else {
        console.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Votre Studio</span>
            <span className="block text-blue-600">d&apos;Édition IA</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Transformez vos images avec la puissance de l&apos;intelligence artificielle. 
            Ajoutez une URL d&apos;image et décrivez les modifications souhaitées.
          </p>
        </div>

        {/* Main Editor Section */}
        <div className="mt-16 bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="px-6 py-12 sm:px-12 sm:py-16 lg:py-20">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
                Créer une nouvelle image
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <ImageUpload 
                  onImageUploaded={setImageUrl}
                  currentImageUrl={imageUrl}
                />

                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
                    Décrivez les modifications souhaitées
                  </label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg"
                    placeholder="Exemple: Ajoute 2 skieurs en tenue verte sur la piste de ski..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading || !imageUrl || !prompt}
                  className="w-full py-4 px-8 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium text-lg rounded-md transition duration-200"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Génération en cours...
                    </>
                  ) : (
                    '✨ Générer l&apos;image'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Projects Gallery Section */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Mes créations
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Découvrez toutes vos images générées et modifiées
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            {loadingProjects ? (
              <div className="text-center py-12">
                <div className="text-gray-500">Chargement des projets...</div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune création pour le moment</h3>
                <p className="text-gray-500">Commencez par créer votre première image ci-dessus !</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.map((project) => (
                  <div key={project.id} className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition duration-200">
                    <div className="aspect-w-16 aspect-h-9 mb-4">
                      {project.input_image_url && (
                        <img
                          src={project.input_image_url}
                          alt="Image source"
                          className="w-full h-48 object-cover rounded-md"
                        />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 font-medium">
                      📝 {project.prompt}
                    </p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        project.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : project.status === 'processing' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {project.status === 'completed' ? '✅ Terminé' : 
                         project.status === 'processing' ? '⏳ En cours' : 
                         '❌ Échec'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(project.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    {project.output_image_url && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">🎨 Résultat:</p>
                        <img
                          src={project.output_image_url}
                          alt="Image générée"
                          className="w-full h-48 object-cover rounded-md"
                        />
                      </div>
                    )}
                    
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition duration-200"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}