"""Quote service — creation, approval (item / total), cancellation.

Key rules implemented here:
- Quote totals are computed deterministically from items (server-side).
- Item snapshots are frozen on create (catalog code/name, price, commission).
- When tooth_procedure_id is provided: pull tooth/face/price from the
  ToothProcedure projection (snapshot fidelity with the odontogram).
- Approving an item emits `finance.quote_item_approved` — the bridge handler
  (registered in main.py) consumes that and transitions the linked
  ToothProcedure from `planned` to `to_execute`.
- The aggregate Quote status auto-reconciles after each item decision:
    all approved              → APPROVED
    all rejected              → REJECTED
    any approved + any other  → APPROVED_PARTIAL
    no decisions yet          → DRAFT/SENT (untouched)
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import NotFoundError, ValidationError
from src.core.events import bus
from src.modules.clinical.catalog.models import Procedure
from src.modules.clinical.catalog.repository import ProcedureRepository
from src.modules.clinical.odontogram.models import ToothProcedure
from src.modules.finance.quotes import events as quote_events
from src.modules.finance.quotes.enums import (
    QuoteItemStatus,
    QuoteStatus,
    can_transition_item,
)
from src.modules.finance.quotes.models import Quote, QuoteItem
from src.modules.finance.quotes.repository import (
    QuoteItemRepository,
    QuoteRepository,
)
from src.modules.finance.quotes.schemas import (
    CancelIn,
    QuoteCreateIn,
    QuoteItemCreateIn,
    RejectIn,
)
from src.modules.patients.models import Patient

_ZERO = Decimal("0")


class QuoteService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = QuoteRepository(session)
        self._items = QuoteItemRepository(session)
        self._catalog = ProcedureRepository(session)

    # ── reads ─────────────────────────────────────────────────

    async def get(self, clinic_id: uuid.UUID, quote_id: uuid.UUID) -> Quote:
        quote = await self._repo.get(clinic_id, quote_id)
        if not quote:
            raise NotFoundError("Orçamento não encontrado")
        return quote

    async def list_by_clinic(
        self,
        clinic_id: uuid.UUID,
        *,
        patient_id: uuid.UUID | None,
        status_in: list[str] | None,
        page: int,
        page_size: int,
    ) -> tuple[list[Quote], int]:
        return await self._repo.list_by_clinic(
            clinic_id,
            patient_id=patient_id,
            status_in=status_in,
            page=page,
            page_size=page_size,
        )

    # ── creation ──────────────────────────────────────────────

    async def create(
        self,
        clinic_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        data: QuoteCreateIn,
    ) -> Quote:
        # Patient must exist & not anonymized
        patient = await self._session.get(Patient, data.patient_id)
        if (
            patient is None
            or patient.clinic_id != clinic_id
            or patient.deleted_at is not None
        ):
            raise NotFoundError("Paciente não encontrado")
        if patient.anonymized_at is not None:
            raise ValidationError("Paciente anonimizado — orçamentos indisponíveis")

        # Build items first (validates everything, computes totals)
        items: list[QuoteItem] = []
        for item_in in data.items:
            items.append(await self._build_item(clinic_id, data.patient_id, item_in))

        subtotal = sum((i.line_total for i in items), start=_ZERO)
        total = (subtotal - data.discount_amount).quantize(Decimal("0.01"))
        if total < _ZERO:
            raise ValidationError(
                "Desconto global maior que o subtotal",
                details={"subtotal": str(subtotal), "discount": str(data.discount_amount)},
            )

        number = await self._repo.next_number(
            clinic_id, year=datetime.now(timezone.utc).year
        )

        quote = Quote(
            clinic_id=clinic_id,
            patient_id=data.patient_id,
            number=number,
            status=QuoteStatus.DRAFT,
            subtotal=subtotal,
            discount_amount=data.discount_amount,
            total=total,
            notes=data.notes,
            valid_until=data.valid_until,
            created_by_user_id=actor_user_id,
            items=items,
        )
        self._repo.add(quote)
        await self._session.flush()

        await bus.publish(
            quote_events.quote_created(
                quote.id,
                clinic_id,
                patient_id=data.patient_id,
                total=quote.total,
                items_count=len(items),
            )
        )
        return quote

    async def _build_item(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
        item_in: QuoteItemCreateIn,
    ) -> QuoteItem:
        procedure = await self._catalog.get(clinic_id, item_in.procedure_id)
        if not procedure:
            raise NotFoundError(
                "Procedimento não encontrado no catálogo",
                details={"procedure_id": str(item_in.procedure_id)},
            )
        if not procedure.is_active:
            raise ValidationError(
                "Procedimento inativo no catálogo",
                details={"procedure_id": str(item_in.procedure_id)},
            )

        tooth_fdi = item_in.tooth_fdi
        faces = list(item_in.faces)
        unit_price = item_in.unit_price_override or Decimal(procedure.base_price)
        tooth_procedure: ToothProcedure | None = None

        # If linked to a ToothProcedure → take snapshots from it
        if item_in.tooth_procedure_id is not None:
            tooth_procedure = await self._session.get(
                ToothProcedure, item_in.tooth_procedure_id
            )
            if (
                tooth_procedure is None
                or tooth_procedure.clinic_id != clinic_id
                or tooth_procedure.patient_id != patient_id
                or tooth_procedure.deleted_at is not None
            ):
                raise NotFoundError(
                    "Procedimento do odontograma não encontrado para este paciente",
                    details={"tooth_procedure_id": str(item_in.tooth_procedure_id)},
                )
            if tooth_procedure.procedure_id != procedure.id:
                raise ValidationError(
                    "procedure_id divergente do procedimento do odontograma",
                    details={
                        "expected": str(tooth_procedure.procedure_id),
                        "received": str(procedure.id),
                    },
                )
            tooth_fdi = tooth_procedure.tooth_fdi
            faces = list(tooth_procedure.faces or [])
            if item_in.unit_price_override is None:
                unit_price = Decimal(tooth_procedure.price_snapshot)

        # Procedure-required field checks (independent of source)
        if procedure.requires_tooth and not tooth_fdi:
            raise ValidationError(
                "Procedimento exige indicação do dente (FDI)",
                details={"procedure_id": str(procedure.id)},
            )
        if procedure.requires_faces and not faces:
            raise ValidationError(
                "Procedimento exige ao menos uma face",
                details={"procedure_id": str(procedure.id)},
            )

        line_total = (
            unit_price * item_in.quantity - item_in.discount_amount
        ).quantize(Decimal("0.01"))
        if line_total < _ZERO:
            raise ValidationError(
                "Desconto do item maior que o valor base",
                details={"unit_price": str(unit_price), "quantity": str(item_in.quantity)},
            )

        commission_pct = item_in.commission_pct
        if commission_pct is None and procedure.commission_pct_override is not None:
            commission_pct = Decimal(procedure.commission_pct_override)

        return QuoteItem(
            clinic_id=clinic_id,
            procedure_id=procedure.id,
            procedure_code_snapshot=procedure.code,
            procedure_name_snapshot=procedure.name,
            tooth_procedure_id=tooth_procedure.id if tooth_procedure else None,
            tooth_fdi=tooth_fdi,
            faces=faces,
            description=item_in.description,
            quantity=item_in.quantity,
            unit_price=unit_price.quantize(Decimal("0.01")),
            discount_amount=item_in.discount_amount,
            line_total=line_total,
            commission_pct_snapshot=commission_pct,
            commission_amount_snapshot=item_in.commission_amount,
            deductions=[d.model_dump(mode="json", exclude_none=True) for d in item_in.deductions],
            status=QuoteItemStatus.PENDING,
        )

    # ── item-level decisions ──────────────────────────────────

    async def approve_item(
        self,
        clinic_id: uuid.UUID,
        quote_id: uuid.UUID,
        item_id: uuid.UUID,
        actor_user_id: uuid.UUID,
    ) -> tuple[QuoteItem, Quote]:
        quote = await self.get(clinic_id, quote_id)
        self._ensure_quote_decidable(quote)

        item = next((i for i in quote.items if i.id == item_id), None)
        if item is None:
            raise NotFoundError("Item do orçamento não encontrado")

        if not can_transition_item(item.status, QuoteItemStatus.APPROVED):
            raise ValidationError(
                f"Item já decidido (status={item.status.value})",
                details={"item_id": str(item.id), "status": item.status.value},
            )

        now = datetime.now(timezone.utc)
        item.status = QuoteItemStatus.APPROVED
        item.decided_at = now
        item.decided_by_user_id = actor_user_id
        item.rejection_reason = None

        self._reconcile_quote_status(quote, actor_user_id, now)
        await self._session.flush()

        # Publish AFTER flush so DB state is durable for any handler that
        # opens its own session.
        await bus.publish(
            quote_events.quote_item_approved(
                item.id,
                clinic_id,
                quote_id=quote.id,
                patient_id=quote.patient_id,
                tooth_procedure_id=item.tooth_procedure_id,
                procedure_id=item.procedure_id,
                line_total=item.line_total,
                actor_user_id=actor_user_id,
                extra={"tooth_fdi": item.tooth_fdi, "faces": item.faces},
            )
        )
        return item, quote

    async def reject_item(
        self,
        clinic_id: uuid.UUID,
        quote_id: uuid.UUID,
        item_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        data: RejectIn,
    ) -> tuple[QuoteItem, Quote]:
        quote = await self.get(clinic_id, quote_id)
        self._ensure_quote_decidable(quote)

        item = next((i for i in quote.items if i.id == item_id), None)
        if item is None:
            raise NotFoundError("Item do orçamento não encontrado")

        if not can_transition_item(item.status, QuoteItemStatus.REJECTED):
            raise ValidationError(
                f"Item já decidido (status={item.status.value})",
                details={"item_id": str(item.id), "status": item.status.value},
            )

        now = datetime.now(timezone.utc)
        item.status = QuoteItemStatus.REJECTED
        item.decided_at = now
        item.decided_by_user_id = actor_user_id
        item.rejection_reason = data.reason

        self._reconcile_quote_status(quote, actor_user_id, now)
        await self._session.flush()

        await bus.publish(
            quote_events.quote_item_rejected(
                item.id,
                clinic_id,
                quote_id=quote.id,
                tooth_procedure_id=item.tooth_procedure_id,
                reason=data.reason,
                actor_user_id=actor_user_id,
            )
        )
        return item, quote

    # ── quote-level decisions ─────────────────────────────────

    async def approve_quote(
        self,
        clinic_id: uuid.UUID,
        quote_id: uuid.UUID,
        actor_user_id: uuid.UUID,
    ) -> Quote:
        """Bulk-approve all PENDING items. Emits events for each."""
        quote = await self.get(clinic_id, quote_id)
        self._ensure_quote_decidable(quote)

        pending = [i for i in quote.items if i.status == QuoteItemStatus.PENDING]
        if not pending:
            raise ValidationError(
                "Nenhum item pendente para aprovação",
                details={"quote_id": str(quote.id), "status": quote.status.value},
            )
        for item in pending:
            await self.approve_item(clinic_id, quote.id, item.id, actor_user_id)

        # Re-fetch quote with refreshed items
        await self._session.refresh(quote)
        return quote

    async def cancel(
        self,
        clinic_id: uuid.UUID,
        quote_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        data: CancelIn,
    ) -> Quote:
        quote = await self.get(clinic_id, quote_id)
        if quote.status in {QuoteStatus.CANCELLED, QuoteStatus.EXPIRED}:
            raise ValidationError(
                f"Orçamento já {quote.status.value}",
                details={"status": quote.status.value},
            )

        quote.status = QuoteStatus.CANCELLED
        await self._session.flush()

        await bus.publish(
            quote_events.quote_status_changed(
                quote.id, clinic_id,
                new_status=QuoteStatus.CANCELLED.value,
                actor_user_id=actor_user_id,
                reason=data.reason,
            )
        )
        return quote

    # ── helpers ───────────────────────────────────────────────

    @staticmethod
    def _ensure_quote_decidable(quote: Quote) -> None:
        if quote.status in {
            QuoteStatus.CANCELLED,
            QuoteStatus.EXPIRED,
            QuoteStatus.REJECTED,
        }:
            raise ValidationError(
                f"Orçamento em status terminal: {quote.status.value}",
                details={"status": quote.status.value},
            )
        if quote.valid_until is not None and quote.valid_until < datetime.now(
            timezone.utc
        ):
            raise ValidationError(
                "Orçamento expirado (valid_until ultrapassado)",
                details={"valid_until": quote.valid_until.isoformat()},
            )

    def _reconcile_quote_status(
        self, quote: Quote, actor_user_id: uuid.UUID, now: datetime
    ) -> None:
        statuses = {i.status for i in quote.items}
        old = quote.status
        if statuses == {QuoteItemStatus.APPROVED}:
            new = QuoteStatus.APPROVED
        elif statuses == {QuoteItemStatus.REJECTED}:
            new = QuoteStatus.REJECTED
        elif QuoteItemStatus.APPROVED in statuses:
            new = QuoteStatus.APPROVED_PARTIAL
        elif QuoteItemStatus.REJECTED in statuses and QuoteItemStatus.PENDING in statuses:
            # Partial rejection but nothing approved yet → keep current
            new = old if old != QuoteStatus.DRAFT else QuoteStatus.DRAFT
        else:
            new = old

        if new != old:
            quote.status = new
            if new == QuoteStatus.APPROVED:
                quote.approved_by_user_id = actor_user_id
                quote.approved_at = now
