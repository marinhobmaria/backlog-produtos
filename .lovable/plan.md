
# Documentacao de Produto - Sistema de Gestao de Backlog

## 1. Visao Geral do Produto

O **Sistema de Gestao de Backlog** e uma aplicacao web desenvolvida para gerenciamento e visualizacao de tickets/chamados oriundos do sistema GLPI. A aplicacao oferece multiplas visoes (tabela, kanban, resumo) com filtros avancados, metricas operacionais e sincronizacao automatica com o GLPI.

### 1.1 Objetivo Principal
Centralizar a visualizacao e acompanhamento de tickets de suporte, permitindo gestao por responsavel, status, setor, cliente e produto, com alertas visuais para tarefas criticas ou paradas.

### 1.2 Publico-Alvo
- Gestores de TI e Suporte
- Analistas de Suporte
- Coordenadores de Produto
- Equipes de Atendimento

---

## 2. Arquitetura Tecnica

### 2.1 Stack Tecnologico
| Camada | Tecnologias |
|--------|-------------|
| Frontend | React 18, TypeScript, Vite |
| Estilizacao | Tailwind CSS, Radix UI, Lucide Icons |
| Estado | React Hooks, TanStack Query |
| Graficos | Recharts |
| Backend | Lovable Cloud (Supabase) |
| Edge Functions | Deno (TypeScript) |
| Banco de Dados | PostgreSQL |
| Integracao | API REST GLPI |

### 2.2 Estrutura de Modulos

```text
+------------------------+     +------------------------+
|     GLPI (Externo)     |     |    Frontend React      |
|   Sistema de Tickets   |     |                        |
+-----------+------------+     +------------+-----------+
            |                               |
            v                               v
+-----------+------------+     +------------+-----------+
|  Edge Function         |     |  Componentes           |
|  glpi-tickets          |     |  - BacklogTable        |
|  - Sincronizacao       |     |  - BacklogFilters      |
|  - Parse de dados      |     |  - TaskDetailSheet     |
|  - Upsert no DB        |     |  - Charts (Status,     |
+-----------+------------+     |    Aging, Timeline)    |
            |                  +------------+-----------+
            v                               |
+-----------+------------+                  |
|   Supabase Database    |<-----------------+
|   - glpi_tickets       |
|   - glpi_sync_history  |
+------------------------+
```

---

## 3. Modelos de Dados

### 3.1 Tipos Principais (TypeScript)

```text
TaskStatus: "open" | "in_progress" | "pending" | "resolved" | "closed"
TaskPriority: "urgent" | "high" | "normal" | "low"
TaskType: "incident" | "request" | "problem" | "change"
TaskTag: "critical" | "attention" | "sla_breached" | "dependency" | "no_owner" | "stale"
```

### 3.2 Interface BacklogTask

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | Identificador (GLPI-XXX) |
| title | string | Titulo limpo do ticket |
| status | TaskStatus | Status atual |
| priority | TaskPriority | Prioridade |
| type | TaskType | Tipo do chamado |
| assignee | string | Responsavel atribuido |
| squad | string | Squad/equipe |
| client | string | Cliente |
| sector | string | Setor |
| product | string | Produto |
| tags | TaskTag[] | Tags automaticas |
| openedAt | Date | Data de abertura |
| lastUpdatedAt | Date | Ultima atualizacao |
| daysSinceLastAction | number | Dias sem acao |
| slaDeadline | Date | Prazo SLA |
| isSlaBreach | boolean | Violou SLA |

### 3.3 Schema do Banco de Dados

**Tabela: glpi_tickets**
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| glpi_id | INTEGER | ID unico do GLPI |
| title | TEXT | Titulo |
| description | TEXT | Descricao |
| status | INTEGER | Codigo status GLPI (1-6) |
| priority | INTEGER | Codigo prioridade (1-6) |
| sector | TEXT | Setor extraido |
| product | TEXT | Produto extraido |
| client | TEXT | Cliente |
| requester | TEXT | Solicitante |
| assigned_to | TEXT | Responsavel |
| category | TEXT | Categoria |
| glpi_created_at | TIMESTAMPTZ | Data criacao GLPI |
| glpi_updated_at | TIMESTAMPTZ | Data atualizacao GLPI |

---

## 4. Regras de Negocio

### 4.1 Mapeamento de Status (GLPI -> Sistema)

| Codigo GLPI | Nome GLPI | Status Sistema |
|-------------|-----------|----------------|
| 1 | Novo | open |
| 2 | Em analise | in_progress |
| 3 | Em andamento | in_progress |
| 4 | Aguardando | pending |
| 5 | Resolvido | resolved |
| 6 | Fechado | closed |

### 4.2 Mapeamento de Prioridade

| Codigo GLPI | Nome GLPI | Prioridade Sistema |
|-------------|-----------|-------------------|
| 1-2 | Muito baixa/Baixa | low |
| 3 | Media | normal |
| 4 | Alta | high |
| 5-6 | Muito alta/Critica | urgent |

### 4.3 Regras de Tags Automaticas

| Tag | Condicao de Ativacao |
|-----|---------------------|
| stale | Dias sem acao > 7 |
| critical | Prioridade GLPI >= 5 |
| attention | Dias sem acao > 14 |
| no_owner | Sem responsavel atribuido |
| sla_breached | Dias sem acao > 5 |

### 4.4 Regras de Destaque Visual (Cores)

**Por Tempo de Inatividade:**
| Dias | Cor | Significado |
|------|-----|-------------|
| > 14 | Vermelho (text-destructive) | Critico |
| > 7 | Laranja (text-orange-600) | Atencao |
| > 3 | Ambar (text-amber-600) | Alerta leve |
| <= 3 | Cinza (text-muted-foreground) | Normal |

**Destaque de Linha na Tabela:**
| Condicao | Cor de Fundo |
|----------|--------------|
| Prioridade urgente ou tag critical | bg-red-50/50 |
| Dias sem acao > 15 | bg-amber-50/50 |
| Violacao SLA | bg-purple-50/50 |

---

## 5. Funcionalidades por Modulo

### 5.1 Pagina Backlog (Produtos.tsx)

**Vistas Disponiveis:**
- **Tabela**: Lista paginada com ordenacao por colunas
- **Kanban**: Colunas por status/agrupamento
- **Resumo**: Dashboard com agrupamentos e metricas

**Recursos:**
- Agrupamento por: Status, Setor, Cliente, Responsavel
- Filtros avancados com salvamento
- Exportacao para CSV/XLS
- Cards colapsaveis estilo ClickUp
- Clique na tarefa abre painel lateral de detalhes

**Graficos:**
- StatusChart: Barras por status (clicavel para filtrar)
- AgingChart: Tempo sem acao (buckets 0-3d, 4-7d, 8-15d, >15d)
- TimelineChart: Aberturas nos ultimos 30 dias

### 5.2 Pagina Responsaveis

**Foco:** Gestao individual por analista

**Recursos:**
- Agrupamento padrao por responsavel
- Cards com avatar e estatisticas por pessoa
- Metricas exibidas: tarefas paradas (>7d), media de dias inativos
- Filtros por Status, Responsavel, Setor, Cliente
- Vista Lista ou Board

### 5.3 Pagina Status

**Foco:** Visao por estado do chamado

**Recursos:**
- Cards de resumo no topo com contagem e percentual por status
- Agrupamento padrao por status
- Ordem fixa: Aberto -> Em Andamento -> Pendente -> Resolvido -> Fechado
- Cards colapsaveis com tabelas internas
- Vista Lista ou Board

### 5.4 Painel de Detalhes (TaskDetailSheet)

**Informacoes Exibidas:**
- ID e titulo do ticket
- Badges de status, prioridade e tags
- Grid: Responsavel, Cliente, Setor, Dias parado
- Datas formatadas em pt-BR
- Descricao limpa (HTML parseado)
- Historico de acompanhamentos (ITILFollowups)

---

## 6. Componentes de Interface

### 6.1 BacklogTable
- Tabela com linhas expansiveis (Collapsible)
- 12 colunas: ID, Descricao, Status, Prior., Setor, Produto, Cliente, Responsavel, Abertura, Dias, Tags
- Paginacao configuravel (15/25/50/100)
- Ordenacao por clique no cabecalho
- Botao de exportacao

### 6.2 BacklogFilters
- Busca global (ID, titulo, cliente, responsavel)
- Seletores de data inicio/fim com calendario
- Multi-select dropdowns para cada campo
- Tags clicaveis para filtrar
- Chips de filtros ativos com botao X para remover
- Funcionalidade de salvar/carregar filtros (localStorage)

### 6.3 OperationalAlerts (Indicadores)
- 5 cards de metricas:
  - Total em Aberto
  - Criticas
  - Paradas >7d
  - SLA Estourado
  - Sem Responsavel
- Botao para filtrar apenas itens com alertas

### 6.4 Graficos

**StatusChart:**
- Tipo: Barras verticais
- Cores por status
- Clicavel: filtra ao clicar na barra

**AgingChart:**
- Tipo: Barras verticais
- Buckets: 0-3d, 4-7d, 8-15d, >15d
- Cores: Azul (normal), Vermelho (critico para >7d)

**TimelineChart:**
- Tipo: Area
- Dados: Aberturas diarias dos ultimos 30 dias

---

## 7. Integracao GLPI

### 7.1 Edge Function: glpi-tickets

**Fluxo de Execucao:**
1. Inicia sessao no GLPI via API REST
2. Busca ate 200 tickets (expand_dropdowns=true)
3. Para os 50 primeiros, busca ITILFollowups (historico)
4. Parseia titulos para extrair Setor, Produto, Cliente
5. Limpa descricoes (remove HTML, extrai apos "Descricao:")
6. Salva no banco via upsert (onConflict: glpi_id)
7. Registra historico de sincronizacao
8. Encerra sessao no GLPI

**Parsing de Titulo:**
- Formato esperado: "Setor | Produto - [Cliente] - Titulo"
- Extrai Setor antes do "|"
- Extrai Produto entre "|" e "-"
- Extrai Cliente de [CLIENTE]
- Fallback: busca palavras-chave no conteudo

### 7.2 Credenciais Necessarias (Secrets)

| Secret | Descricao |
|--------|-----------|
| GLPI_API_URL | URL base (ex: https://glpi.empresa.com) |
| GLPI_APP_TOKEN | Token de aplicacao |
| GLPI_USER_TOKEN | Token de usuario |

---

## 8. Fluxo de Dados

```text
1. Usuario acessa a aplicacao
          |
          v
2. useBacklogData() busca dados do Supabase
          |
          v
3. Se banco vazio, chama syncWithGLPI()
          |
          v
4. Edge Function busca do GLPI e salva no DB
          |
          v
5. Hook processa dados: filtros, ordenacao, metricas
          |
          v
6. Componentes renderizam as diferentes visoes
          |
          v
7. Usuario interage: filtra, ordena, expande, exporta
          |
          v
8. Botao "Atualizar" dispara nova sincronizacao
```

---

## 9. Metricas Calculadas

### 9.1 BacklogMetrics
- **total**: Total de tarefas
- **byStatus**: Contagem por status
- **oldestTask**: Tarefa mais antiga aberta
- **newestTask**: Tarefa mais recente
- **tasksWithoutAction**: Tarefas paradas >7 dias
- **criticalAgingCount**: Tarefas paradas >15 dias

### 9.2 BacklogAlerts
- **staleCount**: Tarefas paradas >7 dias
- **slaBreachedCount**: Tarefas com SLA estourado
- **noOwnerCount**: Tarefas sem responsavel
- **criticalCount**: Tarefas com tag critical

### 9.3 AgingBuckets
| Bucket | Faixa | Criticidade |
|--------|-------|-------------|
| 0-3 dias | 0-3 | Normal |
| 4-7 dias | 4-7 | Normal |
| 8-15 dias | 8-15 | Critico |
| >15 dias | 16+ | Critico |

---

## 10. Navegacao e Layout

### 10.1 Header (AppLayout)

**Menu Principal:**
- Backlog (/produtos)
- Responsaveis (/responsaveis)
- Status (/status)
- Roadmap (/roadmap)
- Sprint (/sprint)
- Indicadores (/dashboard-executivo)

**Area Direita:**
- Botao de sincronizacao com indicador de loading
- Timestamp da ultima atualizacao
- Menu do usuario (Configuracoes, Sair)

### 10.2 Autenticacao
- Login/Cadastro via Supabase Auth
- Redirecionamento automatico para /auth se nao logado
- Protecao de rotas no AppLayout

---

## 11. Exportacao de Dados

### 11.1 Formato CSV (compativel Excel)
- Separador: ponto-e-virgula (;)
- Encoding: UTF-8 com BOM
- Colunas: ID, Descricao, Status, Prioridade, Cliente, Responsavel, Setor, Data Abertura, Ultima Atualizacao, Dias sem Acao, Tags

### 11.2 Nomenclatura do Arquivo
```text
backlog_YYYY-MM-DD_HH-mm.csv
```

---

## 12. Responsividade

### 12.1 Breakpoints
| Tamanho | Comportamento |
|---------|---------------|
| Mobile (<640px) | Menu compacto, tabelas com scroll horizontal |
| Tablet (640-1024px) | Layout adaptado, alguns textos ocultos |
| Desktop (>1024px) | Layout completo, todas as colunas visiveis |

### 12.2 Adaptacoes Mobile
- Labels do menu ocultados (so icones)
- Tabelas com scroll horizontal
- Filtros em dropdowns colapsaveis
- Cards em grid de 1-2 colunas

---

## 13. Dependencias Principais

```text
@supabase/supabase-js: ^2.90.1
@tanstack/react-query: ^5.83.0
@radix-ui/react-*: Componentes UI acessiveis
recharts: ^2.15.4 - Graficos
date-fns: ^3.6.0 - Manipulacao de datas
lucide-react: ^0.462.0 - Icones
sonner: ^1.7.4 - Notificacoes toast
zod: ^3.25.76 - Validacao de schemas
react-router-dom: ^6.30.1 - Navegacao
```

---

## 14. Proximos Passos Sugeridos

1. **Sincronizacao Automatica**: Implementar cron job para sincronizar a cada X minutos
2. **Notificacoes em Tempo Real**: Alertas via Supabase Realtime
3. **Relatorios Personalizados**: Exportacao em PDF com graficos
4. **Filtros por Periodo Predefinido**: Hoje, Semana, Mes
5. **Historico de Acoes**: Timeline completa de cada ticket
6. **Integracao com ClickUp**: Sincronizacao bidirecional
7. **Dashboard Executivo**: KPIs e indicadores gerenciais
8. **Multi-produto**: Suporte a multiplos produtos/workspaces
