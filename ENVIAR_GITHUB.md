# Enviar projeto ao GitHub

## 1. Instalar o Git

O Git não está instalado no seu computador. Instale primeiro:

- **Download:** https://git-scm.com/download/win
- Durante a instalação, marque a opção **"Add Git to PATH"**

Reinicie o Cursor após instalar.

---

## 2. Criar repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique no **+** (canto superior direito) → **New repository**
3. Nome: `coletor` (ou outro)
4. Deixe **Private** ou **Public**
5. **Não** marque "Add a README" (o projeto já tem arquivos)
6. Clique em **Create repository**

---

## 3. Enviar o projeto

Abra o terminal no Cursor (Ctrl+`) e execute:

```powershell
cd c:\Users\felippy\Desktop\coletor

git init
git add .
git commit -m "Projeto inicial - inventário com Supabase"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/coletor.git
git push -u origin main
```

**Substitua** `SEU-USUARIO` pelo seu usuário do GitHub e `coletor` pelo nome do repositório que criou.

---

## 4. Autenticação

Na primeira vez que rodar `git push`, o Windows pode pedir login. Opções:

- **GitHub no navegador** – abrirá o navegador para você autorizar
- **Token** – em GitHub → Settings → Developer settings → Personal access tokens, crie um e use como senha

---

## Alternativa: Upload manual

Se preferir não instalar o Git:

1. Crie o repositório no GitHub (vazio)
2. Clique em **"uploading an existing file"**
3. Arraste a pasta do projeto (exceto `node_modules` e `.next`)
4. Ou compacte o projeto em ZIP e faça upload
