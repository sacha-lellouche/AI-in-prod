# Configuration des Variables d'Environnement

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role_supabase

# Buckets Supabase (optionnel, par défaut : input-images et output-images)
NEXT_PUBLIC_SUPABASE_INPUT_BUCKET=input-images
SUPABASE_OUTPUT_BUCKET=output-images

# Replicate API (pour la génération d'images)
REPLICATE_API_TOKEN=votre_token_replicate
REPLICATE_MODEL=votre_modèle_replicate
```

## Configuration Supabase requise

### 1. Table `projects`
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  input_image_url TEXT,
  output_image_url TEXT,
  prompt TEXT NOT NULL,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Row Level Security (RLS)
```sql
-- Activer RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre aux utilisateurs de voir leurs propres projets
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

-- Policy pour permettre aux utilisateurs de créer des projets
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy pour permettre aux utilisateurs de supprimer leurs propres projets
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);
```

### 3. Buckets Storage
Créez deux buckets dans Supabase Storage :
- `input-images` : pour les images d'entrée
- `output-images` : pour les images générées

### 4. Authentification Email
Activez l'authentification par email dans Supabase Auth.