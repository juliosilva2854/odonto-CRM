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
| 3 | S4.2 | Orçamentos (Quotes) + bridge Event Bus → Odontograma | ⏳ **Em andamento** |
| 2 | S5-S6 | Frontend MVP + Anamnese | ⏳ Pendente |
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

### Sprint S4.2 — Orçamentos (Quotes) [próximo]
- Modelos: `Quote`, `QuoteItem` (com snapshot de preço e link opcional `tooth_procedure_id`)
- Endpoints: criação, aprovação total/parcial item-a-item, rejeição, cancelamento
- Evento `finance.quote_item_approved` → handler em `odontogram` muda status `planned → to_execute`
- Migration `0005_quotes`

### S5-S6 — Frontend MVP
- React + Vite + TS · login, agenda, pacientes, prontuário, odontograma visual (chart FDI clicável)
- Stack confirmado em PRD; iniciar após S4.2

### Pontos de atenção identificados em S2
- Sprint S3: validar política de retenção de DataAccessLog (LGPD não exige TTL, mas pode crescer rápido — considerar particionamento mensal a partir de S15).
- Decidir se queremos AuditLog (mutações) ainda como módulo separado ou integrado a S3.
- Validar com cliente se queremos importação em massa de TUSS via CSV (S2 deixou estrutura pronta, mas endpoint de bulk-import não foi feito).
