"""Billing module — assinaturas SaaS via Stripe.

Domínio
-------
Cada ``Clinic`` (tenant) é uma assinatura. O estado comercial vive na própria
tabela ``clinics`` (migration 0006):

- ``plan``                    → plano contratado (``PlanTier``: essencial/pro/clinica)
- ``subscription_status``     → ``SubscriptionStatus`` (trialing/active/past_due/canceled)
- ``trial_ends_at``           → fim do trial de 14 dias criado no signup
- ``stripe_customer_id``      → ``cus_...`` (1:1 com a clínica, único parcial)
- ``stripe_subscription_id``  → ``sub_...``
- ``current_period_end``      → fim do ciclo pago corrente

Fluxo de checkout
-----------------
1. Admin chama ``POST /api/billing/checkout`` com o plano desejado.
2. Se a clínica ainda não tem ``stripe_customer_id``, criamos um Customer no
   Stripe e persistimos o id (idempotente por clínica).
3. Mapeamos ``plan → price_id`` (``STRIPE_PRICE_*``) e criamos uma Checkout
   Session ``mode=subscription``.
4. O frontend redireciona para ``checkout_url``.

Webhook (Prompt #3B — ainda não implementado)
---------------------------------------------
O Stripe é a fonte de verdade do pagamento. O webhook vai apenas materializar
os eventos (``checkout.session.completed``, ``customer.subscription.*``,
``invoice.payment_failed``) nas colunas acima, via ``BillingRepository``.

Relação com tenancy
-------------------
A leitura de estado é delegada a ``TenancyService`` (``get_clinic`` /
``is_subscription_active``), que já é a autoridade sobre "esta clínica pode
usar features pagas?". O billing não duplica essa regra.

Segurança
---------
Ids do Stripe (``stripe_customer_id`` / ``stripe_subscription_id``) NUNCA são
expostos em schemas de resposta HTTP.
"""
