# Intégration Cusdis — Commentaires

## Qu'est-ce que Cusdis ?

[Cusdis](https://cusdis.com) est un système de commentaires :
- **Open-source** et auto-hébergeable
- **Léger** (~5KB, pas de tracking, pas de cookies)
- **Respectueux de la vie privée** (pas de publicité, pas de collecte de données)
- **Gratuit** via leur instance cloud (ou auto-hébergé sur votre VPS)
- **Parfait pour les sites statiques** (Hugo, Jekyll, etc.)

## Configuration en 3 étapes

### Étape 1 : Créer un projet sur Cusdis

1. Allez sur [https://cusdis.com](https://cusdis.com)
2. Connectez-vous avec GitHub
3. Cliquez sur **"Add Site"**
4. Renseignez :
   - **Site Name** : Mon Licenciement
   - **Domain** : `votre-username.github.io` (ou votre domaine)
5. Copiez l'**App ID** (ex: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### Étape 2 : Configurer le blog

Ouvrez `hugo.toml` et remplacez :

```yaml
  cusdisAppId: "YOUR_CUSDIS_APP_ID"
```

Par votre vrai App ID :

```yaml
  cusdisAppId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### Étape 3 : Désactiver les commentaires sur un article (optionnel)

Si un article ne doit pas avoir de commentaires, ajoutez dans son front matter :

```yaml
disableComments: true
```

## Auto-hébergement (optionnel avancé)

Si vous préférez ne pas dépendre de l'instance cloud :

```bash
# Via Docker
docker run -d \
  -p 3000:3000 \
  -v cusdis-data:/app/data \
  -e USERNAME=admin \
  -e PASSWORD=votre_mot_de_passe \
  djyde/cusdis:latest
```

Puis modifiez `data-host` dans `layouts/partials/comments.html` :

```html
data-host="https://votre-domaine-cusdis.com"
```

## Modération

- Les commentaires sont modérables depuis le dashboard Cusdis
- Vous recevez des notifications par email pour chaque nouveau commentaire
- Vous pouvez marquer des commentaires comme spam ou les supprimer

## Fichiers modifiés dans ce projet

| Fichier | Rôle |
|---------|------|
| `layouts/partials/comments.html` | Template d'intégration du widget Cusdis |
| `assets/css/extended/cusdis.css` | Styles personnalisés (dark mode compatible) |
| `hugo.toml` | Activation des commentaires + App ID |

## Désactiver complètement Cusdis

Si vous changez d'avis, mettez dans `hugo.toml` :

```yaml
params:
  comments: false
```

Ou supprimez simplement le fichier `layouts/partials/comments.html`.
