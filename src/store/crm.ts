import { create } from "zustand";
import { persist } from "zustand/middleware";

// ===================== Tipos =====================
export type StatusCliente = "Ativo" | "Pausado" | "Próximo da renovação" | "Finalizado";
export type StatusCard = "Criar" | "Revisar" | "Agendar" | "Postado" | "Renovação";
export type TipoAlerta = "Renovacao" | "Posts_Pendentes" | "Contrato_Finalizando";
export type Permissao = "admin" | "editor" | "viewer";
export type ColumnTipo = "texto" | "numero" | "data" | "dropdown" | "responsaveis" | "link" | "status" | "etiqueta";

export interface Responsavel {
  id: string;
  nome: string;
  avatar_url?: string;
  cor: string;
  permissao: Permissao;
  email: string;
}

export interface Cliente {
  id: string;
  nome_cliente: string;
  nicho: string;
  status_cliente: StatusCliente;
  data_inicio_contrato: string;
  data_fim_contrato: string;
  responsaveis: string[];
  observacoes: string;
  ultimo_comentario: string;
  created_at: string;
  custom: Record<string, any>;
}

export interface Contrato {
  id: string;
  cliente_id: string;
  status: "Ativo" | "Renovação" | "Finalizado";
  data_inicio: string;
  data_fim: string;
  total_posts: number;
  posts_concluidos: number;
}

export interface Card {
  id: string;
  cliente_id: string;
  titulo_card: string;
  mes_referencia: number;
  numero_semana: number;
  status_card: StatusCard;
  responsaveis: string[];
  created_at: string;
}

export interface Post {
  id: string;
  card_id: string;
  titulo_post: string;
  descricao: string;
  data_agendamento?: string;
  data_postagem?: string;
  link_post?: string;
  link_meister?: string;
  status: StatusCard;
  legenda: string;
  anexos: { id: string; nome: string; url: string }[];
  created_at: string;
}

export interface Comentario {
  id: string;
  post_id?: string;
  cliente_id?: string;
  usuario_id: string;
  comentario_texto: string;
  imagem_url?: string;
  created_at: string;
}

export interface Alerta {
  id: string;
  cliente_id: string;
  tipo_alerta: TipoAlerta;
  data_alerta: string;
  status: "Pendente" | "Resolvido";
  mensagem: string;
  created_at: string;
}

export interface CustomField {
  id: string;
  escopo: "cliente" | "post";
  nome: string;
  tipo: "texto" | "numero" | "data" | "dropdown" | "link";
  opcoes?: { label: string; cor: string }[];
  ordem: number;
}

export interface ColumnConfig {
  key: string;
  label: string;
  tipo: ColumnTipo;
  ordem: number;
  oculta: boolean;
  fixada: boolean;
  largura: number;
  cor?: string;
  fixa?: boolean; // não pode ser removida
  opcoes?: { label: string; cor: string }[];
}

export interface DropdownOption {
  label: string;
  cor: string;
}

export interface ModeloColunas {
  id: string;
  nome: string;
  colunas: ColumnConfig[];
  created_at: string;
}

interface State {
  responsaveis: Responsavel[];
  clientes: Cliente[];
  contratos: Contrato[];
  cards: Card[];
  posts: Post[];
  comentarios: Comentario[];
  alertas: Alerta[];
  customFields: CustomField[];
  colunasCliente: ColumnConfig[];
  modelosColunas: ModeloColunas[];
  nichos: DropdownOption[];
  statusOptions: DropdownOption[];

  // ações
  addCliente: (data: Omit<Cliente, "id" | "created_at" | "ultimo_comentario" | "custom">) => string;
  updateCliente: (id: string, patch: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;

  addResponsavel: (r: Omit<Responsavel, "id">) => string;
  updateResponsavel: (id: string, patch: Partial<Responsavel>) => void;
  deleteResponsavel: (id: string) => void;

  moveCard: (cardId: string, novoStatus: StatusCard) => void;
  updateCard: (id: string, patch: Partial<Card>) => void;
  updatePost: (id: string, patch: Partial<Post>) => void;

  addComentario: (c: Omit<Comentario, "id" | "created_at">) => void;
  updateComentario: (id: string, patch: Partial<Pick<Comentario, "comentario_texto" | "imagem_url">>) => void;
  deleteComentario: (id: string) => void;

  resolverAlerta: (id: string) => void;

  addColumn: (col: Omit<ColumnConfig, "ordem">) => void;
  updateColumn: (key: string, patch: Partial<ColumnConfig>) => void;
  deleteColumn: (key: string) => void;
  reorderColumns: (keys: string[]) => void;
  saveModeloColunas: (nome: string) => void;
  applyModeloColunas: (id: string) => void;
  deleteModeloColunas: (id: string) => void;

  addCustomField: (f: Omit<CustomField, "id" | "ordem">) => void;
  deleteCustomField: (id: string) => void;

  addNicho: (n: DropdownOption) => boolean;
  updateNicho: (oldLabel: string, patch: Partial<DropdownOption>) => number;
  deleteNicho: (label: string) => number;
  addStatusOption: (s: DropdownOption) => boolean;
  updateStatusOption: (oldLabel: string, patch: Partial<DropdownOption>) => number;
  deleteStatusOption: (label: string) => number;
}

const uid = () => crypto.randomUUID();
const today = () => new Date().toISOString();
const addMonths = (date: Date, m: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d;
};

// resolve qual cliente um comentário pertence (direto ou via post→card)
function resolveClienteId(
  com: Comentario | undefined,
  posts: Post[],
  cards: Card[]
): string | undefined {
  if (!com) return undefined;
  if (com.cliente_id) return com.cliente_id;
  if (com.post_id) {
    const post = posts.find((p) => p.id === com.post_id);
    const card = post ? cards.find((c) => c.id === post.card_id) : undefined;
    return card?.cliente_id;
  }
  return undefined;
}

// gera o resumo "ultimo_comentario" do cliente (mais recente entre diretos + de posts)
function computeUltimoComentario(
  cliente_id: string,
  comentarios: Comentario[],
  posts: Post[],
  cards: Card[],
  responsaveis: Responsavel[]
): string {
  const relacionados = comentarios.filter((c) => resolveClienteId(c, posts, cards) === cliente_id);
  if (relacionados.length === 0) return "";
  const ultimo = relacionados.reduce((a, b) => (a.created_at > b.created_at ? a : b));
  const autor = responsaveis.find((r) => r.id === ultimo.usuario_id)?.nome ?? "Usuário";
  const trecho = ultimo.comentario_texto.slice(0, 60);
  const data = new Date(ultimo.created_at).toLocaleDateString("pt-BR");
  return `${autor}: ${trecho} — ${data}`;
}

// ===================== Seeds =====================
const seedResponsaveis: Responsavel[] = [
  { id: "r1", nome: "Ana Costa", cor: "#6366f1", permissao: "admin", email: "ana@crm.com" },
  { id: "r2", nome: "Bruno Lima", cor: "#ec4899", permissao: "editor", email: "bruno@crm.com" },
  { id: "r3", nome: "Carla Souza", cor: "#10b981", permissao: "editor", email: "carla@crm.com" },
  { id: "r4", nome: "Diego Alves", cor: "#f59e0b", permissao: "viewer", email: "diego@crm.com" },
];

const seedNichos: DropdownOption[] = [
  { label: "Trabalhista", cor: "#3b82f6" },
  { label: "Tributário", cor: "#10b981" },
  { label: "Família", cor: "#ec4899" },
  { label: "Empresarial", cor: "#f59e0b" },
  { label: "Criminal", cor: "#ef4444" },
];

const seedStatus: DropdownOption[] = [
  { label: "Ativo", cor: "#10b981" },
  { label: "Pausado", cor: "#94a3b8" },
  { label: "Próximo da renovação", cor: "#f59e0b" },
  { label: "Finalizado", cor: "#ef4444" },
];

const colunasPadrao: ColumnConfig[] = [
  { key: "nome_cliente", label: "Nome do Cliente", tipo: "texto", ordem: 0, oculta: false, fixada: true, largura: 200, fixa: true },
  { key: "responsaveis", label: "Responsáveis", tipo: "responsaveis", ordem: 1, oculta: false, fixada: false, largura: 110, fixa: true },
  { key: "ultimo_comentario", label: "Últimos Comentários", tipo: "texto", ordem: 2, oculta: false, fixada: false, largura: 260 },
  { key: "nicho", label: "Nicho", tipo: "dropdown", ordem: 3, oculta: false, fixada: false, largura: 130, opcoes: seedNichos },
  { key: "status_cliente", label: "Status Cliente", tipo: "status", ordem: 4, oculta: false, fixada: false, largura: 140, fixa: true, opcoes: seedStatus },
  { key: "periodo_contrato", label: "Período do Contrato", tipo: "texto", ordem: 5, oculta: false, fixada: false, largura: 150, fixa: true },
  { key: "posts", label: "Posts", tipo: "texto", ordem: 6, oculta: false, fixada: false, largura: 130, fixa: true },
  { key: "observacoes", label: "Observações", tipo: "texto", ordem: 7, oculta: false, fixada: false, largura: 200 },
];

// gera 12 cards + 12 posts para um cliente
function gerarCardsEPosts(cliente_id: string, responsaveis: string[]) {
  const cards: Card[] = [];
  const posts: Post[] = [];
  for (let mes = 1; mes <= 3; mes++) {
    for (let semana = 1; semana <= 4; semana++) {
      const cardId = uid();
      cards.push({
        id: cardId,
        cliente_id,
        titulo_card: `Post Mês ${mes} - Semana ${semana}`,
        mes_referencia: mes,
        numero_semana: semana,
        status_card: "Criar",
        responsaveis,
        created_at: today(),
      });
      posts.push({
        id: uid(),
        card_id: cardId,
        titulo_post: `Post Mês ${mes} - Semana ${semana}`,
        descricao: "",
        legenda: "",
        anexos: [],
        status: "Criar",
        created_at: today(),
      });
    }
  }
  return { cards, posts };
}

function seedClientes() {
  const clientes: Cliente[] = [];
  const contratos: Contrato[] = [];
  const cardsAll: Card[] = [];
  const postsAll: Post[] = [];

  const exemplos = [
    { nome: "Dr. José Almeida", nicho: "Trabalhista", resp: ["r1", "r2"] },
    { nome: "Silva & Associados", nicho: "Empresarial", resp: ["r2"] },
    { nome: "Mariana Ferreira Adv.", nicho: "Família", resp: ["r3", "r1"] },
    { nome: "Escritório Tributus", nicho: "Tributário", resp: ["r1"] },
    { nome: "Defesa Total", nicho: "Criminal", resp: ["r4", "r2"] },
  ];

  exemplos.forEach((e, i) => {
    const id = uid();
    const inicio = addMonths(new Date(), -i);
    const fim = addMonths(inicio, 3);
    clientes.push({
      id,
      nome_cliente: e.nome,
      nicho: e.nicho,
      status_cliente: i === 4 ? "Próximo da renovação" : "Ativo",
      data_inicio_contrato: inicio.toISOString().slice(0, 10),
      data_fim_contrato: fim.toISOString().slice(0, 10),
      responsaveis: e.resp,
      observacoes: "",
      ultimo_comentario: i === 0 ? "Ana Costa: aprovado, pode agendar — hoje" : "",
      created_at: today(),
      custom: {},
    });
    contratos.push({
      id: uid(),
      cliente_id: id,
      status: "Ativo",
      data_inicio: inicio.toISOString().slice(0, 10),
      data_fim: fim.toISOString().slice(0, 10),
      total_posts: 12,
      posts_concluidos: i === 0 ? 5 : i === 4 ? 12 : 2,
    });
    const { cards, posts } = gerarCardsEPosts(id, e.resp);
    // distribui status para parecer real
    cards.forEach((c, idx) => {
      const post = posts[idx];
      if (i === 4) {
        c.status_card = "Postado"; post.status = "Postado";
      } else if (idx < 2) {
        c.status_card = "Postado"; post.status = "Postado";
      } else if (idx < 4) {
        c.status_card = "Agendar"; post.status = "Agendar";
      } else if (idx < 6) {
        c.status_card = "Revisar"; post.status = "Revisar";
      }
    });
    cardsAll.push(...cards);
    postsAll.push(...posts);
  });

  const alertas: Alerta[] = [
    {
      id: uid(),
      cliente_id: clientes[4].id,
      tipo_alerta: "Renovacao",
      data_alerta: today().slice(0, 10),
      status: "Pendente",
      mensagem: `Contrato de ${clientes[4].nome_cliente} termina em 7 dias`,
      created_at: today(),
    },
    {
      id: uid(),
      cliente_id: clientes[4].id,
      tipo_alerta: "Contrato_Finalizando",
      data_alerta: today().slice(0, 10),
      status: "Pendente",
      mensagem: `12 posts concluídos para ${clientes[4].nome_cliente}`,
      created_at: today(),
    },
  ];

  return { clientes, contratos, cardsAll, postsAll, alertas };
}

const seed = seedClientes();

// ===================== Store =====================
export const useCRM = create<State>()(
  persist(
    (set, get) => ({
      responsaveis: seedResponsaveis,
      clientes: seed.clientes,
      contratos: seed.contratos,
      cards: seed.cardsAll,
      posts: seed.postsAll,
      comentarios: [],
      alertas: seed.alertas,
      customFields: [],
      colunasCliente: colunasPadrao,
      modelosColunas: [],
      nichos: seedNichos,
      statusOptions: seedStatus,

      addCliente: (data) => {
        const id = uid();
        const cliente: Cliente = {
          ...data,
          id,
          created_at: today(),
          ultimo_comentario: "",
          custom: {},
        };
        const { cards, posts } = gerarCardsEPosts(id, data.responsaveis);
        const contrato: Contrato = {
          id: uid(),
          cliente_id: id,
          status: "Ativo",
          data_inicio: data.data_inicio_contrato,
          data_fim: data.data_fim_contrato,
          total_posts: 12,
          posts_concluidos: 0,
        };
        set((s) => ({
          clientes: [cliente, ...s.clientes],
          contratos: [contrato, ...s.contratos],
          cards: [...s.cards, ...cards],
          posts: [...s.posts, ...posts],
        }));
        return id;
      },
      updateCliente: (id, patch) =>
        set((s) => ({ clientes: s.clientes.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCliente: (id) =>
        set((s) => ({
          clientes: s.clientes.filter((c) => c.id !== id),
          contratos: s.contratos.filter((c) => c.cliente_id !== id),
          cards: s.cards.filter((c) => c.cliente_id !== id),
          posts: s.posts.filter((p) => {
            const card = s.cards.find((c) => c.id === p.card_id);
            return card?.cliente_id !== id;
          }),
          alertas: s.alertas.filter((a) => a.cliente_id !== id),
        })),

      addResponsavel: (r) => {
        const id = uid();
        set((s) => ({ responsaveis: [...s.responsaveis, { ...r, id }] }));
        return id;
      },
      updateResponsavel: (id, patch) =>
        set((s) => ({ responsaveis: s.responsaveis.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteResponsavel: (id) =>
        set((s) => ({ responsaveis: s.responsaveis.filter((r) => r.id !== id) })),

      moveCard: (cardId, novoStatus) =>
        set((s) => {
          const cards = s.cards.map((c) => (c.id === cardId ? { ...c, status_card: novoStatus } : c));
          const posts = s.posts.map((p) => (p.card_id === cardId ? { ...p, status: novoStatus } : p));
          // recalcula posts_concluidos
          const card = cards.find((c) => c.id === cardId);
          let contratos = s.contratos;
          let clientes = s.clientes;
          let alertas = s.alertas;
          if (card) {
            const cardsCliente = cards.filter((c) => c.cliente_id === card.cliente_id);
            const concluidos = cardsCliente.filter((c) => c.status_card === "Postado").length;
            contratos = contratos.map((c) =>
              c.cliente_id === card.cliente_id ? { ...c, posts_concluidos: concluidos } : c
            );
            if (concluidos === 12) {
              clientes = clientes.map((c) =>
                c.id === card.cliente_id ? { ...c, status_cliente: "Próximo da renovação" } : c
              );
              const cliente = clientes.find((c) => c.id === card.cliente_id);
              if (cliente && !alertas.some((a) => a.cliente_id === cliente.id && a.tipo_alerta === "Contrato_Finalizando" && a.status === "Pendente")) {
                alertas = [
                  {
                    id: uid(),
                    cliente_id: cliente.id,
                    tipo_alerta: "Contrato_Finalizando",
                    data_alerta: today().slice(0, 10),
                    status: "Pendente",
                    mensagem: `12 posts concluídos para ${cliente.nome_cliente}`,
                    created_at: today(),
                  },
                  ...alertas,
                ];
              }
            }
          }
          return { cards, posts, contratos, clientes, alertas };
        }),

      updatePost: (id, patch) =>
        set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      addComentario: (c) => {
        const com: Comentario = { ...c, id: uid(), created_at: today() };
        set((s) => {
          const comentarios = [...s.comentarios, com];
          let cliente_id = c.cliente_id;
          if (!cliente_id && c.post_id) {
            const post = s.posts.find((p) => p.id === c.post_id);
            const card = post ? s.cards.find((cc) => cc.id === post.card_id) : undefined;
            cliente_id = card?.cliente_id;
          }
          const clientes = cliente_id
            ? s.clientes.map((cl) =>
                cl.id === cliente_id
                  ? { ...cl, ultimo_comentario: computeUltimoComentario(cliente_id!, comentarios, s.posts, s.cards, s.responsaveis) }
                  : cl
              )
            : s.clientes;
          return { comentarios, clientes };
        });
      },

      updateComentario: (id, patch) =>
        set((s) => {
          const comentarios = s.comentarios.map((c) => (c.id === id ? { ...c, ...patch } : c));
          const alvo = s.comentarios.find((c) => c.id === id);
          const cliente_id = resolveClienteId(alvo, s.posts, s.cards);
          const clientes = cliente_id
            ? s.clientes.map((cl) =>
                cl.id === cliente_id
                  ? { ...cl, ultimo_comentario: computeUltimoComentario(cliente_id, comentarios, s.posts, s.cards, s.responsaveis) }
                  : cl
              )
            : s.clientes;
          return { comentarios, clientes };
        }),

      deleteComentario: (id) =>
        set((s) => {
          const alvo = s.comentarios.find((c) => c.id === id);
          const comentarios = s.comentarios.filter((c) => c.id !== id);
          const cliente_id = resolveClienteId(alvo, s.posts, s.cards);
          const clientes = cliente_id
            ? s.clientes.map((cl) =>
                cl.id === cliente_id
                  ? { ...cl, ultimo_comentario: computeUltimoComentario(cliente_id, comentarios, s.posts, s.cards, s.responsaveis) }
                  : cl
              )
            : s.clientes;
          return { comentarios, clientes };
        }),

      resolverAlerta: (id) =>
        set((s) => ({ alertas: s.alertas.map((a) => (a.id === id ? { ...a, status: "Resolvido" } : a)) })),

      addColumn: (col) =>
        set((s) => ({ colunasCliente: [...s.colunasCliente, { ...col, ordem: s.colunasCliente.length }] })),
      updateColumn: (key, patch) =>
        set((s) => ({ colunasCliente: s.colunasCliente.map((c) => (c.key === key ? { ...c, ...patch } : c)) })),
      deleteColumn: (key) =>
        set((s) => ({ colunasCliente: s.colunasCliente.filter((c) => c.key !== key || c.fixa) })),
      reorderColumns: (keys) =>
        set((s) => ({
          colunasCliente: keys
            .map((k, i) => {
              const c = s.colunasCliente.find((x) => x.key === k);
              return c ? { ...c, ordem: i } : null;
            })
            .filter(Boolean) as ColumnConfig[],
        })),

      saveModeloColunas: (nome) =>
        set((s) => ({
          modelosColunas: [
            ...s.modelosColunas,
            { id: uid(), nome, colunas: s.colunasCliente.map((c) => ({ ...c })), created_at: today() },
          ],
        })),
      applyModeloColunas: (id) =>
        set((s) => {
          const m = s.modelosColunas.find((x) => x.id === id);
          if (!m) return s;
          return { colunasCliente: m.colunas.map((c) => ({ ...c })) };
        }),
      deleteModeloColunas: (id) =>
        set((s) => ({ modelosColunas: s.modelosColunas.filter((m) => m.id !== id) })),

      addCustomField: (f) =>
        set((s) => ({ customFields: [...s.customFields, { ...f, id: uid(), ordem: s.customFields.length }] })),
      deleteCustomField: (id) =>
        set((s) => ({ customFields: s.customFields.filter((f) => f.id !== id) })),

      addNicho: (n) => {
        const label = n.label.trim();
        if (!label) return false;
        const { nichos } = get();
        if (nichos.some((x) => x.label.toLowerCase() === label.toLowerCase())) return false;
        set((s) => ({ nichos: [...s.nichos, { ...n, label }] }));
        return true;
      },
      updateNicho: (oldLabel, patch) => {
        const { nichos, clientes } = get();
        const novoLabel = patch.label?.trim();
        if (novoLabel !== undefined && !novoLabel) return -1;
        if (
          novoLabel &&
          novoLabel.toLowerCase() !== oldLabel.toLowerCase() &&
          nichos.some((x) => x.label.toLowerCase() === novoLabel.toLowerCase())
        ) {
          return -1;
        }
        const afetados = novoLabel && novoLabel !== oldLabel
          ? clientes.filter((c) => c.nicho === oldLabel).length
          : 0;
        set((s) => ({
          nichos: s.nichos.map((n) =>
            n.label === oldLabel ? { ...n, ...patch, label: novoLabel ?? n.label } : n
          ),
          clientes: novoLabel && novoLabel !== oldLabel
            ? s.clientes.map((c) => (c.nicho === oldLabel ? { ...c, nicho: novoLabel } : c))
            : s.clientes,
        }));
        return afetados;
      },
      deleteNicho: (label) => {
        const { clientes } = get();
        const afetados = clientes.filter((c) => c.nicho === label).length;
        set((s) => ({
          nichos: s.nichos.filter((n) => n.label !== label),
          clientes: s.clientes.map((c) => (c.nicho === label ? { ...c, nicho: "" } : c)),
        }));
        return afetados;
      },

      addStatusOption: (opt) => {
        const label = opt.label.trim();
        if (!label) return false;
        const { statusOptions } = get();
        if (statusOptions.some((x) => x.label.toLowerCase() === label.toLowerCase())) return false;
        set((s) => ({ statusOptions: [...s.statusOptions, { ...opt, label }] }));
        return true;
      },
      updateStatusOption: (oldLabel, patch) => {
        const { statusOptions, clientes } = get();
        const novoLabel = patch.label?.trim();
        if (novoLabel !== undefined && !novoLabel) return -1;
        if (
          novoLabel &&
          novoLabel.toLowerCase() !== oldLabel.toLowerCase() &&
          statusOptions.some((x) => x.label.toLowerCase() === novoLabel.toLowerCase())
        ) {
          return -1;
        }
        const afetados = novoLabel && novoLabel !== oldLabel
          ? clientes.filter((c) => c.status_cliente === oldLabel).length
          : 0;
        set((s) => ({
          statusOptions: s.statusOptions.map((o) =>
            o.label === oldLabel ? { ...o, ...patch, label: novoLabel ?? o.label } : o
          ),
          clientes: novoLabel && novoLabel !== oldLabel
            ? s.clientes.map((c) =>
                c.status_cliente === oldLabel ? { ...c, status_cliente: novoLabel as StatusCliente } : c
              )
            : s.clientes,
        }));
        return afetados;
      },
      deleteStatusOption: (label) => {
        const { clientes, statusOptions } = get();
        const afetados = clientes.filter((c) => c.status_cliente === label).length;
        const fallback = statusOptions.find((s) => s.label !== label)?.label ?? "Pausado";
        set((s) => ({
          statusOptions: s.statusOptions.filter((o) => o.label !== label),
          clientes: s.clientes.map((c) =>
            c.status_cliente === label ? { ...c, status_cliente: fallback as StatusCliente } : c
          ),
        }));
        return afetados;
      },
    }),
    { name: "crm-juridico-v5" }
  )
);
