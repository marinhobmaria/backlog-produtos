import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GlpiTicket {
  id: string;
  glpi_id: number;
  title: string;
  description: string | null;
  status: number;
  priority: number;
  sector: string | null;
  product: string | null;
  client: string | null;
  requester: string | null;
  assigned_to: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  glpi_created_at: string | null;
  glpi_updated_at: string | null;
}

export interface SyncHistory {
  id: string;
  synced_at: string;
  success: boolean;
  tickets_count: number | null;
  error_message: string | null;
  duration_ms: number | null;
}

const statusMap: Record<number, string> = {
  1: 'open',
  2: 'in_progress',
  3: 'in_progress',
  4: 'pending',
  5: 'resolved',
  6: 'closed',
};

const priorityMap: Record<number, string> = {
  1: 'low',
  2: 'low',
  3: 'normal',
  4: 'high',
  5: 'urgent',
  6: 'urgent',
};

export function useGlpiTickets() {
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: ['glpi-tickets'],
    queryFn: async (): Promise<GlpiTicket[]> => {
      const { data, error } = await supabase
        .from('glpi_tickets')
        .select('*')
        .order('glpi_updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const syncHistoryQuery = useQuery({
    queryKey: ['glpi-sync-history'],
    queryFn: async (): Promise<SyncHistory[]> => {
      const { data, error } = await supabase
        .from('glpi_sync_history')
        .select('*')
        .order('synced_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  // Converter tickets do banco para formato do backlog
  const backlogTasks = (ticketsQuery.data || []).map((ticket) => {
    const openedAt = ticket.glpi_created_at ? new Date(ticket.glpi_created_at) : new Date(ticket.created_at);
    const lastUpdatedAt = ticket.glpi_updated_at ? new Date(ticket.glpi_updated_at) : new Date(ticket.updated_at);
    const now = new Date();
    const daysSinceLastAction = Math.floor((now.getTime() - lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24));

    const tags: string[] = [];
    if (daysSinceLastAction > 7) tags.push('stale');
    if (ticket.priority >= 5) tags.push('critical');
    if (daysSinceLastAction > 14) tags.push('attention');

    return {
      id: `GLPI-${ticket.glpi_id}`,
      title: ticket.title,
      status: statusMap[ticket.status] || 'open',
      priority: priorityMap[ticket.priority] || 'normal',
      type: ticket.category || 'incident',
      assignee: ticket.assigned_to || 'Não atribuído',
      squad: 'Suporte',
      client: ticket.client || '',
      sector: ticket.sector || '',
      product: ticket.product || '',
      tags,
      openedAt: openedAt.toISOString(),
      lastUpdatedAt: lastUpdatedAt.toISOString(),
      daysSinceLastAction,
      slaDeadline: ticket.due_date,
      isSlaBreach: daysSinceLastAction > 5,
      content: ticket.description || '',
      history: [],
    };
  });

  const syncTickets = async () => {
    const { data, error } = await supabase.functions.invoke('glpi-tickets');
    if (error) throw error;
    
    // Invalidar queries para recarregar dados
    await queryClient.invalidateQueries({ queryKey: ['glpi-tickets'] });
    await queryClient.invalidateQueries({ queryKey: ['glpi-sync-history'] });
    
    return data;
  };

  return {
    tickets: ticketsQuery.data || [],
    backlogTasks,
    syncHistory: syncHistoryQuery.data || [],
    isLoading: ticketsQuery.isLoading,
    isSyncing: false,
    error: ticketsQuery.error,
    syncTickets,
    refetch: ticketsQuery.refetch,
  };
}
