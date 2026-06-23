import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import type {
  ClinicSummary,
  CurrentUser,
  Patient,
  Quote,
} from "@/types/api";

// Use Inter for a Modern Premium look that matches the web UI.
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIa1ZL7.woff", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIa1ZL7.woff", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIa1ZL7.woff", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIa1ZL7.woff", fontWeight: 700 },
  ],
});

// ── Design tokens mirrored from the web design system ─────────────────────────────
const COLORS = {
  foreground: "#0F172A",   // slate-900
  muted: "#64748B",        // slate-500
  mutedSoft: "#94A3B8",    // slate-400
  background: "#F8FAFC",   // slate-50
  card: "#FFFFFF",
  border: "#E2E8F0",       // slate-200
  borderSoft: "#F1F5F9",   // slate-100
  accent: "#4F46E5",       // indigo-600
  accentSoft: "#EEF2FF",   // indigo-50
  success: "#059669",      // emerald-600
  successSoft: "#ECFDF5",  // emerald-50
  rose: "#E11D48",         // rose-600
  roseSoft: "#FFF1F2",     // rose-50
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.background,
    padding: 0,
    fontFamily: "Inter",
    fontSize: 9.5,
    color: COLORS.foreground,
  },
  // Header band — dark graphite mirroring the login splash
  header: {
    backgroundColor: COLORS.foreground,
    color: "#FFFFFF",
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 22,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: COLORS.accent,
    color: "#FFFFFF",
    fontSize: 14, fontWeight: 700,
    textAlign: "center", paddingTop: 5,
  },
  brandName: { fontSize: 13, fontWeight: 700, letterSpacing: 0.3, color: "#FFFFFF" },
  brandDot: { color: COLORS.accent, fontWeight: 700 },
  brandSub: { fontSize: 8, color: "#94A3B8", marginTop: 1, letterSpacing: 1.4, textTransform: "uppercase" },
  docTitle: { textAlign: "right" },
  docTitleLabel: { fontSize: 8, color: "#94A3B8", letterSpacing: 1.4, textTransform: "uppercase" },
  docNumber: { fontSize: 16, fontWeight: 700, color: "#FFFFFF", marginTop: 4 },
  docDate: { fontSize: 8.5, color: "#94A3B8", marginTop: 2 },

  // Main body
  body: { paddingHorizontal: 36, paddingTop: 24, paddingBottom: 90 },
  sectionLabel: {
    fontSize: 7.5, fontWeight: 600, color: COLORS.muted,
    textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 6,
  },

  // Patient + clinic info cards (two columns)
  infoRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
  },
  infoCardTitle: { fontSize: 10, fontWeight: 600, color: COLORS.foreground, marginBottom: 6 },
  infoLine: { fontSize: 8.5, color: COLORS.muted, marginBottom: 2, lineHeight: 1.5 },
  infoLineStrong: { color: COLORS.foreground, fontWeight: 500 },

  // Items table
  tableWrap: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: "hidden",
  },
  tHead: {
    flexDirection: "row",
    backgroundColor: COLORS.borderSoft,
    paddingVertical: 8, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tHeadCell: { fontSize: 7.5, fontWeight: 600, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1.2 },
  tRow: {
    flexDirection: "row",
    paddingVertical: 9, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft,
  },
  tCell: { fontSize: 9, color: COLORS.foreground, lineHeight: 1.4 },
  tCellMuted: { color: COLORS.muted, fontSize: 8.5, marginTop: 1 },

  // Column widths
  col_idx: { width: "5%" },
  col_proc: { width: "45%" },
  col_tooth: { width: "20%" },
  col_qty: { width: "8%", textAlign: "right" },
  col_total: { width: "22%", textAlign: "right" },

  // Totals box
  totalsWrap: { marginTop: 14, alignItems: "flex-end" },
  totalsBox: {
    width: 260,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14,
  },
  totalsLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  totalsLabel: { fontSize: 9, color: COLORS.muted },
  totalsValue: { fontSize: 9.5, color: COLORS.foreground, fontWeight: 500 },
  totalsDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
  grandLabel: { fontSize: 10, color: COLORS.foreground, fontWeight: 700 },
  grandValue: { fontSize: 14, color: COLORS.accent, fontWeight: 700 },

  // Notes
  notesBox: {
    marginTop: 16,
    backgroundColor: COLORS.accentSoft,
    borderLeftWidth: 2, borderLeftColor: COLORS.accent,
    padding: 10, borderRadius: 4,
  },
  notesTitle: { fontSize: 8, fontWeight: 600, color: COLORS.accent, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3 },
  notesText: { fontSize: 9, color: COLORS.foreground, lineHeight: 1.5 },

  // Signatures
  signaturesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 36, gap: 30 },
  sigCol: { flex: 1, alignItems: "center" },
  sigLine: { borderTopWidth: 1, borderTopColor: COLORS.muted, width: "100%", marginBottom: 4 },
  sigName: { fontSize: 9, fontWeight: 600, color: COLORS.foreground },
  sigRole: { fontSize: 7.5, color: COLORS.muted, marginTop: 1, textTransform: "uppercase", letterSpacing: 1.2 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.foreground,
    color: "#94A3B8",
    paddingHorizontal: 36, paddingVertical: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  footerText: { fontSize: 7.5, color: "#94A3B8", letterSpacing: 0.8 },
  pageNum: { fontSize: 7.5, color: "#94A3B8" },
});

function formatBRL(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "R$ 0,00";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

interface QuotePdfDocumentProps {
  quote: Quote;
  patient: Patient;
  clinic: ClinicSummary;
  dentist: CurrentUser | null;
}

export function QuotePdfDocument({
  quote,
  patient,
  clinic,
  dentist,
}: QuotePdfDocumentProps) {
  const createdAt = format(
    new Date(quote.created_at),
    "d 'de' MMMM 'de' yyyy 'às' HH:mm",
    { locale: ptBR },
  );
  const validUntil = quote.valid_until
    ? format(new Date(quote.valid_until), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null;

  return (
    <Document title={`Orçamento ${quote.number}`} author={clinic.trade_name}>
      <Page size="A4" style={styles.page}>
        {/* Header band */}
        <View style={styles.header} fixed>
          <View style={styles.headerRow}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Text>D</Text>
              </View>
              <View>
                <Text style={styles.brandName}>
                  {clinic.trade_name}
                  <Text style={styles.brandDot}>.</Text>
                </Text>
                <Text style={styles.brandSub}>
                  {clinic.legal_name} · CNPJ {clinic.cnpj}
                </Text>
              </View>
            </View>
            <View style={styles.docTitle}>
              <Text style={styles.docTitleLabel}>Orçamento</Text>
              <Text style={styles.docNumber}>{quote.number}</Text>
              <Text style={styles.docDate}>Emitido em {createdAt}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Patient + validity */}
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.sectionLabel}>Paciente</Text>
              <Text style={styles.infoCardTitle}>{patient.full_name}</Text>
              {patient.cpf && (
                <Text style={styles.infoLine}>
                  CPF: <Text style={styles.infoLineStrong}>{patient.cpf}</Text>
                </Text>
              )}
              <Text style={styles.infoLine}>
                Telefone:{" "}
                <Text style={styles.infoLineStrong}>{patient.phone_e164}</Text>
              </Text>
              {patient.email && (
                <Text style={styles.infoLine}>
                  E-mail:{" "}
                  <Text style={styles.infoLineStrong}>{patient.email}</Text>
                </Text>
              )}
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.sectionLabel}>Validade & Condições</Text>
              <Text style={styles.infoCardTitle}>
                {validUntil ? `Até ${validUntil}` : "Sem prazo de validade definido"}
              </Text>
              <Text style={styles.infoLine}>
                Status atual:{" "}
                <Text style={styles.infoLineStrong}>
                  {STATUS_LABEL[quote.status]}
                </Text>
              </Text>
              {dentist && (
                <Text style={styles.infoLine}>
                  Responsável:{" "}
                  <Text style={styles.infoLineStrong}>{dentist.full_name}</Text>
                </Text>
              )}
              <Text style={styles.infoLine}>
                Itens:{" "}
                <Text style={styles.infoLineStrong}>{quote.items.length}</Text>
              </Text>
            </View>
          </View>

          {/* Items table */}
          <Text style={styles.sectionLabel}>Plano de tratamento</Text>
          <View style={styles.tableWrap}>
            <View style={styles.tHead}>
              <Text style={[styles.tHeadCell, styles.col_idx]}>#</Text>
              <Text style={[styles.tHeadCell, styles.col_proc]}>Procedimento</Text>
              <Text style={[styles.tHeadCell, styles.col_tooth]}>Dente / Faces</Text>
              <Text style={[styles.tHeadCell, styles.col_qty]}>Qtd.</Text>
              <Text style={[styles.tHeadCell, styles.col_total]}>Valor</Text>
            </View>
            {quote.items.map((item, idx) => (
              <View key={item.id} style={styles.tRow} wrap={false}>
                <Text style={[styles.tCell, styles.col_idx, { color: COLORS.muted }]}>
                  {String(idx + 1).padStart(2, "0")}
                </Text>
                <View style={styles.col_proc}>
                  <Text style={styles.tCell}>{item.procedure_name_snapshot}</Text>
                  <Text style={styles.tCellMuted}>{item.procedure_code_snapshot}</Text>
                </View>
                <View style={styles.col_tooth}>
                  <Text style={styles.tCell}>
                    {item.tooth_fdi ? `Dente ${item.tooth_fdi}` : "—"}
                  </Text>
                  {item.faces.length > 0 && (
                    <Text style={styles.tCellMuted}>{item.faces.join(" · ")}</Text>
                  )}
                </View>
                <Text style={[styles.tCell, styles.col_qty]}>{item.quantity}</Text>
                <Text
                  style={[
                    styles.tCell,
                    styles.col_total,
                    { fontWeight: 600 },
                  ]}
                >
                  {formatBRL(item.line_total)}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsWrap}>
            <View style={styles.totalsBox}>
              <View style={styles.totalsLine}>
                <Text style={styles.totalsLabel}>Subtotal</Text>
                <Text style={styles.totalsValue}>{formatBRL(quote.subtotal)}</Text>
              </View>
              {Number(quote.discount_amount) > 0 && (
                <View style={styles.totalsLine}>
                  <Text style={styles.totalsLabel}>Desconto</Text>
                  <Text style={styles.totalsValue}>
                    − {formatBRL(quote.discount_amount)}
                  </Text>
                </View>
              )}
              <View style={styles.totalsDivider} />
              <View style={styles.totalsLine}>
                <Text style={styles.grandLabel}>Total</Text>
                <Text style={styles.grandValue}>{formatBRL(quote.total)}</Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          {quote.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>Observações</Text>
              <Text style={styles.notesText}>{quote.notes}</Text>
            </View>
          )}

          {/* Signatures */}
          <View style={styles.signaturesRow}>
            <View style={styles.sigCol}>
              <View style={styles.sigLine} />
              <Text style={styles.sigName}>{patient.full_name}</Text>
              <Text style={styles.sigRole}>Paciente · Aceite</Text>
            </View>
            <View style={styles.sigCol}>
              <View style={styles.sigLine} />
              <Text style={styles.sigName}>
                {dentist?.full_name ?? clinic.trade_name}
              </Text>
              <Text style={styles.sigRole}>
                {dentist ? "Dentista responsável" : "Clínica"}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer band */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {clinic.trade_name} · Documento gerado eletronicamente · Em conformidade com CFO/LGPD
          </Text>
          <Text
            style={styles.pageNum}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

const STATUS_LABEL: Record<Quote["status"], string> = {
  draft: "Rascunho",
  sent: "Enviado ao paciente",
  approved_partial: "Aprovado parcialmente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  cancelled: "Cancelado",
  expired: "Expirado",
};
