# Instructions de déploiement Vercel

## ⚠️ IMPORTANT: Variables d'environnement à configurer dans Vercel

Aller dans les paramètres de votre projet Vercel (Settings > Environment Variables) et ajouter ces variables d'environnement :

### Supabase (OBLIGATOIRE)
- `NEXT_PUBLIC_SUPABASE_URL` = `your_supabase_project_url_here`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your_supabase_anon_key_here`
- `SUPABASE_SERVICE_ROLE_KEY` = `your_supabase_service_role_key_here`

### Supabase Storage (RECOMMANDÉ - sinon utilise les valeurs par défaut)
- `NEXT_PUBLIC_SUPABASE_INPUT_BUCKET` = `input-images`
- `NEXT_PUBLIC_SUPABASE_OUTPUT_BUCKET` = `output-images`

> **Note:** Si vous ne définissez pas les variables de bucket, l'application utilisera automatiquement `input-images` et `output-images` par défaut.

### Replicate (OBLIGATOIRE)
- `REPLICATE_API_TOKEN` = `your_replicate_api_token_here`
- `REPLICATE_MODEL` = `google/nano-banana` (optionnel, par défaut)

## 🔍 Vérification des variables d'environnement

Après avoir ajouté les variables, vérifiez qu'elles ne sont pas vides ou `undefined`. Les variables doivent avoir des valeurs réelles, pas des chaînes vides.

## Étapes de déploiement

1. **Push sur GitHub**
   ```bash
   git add .
   git commit -m "Fix: Handle undefined bucket names in production"
   git push origin main
   ```

2. **Redéployer sur Vercel**
   - Vercel redéploiera automatiquement après le push
   - OU allez sur votre dashboard Vercel et cliquez sur "Redeploy"

3. **Vérifications post-déploiement**
   - Vérifier les logs de déploiement pour confirmer que les variables d'environnement sont chargées
   - Tester l'upload d'image
   - Tester la génération d'image avec l'IA
   - Vérifier les logs de production dans Vercel pour les erreurs

## Configuration Supabase nécessaire

Assurez-vous que les buckets suivants existent dans Supabase Storage :
- `input-images` (public - pour les images uploadées par les utilisateurs)
- `output-images` (public - pour les images générées par l'IA)

### Comment créer les buckets dans Supabase:
1. Aller dans votre projet Supabase
2. Naviguer vers "Storage" dans le menu latéral
3. Cliquer sur "New bucket"
4. Créer `input-images` avec option "Public bucket"
5. Créer `output-images` avec option "Public bucket"

Et que la table `projects` est créée avec le bon schéma (voir ENV_SETUP.md).