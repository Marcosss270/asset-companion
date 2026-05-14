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
          ativo_id: string | null
          consumivel_id: string | null
          created_at: string
          id: string
          mensagem: string | null
          status: Database["public"]["Enums"]["alerta_status"]
          tipo: Database["public"]["Enums"]["alerta_tipo"]
          titulo: string
        }
        Insert: {
          ativo_id?: string | null
          consumivel_id?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          status?: Database["public"]["Enums"]["alerta_status"]
          tipo: Database["public"]["Enums"]["alerta_tipo"]
          titulo: string
        }
        Update: {
          ativo_id?: string | null
          consumivel_id?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          status?: Database["public"]["Enums"]["alerta_status"]
          tipo?: Database["public"]["Enums"]["alerta_tipo"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_consumivel_id_fkey"
            columns: ["consumivel_id"]
            isOneToOne: false
            referencedRelation: "estoque_consumiveis"
            referencedColumns: ["id"]
          },
        ]
      }
      ativos: {
        Row: {
          categoria_id: string
          codigo_unico: string
          created_at: string
          created_by: string | null
          data_compra: string | null
          foto_url: string | null
          garantia_ate: string | null
          id: string
          localizacao: string | null
          marca: string | null
          modelo: string | null
          nome: string
          numero_serie: string | null
          observacoes: string | null
          responsavel: string | null
          status: Database["public"]["Enums"]["ativo_status"]
          updated_at: string
        }
        Insert: {
          categoria_id: string
          codigo_unico: string
          created_at?: string
          created_by?: string | null
          data_compra?: string | null
          foto_url?: string | null
          garantia_ate?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome: string
          numero_serie?: string | null
          observacoes?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["ativo_status"]
          updated_at?: string
        }
        Update: {
          categoria_id?: string
          codigo_unico?: string
          created_at?: string
          created_by?: string | null
          data_compra?: string | null
          foto_url?: string | null
          garantia_ate?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome?: string
          numero_serie?: string | null
          observacoes?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["ativo_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ativos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          codigo_prefixo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          codigo_prefixo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          codigo_prefixo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      codigo_sequencias: {
        Row: {
          ano: number
          prefixo: string
          ultimo_numero: number
        }
        Insert: {
          ano: number
          prefixo: string
          ultimo_numero?: number
        }
        Update: {
          ano?: number
          prefixo?: string
          ultimo_numero?: number
        }
        Relationships: []
      }
      estoque_consumiveis: {
        Row: {
          categoria: string | null
          created_at: string
          estoque_minimo: number
          id: string
          localizacao: string | null
          nome: string
          observacoes: string | null
          quantidade: number
          unidade: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          estoque_minimo?: number
          id?: string
          localizacao?: string | null
          nome: string
          observacoes?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          estoque_minimo?: number
          id?: string
          localizacao?: string | null
          nome?: string
          observacoes?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          ativo_id: string
          created_at: string
          descricao: string | null
          id: string
          localizacao_anterior: string | null
          localizacao_nova: string | null
          responsavel_anterior: string | null
          responsavel_novo: string | null
          status_anterior: Database["public"]["Enums"]["ativo_status"] | null
          status_novo: Database["public"]["Enums"]["ativo_status"] | null
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
          usuario_id: string | null
        }
        Insert: {
          ativo_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          localizacao_anterior?: string | null
          localizacao_nova?: string | null
          responsavel_anterior?: string | null
          responsavel_novo?: string | null
          status_anterior?: Database["public"]["Enums"]["ativo_status"] | null
          status_novo?: Database["public"]["Enums"]["ativo_status"] | null
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
          usuario_id?: string | null
        }
        Update: {
          ativo_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          localizacao_anterior?: string | null
          localizacao_nova?: string | null
          responsavel_anterior?: string | null
          responsavel_novo?: string | null
          status_anterior?: Database["public"]["Enums"]["ativo_status"] | null
          status_novo?: Database["public"]["Enums"]["ativo_status"] | null
          tipo?: Database["public"]["Enums"]["movimentacao_tipo"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
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
      gerar_codigo_unico: { Args: { _categoria_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alerta_status: "ativo" | "resolvido" | "ignorado"
      alerta_tipo:
        | "estoque_baixo"
        | "garantia_vencendo"
        | "manutencao_pendente"
        | "obsoleto"
      app_role: "admin" | "manager" | "viewer"
      ativo_status:
        | "disponivel"
        | "em_uso"
        | "em_manutencao"
        | "danificado"
        | "obsoleto"
        | "baixado"
      movimentacao_tipo:
        | "cadastro"
        | "transferencia"
        | "mudanca_status"
        | "manutencao"
        | "baixa"
        | "localizacao"
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
      alerta_status: ["ativo", "resolvido", "ignorado"],
      alerta_tipo: [
        "estoque_baixo",
        "garantia_vencendo",
        "manutencao_pendente",
        "obsoleto",
      ],
      app_role: ["admin", "manager", "viewer"],
      ativo_status: [
        "disponivel",
        "em_uso",
        "em_manutencao",
        "danificado",
        "obsoleto",
        "baixado",
      ],
      movimentacao_tipo: [
        "cadastro",
        "transferencia",
        "mudanca_status",
        "manutencao",
        "baixa",
        "localizacao",
      ],
    },
  },
} as const
