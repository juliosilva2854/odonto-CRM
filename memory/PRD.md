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

## Roadmap de Sprints

| Fase | Sprints | Foco | Status |
|---|---|---|---|
| 0 | S0 | Fundação (Docker, core/, Alembic) | ✅ Entregue |
| 1 | S1 | Tenancy + Auth + RBAC + Seed | ✅ Entregue |
| 1 | S2 | Patients (LGPD) + Catálogo + DataAccessLog | ✅ Entregue |
| 1 | S3 | Agenda Multi-recurso + Check-in | ✅ Entregue |
| 3 | S4.1 | Odontograma (Event-Sourced) + Prontuário (Lock CFO 24h) | ✅ Entregue (Fev/2026) |
| 3 | S4.2 | Orçamentos (Quotes) + bridge Event Bus → Odontograma | ✅ Entregue (Fev/2026) |
| 2 | S5-S6 | Frontend MVP + Anamnese | ⏳ **Próximo** |
| 3 | S7-S9 | Clínico (refinos) + Contrato | ⏳ Pendente |
| 4 | S10-S11 | Financeiro + Comissões | ⏳ Pendente |
| 5 | S12-S13 | WhatsApp Automatizado | ⏳ Pendente |
| 6 | S14-S15 | Pagamento Online + BI | ⏳ Pendente |
| 7 | S16 | Hardening + Self-hosting | ⏳ Pendente |

## O que está implementado

### Sprint S0 — Fundação
- Docker Compose: Postgres 16 + Redis 7 + Backend (hot reload)
- `core/` completo: config, database (UoW), security (JWT+bcrypt), context (multi-tenant via ContextVar), middleware, errors, logging (structlog), event bus síncrono, feature flags com cache, JobRunner abstrato, storage local
- Alembic + extensão `btree_gist` + migration baseline
- Healthcheck + CORS configurável

### Sprint S1 — Tenancy + Auth
- Modelos: `Clinic`, `ClinicFeature`, `User`, `Professional`
- Migration `0001_baseline`
- Auth: `/api/auth/{login,refresh,me}` + JWT access/refresh
- RBAC dependency `require_role([UserRole.ADMIN, ...])`
- Tenancy: `/api/clinics/me`, `/api/clinic-features`, `PUT /api/clinic-features/{key}`
- Seed: clínica demo + 3 usuários + 15 feature flags

### Sprint S2 — Patients (LGPD) + Catálogo + DataAccessLog ✅ NOVO

**Modelos novos (5):**
- `patients.Patient` — PII completo + anonymized_at marker
- `patients.PatientConsent` — versionado, append-only
- `clinical.catalog.Specialty`
- `clinical.catalog.Procedure` — TUSS-ready
- `audit.DataAccessLog` — LGPD Art. 37

**Endpoints novos (16):**

Pacientes:
- `POST /api/patients` — criação com validação CPF (algoritmo de dígitos), E.164 phone, UF uppercase
- `GET /api/patients` — paginado, busca por nome/cpf/telefone/email
- `GET /api/patients/{id}` — detalhe (publica evento `patients.accessed` → DataAccessLog automático)
- `PUT /api/patients/{id}` — atualização parcial
- `DELETE /api/patients/{id}` — soft delete (admin)
- `POST /api/patients/{id}/anonymize` — **LGPD Direito ao Esquecimento** (admin, irreversível, requer confirmation+reason)
- `POST /api/patients/{id}/consents` — registra grant/revoke versionado
- `GET /api/patients/{id}/consents` — histórico completo (auditoria)
- `GET /api/patients/{id}/consents/current` — estado atual por escopo

Catálogo:
- `POST/GET/PUT /api/specialties` + `GET /api/specialties/{id}`
- `POST/GET/PUT/DELETE /api/procedures` + `GET /api/procedures/{id}` (filtros por categoria, especialidade, busca por código/TUSS)

**Validações Pydantic:**
- CPF: algoritmo brasileiro de dígitos verificadores + rejeição de sequências (111.111.111-11)
- Telefone: normalização para E.164 brasileiro (+55XXX)
- UF: maiúsculas obrigatórias
- TUSS: limpeza de máscara, mantém só dígitos
- Hex colors: padrão #RRGGBB + uppercase
- Anonimização: requer flag explícita `confirmation=true`

**Arquitetura LGPD em ação:**
1. Endpoint `GET /api/patients/{id}` chama `PatientService.get(...)` com `actor_user_id`, `purpose`, `ip`
2. Service publica evento `patients.accessed` no in-process event bus
3. Handler em `modules/audit/events.py` (registrado em `main.py`) subscreve o evento
4. Handler chama `audit.service.log_data_access(...)` que persiste em `data_access_logs` em **sessão própria** (sobrevive a rollback da request)
5. Resultado: auditoria desacoplada do fluxo principal · módulos sem importar uns aos outros

**Migration `0002_patients_catalog_audit`** — cria 5 tabelas + 3 enums + 9 índices (incluindo unique parcial de CPF por clínica enquanto não anonimizado).

**Seed atualizado:** + 3 especialidades (Clínica Geral, Ortodontia, Endodontia) + 3 procedimentos (Profilaxia, Restauração 1F, Canal Molar) com TUSS + 2 pacientes (Maria adulta · Lucas menor com responsável) + LGPD consents registrados.

### Sprint S4.1 — Odontograma (Event-Sourced) + Prontuário (Lock CFO) ✅ NOVO (Fev/2026)

**Modelos novos (4):**
- `clinical.odontogram.OdontogramEvent` — log append-only (event sourcing, CFO-compliant)
- `clinical.odontogram.ToothProcedure` — projeção materializada (leitura rápida do chart de 32 dentes)
- `clinical.records.ClinicalRecord` — evolução clínica com lock window
- `clinical.records.ClinicalRecordAddendum` — adendos append-only após o lock

**Enums (3):** `OdontogramEventType`, `ToothProcedureStatus` (planned/to_execute/in_progress/done/cancelled), `ClinicalRecordType`.

**Endpoints novos (12):**

Odontograma (`/api/clinical/...`):
- `GET /patients/{id}/odontogram` — estado atual (projeção)
- `POST /patients/{id}/odontogram/procedures` — planeja procedimento por dente FDI + faces
- `POST /odontogram/procedures/{tp_id}/status` — máquina de estados validada
- `DELETE /odontogram/procedures/{tp_id}` — cancela
- `POST /patients/{id}/odontogram/notes` — anotação livre
- `GET /patients/{id}/odontogram/events` — histórico append-only

Prontuário (`/api/clinical/...`):
- `POST /patients/{id}/records` — criação
- `GET /patients/{id}/records` — paginado
- `GET /records/{id}` — detalhe (com `is_locked` + `locks_at`)
- `PUT /records/{id}` — edição (bloqueada após `lock_hours`)
- `POST /records/{id}/addendums` — append-only (sela `locked_at` no primeiro adendo pós-lock)
- `GET /records/{id}/addendums` — lista

**Regras de negócio implementadas:**
- **Padrão FDI/ISO 3950** com validação completa (adultos 11-48 + decíduos 51-85)
- **State machine** de procedimentos com transições explícitas (`can_transition_procedure`)
- **Snapshots imutáveis** de preço e comissão no momento do planejamento (anti-retroativo)
- **Lock CFO** configurável por clínica via feature flag `clinical_records.config.lock_hours` (default 24h)
- **Adendos append-only** após o lock — selam `locked_at` para auditoria
- **Edição restrita** ao autor original (ou admin) durante a janela
- **Pacientes anonimizados** (LGPD) bloqueiam acesso ao prontuário/odontograma

**Migration `0004_clinical_records`** — 4 tabelas + 3 enums + 10 índices (incluindo partial index por `deleted_at IS NULL` em `tooth_procedures`).

**Testes pytest** (`/app/backend/tests/`):
- `test_odontogram.py` (7 testes): projeção, validação FDI/face, state machine, eventos, anotações
- `test_clinical_records.py` (3 testes): janela de edição, lock CFO, adendos append-only
- **10/10 passando** ✅

**Bugfix incidental:** `validation_exception_handler` em `core/errors.py` quebrava ao serializar `RequestValidationError.errors()` quando Pydantic v2 incluía exceções no `ctx`. Trocado por `jsonable_encoder(exc.errors())`.



```bash
cp .env.example .env
docker compose up --build
# Acesse http://localhost:8001/api/docs
```

## Credenciais

Ver `/app/memory/test_credentials.md`

## Decisões Arquiteturais (acumuladas)

1. Multi-tenant via `clinic_id` em toda tabela transacional
2. Feature flags em duas camadas (por clínica + futuro per-user)
3. Odontograma event-sourced (S7)
4. Snapshot de preços em quotes (S9)
5. Comissão congelada na conclusão (S11)
6. LGPD: `data_access_logs` (S2 ✅) + `audit_logs` (mutações, futuro) + `consent_logs` (em patients ✅)
7. Event bus in-process síncrono após commit
8. JobRunner abstraído (BG tasks → Celery futuro)
9. Storage abstraído (Local → S3)
10. Channel-agnostic communication

## Backlog / Próximos Sprints

### Sprint S4.2 — Orçamentos (Quotes) com Bridge Finance↔Clinical ✅ NOVO (Fev/2026)

**Modelos novos (2):**
- `finance.quotes.Quote` — orçamento com numeração humana `ORC-YYYY-NNNNNN` (única por clínica)
- `finance.quotes.QuoteItem` — item com snapshots de preço, comissão e `deductions` (preparado para Splits)

**Enums (3):** `QuoteStatus` (draft/sent/approved_partial/approved/rejected/cancelled/expired), `QuoteItemStatus` (pending/approved/rejected), `DeductionType` (card_fee/lab_fee/material/platform_fee/other).

**Endpoints novos (7) em `/api/finance/quotes/`:**
- `POST /` — cria orçamento (1..50 itens, valida totais server-side)
- `GET /` — paginado, filtros `patient_id` e `status`
- `GET /{id}` — detalhe (carrega items via `selectinload`)
- `POST /{id}/items/{item_id}/approve` — aprovação granular item-a-item
- `POST /{id}/items/{item_id}/reject` — rejeição com motivo
- `POST /{id}/approve` — bulk-approve de todos os itens pending
- `POST /{id}/cancel` — cancelamento manual

**🔗 Event Bridge Finance ↔ Clinical (regra de ouro):**
- Aprovação de item emite `finance.quote_item_approved` no EventBus in-process
- `finance.quotes.handlers._on_quote_item_approved` (registrado em `main.py`) abre **sessão própria** e chama `OdontogramService.change_status(tp_id, TO_EXECUTE, trigger="quote_approved")`
- ToothProcedure transiciona `planned → to_execute` automaticamente
- Item ad-hoc sem `tooth_procedure_id` (ex: profilaxia) é aprovado sem disparar bridge

**Preparo para Splits (S11):**
- `commission_pct_snapshot` (5,2) + `commission_amount_snapshot` (10,2) frozen no `QuoteItem`
- `deductions: JSONB` lista de `{type, amount, label}` — taxas/materiais a deduzir ANTES do split
- Permite que o módulo financeiro futuro compute liquidação sem recálculo de snapshots

**Reconciliação automática do agregado Quote:**
- Todos aprovados → `APPROVED` (+ `approved_at`/`approved_by_user_id`)
- Todos rejeitados → `REJECTED`
- Misto (qualquer aprovado) → `APPROVED_PARTIAL`
- State machine de itens: `pending → approved/rejected` (terminal)

**Migration `0005_quotes`** — 2 tabelas + 2 enums + 4 índices + unique constraint `(clinic_id, number)`. Upgrade/downgrade testados.

**Bugfix incidental:** snapshots de `deductions` em JSONB usam `model_dump(mode="json")` para serializar `Decimal` → `str` corretamente (asyncpg+JSONB rejeita Decimal nativo).

**Testes pytest novos (8)** — `tests/test_quotes.py`:
- Criação com snapshots completos (preço, comissão, deductions)
- Desconto inválido → 422
- **Bridge ouro: aprovar item → ToothProcedure muda para `to_execute`** ✓
- Aprovação parcial (state `approved_partial`)
- Dupla decisão bloqueada
- Cancelamento + bloqueio de ações posteriores
- Item ad-hoc sem `tooth_procedure_id` (não dispara bridge)
- Listagem paginada

**Suite total: 18/18 testes verdes** ✅

### S5-S6 — Frontend MVP
- React + Vite + TS · login, agenda, pacientes, prontuário, odontograma visual (chart FDI clicável)
- Stack confirmado em PRD; iniciar após S4.2

### Pontos de atenção identificados em S2
- Sprint S3: validar política de retenção de DataAccessLog (LGPD não exige TTL, mas pode crescer rápido — considerar particionamento mensal a partir de S15).
- Decidir se queremos AuditLog (mutações) ainda como módulo separado ou integrado a S3.
- Validar com cliente se queremos importação em massa de TUSS via CSV (S2 deixou estrutura pronta, mas endpoint de bulk-import não foi feito).

---

## S5.1 — Billing (Stripe) — fundação · 2026-06

**Escopo entregue** (sem webhook — Prompt #3B):

- **Dependência**: `stripe>=11.0.0` em `pyproject.toml` (instalado 14.4.1; usa variantes nativas `*_async` do SDK, sem threadpool).
- **Config** (`src/core/config.py`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_{ESSENCIAL,PRO,CLINICA}`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` — todos opcionais + property `stripe_configured` (ignora valores `*PLACEHOLDER*`).
- **`src/core/stripe_client.py`**: `_ensure_configured`, `get_price_id_for_plan`, `create_customer`, `create_checkout_session` → `(url, session_id)`, `create_portal_session`, `retrieve_subscription`. `stripe.StripeError` → `AppException(code="stripe_error", 502, details.stripe_code)`.
- **`scripts/create_stripe_products.py`**: idempotente por `metadata.internal_key`; preços 29700/49700/79700 BRL/mês; imprime bloco pronto pro `.env`; **DRY RUN** se Stripe não configurado.
- **Módulo `src/modules/billing/`**: `__init__` (docstring de domínio), `enums` (re-export `PlanTier` + `SubscriptionStatus`), `schemas`, `repository` (mutações atômicas em `clinics`: `set_stripe_customer`, `set_subscription`, `clear_subscription`, `mark_trial_active`), `service` (delegação a `TenancyService`), `router` (`/api/billing/status|checkout|portal`, admin-only).
- **Sem migration nova** — reutiliza colunas de `0006_subscription`. Tabela `billing_events` fica para `0007` quando o webhook precisar de auditoria.
- **Nenhum id do Stripe exposto em schema HTTP.**

**Testes**: `tests/test_billing.py` (6) — status trialing, RBAC 403 em status e checkout, checkout 422 "Stripe not configured", checkout mockado (in-process ASGI + `AsyncMock`) retornando `checkout_url`, portal 422 sem customer. **Suite total: 47/47 verdes.**

### Backlog
- **P0** Prompt #3B: webhook `/api/billing/webhook` (assinatura `STRIPE_WEBHOOK_SECRET`, eventos `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`) + migration `0007_billing_events` para idempotência/auditoria.
- **P1** Gating de features por `is_subscription_active` (bloquear rotas pagas em `past_due`/trial expirado).
- **P1** Rodar `scripts.create_stripe_products` com chave real e preencher `STRIPE_PRICE_*`.
- **P2** Frontend: telas `/billing`, `/billing/success`, `/billing/cancel`.

## S5.2 — Webhook Stripe + billing_events · 2026-06

- **Config**: `+ STRIPE_PORTAL_RETURN_URL` (default `http://localhost:5173/settings/billing`); `create_portal` passou a usá-la em vez de `STRIPE_SUCCESS_URL`.
- **Migration `0007_billing_events`** (head): tabela `billing_events` (`stripe_event_id` UNIQUE, `event_type`, `payload` JSONB, `clinic_id` FK ON DELETE SET NULL, `status` VARCHAR(20) + `ck_billing_events_status`, `error`, `processed_at`, TimestampMixin) + índices `ix_billing_events_status`, `ix_billing_events_clinic`, `ix_billing_events_type_time`. Downgrade testado (drop índices + drop table).
- **`billing/models.py`**: `BillingEventStatus` (pending/processed/failed/ignored) + `BillingEvent` (SAEnum `native_enum=False, length=20, create_constraint=False`). Registrado em `alembic/env.py`.
- **`BillingEventRepository`**: `try_insert_event` (INSERT em SAVEPOINT → `None` em unique violation = duplicata), `get_by_stripe_event_id`, `mark_processed`, `mark_failed`, `mark_ignored`. `BillingRepository.get_by_stripe_customer` novo.
- **`BillingService.process_webhook_event`**: idempotente; dispatch de `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`; tipos não mapeados → `ignored`; falha → `mark_failed` + re-raise (500 → Stripe retenta). Mapa `_STRIPE_STATUS_MAP` (active/trialing→active, past_due/incomplete→past_due, canceled/unpaid/incomplete_expired→canceled).
- **`POST /api/billing/webhook`**: público, raw bytes (`await request.body()`), `stripe.Webhook.construct_event`; assinatura inválida/ausente → **400** `invalid_signature`; secret ausente → **503** `webhook_not_configured`.
- **Testes**: +5 webhook (assinatura inválida, 503 sem secret, subscription.created aplica `active`+`current_period_end`+`sub_id`, idempotência com retry do mesmo `event_id`, evento desconhecido → `ignored`). **Suite total: 52/52 verdes.**

### Backlog atualizado
- **P0** Gating por assinatura: bloquear rotas pagas quando `is_subscription_active` = False (`past_due` / trial expirado).
- **P1** Registrar o endpoint no dashboard do Stripe + preencher `STRIPE_WEBHOOK_SECRET` e `STRIPE_PRICE_*` reais (`python -m scripts.create_stripe_products`).
- **P1** Endpoint admin de reprocessamento de `billing_events` com `status='failed'`.
- **P2** Frontend: `/settings/billing`, `/billing/success`, `/billing/cancel`.
