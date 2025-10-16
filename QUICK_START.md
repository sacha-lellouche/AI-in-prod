# 🚀 Quick Start - Intégration Stripe

## ⚡ Démarrage rapide (5 minutes)

### 1. Migration Supabase (1 min)

Allez sur [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor, et exécutez :

```sql
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_amount numeric DEFAULT 2.00,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;
```

### 2. Webhook Stripe en local (2 min)

```bash
# Terminal 1 : Lancer l'app
npm run dev

# Terminal 2 : Forwarder les webhooks
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Dans Terminal 2, copiez le `whsec_...` et ajoutez-le dans `.env.local` :

```bash
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

### 3. Tester (2 min)

1. Ouvrez http://localhost:3000/dashboard
2. Uploadez une image
3. Entrez un prompt : "Ajoute un chien"
4. Cliquez sur "💳 Générer l'image (2€)"
5. Utilisez la carte : `4242 4242 4242 4242`
6. Revenez sur le dashboard
7. Cliquez sur "🚀 Lancer la génération"
8. ✅ Votre image est générée !

## 📋 Variables d'environnement

Votre `.env.local` doit contenir :

```bash
# Supabase (déjà configuré)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe (NOUVEAU)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_ICI
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_ICI
NEXT_PUBLIC_URL=http://localhost:3000
STRIPE_WEBHOOK_SECRET=whsec_... (obtenu via stripe listen)

# Replicate (déjà configuré)
REPLICATE_API_TOKEN=...
```

## 🔍 Vérifier que ça marche

### Logs à surveiller

**Terminal 1 (Next.js)** :
```
✅ Webhook vérifié: checkout.session.completed
💳 Paiement complété pour la session: cs_test_xxx
✅ Projet mis à jour: xxx-yyy - Payment status: paid
```

**Terminal 2 (Stripe CLI)** :
```
checkout.session.completed [evt_xxx]
  POST http://localhost:3000/api/webhooks/stripe [200]
```

### Dashboard Supabase

Allez voir votre table `projects` :
- `payment_status` doit être `'paid'`
- `stripe_checkout_session_id` doit être rempli

## 🚨 Problèmes ?

### Le webhook ne reçoit rien

```bash
# Relancez stripe listen
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Erreur "payment_status must be paid"

Le webhook n'a pas mis à jour le projet. Vérifiez :
1. Que `stripe listen` est lancé
2. Que `STRIPE_WEBHOOK_SECRET` est correct dans `.env.local`
3. Les logs du webhook dans Terminal 2

### Erreur "Bucket not found"

Vérifiez que les buckets `input-images` et `output-images` existent dans Supabase Storage.

## 📚 Docs complètes

- **`INTEGRATION_SUMMARY.md`** → Récapitulatif complet
- **`FLOW_EXPLANATION.md`** → Flow détaillé avec code
- **`STRIPE_INTEGRATION.md`** → Config complète de Stripe
- **`SUPABASE_MIGRATION.md`** → Migration SQL détaillée

## ✅ Checklist

- [ ] Migration SQL exécutée
- [ ] `stripe listen` lancé
- [ ] `STRIPE_WEBHOOK_SECRET` ajouté dans `.env.local`
- [ ] Test avec carte `4242 4242 4242 4242`
- [ ] Webhook reçu dans Terminal 2
- [ ] Génération lancée et réussie

## 🎯 En production (Vercel)

1. **Variables Vercel** : Ajoutez toutes les variables d'environnement
2. **Webhook Stripe** : Configurez l'URL `https://votre-domaine.vercel.app/api/webhooks/stripe`
3. **Test** : Testez le flow complet en production

Voir `STRIPE_INTEGRATION.md` section "En production" pour les détails.

---

**C'est prêt ! 🎉** Vous avez maintenant un système de paiement à la génération fonctionnel.
