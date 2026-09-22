"""Users module — gestão de membros da clínica (convite, listagem, papel, desativação).

Opera sobre o modelo ``auth.User`` existente (não cria tabela nova) e reutiliza
o enum ``auth.UserRole``. O convite reaproveita o fluxo de token de reset de
senha (mesmo token, mesma rota ``/api/auth/reset-password``).
"""
