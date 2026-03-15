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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: never
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: never
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          staff_org: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          staff_org?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          staff_org?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_ai_analyses: {
        Row: {
          analyzed_at: string
          confidence: number | null
          created_at: string
          hazards: string[]
          model: string
          provider: string
          rationale: string | null
          raw_error: string | null
          report_id: string
          suggested_actions: string[]
          suggested_department: Database["public"]["Enums"]["department_code"]
          summary: string | null
        }
        Insert: {
          analyzed_at?: string
          confidence?: number | null
          created_at?: string
          hazards?: string[]
          model: string
          provider: string
          rationale?: string | null
          raw_error?: string | null
          report_id: string
          suggested_actions?: string[]
          suggested_department?: Database["public"]["Enums"]["department_code"]
          summary?: string | null
        }
        Update: {
          analyzed_at?: string
          confidence?: number | null
          created_at?: string
          hazards?: string[]
          model?: string
          provider?: string
          rationale?: string | null
          raw_error?: string | null
          report_id?: string
          suggested_actions?: string[]
          suggested_department?: Database["public"]["Enums"]["department_code"]
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_ai_analyses_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          damage_type: Database["public"]["Enums"]["damage_type"]
          department_routing: Database["public"]["Enums"]["department_code"]
          description: string
          id: string
          lat: number
          lng: number
          location_name: string | null
          photo_path: string
          reported_at: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          status: Database["public"]["Enums"]["report_status"]
          submitted_by: string
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          damage_type: Database["public"]["Enums"]["damage_type"]
          department_routing?: Database["public"]["Enums"]["department_code"]
          description: string
          id?: string
          lat: number
          lng: number
          location_name?: string | null
          photo_path: string
          reported_at?: string
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["report_status"]
          submitted_by: string
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          damage_type?: Database["public"]["Enums"]["damage_type"]
          department_routing?: Database["public"]["Enums"]["department_code"]
          description?: string
          id?: string
          lat?: number
          lng?: number
          location_name?: string | null
          photo_path?: string
          reported_at?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["report_status"]
          submitted_by?: string
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          auto_confirm: boolean
          id: number
          lockdown_mode: boolean
          privacy_mode: boolean
          rate_limit: number
          sms_alerts: boolean
          updated_at: string
        }
        Insert: {
          auto_confirm?: boolean
          id?: number
          lockdown_mode?: boolean
          privacy_mode?: boolean
          rate_limit?: number
          sms_alerts?: boolean
          updated_at?: string
        }
        Update: {
          auto_confirm?: boolean
          id?: number
          lockdown_mode?: boolean
          privacy_mode?: boolean
          rate_limit?: number
          sms_alerts?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff_or_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "public" | "staff" | "admin"
      damage_type:
        | "flooding"
        | "roof_collapse"
        | "debris_tree"
        | "utility_damage"
        | "other"
      department_code: "nwa" | "jps" | "odpem" | "none"
      report_status: "pending_validation" | "verified" | "resolved"
      severity_level: "critical" | "high" | "medium" | "low"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["public", "staff", "admin"],
      damage_type: [
        "flooding",
        "roof_collapse",
        "debris_tree",
        "utility_damage",
        "other",
      ],
      department_code: ["nwa", "jps", "odpem", "none"],
      report_status: ["pending_validation", "verified", "resolved"],
      severity_level: ["critical", "high", "medium", "low"],
    },
  },
} as const
