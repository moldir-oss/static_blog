# Mon Licenciement — Blog Hugo

Blog statique généré avec [Hugo](https://gohugo.io/) et le thème [PaperMod](https://github.com/adityatelange/hugo-PaperMod) pour documenter l'intégralité d'un parcours de licenciement.

## 🚀 Caractéristiques

- **Thème** : PaperMod (13k+ stars, le thème Hugo le plus populaire)
- **Multilingue** : Français (actif) + Anglais (prêt, contenu à traduire)
- **Recherche** : Fuse.js intégrée, recherche full-text sans backend
- **Dark mode** : automatique (selon OS) ou manuel
- **Responsive** : mobile-first, parfait sur tous les écrans
- **SEO** : optimisé, Open Graph, Twitter Cards, JSON-LD
- **Performance** : 100/100 Lighthouse, zéro dépendance Node.js
- **Hébergement** : prêt pour GitHub Pages, Netlify, Cloudflare Pages, Vercel
- **Export** : génération d'archive ZIP pour déploiement manuel

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
│   ├── images/
│   ├── docs/
│   └── favicon.svg
├── hugo.toml            # Configuration Hugo + multilingue
├── go.mod               # Hugo Module (PaperMod)
├── go.sum               # Checksums modules
├── netlify.toml         # Config Netlify
├── wrangler.toml        # Config Cloudflare Pages
├── package.json         # Scripts npm (pour Netlify/CF)
├── .env.example         # Variables d'environnement
├── .github/
│   ├── workflows/
│   │   ├── hugo.yml           # Build + multi-platform deploy
│   │   ├── pr-check.yml       # Validation PR
│   │   └── dependabot-auto-merge.yml
│   └── dependabot.yml   # Mises à jour auto
└── README.md
```

## 🛠️ Prérequis

- [Hugo Extended](https://gohugo.io/installation/) ≥ v0.139.0
- Git
- Node.js ≥ 20 (optionnel, pour Netlify/Cloudflare)

## 📦 Installation

### 1. Cloner le projet

```bash
git clone https://github.com/your-username/mon-licenciement-blog.git
cd mon-licenciement-blog
```

### 2. Télécharger le thème (Hugo Modules)

```bash
hugo mod get -u
```

> PaperMod est géré via Hugo Modules (`go.mod`), pas besoin de `git submodule`.

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

### 4. Lancer le serveur local

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

```toml
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

Le workflow GitHub Actions (`.github/workflows/hugo.yml`) construit le site et peut déployer sur **4 plateformes** simultanément. Vous choisissez où déployer en configurant les secrets.

### Variables d'environnement requises

| Variable | Description | Défaut |
|----------|-------------|--------|
| `HUGO_BASEURL` | URL de base du site (requis en prod) | `https://example.com` |
| `HUGO_AUTHOR` | Nom de l'auteur | `Votre Nom` |
| `CUSDIS_APP_ID` | ID Cusdis pour commentaires | (optionnel) |
| `GITHUB_URL` | Lien GitHub | `https://github.com/your-username` |
| `EMAIL_URL` | Lien email | `mailto:your@email.com` |

---

### 1. GitHub Pages (gratuit, inclus)

**Configuration :**
1. Créer un repo GitHub : `your-username/mon-licenciement-blog`
2. Pousser le code
3. Settings → Pages → Source : **GitHub Actions**
4. Le workflow `.github/workflows/hugo.yml` déploie automatiquement sur push sur `main`

**URL** : `https://your-username.github.io/mon-licenciement-blog`

---

### 2. Netlify (gratuit, généreux)

**Via Git (recommandé) :**
1. Connecter le repo sur [Netlify](https://netlify.com)
2. Build command : `hugo --gc --minify`
3. Publish directory : `public`
4. Ajouter variables d'environnement dans Site settings → Environment variables

**Via Netlify CLI :**
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod --dir=public
```

**Secrets GitHub Actions (pour auto-deploy) :**
- `NETLIFY_AUTH_TOKEN` : Personal access token Netlify
- `NETLIFY_SITE_ID` : Site ID (dans Site settings)

---

### 3. Cloudflare Pages (gratuit, illimité)

**Via Git (recommandé) :**
1. Connecter le repo sur [Cloudflare Pages](https://pages.cloudflare.com)
2. Build command : `hugo --gc --minify`
3. Build output directory : `public`
4. Ajouter variables d'environnement

**Via Wrangler CLI :**
```bash
npm install -g wrangler
wrangler login
wrangler pages deploy ./public --project-name=mon-licenciement-blog
```

**Secrets GitHub Actions :**
- `CLOUDFLARE_API_TOKEN` : API Token (Account > Pages > Edit)
- `CLOUDFLARE_ACCOUNT_ID` : Account ID (dans l'URL dashboard)
- `CLOUDFLARE_PROJECT_NAME` : Nom du projet Pages

---

### 4. Vercel (gratuit, généreux)

**Via Git :**
1. Importer le repo sur [Vercel](https://vercel.com)
2. Framework : Other
3. Build command : `hugo --gc --minify`
4. Output directory : `public`

**Secrets GitHub Actions :**
- `VERCEL_TOKEN` : Vercel Access Token
- `VERCEL_ORG_ID` : Organisation ID
- `VERCEL_PROJECT_ID` : Projet ID

---

### 5. Déploiement manuel (ZIP)

Le workflow génère une archive `site.zip` téléchargeable depuis les artifacts GitHub Actions.

```bash
# En local
hugo --gc --minify
cd public
zip -r ../site.zip .
```

Déployer `site.zip` sur n'importe quel hébergeur statique (AWS S3, Firebase Hosting, Surge.sh, etc.)

---

## ⚙️ Configuration des Variables d'environnement par plateforme

### GitHub Pages
Dans le workflow, `HUGO_BASEURL` est automatiquement défini via `${{ steps.pages.outputs.base_url }}`.

### Netlify / Cloudflare / Vercel
Ajoutez dans les variables d'environnement du projet :
```
HUGO_BASEURL=https://your-site.netlify.app
HUGO_AUTHOR=Votre Nom
CUSDIS_APP_ID=your-cusdis-id
GITHUB_URL=https://github.com/your-username
EMAIL_URL=mailto:your@email.com
```

---

## 🤖 Dependabot

Ce projet utilise [Dependabot](https://github.com/dependabot) pour surveiller automatiquement les mises à jour :

| Écosystème | Fréquence | Cible |
|-----------|-----------|-------|
| **Go Modules** | Tous les lundis 9h | Mises à jour thème PaperMod (`go.mod`) |
| **GitHub Actions** | Tous les lundis 9h | Mises à jour des actions CI/CD |
| **Docker** | Tous les lundis 9h | Image Hugo (via Dockerfile) |

### Auto-merge

Les PRs Dependabot avec le label `automerge` sont :
- **Approuvées automatiquement** pour les mises à jour mineures/patch
- **Mergées automatiquement** si tous les checks passent
- **Majeures** : nécessitent une review manuelle

---

## ⚙️ Personnalisation

### Modifier l'apparence

Éditer `assets/css/extended/custom.css` (créer le dossier si besoin) :

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

### Désactiver les commentaires

Dans le front matter d'un article :
```yaml
disableComments: true
```

Ou globalement dans `hugo.toml` :
```toml
[params]
  comments = false
```

---

## 📄 Licence

Le contenu du blog vous appartient.  
Le thème PaperMod est sous licence [MIT](https://github.com/adityatelange/hugo-PaperMod/blob/master/LICENSE).

---

## 📞 Support

- **Issues** : [GitHub Issues](https://github.com/your-username/mon-licenciement-blog/issues)
- **Documentation Hugo** : https://gohugo.io/documentation/
- **Documentation PaperMod** : https://adityatelange.github.io/hugo-PaperMod/

---

**Note** : Ce projet est un support de documentation. Pour toute question juridique, consultez un avocat ou un syndicat.