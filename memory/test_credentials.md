# Test Credentials — odonto-CRM (local dev seed)

Backend API (local dev): http://127.0.0.1:8765
Postgres: postgresql://dental:dental@localhost:5432/dental_crm

## Seed users (scripts.seed_baseline)
| Role        | Email                  | Password        |
|-------------|------------------------|-----------------|
| Super Admin | super@odonto.com       | SuperAdmin123!  |
| Admin       | admin@demo.odonto      | Admin@123       |
| Dentist     | dentist@demo.odonto    | Dentist@123     |
| Reception   | reception@demo.odonto  | Reception@123   |

Super Admin is tenant-less (platform role). Login redirects to /admin.
Created via: `python -m scripts.create_super_admin --email super@odonto.com --password 'SuperAdmin123!' --full-name "Super Admin"`

Clinic: Demo Odonto
