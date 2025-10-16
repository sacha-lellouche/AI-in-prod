import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient, getSupabaseAdmin } from '@/lib/supabase-server'
import { stripe, GENERATION_PRICE_CENTS } from '@/lib/stripe'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  
  try {
    // Vérifier l'authentification
    const supabase = await createServerComponentClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { imageUrl, prompt } = body

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: 'URL image et prompt requis' },
        { status: 400 }
      )
    }

    // Créer un projet avec statut pending et payment_status pending
    const projectId = uuidv4()
    const { error: insertError } = await supabaseAdmin
      .from('projects')
      .insert({
        id: projectId,
        user_id: user.id,
        input_image_url: imageUrl,
        prompt,
        status: 'pending',
        payment_status: 'pending',
        payment_amount: GENERATION_PRICE_CENTS / 100, // Montant en EUR
      })

    if (insertError) {
      console.error('Erreur insertion projet:', insertError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du projet' },
        { status: 500 }
      )
    }

    // Créer une session Stripe Checkout
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Génération d\'image IA',
              description: 'Modification d\'image avec intelligence artificielle',
            },
            unit_amount: GENERATION_PRICE_CENTS, // Montant en centimes (2.00 EUR)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard?canceled=true`,
      metadata: {
        project_id: projectId,
        user_id: user.id,
      },
      client_reference_id: user.id,
    })

    // Mettre à jour le projet avec l'ID de la session Stripe
    await supabaseAdmin
      .from('projects')
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq('id', projectId)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      projectId: projectId,
    })

  } catch (error) {
    console.error('Erreur API create-checkout-session:', error)
    
    let errorMessage = 'Erreur lors de la création de la session de paiement'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
