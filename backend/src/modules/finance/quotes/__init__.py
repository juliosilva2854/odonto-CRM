"""Quotes (orçamentos) module.

Generates patient-specific quotes from either:
  - ToothProcedure rows (planned items in the odontogram), or
  - Ad-hoc catalog procedures (e.g. prophylaxis, whole-mouth)

Approval flow:
  - Item-level: each QuoteItem can be approved/rejected independently.
  - Quote-level: the aggregate status auto-reconciles based on items.
  - Approving a QuoteItem linked to a ToothProcedure emits
    `finance.quote_item_approved` → bridge handler transitions the tooth
    procedure from `planned` to `to_execute`.
"""
