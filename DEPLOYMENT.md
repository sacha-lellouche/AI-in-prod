# Instructions de déploiement Vercel

## Variables d'environnement à configurer dans Vercel

Aller dans les paramètres de votre projet Vercel et ajouter ces variables d'environnement :

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` = `your_supabase_project_url_here`
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` = `your_supabase_service_role_key_here`
- `SUPABASE_SERVICE_ROLE_KEY` = `your_supabase_service_role_key_here`

### Supabase Storage
- `NEXT_PUBLIC_SUPABASE_INPUT_BUCKET` = `input-images`
- `SUPABASE_INPUT_BUCKET` = `input-images`
- `SUPABASE_OUTPUT_BUCKET` = `output-images`

### Replicate
- `REPLICATE_API_TOKEN` = `your_replicate_api_token_here`
- `REPLICATE_MODEL` = `google/nano-banana`

## Étapes de déploiement

1. **Push sur GitHub**
   ```bash
   git remote add origin https://github.com/votre-username/ai-image-editor.git
   git push -u origin main
   ```

2. **Connecter à Vercel**
   - Aller sur [vercel.com](https://vercel.com)
   - Importer le projet depuis GitHub
   - Configurer les variables d'environnement
   - Déployer

3. **Vérifications post-déploiement**
   - Tester l'upload d'image
   - Vérifier que les variables d'environnement sont correctes
   - Tester la génération d'image avec l'IA

## Configuration Supabase nécessaire

Assurez-vous que les buckets suivants existent dans Supabase :
- `input-images` (public)
- `output-images` (public)

Et que la table `projects` est créée avec le bon schéma.