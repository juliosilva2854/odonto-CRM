# Dental CRM — PRD (Product Requirements Document)

## Visão Geral

CRM Odontológico de alto padrão, multi-tenant, modular. Foco em eliminação de
atritos operacionais, automação via WhatsApp e experiência clínica visual integrada.
Arquitetura monolito modular, conteinerizada, com suporte a self-hosting e SaaS.

## Stack Definida

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12 · FastAPI · SQLAlchemy 2.0 async · Alembic |
| Banco | PostgreSQL 16 (extensão `btree_gist` para anti-conflito) |
| Cache/Filas | Redis 7 (preparado, ativa em Fase 5+) |
| Frontend | React + Vite + TypeScript (entra na Fase 2) |
| Infra | Docker Compose |
| Storage | Local (default) · S3 (config) |
| Comunicação | Evolution API (default) · Cloud API (opcional) |

## Personas

- **Admin (Dono/Gestor)**: acesso total · configura módulos · vê financeiro consolidado · define comissões.
- **Dentista**: agenda própria · prontuário · odontograma · suas comissões. NÃO vê fluxo de caixa global.
- **Recepção/Secretaria**: agenda global · check-in · orçamentos · cobranças · caixa diário. NÃO vê histórico clínico detalhado.

## Decisões Arquiteturais

1. **Multi-tenant desde o dia 1**: `clinic_id` em toda tabela transacional.
2. **Feature flags em duas camadas**: por clínica (`clinic_features`) e por usuário (futuro `user_permissions`).
3. **Odontograma event-sourced**: cada marcação é um `tooth_finding` imutável; estado atual é view derivada.
4. **Snapshot de preços em orçamentos**: catálogo pode mudar, quote aprovado mantém valor.
5. **Comissão congelada na conclusão**: `commission_entry` snapshotta % e valor.
6. **LGPD compliance**: `audit_logs` + `data_access_logs` + `consent_logs` obrigatórios.
7. **Event bus in-process** sincronicamente após commit; preparado para migrar a Celery.
8. **JobRunner abstraído**: BackgroundTasks agora · Celery futuro (mesma interface).
9. **Storage abstraído**: LocalDisk · S3 (sem refactor de domínio).
10. **Channel-agnostic communication**: WhatsApp/Email/SMS via mesma interface.

## Modelagem (32 tabelas)

- **Core**: clinics, clinic_features, users, professionals, patients, rooms, appointments, check_ins, anamnesis_{templates,questions,options,responses}
- **Clínico**: specialties, procedures, procedure_prices, insurance_plans, tooth_findings (+ view derivada), clinical_records, attachments, quotes, quote_items, contracts
- **Financeiro**: financial_entries, payments, payment_methods, payment_gateway_transactions, cash_sessions, commission_entries, commission_payouts, recurring_charges
- **Comunicação**: message_templates, outbound_messages, inbound_messages, inbound_pattern_rules, webhook_events
- **Auditoria/LGPD**: audit_logs, data_access_logs, consent_logs

## Roadmap de Sprints

| Fase | Sprints | Foco | Status |
|---|---|---|---|
| 0 | S0 | Fundação (Docker, core/, Alembic) | ✅ Entregue |
| 1 | S1-S3 | Core API: tenancy + auth + patients + agenda | 🟡 S1 entregue |
| 2 | S4-S6 | Frontend MVP + Anamnese | ⏳ Pendente |
| 3 | S7-S9 | Clínico (Odontograma + Quotes + Contrato) | ⏳ Pendente |
| 4 | S10-S11 | Financeiro + Comissões | ⏳ Pendente |
| 5 | S12-S13 | WhatsApp Automatizado | ⏳ Pendente |
| 6 | S14-S15 | Pagamento Online + BI | ⏳ Pendente |
| 7 | S16 | Hardening + Self-hosting | ⏳ Pendente |

## O que está implementado (S0 + S1)

### Sprint S0 — Fundação
- ✅ Docker Compose: Postgres 16 + Redis 7 + Backend (hot reload)
- ✅ `core/config.py` — Pydantic Settings (fail-fast)
- ✅ `core/database.py` — AsyncEngine + UoW context manager
- ✅ `core/security.py` — bcrypt + JWT (access + refresh) com python-jose
- ✅ `core/context.py` — RequestContext via ContextVar (multi-tenant)
- ✅ `core/middleware.py` — populates context from JWT
- ✅ `core/errors.py` — AppException unificada + handlers globais
- ✅ `core/logging.py` — structlog JSON com request_id
- ✅ `core/events/bus.py` — InProcessEventBus síncrono
- ✅ `core/feature_flags/` — service + decorator `@require_feature`
- ✅ `core/jobs/` — BackgroundTasksRunner + interface JobRunner
- ✅ `core/storage/` — LocalDisk + interface StorageBackend
- ✅ Alembic configurado + extensão `btree_gist` + migration zero
- ✅ Healthcheck `/api/health`
- ✅ CORS configurável via env

### Sprint S1 — Tenancy + Auth
- ✅ Modelos: `Clinic`, `ClinicFeature`, `User`, `Professional`
- ✅ Migration `0001_baseline` com todas as tabelas + enum `userrole`
- ✅ Auth flow: login (`/api/auth/login`), refresh (`/api/auth/refresh`), me (`/api/auth/me`)
- ✅ RBAC dependency `require_role([UserRole.ADMIN, ...])`
- ✅ Tenancy endpoints: `/api/clinics/me`, `/api/clinic-features`, `PUT /api/clinic-features/{key}`
- ✅ Seed baseline idempotente: 1 clínica demo + 3 usuários (admin/dentist/reception) + 15 feature flags default
- ✅ Swagger navegável em `/api/docs`

## Como executar

```bash
cp .env.example .env
docker compose up --build
# Acesse http://localhost:8001/api/docs
```

## Backlog / Próximos Sprints

### S2 (próximo) — Pacientes + Catálogo + Salas
- Módulo `patients`: CRUD + consentimento LGPD básico
- Módulo `clinical/catalog/specialties`
- Módulo `agenda/rooms`: CRUD
- Tabela `audit_logs` + trigger PL/pgSQL
- Middleware `data_access_logs` em rotas de paciente

### S3 — Agenda Multi-recurso + Check-in
- Módulo `agenda/appointments` com EXCLUDE constraint anti-conflito (3 recursos)
- Módulo `agenda/checkin` (QR / PIN / Manual)
- WebSocket/SSE para status em tempo real
- Eventos: AppointmentScheduled, PatientCheckedIn

## Credenciais de Teste

Ver `/app/memory/test_credentials.md`

## Pontos de Atenção (Decisões Pendentes na Próxima Sessão)

- Sprint S2: validar se queremos modelo de auditoria já com trigger PL/pgSQL agora ou implementação via SQLAlchemy event listeners (mais portável).
- Verificar se a integração Evolution API deve ser conteinerizada em paralelo no Compose (profile `whatsapp`) já nas próximas fases.
