import { ReactNode, useEffect } from "react";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Package, 
  BarChart3, 
  Settings, 
  LogOut, 
  User,
  RefreshCw,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

  const navItems = [
    { label: "Produtos", href: "/produtos", icon: Package },
    { label: "Indicadores", href: "/dashboard-executivo", icon: BarChart3 },
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
        <div className="w-full flex h-11 items-center justify-between px-3">
          {/* Logo + Nav */}
          <div className="flex items-center gap-4">
            <Link to="/produtos" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <span className="text-base font-bold text-foreground hidden sm:inline">Produtos</span>
            </Link>

            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link key={item.href} to={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 text-xs",
                        isActive && "bg-muted text-primary font-medium"
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5 mr-1" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Last Updated + Refresh */}
            {onRefresh && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="h-8 px-2 gap-1.5"
                  >
                    {isRefreshing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    {lastUpdated && (
                      <span className="text-xs text-muted-foreground hidden md:inline">
                        {format(lastUpdated, "dd/MM HH:mm")}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {lastUpdated 
                    ? `Atualizado em ${format(lastUpdated, "dd/MM/yyyy 'às' HH:mm:ss")}`
                    : "Clique para atualizar"
                  }
                </TooltipContent>
              </Tooltip>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User className="h-3.5 w-3.5" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
