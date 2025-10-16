# 🎨 AI Image Editor - Paiement à la génération

Application Next.js 15 avec Supabase et Stripe pour la modification d'images par IA avec un modèle de paiement à la génération.

## ✨ Fonctionnalités

- 🖼️ **Upload d'images** via Supabase Storage
- 🤖 **Génération d'images par IA** avec Replicate (Google Nano-Banana)
- 💳 **Paiement Stripe** : 2.00 EUR par génération
- 🔐 **Authentification** via Supabase Auth
- 📊 **Dashboard** pour gérer ses projets
- 🔒 **Sécurité** : Vérification de paiement avant génération

## 🏗️ Architecture

### Flow de paiement

1. **Upload + Prompt** → Crée un projet (`status='pending'`, `payment_status='pending'`)
2. **Paiement Stripe** → Redirige vers Stripe Checkout
3. **Webhook Stripe** → Met à jour `payment_status='paid'`
4. **Génération** → Lance la génération d'image via Replicate
5. **Résultat** → Image sauvegardée dans Supabase Storage

### Technologies

- **Frontend** : Next.js 15, React, TailwindCSS
- **Backend** : Next.js API Routes
- **Base de données** : Supabase (PostgreSQL)
- **Stockage** : Supabase Storage
- **Authentification** : Supabase Auth
- **Paiement** : Stripe Checkout + Webhooks
- **IA** : Replicate (Google Nano-Banana)

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone <votre-repo>
cd ai-image-editor-clean
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Créez un fichier `.env.local` à la racine :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key

# Supabase Storage
NEXT_PUBLIC_SUPABASE_INPUT_BUCKET=input-images
NEXT_PUBLIC_SUPABASE_OUTPUT_BUCKET=output-images

# Replicate
REPLICATE_API_TOKEN=votre_token_replicate
REPLICATE_MODEL=google/nano-banana

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_URL=http://localhost:3000
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Configurer Supabase

#### A. Créer les buckets Storage

Dans Supabase Dashboard → Storage :
- Créer `input-images` (public)
- Créer `output-images` (public)

#### B. Exécuter la migration SQL

Dans Supabase Dashboard → SQL Editor, exécuter le contenu de `SUPABASE_MIGRATION.md`

### 5. Configurer Stripe

#### En local

```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# Se connecter
stripe login

# Forwarder les webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copiez le `webhook signing secret` dans `.env.local`

#### En production

1. Allez sur Stripe Dashboard → Webhooks
2. Créez un endpoint : `https://votre-domaine.vercel.app/api/webhooks/stripe`
3. Sélectionnez l'événement : `checkout.session.completed`
4. Copiez le signing secret dans les variables Vercel

### 6. Lancer le projet

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

## 📁 Structure du projet

```
.
├── app/
│   ├── api/
│   │   ├── create-checkout-session/   # Crée une session Stripe
│   │   ├── generate/                  # Génère l'image (vérifie paiement)
│   │   ├── upload/                    # Upload l'image
│   │   ├── delete/                    # Supprime un projet
│   │   └── webhooks/
│   │       └── stripe/                # Webhook Stripe
│   ├── dashboard/                     # Page principale
│   ├── login/                         # Connexion
│   └── signup/                        # Inscription
├── components/
│   ├── payment-button.tsx             # Bouton de paiement
│   ├── project-card.tsx               # Carte de projet
│   ├── image-upload.tsx               # Upload d'image
│   ├── auth-form.tsx                  # Formulaire auth
│   └── header.tsx                     # En-tête
├── lib/
│   ├── stripe.ts                      # Config Stripe
│   ├── supabase.ts                    # Client Supabase
│   └── supabase-server.ts             # Supabase SSR
├── STRIPE_INTEGRATION.md              # Doc Stripe
├── SUPABASE_MIGRATION.md              # Migration SQL
├── TROUBLESHOOTING.md                 # Dépannage
└── DEPLOYMENT.md                      # Déploiement

```

## 🧪 Test en local

### 1. Avec une vraie carte (mode test)

Carte de test Stripe : `4242 4242 4242 4242`
- Date : n'importe quelle date future
- CVC : n'importe quel 3 chiffres

### 2. Avec le CLI Stripe

```bash
# Terminal 1: Lancer l'app
npm run dev

# Terminal 2: Forwarder les webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Tester un webhook
stripe trigger checkout.session.completed
```

## 📦 Déploiement sur Vercel

### 1. Push sur GitHub

```bash
git add .
git commit -m "Add Stripe payment integration"
git push origin main
```

### 2. Déployer sur Vercel

1. Importez le projet depuis GitHub
2. Ajoutez toutes les variables d'environnement
3. Déployez

### 3. Configurer le webhook Stripe en production

1. Stripe Dashboard → Webhooks → Add endpoint
2. URL : `https://votre-domaine.vercel.app/api/webhooks/stripe`
3. Événement : `checkout.session.completed`
4. Copiez le signing secret dans Vercel

Voir `STRIPE_INTEGRATION.md` pour plus de détails.

## 📚 Documentation

- **`STRIPE_INTEGRATION.md`** : Guide complet d'intégration Stripe
- **`SUPABASE_MIGRATION.md`** : Migration SQL pour la base de données
- **`TROUBLESHOOTING.md`** : Résolution des problèmes courants
- **`DEPLOYMENT.md`** : Guide de déploiement
- **`DEPLOYMENT_CHECKLIST.md`** : Checklist de déploiement

## 🔒 Sécurité

### Vérification du paiement

L'API `/api/generate` vérifie **toujours** que `payment_status='paid'` avant de générer :

```typescript
if (project.payment_status !== 'paid') {
  return NextResponse.json({ error: 'Paiement requis' }, { status: 403 })
}
```

### Vérification de signature webhook

Le webhook `/api/webhooks/stripe` vérifie la signature pour s'assurer que la requête provient bien de Stripe :

```typescript
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
```

### Prix hardcodé côté serveur

Le prix est **toujours** défini côté serveur, jamais côté client :

```typescript
// lib/stripe.ts
export const GENERATION_PRICE_CENTS = 200 // 2.00 EUR
```

## 🐛 Problèmes courants

### Le webhook ne fonctionne pas

1. Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct
2. En local, vérifiez que `stripe listen` est lancé
3. En production, vérifiez l'URL du webhook dans Stripe Dashboard

### L'image ne se génère pas après paiement

1. Vérifiez les logs Vercel
2. Vérifiez que `payment_status='paid'` dans Supabase
3. Vérifiez que le webhook a bien été reçu

### Erreur "Bucket not found"

Voir `TROUBLESHOOTING.md` pour la solution complète.

## 📊 Monitoring

### Logs Vercel

```bash
vercel logs --follow
```

### Logs Stripe

Allez sur Stripe Dashboard → Webhooks → Votre endpoint → Voir les événements

## 🤝 Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amazing-feature`)
3. Committez (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.

## 👤 Auteur

Votre nom

## 🙏 Remerciements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Stripe](https://stripe.com/)
- [Replicate](https://replicate.com/)
