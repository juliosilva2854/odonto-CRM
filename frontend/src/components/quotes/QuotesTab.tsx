import { useState } from "react";

import { QuotesList } from "./QuotesList";
import { QuoteDetail } from "./QuoteDetail";

interface QuotesTabProps {
  patientId: string;
  /** Patient anonymized / read-only → disable mutations. */
  patientReadOnly?: boolean;
}

/**
 * Orchestrator for the "Orçamentos" tab:
 *   ─ If no quote is selected → list + "Novo Orçamento" button.
 *   ─ If a quote is selected   → detail view with item-by-item approval.
 */
export function QuotesTab({ patientId, patientReadOnly = false }: QuotesTabProps) {
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  if (selectedQuoteId) {
    return (
      <QuoteDetail
        quoteId={selectedQuoteId}
        patientId={patientId}
        onBack={() => setSelectedQuoteId(null)}
        disabled={patientReadOnly}
      />
    );
  }

  return (
    <QuotesList
      patientId={patientId}
      onSelectQuote={setSelectedQuoteId}
      disabled={patientReadOnly}
    />
  );
}
