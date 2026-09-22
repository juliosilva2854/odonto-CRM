import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, KeyRound, Loader2, ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValid = useMemo(
    () =>
      password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password),
    [password],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordValid) {
      setError("A senha deve ter no mínimo 8 caracteres, com letra e número.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      toast({
        variant: "success",
        title: "Senha redefinida",
        description: "Faça login com sua nova senha.",
      });
      navigate("/login", { replace: true });
    } catch (err) {
      // 422 → token inválido/expirado
      setInvalidToken(true);
      setError(
        getErrorMessage(err, "Link inválido ou expirado. Solicite um novo."),
      );
    } finally {
      setLoading(false);
    }
  }

  const noToken = !token;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandMark size="md" withWordmark />
        </div>

        <Card className="p-8">
          {noToken ? (
            <div className="text-center" data-testid="reset-no-token">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">
                Link inválido
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                O link de recuperação está incompleto ou ausente.
              </p>
              <Button asChild variant="accent" className="mt-6 w-full">
                <Link to="/forgot-password">Pedir novo link</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <KeyRound className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">
                Definir nova senha
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Escolha uma senha forte para proteger sua conta.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="new_password">Nova senha</Label>
                  <Input
                    id="new_password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="reset-password"
                  />
                  <p
                    className={cn(
                      "text-xs",
                      password.length === 0
                        ? "text-muted-foreground"
                        : passwordValid
                          ? "text-success"
                          : "text-amber-600",
                    )}
                  >
                    Mínimo 8 caracteres, com letra e número.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar senha</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    data-testid="reset-confirm"
                  />
                </div>

                {error && (
                  <Alert variant="destructive" data-testid="reset-error">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {invalidToken ? (
                  <Button asChild variant="accent" className="w-full">
                    <Link to="/forgot-password">Pedir novo link</Link>
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="accent"
                    className="w-full"
                    disabled={loading}
                    data-testid="reset-submit"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" /> Redefinir senha
                      </>
                    )}
                  </Button>
                )}
              </form>

              <Link
                to="/login"
                className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Voltar ao login
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
