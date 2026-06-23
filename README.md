# Dental CRM — Monolito Modular

CRM Odontológico de alto padrão. Multi-tenant, modular, com odontograma event-sourced,
orçamento automático, financeiro, comissões e automações de WhatsApp.

## Stack

- **Backend**: Python 3.12 · FastAPI · SQLAlchemy 2.0 async · Alembic · asyncpg
- **Banco**: PostgreSQL 16 (extensão `btree_gist` obrigatória — anti-conflito em agenda)
- **Cache / Fila futura**: Redis 7 (preparado, ainda não consumido na Fase 1)
- **Frontend**: React + Vite + TypeScript (entra na Fase 2)
- **Infra**: Docker Compose com profiles `self-hosted` e `cloud`

## Status atual (Sprint S0 + S1 — Fundação + Tenancy + Auth)

- Docker Compose com Postgres + Redis + Backend
- Camada `core/` completa: config, db async, security (JWT + bcrypt), context multi-tenant, event bus in-process, feature flags em runtime, job runner abstraído, storage local
- Módulo `tenancy`: Clinic + ClinicFeature
- Módulo `auth`: User + Professional, login JWT, RBAC (admin/dentist/reception)
- Migration Alembic inicial com `btree_gist`
- Seed baseline: clínica demo + 3 usuários + feature flags default
- Swagger navegável em `/api/docs`

## Como rodar (local)

```bash
# 1. Copiar variáveis
cp .env.example .env

# 2. Subir tudo
docker compose up --build

# 3. Aguardar logs:
#    backend  | INFO  Application startup complete.
#    backend  | INFO  Uvicorn running on http://0.0.0.0:8001

# 4. Acessar
#    Swagger:     http://localhost:8001/api/docs
#    Healthcheck: http://localhost:8001/api/health
```

### Credenciais de demonstração (criadas pelo seed)

| Perfil      | Email                       | Senha          |
| ----------- | --------------------------- | -------------- |
| Admin       | admin@demo.odonto           | Admin@123      |
| Dentist     | dentist@demo.odonto         | Dentist@123    |
| Reception   | reception@demo.odonto       | Reception@123  |

> Trocar todas as senhas em produção. As credenciais acima são geradas via seed para
> ambiente de desenvolvimento apenas.

## Comandos úteis

```bash
# Rodar migrations manualmente
docker compose exec backend alembic upgrade head

# Criar nova migration após mudança de modelo
docker compose exec backend alembic revision --autogenerate -m "descricao"

# Rodar seed novamente (idempotente)
docker compose exec backend python -m scripts.seed_baseline

# Logs apenas do backend
docker compose logs -f backend

# Shell no Postgres
docker compose exec db psql -U postgres -d dental_crm
```

## Estrutura

```
/app
├── docker-compose.yml
├── .env.example
└── backend/
    ├── Dockerfile
    ├── pyproject.toml
    ├── alembic/
    ├── scripts/seed_baseline.py
    └── src/
        ├── main.py
        ├── core/          (config, db, security, events, feature_flags, jobs, storage, context, logging, errors)
        ├── shared/        (base_model, repository, schemas comuns)
        └── modules/
            ├── tenancy/   (Clinic + ClinicFeature)
            └── auth/      (User + Professional + login JWT + RBAC)
```

## Próximas fases

- **Fase 1 (S2-S3)**: Patients + Anamnese + Agenda Multi-recurso + Check-in
- **Fase 2 (S4-S6)**: Frontend Vite+TS + UI de Pacientes/Agenda
- **Fase 3 (S7-S9)**: Odontograma FDI + Prontuário + Orçamento + Contrato
- **Fase 4+**: Financeiro · Comissões · WhatsApp · BI

---

Proprietário — todos os direitos reservados.
