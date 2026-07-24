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
      contacts: {
        Row: {
          company: string | null
          created_at: string | null
          description_note: string | null
          description_type: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          description_note?: string | null
          description_type?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          description_note?: string | null
          description_type?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          contact_id: string | null
          created_at: string | null
          id: string
          stage: string
          title: string
          user_id: string
          value: number | null
          workspace_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          id?: string
          stage?: string
          title: string
          user_id?: string
          value?: number | null
          workspace_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          id?: string
          stage?: string
          title?: string
          user_id?: string
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          currency_code: string
          customer_name: string | null
          discount: number
          due_date: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          status: string
          tax_rate: number
          total_label_override: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          currency_code?: string
          customer_name?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          status?: string
          tax_rate?: number
          total_label_override?: string | null
          user_id?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency_code?: string
          customer_name?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          status?: string
          tax_rate?: number
          total_label_override?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          contact_id: string
          created_at: string | null
          id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          body: string
          contact_id: string
          created_at?: string | null
          id?: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          body?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          currency_code: string
          currency_display_mode: string
          display_name: string | null
          historical_currency_mode: string
          id: string
          theme: string
          updated_at: string | null
        }
        Insert: {
          currency_code?: string
          currency_display_mode?: string
          display_name?: string | null
          historical_currency_mode?: string
          id?: string
          theme?: string
          updated_at?: string | null
        }
        Update: {
          currency_code?: string
          currency_display_mode?: string
          display_name?: string | null
          historical_currency_mode?: string
          id?: string
          theme?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workflow_cards: {
        Row: {
          assignee_name: string | null
          client_name: string | null
          column_id: string
          contact_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          moved_at: string | null
          position: number
          priority: string
          status_note: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          assignee_name?: string | null
          client_name?: string | null
          column_id: string
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          moved_at?: string | null
          position?: number
          priority?: string
          status_note?: string | null
          title: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          assignee_name?: string | null
          client_name?: string | null
          column_id?: string
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          moved_at?: string | null
          position?: number
          priority?: string
          status_note?: string | null
          title?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "workflow_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_cards_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_cards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_columns: {
        Row: {
          id: string
          name: string
          position: number
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          name: string
          position: number
          updated_at?: string | null
          user_id?: string
          workspace_id: string
        }
        Update: {
          id?: string
          name?: string
          position?: number
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_columns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          invite_token: string | null
          invited_email: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          status: Database["public"]["Enums"]["workspace_member_status"]
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_token?: string | null
          invited_email?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["workspace_member_status"]
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_token?: string | null
          invited_email?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["workspace_member_status"]
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          business_tagline: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          name: string
          owner_id: string
          slug: string
          theme: string
          updated_at: string
          weekly_sales_target: number
        }
        Insert: {
          business_tagline?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          owner_id: string
          slug: string
          theme?: string
          updated_at?: string
          weekly_sales_target?: number
        }
        Update: {
          business_tagline?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          owner_id?: string
          slug?: string
          theme?: string
          updated_at?: string
          weekly_sales_target?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_user_workspace: {
        Args: { p_name: string }
        Returns: {
          business_tagline: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          name: string
          owner_id: string
          slug: string
          theme: string
          updated_at: string
          weekly_sales_target: number
        }
        SetofOptions: {
          from: "*"
          to: "workspaces"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_workspace_member: {
        Args: { _uid: string; _ws: string }
        Returns: boolean
      }
      workspace_role_of: {
        Args: { _uid: string; _ws: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
    }
    Enums: {
      workspace_member_status: "active" | "pending"
      workspace_role: "owner" | "admin" | "member"
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
      workspace_member_status: ["active", "pending"],
      workspace_role: ["owner", "admin", "member"],
    },
  },
} as const
