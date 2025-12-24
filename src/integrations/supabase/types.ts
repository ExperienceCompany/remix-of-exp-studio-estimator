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
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      diy_rates: {
        Row: {
          after_first_hour_rate: number | null
          created_at: string | null
          first_hour_rate: number
          id: string
          is_active: boolean | null
          studio_id: string
          time_slot_id: string
          updated_at: string | null
        }
        Insert: {
          after_first_hour_rate?: number | null
          created_at?: string | null
          first_hour_rate: number
          id?: string
          is_active?: boolean | null
          studio_id: string
          time_slot_id: string
          updated_at?: string | null
        }
        Update: {
          after_first_hour_rate?: number | null
          created_at?: string | null
          first_hour_rate?: number
          id?: string
          is_active?: boolean | null
          studio_id?: string
          time_slot_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diy_rates_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diy_rates_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      editing_menu: {
        Row: {
          base_price: number
          category: string
          description: string | null
          id: string
          increment_price: number | null
          increment_unit: string | null
          is_active: boolean | null
          name: string
        }
        Insert: {
          base_price: number
          category: string
          description?: string | null
          id?: string
          increment_price?: number | null
          increment_unit?: string | null
          is_active?: boolean | null
          name: string
        }
        Update: {
          base_price?: number
          category?: string
          description?: string | null
          id?: string
          increment_price?: number | null
          increment_unit?: string | null
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          description: string | null
          display_order: number | null
          id: string
          included_edits: number | null
          is_active: boolean | null
          is_package_pricing: boolean | null
          name: string
          package_price_additional_hour: number | null
          package_price_first_hour: number | null
          payout_base: number | null
          payout_edits_included: number | null
          payout_hourly: number | null
          preset_json: Json
        }
        Insert: {
          description?: string | null
          display_order?: number | null
          id?: string
          included_edits?: number | null
          is_active?: boolean | null
          is_package_pricing?: boolean | null
          name: string
          package_price_additional_hour?: number | null
          package_price_first_hour?: number | null
          payout_base?: number | null
          payout_edits_included?: number | null
          payout_hourly?: number | null
          preset_json: Json
        }
        Update: {
          description?: string | null
          display_order?: number | null
          id?: string
          included_edits?: number | null
          is_active?: boolean | null
          is_package_pricing?: boolean | null
          name?: string
          package_price_additional_hour?: number | null
          package_price_first_hour?: number | null
          payout_base?: number | null
          payout_edits_included?: number | null
          payout_hourly?: number | null
          preset_json?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      provider_levels: {
        Row: {
          display_name: string
          hourly_rate: number
          id: string
          is_active: boolean | null
          level: Database["public"]["Enums"]["provider_level"]
        }
        Insert: {
          display_name: string
          hourly_rate: number
          id?: string
          is_active?: boolean | null
          level: Database["public"]["Enums"]["provider_level"]
        }
        Update: {
          display_name?: string
          hourly_rate?: number
          id?: string
          is_active?: boolean | null
          level?: Database["public"]["Enums"]["provider_level"]
        }
        Relationships: []
      }
      quotes: {
        Row: {
          camera_count: number | null
          created_at: string | null
          created_by: string | null
          customer_total: number | null
          gross_margin: number | null
          hours: number
          id: string
          mode: string
          ops_notes: string | null
          provider_level: Database["public"]["Enums"]["provider_level"] | null
          provider_payout: number | null
          selections_json: Json | null
          service_id: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          status: Database["public"]["Enums"]["quote_status"] | null
          studio_id: string | null
          time_slot_id: string | null
          totals_json: Json | null
          updated_at: string | null
        }
        Insert: {
          camera_count?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_total?: number | null
          gross_margin?: number | null
          hours?: number
          id?: string
          mode?: string
          ops_notes?: string | null
          provider_level?: Database["public"]["Enums"]["provider_level"] | null
          provider_payout?: number | null
          selections_json?: Json | null
          service_id?: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          status?: Database["public"]["Enums"]["quote_status"] | null
          studio_id?: string | null
          time_slot_id?: string | null
          totals_json?: Json | null
          updated_at?: string | null
        }
        Update: {
          camera_count?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_total?: number | null
          gross_margin?: number | null
          hours?: number
          id?: string
          mode?: string
          ops_notes?: string | null
          provider_level?: Database["public"]["Enums"]["provider_level"] | null
          provider_payout?: number | null
          selections_json?: Json | null
          service_id?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
          status?: Database["public"]["Enums"]["quote_status"] | null
          studio_id?: string | null
          time_slot_id?: string | null
          totals_json?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_pay: number | null
          base_pay_type: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          type: Database["public"]["Enums"]["service_type"]
        }
        Insert: {
          base_pay?: number | null
          base_pay_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: Database["public"]["Enums"]["service_type"]
        }
        Update: {
          base_pay?: number | null
          base_pay_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["service_type"]
        }
        Relationships: []
      }
      session_addons: {
        Row: {
          addon_type: string
          applies_to_session_type: string | null
          applies_to_studio_type: string | null
          description: string | null
          flat_amount: number
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          addon_type: string
          applies_to_session_type?: string | null
          applies_to_studio_type?: string | null
          description?: string | null
          flat_amount: number
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          addon_type?: string
          applies_to_session_type?: string | null
          applies_to_studio_type?: string | null
          description?: string | null
          flat_amount?: number
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      studios: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          type: Database["public"]["Enums"]["studio_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: Database["public"]["Enums"]["studio_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["studio_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      time_slots: {
        Row: {
          display_name: string
          end_time: string
          id: string
          is_active: boolean | null
          name: string
          start_time: string
          type: Database["public"]["Enums"]["time_slot_type"]
        }
        Insert: {
          display_name: string
          end_time: string
          id?: string
          is_active?: boolean | null
          name: string
          start_time: string
          type: Database["public"]["Enums"]["time_slot_type"]
        }
        Update: {
          display_name?: string
          end_time?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_time?: string
          type?: Database["public"]["Enums"]["time_slot_type"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vertical_autoedit_addons: {
        Row: {
          hourly_amount: number
          id: string
          is_active: boolean | null
          tier_name: string
          time_slot_group: string
        }
        Insert: {
          hourly_amount: number
          id?: string
          is_active?: boolean | null
          tier_name: string
          time_slot_group: string
        }
        Update: {
          hourly_amount?: number
          id?: string
          is_active?: boolean | null
          tier_name?: string
          time_slot_group?: string
        }
        Relationships: []
      }
      vodcast_camera_addons: {
        Row: {
          cameras: number
          customer_addon_amount: number
          id: string
          is_active: boolean | null
        }
        Insert: {
          cameras: number
          customer_addon_amount: number
          id?: string
          is_active?: boolean | null
        }
        Update: {
          cameras?: number
          customer_addon_amount?: number
          id?: string
          is_active?: boolean | null
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
      is_staff_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff" | "user"
      provider_level: "lv1" | "lv2" | "lv3"
      quote_status: "draft" | "sent" | "approved" | "completed"
      service_type:
        | "audio_podcast"
        | "vodcast"
        | "recording_session"
        | "photoshoot"
      session_type: "diy" | "serviced"
      studio_type:
        | "podcast_room"
        | "audio_studio"
        | "multimedia_studio"
        | "digital_edit_studio"
        | "full_studio_buyout"
      time_slot_type:
        | "mon_wed_day"
        | "mon_wed_eve"
        | "thu_fri_day"
        | "thu_fri_eve"
        | "sat_sun_day"
        | "sat_sun_eve"
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
      app_role: ["admin", "staff", "user"],
      provider_level: ["lv1", "lv2", "lv3"],
      quote_status: ["draft", "sent", "approved", "completed"],
      service_type: [
        "audio_podcast",
        "vodcast",
        "recording_session",
        "photoshoot",
      ],
      session_type: ["diy", "serviced"],
      studio_type: [
        "podcast_room",
        "audio_studio",
        "multimedia_studio",
        "digital_edit_studio",
        "full_studio_buyout",
      ],
      time_slot_type: [
        "mon_wed_day",
        "mon_wed_eve",
        "thu_fri_day",
        "thu_fri_eve",
        "sat_sun_day",
        "sat_sun_eve",
      ],
    },
  },
} as const
