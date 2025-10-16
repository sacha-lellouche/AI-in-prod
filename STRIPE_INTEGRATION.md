# Intégration Stripe - Paiement à la génération

## 📋 Vue d'ensemble

Ce projet utilise Stripe Checkout pour implémenter un modèle de "paiement à la génération" :
- **Prix par génération : 2.00 EUR**
- L'utilisateur paie avant que l'image soit générée
- Après paiement réussi, un webhook Stripe met à jour le statut du projet
- L'utilisateur peut alors lancer la génération

## 🔄 Flow complet

### 1. Création du projet et paiement

```mermaid
User → Dashboard: Upload image + prompt
Dashboard → API create-checkout-session: POST { imageUrl, prompt }
API → Supabase: Create project (status='pending', payment_status='pending')
API → Stripe: Create checkout session with metadata { project_id }
Stripe → User: Redirect to Stripe Checkout page
```

**Code concerné :**
- `components/payment-button.tsx` : Bouton "Générer l'image (2€)"
- `app/api/create-checkout-session/route.ts` : Crée la session Stripe

### 2. Paiement et webhook

```mermaid
User → Stripe: Complete payment
Stripe → API webhook: POST /api/webhooks/stripe (event: checkout.session.completed)
API webhook → Stripe: Verify signature
API webhook → Supabase: Update project (payment_status='paid')
Stripe → User: Redirect to /dashboard?session_id=xxx
```

**Code concerné :**
- `app/api/webhooks/stripe/route.ts` : Gère les événements Stripe

### 3. Génération de l'image

```mermaid
User → Dashboard: Click "Lancer la génération"
Dashboard → API generate: POST { projectId }
API generate → Supabase: Verify payment_status='paid'
API generate → Replicate: Generate image
API generate → Supabase: Update project (status='completed', output_image_url)
API generate → User: Return success
```

**Code concerné :**
- `components/project-card.tsx` : Affiche le bouton "Lancer la génération"
- `app/api/generate/route.ts` : Vérifie le paiement et génère l'image

## 🔧 Configuration

### 1. Variables d'environnement

Ajoutez dans `.env.local` :

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_PUBLISHABLE_ICI
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRET_ICI
NEXT_PUBLIC_URL=http://localhost:3000
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

**Pour Vercel en production :**
Ajoutez toutes ces variables dans les Settings → Environment Variables de votre projet Vercel.

### 2. Configuration du webhook Stripe

#### En local (développement)

1. Installez Stripe CLI :
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Connectez-vous :
   ```bash
   stripe login
   ```

3. Forwardez les webhooks vers votre serveur local :
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. Copiez le `webhook signing secret` qui s'affiche (commence par `whsec_...`) et ajoutez-le dans `.env.local` :
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx...
   ```

5. Testez le webhook :
   ```bash
   stripe trigger checkout.session.completed
   ```

#### En production (Vercel)

1. Allez sur [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)

2. Cliquez sur "Add endpoint"

3. Configurez :
   - **URL d'endpoint** : `https://votre-domaine.vercel.app/api/webhooks/stripe`
   - **Description** : "Production webhook for AI Image Editor"
   - **Événements à écouter** : Sélectionnez `checkout.session.completed`

4. Copiez le **Signing secret** qui s'affiche

5. Ajoutez-le dans Vercel :
   - Allez dans Settings → Environment Variables
   - Ajoutez `STRIPE_WEBHOOK_SECRET` avec la valeur copiée
   - Redéployez votre application

### 3. Schéma de la table `projects`

Le schéma Supabase doit inclure les colonnes de paiement :

```sql
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp without time zone DEFAULT now(),
  input_image_url text NOT NULL,
  output_image_url text,
  prompt text NOT NULL,
  status text DEFAULT 'pending'::text,  -- 'pending', 'processing', 'completed', 'failed'
  user_id uuid,
  payment_status text DEFAULT 'pending'::text,  -- 'pending', 'paid'
  payment_amount numeric DEFAULT 2.00,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

## 📁 Structure des fichiers

### Backend (API Routes)

- **`lib/stripe.ts`** : Configuration Stripe côté serveur, constantes de prix
- **`app/api/create-checkout-session/route.ts`** : Crée une session Stripe Checkout
- **`app/api/webhooks/stripe/route.ts`** : Gère les webhooks Stripe (CRITIQUE : vérifie la signature)
- **`app/api/generate/route.ts`** : Génère l'image (vérifie `payment_status='paid'`)

### Frontend (Components)

- **`components/payment-button.tsx`** : Bouton pour payer et démarrer le processus
- **`components/project-card.tsx`** : Carte affichant un projet avec son statut de paiement
- **`app/dashboard/page.tsx`** : Page principale du dashboard

## 🔒 Sécurité

### Vérification de signature webhook

**IMPORTANT** : L'endpoint `/api/webhooks/stripe` est accessible publiquement. C'est normal car Stripe doit pouvoir l'appeler. La sécurité repose sur :

1. **Vérification de signature** dans `app/api/webhooks/stripe/route.ts` :
   ```typescript
   const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
   ```
   Cette ligne vérifie que le webhook provient bien de Stripe.

2. **Ne jamais faire confiance au client** pour le montant :
   ```typescript
   // Dans create-checkout-session/route.ts
   unit_amount: GENERATION_PRICE_CENTS, // Hardcodé à 200 (2.00 EUR)
   ```

3. **Vérifier l'utilisateur** avant la génération :
   ```typescript
   // Dans generate/route.ts
   if (project.payment_status !== 'paid') {
     return NextResponse.json({ error: 'Paiement requis' }, { status: 403 })
   }
   ```

### Gestion des erreurs

- Si le paiement échoue → le projet reste avec `payment_status='pending'`
- Si le webhook échoue → vérifiez les logs Vercel et Stripe Dashboard
- Si la génération échoue après paiement → le projet reste payé, l'utilisateur peut réessayer

## 🧪 Tests

### Test du flow complet en local

1. Lancez votre serveur :
   ```bash
   npm run dev
   ```

2. Lancez le webhook forwarding :
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

3. Allez sur `http://localhost:3000/dashboard`

4. Uploadez une image et entrez un prompt

5. Cliquez sur "Générer l'image (2€)"

6. Utilisez une carte de test Stripe :
   - Numéro : `4242 4242 4242 4242`
   - Date : N'importe quelle date future
   - CVC : N'importe quel 3 chiffres

7. Vérifiez les logs :
   - Terminal Next.js : logs de l'API
   - Terminal Stripe CLI : logs du webhook

### Cartes de test Stripe

- **Succès** : `4242 4242 4242 4242`
- **Échec** : `4000 0000 0000 0002`
- **Authentification 3D Secure** : `4000 0027 6000 3184`

## 📊 Monitoring

### Logs Vercel

Pour voir les logs en production :
```bash
vercel logs --follow
```

Ou dans Vercel Dashboard → Votre projet → Functions → Real-time logs

### Logs Stripe

- Allez sur [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
- Cliquez sur votre endpoint
- Voir les derniers événements et leurs réponses

### Logs utiles dans le code

Le code contient des logs avec emojis pour faciliter le débogage :

```typescript
console.log('✅ Webhook vérifié:', event.type)
console.log('💳 Paiement complété pour la session:', session.id)
console.log('⚠️ Tentative de génération sans paiement:', projectId)
```

## 🚨 Troubleshooting

### Le webhook ne reçoit pas les événements

1. Vérifiez que `STRIPE_WEBHOOK_SECRET` est correctement configuré
2. En production, vérifiez que l'URL du webhook dans Stripe Dashboard est correcte
3. Vérifiez les logs Stripe Dashboard pour voir si les webhooks sont envoyés

### Le paiement réussit mais le projet n'est pas mis à jour

1. Vérifiez les logs du webhook : `vercel logs --follow`
2. Vérifiez que le `project_id` est bien dans les metadata de la session
3. Vérifiez que l'utilisateur correspond

### L'utilisateur ne peut pas générer après paiement

1. Vérifiez dans Supabase que `payment_status='paid'`
2. Vérifiez les logs de l'API `/api/generate`
3. Essayez de recharger la page dashboard

### Erreur "Bucket not found" lors de la génération

Voir le fichier `TROUBLESHOOTING.md` pour les solutions liées à Supabase Storage.

## 📚 Ressources

- [Documentation Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Documentation Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Cartes de test Stripe](https://stripe.com/docs/testing)

## ✅ Checklist de déploiement

- [ ] Variables d'environnement ajoutées dans Vercel
- [ ] Webhook configuré dans Stripe Dashboard (production)
- [ ] `STRIPE_WEBHOOK_SECRET` ajouté dans Vercel
- [ ] Table `projects` avec les colonnes de paiement
- [ ] Test complet du flow en production
- [ ] Vérification des logs Stripe et Vercel

## 💡 Améliorations possibles

1. **Emails de confirmation** : Envoyer un email après paiement réussi
2. **Remboursements** : Gérer les remboursements en cas d'échec de génération
3. **Webhooks supplémentaires** : Gérer `payment_intent.succeeded`, `charge.failed`, etc.
4. **Historique des paiements** : Afficher l'historique dans le dashboard
5. **Crédits** : Système de crédits prépayés au lieu de paiement par génération
