#!/bin/bash
# Quick start script for the blog

echo "🚀 Démarrage du blog Mon Licenciement"

# Check Hugo
if ! command -v hugo &> /dev/null; then
    echo "❌ Hugo n'est pas installé. Installez-le : https://gohugo.io/installation/"
    exit 1
fi

echo "📦 Téléchargement du thème PaperMod..."
hugo mod get -u

echo "🔧 Lancement du serveur..."
echo ""
echo "Ouvrez http://localhost:1313 dans votre navigateur"
echo ""
hugo server -D
