# Script para enviar o projeto ao GitHub
# Execute após instalar o Git: https://git-scm.com/download/win

Set-Location $PSScriptRoot

Write-Host "Inicializando Git..." -ForegroundColor Cyan
git init

Write-Host "Adicionando arquivos..." -ForegroundColor Cyan
git add .

Write-Host "Criando commit..." -ForegroundColor Cyan
git commit -m "Projeto inicial - inventário com Supabase"

Write-Host "Configurando branch main..." -ForegroundColor Cyan
git branch -M main

Write-Host "Conectando ao GitHub..." -ForegroundColor Cyan
git remote add origin https://github.com/felippym/coletor.git

Write-Host "Enviando para o GitHub..." -ForegroundColor Cyan
git push -u origin main

Write-Host "Concluído!" -ForegroundColor Green
