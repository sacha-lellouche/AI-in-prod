# 🎯 Explication du Flow de Paiement Stripe

## 📋 Vue d'ensemble simple

Voici comment fonctionne le paiement à la génération dans votre application :

```
1. User upload image + prompt
   ↓
2. Click "Générer (2€)"
   ↓
3. Projet créé (pending) → Stripe Checkout
   ↓
4. User paie sur Stripe
   ↓
5. Webhook met à jour: payment_status = 'paid'
   ↓
6. User revient sur dashboard
   ↓
7. Click "Lancer la génération"
   ↓
8. API vérifie paiement → Génère image
   ↓
9. Image sauvegardée → Status 'completed'
```

## 🔍 Détails techniques

### Étape 1 : Upload et création du projet avec paiement

**Fichier** : `components/payment-button.tsx`

Quand l'utilisateur clique sur "Générer (2€)" :

```typescript
// 1. Appel à l'API create-checkout-session
const response = await fetch('/api/create-checkout-session', {
  method: 'POST',
  body: JSON.stringify({ imageUrl, prompt })
})

// 2. Récupération de l'URL Stripe
const { sessionUrl } = await response.json()

// 3. Redirection vers Stripe Checkout
window.location.href = sessionUrl
```

**Fichier** : `app/api/create-checkout-session/route.ts`

Cette API fait 3 choses :

```typescript
// 1. Créer le projet avec payment_status='pending'
const projectId = uuidv4()
await supabaseAdmin.from('projects').insert({
  id: projectId,
  user_id: user.id,
  input_image_url: imageUrl,
  prompt,
  status: 'pending',
  payment_status: 'pending',
  payment_amount: 2.00
})

// 2. Créer une session Stripe avec metadata
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price_data: {
      currency: 'eur',
      product_data: { name: 'Génération d\'image IA' },
      unit_amount: 200  // 2.00 EUR en centimes
    },
    quantity: 1
  }],
  mode: 'payment',
  success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/dashboard?canceled=true`,
  metadata: {
    project_id: projectId,  // ← IMPORTANT pour le webhook
    user_id: user.id
  }
})

// 3. Retourner l'URL Stripe
return NextResponse.json({ sessionUrl: session.url })
```

### Étape 2 : Paiement sur Stripe

L'utilisateur est redirigé vers Stripe Checkout où il entre ses informations de carte.

**Cartes de test** :
- Succès : `4242 4242 4242 4242`
- Échec : `4000 0000 0000 0002`

### Étape 3 : Webhook Stripe

**Fichier** : `app/api/webhooks/stripe/route.ts`

Après paiement réussi, Stripe envoie un événement `checkout.session.completed` à votre webhook.

```typescript
// 1. SÉCURITÉ : Vérifier la signature
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
)
// Si la signature est invalide, une erreur est levée

// 2. Récupérer les metadata
const session = event.data.object
const projectId = session.metadata.project_id
const userId = session.metadata.user_id

// 3. Mettre à jour le projet
await supabaseAdmin.from('projects').update({
  payment_status: 'paid',  // ← Le projet est maintenant payé
  stripe_checkout_session_id: session.id,
  stripe_payment_intent_id: session.payment_intent
})
.eq('id', projectId)
.eq('user_id', userId)  // Sécurité

// 4. Répondre à Stripe
return NextResponse.json({ received: true })
```

**IMPORTANT** : Ce webhook est accessible publiquement mais sécurisé par la vérification de signature.

### Étape 4 : Retour sur le dashboard

**Fichier** : `app/dashboard/page.tsx`

Quand l'utilisateur revient sur le dashboard :

```typescript
// 1. Détecter le retour de Stripe
const sessionId = searchParams.get('session_id')
if (sessionId) {
  alert('✅ Paiement réussi !')
  fetchProjects()  // Recharger les projets
}

// 2. Afficher les projets
// Le projet apparaît maintenant avec payment_status='paid'
```

**Fichier** : `components/project-card.tsx`

Le composant affiche différents boutons selon le statut :

```typescript
if (project.payment_status === 'pending') {
  // Badge "En attente de paiement"
}

if (project.payment_status === 'paid' && project.status === 'pending') {
  // Bouton "🚀 Lancer la génération"
}

if (project.status === 'completed') {
  // Bouton "📥 Télécharger"
}
```

### Étape 5 : Lancer la génération

Quand l'utilisateur clique sur "Lancer la génération" :

**Fichier** : `app/dashboard/page.tsx`

```typescript
const handleGenerate = async (projectId: string) => {
  await fetch('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ projectId })
  })
}
```

**Fichier** : `app/api/generate/route.ts`

Cette API fait la vérification CRITIQUE :

```typescript
// 1. Récupérer le projet
const { data: project } = await supabaseAdmin
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .eq('user_id', user.id)  // Sécurité
  .single()

// 2. ✅ VÉRIFICATION CRITIQUE
if (project.payment_status !== 'paid') {
  return NextResponse.json(
    { error: 'Le paiement doit être complété' },
    { status: 403 }
  )
}

// 3. Mettre à jour le statut à 'processing'
await supabaseAdmin.from('projects').update({
  status: 'processing'
}).eq('id', projectId)

// 4. Appeler Replicate
const prediction = await replicate.predictions.create({
  model: 'google/nano-banana',
  input: {
    prompt: project.prompt,
    image_input: [project.input_image_url]
  }
})

// 5. Attendre la génération
const completedPrediction = await replicate.wait(prediction)

// 6. Uploader l'image générée dans Supabase
const imageBuffer = await fetch(generatedImageUrl).then(r => r.arrayBuffer())
await supabaseAdmin.storage
  .from('output-images')
  .upload(outputFileName, imageBuffer)

// 7. Mettre à jour le projet avec l'image générée
await supabaseAdmin.from('projects').update({
  output_image_url: publicUrl,
  status: 'completed'
}).eq('id', projectId)
```

## 🔒 Points de sécurité

### 1. Vérification de signature webhook

```typescript
// Dans /api/webhooks/stripe
stripe.webhooks.constructEvent(body, signature, webhookSecret)
```

Si la signature est invalide, une erreur est levée. Cela empêche quelqu'un de falsifier un webhook.

### 2. Prix hardcodé côté serveur

```typescript
// Dans /api/create-checkout-session
unit_amount: GENERATION_PRICE_CENTS  // Toujours 200 (2.00 EUR)
```

Le client ne peut PAS modifier le prix. Il est défini dans `lib/stripe.ts`.

### 3. Vérification du paiement avant génération

```typescript
// Dans /api/generate
if (project.payment_status !== 'paid') {
  return 403 Forbidden
}
```

Impossible de générer sans avoir payé.

### 4. Vérification de l'utilisateur

```typescript
// Partout
.eq('user_id', user.id)
```

Un utilisateur ne peut accéder qu'à ses propres projets.

## 🧪 Comment tester

### En local

1. **Terminal 1** : Lancez l'app
   ```bash
   npm run dev
   ```

2. **Terminal 2** : Lancez le webhook forwarding
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

3. **Browser** :
   - Allez sur http://localhost:3000/dashboard
   - Uploadez une image
   - Entrez un prompt
   - Cliquez sur "Générer (2€)"
   - Utilisez la carte `4242 4242 4242 4242`
   - Vérifiez que le webhook reçoit l'événement dans Terminal 2
   - Revenez sur le dashboard
   - Cliquez sur "Lancer la génération"

### Logs à surveiller

**Terminal 1 (Next.js)** :
```
Calling Replicate with: { model: 'google/nano-banana', ... }
Uploading to bucket: output-images
✅ Projet mis à jour: xxx-yyy-zzz - Payment status: paid
```

**Terminal 2 (Stripe CLI)** :
```
checkout.session.completed [evt_xxx...]
  POST http://localhost:3000/api/webhooks/stripe [200]
```

## 📊 États possibles d'un projet

| status | payment_status | Affichage | Actions |
|--------|---------------|-----------|---------|
| `pending` | `pending` | "En attente de paiement" | Supprimer |
| `pending` | `paid` | "Payé - Prêt à générer" | Lancer génération |
| `processing` | `paid` | "Génération en cours..." | Attendre |
| `completed` | `paid` | "Complété" | Télécharger, Supprimer |
| `failed` | `paid` | "Échec" | Réessayer (TODO) |

## 💡 Points importants

1. **Le projet est créé AVANT le paiement** avec `status='pending'` et `payment_status='pending'`

2. **Le webhook met à jour `payment_status='paid'`** après paiement réussi

3. **L'API `/api/generate` vérifie TOUJOURS** que `payment_status='paid'`

4. **Le webhook est sécurisé** par vérification de signature

5. **Le prix est hardcodé** côté serveur, pas côté client

6. **Le `project_id` passe par les metadata Stripe** pour faire le lien entre le paiement et le projet

## 🚨 Erreurs courantes

### "Le paiement doit être complété"

→ Le webhook n'a pas mis à jour `payment_status='paid'`
→ Vérifiez que le webhook a bien été reçu
→ Vérifiez dans Supabase que `payment_status='paid'`

### "Bucket not found"

→ Voir `TROUBLESHOOTING.md`
→ Vérifiez que les buckets `input-images` et `output-images` existent

### Le webhook ne reçoit rien

→ En local : vérifiez que `stripe listen` est lancé
→ En prod : vérifiez l'URL dans Stripe Dashboard
→ Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct

## ✅ Checklist finale

- [ ] Variables d'environnement configurées
- [ ] Buckets Supabase créés
- [ ] Migration SQL exécutée
- [ ] Webhook Stripe configuré (local OU prod)
- [ ] Test complet du flow
- [ ] Vérification des logs

Tout est prêt ! 🎉
