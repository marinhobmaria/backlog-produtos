-- Tabela para armazenar tickets do GLPI
CREATE TABLE public.glpi_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  glpi_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 3,
  sector TEXT,
  product TEXT,
  client TEXT,
  requester TEXT,
  assigned_to TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,
  glpi_created_at TIMESTAMP WITH TIME ZONE,
  glpi_updated_at TIMESTAMP WITH TIME ZONE
);

-- Índices para consultas frequentes
CREATE INDEX idx_glpi_tickets_status ON public.glpi_tickets(status);
CREATE INDEX idx_glpi_tickets_sector ON public.glpi_tickets(sector);
CREATE INDEX idx_glpi_tickets_product ON public.glpi_tickets(product);
CREATE INDEX idx_glpi_tickets_client ON public.glpi_tickets(client);
CREATE INDEX idx_glpi_tickets_glpi_id ON public.glpi_tickets(glpi_id);

-- Enable RLS (permitir leitura pública pois é dashboard interno)
ALTER TABLE public.glpi_tickets ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (dashboard interno)
CREATE POLICY "Tickets são visíveis para todos" 
ON public.glpi_tickets 
FOR SELECT 
USING (true);

-- Política para insert/update via service role (edge function)
CREATE POLICY "Service role pode gerenciar tickets" 
ON public.glpi_tickets 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_glpi_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_glpi_tickets_updated_at
BEFORE UPDATE ON public.glpi_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_glpi_tickets_updated_at();

-- Tabela para histórico de sincronizações
CREATE TABLE public.glpi_sync_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT true,
  tickets_count INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER
);

ALTER TABLE public.glpi_sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Histórico visível para todos" 
ON public.glpi_sync_history 
FOR SELECT 
USING (true);

CREATE POLICY "Service role pode inserir histórico" 
ON public.glpi_sync_history 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');