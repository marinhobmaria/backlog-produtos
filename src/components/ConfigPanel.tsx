import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Config } from "@/types";
import { Settings2, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ConfigPanelProps {
  config: Config;
  onSave: (config: Config) => void;
}

export function ConfigPanel({ config, onSave }: ConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState(config);
  const [showTokens, setShowTokens] = useState({
    glpiApp: false,
    glpiUser: false,
    clickupApi: false,
  });
  const [testing, setTesting] = useState({ glpi: false, clickup: false });
  const [testResults, setTestResults] = useState<{ glpi?: boolean; clickup?: boolean }>({});
  const [open, setOpen] = useState(false);

  const handleTestConnection = async (type: "glpi" | "clickup") => {
    setTesting((prev) => ({ ...prev, [type]: true }));
    
    // Simulated test - replace with actual API calls
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const success = Math.random() > 0.3; // Simulated result
    setTestResults((prev) => ({ ...prev, [type]: success }));
    setTesting((prev) => ({ ...prev, [type]: false }));
    
    if (success) {
      toast.success(`Conexão com ${type === "glpi" ? "GLPI" : "ClickUp"} estabelecida!`);
    } else {
      toast.error(`Falha ao conectar com ${type === "glpi" ? "GLPI" : "ClickUp"}`);
    }
  };

  const handleSave = () => {
    onSave(localConfig);
    toast.success("Configurações salvas com sucesso!");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Configurações
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Configurações da Integração
          </DialogTitle>
          <DialogDescription>
            Configure as credenciais e endpoints para conectar GLPI e ClickUp.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="glpi" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="glpi" className="gap-2">
              GLPI
              {testResults.glpi !== undefined && (
                testResults.glpi ? (
                  <CheckCircle2 className="h-3 w-3 text-success" />
                ) : (
                  <XCircle className="h-3 w-3 text-destructive" />
                )
              )}
            </TabsTrigger>
            <TabsTrigger value="clickup" className="gap-2">
              ClickUp
              {testResults.clickup !== undefined && (
                testResults.clickup ? (
                  <CheckCircle2 className="h-3 w-3 text-success" />
                ) : (
                  <XCircle className="h-3 w-3 text-destructive" />
                )
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="glpi" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="glpi-url">URL da Instância</Label>
              <Input
                id="glpi-url"
                placeholder="https://seu-glpi.com/apirest.php"
                value={localConfig.glpi.url}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    glpi: { ...prev.glpi, url: e.target.value },
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="glpi-app-token">App Token</Label>
              <div className="relative">
                <Input
                  id="glpi-app-token"
                  type={showTokens.glpiApp ? "text" : "password"}
                  placeholder="••••••••••••••••"
                  value={localConfig.glpi.appToken}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      glpi: { ...prev.glpi, appToken: e.target.value },
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowTokens((prev) => ({ ...prev, glpiApp: !prev.glpiApp }))}
                >
                  {showTokens.glpiApp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="glpi-user-token">User Token</Label>
              <div className="relative">
                <Input
                  id="glpi-user-token"
                  type={showTokens.glpiUser ? "text" : "password"}
                  placeholder="••••••••••••••••"
                  value={localConfig.glpi.userToken}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      glpi: { ...prev.glpi, userToken: e.target.value },
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowTokens((prev) => ({ ...prev, glpiUser: !prev.glpiUser }))}
                >
                  {showTokens.glpiUser ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              onClick={() => handleTestConnection("glpi")}
              disabled={testing.glpi}
              variant="secondary"
              className="w-full"
            >
              {testing.glpi ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                "Testar Conexão"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="clickup" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="clickup-api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="clickup-api-key"
                  type={showTokens.clickupApi ? "text" : "password"}
                  placeholder="pk_••••••••••••••••"
                  value={localConfig.clickup.apiKey}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      clickup: { ...prev.clickup, apiKey: e.target.value },
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowTokens((prev) => ({ ...prev, clickupApi: !prev.clickupApi }))}
                >
                  {showTokens.clickupApi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clickup-team-id">Team ID</Label>
              <Input
                id="clickup-team-id"
                placeholder="12345678"
                value={localConfig.clickup.teamId}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    clickup: { ...prev.clickup, teamId: e.target.value },
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value="https://sua-url.com/webhook/clickup"
                  className="bg-muted font-mono text-xs"
                />
                <Button variant="outline" size="sm">
                  Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure este endpoint no ClickUp para receber eventos.
              </p>
            </div>

            <Button
              onClick={() => handleTestConnection("clickup")}
              disabled={testing.clickup}
              variant="secondary"
              className="w-full"
            >
              {testing.clickup ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                "Testar Conexão"
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar Configurações</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
