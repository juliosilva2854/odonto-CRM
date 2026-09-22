# Deploy

> Nada aqui exige rodar comandos no sandbox — é um guia para o deploy manual
> nas contas do usuário. Os arquivos `render.yaml`, `frontend/vercel.json`,
> `backend/Dockerfile` e `frontend/.env.example` já estão versionados.

## Backend (Render)
1. Criar conta em render.com (login com GitHub)
2. New → Web Service → conectar repo `odonto-CRM`
3. Render detecta `render.yaml` automaticamente
4. Adicionar env vars no dashboard:
   - `DATABASE_URL` (Neon pooled, com `postgresql+asyncpg://`)
   - `DATABASE_URL_SYNC` (Neon direct, com `postgresql+psycopg2://`)
   - `JWT_SECRET` (gerar com: `openssl rand -hex 32`)
   - `FRONTEND_ORIGINS=https://odonto-crm.vercel.app`
   - `STRIPE_SECRET_KEY=sk_test_...` (colar do Stripe)
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (criar endpoint no Stripe)
   - `STRIPE_PRICE_ESSENCIAL=price_...`
   - `STRIPE_PRICE_PRO=price_...`
   - `STRIPE_PRICE_CLINICA=price_...`
   - `RESEND_API_KEY=re_...` (criar conta em resend.com)
   - `EMAIL_FROM=onboarding@resend.dev`
   - `FRONTEND_BASE_URL=https://odonto-crm.vercel.app`
   - `SUBSCRIPTION_GATE_ENABLED=true`
   - `ENVIRONMENT=production`
5. Deploy → aguardar build (o start roda `alembic upgrade head` antes do servidor)

## Frontend (Vercel)
1. Criar conta em vercel.com (login com GitHub)
2. New Project → conectar repo `odonto-CRM`
3. Root Directory: `frontend`
4. Framework: Vite (detecta automaticamente)
5. Env vars:
   - `VITE_API_URL=https://odonto-crm-backend.onrender.com`
   - `VITE_WHATSAPP_NUMBER=5511989442854`
6. Deploy

## Banco (Neon)
1. Criar projeto em neon.tech (região São Paulo)
2. Copiar connection string Pooled + Direct
3. Rodar migrations: (Render roda automaticamente no start)

## Stripe
1. Criar produtos via script: `python -m scripts.create_stripe_products`
2. Colar os 3 `price_id`s no Render
3. Criar webhook endpoint em dashboard.stripe.com/test/webhooks
   - URL: `https://odonto-crm-backend.onrender.com/api/billing/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
   - Copiar signing secret (`whsec_...`) pro Render

## DNS (opcional)
- Comprar domínio no registro.br (~R$ 40/ano)
- Apontar CNAME pra Vercel
- Configurar domínio customizado no Vercel
