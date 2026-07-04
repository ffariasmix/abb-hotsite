#!/bin/bash
# Deploy ABB Hotsite -> GitHub Pages (1 clique)
cd "$(dirname "$0")" || exit 1
clear
echo "======================================================"
echo "   Deploy ABB Hotsite  ->  GitHub Pages"
echo "======================================================"
echo ""

REPO="abb-hotsite"

# --- checagens ---
if ! command -v git >/dev/null 2>&1; then
  echo "[X] git nao encontrado. Abra o Terminal e rode: xcode-select --install"
  read -p "Enter para sair..."; exit 1
fi
if ! command -v gh >/dev/null 2>&1; then
  echo "[X] GitHub CLI (gh) nao encontrado."
  echo "    Instale com Homebrew:  brew install gh"
  echo "    Depois faca login:     gh auth login"
  read -p "Enter para sair..."; exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "[X] Voce nao esta logado no GitHub CLI."
  echo "    Rode no Terminal:  gh auth login"
  read -p "Enter para sair..."; exit 1
fi

OWNER=$(gh api user --jq .login)
echo "[ok] Logado como: $OWNER"
echo ""

# --- git init + commit ---
[ -d .git ] || git init -b main -q
git add -A
git commit -q -m "ABB Hotsite: site + workflow GitHub Pages" 2>/dev/null && echo "[ok] Commit criado" || echo "[..] Nada novo para commitar"

# --- repo + push ---
if git remote get-url origin >/dev/null 2>&1; then
  echo "[..] Remoto ja existe, apenas empurrando..."
  git push -u origin main
else
  echo "[..] Criando repositorio privado '$REPO' e enviando..."
  gh repo create "$REPO" --private --source . --remote origin --push
fi
echo "[ok] Codigo enviado ao GitHub"
echo ""

# --- habilita Pages via GitHub Actions ---
echo "[..] Habilitando GitHub Pages (origem: GitHub Actions)..."
gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
 || gh api -X PUT "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
 || echo "    (se falhar: Settings > Pages > Source: GitHub Actions)"

# --- acompanha o deploy ---
echo "[..] Aguardando o workflow 'Deploy ABB Hotsite' concluir..."
sleep 5
gh run watch --exit-status >/dev/null 2>&1 || sleep 25

URL=$(gh api "repos/$OWNER/$REPO/pages" --jq .html_url 2>/dev/null)
[ -z "$URL" ] && URL="https://$OWNER.github.io/$REPO/"

echo ""
echo "======================================================"
echo "  SITE PUBLICADO (pode levar ~1 min para propagar):"
echo "  $URL"
echo "======================================================"
echo ""
echo ">> COPIE a URL acima e cole de volta na conversa do Claude."
open "$URL" 2>/dev/null
read -p "Enter para fechar..."
