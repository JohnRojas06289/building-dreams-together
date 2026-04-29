import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { authStore } from "@/lib/auth-store";
import { LogOut, UserCircle } from "lucide-react";

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await authStore.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground" }}
          >
            Inicio
          </Link>
          <Link
            to="/como-funciona"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Cómo funciona
          </Link>
          <Link
            to="/impacto"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Impacto
          </Link>
          {user && (
            <Link
              to="/agente"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              Agente IA
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="icon" aria-label="Mi perfil">
                <Link to="/perfil"><UserCircle className="h-4 w-4" /></Link>
              </Button>
              <Button onClick={signOut} variant="ghost" size="icon" aria-label="Cerrar sesión">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Ingresar</Link>
              </Button>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
                <Link to="/auth">Empezar</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
