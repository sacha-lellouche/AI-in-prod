'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Project {
  id: string
  input_image_url: string | null
  output_image_url: string | null
  prompt: string
  status: string
  payment_status: string
  created_at: string
}

interface ProjectCardProps {
  project: Project
  onGenerate: (projectId: string) => void
  onDelete: (projectId: string) => void
}

export default function ProjectCard({ project, onGenerate, onDelete }: ProjectCardProps) {
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await onGenerate(project.id)
    } finally {
      setGenerating(false)
    }
  }

  const getStatusBadge = () => {
    if (project.payment_status === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          ⏳ En attente de paiement
        </span>
      )
    }
    if (project.payment_status === 'paid' && project.status === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✅ Payé - Prêt à générer
        </span>
      )
    }
    if (project.status === 'processing') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          🔄 Génération en cours...
        </span>
      )
    }
    if (project.status === 'completed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✅ Complété
        </span>
      )
    }
    if (project.status === 'failed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          ❌ Échec
        </span>
      )
    }
    return null
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-6">
        {/* Status Badge */}
        <div className="mb-4">
          {getStatusBadge()}
        </div>

        {/* Prompt */}
        <p className="text-sm text-gray-600 mb-4">
          <span className="font-semibold">Prompt:</span> {project.prompt}
        </p>

        {/* Images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Image d'entrée */}
          {project.input_image_url && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">Image d&apos;origine</h4>
              <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={project.input_image_url}
                  alt="Image d'origine"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}

          {/* Image générée */}
          {project.output_image_url && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">Image générée</h4>
              <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={project.output_image_url}
                  alt="Image générée"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {/* Bouton "Lancer la génération" si payé mais pas généré */}
          {project.payment_status === 'paid' && project.status === 'pending' && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
            >
              {generating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Génération...
                </>
              ) : (
                '🚀 Lancer la génération'
              )}
            </button>
          )}

          {/* Bouton de téléchargement si complété */}
          {project.status === 'completed' && project.output_image_url && (
            <a
              href={project.output_image_url}
              download
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              📥 Télécharger
            </a>
          )}

          {/* Bouton supprimer */}
          <button
            onClick={() => onDelete(project.id)}
            className="inline-flex justify-center items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            🗑️
          </button>
        </div>

        {/* Date */}
        <p className="text-xs text-gray-400 mt-4">
          Créé le {new Date(project.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  )
}
