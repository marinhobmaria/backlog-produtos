import { useState, useEffect } from "react";
import {
  Config,
  ConnectionStatus,
  SyncMetrics,
  LogEntry,
  SyncItem,
  DailySync,
  StatusMapping,
} from "@/types";

// Default status mappings
const defaultStatusMappings: StatusMapping[] = [
  { clickup: "PRD - TRIAGEM", glpi: "Novo", glpiCode: 1 },
  { clickup: "PRD - FILA", glpi: "Em análise", glpiCode: 2 },
  { clickup: "PRD - EM ANDAMENTO", glpi: "Em andamento", glpiCode: 3 },
  { clickup: "PRD - REVISÃO", glpi: "Em revisão", glpiCode: 4 },
  { clickup: "PRD - PARADO", glpi: "Aguardando dependência", glpiCode: 5 },
  { clickup: "PRD - PRONTA", glpi: "Resolvido", glpiCode: 6 },
];

// Default config
const defaultConfig: Config = {
  glpi: {
    url: "",
    appToken: "",
    userToken: "",
  },
  clickup: {
    apiKey: "",
    teamId: "",
  },
  mappings: {
    status: defaultStatusMappings,
  },
};

// Sample data generators
const generateSampleLogs = (): LogEntry[] => {
  const operations: LogEntry["operation"][] = ["create", "update", "sync", "webhook"];
  const levels: LogEntry["level"][] = ["info", "warning", "error"];
  const messages = [
    "Ticket sincronizado com sucesso",
    "Status atualizado: PRD - FILA → Em análise",
    "Novo item criado no GLPI",
    "Webhook recebido do ClickUp",
    "Falha na conexão - retry em 5s",
    "Campo personalizado atualizado",
    "Conexão reestabelecida",
  ];

  return Array.from({ length: 15 }, (_, i) => ({
    id: `log-${i}`,
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 3),
    level: levels[Math.floor(Math.random() * levels.length)],
    operation: operations[Math.floor(Math.random() * operations.length)],
    clickupId: Math.random() > 0.3 ? `CU${Math.random().toString(36).slice(2, 10)}` : undefined,
    glpiId: Math.random() > 0.3 ? Math.floor(Math.random() * 10000) : undefined,
    message: messages[Math.floor(Math.random() * messages.length)],
  })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const generateSampleQueue = (): SyncItem[] => {
  const statuses: SyncItem["status"][] = ["pending", "processing", "success", "error"];
  const names = [
    "Implementar login social",
    "Corrigir bug de validação",
    "Atualizar dashboard de métricas",
    "Revisar permissões de usuário",
    "Configurar backup automático",
  ];

  return Array.from({ length: 5 }, (_, i) => ({
    id: `sync-${i}`,
    clickupId: `CU${Math.random().toString(36).slice(2, 10)}`,
    glpiId: Math.random() > 0.5 ? Math.floor(Math.random() * 10000) : undefined,
    type: Math.random() > 0.5 ? "create" : "update",
    status: statuses[Math.floor(Math.random() * statuses.length)],
    attempts: Math.floor(Math.random() * 3),
    data: {
      name: names[i],
      content: "Descrição do item...",
      status: "PRD - FILA",
      priority: "medium",
      customFields: {},
    },
    error: Math.random() > 0.7 ? "Timeout na conexão com GLPI" : undefined,
    createdAt: new Date(Date.now() - Math.random() * 3600000),
  }));
};

const generateDailyData = (): DailySync[] => {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  return days.map((day) => ({
    date: day,
    success: Math.floor(Math.random() * 50) + 10,
    error: Math.floor(Math.random() * 5),
  }));
};

export function useSyncData() {
  const [config, setConfig] = useState<Config>(() => {
    const saved = localStorage.getItem("synchub-config");
    return saved ? JSON.parse(saved) : defaultConfig;
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    clickup: { connected: true, lastCheck: new Date() },
    glpi: { connected: true, lastCheck: new Date() },
  });

  const [metrics] = useState<SyncMetrics>({
    totalToday: 47,
    totalWeek: 312,
    totalMonth: 1284,
    pendingQueue: 3,
    successRate: 96.8,
    lastError: "Timeout em conexão GLPI",
    lastErrorTime: new Date(Date.now() - 3600000),
  });

  const [logs] = useState<LogEntry[]>(generateSampleLogs);
  const [queue] = useState<SyncItem[]>(generateSampleQueue);
  const [dailyData] = useState<DailySync[]>(generateDailyData);
  const [statusMappings] = useState<StatusMapping[]>(defaultStatusMappings);

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem("synchub-config", JSON.stringify(config));
  }, [config]);

  // Simulate connection status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionStatus((prev) => ({
        clickup: { ...prev.clickup, lastCheck: new Date() },
        glpi: { ...prev.glpi, lastCheck: new Date() },
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRetry = (id: string) => {
    console.log("Retrying sync item:", id);
    // Implement retry logic
  };

  return {
    config,
    setConfig,
    connectionStatus,
    metrics,
    logs,
    queue,
    dailyData,
    statusMappings,
    handleRetry,
  };
}
