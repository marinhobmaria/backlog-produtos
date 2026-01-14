import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Eye, 
  EyeOff, 
  Save, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Clock,
  RefreshCw,
  ChevronDown,
  Copy,
  Server
} from "lucide-react";

interface GlpiConfig {
  url: string;
  appToken: string;
  userToken: string;
}

interface ConnectionResult {
  status: "success" | "error" | null;
  message: string;
  apiResponse?: string;
  ticketsCount?: number;
  timestamp?: Date;
}

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

const Configuracoes = () => {
  const [config, setConfig] = useState<GlpiConfig>({
    url: "",
    appToken: "",
    userToken: "",
  });
  const [showTokens, setShowTokens] = useState({
    appToken: false,
    userToken: false,
  });
  const [isTesting, setIsTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionResult>({
    status: null,
    message: "",
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextAutoRefresh, setNextAutoRefresh] = useState<Date | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("light");
    const savedConfig = localStorage.getItem("glpi-config");
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setConnectionResult({ status: null, message: "" });

    try {
      const { data, error } = await supabase.functions.invoke("glpi-tickets");
      const now = new Date();
      setLastUpdated(now);
      setNextAutoRefresh(new Date(now.getTime() + AUTO_REFRESH_INTERVAL));

      if (error) {
        setConnectionResult({
          status: "error",
          message: "Erro na requisição",
          apiResponse: JSON.stringify(error, null, 2),
          timestamp: now,
        });
      } else if (data?.success) {
        setConnectionResult({
          status: "success",
          message: `${data.total || 0} tickets sincronizados`,
          ticketsCount: data.total || 0,
          apiResponse: JSON.stringify(data, null, 2),
          timestamp: now,
        });
        toast({
          title: "Conexão OK",
          description: `${data.total || 0} tickets encontrados`,
        });
      } else {
        setConnectionResult({
          status: "error",
          message: data?.error || "Erro desconhecido",
          apiResponse: JSON.stringify(data, null, 2),
          timestamp: now,
        });
      }
    } catch (err) {
      const now = new Date();
      setLastUpdated(now);
      setNextAutoRefresh(new Date(now.getTime() + AUTO_REFRESH_INTERVAL));
      
      setConnectionResult({
        status: "error",
        message: "Erro de rede",
        apiResponse: err instanceof Error ? err.message : String(err),
        timestamp: now,
      });
    } finally {
      setIsTesting(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      handleTestConnection();
    }, AUTO_REFRESH_INTERVAL);

    setNextAutoRefresh(new Date(Date.now() + AUTO_REFRESH_INTERVAL));

    return () => clearInterval(interval);
  }, [handleTestConnection]);

  const [timeUntilRefresh, setTimeUntilRefresh] = useState<string>("");
  
  useEffect(() => {
    const updateCountdown = () => {
      if (nextAutoRefresh) {
        const diff = nextAutoRefresh.getTime() - Date.now();
        if (diff > 0) {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeUntilRefresh(`${minutes}:${seconds.toString().padStart(2, "0")}`);
        } else {
          setTimeUntilRefresh("0:00");
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextAutoRefresh]);

  const handleSave = () => {
    localStorage.setItem("glpi-config", JSON.stringify(config));
    setLastUpdated(new Date());
    toast({
      title: "Salvo",
      description: "Configurações salvas localmente",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Resposta copiada para área de transferência" });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getErrorSolution = (apiResponse?: string) => {
    if (!apiResponse) return null;
    
    if (apiResponse.includes("ERROR_GLPI_LOGIN_USER_TOKEN") || apiResponse.includes("user_token")) {
      return {
        title: "User Token Inválido",
        solution: "GLPI → Preferências → Acesso Remoto → Regenerar Token de API"
      };
    }
    if (apiResponse.includes("App-Token") || apiResponse.includes("ERROR_GLPI_LOGIN")) {
      return {
        title: "App Token Inválido",
        solution: "GLPI → Configurar → Geral → API → Clientes de API"
      };
    }
    if (apiResponse.includes("ERROR_NOT_ALLOWED_IP")) {
      return {
        title: "IP não autorizado",
        solution: "Adicione o IP do servidor nas configurações da API do GLPI"
      };
    }
    if (apiResponse.includes("ERROR_API_DISABLED")) {
      return {
        title: "API desabilitada",
        solution: "GLPI → Configurar → Geral → API → Habilitar"
      };
    }
    return null;
  };

  const errorSolution = getErrorSolution(connectionResult.apiResponse);

  return (
    <AppLayout onRefresh={handleTestConnection} isRefreshing={isTesting} lastUpdated={lastUpdated}>
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        {/* Status Bar */}
        <div className={`rounded-lg p-3 mb-4 flex items-center justify-between ${
          connectionResult.status === "success" 
            ? "bg-green-50 border border-green-200" 
            : connectionResult.status === "error" 
              ? "bg-red-50 border border-red-200" 
              : "bg-muted/50 border"
        }`}>
          <div className="flex items-center gap-3">
            {connectionResult.status === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : connectionResult.status === "error" ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : (
              <Server className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <span className={`font-medium ${
                connectionResult.status === "success" 
                  ? "text-green-700" 
                  : connectionResult.status === "error" 
                    ? "text-red-700" 
                    : "text-foreground"
              }`}>
                {connectionResult.status === "success" 
                  ? "Conectado" 
                  : connectionResult.status === "error" 
                    ? "Erro" 
                    : "Aguardando teste"}
              </span>
              {connectionResult.message && (
                <span className="text-sm text-muted-foreground ml-2">
                  — {connectionResult.message}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {connectionResult.timestamp && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(connectionResult.timestamp)}
              </span>
            )}
            <Badge variant="outline" className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              {timeUntilRefresh}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="h-7 px-2"
            >
              {isTesting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Config Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Credenciais GLPI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="glpi-url" className="text-xs">URL do GLPI</Label>
                <Input
                  id="glpi-url"
                  type="url"
                  placeholder="https://suporte.exemplo.com"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="app-token" className="text-xs">App Token</Label>
                <div className="relative">
                  <Input
                    id="app-token"
                    type={showTokens.appToken ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={config.appToken}
                    onChange={(e) => setConfig({ ...config, appToken: e.target.value })}
                    className="h-8 text-sm pr-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                    onClick={() => setShowTokens({ ...showTokens, appToken: !showTokens.appToken })}
                  >
                    {showTokens.appToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="user-token" className="text-xs">User Token</Label>
                <div className="relative">
                  <Input
                    id="user-token"
                    type={showTokens.userToken ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={config.userToken}
                    onChange={(e) => setConfig({ ...config, userToken: e.target.value })}
                    className="h-8 text-sm pr-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                    onClick={() => setShowTokens({ ...showTokens, userToken: !showTokens.userToken })}
                  >
                    {showTokens.userToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <Button onClick={handleSave} size="sm" className="w-full mt-2">
                <Save className="h-3 w-3 mr-2" />
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>

          {/* Response Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Resposta da API</CardTitle>
                {connectionResult.apiResponse && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => copyToClipboard(connectionResult.apiResponse || "")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {connectionResult.apiResponse ? (
                <div className="space-y-3">
                  {errorSolution && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs">
                      <p className="font-medium text-amber-800">{errorSolution.title}</p>
                      <p className="text-amber-700 mt-1">→ {errorSolution.solution}</p>
                    </div>
                  )}
                  <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                    <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <ChevronDown className={`h-3 w-3 transition-transform ${isDetailsOpen ? "" : "-rotate-90"}`} />
                      JSON completo
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-48 font-mono">
                        {connectionResult.apiResponse}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Clique em atualizar para testar a conexão
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Help */}
        <Card className="mt-4">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">
              <strong>Dica:</strong> Os tokens são configurados nos secrets do backend. 
              Para alterar, acesse as configurações do projeto e atualize os valores de 
              <code className="mx-1 px-1 bg-muted rounded">GLPI_API_URL</code>, 
              <code className="mx-1 px-1 bg-muted rounded">GLPI_APP_TOKEN</code> e 
              <code className="mx-1 px-1 bg-muted rounded">GLPI_USER_TOKEN</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Configuracoes;
