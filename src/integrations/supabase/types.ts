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
          custo: number | null
          data_compra: string | null
          empresa_id: string
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
          custo?: number | null
          data_compra?: string | null
          empresa_id: string
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
          custo?: number | null
          data_compra?: string | null
          empresa_id?: string
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
          {
            foreignKeyName: "ativos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
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
          empresa_sigla: string
          prefixo: string
          ultimo_numero: number
        }
        Insert: {
          ano: number
          empresa_sigla?: string
          prefixo: string
          ultimo_numero?: number
        }
        Update: {
          ano?: number
          empresa_sigla?: string
          prefixo?: string
          ultimo_numero?: number
        }
        Relationships: []
      }
      empresas: {
        Row: {
          created_at: string
          id: string
          nome: string
          sigla: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          sigla: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          sigla?: string
          status?: string
        }
        Relationships: []
      }
      estoque_consumiveis: {
        Row: {
          categoria: string | null
          created_at: string
          empresa_id: string | null
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
          empresa_id?: string | null
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
          empresa_id?: string | null
          estoque_minimo?: number
          id?: string
          localizacao?: string | null
          nome?: string
          observacoes?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_consumiveis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor_produtos: {
        Row: {
          ativo_id: string | null
          consumivel_id: string | null
          created_at: string
          fornecedor_id: string
          fornecedor_preferencial: boolean
          id: string
          observacoes: string | null
          prazo_entrega_dias: number | null
          preco_medio: number | null
          updated_at: string
        }
        Insert: {
          ativo_id?: string | null
          consumivel_id?: string | null
          created_at?: string
          fornecedor_id: string
          fornecedor_preferencial?: boolean
          id?: string
          observacoes?: string | null
          prazo_entrega_dias?: number | null
          preco_medio?: number | null
          updated_at?: string
        }
        Update: {
          ativo_id?: string | null
          consumivel_id?: string | null
          created_at?: string
          fornecedor_id?: string
          fornecedor_preferencial?: boolean
          id?: string
          observacoes?: string | null
          prazo_entrega_dias?: number | null
          preco_medio?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_produtos_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_produtos_consumivel_id_fkey"
            columns: ["consumivel_id"]
            isOneToOne: false
            referencedRelation: "estoque_consumiveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nif: string | null
          nome_empresa: string
          observacoes: string | null
          pessoa_contacto: string | null
          status: string
          telefone: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nif?: string | null
          nome_empresa: string
          observacoes?: string | null
          pessoa_contacto?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nif?: string | null
          nome_empresa?: string
          observacoes?: string | null
          pessoa_contacto?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      impressora_leituras: {
        Row: {
          capturado_em: string
          contador_impressoes: number | null
          erros_hw: string | null
          id: string
          impressora_id: string
          online: boolean
          papel_pct: number | null
          toner_amarelo: number | null
          toner_ciano: number | null
          toner_magenta: number | null
          toner_preto: number | null
        }
        Insert: {
          capturado_em?: string
          contador_impressoes?: number | null
          erros_hw?: string | null
          id?: string
          impressora_id: string
          online?: boolean
          papel_pct?: number | null
          toner_amarelo?: number | null
          toner_ciano?: number | null
          toner_magenta?: number | null
          toner_preto?: number | null
        }
        Update: {
          capturado_em?: string
          contador_impressoes?: number | null
          erros_hw?: string | null
          id?: string
          impressora_id?: string
          online?: boolean
          papel_pct?: number | null
          toner_amarelo?: number | null
          toner_ciano?: number | null
          toner_magenta?: number | null
          toner_preto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "impressora_leituras_impressora_id_fkey"
            columns: ["impressora_id"]
            isOneToOne: false
            referencedRelation: "impressoras"
            referencedColumns: ["id"]
          },
        ]
      }
      impressoras: {
        Row: {
          ativo_id: string
          comunidade_snmp: string
          contador_inicial: number
          created_at: string
          id: string
          ip: string
          modelo: string | null
          porta_snmp: number
          status_online: boolean
          ultima_leitura_em: string | null
          updated_at: string
        }
        Insert: {
          ativo_id: string
          comunidade_snmp?: string
          contador_inicial?: number
          created_at?: string
          id?: string
          ip: string
          modelo?: string | null
          porta_snmp?: number
          status_online?: boolean
          ultima_leitura_em?: string | null
          updated_at?: string
        }
        Update: {
          ativo_id?: string
          comunidade_snmp?: string
          contador_inicial?: number
          created_at?: string
          id?: string
          ip?: string
          modelo?: string | null
          porta_snmp?: number
          status_online?: boolean
          ultima_leitura_em?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      manutencoes: {
        Row: {
          ativo_id: string
          created_at: string
          created_by: string | null
          custo: number | null
          data_conclusao: string | null
          data_inicio: string
          descricao: string
          fornecedor: string | null
          id: string
          observacoes: string | null
          status: string
          tecnico: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo_id: string
          created_at?: string
          created_by?: string | null
          custo?: number | null
          data_conclusao?: string | null
          data_inicio?: string
          descricao: string
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          tecnico?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo_id?: string
          created_at?: string
          created_by?: string | null
          custo?: number | null
          data_conclusao?: string | null
          data_inicio?: string
          descricao?: string
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          tecnico?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          ativo_id: string
          created_at: string
          descricao: string | null
          id: string
          localizacao_anterior: string | null
          localizacao_nova: string | null
          metadata: Json | null
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
          metadata?: Json | null
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
          metadata?: Json | null
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
      sugestoes_compra: {
        Row: {
          ativo_id: string | null
          created_at: string
          empresa_id: string | null
          id: string
          item: string
          motivo: string | null
          quantidade: number
          status: string
          updated_at: string
          urgencia: string
        }
        Insert: {
          ativo_id?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          item: string
          motivo?: string | null
          quantidade?: number
          status?: string
          updated_at?: string
          urgencia?: string
        }
        Update: {
          ativo_id?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          item?: string
          motivo?: string | null
          quantidade?: number
          status?: string
          updated_at?: string
          urgencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "sugestoes_compra_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestoes_compra_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
      gerar_codigo_unico: {
        Args: { _categoria_id: string; _empresa_id: string }
        Returns: string
      }
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
        | "toner_baixo"
        | "toner_critico"
        | "papel_baixo"
        | "impressora_offline"
        | "consumo_anomalo"
      app_role: "admin" | "manager" | "viewer"
      ativo_status:
        | "disponivel"
        | "em_uso"
        | "em_manutencao"
        | "danificado"
        | "obsoleto"
      movimentacao_tipo:
        | "cadastro"
        | "transferencia"
        | "mudanca_status"
        | "manutencao"
        | "baixa"
        | "localizacao"
        | "edicao"
        | "alerta"
        | "leitura_snmp"
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
        "toner_baixo",
        "toner_critico",
        "papel_baixo",
        "impressora_offline",
        "consumo_anomalo",
      ],
      app_role: ["admin", "manager", "viewer"],
      ativo_status: [
        "disponivel",
        "em_uso",
        "em_manutencao",
        "danificado",
        "obsoleto",
      ],
      movimentacao_tipo: [
        "cadastro",
        "transferencia",
        "mudanca_status",
        "manutencao",
        "baixa",
        "localizacao",
        "edicao",
        "alerta",
        "leitura_snmp",
      ],
    },
  },
} as const
