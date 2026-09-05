@echo off
REM Quick start script for Windows

echo Starting the Mon Licenciement blog

where hugo >nul 2>nul
if %errorlevel% neq 0 (
    echo Hugo is not installed. Install it: https://gohugo.io/installation/
    exit /b 1
)

echo Downloading the PaperMod theme...
hugo mod get -u

echo Starting the server...
echo Open http://localhost:1313 in your browser
echo.
hugo server -D
