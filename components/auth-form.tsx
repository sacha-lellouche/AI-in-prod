'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

interface AuthFormProps {
  mode?: 'signin' | 'signup'
  onSuccess?: () => void
}

export default function AuthForm({ mode = 'signin', onSuccess }: AuthFormProps) {
  const [currentMode, setCurrentMode] = useState(mode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  
  const { signIn, signUp } = useAuth()
  const router = useRouter()

  const validateForm = () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs')
      return false
    }
    
    if (!email.includes('@')) {
      setError('Veuillez entrer un email valide')
      return false
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return false
    }

    if (currentMode === 'signup' && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    
    if (!validateForm()) return

    setLoading(true)

    try {
      if (currentMode === 'signup') {
        const { error } = await signUp(email, password)
        if (error) {
          setError(error.message)
        } else {
          setMessage('Vérifiez votre email pour confirmer votre inscription')
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        } else {
          onSuccess?.()
          router.push('/dashboard')
        }
      }
    } catch (err) {
      setError('Une erreur inattendue s&apos;est produite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Onglets */}
      <div className="flex mb-6 border-b">
        <button
          onClick={() => setCurrentMode('signin')}
          className={`flex-1 py-2 px-4 text-center ${
            currentMode === 'signin'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Se connecter
        </button>
        <button
          onClick={() => setCurrentMode('signup')}
          className={`flex-1 py-2 px-4 text-center ${
            currentMode === 'signup'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          S&apos;inscrire
        </button>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="votre@email.com"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="••••••••"
            required
          />
        </div>

        {currentMode === 'signup' && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
              required
            />
          </div>
        )}

        {error && (
          <div className="p-3 text-red-700 bg-red-100 border border-red-300 rounded-md">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 text-green-700 bg-green-100 border border-green-300 rounded-md">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-md transition duration-200"
        >
          {loading ? 'Chargement...' : (currentMode === 'signup' ? 'S\'inscrire' : 'Se connecter')}
        </button>
      </form>
    </div>
  )
}