# Dental CRM — Monolito Modular

CRM odontológico **Boutique Clinic / Modern Premium SaaS** — multi-tenant,
modular, com odontograma event-sourced, prontuário com **lock CFO de 24h**,
orçamentos com aprovação granular, agenda multi-recurso com **trava tripla
anti-conflito** e automações de WhatsApp.

> Status: **Sprint S6 concluído** — fluxo clínico, financeiro e agenda
> completos no frontend, prontos para operação assistida.

---

## Stack

### Backend
- **Linguagem / framework**: Python 3.12 · FastAPI · SQLAlchemy 2.0 async · Alembic · asyncpg
- **Banco**: PostgreSQL 16 (extensão `btree_gist` obrigatória para o anti-conflito da agenda)
- **Cache / Fila**: Redis 7
- **Infra**: Docker Compose com profiles `self-hosted` e `cloud`

### Frontend
- **Build**: React 18 + Vite 6 + TypeScript (strict)
- **Estilização**: Tailwind CSS + Shadcn UI (Radix primitives) — design system **Modern Premium**
- **Estado**: Zustand (auth) + TanStack React Query 5 (data fetching/caching)
- **Calendário**: FullCalendar v6 (`dayGrid` · `timeGrid` · `interaction`)
- **PDF**: `@react-pdf/renderer` com lazy-loading
- **Roteamento**: React Router 6
- **Datas**: `date-fns` (locale `pt-BR`)

---

## Design System — Modern Premium

Inspirado em Vercel · Stripe · Linear. 100% sans-serif (Inter via Google Fonts),
bordas `rounded-xl/2xl`, sombras whisper-soft, muito whitespace.

| Token | Valor | Uso |
|---|---|---|
| `--background` | `slate-50` | Fundo geral |
| `--foreground` | `slate-900` | Texto principal |
| `--primary` | `zinc-900` | Botões primários / superfícies escuras |
| `--accent` | `indigo-600` | Brand / CTAs / links |
| `--success` | `emerald-500` | "Concluído", aprovações |
| `--warning` | `amber-500` | Sala de espera |
| `--destructive` | `rose-600` | Lock CFO bloqueado, rejeição |

Fontes: **Inter** (sans) · variants `font-mono` para números de orçamento.

---

## Funcionalidades por sprint

### S5.1 — Refatoração Modern Premium
Tema completo (paleta · tipografia · radius · sombras), brand monogram indigo,
sidebar/header/login reskinned.

### S5.2 — Tela do paciente + Odontograma FDI
- Rota `/patients/:id` com header rico (avatar gradient, badges LGPD/menor)
- **CFO Lock Badge** dinâmico (aberto verde / bloqueado vermelho)
- Odontograma FDI/ISO 3950 com **32 dentes** em SVG, **5 faces clicáveis**
  (M · D · V · L/P · O/I) calculadas automaticamente por quadrante
- Slide-over de detalhes do dente com formulário de novo procedimento

### S5.3 — Evolução clínica + status rápido
- **Tabs** no PatientRecordPage: Odontograma · Evolução Clínica
- Timeline de `ClinicalRecord` com adendos lazy-load aninhados
- Editor inteligente que **muda de modo conforme o lock CFO**:
  - `edit` (PUT) na janela aberta de 24h
  - `addendum` (POST append-only) quando bloqueado, com banner vermelho + read-only do conteúdo original
  - `create` (POST) para entradas novas
- **Dropdown de status** em cada procedimento do dente, espelhando o state machine do backend (`ALLOWED_TRANSITIONS`)
- Invalida `["odontogram", patientId]` ao mudar status → SVG repinta instantaneamente

### S5.4 — Orçamentos & aprovação granular
- 3ª tab "Orçamentos" no paciente
- Slide-over **"Novo Orçamento"** lendo procedimentos `planned` do odontograma
- Tela de detalhe com tabela limpa de itens · botões ✓/✗ por item
- **Sincronização CFO**: aprovar item invalida `["odontogram", patientId]` → o
  dente correspondente já fica **azul indigo `to_execute`** quando o usuário voltar

### S5.5 — Painel financeiro global + PDF
- Rota `/finance/quotes` na sidebar com:
  - 4 cards de métricas (pendente / aprovados no mês / conversão / volume)
  - Tabela Shadcn com resolução lazy de pacientes
  - Busca por número ou nome
- **PDF Premium** A4 via `@react-pdf/renderer`, design espelhando o app:
  header dark + cards · tabela de itens · totals indigo · assinaturas · footer fixo com paginação
- Bundle lazy: PDF só é baixado quando o dentista clica em "Gerar PDF"

### S5.6 — WhatsApp manual + filtros avançados
- Helper `lib/whatsapp.ts` (puro, testável) gerando mensagem **Boutique Clinic** formal ("Sr(a). + senhor(a)")
- Botão `MessageCircle` emerald no detalhe do orçamento e na lista global
- **Filtro de status** por Popover com **presets de follow-up da recepção** ("Para cobrar hoje", "Em elaboração", "Recusões", "Fechados")

### S6 — Agenda multi-recurso
- Rota `/agenda` (alias `/calendar`) com FullCalendar v6 **estilizado Modern Premium** (~180 linhas de override em `agenda-fullcalendar.css`)
- Visualização padrão `timeGridWeek` 07:00–20:00, slots 30 min, locale pt-BR
- Eventos com cores neutras por status:
  - Agendado · Confirmado (indigo) · Sala de espera (amber) · Na cadeira (emerald) · Concluído · Cancelado · No-show
- Click-and-drag em horário vazio → slide-over **Novo Agendamento**
- Form com `PatientPicker` searchable (nome/CPF/telefone) + select de dentista + sala + datetime-local
- **Toast vermelho** ao receber `409 Conflict` da trava tripla
- Sistema de Toast Radix (`@radix-ui/react-toast`) reutilizável em todo o app

---

## Estrutura

```
/app
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/                            ← FastAPI · SQLAlchemy · PostgreSQL
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic/
│   ├── scripts/seed_baseline.py
│   └── src/
│       ├── main.py
│       ├── core/                       (config · db · security · events · feature_flags · jobs · storage · context · errors)
│       ├── shared/                     (base_model · repository · schemas)
│       └── modules/
│           ├── tenancy/                Clinic + ClinicFeature
│           ├── auth/                   User + Professional + JWT + RBAC
│           ├── patients/               Patient + Anamnese
│           ├── agenda/                 Room + Appointment (anti-conflito tripla)
│           ├── clinical/
│           │   ├── records/            ClinicalRecord + Addendum (lock CFO 24h)
│           │   ├── catalog/            Specialty + Procedure
│           │   └── odontogram/         ToothProcedure event-sourced
│           ├── finance/
│           │   └── quotes/             Quote + QuoteItem + aprovação granular
│           └── audit/
└── frontend/                           ← React 18 + Vite + TS
    ├── index.html
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── main.tsx
        ├── App.tsx                     (router + Suspense + Toaster)
        ├── index.css                   (design tokens Modern Premium)
        ├── lib/
        │   ├── api.ts                  (axios + interceptors auth)
        │   ├── utils.ts
        │   └── whatsapp.ts             (deep-link wa.me)
        ├── store/
        │   └── auth.ts                 (Zustand)
        ├── hooks/
        │   └── useAuth.ts              (login/logout/me)
        ├── services/                   (camada fina sobre o axios)
        │   ├── patients.service.ts
        │   ├── agenda.service.ts
        │   ├── catalog.service.ts
        │   ├── odontogram.service.ts
        │   ├── clinical-records.service.ts
        │   └── quotes.service.ts
        ├── types/
        │   └── api.ts                  (contratos espelhando os Pydantic schemas)
        ├── components/
        │   ├── ui/                     (Shadcn: button, card, badge, sheet, dialog,
        │   │                            tabs, table, popover, dropdown-menu, toast,
        │   │                            input, label, textarea, separator, skeleton,
        │   │                            alert)
        │   ├── brand/BrandMark.tsx
        │   ├── auth/ProtectedRoute.tsx
        │   ├── layout/                 (DashboardLayout · Sidebar · Header)
        │   ├── odontogram/             (Tooth · OdontogramChart · ProcedureRow ·
        │   │                            ToothDetailSheet · fdi.ts)
        │   ├── clinical/               (ClinicalEvolutionTab · RecordsTimeline ·
        │   │                            NewRecordEditor)
        │   ├── quotes/                 (QuotesTab · QuotesList · QuoteDetail ·
        │   │                            NewQuoteSheet · QuotePdfDialog ·
        │   │                            QuotePdfDocument · QuoteStatusFilter ·
        │   │                            WhatsAppQuoteButton · quote-status.tsx)
        │   └── agenda/                 (PatientPicker · NewAppointmentSheet ·
        │                                appointment-status.ts)
        └── pages/
            ├── LoginPage.tsx
            ├── DashboardPage.tsx
            ├── PatientsListPage.tsx
            ├── PatientRecordPage.tsx
            ├── FinanceQuotesPage.tsx
            ├── AgendaPage.tsx          (lazy chunk)
            ├── agenda-fullcalendar.css
            └── NotFoundPage.tsx
```

---

## Como rodar (local)

### 1) Backend (Docker Compose)

```bash
# 1. Copiar variáveis
cp .env.example .env

# 2. Subir Postgres + Redis + Backend
docker compose up --build

# 3. Aguardar:
#    backend  | INFO  Application startup complete.
#    backend  | INFO  Uvicorn running on http://0.0.0.0:8001

# 4. Acessar
#    Swagger:     http://localhost:8001/api/docs
#    Healthcheck: http://localhost:8001/api/health
```

### 2) Frontend (Vite dev server)

```bash
cd frontend
yarn install
yarn dev          # → http://localhost:5173
```

O frontend usa a variável `VITE_API_BASE_URL` (com fallback para `/api` via proxy
Vite). Para apontar para outro backend, crie `frontend/.env.local`:

```
VITE_API_BASE_URL=http://localhost:8001
```

### 3) Verificação rápida

```bash
cd frontend

yarn lint              # ESLint — esperado: 0 issues
yarn tsc --noEmit      # type-check — esperado: 0 errors
yarn build             # produção — esperado: ✓ built in ~12s
```

---

## Credenciais de demonstração (seed)

| Perfil    | Email                   | Senha          |
| --------- | ----------------------- | -------------- |
| Admin     | admin@demo.odonto       | Admin@123      |
| Dentist   | dentist@demo.odonto     | Dentist@123    |
| Reception | reception@demo.odonto   | Reception@123  |

> ⚠️ Trocar todas as senhas em produção. Apenas para desenvolvimento.

---

## Comandos úteis

```bash
# Migrations
docker compose exec backend alembic upgrade head
docker compose exec backend alembic revision --autogenerate -m "descricao"

# Re-seed (idempotente)
docker compose exec backend python -m scripts.seed_baseline

# Logs
docker compose logs -f backend
docker compose logs -f db

# Shell Postgres
docker compose exec db psql -U postgres -d dental_crm

# Frontend
cd frontend
yarn dev              # dev server com HMR
yarn build            # build de produção
yarn preview          # serve o build local
```

---

## Performance & Code-splitting (frontend)

Estratégia de bundle agressivamente otimizada via `React.lazy` + Suspense:

| Chunk | Tamanho gzip | Quando carrega |
|---|---|---|
| `index.js` (principal) | **~168 KB** | Sempre |
| `index.css` (design system) | ~8 KB | Sempre |
| `AgendaPage.js` + FullCalendar | **~83 KB** | Ao abrir `/agenda` |
| `AgendaPage.css` (overrides) | ~1.3 KB | Junto com a página |
| `QuotePdfDocument.js` | ~2.8 KB | Ao clicar "Gerar PDF" |
| `react-pdf.browser.js` | **~493 KB** | Ao clicar "Gerar PDF" (1ª vez) |

Quem entra direto no Login/Dashboard **nunca baixa** calendário nem PDF.

---

## Regras de ouro do produto

1. **CFO Lock 24h** — todo `ClinicalRecord` tem janela editável de 24h após criação.
   Depois disso, qualquer alteração precisa virar `Addendum` append-only.
2. **Trava tripla na agenda** — não é possível criar dois `Appointment` que se sobreponham para o mesmo `professional_id`, `room_id` ou `patient_id`. O backend devolve `409 Conflict`.
3. **Snapshots financeiros** — quando um `QuoteItem` é criado a partir de um
   `ToothProcedure`, o preço, código TUSS e comissão são **congelados no momento da geração** do orçamento. Alterar a tabela de preços depois não muda orçamentos passados.
4. **Aprovação granular** — aprovar um `QuoteItem` **automaticamente** muda o
   status do `ToothProcedure` correspondente para `to_execute`. O frontend invalida o cache do odontograma para refletir isso sem refresh.
5. **Multi-tenant rigoroso** — toda query do backend recebe `clinic_id` do JWT;
   o frontend nunca envia esse parâmetro explicitamente.

---

## Roadmap

### Concluído
- ✅ S0 · S1 — Fundação · Tenancy · Auth
- ✅ S2 · S3 — Patients · Anamnese · Agenda backend · Check-in
- ✅ S4 — Odontograma backend (event-sourced) · Catalog
- ✅ S5.1 — Refatoração visual Modern Premium
- ✅ S5.2 — Tela do paciente · Odontograma FDI interativo
- ✅ S5.3 — Evolução clínica · status rápido · adendos
- ✅ S5.4 — Orçamentos · aprovação granular
- ✅ S5.5 — Painel financeiro global · PDF Premium
- ✅ S5.6 — WhatsApp manual · filtros avançados
- ✅ S6 — Agenda multi-recurso visual (FullCalendar)

### Próximos
- **S6.1** — Drag/resize de eventos · painel lateral de detalhes · WebSocket de check-in
- **S7** — Plano de tratamento sequenciado · Anamnese versionada
- **S8** — Financeiro completo · comissões automáticas · conciliação
- **S9** — Dashboard BI (gráficos receita planejada × realizada · top procedimentos)
- **S10+** — Integrações: WhatsApp Business API · pagamento (Stripe/Pix) · assinatura digital

---

Proprietário — todos os direitos reservados.
