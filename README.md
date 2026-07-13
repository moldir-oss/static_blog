# Mon Licenciement — Blog Hugo

Blog statique généré avec [Hugo](https://gohugo.io/) et le thème [PaperMod](https://github.com/adityatelange/hugo-PaperMod) pour documenter l'intégralité d'un parcours de licenciement.

## 🚀 Caractéristiques

- **Thème** : PaperMod (13k+ stars, le plus populaire des thèmes Hugo)
- **Multilingue** : Français (actif) + Anglais (prêt, contenu à traduire)
- **Recherche** : Fuse.js intégrée, recherche full-text sans backend
- **Dark mode** : automatique (selon OS) ou manuel
- **Responsive** : mobile-first, parfait sur tous les écrans
- **SEO** : optimisé, Open Graph, Twitter Cards, JSON-LD
- **Performance** : 100/100 Lighthouse, zéro dépendance Node.js
- **Hébergement** : prêt pour GitHub Pages, Netlify, Cloudflare Pages, Vercel

## 📁 Structure

```
.
├── archetypes/           # Templates pour nouveaux articles
├── assets/               # CSS/JS personnalisés
├── content/              # Contenu FR (par défaut)
│   ├── posts/
│   │   ├── 01-avertissement.md
│   │   ├── 02-contestation.md
│   │   ├── 03-lettre-licenciement.md
│   │   ├── 04-conclusion.md
│   │   ├── 05-decision-justice.md
│   │   └── 06-chronologie.md
│   ├── _index.md
│   ├── archives.md
│   └── search.md
├── content.en/           # Contenu EN (à traduire)
├── data/                 # Données JSON/CSV
├── layouts/              # Templates personnalisés
│   └── shortcodes/       # Shortcodes Hugo
│       └── timeline.html # Shortcode chronologie
├── static/               # Images, favicons, PDFs
├── hugo.toml           # Configuration Hugo + multilingue
├── go.mod                # Hugo Module (PaperMod)
└── README.md
```

## 🛠️ Prérequis

- [Hugo Extended](https://gohugo.io/installation/) ≥ v0.112.0
- Git

## 📦 Installation

### 1. Cloner le projet

```bash
git clone https://github.com/votre-username/mon-licenciement-blog.git
cd mon-licenciement-blog
```

### 2. Télécharger le thème (Hugo Modules)

```bash
hugo mod get -u
```

> PaperMod est géré via Hugo Modules (go.mod), pas besoin de `git submodule`.

### 3. Lancer le serveur local

```bash
hugo server -D
```

Ouvrir [http://localhost:1313](http://localhost:1313)

## 📝 Ajouter du contenu

### Nouvel article

```bash
hugo new content posts/nouvel-article.md
```

### Remplacer les exemples par vos vrais documents

1. Ouvrir `content/posts/01-avertissement.md`
2. Remplacer `[Insérer ici...]` par le contenu de votre fichier `.md` original
3. Ajuster la date, les tags, et la description dans le front matter
4. Répéter pour chaque document

### Ajouter la chronologie

Éditer `content/posts/06-chronologie.md` et utiliser le shortcode `timeline` :

```markdown
{{< timeline >}}

## 2024

### 15 janvier
**Titre de l'événement**  
Description de l'événement.

{{< /timeline >}}
```

### Ajouter des images

Placer les images dans `static/images/` et les référencer :

```markdown
![Description](/images/mon-document.png)
```

Pour les documents PDF, les placer dans `static/docs/` et créer des liens :

```markdown
[Télécharger le PDF](/docs/avertissement.pdf)
```

## 🌍 Multilingue

### Activer l'anglais

1. Dupliquer le contenu FR vers `content.en/posts/`
2. Traduire les fichiers `.md`
3. L'anglais sera accessible via `/en/`

### Ajouter une langue

Modifier `hugo.toml` :

```yaml
languages:
  fr:
    languageName: "Français"
    weight: 1
  en:
    languageName: "English"
    weight: 2
  es:
    languageName: "Español"
    weight: 3
```

## 🚀 Déploiement

### GitHub Pages (recommandé)

1. Créer un repo GitHub : `votre-username/mon-licenciement-blog`
2. Pousser le code :

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/votre-username/mon-licenciement-blog.git
git push -u origin main
```

3. Activer GitHub Pages dans Settings → Pages → Source : GitHub Actions
4. Utiliser le workflow Hugo officiel (créer `.github/workflows/hugo.yml`)

```yaml
name: Deploy Hugo site to Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

defaults:
  run:
    shell: bash

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: 0.128.0
    steps:
      - name: Install Hugo CLI
        run: |
          wget -O ${{ runner.temp }}/hugo.deb https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.deb
          sudo dpkg -i ${{ runner.temp }}/hugo.deb
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5
      - name: Build with Hugo
        env:
          HUGO_ENVIRONMENT: production
          HUGO_ENV: production
        run: |
          hugo             --gc             --minify             --baseURL "${{ steps.pages.outputs.base_url }}/"
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Netlify

1. Pousser sur GitHub
2. Connecter le repo sur [Netlify](https://netlify.com)
3. Build command : `hugo --gc --minify`
4. Publish directory : `public`

### Cloudflare Pages

1. Connecter le repo GitHub
2. Build command : `hugo --gc --minify`
3. Build output directory : `public`

## 🤖 Dependabot

Ce projet utilise [Dependabot](https://github.com/dependabot) pour surveiller automatiquement les mises à jour :

| Écosystème | Fréquence | Cible |
|-----------|-----------|-------|
| **Go Modules** | Tous les lundis 9h | Mises à jour du thème PaperMod (`go.mod`) |
| **GitHub Actions** | Tous les lundis 9h | Mises à jour des actions CI/CD |

Dependabot crée des **Pull Requests automatiques** que vous pouvez reviewer avant de merger. Cela garantit que :
- Le thème PaperMod reste à jour (corrections de bugs, nouvelles fonctionnalités)
- Les workflows GitHub Actions utilisent les dernières versions sécurisées

### Configuration

Le fichier `.github/dependabot.yml` définit les règles. Modifiez-le si vous voulez :
- Changer la fréquence (`daily`, `weekly`, `monthly`)
- Ajouter d'autres écosystèmes (npm, pip, etc.)
- Désactiver les mises à jour automatiques

## ⚙️ Personnalisation

### Modifier l'apparence

Éditer `assets/css/extended/` (créer le dossier si besoin) :

```css
/* assets/css/extended/custom.css */
:root {
  --primary: #c0392b;  /* Rouge bordeaux pour le thème licenciement */
}
```

### Modifier la page d'accueil

Éditer `hugo.toml` → section `params.profileMode`.

### Modifier le menu

Éditer `hugo.toml` → section `languages.fr.menu.main`.

## 📄 Licence

Le contenu du blog vous appartient.  
Le thème PaperMod est sous licence [MIT](https://github.com/adityatelange/hugo-PaperMod/blob/master/LICENSE).

---

**Note** : Ce projet est un support de documentation. Pour toute question juridique, consultez un avocat ou un syndicat.
