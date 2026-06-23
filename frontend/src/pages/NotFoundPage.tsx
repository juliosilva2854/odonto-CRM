import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Erro 404
        </p>
        <h1 className="mt-2 text-5xl font-semibold">Página não encontrada.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          O recurso que você procura pode ter sido movido ou ainda não existe.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Voltar ao painel</Link>
        </Button>
      </div>
    </div>
  );
}
