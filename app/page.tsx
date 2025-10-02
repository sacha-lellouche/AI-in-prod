'use client'

import { useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [outputImage, setOutputImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile || !prompt.trim()) {
      setError('Veuillez sélectionner une image et saisir un prompt')
      return
    }

    setIsLoading(true)
    setError(null)
    setOutputImage(null)

    try {
      // Upload de l'image directement vers Supabase Storage
      const fileExtension = selectedFile.name.split('.').pop()
      const fileName = `${uuidv4()}-input-${Date.now()}.${fileExtension}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(process.env.NEXT_PUBLIC_SUPABASE_INPUT_BUCKET || 'input-images')
        .upload(fileName, selectedFile)

      if (uploadError) {
        throw new Error(`Erreur upload: ${uploadError.message}`)
      }

      // Récupérer l'URL publique de l'image uploadée
      const { data: { publicUrl: inputImageUrl } } = supabase.storage
        .from(process.env.NEXT_PUBLIC_SUPABASE_INPUT_BUCKET || 'input-images')
        .getPublicUrl(fileName)

      // Appeler l'API avec l'URL de l'image
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: inputImageUrl,
          prompt: prompt,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération')
      }

      setOutputImage(data.output_image_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Éditeur d&apos;Images IA
            </h1>
            <p className="text-lg text-gray-600">
              Transformez vos images avec l&apos;intelligence artificielle
            </p>
          </div>

          {/* Main Form */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner une image
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                  <div className="space-y-1 text-center">
                    {previewUrl ? (
                      <div className="mb-4">
                        <Image
                          src={previewUrl}
                          alt="Preview"
                          width={200}
                          height={200}
                          className="mx-auto rounded-lg object-cover"
                        />
                      </div>
                    ) : (
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="image"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Télécharger un fichier</span>
                        <input
                          id="image"
                          name="image"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">ou glisser-déposer</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF jusqu&apos;à 10MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Prompt Input */}
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt de transformation
                </label>
                <textarea
                  id="prompt"
                  name="prompt"
                  rows={3}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md p-3"
                  placeholder="Décrivez comment vous souhaitez transformer votre image..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading || !selectedFile || !prompt.trim()}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Génération en cours...
                    </>
                  ) : (
                    'Générer'
                  )}
                </button>
              </div>
            </form>

            {/* Error Message */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Erreur
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {outputImage && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Résultat
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Original Image */}
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Image originale</h3>
                  {previewUrl && (
                    <div className="relative w-full max-w-md">
                      <Image
                        src={previewUrl}
                        alt="Image originale"
                        width={400}
                        height={400}
                        className="w-full h-80 rounded-lg object-contain shadow-md bg-gray-50"
                        style={{ aspectRatio: 'auto' }}
                      />
                    </div>
                  )}
                </div>

                {/* Generated Image */}
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Image générée</h3>
                  <div className="relative w-full max-w-md">
                    <Image
                      src={outputImage}
                      alt="Image générée"
                      width={400}
                      height={400}
                      className="w-full h-80 rounded-lg object-contain shadow-md bg-gray-50"
                      style={{ aspectRatio: 'auto' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
