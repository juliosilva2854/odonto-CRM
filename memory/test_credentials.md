# Credenciais de Teste — Dental CRM (Development)

> ⚠️ **AVISO**: credenciais geradas por seed para ambiente de desenvolvimento.  
> Trocar todas em produção. Nunca commitar este arquivo com credenciais reais.

## Clínica Demo

| Campo | Valor |
|---|---|
| Nome Fantasia | Demo Odonto |
| Razão Social | Demo Odonto Clínica LTDA |
| CNPJ | 00.000.000/0001-00 |
| Timezone | America/Sao_Paulo |
| Plano | premium |

## Usuários (criados pelo seed automaticamente)

| Perfil      | Email                  | Senha          | Notas |
|-------------|------------------------|----------------|-------|
| Admin       | admin@demo.odonto      | Admin@123      | Acesso total |
| Dentista    | dentist@demo.odonto    | Dentist@123    | CRO 12345/SP · Comissão 40% |
| Recepção    | reception@demo.odonto  | Reception@123  | Operacional |

## Banco de Dados

Conexão local (via Docker Compose):

| Campo | Valor |
|---|---|
| Host | localhost (host) / db (container) |
| Porta | 5432 |
| Database | dental_crm |
| Usuário | postgres |
| Senha | postgres |

Conexão direta:
```bash
docker compose exec db psql -U postgres -d dental_crm
```

## JWT

- `JWT_SECRET`: definido em `.env` (default dev: `change_me_in_production_min_32_chars_long_secret`)
- Access token expira em 60 minutos
- Refresh token expira em 7 dias

## Endpoints úteis para validar

```bash
# Health
curl http://localhost:8001/api/health

# Login (retorna JWT)
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.odonto","password":"Admin@123"}'

# Me (precisa do token do login)
curl http://localhost:8001/api/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# Listar feature flags
curl http://localhost:8001/api/clinic-features \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# Ativar/desativar feature (admin)
curl -X PUT http://localhost:8001/api/clinic-features/whatsapp \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"config":{"provider":"evolution"}}'
```

## Feature Flags Default (15)

Habilitadas:
- patients · anamnesis · agenda · checkin
- clinical_records · odontogram · quotes · contracts
- financial_core · commission_split · recurring_charges

Desabilitadas (ativar via PUT quando integrar):
- online_payment (Fase 6) · whatsapp (Fase 5) · email · dashboard_bi (Fase 6)
