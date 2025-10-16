'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import Header from '@/components/header'
import ImageUpload from '@/components/image-upload'
import PaymentButton from '@/components/payment-button'
import ProjectCard from '@/components/project-card'

interface Project {
  id: string
  input_image_url: string | null
  output_image_url: string | null
  prompt: string
  status: string
  payment_status: string
  created_at: string
}

function DashboardContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
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

  // Vérifier si on revient d'un paiement réussi
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    const canceled = searchParams.get('canceled')

    if (sessionId) {
      // Paiement réussi
      alert('✅ Paiement réussi ! Vous pouvez maintenant lancer la génération.')
      // Nettoyer l'URL
      router.replace('/dashboard')
      // Recharger les projets
      fetchProjects()
    } else if (canceled) {
      // Paiement annulé
      alert('⚠️ Paiement annulé.')
      router.replace('/dashboard')
    }
  }, [searchParams, router])

  const fetchProjects = useCallback(async () => {
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
  }, [supabase, user?.id])

  useEffect(() => {
    if (user) {
      fetchProjects()
    }
  }, [user, fetchProjects])

  const handleGenerate = async (projectId: string) => {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      })

      if (response.ok) {
        alert('✅ Génération lancée ! Rechargez la page dans quelques secondes.')
        fetchProjects()
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.error}`)
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la génération')
    }
  }

  const handlePaymentSuccess = () => {
    setImageUrl('')
    setPrompt('')
    // Note: le rechargement des projets se fera au retour du webhook
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
              
              <div className="space-y-6">
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

                <PaymentButton
                  imageUrl={imageUrl}
                  prompt={prompt}
                  onSuccess={handlePaymentSuccess}
                  disabled={uploading || !imageUrl || !prompt}
                />
              </div>
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
          
          <div>
            {loadingProjects ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <div className="text-gray-500">Chargement des projets...</div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4 flex justify-center">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune création pour le moment</h3>
                <p className="text-gray-500">Commencez par créer votre première image ci-dessus !</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onGenerate={handleGenerate}
                    onDelete={deleteProject}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}