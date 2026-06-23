import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Loader2, Printer } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { patientsService } from "@/services/patients.service";
import { useAuthStore } from "@/store/auth";
import type { Quote } from "@/types/api";

// react-pdf is heavy (~1.5MB gzip) — load it lazily on demand.
const PdfBundle = lazy(async () => {
  const [{ PDFViewer, PDFDownloadLink }, { QuotePdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./QuotePdfDocument"),
  ]);
  return {
    default: function PdfBundleInner({
      quote,
      patient,
      clinic,
      dentist,
    }: {
      quote: Quote;
      patient: NonNullable<ReturnType<typeof useQuery<Awaited<ReturnType<typeof patientsService.get>>>>["data"]>;
      clinic: ReturnType<typeof useAuthStore.getState>["clinic"];
      dentist: ReturnType<typeof useAuthStore.getState>["user"];
    }) {
      if (!clinic) return null;
      return (
        <>
          {/* Live preview inside the dialog (A4 ratio) */}
          <div className="flex-1 overflow-hidden rounded-xl border border-border bg-secondary/30">
            <PDFViewer
              width="100%"
              height="100%"
              showToolbar
              style={{ border: "none", backgroundColor: "transparent" }}
            >
              <QuotePdfDocument
                quote={quote}
                patient={patient}
                clinic={clinic}
                dentist={dentist}
              />
            </PDFViewer>
          </div>

          {/* Download link (rendered as our styled Button via render-prop) */}
          <PDFDownloadLink
            document={
              <QuotePdfDocument
                quote={quote}
                patient={patient}
                clinic={clinic}
                dentist={dentist}
              />
            }
            fileName={`${quote.number}-${patient.full_name.replace(/\s+/g, "_")}.pdf`}
            className="contents"
          >
            {({ loading }) => (
              <Button
                type="button"
                variant="accent"
                disabled={loading}
                data-testid="download-quote-pdf"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Gerando…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> Baixar PDF
                  </>
                )}
              </Button>
            )}
          </PDFDownloadLink>
        </>
      );
    },
  };
});

interface QuotePdfDialogProps {
  quote: Quote;
}

export function QuotePdfDialog({ quote }: QuotePdfDialogProps) {
  const [open, setOpen] = useState(false);
  const clinic = useAuthStore((s) => s.clinic);
  const dentist = useAuthStore((s) => s.user);

  // Patient data (needed for the document header)
  const patientQuery = useQuery({
    queryKey: ["patient", quote.patient_id],
    queryFn: () => patientsService.get(quote.patient_id),
    enabled: open && !!quote.patient_id,
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        data-testid="open-pdf-dialog"
      >
        <FileText className="h-4 w-4" />
        Gerar PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[88vh] max-h-[900px] w-[min(96vw,980px)] max-w-[980px] flex-col p-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Documento do orçamento {quote.number}</DialogTitle>
                <DialogDescription>
                  Pré-visualização em A4 · imprima ou baixe para enviar via WhatsApp.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 flex-col gap-3 overflow-hidden px-6 py-4">
            {patientQuery.isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : patientQuery.isError || !patientQuery.data ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Não foi possível carregar os dados do paciente.
                </AlertDescription>
              </Alert>
            ) : !clinic ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Sessão sem clínica vinculada. Faça login novamente.
                </AlertDescription>
              </Alert>
            ) : (
              <Suspense
                fallback={
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p className="text-xs">Carregando gerador de PDF…</p>
                  </div>
                }
              >
                <PdfBundle
                  quote={quote}
                  patient={patientQuery.data}
                  clinic={clinic}
                  dentist={dentist}
                />
              </Suspense>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Fechar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              data-testid="print-quote-pdf"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
