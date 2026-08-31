# Painel de Clientes

Dashboard para gestão de clientes, contratos e cobranças recorrentes de aplicativos vendidos para negócios locais.

## Como publicar (grátis, ~5 minutos)

### Opção 1 — Vercel (recomendado, mais simples)

1. Crie uma conta grátis em https://vercel.com (pode entrar com GitHub, Google ou e-mail)
2. Se você não tem GitHub ainda, crie uma conta grátis em https://github.com
3. Suba esta pasta para um repositório novo no GitHub (pode arrastar os arquivos direto na interface do GitHub, em "Add file" → "Upload files")
4. No Vercel, clique em "Add New" → "Project", selecione o repositório que você acabou de criar
5. O Vercel detecta automaticamente que é um projeto Vite/React — não precisa mudar nada, é só clicar em "Deploy"
6. Em ~1 minuto você recebe um link tipo `painel-clientes.vercel.app`, que é o seu app publicado

### Opção 2 — Netlify (arrastar e soltar, sem GitHub)

1. No seu computador, abra o terminal dentro desta pasta e rode:
   ```
   npm install
   npm run build
   ```
2. Isso cria uma pasta `dist/`
3. Vá em https://app.netlify.com/drop e arraste a pasta `dist` para lá
4. Pronto — você recebe o link publicado na hora

## Rodando localmente antes de publicar (opcional)

```
npm install
npm run dev
```

Abre em `http://localhost:5173`

## Importante sobre os dados

Os dados dos clientes ficam salvos no navegador de quem está usando o app (localStorage). Isso significa:

- Os dados **não se perdem** ao fechar a aba ou o navegador
- Mas se você acessar de outro computador ou celular, os dados **não aparecem lá** — cada dispositivo tem seu próprio armazenamento local
- Se quiser que vários dispositivos ou pessoas da equipe vejam os mesmos dados em tempo real (um banco de dados de verdade na nuvem), é um passo a mais — posso te ajudar a configurar isso com um serviço como Supabase ou Firebase quando você precisar.
