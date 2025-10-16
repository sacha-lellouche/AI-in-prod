# Migration Supabase - Ajout des colonnes de paiement

## 📋 Vue d'ensemble

Ce script SQL ajoute les colonnes nécessaires pour gérer les paiements Stripe dans la table `projects`.

## 🚀 Migration

### 1. Se connecter à Supabase

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Dans le menu latéral, cliquez sur "SQL Editor"

### 2. Exécuter la migration

Copiez et collez ce SQL dans l'éditeur SQL :

```sql
-- Ajouter les colonnes de paiement à la table projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_amount numeric DEFAULT 2.00,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

-- Créer un index sur payment_status pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_projects_payment_status ON public.projects(payment_status);

-- Créer un index sur stripe_checkout_session_id pour les lookups par session
CREATE INDEX IF NOT EXISTS idx_projects_stripe_session ON public.projects(stripe_checkout_session_id);

-- Mettre à jour le statut par défaut pour les nouveaux projets
ALTER TABLE public.projects
ALTER COLUMN status SET DEFAULT 'pending';

-- Commentaires pour la documentation
COMMENT ON COLUMN public.projects.payment_status IS 'Statut du paiement: pending (en attente), paid (payé)';
COMMENT ON COLUMN public.projects.payment_amount IS 'Montant du paiement en EUR (2.00 EUR par défaut)';
COMMENT ON COLUMN public.projects.stripe_payment_intent_id IS 'ID du Payment Intent Stripe';
COMMENT ON COLUMN public.projects.stripe_checkout_session_id IS 'ID de la session Stripe Checkout';

-- Afficher la structure mise à jour
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;
```

### 3. Vérifier la migration

Après avoir exécuté la migration, vérifiez que les colonnes ont été ajoutées :

```sql
SELECT * FROM projects LIMIT 1;
```

Vous devriez voir les nouvelles colonnes :
- `payment_status` (valeur par défaut: 'pending')
- `payment_amount` (valeur par défaut: 2.00)
- `stripe_payment_intent_id` (NULL)
- `stripe_checkout_session_id` (NULL)

### 4. Mettre à jour les projets existants (optionnel)

Si vous avez des projets existants qui ont été générés AVANT cette migration, vous pouvez les marquer comme "payés" (car ils ont été générés gratuitement avant) :

```sql
-- Marquer tous les projets existants comme payés
UPDATE public.projects
SET payment_status = 'paid', payment_amount = 0.00
WHERE payment_status IS NULL OR payment_status = 'pending';
```

⚠️ **Attention** : N'exécutez cette requête QUE si vous voulez considérer tous les projets existants comme déjà payés.

## 📊 Requêtes utiles

### Voir tous les projets avec leur statut de paiement

```sql
SELECT 
  id,
  user_id,
  prompt,
  status,
  payment_status,
  payment_amount,
  created_at
FROM public.projects
ORDER BY created_at DESC;
```

### Voir les projets en attente de paiement

```sql
SELECT 
  id,
  user_id,
  prompt,
  payment_status,
  created_at
FROM public.projects
WHERE payment_status = 'pending'
ORDER BY created_at DESC;
```

### Voir les projets payés mais pas encore générés

```sql
SELECT 
  id,
  user_id,
  prompt,
  payment_status,
  status,
  created_at
FROM public.projects
WHERE payment_status = 'paid' AND status = 'pending'
ORDER BY created_at DESC;
```

### Statistiques des paiements

```sql
SELECT 
  payment_status,
  COUNT(*) as total_projects,
  SUM(payment_amount) as total_revenue
FROM public.projects
GROUP BY payment_status;
```

## 🔒 Sécurité RLS (Row Level Security)

Les policies RLS existantes fonctionnent toujours. Vérifiez qu'elles sont actives :

```sql
-- Vérifier que RLS est activé
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'projects';

-- Voir les policies existantes
SELECT *
FROM pg_policies
WHERE tablename = 'projects';
```

Si RLS n'est pas activé, activez-le :

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
```

## 🧪 Test de la migration

### 1. Test d'insertion

```sql
-- Insérer un projet de test
INSERT INTO public.projects (
  user_id,
  input_image_url,
  prompt,
  status,
  payment_status,
  payment_amount
) VALUES (
  'votre-user-id-ici',
  'https://example.com/test.jpg',
  'Test de paiement',
  'pending',
  'pending',
  2.00
);

-- Vérifier l'insertion
SELECT * FROM public.projects
WHERE prompt = 'Test de paiement';

-- Supprimer le test
DELETE FROM public.projects
WHERE prompt = 'Test de paiement';
```

### 2. Test de mise à jour du statut de paiement

```sql
-- Simuler un webhook Stripe qui met à jour le paiement
UPDATE public.projects
SET 
  payment_status = 'paid',
  stripe_checkout_session_id = 'cs_test_123456'
WHERE id = 'votre-project-id-ici';

-- Vérifier la mise à jour
SELECT 
  id,
  payment_status,
  stripe_checkout_session_id
FROM public.projects
WHERE id = 'votre-project-id-ici';
```

## 📝 Rollback (en cas de problème)

Si vous devez annuler la migration :

```sql
-- Supprimer les colonnes ajoutées
ALTER TABLE public.projects
DROP COLUMN IF EXISTS payment_status,
DROP COLUMN IF EXISTS payment_amount,
DROP COLUMN IF EXISTS stripe_payment_intent_id,
DROP COLUMN IF EXISTS stripe_checkout_session_id;

-- Supprimer les index
DROP INDEX IF EXISTS idx_projects_payment_status;
DROP INDEX IF EXISTS idx_projects_stripe_session;

-- Remettre le statut par défaut à 'processing'
ALTER TABLE public.projects
ALTER COLUMN status SET DEFAULT 'processing';
```

## ✅ Checklist post-migration

- [ ] Migration SQL exécutée sans erreur
- [ ] Nouvelles colonnes visibles dans la structure de la table
- [ ] Index créés
- [ ] Projets existants mis à jour (si nécessaire)
- [ ] Test d'insertion réussi
- [ ] Test de mise à jour réussi
- [ ] RLS toujours actif
- [ ] Policies RLS fonctionnent

## 🆘 En cas de problème

### Erreur : "column already exists"

Si vous voyez cette erreur, cela signifie que les colonnes ont déjà été ajoutées. Vous pouvez ignorer l'erreur ou vérifier les colonnes existantes :

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('payment_status', 'payment_amount', 'stripe_payment_intent_id', 'stripe_checkout_session_id');
```

### Erreur : "permission denied"

Assurez-vous d'être connecté avec un compte qui a les droits d'administration sur la base de données. Dans Supabase, utilisez le SQL Editor avec votre compte admin.

### Les anciennes données ne s'affichent plus

Vérifiez que RLS est toujours actif et que les policies n'ont pas été modifiées :

```sql
-- Voir les policies
SELECT *
FROM pg_policies
WHERE tablename = 'projects';
```
