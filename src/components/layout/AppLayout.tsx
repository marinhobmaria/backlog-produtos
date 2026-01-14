import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ClipboardList, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  User,
  RefreshCw,
  Clock,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: Date | null;
}

export function AppLayout({ children, onRefresh, isRefreshing, lastUpdated }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return "Nunca";
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Backlog", href: "/backlog", icon: ClipboardList },
    { label: "Configurações", href: "/configuracoes", icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-bold text-foreground">Backlog</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link key={item.href} to={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-9",
                        isActive && "bg-muted text-primary font-medium"
                      )}
                    >
                      <item.icon className="h-4 w-4 mr-1.5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Last Updated */}
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Atualizado: {formatLastUpdated(lastUpdated ?? null)}</span>
            </div>

            {/* Refresh Button */}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-8"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="hidden sm:inline ml-1.5">Atualizar</span>
              </Button>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="hidden sm:inline text-sm max-w-[150px] truncate">
                    {user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Usuário ativo</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden border-t border-border">
          <nav className="container mx-auto flex items-center justify-around px-4 py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "flex-col h-auto py-2 gap-0.5",
                      isActive && "bg-muted text-primary"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px]">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
