import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import Stripe from 'stripe'

// IMPORTANT: Désactiver le parsing automatique du body pour la vérification de signature
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  
  try {
    // Récupérer le body brut pour la vérification de signature
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ Stripe webhook: signature manquante')
      return NextResponse.json(
        { error: 'Signature manquante' },
        { status: 400 }
      )
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET non configuré')
      return NextResponse.json(
        { error: 'Configuration webhook invalide' },
        { status: 500 }
      )
    }

    // Vérifier la signature du webhook
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log('✅ Webhook vérifié:', event.type)
    } catch (err) {
      console.error('❌ Erreur vérification signature:', err instanceof Error ? err.message : err)
      return NextResponse.json(
        { error: 'Signature invalide' },
        { status: 400 }
      )
    }

    // Gérer l'événement checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      console.log('💳 Paiement complété pour la session:', session.id)
      console.log('📦 Metadata:', session.metadata)

      const projectId = session.metadata?.project_id
      const userId = session.metadata?.user_id

      if (!projectId) {
        console.error('❌ project_id manquant dans les metadata')
        return NextResponse.json(
          { error: 'project_id manquant' },
          { status: 400 }
        )
      }

      // Mettre à jour le projet avec payment_status='paid'
      const { data: project, error: updateError } = await supabaseAdmin
        .from('projects')
        .update({
          payment_status: 'paid',
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', projectId)
        .eq('user_id', userId) // Sécurité: vérifier que c'est bien le bon utilisateur
        .select()
        .single()

      if (updateError) {
        console.error('❌ Erreur mise à jour projet:', updateError)
        return NextResponse.json(
          { error: 'Erreur mise à jour projet' },
          { status: 500 }
        )
      }

      console.log('✅ Projet mis à jour:', project.id, '- Payment status:', project.payment_status)
      
      // TODO: Optionnel - envoyer un email de confirmation à l'utilisateur
    }

    // Répondre à Stripe que le webhook a été reçu
    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Erreur webhook Stripe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
