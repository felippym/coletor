# Deploy na Vercel

## Opção 1: Via site da Vercel (recomendado)

1. **Crie uma conta** em [vercel.com](https://vercel.com)

2. **Envie o projeto para o GitHub** (se ainda não tiver):
   - Crie um repositório no GitHub
   - Faça upload dos arquivos do projeto

3. **Importe na Vercel**:
   - Acesse [vercel.com/new](https://vercel.com/new)
   - Clique em "Import Git Repository" e selecione seu repositório
   - Ou arraste a pasta do projeto para a área de importação

4. **Configure as variáveis de ambiente**:
   - Na tela de importação, expanda "Environment Variables"
   - Adicione:
     - `NEXT_PUBLIC_SUPABASE_URL` = `https://jkgrxdscxznnbsodllmd.supabase.co`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = sua chave anon (eyJ...)

5. Clique em **Deploy**

---

## Opção 2: Via CLI

1. **Instale e faça login**:
   ```bash
   npx vercel login
   ```

2. **Deploy**:
   ```bash
   npx vercel
   ```

3. **Adicione as variáveis** no [Dashboard da Vercel](https://vercel.com/dashboard) → seu projeto → Settings → Environment Variables

---

## Importante

- Execute a migration SQL no Supabase antes de usar a aplicação em produção
- As variáveis de ambiente devem ser configuradas na Vercel para o Supabase funcionar
