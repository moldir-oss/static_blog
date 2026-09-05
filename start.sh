#!/bin/bash
# Quick start script for the blog

echo "🚀 Starting the Mon Licenciement blog"

# Check Hugo
if ! command -v hugo &> /dev/null; then
    echo "❌ Hugo is not installed. Install it: https://gohugo.io/installation/"
    exit 1
fi

echo "📦 Downloading the PaperMod theme..."
hugo mod get -u

echo "🔧 Starting the server..."
echo ""
echo "Open http://localhost:1313 in your browser"
echo ""
hugo server -D
