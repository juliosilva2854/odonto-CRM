# Estado do Projeto — 2026-09-22

## ✅ Concluído
- Migrations 0001-0008 (baseline → password_reset_tokens)
- Módulos: tenancy, auth, patients, clinical (catalog/odontogram/records),
  finance (quotes), agenda, audit, onboarding, billing, users
- SubscriptionGateMiddleware (enforcement 402 para clínicas inadimplentes)
- Prompt #5: reset de senha (forgot/reset, token SHA-256 uso único, 1h) +
  CRUD de usuários (invite/list/role/deactivate, proteção de último admin)
- email_client com modo DEV (loga URL/token) e modo Resend (chave `re_`)
- 114 testes passando (95 baseline + 9 password reset + 10 users CRUD)

## ⏳ Próximos prompts
- Prompt #6: Landing page + onboarding wizard frontend
- Prompt #7: Deploy Render + Vercel + Neon

## 🔑 Credenciais externas (NUNCA commitar valores)
- Stripe: área restrita ativa
- Neon: projeto odonto-crm (São Paulo)
- Resend: [ ] criar conta
- Render: [ ] criar
- Vercel: [ ] criar

## 🧭 Notas de ambiente (sandbox volátil — reprovisionamento)
O sandbox pode resetar entre sessões (perde Postgres + venv + backend/.env).
Para reerguer:
1. `apt-get install -y postgresql postgresql-contrib` → `service postgresql start`
2. `CREATE USER dental WITH PASSWORD 'dental' SUPERUSER;` + `CREATE DATABASE dental_crm OWNER dental;`
3. Instalar deps pinadas do `pyproject.toml` (o `pip install -e .` falha em Python 3.11
   por `requires-python>=3.12` — instalar a lista manualmente; o código roda em 3.11).
4. Recriar `backend/.env` (gitignored).
5. `python -m alembic upgrade head` → `python -m scripts.seed_baseline`
6. Servidor de testes: `uvicorn src.main:app --host 127.0.0.1 --port 8765`
7. Testes: `python -m pytest tests/ -v` (esperado: 114 passed)

Credenciais seed: admin@demo.odonto/Admin@123, dentist@demo.odonto/Dentist@123,
reception@demo.odonto/Reception@123.
