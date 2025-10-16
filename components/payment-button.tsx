'use client'

import { useState } from 'react'

// Prix par génération (copié ici pour éviter l'import depuis lib/stripe qui est côté serveur)
const GENERATION_PRICE_EUR = 2.00

interface PaymentButtonProps {
  imageUrl: string
  prompt: string
  onSuccess: () => void
  disabled?: boolean
}

export default function PaymentButton({ imageUrl, prompt, onSuccess, disabled }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePayment = async () => {
    if (!imageUrl || !prompt) {
      alert('Veuillez renseigner une URL d\'image et un prompt')
      return
    }

    setLoading(true)
    try {
      // Créer une session de paiement Stripe
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          prompt,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la création de la session de paiement')
      }

      const { sessionUrl } = await response.json()
      
      // Rediriger vers Stripe Checkout
      window.location.href = sessionUrl

    } catch (error) {
      console.error('Erreur:', error)
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || loading || !imageUrl || !prompt}
      className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Redirection...
        </>
      ) : (
        <>
          💳 Générer l&apos;image ({GENERATION_PRICE_EUR}€)
        </>
      )}
    </button>
  )
}
