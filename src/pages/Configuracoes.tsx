import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Eye, 
  EyeOff, 
  Save, 
  TestTube2, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Server,
  AlertTriangle,
  Clock,
  RefreshCw
} from "lucide-react";

interface GlpiConfig {
  url: string;
  appToken: string;
  userToken: string;
}

interface ConnectionResult {
  status: "success" | "error" | null;
  message: string;
  details?: string;
  ticketsCount?: number;
  timestamp?: Date;
}

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

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

  useEffect(() => {
    document.documentElement.classList.add("light");
    // Load saved config from localStorage
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
        // Parse error details
        let errorMessage = error.message;
        let errorDetails = "";

        try {
          // Try to extract more details from the error
          if (error.message.includes("401")) {
            errorDetails = "Erro de autenticação (HTTP 401). Verifique se os tokens estão corretos.";
          } else if (error.message.includes("404")) {
            errorDetails = "Endpoint não encontrado (HTTP 404). Verifique a URL do GLPI.";
          } else if (error.message.includes("500")) {
            errorDetails = "Erro interno do servidor GLPI (HTTP 500).";
          }
        } catch {
          // Keep original message
        }

        setConnectionResult({
          status: "error",
          message: "Falha na conexão com GLPI",
          details: errorDetails || errorMessage,
          timestamp: now,
        });
        toast({
          title: "Falha na conexão",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (data?.success) {
        setConnectionResult({
          status: "success",
          message: "Conexão estabelecida com sucesso",
          ticketsCount: data.data?.length || 0,
          timestamp: now,
        });
        toast({
          title: "Conexão bem-sucedida",
          description: `${data.data?.length || 0} tickets encontrados`,
        });
      } else {
        // Parse the error from GLPI
        let errorMessage = data?.error || "Erro desconhecido";
        let errorDetails = "";

        // Common GLPI errors
        if (errorMessage.includes("ERROR_GLPI_LOGIN_USER_TOKEN") || errorMessage.includes("user_token")) {
          errorDetails = "O User Token está inválido ou expirado. Gere um novo token em: GLPI → Preferências → Acesso Remoto → Regenerar Token de API.";
        } else if (errorMessage.includes("ERROR_GLPI_LOGIN") || errorMessage.includes("App-Token")) {
          errorDetails = "O App Token está inválido. Verifique em: GLPI → Configurar → Geral → API → Clientes de API.";
        } else if (errorMessage.includes("ERROR_NOT_ALLOWED_IP")) {
          errorDetails = "O IP do servidor não está autorizado. Adicione o IP nas configurações da API do GLPI.";
        } else if (errorMessage.includes("ERROR_API_DISABLED")) {
          errorDetails = "A API do GLPI está desabilitada. Habilite em: Configurar → Geral → API.";
        }

        setConnectionResult({
          status: "error",
          message: "Erro na autenticação GLPI",
          details: errorDetails || errorMessage,
          timestamp: now,
        });
        toast({
          title: "Falha na conexão",
          description: "Verifique os detalhes do erro",
          variant: "destructive",
        });
      }
    } catch (err) {
      const now = new Date();
      setLastUpdated(now);
      setNextAutoRefresh(new Date(now.getTime() + AUTO_REFRESH_INTERVAL));
      
      setConnectionResult({
        status: "error",
        message: "Erro de rede",
        details: "Não foi possível conectar ao servidor. Verifique sua conexão com a internet.",
        timestamp: now,
      });
      toast({
        title: "Erro",
        description: "Não foi possível testar a conexão",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      handleTestConnection();
    }, AUTO_REFRESH_INTERVAL);

    // Set initial next refresh time
    setNextAutoRefresh(new Date(Date.now() + AUTO_REFRESH_INTERVAL));

    return () => clearInterval(interval);
  }, [handleTestConnection]);

  // Update countdown every second
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
      title: "Configurações salvas",
      description: "As configurações foram salvas localmente.",
    });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <AppLayout onRefresh={handleTestConnection} isRefreshing={isTesting} lastUpdated={lastUpdated}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Configure as credenciais de acesso ao GLPI
          </p>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Connection Status Card */}
          <Card className={connectionResult.status === "error" ? "border-destructive/50" : connectionResult.status === "success" ? "border-green-500/50" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    connectionResult.status === "success" 
                      ? "bg-green-500/10" 
                      : connectionResult.status === "error" 
                        ? "bg-destructive/10" 
                        : "bg-primary/10"
                  }`}>
                    {connectionResult.status === "success" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : connectionResult.status === "error" ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Server className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <CardTitle>Status da Conexão</CardTitle>
                    <CardDescription>
                      Atualização automática a cada 5 minutos
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {connectionResult.status === "success" ? (
                    <Badge className="bg-green-500 hover:bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : connectionResult.status === "error" ? (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Erro
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Não testado</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auto-refresh info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  <span>Próxima atualização automática em: <strong>{timeUntilRefresh}</strong></span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="h-7"
                >
                  {isTesting ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Forçar Atualização
                </Button>
              </div>

              {/* Last check info */}
              {connectionResult.timestamp && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Última verificação: {formatDateTime(connectionResult.timestamp)}</span>
                </div>
              )}

              {/* Success details */}
              {connectionResult.status === "success" && (
                <Alert className="border-green-500/50 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-700">Conexão Ativa</AlertTitle>
                  <AlertDescription className="text-green-600">
                    {connectionResult.message}
                    {connectionResult.ticketsCount !== undefined && (
                      <span className="block mt-1">
                        <strong>{connectionResult.ticketsCount}</strong> tickets encontrados no GLPI
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Error details */}
              {connectionResult.status === "error" && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Falha na Conexão</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p><strong>Erro:</strong> {connectionResult.message}</p>
                    {connectionResult.details && (
                      <div className="mt-2 p-3 bg-destructive/10 rounded-md text-sm">
                        <p className="font-medium mb-1">Detalhes:</p>
                        <p>{connectionResult.details}</p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Configuração GLPI</CardTitle>
                  <CardDescription>
                    Credenciais para acessar a API do GLPI
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="glpi-url">URL do GLPI</Label>
                <Input
                  id="glpi-url"
                  type="url"
                  placeholder="https://suporte.exemplo.com"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  URL base da sua instância GLPI (sem /apirest.php)
                </p>
              </div>

              {/* App Token */}
              <div className="space-y-2">
                <Label htmlFor="app-token">App Token</Label>
                <div className="relative">
                  <Input
                    id="app-token"
                    type={showTokens.appToken ? "text" : "password"}
                    placeholder="••••••••••••••••••••"
                    value={config.appToken}
                    onChange={(e) => setConfig({ ...config, appToken: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() =>
                      setShowTokens({ ...showTokens, appToken: !showTokens.appToken })
                    }
                  >
                    {showTokens.appToken ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Token da aplicação: GLPI → Configurar → Geral → API → Clientes de API
                </p>
              </div>

              {/* User Token */}
              <div className="space-y-2">
                <Label htmlFor="user-token">User Token</Label>
                <div className="relative">
                  <Input
                    id="user-token"
                    type={showTokens.userToken ? "text" : "password"}
                    placeholder="••••••••••••••••••••"
                    value={config.userToken}
                    onChange={(e) => setConfig({ ...config, userToken: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() =>
                      setShowTokens({ ...showTokens, userToken: !showTokens.userToken })
                    }
                  >
                    {showTokens.userToken ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Token do usuário: GLPI → Preferências → Acesso Remoto → Token de API
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleTestConnection} variant="outline" disabled={isTesting}>
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube2 className="h-4 w-4 mr-2" />
                  )}
                  Testar Conexão
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>

              <div className="pt-4 border-t">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Importante</AlertTitle>
                  <AlertDescription>
                    Os tokens de produção estão configurados nos secrets do sistema. 
                    Para alterar as credenciais de produção, entre em contato com o administrador 
                    ou atualize os secrets: GLPI_API_URL, GLPI_APP_TOKEN e GLPI_USER_TOKEN.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Configuracoes;
