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
      cards: {
        Row: {
          cliente_id: string
          created_at: string
          data_agendada: string | null
          descricao: string | null
          id: string
          is_urgent: boolean
          posicao: number
          responsaveis_ids: string[]
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_agendada?: string | null
          descricao?: string | null
          id?: string
          is_urgent?: boolean
          posicao?: number
          responsaveis_ids?: string[]
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_agendada?: string | null
          descricao?: string | null
          id?: string
          is_urgent?: boolean
          posicao?: number
          responsaveis_ids?: string[]
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
      clientes: {
        Row: {
          campos_personalizados: Json
          created_at: string
          data_ativacao: string | null
          data_inicio_onboarding: string | null
          descricao: string | null
          id: string
          logo_url: string | null
          nicho: string | null
          nome: string
          prazo_onboarding: string | null
          primary_status: string
          responsaveis_ids: string[]
          status: string
          status_cliente: string
          updated_at: string
        }
        Insert: {
          campos_personalizados?: Json
          created_at?: string
          data_ativacao?: string | null
          data_inicio_onboarding?: string | null
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nicho?: string | null
          nome: string
          prazo_onboarding?: string | null
          primary_status?: string
          responsaveis_ids?: string[]
          status?: string
          status_cliente?: string
          updated_at?: string
        }
        Update: {
          campos_personalizados?: Json
          created_at?: string
          data_ativacao?: string | null
          data_inicio_onboarding?: string | null
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nicho?: string | null
          nome?: string
          prazo_onboarding?: string | null
          primary_status?: string
          responsaveis_ids?: string[]
          status?: string
          status_cliente?: string
          updated_at?: string
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
          aprovado_por: string | null
          categoria: Database["public"]["Enums"]["demanda_categoria"]
          cliente_id: string
          created_at: string
          criado_por: string | null
          data_conclusao: string | null
          data_inicio: string | null
          data_limite: string | null
          descricao: string | null
          id: string
          precisa_aprovacao: boolean
          prioridade: Database["public"]["Enums"]["demanda_prioridade"]
          responsaveis_ids: string[]
          responsavel_id: string | null
          status: Database["public"]["Enums"]["demanda_status"]
          subtipo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          aprovado_por?: string | null
          categoria?: Database["public"]["Enums"]["demanda_categoria"]
          cliente_id: string
          created_at?: string
          criado_por?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_limite?: string | null
          descricao?: string | null
          id?: string
          precisa_aprovacao?: boolean
          prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          responsaveis_ids?: string[]
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["demanda_status"]
          subtipo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          aprovado_por?: string | null
          categoria?: Database["public"]["Enums"]["demanda_categoria"]
          cliente_id?: string
          created_at?: string
          criado_por?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_limite?: string | null
          descricao?: string | null
          id?: string
          precisa_aprovacao?: boolean
          prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          responsaveis_ids?: string[]
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["demanda_status"]
          subtipo?: string | null
          titulo?: string
          updated_at?: string
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
      posts: {
        Row: {
          anexos: Json
          card_id: string
          comentarios: Json
          created_at: string
          formato: string | null
          id: string
          legenda: string | null
          status: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          anexos?: Json
          card_id: string
          comentarios?: Json
          created_at?: string
          formato?: string | null
          id?: string
          legenda?: string | null
          status?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          anexos?: Json
          card_id?: string
          comentarios?: Json
          created_at?: string
          formato?: string | null
          id?: string
          legenda?: string | null
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
      [_ in never]: never
    }
    Functions: {
      can_write: { Args: { _user_id: string }; Returns: boolean }
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
      app_role: "admin" | "editor" | "viewer"
      demanda_categoria:
        | "Designer"
        | "EditorVideo"
        | "LandingPage"
        | "TrafegoPago"
        | "Tecnologia"
        | "Suporte"
        | "Personalizado"
      demanda_prioridade: "Baixa" | "Media" | "Alta" | "Urgente"
      demanda_status:
        | "Planejamento"
        | "Criar"
        | "Revisar"
        | "Entregue"
        | "Concluido"
        | "Atrasado"
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
      app_role: ["admin", "editor", "viewer"],
      demanda_categoria: [
        "Designer",
        "EditorVideo",
        "LandingPage",
        "TrafegoPago",
        "Tecnologia",
        "Suporte",
        "Personalizado",
      ],
      demanda_prioridade: ["Baixa", "Media", "Alta", "Urgente"],
      demanda_status: [
        "Planejamento",
        "Criar",
        "Revisar",
        "Entregue",
        "Concluido",
        "Atrasado",
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
