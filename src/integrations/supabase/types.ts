export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alertas: {
        Row: {
          cliente_id: string
          created_at: string
          data_alerta: string
          id: string
          mensagem: string
          status: Database["public"]["Enums"]["status_alerta"]
          tipo_alerta: Database["public"]["Enums"]["tipo_alerta"]
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_alerta?: string
          id?: string
          mensagem: string
          status?: Database["public"]["Enums"]["status_alerta"]
          tipo_alerta: Database["public"]["Enums"]["tipo_alerta"]
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_alerta?: string
          id?: string
          mensagem?: string
          status?: Database["public"]["Enums"]["status_alerta"]
          tipo_alerta?: Database["public"]["Enums"]["tipo_alerta"]
        }
        Relationships: [
          {
            foreignKeyName: "alertas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_metricas"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      anexos_demandas: {
        Row: {
          created_at: string
          demanda_id: string
          id: string
          mime: string | null
          nome: string
          size: number | null
          url: string
        }
        Insert: {
          created_at?: string
          demanda_id: string
          id?: string
          mime?: string | null
          nome: string
          size?: number | null
          url: string
        }
        Update: {
          created_at?: string
          demanda_id?: string
          id?: string
          mime?: string | null
          nome?: string
          size?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "anexos_demandas_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      ativacao_regras: {
        Row: {
          id: string
          modo_regra: string
          quantidade_minima: number
          requer_checklist: boolean
          requer_crm: boolean
          requer_gmn: boolean
          requer_google_ads: boolean
          requer_lp: boolean
          requer_meta_ads: boolean
          requer_posts: boolean
          requer_reuniao_performance: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          modo_regra?: string
          quantidade_minima?: number
          requer_checklist?: boolean
          requer_crm?: boolean
          requer_gmn?: boolean
          requer_google_ads?: boolean
          requer_lp?: boolean
          requer_meta_ads?: boolean
          requer_posts?: boolean
          requer_reuniao_performance?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          modo_regra?: string
          quantidade_minima?: number
          requer_checklist?: boolean
          requer_crm?: boolean
          requer_gmn?: boolean
          requer_google_ads?: boolean
          requer_lp?: boolean
          requer_meta_ads?: boolean
          requer_posts?: boolean
          requer_reuniao_performance?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      atividade_cliente: {
        Row: {
          acao: string
          cliente_id: string
          created_at: string
          descricao: string | null
          id: string
          payload: Json
          referencia_id: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          cliente_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          payload?: Json
          referencia_id?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          cliente_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          payload?: Json
          referencia_id?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      aulas: {
        Row: {
          anexo_nome: string | null
          anexo_url: string | null
          categoria: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          ordem: number
          thumbnail_url: string | null
          tipo_video: string
          titulo: string
          updated_at: string
          video_url: string
        }
        Insert: {
          anexo_nome?: string | null
          anexo_url?: string | null
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          ordem?: number
          thumbnail_url?: string | null
          tipo_video?: string
          titulo: string
          updated_at?: string
          video_url: string
        }
        Update: {
          anexo_nome?: string | null
          anexo_url?: string | null
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          ordem?: number
          thumbnail_url?: string | null
          tipo_video?: string
          titulo?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      cadencia_execucoes: {
        Row: {
          acao: string
          cadencia_id: string
          created_at: string
          etapa: number
          executado_em: string
          executado_por: string | null
          id: string
          observacao: string | null
        }
        Insert: {
          acao: string
          cadencia_id: string
          created_at?: string
          etapa: number
          executado_em?: string
          executado_por?: string | null
          id?: string
          observacao?: string | null
        }
        Update: {
          acao?: string
          cadencia_id?: string
          created_at?: string
          etapa?: number
          executado_em?: string
          executado_por?: string | null
          id?: string
          observacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cadencia_execucoes_cadencia_id_fkey"
            columns: ["cadencia_id"]
            isOneToOne: false
            referencedRelation: "cadencias_operacionais"
            referencedColumns: ["id"]
          },
        ]
      }
      cadencia_mensagens: {
        Row: {
          ativo: boolean
          created_at: string
          etapa: number
          id: string
          mensagem: string
          ordem: number
          setor: string | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          etapa: number
          id?: string
          mensagem?: string
          ordem?: number
          setor?: string | null
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          etapa?: number
          id?: string
          mensagem?: string
          ordem?: number
          setor?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      cadencias_operacionais: {
        Row: {
          cliente_id: string
          created_at: string
          criado_por: string | null
          etapa_atual: number
          id: string
          observacao: string | null
          proxima_acao_em: string | null
          responsavel_id: string | null
          status: string
          task_id: string | null
          tipo: string
          ultima_acao_em: string | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          criado_por?: string | null
          etapa_atual?: number
          id?: string
          observacao?: string | null
          proxima_acao_em?: string | null
          responsavel_id?: string | null
          status?: string
          task_id?: string | null
          tipo: string
          ultima_acao_em?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          criado_por?: string | null
          etapa_atual?: number
          id?: string
          observacao?: string | null
          proxima_acao_em?: string | null
          responsavel_id?: string | null
          status?: string
          task_id?: string | null
          tipo?: string
          ultima_acao_em?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      card_pai: {
        Row: {
          cliente_id: string
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          responsaveis_ids: string[]
          status_geral: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          responsaveis_ids?: string[]
          status_geral?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          responsaveis_ids?: string[]
          status_geral?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      card_pai_etapas: {
        Row: {
          card_pai_id: string
          categoria_alvo: string | null
          concluido: boolean
          concluido_em: string | null
          created_at: string
          demanda_id: string | null
          depends_on_etapa_id: string | null
          id: string
          liberado: boolean
          ordem: number
          responsavel_id: string | null
          status_interno_valor: string | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          card_pai_id: string
          categoria_alvo?: string | null
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          demanda_id?: string | null
          depends_on_etapa_id?: string | null
          id?: string
          liberado?: boolean
          ordem?: number
          responsavel_id?: string | null
          status_interno_valor?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          card_pai_id?: string
          categoria_alvo?: string | null
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          demanda_id?: string | null
          depends_on_etapa_id?: string | null
          id?: string
          liberado?: boolean
          ordem?: number
          responsavel_id?: string | null
          status_interno_valor?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_pai_etapas_card_pai_id_fkey"
            columns: ["card_pai_id"]
            isOneToOne: false
            referencedRelation: "card_pai"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          approval_previous_status: string | null
          approval_waiting_by: string | null
          approval_waiting_since: string | null
          cliente_id: string
          created_at: string
          data_agendada: string | null
          data_inicio_tarefa: string | null
          data_limite_tarefa: string | null
          data_postagem: string | null
          descricao: string | null
          formato: string | null
          id: string
          is_urgent: boolean
          posicao: number
          qtd_slides: number | null
          responsaveis_ids: string[]
          responsaveis_postagem_ids: string[]
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          approval_previous_status?: string | null
          approval_waiting_by?: string | null
          approval_waiting_since?: string | null
          cliente_id: string
          created_at?: string
          data_agendada?: string | null
          data_inicio_tarefa?: string | null
          data_limite_tarefa?: string | null
          data_postagem?: string | null
          descricao?: string | null
          formato?: string | null
          id?: string
          is_urgent?: boolean
          posicao?: number
          qtd_slides?: number | null
          responsaveis_ids?: string[]
          responsaveis_postagem_ids?: string[]
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          approval_previous_status?: string | null
          approval_waiting_by?: string | null
          approval_waiting_since?: string | null
          cliente_id?: string
          created_at?: string
          data_agendada?: string | null
          data_inicio_tarefa?: string | null
          data_limite_tarefa?: string | null
          data_postagem?: string | null
          descricao?: string | null
          formato?: string | null
          id?: string
          is_urgent?: boolean
          posicao?: number
          qtd_slides?: number | null
          responsaveis_ids?: string[]
          responsaveis_postagem_ids?: string[]
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_metricas"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      cargos: {
        Row: {
          created_at: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      cliente_briefing: {
        Row: {
          atualizado_por: string | null
          blocos: Json
          cliente_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          atualizado_por?: string | null
          blocos?: Json
          cliente_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          atualizado_por?: string | null
          blocos?: Json
          cliente_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cliente_documentacao: {
        Row: {
          bloco: string
          cliente_id: string
          created_at: string
          data_envio: string | null
          data_evento: string | null
          enviado: boolean
          enviado_por: string | null
          formato: string | null
          id: string
          login: string | null
          observacao: string | null
          ordem: number
          origem_global_id: string | null
          senha: string | null
          tipo: string
          titulo: string
          updated_at: string
          url: string | null
        }
        Insert: {
          bloco?: string
          cliente_id: string
          created_at?: string
          data_envio?: string | null
          data_evento?: string | null
          enviado?: boolean
          enviado_por?: string | null
          formato?: string | null
          id?: string
          login?: string | null
          observacao?: string | null
          ordem?: number
          origem_global_id?: string | null
          senha?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          bloco?: string
          cliente_id?: string
          created_at?: string
          data_envio?: string | null
          data_evento?: string | null
          enviado?: boolean
          enviado_por?: string | null
          formato?: string | null
          id?: string
          login?: string | null
          observacao?: string | null
          ordem?: number
          origem_global_id?: string | null
          senha?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      cliente_planejamento_itens: {
        Row: {
          bloco: string
          cliente_id: string
          created_at: string
          descricao: string | null
          id: string
          observacao: string | null
          ordem: number
          prazo: string | null
          prioridade: string
          responsavel_id: string | null
          secao: string
          situacao: string
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          bloco: string
          cliente_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          observacao?: string | null
          ordem?: number
          prazo?: string | null
          prioridade?: string
          responsavel_id?: string | null
          secao?: string
          situacao?: string
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          bloco?: string
          cliente_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          observacao?: string | null
          ordem?: number
          prazo?: string | null
          prioridade?: string
          responsavel_id?: string | null
          secao?: string
          situacao?: string
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          campos_personalizados: Json
          created_at: string
          data_ativacao: string | null
          data_contratacao: string | null
          data_inicio_onboarding: string | null
          descricao: string | null
          id: string
          link_relatorio: string | null
          logo_url: string | null
          nicho: string | null
          nicho_extra: string | null
          nome: string
          oculto: boolean
          oculto_em: string | null
          plano: string | null
          prazo_onboarding: string | null
          primary_status: string
          responsaveis_ids: string[]
          status: string
          status_cliente: string
          status_performance: string | null
          status_relacionamento: string | null
          updated_at: string
          valor_venda: number | null
        }
        Insert: {
          campos_personalizados?: Json
          created_at?: string
          data_ativacao?: string | null
          data_contratacao?: string | null
          data_inicio_onboarding?: string | null
          descricao?: string | null
          id?: string
          link_relatorio?: string | null
          logo_url?: string | null
          nicho?: string | null
          nicho_extra?: string | null
          nome: string
          oculto?: boolean
          oculto_em?: string | null
          plano?: string | null
          prazo_onboarding?: string | null
          primary_status?: string
          responsaveis_ids?: string[]
          status?: string
          status_cliente?: string
          status_performance?: string | null
          status_relacionamento?: string | null
          updated_at?: string
          valor_venda?: number | null
        }
        Update: {
          campos_personalizados?: Json
          created_at?: string
          data_ativacao?: string | null
          data_contratacao?: string | null
          data_inicio_onboarding?: string | null
          descricao?: string | null
          id?: string
          link_relatorio?: string | null
          logo_url?: string | null
          nicho?: string | null
          nicho_extra?: string | null
          nome?: string
          oculto?: boolean
          oculto_em?: string | null
          plano?: string | null
          prazo_onboarding?: string | null
          primary_status?: string
          responsaveis_ids?: string[]
          status?: string
          status_cliente?: string
          status_performance?: string | null
          status_relacionamento?: string | null
          updated_at?: string
          valor_venda?: number | null
        }
        Relationships: []
      }
      colunas_cliente: {
        Row: {
          cor: string | null
          created_at: string
          fixa: boolean
          fixada: boolean
          id: string
          key: string
          label: string
          largura: number
          oculta: boolean
          opcoes: Json
          ordem: number
          tipo: Database["public"]["Enums"]["tipo_coluna"]
        }
        Insert: {
          cor?: string | null
          created_at?: string
          fixa?: boolean
          fixada?: boolean
          id?: string
          key: string
          label: string
          largura?: number
          oculta?: boolean
          opcoes?: Json
          ordem?: number
          tipo?: Database["public"]["Enums"]["tipo_coluna"]
        }
        Update: {
          cor?: string | null
          created_at?: string
          fixa?: boolean
          fixada?: boolean
          id?: string
          key?: string
          label?: string
          largura?: number
          oculta?: boolean
          opcoes?: Json
          ordem?: number
          tipo?: Database["public"]["Enums"]["tipo_coluna"]
        }
        Relationships: []
      }
      comentarios: {
        Row: {
          cliente_id: string | null
          comentario_texto: string
          created_at: string
          id: string
          imagem_url: string | null
          post_id: string | null
          usuario_id: string
        }
        Insert: {
          cliente_id?: string | null
          comentario_texto: string
          created_at?: string
          id?: string
          imagem_url?: string | null
          post_id?: string | null
          usuario_id: string
        }
        Update: {
          cliente_id?: string | null
          comentario_texto?: string
          created_at?: string
          id?: string
          imagem_url?: string | null
          post_id?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_metricas"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "comentarios_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios_demandas: {
        Row: {
          created_at: string
          demanda_id: string
          id: string
          imagem_url: string | null
          texto: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          demanda_id: string
          id?: string
          imagem_url?: string | null
          texto: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          demanda_id?: string
          id?: string
          imagem_url?: string | null
          texto?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_demandas_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_delegacao: {
        Row: {
          created_at: string | null
          id: string
          prazo_padrao_dias: number | null
          responsavel_padrao_id: string | null
          tipos_sugestao_automatica: string[] | null
          updated_at: string | null
          usuarios_autorizados_ids: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          prazo_padrao_dias?: number | null
          responsavel_padrao_id?: string | null
          tipos_sugestao_automatica?: string[] | null
          updated_at?: string | null
          usuarios_autorizados_ids?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          prazo_padrao_dias?: number | null
          responsavel_padrao_id?: string | null
          tipos_sugestao_automatica?: string[] | null
          updated_at?: string | null
          usuarios_autorizados_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_delegacao_responsavel_padrao_id_fkey"
            columns: ["responsavel_padrao_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cliente_id: string
          created_at: string
          data_fim: string
          data_inicio: string
          id: string
          posts_concluidos: number
          status: Database["public"]["Enums"]["status_contrato"]
          total_posts: number
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_fim: string
          data_inicio: string
          id?: string
          posts_concluidos?: number
          status?: Database["public"]["Enums"]["status_contrato"]
          total_posts?: number
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          posts_concluidos?: number
          status?: Database["public"]["Enums"]["status_contrato"]
          total_posts?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_metricas"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string
          escopo: Database["public"]["Enums"]["escopo_custom_field"]
          id: string
          nome: string
          opcoes: Json
          ordem: number
          tipo: Database["public"]["Enums"]["tipo_custom_field"]
        }
        Insert: {
          created_at?: string
          escopo: Database["public"]["Enums"]["escopo_custom_field"]
          id?: string
          nome: string
          opcoes?: Json
          ordem?: number
          tipo: Database["public"]["Enums"]["tipo_custom_field"]
        }
        Update: {
          created_at?: string
          escopo?: Database["public"]["Enums"]["escopo_custom_field"]
          id?: string
          nome?: string
          opcoes?: Json
          ordem?: number
          tipo?: Database["public"]["Enums"]["tipo_custom_field"]
        }
        Relationships: []
      }
      delegacoes_reuniao: {
        Row: {
          cliente_id: string
          created_at: string | null
          criado_por: string | null
          id: string
          observacoes: string | null
          prazo: string | null
          responsavel_id: string
          reuniao_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          criado_por?: string | null
          id?: string
          observacoes?: string | null
          prazo?: string | null
          responsavel_id: string
          reuniao_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          criado_por?: string | null
          id?: string
          observacoes?: string | null
          prazo?: string | null
          responsavel_id?: string
          reuniao_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delegacoes_reuniao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegacoes_reuniao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_metricas"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "delegacoes_reuniao_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegacoes_reuniao_reuniao_id_fkey"
            columns: ["reuniao_id"]
            isOneToOne: true
            referencedRelation: "reunioes"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_categorias_custom: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          id: string
          label: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          label: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          label?: string
          ordem?: number
        }
        Relationships: []
      }
      demanda_prioridades_custom: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          id: string
          label: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          label: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          label?: string
          ordem?: number
        }
        Relationships: []
      }
      demanda_status_custom: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          id: string
          label: string
          ordem: number
          protegido: boolean
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          label: string
          ordem?: number
          protegido?: boolean
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          label?: string
          ordem?: number
          protegido?: boolean
        }
        Relationships: []
      }
      demandas: {
        Row: {
          apoio: string | null
          approval_previous_status: string | null
          approval_waiting_by: string | null
          approval_waiting_since: string | null
          aprovado_por: string | null
          card_pai_id: string | null
          categoria: Database["public"]["Enums"]["demanda_categoria"]
          checklist: string | null
          cliente_id: string
          created_at: string
          criado_por: string | null
          data_conclusao: string | null
          data_inicio: string | null
          data_limite: string | null
          descricao: string | null
          entregavel_esperado: string | null
          id: string
          is_card_pai: boolean
          is_parent: boolean | null
          justificativa_atribuicao: string | null
          link_drive: string | null
          link_meister: string | null
          marcado_ja_possui: boolean
          origem: string
          origem_reuniao_id: string | null
          origem_sugestao_id: string | null
          parent_id: string | null
          parent_process_id: string | null
          precisa_aprovacao: boolean
          prioridade: Database["public"]["Enums"]["demanda_prioridade"]
          process_depends_on: string | null
          process_step_config: Json
          process_step_order: number | null
          process_step_status: string | null
          process_step_type: string | null
          responsaveis_ids: string[]
          responsavel_id: string | null
          status: Database["public"]["Enums"]["demanda_status"]
          status_motivo: string | null
          subtipo: string | null
          supervisor_id: string | null
          template_id: string | null
          template_type: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          apoio?: string | null
          approval_previous_status?: string | null
          approval_waiting_by?: string | null
          approval_waiting_since?: string | null
          aprovado_por?: string | null
          card_pai_id?: string | null
          categoria?: Database["public"]["Enums"]["demanda_categoria"]
          checklist?: string | null
          cliente_id: string
          created_at?: string
          criado_por?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_limite?: string | null
          descricao?: string | null
          entregavel_esperado?: string | null
          id?: string
          is_card_pai?: boolean
          is_parent?: boolean | null
          justificativa_atribuicao?: string | null
          link_drive?: string | null
          link_meister?: string | null
          marcado_ja_possui?: boolean
          origem?: string
          origem_reuniao_id?: string | null
          origem_sugestao_id?: string | null
          parent_id?: string | null
          parent_process_id?: string | null
          precisa_aprovacao?: boolean
          prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          process_depends_on?: string | null
          process_step_config?: Json
          process_step_order?: number | null
          process_step_status?: string | null
          process_step_type?: string | null
          responsaveis_ids?: string[]
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["demanda_status"]
          status_motivo?: string | null
          subtipo?: string | null
          supervisor_id?: string | null
          template_id?: string | null
          template_type?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          apoio?: string | null
          approval_previous_status?: string | null
          approval_waiting_by?: string | null
          approval_waiting_since?: string | null
          aprovado_por?: string | null
          card_pai_id?: string | null
          categoria?: Database["public"]["Enums"]["demanda_categoria"]
          checklist?: string | null
          cliente_id?: string
          created_at?: string
          criado_por?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_limite?: string | null
          descricao?: string | null
          entregavel_esperado?: string | null
          id?: string
          is_card_pai?: boolean
          is_parent?: boolean | null
          justificativa_atribuicao?: string | null
          link_drive?: string | null
          link_meister?: string | null
          marcado_ja_possui?: boolean
          origem?: string
          origem_reuniao_id?: string | null
          origem_sugestao_id?: string | null
          parent_id?: string | null
          parent_process_id?: string | null
          precisa_aprovacao?: boolean
          prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          process_depends_on?: string | null
          process_step_config?: Json
          process_step_order?: number | null
          process_step_status?: string | null
          process_step_type?: string | null
          responsaveis_ids?: string[]
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["demanda_status"]
          status_motivo?: string | null
          subtipo?: string | null
          supervisor_id?: string | null
          template_id?: string | null
          template_type?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_parent_process_id_fkey"
            columns: ["parent_process_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_process_depends_on_fkey"
            columns: ["process_depends_on"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_globais: {
        Row: {
          aplicar_automatico: boolean
          arquivo_url: string | null
          ativo: boolean
          bloco: string
          categoria: string
          created_at: string
          descricao: string | null
          escopo: string
          id: string
          login: string | null
          observacao_interna: string | null
          ordem: number
          permissao_acesso: string
          senha: string | null
          tipo: string
          titulo: string
          updated_at: string
          url: string | null
        }
        Insert: {
          aplicar_automatico?: boolean
          arquivo_url?: string | null
          ativo?: boolean
          bloco?: string
          categoria?: string
          created_at?: string
          descricao?: string | null
          escopo?: string
          id?: string
          login?: string | null
          observacao_interna?: string | null
          ordem?: number
          permissao_acesso?: string
          senha?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          aplicar_automatico?: boolean
          arquivo_url?: string | null
          ativo?: boolean
          bloco?: string
          categoria?: string
          created_at?: string
          descricao?: string | null
          escopo?: string
          id?: string
          login?: string | null
          observacao_interna?: string | null
          ordem?: number
          permissao_acesso?: string
          senha?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      historico_demandas: {
        Row: {
          acao: string
          created_at: string
          de_status: Database["public"]["Enums"]["demanda_status"] | null
          demanda_id: string
          id: string
          para_status: Database["public"]["Enums"]["demanda_status"] | null
          payload: Json
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          de_status?: Database["public"]["Enums"]["demanda_status"] | null
          demanda_id: string
          id?: string
          para_status?: Database["public"]["Enums"]["demanda_status"] | null
          payload?: Json
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          de_status?: Database["public"]["Enums"]["demanda_status"] | null
          demanda_id?: string
          id?: string
          para_status?: Database["public"]["Enums"]["demanda_status"] | null
          payload?: Json
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_demandas_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_agentes: {
        Row: {
          ativo: boolean
          contexto_adicional: string | null
          created_at: string
          id: string
          model: string | null
          nome: string
          prompt: string
          provider: string
          regras_categorizacao: string | null
          regras_responsaveis: string | null
          temperatura: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          contexto_adicional?: string | null
          created_at?: string
          id?: string
          model?: string | null
          nome: string
          prompt?: string
          provider: string
          regras_categorizacao?: string | null
          regras_responsaveis?: string | null
          temperatura?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          contexto_adicional?: string | null
          created_at?: string
          id?: string
          model?: string | null
          nome?: string
          prompt?: string
          provider?: string
          regras_categorizacao?: string | null
          regras_responsaveis?: string | null
          temperatura?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      ia_config: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          latency_ms: number | null
          model: string | null
          modelos_disponiveis: Json | null
          provider: string
          ultima_verificacao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          modelos_disponiveis?: Json | null
          provider: string
          ultima_verificacao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          modelos_disponiveis?: Json | null
          provider?: string
          ultima_verificacao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ia_logs: {
        Row: {
          cliente_id: string | null
          created_at: string
          criado_por: string | null
          custo: number | null
          demanda_id: string | null
          error_message: string | null
          id: string
          input_resumo: string | null
          latency_ms: number | null
          modelo: string | null
          provider: string | null
          reuniao_id: string | null
          source_module: string | null
          status: string | null
          tipo: string
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          criado_por?: string | null
          custo?: number | null
          demanda_id?: string | null
          error_message?: string | null
          id?: string
          input_resumo?: string | null
          latency_ms?: number | null
          modelo?: string | null
          provider?: string | null
          reuniao_id?: string | null
          source_module?: string | null
          status?: string | null
          tipo: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          criado_por?: string | null
          custo?: number | null
          demanda_id?: string | null
          error_message?: string | null
          id?: string
          input_resumo?: string | null
          latency_ms?: number | null
          modelo?: string | null
          provider?: string | null
          reuniao_id?: string | null
          source_module?: string | null
          status?: string | null
          tipo?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: []
      }
      ia_prompts: {
        Row: {
          ativo: boolean
          conteudo: string
          created_at: string
          id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          conteudo?: string
          created_at?: string
          id?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          conteudo?: string
          created_at?: string
          id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      ia_setor_prompts: {
        Row: {
          created_at: string | null
          id: string
          prompt: string
          setor: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          prompt: string
          setor: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          prompt?: string
          setor?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ia_tarefa_consultas: {
        Row: {
          created_at: string | null
          demanda_id: string
          fontes: Json | null
          id: string
          nivel_confianca: string | null
          pergunta: string
          resposta: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          demanda_id: string
          fontes?: Json | null
          id?: string
          nivel_confianca?: string | null
          pergunta: string
          resposta: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          demanda_id?: string
          fontes?: Json | null
          id?: string
          nivel_confianca?: string | null
          pergunta?: string
          resposta?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      meeting_tasks: {
        Row: {
          assigned_to: string | null
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          meeting_id: string
          project_id: string | null
          status: string
          task_id: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_id: string
          project_id?: string | null
          status?: string
          task_id?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string
          project_id?: string | null
          status?: string
          task_id?: string | null
          title?: string
        }
        Relationships: []
      }
      modelos_colunas: {
        Row: {
          colunas: Json
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          colunas?: Json
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          colunas?: Json
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      nichos: {
        Row: {
          cor: string
          created_at: string
          id: string
          label: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          label: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      operational_flow_steps: {
        Row: {
          categoria: string
          created_at: string | null
          depends_on_step_id: string | null
          flow_id: string | null
          id: string
          modo_liberacao: string | null
          nome: string
          ordem: number | null
          prioridade: string | null
          responsavel_padrao_id: string | null
          subtipo: string | null
        }
        Insert: {
          categoria: string
          created_at?: string | null
          depends_on_step_id?: string | null
          flow_id?: string | null
          id?: string
          modo_liberacao?: string | null
          nome: string
          ordem?: number | null
          prioridade?: string | null
          responsavel_padrao_id?: string | null
          subtipo?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          depends_on_step_id?: string | null
          flow_id?: string | null
          id?: string
          modo_liberacao?: string | null
          nome?: string
          ordem?: number | null
          prioridade?: string | null
          responsavel_padrao_id?: string | null
          subtipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_flow_steps_depends_on_step_id_fkey"
            columns: ["depends_on_step_id"]
            isOneToOne: false
            referencedRelation: "operational_flow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "operational_flow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_flow_templates: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      operational_templates: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          depends_on_template_id: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number
          permite_dependencia: boolean
          prioridade: Database["public"]["Enums"]["demanda_prioridade"]
          responsavel_padrao_id: string | null
          status_inicial: Database["public"]["Enums"]["demanda_status"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          depends_on_template_id?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          permite_dependencia?: boolean
          prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          responsavel_padrao_id?: string | null
          status_inicial?: Database["public"]["Enums"]["demanda_status"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          depends_on_template_id?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          permite_dependencia?: boolean
          prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          responsavel_padrao_id?: string | null
          status_inicial?: Database["public"]["Enums"]["demanda_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_templates_depends_on_template_id_fkey"
            columns: ["depends_on_template_id"]
            isOneToOne: false
            referencedRelation: "operational_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          anexos: Json
          card_id: string
          comentarios: Json
          created_at: string
          data_agendamento: string | null
          data_postagem: string | null
          formato: string | null
          id: string
          legenda: string | null
          link_meister: string | null
          link_post: string | null
          status: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          anexos?: Json
          card_id: string
          comentarios?: Json
          created_at?: string
          data_agendamento?: string | null
          data_postagem?: string | null
          formato?: string | null
          id?: string
          legenda?: string | null
          link_meister?: string | null
          link_post?: string | null
          status?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          anexos?: Json
          card_id?: string
          comentarios?: Json
          created_at?: string
          data_agendamento?: string | null
          data_postagem?: string | null
          formato?: string | null
          id?: string
          legenda?: string | null
          link_meister?: string | null
          link_post?: string | null
          status?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cargo: string | null
          created_at: string
          email: string
          id: string
          nome: string | null
          responsavel_id: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email: string
          id: string
          nome?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          archived: boolean | null
          author_id: string | null
          category: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          pinned: boolean | null
          priority: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean | null
          author_id?: string | null
          category?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          pinned?: boolean | null
          priority?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean | null
          author_id?: string | null
          category?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          pinned?: boolean | null
          priority?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes_metricas"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      responsabilidades_equipe: {
        Row: {
          areas: string[]
          cargo: string | null
          checklist_padrao: string | null
          created_at: string
          demandas_ia: string | null
          entregaveis_esperados: string | null
          ferramentas_utilizadas: string | null
          funcao_principal: string | null
          id: string
          observacoes: string | null
          observacoes_ia: string | null
          palavras_chave_ia: string | null
          prazo_padrao_sugerido: string | null
          prioridade_padrao: string | null
          profile_id: string
          quando_acionar: string | null
          quando_nao_acionar: string | null
          regras_atribuicao: Json | null
          regras_prioridade: string | null
          responsabilidades: string | null
          responsabilidades_fixas: string | null
          setores: string[]
          setores_areas_texto: string | null
          setores_compativeis: string[] | null
          skills: string[]
          skills_competencias_texto: string | null
          status: string | null
          supervisor_padrao_id: string | null
          tarefas_diarias: string | null
          tarefas_semanais: string | null
          tipos_participacao: string[] | null
          updated_at: string
        }
        Insert: {
          areas?: string[]
          cargo?: string | null
          checklist_padrao?: string | null
          created_at?: string
          demandas_ia?: string | null
          entregaveis_esperados?: string | null
          ferramentas_utilizadas?: string | null
          funcao_principal?: string | null
          id?: string
          observacoes?: string | null
          observacoes_ia?: string | null
          palavras_chave_ia?: string | null
          prazo_padrao_sugerido?: string | null
          prioridade_padrao?: string | null
          profile_id: string
          quando_acionar?: string | null
          quando_nao_acionar?: string | null
          regras_atribuicao?: Json | null
          regras_prioridade?: string | null
          responsabilidades?: string | null
          responsabilidades_fixas?: string | null
          setores?: string[]
          setores_areas_texto?: string | null
          setores_compativeis?: string[] | null
          skills?: string[]
          skills_competencias_texto?: string | null
          status?: string | null
          supervisor_padrao_id?: string | null
          tarefas_diarias?: string | null
          tarefas_semanais?: string | null
          tipos_participacao?: string[] | null
          updated_at?: string
        }
        Update: {
          areas?: string[]
          cargo?: string | null
          checklist_padrao?: string | null
          created_at?: string
          demandas_ia?: string | null
          entregaveis_esperados?: string | null
          ferramentas_utilizadas?: string | null
          funcao_principal?: string | null
          id?: string
          observacoes?: string | null
          observacoes_ia?: string | null
          palavras_chave_ia?: string | null
          prazo_padrao_sugerido?: string | null
          prioridade_padrao?: string | null
          profile_id?: string
          quando_acionar?: string | null
          quando_nao_acionar?: string | null
          regras_atribuicao?: Json | null
          regras_prioridade?: string | null
          responsabilidades?: string | null
          responsabilidades_fixas?: string | null
          setores?: string[]
          setores_areas_texto?: string | null
          setores_compativeis?: string[] | null
          skills?: string[]
          skills_competencias_texto?: string | null
          status?: string | null
          supervisor_padrao_id?: string | null
          tarefas_diarias?: string | null
          tarefas_semanais?: string | null
          tipos_participacao?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      responsaveis: {
        Row: {
          avatar_url: string | null
          cor: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          permissao: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          avatar_url?: string | null
          cor?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          permissao?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          avatar_url?: string | null
          cor?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          permissao?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      reunioes: {
        Row: {
          analise_iniciada_em: string | null
          analise_iniciada_por: string | null
          cliente_id: string
          created_at: string
          criado_por: string | null
          data: string
          delegada_em: string | null
          delegada_por: string | null
          gerar_alerta_delegacao: boolean | null
          ia_processed_at: string | null
          ia_status: Json
          id: string
          link_tldv: string | null
          motivo_nao_realizada: string | null
          observacoes: string | null
          observacoes_delegacao: string | null
          post_status: string | null
          prazo_delegacao: string | null
          project_id: string | null
          qtd_tarefas_delegadas: number | null
          responsavel_delegacao_id: string | null
          responsavel_id: string | null
          resumo_cliente: string | null
          resumo_tarefas: string | null
          status: string
          temperatura_cliente: string | null
          tipo: string | null
          titulo: string
          transcricao: string | null
          updated_at: string
        }
        Insert: {
          analise_iniciada_em?: string | null
          analise_iniciada_por?: string | null
          cliente_id: string
          created_at?: string
          criado_por?: string | null
          data?: string
          delegada_em?: string | null
          delegada_por?: string | null
          gerar_alerta_delegacao?: boolean | null
          ia_processed_at?: string | null
          ia_status?: Json
          id?: string
          link_tldv?: string | null
          motivo_nao_realizada?: string | null
          observacoes?: string | null
          observacoes_delegacao?: string | null
          post_status?: string | null
          prazo_delegacao?: string | null
          project_id?: string | null
          qtd_tarefas_delegadas?: number | null
          responsavel_delegacao_id?: string | null
          responsavel_id?: string | null
          resumo_cliente?: string | null
          resumo_tarefas?: string | null
          status?: string
          temperatura_cliente?: string | null
          tipo?: string | null
          titulo: string
          transcricao?: string | null
          updated_at?: string
        }
        Update: {
          analise_iniciada_em?: string | null
          analise_iniciada_por?: string | null
          cliente_id?: string
          created_at?: string
          criado_por?: string | null
          data?: string
          delegada_em?: string | null
          delegada_por?: string | null
          gerar_alerta_delegacao?: boolean | null
          ia_processed_at?: string | null
          ia_status?: Json
          id?: string
          link_tldv?: string | null
          motivo_nao_realizada?: string | null
          observacoes?: string | null
          observacoes_delegacao?: string | null
          post_status?: string | null
          prazo_delegacao?: string | null
          project_id?: string | null
          qtd_tarefas_delegadas?: number | null
          responsavel_delegacao_id?: string | null
          responsavel_id?: string | null
          resumo_cliente?: string | null
          resumo_tarefas?: string | null
          status?: string
          temperatura_cliente?: string | null
          tipo?: string | null
          titulo?: string
          transcricao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_responsavel_delegacao_id_fkey"
            columns: ["responsavel_delegacao_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      status_motivo_cliente_custom: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          label: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          label: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          label?: string
          ordem?: number
        }
        Relationships: []
      }
      status_motivo_interno_custom: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          label: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          label: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          label?: string
          ordem?: number
        }
        Relationships: []
      }
      status_options: {
        Row: {
          cor: string
          created_at: string
          id: string
          label: string
          ordem: number
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          label: string
          ordem?: number
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          label?: string
          ordem?: number
        }
        Relationships: []
      }
      status_post_options: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          id: string
          label: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          label: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          label?: string
          ordem?: number
        }
        Relationships: []
      }
      tarefas_sugeridas: {
        Row: {
          apoio: string | null
          aprovado_por: string | null
          categoria: string | null
          checklist: string | null
          cliente_id: string
          created_at: string
          criado_por: string | null
          demanda_id: string | null
          descricao: string | null
          entregavel_esperado: string | null
          id: string
          justificativa_atribuicao: string | null
          origem: string
          prazo_sugerido: string | null
          prioridade: string | null
          responsavel_sugerido_id: string | null
          reuniao_id: string | null
          status: string
          supervisor_sugerido_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          apoio?: string | null
          aprovado_por?: string | null
          categoria?: string | null
          checklist?: string | null
          cliente_id: string
          created_at?: string
          criado_por?: string | null
          demanda_id?: string | null
          descricao?: string | null
          entregavel_esperado?: string | null
          id?: string
          justificativa_atribuicao?: string | null
          origem?: string
          prazo_sugerido?: string | null
          prioridade?: string | null
          responsavel_sugerido_id?: string | null
          reuniao_id?: string | null
          status?: string
          supervisor_sugerido_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          apoio?: string | null
          aprovado_por?: string | null
          categoria?: string | null
          checklist?: string | null
          cliente_id?: string
          created_at?: string
          criado_por?: string | null
          demanda_id?: string | null
          descricao?: string | null
          entregavel_esperado?: string | null
          id?: string
          justificativa_atribuicao?: string | null
          origem?: string
          prazo_sugerido?: string | null
          prioridade?: string | null
          responsavel_sugerido_id?: string | null
          reuniao_id?: string | null
          status?: string
          supervisor_sugerido_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_sugeridas_supervisor_sugerido_id_fkey"
            columns: ["supervisor_sugerido_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          id: string
          liberado: boolean
          liberado_em: string | null
          liberado_por: string | null
          modo_liberacao: string
          task_id: string
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          id?: string
          liberado?: boolean
          liberado_em?: string | null
          liberado_por?: string | null
          modo_liberacao?: string
          task_id: string
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          id?: string
          liberado?: boolean
          liberado_em?: string | null
          liberado_por?: string | null
          modo_liberacao?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      task_meeting_summary_views: {
        Row: {
          created_at: string
          demanda_id: string
          first_viewed_at: string
          id: string
          last_viewed_at: string
          meeting_id: string | null
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          demanda_id: string
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          meeting_id?: string | null
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          created_at?: string
          demanda_id?: string
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          meeting_id?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      clientes_metricas: {
        Row: {
          cliente_id: string | null
          posts_atrasados: number | null
          posts_pendentes: number | null
          posts_postados: number | null
          tarefas_atrasadas: number | null
          tarefas_urgentes: number | null
        }
        Relationships: []
      }
      clientes_ultimo_comentario: {
        Row: {
          cliente_id: string | null
          comentario_id: string | null
          comentario_texto: string | null
          created_at: string | null
          usuario_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_metricas"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
    }
    Functions: {
      can_write: { Args: { _user_id: string }; Returns: boolean }
      current_responsavel_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      marcar_cards_atrasados: { Args: never; Returns: undefined }
      marcar_demandas_atrasadas: { Args: never; Returns: undefined }
      update_client_primary_status: {
        Args: { p_client_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer" | "super_admin"
      demanda_categoria:
        | "Designer"
        | "EditorVideo"
        | "LandingPage"
        | "TrafegoPago"
        | "Tecnologia"
        | "Suporte"
        | "Personalizado"
        | "IAAtendimento"
        | "Briefing"
        | "Planejamento"
        | "Operacional"
      demanda_prioridade: "Baixa" | "Media" | "Alta" | "Urgente"
      demanda_status:
        | "Planejamento"
        | "Criar"
        | "Revisar"
        | "Entregue"
        | "Concluido"
        | "Atrasado"
        | "Aguardando etapa anterior"
        | "Aguardando etapa interna"
        | "Aguardando ação do cliente"
        | "Aguardando aprovação do cliente"
        | "Agendado"
        | "Postado"
      escopo_custom_field: "cliente" | "post"
      status_alerta: "Pendente" | "Resolvido"
      status_card:
        | "ideias"
        | "producao"
        | "aprovacao"
        | "agendado"
        | "publicado"
        | "arquivado"
      status_cliente: "ativo" | "pausado" | "inativo"
      status_contrato: "Ativo" | "Renovacao" | "Finalizado"
      tipo_alerta: "Renovacao" | "Posts_Pendentes" | "Contrato_Finalizando"
      tipo_coluna:
        | "texto"
        | "numero"
        | "data"
        | "dropdown"
        | "responsaveis"
        | "link"
        | "status"
        | "etiqueta"
      tipo_custom_field:
        | "texto"
        | "numero"
        | "data"
        | "dropdown"
        | "link"
        | "lista_suspensa"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "viewer", "super_admin"],
      demanda_categoria: [
        "Designer",
        "EditorVideo",
        "LandingPage",
        "TrafegoPago",
        "Tecnologia",
        "Suporte",
        "Personalizado",
        "IAAtendimento",
        "Briefing",
        "Planejamento",
        "Operacional",
      ],
      demanda_prioridade: ["Baixa", "Media", "Alta", "Urgente"],
      demanda_status: [
        "Planejamento",
        "Criar",
        "Revisar",
        "Entregue",
        "Concluido",
        "Atrasado",
        "Aguardando etapa anterior",
        "Aguardando etapa interna",
        "Aguardando ação do cliente",
        "Aguardando aprovação do cliente",
        "Agendado",
        "Postado",
      ],
      escopo_custom_field: ["cliente", "post"],
      status_alerta: ["Pendente", "Resolvido"],
      status_card: [
        "ideias",
        "producao",
        "aprovacao",
        "agendado",
        "publicado",
        "arquivado",
      ],
      status_cliente: ["ativo", "pausado", "inativo"],
      status_contrato: ["Ativo", "Renovacao", "Finalizado"],
      tipo_alerta: ["Renovacao", "Posts_Pendentes", "Contrato_Finalizando"],
      tipo_coluna: [
        "texto",
        "numero",
        "data",
        "dropdown",
        "responsaveis",
        "link",
        "status",
        "etiqueta",
      ],
      tipo_custom_field: [
        "texto",
        "numero",
        "data",
        "dropdown",
        "link",
        "lista_suspensa",
      ],
    },
  },
} as const
