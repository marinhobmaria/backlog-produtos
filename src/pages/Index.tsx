import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSyncData } from "@/hooks/useSyncData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRightLeft, 
  ClipboardList, 
  BarChart3, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Clock,
  Loader2
} from "lucide-react";

interface SyncHistoryItem {
  id: string;
  timestamp: Date;
  success: boolean;
  message: string;
  ticketsCount?: number;
}

const Index = () => {
  const { config, setConfig, connectionStatus } = useSyncData();
  const [glpiConnected, setGlpiConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);

  // Enable light mode by default
  useEffect(() => {
    document.documentElement.classList.add("light");
  }, []);

  const testGlpiConnection = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('glpi-tickets');
      
      const now = new Date();
      setLastCheck(now);
      
      if (error) {
        setGlpiConnected(false);
        setSyncHistory(prev => [{
          id: crypto.randomUUID(),
          timestamp: now,
          success: false,
          message: error.message || "Erro na conexão"
        }, ...prev.slice(0, 9)]);
        toast({
          title: "Erro de conexão",
          description: error.message,
          variant: "destructive"
        });
      } else if (data?.success) {
        setGlpiConnected(true);
        setSyncHistory(prev => [{
          id: crypto.randomUUID(),
          timestamp: now,
          success: true,
          message: "Conexão bem-sucedida",
          ticketsCount: data.data?.length || 0
        }, ...prev.slice(0, 9)]);
        toast({
          title: "Conexão estabelecida",
          description: `${data.data?.length || 0} tickets encontrados`
        });
      } else {
        setGlpiConnected(false);
        setSyncHistory(prev => [{
          id: crypto.randomUUID(),
          timestamp: now,
          success: false,
          message: data?.error || "Erro desconhecido"
        }, ...prev.slice(0, 9)]);
        toast({
          title: "Falha na conexão",
          description: data?.error,
          variant: "destructive"
        });
      }
    } catch (err) {
      setGlpiConnected(false);
      const now = new Date();
      setLastCheck(now);
      setSyncHistory(prev => [{
        id: crypto.randomUUID(),
        timestamp: now,
        success: false,
        message: "Erro inesperado"
      }, ...prev.slice(0, 9)]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                <span className="text-primary">Sync</span>
                <span className="text-foreground">Hub</span>
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">
                GLPI ↔ ClickUp Integration
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Painel Principal</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie a sincronização entre ClickUp e GLPI
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Link to="/backlog">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <ClipboardList className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Backlog</CardTitle>
                  <p className="text-sm text-muted-foreground">Gerenciar tickets GLPI</p>
                </div>
              </CardHeader>
            </Card>
          </Link>
          
          <Link to="/dashboard-executivo">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <BarChart3 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Indicadores</CardTitle>
                  <p className="text-sm text-muted-foreground">Dashboard executivo</p>
                </div>
              </CardHeader>
            </Card>
          </Link>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group opacity-60">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                <Settings className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Configurações</CardTitle>
                <p className="text-sm text-muted-foreground">Em breve</p>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* GLPI Sync Status */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Status de Sincronização GLPI
                </CardTitle>
                <Button 
                  onClick={testGlpiConnection} 
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  {glpiConnected === null ? (
                    <Badge variant="secondary">Não verificado</Badge>
                  ) : glpiConnected ? (
                    <Badge className="bg-green-500 hover:bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Desconectado
                    </Badge>
                  )}
                </div>
                {lastCheck && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Última verificação: {formatTime(lastCheck)}
                  </span>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                Clique em "Atualizar" para testar a conexão com o GLPI e sincronizar os tickets.
              </p>
            </CardContent>
          </Card>

          {/* Sync History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico de Sincronização
              </CardTitle>
            </CardHeader>
            <CardContent>
              {syncHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma sincronização realizada ainda
                </p>
              ) : (
                <div className="space-y-3 max-h-[250px] overflow-y-auto">
                  {syncHistory.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {item.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{item.message}</p>
                          {item.ticketsCount !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              {item.ticketsCount} tickets
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12 py-6">
        <div className="container mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
          <p>SyncHub v1.0.0 • Integração GLPI ↔ ClickUp</p>
          <p>Última atualização: {lastCheck ? formatTime(lastCheck) : 'N/A'}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
