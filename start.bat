@echo off
REM Quick start script for Windows

echo Demarrage du blog Mon Licenciement

where hugo >nul 2>nul
if %errorlevel% neq 0 (
    echo Hugo n'est pas installe. Installez-le : https://gohugo.io/installation/
    exit /b 1
)

echo Telechargement du theme PaperMod...
hugo mod get -u

echo Lancement du serveur...
echo Ouvrez http://localhost:1313 dans votre navigateur
echo.
hugo server -D
