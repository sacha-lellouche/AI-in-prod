'use client'

import { useState, useRef } from 'react'

interface ImageUploadProps {
  onImageUploaded: (url: string) => void
  currentImageUrl: string
}

export default function ImageUpload({ onImageUploaded, currentImageUrl }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => 
      file.type.startsWith('image/') || 
      file.type === 'image/heic' || 
      file.name.toLowerCase().endsWith('.heic')
    )

    if (imageFile) {
      uploadImage(imageFile)
    } else {
      alert('Veuillez déposer un fichier image (JPEG, PNG, HEIC)')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadImage(file)
    }
  }

  const uploadImage = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const { url } = await response.json()
        onImageUploaded(url)
      } else {
        const error = await response.json()
        alert(`Erreur d'upload: ${error.error}`)
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      alert('Erreur lors de l\'upload de l\'image')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="space-y-4">
      {/* Zone de drag & drop */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="animate-spin mx-auto h-8 w-8 text-blue-600">
              <svg fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-gray-600">Upload en cours...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Déposez votre image ici
              </p>
              <p className="text-gray-500">
                ou <span className="text-blue-600 underline">cliquez pour sélectionner</span>
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Formats supportés: JPEG, PNG, HEIC (max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Aperçu de l'image */}
      {currentImageUrl && !isUploading && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">Image sélectionnée :</p>
          <img
            src={currentImageUrl}
            alt="Image sélectionnée"
            className="w-full h-48 object-cover rounded-md"
          />
        </div>
      )}

      {/* Séparateur */}
      <div className="flex items-center">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="px-4 text-sm text-gray-500">ou</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      {/* Champ URL comme fallback */}
      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
          URL d'une image en ligne
        </label>
        <input
          id="imageUrl"
          type="url"
          value={currentImageUrl.startsWith('http') ? currentImageUrl : ''}
          onChange={(e) => onImageUploaded(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg"
          placeholder="https://example.com/image.jpg"
        />
        <p className="text-xs text-gray-500 mt-2">
          💡 Essayez ces images de test :
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            onClick={() => onImageUploaded('https://images.unsplash.com/photo-1551524164-687a55dd1126?w=800')}
            className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition duration-200"
          >
            🎿 Montagne ski
          </button>
          <button
            type="button"
            onClick={() => onImageUploaded('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800')}
            className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition duration-200"
          >
            🏔️ Paysage
          </button>
          <button
            type="button"
            onClick={() => onImageUploaded('https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800')}
            className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition duration-200"
          >
            🐱 Chat
          </button>
        </div>
      </div>
    </div>
  )
}