@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Raevix OS - GitHub Pages deploy
cd /d "%~dp0"

echo.
echo  ==============================================
echo    RAEVIX OS  ^|  GitHub Pages deploy pipeline
echo  ==============================================
echo.

where git >nul 2>&1
if errorlevel 1 goto :no_git

if exist ".git" goto :have_repo

echo [1/6] Initializing a new git repository on main...
git init -b main >nul 2>&1
if errorlevel 1 (
  git init >nul 2>&1
  git branch -M main >nul 2>&1
)
if not exist ".git" goto :git_failed
goto :stage

:have_repo
echo [1/6] Existing repository detected - reusing it.

:stage
echo [2/6] Staging and committing the site...
git add .
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat: initial release of Raevix OS portal"
  if errorlevel 1 goto :commit_failed
) else (
  echo       Nothing new to commit.
)

echo.
echo [3/6] Preparing the GitHub repository...
set "REPO_NAME="
set /p "REPO_NAME=       Repository name [raevix]: "
if "%REPO_NAME%"=="" set "REPO_NAME=raevix"

set "GH_USER="
where gh >nul 2>&1
if errorlevel 1 goto :manual_repo
gh auth status >nul 2>&1
if errorlevel 1 goto :manual_repo
for /f "delims=" %%u in ('gh api user --jq .login 2^>nul') do set "GH_USER=%%u"
if "%GH_USER%"=="" goto :manual_repo

echo       Signed in to GitHub as: %GH_USER%
gh repo view "%GH_USER%/%REPO_NAME%" >nul 2>&1
if errorlevel 1 (
  echo       Creating the public repository "%REPO_NAME%"...
  gh repo create "%REPO_NAME%" --public --source=. --remote=origin --push
  if errorlevel 1 goto :push_failed
) else (
  echo       Repository already exists - linking the origin remote.
  git remote get-url origin >nul 2>&1
  if errorlevel 1 git remote add origin "https://github.com/%GH_USER%/%REPO_NAME%.git"
)
goto :push

:manual_repo
echo.
echo       GitHub CLI (gh) is not installed or not signed in.
echo       Create the public repository in your browser first:
echo         1. https://github.com/new
echo         2. Repository name: %REPO_NAME%
echo         3. Visibility: Public, and do NOT add a README or .gitignore
echo.
start "" "https://github.com/new"
set "GH_USER="
set /p "GH_USER=       Your GitHub username: "
if "%GH_USER%"=="" goto :push_failed
git remote get-url origin >nul 2>&1
if errorlevel 1 git remote add origin "https://github.com/%GH_USER%/%REPO_NAME%.git"
echo.
echo       Press any key once the repository exists on GitHub.
pause >nul

:push
echo.
echo [4/6] Pushing the main branch...
git push -u origin main
if errorlevel 1 goto :push_failed

echo.
echo [5/6] Enabling GitHub Pages...
where gh >nul 2>&1
if errorlevel 1 goto :pages_manual
gh auth status >nul 2>&1
if errorlevel 1 goto :pages_manual
gh api -X POST "repos/%GH_USER%/%REPO_NAME%/pages" -f "source[branch]=main" -f "source[path]=/" >nul 2>&1
if errorlevel 1 (
  gh api -X PUT "repos/%GH_USER%/%REPO_NAME%/pages" -f "source[branch]=main" -f "source[path]=/" >nul 2>&1
)
if errorlevel 1 (
  echo       The CLI could not enable Pages - use the settings link below.
) else (
  echo       Pages enabled from branch "main" ^(root folder^).
)
goto :pages_steps

:pages_manual
echo       Enable Pages with these exact steps:
echo         Settings  ->  Pages
echo         Source: Deploy from a branch
echo         Branch: main     Folder: / (root)     then Save

:pages_steps
echo.
echo [6/6] Deployment ready.
echo.
echo  ==============================================
echo    Live URL : https://%GH_USER%.github.io/%REPO_NAME%/
echo    Repo     : https://github.com/%GH_USER%/%REPO_NAME%
echo    Pages    : https://github.com/%GH_USER%/%REPO_NAME%/settings/pages
echo  ==============================================
echo.
echo   First build usually takes 1-2 minutes.
echo   Later updates: git add . ^&^& git commit -m "..." ^&^& git push
echo.
start "" "https://github.com/%GH_USER%/%REPO_NAME%/settings/pages"
pause
exit /b 0

:no_git
echo [X] Git is not installed or not on PATH.
echo     Install it from https://git-scm.com/download/win and run this script again.
pause
exit /b 1

:git_failed
echo [X] Could not initialize the repository. Check folder permissions.
pause
exit /b 1

:commit_failed
echo [X] The commit failed. Configure your Git identity once and retry:
echo       git config --global user.name "Your Name"
echo       git config --global user.email "you@example.com"
pause
exit /b 1

:push_failed
echo [X] Push failed.
echo     Check that the repository exists on GitHub, is empty, and that you are signed in.
echo     If Git asks for a password, paste a Personal Access Token instead.
pause
exit /b 1
