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
      cards: {
        Row: {
          cliente_id: string
          created_at: string
          data_agendada: string | null
          descricao: string | null
          id: string
          posicao: number
          responsaveis_ids: string[]
          status: Database["public"]["Enums"]["status_card"]
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_agendada?: string | null
          descricao?: string | null
          id?: string
          posicao?: number
          responsaveis_ids?: string[]
          status?: Database["public"]["Enums"]["status_card"]
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_agendada?: string | null
          descricao?: string | null
          id?: string
          posicao?: number
          responsaveis_ids?: string[]
          status?: Database["public"]["Enums"]["status_card"]
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
      clientes: {
        Row: {
          campos_personalizados: Json
          created_at: string
          descricao: string | null
          id: string
          logo_url: string | null
          nicho: string | null
          nome: string
          responsaveis_ids: string[]
          status: Database["public"]["Enums"]["status_cliente"]
          updated_at: string
        }
        Insert: {
          campos_personalizados?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nicho?: string | null
          nome: string
          responsaveis_ids?: string[]
          status?: Database["public"]["Enums"]["status_cliente"]
          updated_at?: string
        }
        Update: {
          campos_personalizados?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nicho?: string | null
          nome?: string
          responsaveis_ids?: string[]
          status?: Database["public"]["Enums"]["status_cliente"]
          updated_at?: string
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
          status: Database["public"]["Enums"]["status_card"]
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
          status?: Database["public"]["Enums"]["status_card"]
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
          status?: Database["public"]["Enums"]["status_card"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
      status_card:
        | "ideias"
        | "producao"
        | "aprovacao"
        | "agendado"
        | "publicado"
        | "arquivado"
      status_cliente: "ativo" | "pausado" | "inativo"
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
      status_card: [
        "ideias",
        "producao",
        "aprovacao",
        "agendado",
        "publicado",
        "arquivado",
      ],
      status_cliente: ["ativo", "pausado", "inativo"],
    },
  },
} as const
