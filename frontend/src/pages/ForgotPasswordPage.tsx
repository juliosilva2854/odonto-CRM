import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, MailCheck, Send } from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
    } catch {
      /* anti-enumeration: always show the same success message */
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandMark size="md" withWordmark />
        </div>

        <Card className="p-8">
          {sent ? (
            <div className="text-center" data-testid="forgot-sent">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
                <MailCheck className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">
                Verifique seu e-mail
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Se o e-mail existir, você receberá um link de recuperação em
                alguns minutos. Verifique sua caixa de entrada.
              </p>
              <Button asChild variant="outline" className="mt-6 w-full">
                <Link to="/login">
                  <ArrowLeft className="h-4 w-4" /> Voltar ao login
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                Recuperar senha
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="voce@clinica.com.br"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="forgot-email"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="accent"
                  className="w-full"
                  disabled={loading}
                  data-testid="forgot-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Enviar link de recuperação
                    </>
                  )}
                </Button>
              </form>

              <Link
                to="/login"
                className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao login
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
