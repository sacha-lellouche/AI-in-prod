# Éditeur d'Images IA

Une application Next.js moderne pour transformer des images à l'aide de l'intelligence artificielle.

## Fonctionnalités

- ✨ Upload d'images avec prévisualisation
- 🤖 Transformation d'images via Replicate AI (modèle google/nano-banana)
- 💾 Stockage sécurisé avec Supabase
- 🎨 Interface utilisateur moderne avec Tailwind CSS
- 📱 Design responsive

## Technologies utilisées

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: API Routes Next.js
- **IA**: Replicate (google/nano-banana)
- **Base de données**: Supabase
- **Stockage**: Supabase Storage

## Installation

1. Cloner le projet
2. Installer les dépendances :
   ```bash
   npm install
   ```

3. Configurer les variables d'environnement dans `.env.local` :
   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_INPUT_BUCKET=input-images
   SUPABASE_OUTPUT_BUCKET=output-images

   # Replicate Configuration
   REPLICATE_API_TOKEN=your_replicate_token
   REPLICATE_MODEL=google/nano-banana
   ```

4. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```

5. Ouvrir [http://localhost:3000](http://localhost:3000)

## Configuration Supabase

### Buckets de stockage requis :
- `input-images` : pour les images uploadées
- `output-images` : pour les images générées

### Table `projects` :
```sql
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  input_image_url TEXT,
  output_image_url TEXT,
  prompt TEXT,
  status TEXT
);
```

## Utilisation

1. Sélectionnez une image à transformer
2. Saisissez un prompt décrivant la transformation souhaitée
3. Cliquez sur "Générer"
4. Attendez que l'IA traite votre demande
5. Visualisez le résultat côte à côte avec l'image originale

## Structure du projet

```
├── app/
│   ├── api/generate/      # API route pour la génération d'images
│   ├── page.tsx           # Page principale
│   └── layout.tsx         # Layout de base
├── lib/
│   └── supabase.ts        # Configuration Supabase
├── .env.local             # Variables d'environnement
└── README.md
```

## Déploiement

Ce projet peut être déployé sur Vercel, Netlify ou toute autre plateforme supportant Next.js.

N'oubliez pas de configurer les variables d'environnement sur votre plateforme de déploiement.
