'use client'

import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Header() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              AI Image Editor
            </Link>
          </div>

          <nav className="flex items-center space-x-4">
            {loading ? (
              <div className="text-gray-500">Chargement...</div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/dashboard"
                  className="text-gray-700 hover:text-blue-600 transition duration-200"
                >
                  Dashboard
                </Link>
                <span className="text-gray-600">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition duration-200"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-blue-600 transition duration-200"
                >
                  Connexion
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-200"
                >
                  S&apos;inscrire
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}