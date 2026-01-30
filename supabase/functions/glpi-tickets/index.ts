import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client com service role para bypass RLS
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface GLPITicket {
  id: number;
  name: string;
  content: string;
  status: number;
  priority: number;
  urgency: number;
  type: number;
  date: string;
  date_mod: string;
  users_id_recipient: number;
  entities_id: number;
  itilcategories_id: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GLPI_URL = Deno.env.get('GLPI_API_URL');
    const APP_TOKEN = Deno.env.get('GLPI_APP_TOKEN');
    const USER_TOKEN = Deno.env.get('GLPI_USER_TOKEN');

    if (!GLPI_URL || !APP_TOKEN || !USER_TOKEN) {
      throw new Error('Missing GLPI configuration');
    }

    const baseUrl = GLPI_URL.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/apirest.php`;

    console.log('Iniciando sessão no GLPI...');

    // Iniciar sessão no GLPI
    const sessionResponse = await fetch(`${apiUrl}/initSession`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'App-Token': APP_TOKEN,
        'Authorization': `user_token ${USER_TOKEN}`,
      },
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error('Erro ao iniciar sessão:', errorText);
      throw new Error(`Failed to init GLPI session: ${sessionResponse.status} - ${errorText}`);
    }

    const sessionData = await sessionResponse.json();
    const sessionToken = sessionData.session_token;
    console.log('Sessão iniciada com sucesso');

    // Buscar tickets
    console.log('Buscando tickets...');
    const ticketsResponse = await fetch(`${apiUrl}/Ticket?expand_dropdowns=true&range=0-200&order=DESC&sort=date`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'App-Token': APP_TOKEN,
        'Session-Token': sessionToken,
      },
    });

    if (!ticketsResponse.ok) {
      const errorText = await ticketsResponse.text();
      console.error('Erro ao buscar tickets:', errorText);
      throw new Error(`Failed to fetch tickets: ${ticketsResponse.status}`);
    }

    const tickets: GLPITicket[] = await ticketsResponse.json();
    console.log(`${tickets.length} tickets encontrados`);

    // Buscar histórico/followups dos primeiros 50 tickets (para performance)
    const ticketsWithHistory = await Promise.all(
      tickets.slice(0, 50).map(async (ticket) => {
        try {
          // Buscar ITILFollowups (acompanhamentos)
          const followupsResponse = await fetch(
            `${apiUrl}/Ticket/${ticket.id}/ITILFollowup?expand_dropdowns=true`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'App-Token': APP_TOKEN,
                'Session-Token': sessionToken,
              },
            }
          );

          let followups: Array<{
            id: number;
            content: string;
            date: string;
            users_id: number | string;
          }> = [];

          if (followupsResponse.ok) {
            followups = await followupsResponse.json();
          }

          return {
            ...ticket,
            followups,
          };
        } catch {
          return { ...ticket, followups: [] };
        }
      })
    );

    // Adicionar tickets restantes sem histórico detalhado
    const remainingTickets = tickets.slice(50).map((ticket) => ({
      ...ticket,
      followups: [],
    }));

    const allTicketsWithHistory = [...ticketsWithHistory, ...remainingTickets];

    // Encerrar sessão
    await fetch(`${apiUrl}/killSession`, {
      method: 'GET',
      headers: {
        'App-Token': APP_TOKEN,
        'Session-Token': sessionToken,
      },
    });
    console.log('Sessão encerrada');

    // Mapear status do GLPI para o sistema
    const statusMap: Record<number, string> = {
      1: 'open',         // Novo
      2: 'in_progress',  // Em análise (atribuído)
      3: 'in_progress',  // Em andamento (planejado)
      4: 'pending',      // Aguardando
      5: 'resolved',     // Resolvido
      6: 'closed',       // Fechado
    };

    // Mapear prioridade do GLPI
    const priorityMap: Record<number, string> = {
      1: 'low',      // Muito baixa
      2: 'low',      // Baixa
      3: 'normal',   // Média
      4: 'high',     // Alta
      5: 'urgent',   // Muito alta
      6: 'urgent',   // Crítica
    };

    // Mapear tipo do GLPI
    const typeMap: Record<number, string> = {
      1: 'incident',  // Incidente
      2: 'request',   // Requisição
    };

    // Função para extrair setor e produto do nome/conteúdo do ticket
    const extractSectorAndProduct = (name: string, content: string, category: string | number) => {
      let sector = 'TI';
      let product = '';
      
      // PRIORIDADE 1: Categoria do GLPI no formato "Setor | Produto"
      if (typeof category === 'string' && category.includes('|')) {
        const parts = category.split('|').map(p => p.trim());
        if (parts.length >= 2) {
          sector = parts[0] || sector;
          product = parts[1] || product;
          console.log(`Extraído da categoria: Setor="${sector}", Produto="${product}"`);
          return { sector, product };
        }
      }
      
      // PRIORIDADE 2: Outros separadores comuns (>, /, -)
      if (typeof category === 'string') {
        const separators = ['>', '/', ' - '];
        for (const sep of separators) {
          if (category.includes(sep)) {
            const parts = category.split(sep).map(p => p.trim());
            if (parts.length >= 2) {
              sector = parts[0] || sector;
              product = parts[1] || product;
              console.log(`Extraído da categoria (${sep}): Setor="${sector}", Produto="${product}"`);
              return { sector, product };
            }
          }
        }
        
        // Se categoria é só uma string simples, usar como setor
        if (category.trim()) {
          sector = category.trim();
        }
      }
      
      // PRIORIDADE 3: Fallback - tentar extrair do texto do ticket
      const text = `${name} ${content}`.toLowerCase();
      
      const sectorPatterns: Record<string, string[]> = {
        'Produtos': ['produtos', 'produto', 'desenvolvimento', 'dev'],
        'Suporte': ['suporte', 'atendimento', 'helpdesk'],
        'Infraestrutura': ['infra', 'infraestrutura', 'servidores', 'rede'],
        'Comercial': ['comercial', 'vendas', 'contrato'],
        'Financeiro': ['financeiro', 'cobrança', 'pagamento'],
        'Implantação': ['implantação', 'implantacao', 'deploy'],
      };
      
      const productPatterns: Record<string, string[]> = {
        'Saúde Simples': ['saúde simples', 'saude simples', 'saudesimples', 'ss'],
        'OM30': ['om30', 'om 30'],
        'e-SUS': ['e-sus', 'esus', 'e sus', 'esus ab'],
        'Gestão': ['gestão', 'gestao'],
        'Prontuário': ['prontuário', 'prontuario', 'pep'],
        'Faturamento': ['faturamento', 'fat'],
        'Estoque': ['estoque', 'almoxarifado'],
        'Farmácia': ['farmácia', 'farmacia'],
        'Laboratório': ['laboratório', 'laboratorio', 'lab'],
        'Agendamento': ['agendamento', 'agenda'],
        'Regulação': ['regulação', 'regulacao'],
        'AIH': ['aih', 'internação', 'internacao'],
        'Vacina': ['vacina', 'imunização', 'imunizacao'],
      };
      
      // Tentar extrair setor do texto
      for (const [sectorName, patterns] of Object.entries(sectorPatterns)) {
        if (patterns.some(p => text.includes(p))) {
          sector = sectorName;
          break;
        }
      }
      
      // Tentar extrair produto do texto
      for (const [productName, patterns] of Object.entries(productPatterns)) {
        if (patterns.some(p => text.includes(p))) {
          product = productName;
          break;
        }
      }
      
      return { sector, product };
    };

    // Função para decodificar entidades HTML numéricas e nomeadas
    const decodeHtmlEntities = (text: string): string => {
      if (!text) return '';
      
      // Decodificar entidades numéricas (&#60; -> <, &#62; -> >, etc.)
      let decoded = text.replace(/&#(\d+);/g, (match, dec) => {
        return String.fromCharCode(parseInt(dec, 10));
      });
      
      // Decodificar entidades hexadecimais (&#x3C; -> <, etc.)
      decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      
      // Decodificar entidades nomeadas comuns
      const namedEntities: Record<string, string> = {
        '&nbsp;': ' ',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&copy;': String.fromCharCode(169),
        '&reg;': String.fromCharCode(174),
        '&trade;': String.fromCharCode(8482),
        '&mdash;': String.fromCharCode(8212),
        '&ndash;': String.fromCharCode(8211),
        '&lsquo;': String.fromCharCode(8216),
        '&rsquo;': String.fromCharCode(8217),
        '&ldquo;': String.fromCharCode(8220),
        '&rdquo;': String.fromCharCode(8221),
        '&hellip;': String.fromCharCode(8230),
      };
      
      for (const [entity, char] of Object.entries(namedEntities)) {
        decoded = decoded.replace(new RegExp(entity, 'g'), char);
      }
      
      return decoded;
    };

    // Função para extrair conteúdo limpo da descrição
    const extractCleanDescription = (content: string): string => {
      if (!content) return '';
      
      // Primeiro decodificar todas as entidades HTML
      let cleanContent = decodeHtmlEntities(content);
      
      // Procurar por "Descrição :" ou "7) Descrição :" e pegar o conteúdo após
      const descriptionMatch = cleanContent.match(/(?:\d+\)\s*)?Descri[çc][ãa]o\s*:\s*(?:<\/b>)?\s*([\s\S]*)/i);
      if (descriptionMatch) {
        cleanContent = descriptionMatch[1];
      }
      
      // Remover tags HTML
      cleanContent = cleanContent.replace(/<[^>]*>/g, '');
      
      // Limpar espaços múltiplos e quebras de linha excessivas
      cleanContent = cleanContent
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
      
      // Remover qualquer texto após "Anexo :" pois é metadado
      const anexoIndex = cleanContent.indexOf('Anexo :');
      if (anexoIndex > 0) {
        cleanContent = cleanContent.substring(0, anexoIndex).trim();
      }
      
      return cleanContent;
    };

    // Função para parsear título e extrair campos estruturados
    // Formato: "Setor | Produto - [Cliente] ... - Título Limpo"
    const parseTicketTitle = (name: string): { cleanTitle: string; sector: string; product: string; client: string } => {
      let cleanTitle = name;
      let sector = '';
      let product = '';
      let client = '';

      // Padrão 1: "Setor | Produto - ..." (ex: "Produtos | Saúde Simples - ...")
      const sectorProductMatch = name.match(/^([^|]+)\s*\|\s*([^-]+)\s*-\s*(.*)/);
      if (sectorProductMatch) {
        sector = sectorProductMatch[1].trim();
        product = sectorProductMatch[2].trim();
        cleanTitle = sectorProductMatch[3].trim();
      }

      // Padrão 2: Extrair cliente de [CLIENTE] (ex: "[OM30]", "[PRINCIPAL]")
      // O primeiro [XXX] que não seja palavras reservadas é o cliente
      const reservedWords = ['PRINCIPAL', 'URGENTE', 'CRÍTICO', 'CRITICO', 'PRIORIDADE', 'HOT', 'BLOCKER'];
      const bracketMatches = cleanTitle.match(/\[([^\]]+)\]/g);
      
      if (bracketMatches) {
        for (const match of bracketMatches) {
          const content = match.slice(1, -1).trim();
          // Se não é uma palavra reservada e não é um código tipo RUBY-XXX
          if (!reservedWords.includes(content.toUpperCase()) && !content.match(/^[A-Z]+-\d+$/)) {
            client = content;
            // Remover a primeira ocorrência do cliente do título (pode haver duplicatas)
            cleanTitle = cleanTitle.replace(match, '').trim();
            break;
          }
        }
      }

      // Limpar espaços e hífens duplicados do título
      cleanTitle = cleanTitle
        .replace(/\s+-\s*-\s+/g, ' - ')
        .replace(/\s+-\s*$/g, '')
        .replace(/^\s*-\s+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      return { cleanTitle, sector, product, client };
    };

    // Transformar tickets para o formato do backlog
    const backlogTasks = allTicketsWithHistory.map((ticket) => {
      const openedAt = new Date(ticket.date);
      const lastUpdatedAt = new Date(ticket.date_mod);
      const now = new Date();
      const daysSinceLastAction = Math.floor((now.getTime() - lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24));

      const tags: string[] = [];
      if (daysSinceLastAction > 7) tags.push('stale');
      if (ticket.priority >= 5) tags.push('critical');
      if (daysSinceLastAction > 14) tags.push('attention');

      // Formatar histórico
      const history = (ticket.followups || []).map((followup, index) => ({
        id: `followup-${followup.id || index}`,
        date: new Date(followup.date).toLocaleString('pt-BR'),
        user: typeof followup.users_id === 'string' ? followup.users_id : 'Sistema',
        action: 'Acompanhamento',
        content: extractCleanDescription(followup.content || '').substring(0, 500),
      }));

      // Parsear título para extrair campos estruturados
      const { cleanTitle, sector: titleSector, product: titleProduct, client: titleClient } = parseTicketTitle(ticket.name);

      // Extrair setor e produto da categoria (fallback)
      const { sector: categorySector, product: categoryProduct } = extractSectorAndProduct(
        ticket.name, 
        ticket.content || '', 
        ticket.itilcategories_id
      );

      // Usar valores do título, com fallback para categoria
      const sector = titleSector || categorySector || '';
      const product = titleProduct || categoryProduct || '';
      const client = titleClient || (typeof ticket.entities_id === 'string' ? ticket.entities_id : 'OM30');

      return {
        id: `GLPI-${ticket.id}`,
        title: cleanTitle,
        status: statusMap[ticket.status] || 'open',
        priority: priorityMap[ticket.priority] || 'normal',
        type: typeMap[ticket.type] || 'incident',
        assignee: typeof ticket.users_id_recipient === 'string' ? ticket.users_id_recipient : 'Não atribuído',
        squad: 'Suporte',
        client,
        sector,
        product,
        tags,
        openedAt: ticket.date,
        lastUpdatedAt: ticket.date_mod,
        daysSinceLastAction,
        slaDeadline: null,
        isSlaBreach: daysSinceLastAction > 5,
        content: extractCleanDescription(ticket.content || ''),
        history,
      };
    });

    // Salvar tickets no Supabase
    const startTime = Date.now();
    console.log('Salvando tickets no Supabase...');
    
    let savedCount = 0;
    let errorCount = 0;
    
    for (const task of backlogTasks) {
      const glpiId = parseInt(task.id.replace('GLPI-', ''));
      
      const ticketData = {
        glpi_id: glpiId,
        title: task.title,
        description: task.content,
        status: parseInt(Object.entries(statusMap).find(([, v]) => v === task.status)?.[0] || '1'),
        priority: parseInt(Object.entries(priorityMap).find(([, v]) => v === task.priority)?.[0] || '3'),
        sector: task.sector || null,
        product: task.product || null,
        client: task.client || null,
        requester: task.assignee,
        assigned_to: task.assignee,
        category: task.type,
        glpi_created_at: task.openedAt,
        glpi_updated_at: task.lastUpdatedAt,
      };

      const { error: upsertError } = await supabaseAdmin
        .from('glpi_tickets')
        .upsert(ticketData, { onConflict: 'glpi_id' });

      if (upsertError) {
        console.error(`Erro ao salvar ticket ${glpiId}:`, upsertError.message);
        errorCount++;
      } else {
        savedCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`${savedCount} tickets salvos, ${errorCount} erros em ${duration}ms`);

    // Registrar histórico de sincronização
    await supabaseAdmin.from('glpi_sync_history').insert({
      success: errorCount === 0,
      tickets_count: savedCount,
      error_message: errorCount > 0 ? `${errorCount} erros ao salvar` : null,
      duration_ms: duration,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      tickets: backlogTasks,
      total: backlogTasks.length,
      saved: savedCount,
      errors: errorCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Erro na edge function:', errorMessage);
    
    // Registrar erro no histórico
    try {
      await supabaseAdmin.from('glpi_sync_history').insert({
        success: false,
        tickets_count: 0,
        error_message: errorMessage,
      });
    } catch (e) {
      console.error('Erro ao registrar histórico:', e);
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
