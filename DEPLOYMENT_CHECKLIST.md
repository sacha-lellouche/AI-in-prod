# Checklist de déploiement - AI Image Editor

Utilisez cette checklist pour vous assurer que votre déploiement Vercel fonctionne correctement.

## ✅ Avant de déployer

### Configuration Supabase
- [ ] Les buckets `input-images` et `output-images` existent dans Supabase Storage
- [ ] Les deux buckets sont configurés comme **publics**
- [ ] La table `projects` existe avec le bon schéma (voir `ENV_SETUP.md`)
- [ ] Row Level Security (RLS) est activé sur la table `projects`
- [ ] Les policies RLS sont créées (voir `ENV_SETUP.md`)
- [ ] L'authentification par email est activée dans Supabase Auth

### Variables d'environnement Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_URL` est définie
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` est définie
- [ ] `SUPABASE_SERVICE_ROLE_KEY` est définie
- [ ] `REPLICATE_API_TOKEN` est définie
- [ ] (Optionnel) `NEXT_PUBLIC_SUPABASE_INPUT_BUCKET` = `input-images`
- [ ] (Optionnel) `NEXT_PUBLIC_SUPABASE_OUTPUT_BUCKET` = `output-images`
- [ ] (Optionnel) `REPLICATE_MODEL` = `google/nano-banana`

### Code
- [ ] Tous les changements sont committés
- [ ] Le code a été pushé sur GitHub

## 🚀 Déploiement

- [ ] Le déploiement Vercel s'est terminé avec succès
- [ ] Aucune erreur de build dans les logs Vercel
- [ ] L'application est accessible via l'URL Vercel

## 🧪 Tests post-déploiement

### Test 1 : Authentification
- [ ] La page de login s'affiche correctement
- [ ] Je peux créer un nouveau compte
- [ ] Je peux me connecter avec mes identifiants
- [ ] Je suis redirigé vers le dashboard après connexion

### Test 2 : Upload d'image
- [ ] Je peux accéder au dashboard
- [ ] Le formulaire d'upload s'affiche
- [ ] Je peux sélectionner une image depuis mon ordinateur
- [ ] L'upload fonctionne sans erreur
- [ ] L'image uploadée s'affiche dans l'interface

### Test 3 : Génération d'image
- [ ] Je peux entrer un prompt de modification
- [ ] Je peux cliquer sur "Générer"
- [ ] L'API Replicate est appelée avec succès
- [ ] L'image générée s'affiche après quelques secondes
- [ ] L'image générée est sauvegardée dans Supabase Storage
- [ ] Le projet apparaît dans mon dashboard avec le statut "completed"

### Test 4 : Gestion des erreurs
- [ ] Si j'essaie d'uploader un fichier trop gros (>10MB), j'ai un message d'erreur clair
- [ ] Si j'essaie d'uploader un fichier non-image, j'ai un message d'erreur clair
- [ ] Si l'API Replicate échoue, j'ai un message d'erreur clair

## 🔍 Vérification des logs

### Dans Vercel
- [ ] Aller dans Vercel Dashboard → Votre projet → Functions
- [ ] Vérifier qu'il n'y a pas d'erreurs dans les logs en temps réel
- [ ] Vérifier que les logs montrent : `Uploading to bucket: output-images` (ou votre nom de bucket)
- [ ] Vérifier qu'il n'y a pas de `undefined` dans les URLs des buckets

### Dans Supabase
- [ ] Aller dans Storage → `input-images`
- [ ] Vérifier que les images uploadées apparaissent
- [ ] Aller dans Storage → `output-images`
- [ ] Vérifier que les images générées apparaissent
- [ ] Aller dans Table Editor → `projects`
- [ ] Vérifier que les nouveaux projets sont créés avec le bon `user_id`

## ❌ En cas de problème

Si un test échoue, consultez le fichier `TROUBLESHOOTING.md` pour les solutions.

### Problèmes courants

**"Bucket not found" error**
→ Vérifiez que les buckets existent dans Supabase et que les variables d'environnement sont correctes

**"Authentification requise" error**
→ Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est définie dans Vercel

**"Erreur lors de l'upload"**
→ Vérifiez que les buckets sont publics dans Supabase

**Image générée ne s'affiche pas**
→ Vérifiez les logs Vercel pour voir l'erreur exacte
→ Vérifiez que `REPLICATE_API_TOKEN` est correcte

**"Cannot connect to Supabase"**
→ Vérifiez que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont correctes

## 📝 Notes

- Après avoir modifié une variable d'environnement dans Vercel, vous devez redéployer
- Les variables commençant par `NEXT_PUBLIC_` sont accessibles côté client
- Les autres variables sont uniquement accessibles côté serveur
- Utilisez l'endpoint `/api/debug` (en local uniquement) pour vérifier votre configuration

---

**Date de dernière vérification :** _______________  
**Déployé par :** _______________  
**URL de production :** _______________
