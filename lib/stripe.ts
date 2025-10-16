import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

// Initialiser Stripe côté serveur
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
})

// Prix par génération (en centimes)
export const GENERATION_PRICE_CENTS = 200 // 2.00 EUR
export const GENERATION_PRICE_EUR = 2.00
