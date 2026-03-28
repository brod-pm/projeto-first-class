# ROADMAP — Projeto First Class Apps
> Documento de planejamento de implementações — atualizado em 2026-03-28

---

## Contexto

Dois apps HTML standalone em produção:
- **`first_class_supervisao.html`** — checklist de visita de campo + relatório com IA
- **`contratacao_first_class_v4.html`** — triagem de CV + entrevista estruturada + tracker de experiência

**Problema central:** os dois funcionam como formulários inteligentes, mas descartam os dados após cada uso. Não geram inteligência acumulada, não se comunicam entre si e não têm backend. Cada melhoria abaixo resolve isso progressivamente.

---

## Arquitetura alvo

```
┌─────────────────────────┐     ┌─────────────────────────┐
│  first_class_supervisao │     │  contratacao_first_class │
│         .html           │     │          _v4.html        │
└────────────┬────────────┘     └────────────┬────────────┘
             │                               │
             │         Supabase              │
             └──────────────┬────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         visitas_fc   candidatos_fc  colaboradores_fc
              │             │             │
              └─────────────┼─────────────┘
                            │
               ┌────────────┼────────────┐
               │            │            │
           Gmail MCP   Teams (M365)   Power Automate
          (notificações) (canais)     (automações)
```

**Stack escolhida:**
- **Fase 1** — `localStorage` (zero infra, roda offline, implementação imediata)
- **Fase 2** — `Supabase` como backend (PostgreSQL, real-time, auth, já disponível via MCP)
- **Fase 3** — Integrações (Gmail, Teams/M365, Power Automate)

---

## FASE 1 — Melhorias com localStorage
> Sem backend. Roda offline. Implementação rápida.

### 1.1 Supervisão — Histórico de visitas por loja

**Dor:** cada visita começa do zero, sem registro do passado.

**Implementação:**
- Ao gerar relatório, salvar JSON no localStorage com chave `fc_visitas_<codLoja>`
- Estrutura de cada registro:
  ```json
  {
    "id": "uuid-gerado",
    "loja": "BEL2 – BOULEVARD SHOPPING (Cód. 264)",
    "data": "2026-03-28",
    "supervisor": "Nome",
    "scoreGeral": "18/22 · 82%",
    "scoresPorCategoria": { "visual": "9/11", "oper": "5/7", "equipe": "3/3", "dados": "1/1" },
    "pendencias": [
      { "label": "Iluminação / Lâmpadas", "obs": "3 lâmpadas queimadas no fundo" }
    ],
    "relato": "texto livre",
    "timestamp": "2026-03-28T14:30:00"
  }
  ```
- Nova tela "Histórico" acessível pelo menu do app
- Exibe tabela: Data | Supervisor | Score | Pendências | Ver relatório
- Gráfico simples de evolução do score (últimas 6 visitas)

**Critério de sucesso:** supervisor consegue ver em 2 cliques o score das últimas 3 visitas de uma loja.

---

### 1.2 Supervisão — Pendências persistentes entre visitas

**Dor:** itens "Não OK" são esquecidos na próxima visita.

**Implementação:**
- Ao iniciar visita de uma loja, buscar pendências da última visita no localStorage
- Exibir banner no topo: "⚠️ 2 pendências da última visita (15/03/2026)"
- Botão que expande e lista as pendências com opção: `✔ Resolvido` | `Ainda pendente`
- Resolução ou reincidência é registrada automaticamente no novo relatório

**Critério de sucesso:** supervisor não precisa abrir email antigo para lembrar o que estava pendente.

---

### 1.3 Supervisão — IA em modo resumo (3 linhas)

**Dor:** relatório de IA gera 2.000 palavras que poucos leem.

**Implementação:**
- Adicionar toggle no botão: `✨ Resumo Executivo (3 linhas)` vs. `📄 Relatório Completo`
- Prompt do modo resumo:
  > "Em exatamente 3 frases: (1) score geral e o que ele representa, (2) o problema mais crítico e o que fazer hoje, (3) o ponto positivo mais relevante. Sem introdução, sem saudações, sem formatação markdown."
- Output vai direto para clipboard + exibe inline

**Critério de sucesso:** gestor lê em 10 segundos e sabe o que fazer.

---

### 1.4 Supervisão — Lista de lojas completa + dinâmica

**Dor:** apenas 9 lojas hardcoded (Belém e Manaus). Outras praças faltam.

**Implementação:**
- Completar dropdown com lojas de São Luís, Fortaleza e Teresina (baseado no workspace M365)
- Campo "Outra loja / loja temporária" para casos fora da lista
- Salvar lojas customizadas no localStorage para aparecerem nas próximas sessões

**Lojas a adicionar (conforme workspace M365):**
- Praça São Luís: levantamento pendente
- Praça Fortaleza: levantamento pendente
- Praça Teresina: levantamento pendente

---

### 1.5 Contratação — Banco de candidatos

**Dor:** cada CV analisado é descartado. Sem histórico.

**Implementação:**
- Ao finalizar análise, exibir botão "💾 Salvar no banco"
- Salvar no localStorage com chave `fc_candidatos`:
  ```json
  {
    "id": "uuid",
    "nome": "extraído do nome do arquivo PDF",
    "score": 5,
    "verdict": "Chamar para triagem",
    "vaga": "Vendedor Belém",
    "dataAnalise": "2026-03-28",
    "keywords": ["vendas", "atendimento", "moda"],
    "redFlags": [],
    "anotacao": "campo livre para RH"
  }
  ```
- Nova tela "Banco de Candidatos": lista com filtro por score, vaga e veredicto
- Ação rápida: arquivar, promover para entrevista, descartar com motivo

**Critério de sucesso:** RH evita reabrir processo com candidatos já avaliados.

---

### 1.6 Contratação — Nome do candidato nos templates WhatsApp

**Dor:** templates são genéricos. RH copia e substitui manualmente.

**Implementação:**
- Campo "Nome do candidato" no topo da tela de análise
- Templates usam `{{nome}}` que é substituído automaticamente ao copiar
- Ex: "Olá, {{nome}}! Tudo bem?" → "Olá, Mariana! Tudo bem?" ao clicar em Copiar

---

### 1.7 Contratação — Alerta de PDF mal extraído

**Dor:** CVs do Canva ou escaneados retornam lixo e o scoring falha silenciosamente.

**Implementação:**
- Após extração, verificar: `texto.length < 200` ou `texto.split(' ').length < 30`
- Se sim, exibir banner amarelo: "⚠️ O texto extraído parece incompleto. CVs em formato imagem ou com colunas podem não ser lidos corretamente. Revise o resultado manualmente."
- Não bloqueia o fluxo — apenas avisa.

---

### 1.8 Contratação — Período de experiência com notificação

**Dor:** tracker visual não gera output. Ninguém abre o app no dia certo.

**Implementação:**
- Salvar datas de início de período no localStorage
- Na abertura do app, verificar se há avaliação vencendo em ≤ 5 dias
- Banner de alerta + botão "Abrir avaliação de [Nome] — vence em 3 dias"
- Gerar link `mailto:` pré-preenchido para o gestor responsável

---

## FASE 2 — Backend Supabase
> Dados persistem entre dispositivos. Múltiplos usuários. Histórico real da rede.

### Estrutura do banco (PostgreSQL no Supabase)

```sql
-- Visitas de supervisão
CREATE TABLE visitas_fc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja TEXT NOT NULL,
  cod_loja TEXT,
  praca TEXT, -- Belém, Manaus, São Luís, etc.
  data DATE NOT NULL,
  supervisor TEXT,
  responsavel_loja TEXT,
  score_geral TEXT,
  score_visual TEXT,
  score_oper TEXT,
  score_equipe TEXT,
  score_dados TEXT,
  pendencias JSONB DEFAULT '[]',
  relato TEXT,
  fotos_count INT DEFAULT 0,
  relatorio_ia TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pendências em acompanhamento
CREATE TABLE pendencias_fc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID REFERENCES visitas_fc(id),
  loja TEXT NOT NULL,
  item TEXT NOT NULL,
  observacao TEXT,
  status TEXT DEFAULT 'aberta', -- aberta | resolvida | reincidente
  resolvida_em DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Candidatos
CREATE TABLE candidatos_fc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  vaga TEXT,
  praca TEXT,
  score_cv INT,
  verdict TEXT,
  keywords TEXT[],
  red_flags TEXT[],
  score_entrevista INT,
  notas_entrevista JSONB DEFAULT '{}', -- { exp: 3, com: 4, res: 3, mot: 4, ali: 3 }
  status TEXT DEFAULT 'triagem', -- triagem | entrevista | aprovado | reprovado | banco
  data_inicio_experiencia DATE,
  data_fim_experiencia DATE,
  loja_destino TEXT,
  anotacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Autenticação

- Supabase Auth com magic link por email (sem senha)
- Row Level Security: supervisores veem apenas visitas da própria praça
- Admin (Bruno) vê tudo

### Migração do localStorage para Supabase

- Ao fazer login pela primeira vez, app detecta dados no localStorage e oferece importar
- Após importação bem-sucedida, limpa localStorage

---

## FASE 3 — Integrações externas

### 3.1 Notificação no Teams quando visita é salva

**Gatilho:** `POST /visitas_fc` via Supabase → webhook → Power Automate → canal "Supervisão" da praça correspondente

**Mensagem no Teams:**
```
📋 Nova visita registrada
Loja: BEL2 – Boulevard Shopping
Data: 28/03/2026 · Supervisor: Bruno
Score: 82% ✅
Pendências: 2 itens
```

### 3.2 Email automático de pendências não resolvidas

**Gatilho:** toda segunda-feira, verificar pendências com `status = 'aberta'` com mais de 7 dias
**Ação:** Gmail MCP envia email para o supervisor responsável com lista de pendências em aberto

### 3.3 Alerta de vencimento de período de experiência

**Gatilho:** diário, 08h — verificar `data_fim_experiencia` nos próximos 5 dias
**Ação:** email para gestor da loja + mensagem no canal RH do Teams

### 3.4 Dashboard Power BI

**Fonte:** Supabase PostgreSQL (conexão direta ou via API)
**Métricas:**
- Score médio por praça e por loja (últimos 90 dias)
- Ranking de lojas por categoria (visual, operacional, equipe, CRM)
- Pendências abertas por praça
- Taxa de conversão do funil de contratação (triagem → entrevista → aprovado)
- Índice de retenção no período de experiência

---

## Ordem de implementação sugerida

### Sprint 1 (Fase 1 — impacto imediato)
1. `1.5` Banco de candidatos (contratação) — resolve dor de RH hoje
2. `1.6` Nome nos templates WhatsApp — 1h de trabalho, impacto visível
3. `1.7` Alerta PDF mal extraído — evita decisões erradas
4. `1.1` Histórico de visitas (supervisão) — base para tudo que vem depois
5. `1.2` Pendências persistentes — fecha o ciclo de acompanhamento

### Sprint 2 (Fase 1 — complementos)
6. `1.3` IA em modo resumo executivo
7. `1.4` Lista completa de lojas
8. `1.8` Período de experiência com alerta

### Sprint 3 (Fase 2 — backend)
9. Criar projeto no Supabase + estrutura de tabelas
10. Integrar `visitas_fc` no app de supervisão (sync após localStorage)
11. Integrar `candidatos_fc` no app de contratação
12. Configurar autenticação por magic link

### Sprint 4 (Fase 3 — integrações)
13. Webhook Supabase → Power Automate → Teams
14. Alertas automáticos de pendências e períodos de experiência
15. Dashboard Power BI

---

## Decisões a confirmar antes de começar

| Decisão | Opções | Recomendação |
|---|---|---|
| Onde hospedar os apps? | GitHub Pages / Cloudflare Pages / servidor próprio | Cloudflare Pages (grátis, já tem o Worker) |
| Auth no Supabase | Magic link / Google OAuth / sem auth | Magic link (mais simples para equipe interna) |
| Lojas das outras praças | Levantar lista completa | Confirmar com Bruno antes de codificar |
| Fotos no relatório | Armazenar no Supabase Storage / só local | Supabase Storage (Fase 2) |
| `filtros-cv.json` | Mover para Supabase / manter arquivo | Mover para tabela `configuracoes_fc` no Supabase |

---

*Documento gerado em 2026-03-28 — atualizar a cada sprint concluído.*
