import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Server
} from "lucide-react";

interface GlpiConfig {
  url: string;
  appToken: string;
  userToken: string;
}

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
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("light");
    // Load saved config from localStorage
    const savedConfig = localStorage.getItem("glpi-config");
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("glpi-config", JSON.stringify(config));
    setLastUpdated(new Date());
    toast({
      title: "Configurações salvas",
      description: "As configurações foram salvas localmente.",
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("glpi-tickets");

      if (error) {
        setTestResult("error");
        toast({
          title: "Falha na conexão",
          description: error.message,
          variant: "destructive",
        });
      } else if (data?.success) {
        setTestResult("success");
        setLastUpdated(new Date());
        toast({
          title: "Conexão bem-sucedida",
          description: `${data.data?.length || 0} tickets encontrados`,
        });
      } else {
        setTestResult("error");
        toast({
          title: "Falha na conexão",
          description: data?.error || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (err) {
      setTestResult("error");
      toast({
        title: "Erro",
        description: "Não foi possível testar a conexão",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRefresh = () => {
    handleTestConnection();
  };

  return (
    <AppLayout onRefresh={handleRefresh} isRefreshing={isTesting} lastUpdated={lastUpdated}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Configure as credenciais de acesso ao GLPI
          </p>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Conexão GLPI</CardTitle>
                  <CardDescription>
                    Credenciais para acessar a API do GLPI
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {testResult === "success" ? (
                  <Badge className="bg-green-500 hover:bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : testResult === "error" ? (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Erro na conexão
                  </Badge>
                ) : (
                  <Badge variant="secondary">Não testado</Badge>
                )}
              </div>

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
                  Token da aplicação configurado no GLPI
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
                  Token do usuário (Preferências → Acesso Remoto)
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
                <p className="text-xs text-muted-foreground">
                  <strong>Nota:</strong> Os tokens de acesso são configurados nos secrets do sistema. 
                  Para alterar as credenciais de produção, entre em contato com o administrador.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Configuracoes;
