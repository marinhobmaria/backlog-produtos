import { useEffect } from "react";
import { Header } from "@/components/Header";
import { MetricCard } from "@/components/MetricCard";
import { SyncChart } from "@/components/SyncChart";
import { ActivityLog } from "@/components/ActivityLog";
import { StatusMappingTable } from "@/components/StatusMappingTable";
import { SyncQueue } from "@/components/SyncQueue";
import { useSyncData } from "@/hooks/useSyncData";
import {
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

const Index = () => {
  const {
    config,
    setConfig,
    connectionStatus,
    metrics,
    logs,
    queue,
    dailyData,
    statusMappings,
    handleRetry,
  } = useSyncData();

  // Enable light mode by default
  useEffect(() => {
    document.documentElement.classList.add("light");
  }, []);

  return (
    <div className="min-h-screen bg-background">

      <Header
        connectionStatus={connectionStatus}
        config={config}
        onConfigSave={setConfig}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Monitore a sincronização entre ClickUp e GLPI em tempo real
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <MetricCard
            title="Sincronizações Hoje"
            value={metrics.totalToday}
            subtitle="vs. 42 ontem"
            icon={ArrowRightLeft}
            trend={{ value: 12, isPositive: true }}
          />
          <MetricCard
            title="Taxa de Sucesso"
            value={`${metrics.successRate}%`}
            subtitle="Últimos 7 dias"
            icon={CheckCircle2}
            variant="success"
          />
          <MetricCard
            title="Em Fila"
            value={metrics.pendingQueue}
            subtitle="Aguardando processamento"
            icon={Clock}
            variant={metrics.pendingQueue > 5 ? "warning" : "default"}
          />
          <MetricCard
            title="Total do Mês"
            value={metrics.totalMonth.toLocaleString("pt-BR")}
            subtitle="1.100 no mês anterior"
            icon={TrendingUp}
            trend={{ value: 16.7, isPositive: true }}
          />
        </div>

        {/* Charts and Activity Row */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <SyncChart data={dailyData} />
          <ActivityLog logs={logs} />
        </div>

        {/* Queue and Mappings Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <SyncQueue items={queue} onRetry={handleRetry} />
          <StatusMappingTable mappings={statusMappings} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12 py-6">
        <div className="container mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
          <p>SyncHub v1.0.0 • Integração GLPI ↔ ClickUp</p>
          <p>Última atualização: há 30 segundos</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
