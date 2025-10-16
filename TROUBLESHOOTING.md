# Guide de dépannage - AI Image Editor

## Problème résolu : "Bucket not found" en production

### 🔍 Diagnostic du problème

L'erreur que vous rencontriez était :
```
Error [StorageApiError]: Bucket not found
status: 400,
statusCode: '404'
```

Le log montrait que le bucket était `undefined` dans l'URL :
```
/storage/v1/object/undefined/83161b18-4b2e-4e84-af52-13bf57c1d7c4-output-1760620655160.png
```

### ✅ Solution appliquée

**Modifications du code :**

1. **`app/api/generate/route.ts` (ligne 193-195)**
   - Ajout de `.trim()` pour nettoyer les valeurs vides ou avec espaces
   - Meilleur fallback vers `'output-images'` par défaut
   - Ajout de logs pour déboguer

2. **`app/api/upload/route.ts` (ligne 56, 71)**
   - Même logique appliquée pour le bucket d'input
   - Utilisation cohérente de `.trim()`

**Ce qui a changé :**
```typescript
// AVANT
const outputBucket = process.env.NEXT_PUBLIC_SUPABASE_OUTPUT_BUCKET || 'output-images'

// APRÈS
const outputBucket = process.env.NEXT_PUBLIC_SUPABASE_OUTPUT_BUCKET?.trim() || 
                    process.env.SUPABASE_OUTPUT_BUCKET?.trim() || 
                    'output-images'
```

### 🚀 Actions à faire maintenant

#### 1. Vérifier vos variables d'environnement dans Vercel

Allez sur votre projet Vercel → Settings → Environment Variables et vérifiez :

**Variables OBLIGATOIRES :**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` (doit contenir votre URL Supabase complète)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publique Supabase)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (clé service role, à garder SECRÈTE)
- ✅ `REPLICATE_API_TOKEN` (votre token Replicate)

**Variables OPTIONNELLES (recommandées) :**
- `NEXT_PUBLIC_SUPABASE_INPUT_BUCKET` = `input-images`
- `NEXT_PUBLIC_SUPABASE_OUTPUT_BUCKET` = `output-images`

> **Important :** Si vous ne définissez pas les variables de bucket, l'application utilisera automatiquement les valeurs par défaut (`input-images` et `output-images`).

#### 2. Vérifier que les buckets existent dans Supabase

Dans votre console Supabase :
1. Allez dans **Storage**
2. Vérifiez que ces buckets existent et sont **publics** :
   - `input-images`
   - `output-images`

Si ils n'existent pas :
1. Cliquez sur "New bucket"
2. Nom : `input-images` → Cochez "Public bucket" → Create
3. Répétez pour `output-images`

#### 3. Redéployer sur Vercel

Deux options :

**Option A : Via Git (recommandé)**
```bash
git add .
git commit -m "Fix: Handle undefined bucket names in production"
git push origin main
```

**Option B : Redéploiement manuel**
- Allez sur votre dashboard Vercel
- Cliquez sur le projet
- Cliquez sur "Deployments"
- Cliquez sur "..." sur le dernier déploiement → "Redeploy"

#### 4. Tester l'application

Une fois redéployé :
1. Ouvrez votre application en production
2. Testez l'upload d'une image
3. Testez la génération d'image avec l'IA
4. Vérifiez les logs dans Vercel pour confirmer qu'il n'y a plus d'erreurs

### 🔧 Endpoint de debug (développement uniquement)

J'ai créé un endpoint pour vous aider à vérifier votre configuration :

**En local uniquement :**
```
GET http://localhost:3000/api/debug
```

Cet endpoint vous montrera quelles variables d'environnement sont définies.

> ⚠️ **IMPORTANT :** Cet endpoint est désactivé automatiquement en production pour des raisons de sécurité.

### 📝 Logs utiles

Les nouveaux logs ajoutés vous aideront à déboguer :
```typescript
console.log('Uploading to bucket:', outputBucket)
console.log('Output file name:', outputFileName)
```

Vous pouvez voir ces logs dans :
- **Vercel Dashboard** → Votre projet → Functions → Logs en temps réel
- **Ou via CLI :** `vercel logs`

### ❓ Questions fréquentes

**Q : Pourquoi ça marchait en local mais pas en production ?**
R : En local, votre fichier `.env.local` contenait probablement les bonnes valeurs. En production (Vercel), les variables d'environnement doivent être configurées manuellement dans l'interface Vercel.

**Q : Dois-je définir les variables de bucket ?**
R : Non, ce n'est pas obligatoire. Si vous ne les définissez pas, l'application utilisera `input-images` et `output-images` par défaut. Mais c'est une bonne pratique de les définir explicitement.

**Q : Comment savoir si mes buckets sont bien publics ?**
R : Dans Supabase Storage, cliquez sur le bucket. En haut, vous devriez voir "Public" avec une icône de globe. Si vous voyez "Private", cliquez sur les paramètres et changez-le en public.

**Q : Que faire si j'ai encore des erreurs ?**
R : 
1. Vérifiez les logs Vercel en temps réel
2. Vérifiez que tous les buckets existent dans Supabase
3. Vérifiez que les variables d'environnement Vercel n'ont pas d'espaces ou de caractères cachés
4. Testez l'endpoint `/api/debug` en local pour vérifier votre configuration

### 📚 Ressources

- [Documentation Vercel - Variables d'environnement](https://vercel.com/docs/concepts/projects/environment-variables)
- [Documentation Supabase - Storage](https://supabase.com/docs/guides/storage)
- [Documentation Replicate](https://replicate.com/docs)

---

**Besoin d'aide supplémentaire ?**
Vérifiez les logs de production dans Vercel pour obtenir plus de détails sur les erreurs.
