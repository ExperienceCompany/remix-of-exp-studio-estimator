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
      admin_logs: {
        Row: {
          affiliate_code: string | null
          created_at: string
          created_by: string | null
          customer_total: number | null
          data_json: Json
          gross_margin: number | null
          hours: number | null
          id: string
          log_name: string | null
          log_type: string
          net_profit: number | null
          provider_payout: number | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_code?: string | null
          created_at?: string
          created_by?: string | null
          customer_total?: number | null
          data_json: Json
          gross_margin?: number | null
          hours?: number | null
          id?: string
          log_name?: string | null
          log_type: string
          net_profit?: number | null
          provider_payout?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_code?: string | null
          created_at?: string
          created_by?: string | null
          customer_total?: number | null
          data_json?: Json
          gross_margin?: number | null
          hours?: number | null
          id?: string
          log_name?: string | null
          log_type?: string
          net_profit?: number | null
          provider_payout?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          id: string
          reason: string | null
          studio_id: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string
          id?: string
          reason?: string | null
          studio_id?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string
          id?: string
          reason?: string | null
          studio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_color_rules: {
        Row: {
          color: string
          conditions: Json
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          color?: string
          conditions?: Json
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          color?: string
          conditions?: Json
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      booking_custom_field_values: {
        Row: {
          booking_id: string
          created_at: string | null
          field_id: string
          field_value: Json
          id: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          field_id: string
          field_value: Json
          id?: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          field_id?: string
          field_value?: Json
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_custom_field_values_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "studio_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_booking_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_policies: {
        Row: {
          allowed_tags: string[] | null
          created_at: string | null
          hours_after_end: number | null
          hours_before_start: number | null
          id: string
          is_active: boolean | null
          policy_type: string
          policy_value: string
          updated_at: string | null
        }
        Insert: {
          allowed_tags?: string[] | null
          created_at?: string | null
          hours_after_end?: number | null
          hours_before_start?: number | null
          id?: string
          is_active?: boolean | null
          policy_type: string
          policy_value: string
          updated_at?: string | null
        }
        Update: {
          allowed_tags?: string[] | null
          created_at?: string | null
          hours_after_end?: number | null
          hours_before_start?: number | null
          id?: string
          is_active?: boolean | null
          policy_type?: string
          policy_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      calendar_settings: {
        Row: {
          advance_booking_days: number
          buffer_minutes: number
          created_at: string
          id: string
          is_active: boolean
          max_booking_hours: number
          min_booking_hours: number
          operating_end_time: string
          operating_start_time: string
          studio_id: string
          time_increment_minutes: number
          updated_at: string
        }
        Insert: {
          advance_booking_days?: number
          buffer_minutes?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_booking_hours?: number
          min_booking_hours?: number
          operating_end_time?: string
          operating_start_time?: string
          studio_id: string
          time_increment_minutes?: number
          updated_at?: string
        }
        Update: {
          advance_booking_days?: number
          buffer_minutes?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_booking_hours?: number
          min_booking_hours?: number
          operating_end_time?: string
          operating_start_time?: string
          studio_id?: string
          time_increment_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_settings_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: true
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_booking_fields: {
        Row: {
          created_at: string | null
          display_order: number | null
          field_help_text: string | null
          field_label: string
          field_nickname: string
          field_options: string[] | null
          field_placeholder: string | null
          field_type: string
          id: string
          is_active: boolean | null
          is_admin_only: boolean | null
          is_required: boolean | null
          max_selections: number | null
          min_selections: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          field_help_text?: string | null
          field_label: string
          field_nickname: string
          field_options?: string[] | null
          field_placeholder?: string | null
          field_type: string
          id?: string
          is_active?: boolean | null
          is_admin_only?: boolean | null
          is_required?: boolean | null
          max_selections?: number | null
          min_selections?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          field_help_text?: string | null
          field_label?: string
          field_nickname?: string
          field_options?: string[] | null
          field_placeholder?: string | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_admin_only?: boolean | null
          is_required?: boolean | null
          max_selections?: number | null
          min_selections?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_field_conditions: {
        Row: {
          condition_field: string
          condition_group: number | null
          condition_operator: string
          condition_values: string[]
          created_at: string | null
          field_id: string
          id: string
        }
        Insert: {
          condition_field: string
          condition_group?: number | null
          condition_operator: string
          condition_values: string[]
          created_at?: string | null
          field_id: string
          id?: string
        }
        Update: {
          condition_field?: string
          condition_group?: number | null
          condition_operator?: string
          condition_values?: string[]
          created_at?: string | null
          field_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_conditions_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_booking_fields"
            referencedColumns: ["id"]
          },
        ]
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
          customer_price: number | null
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
          customer_price?: number | null
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
          customer_price?: number | null
          description?: string | null
          id?: string
          increment_price?: number | null
          increment_unit?: string | null
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      ops_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: number
          updated_at?: string | null
          updated_by?: string | null
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
          affiliate_code: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          lead_count: number
          organization: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          affiliate_code?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          lead_count?: number
          organization?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          affiliate_code?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          lead_count?: number
          organization?: string | null
          phone?: string | null
          tags?: string[] | null
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
          affiliate_code: string | null
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
          affiliate_code?: string | null
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
          affiliate_code?: string | null
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
          applies_to_studio_types: string[] | null
          description: string | null
          flat_amount: number
          id: string
          is_active: boolean | null
          is_hourly: boolean | null
          name: string
        }
        Insert: {
          addon_type: string
          applies_to_session_type?: string | null
          applies_to_studio_type?: string | null
          applies_to_studio_types?: string[] | null
          description?: string | null
          flat_amount: number
          id?: string
          is_active?: boolean | null
          is_hourly?: boolean | null
          name: string
        }
        Update: {
          addon_type?: string
          applies_to_session_type?: string | null
          applies_to_studio_type?: string | null
          applies_to_studio_types?: string[] | null
          description?: string | null
          flat_amount?: number
          id?: string
          is_active?: boolean | null
          is_hourly?: boolean | null
          name?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          actual_duration_seconds: number | null
          affiliate_code: string | null
          created_at: string | null
          created_by: string | null
          ended_at: string | null
          final_total: number | null
          id: string
          original_total: number | null
          paused_at: string | null
          payment_status: string | null
          quote_id: string | null
          selections_json: Json | null
          session_type: string
          square_payment_id: string | null
          started_at: string | null
          status: string
          total_paused_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          actual_duration_seconds?: number | null
          affiliate_code?: string | null
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          final_total?: number | null
          id?: string
          original_total?: number | null
          paused_at?: string | null
          payment_status?: string | null
          quote_id?: string | null
          selections_json?: Json | null
          session_type: string
          square_payment_id?: string | null
          started_at?: string | null
          status?: string
          total_paused_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_duration_seconds?: number | null
          affiliate_code?: string | null
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          final_total?: number | null
          id?: string
          original_total?: number | null
          paused_at?: string | null
          payment_status?: string | null
          quote_id?: string | null
          selections_json?: Json | null
          session_type?: string
          square_payment_id?: string | null
          started_at?: string | null
          status?: string
          total_paused_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_bookings: {
        Row: {
          booking_date: string
          booking_type: Database["public"]["Enums"]["booking_type"]
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          details: string | null
          end_time: string
          id: string
          notes: string | null
          people_count: number | null
          quote_id: string | null
          session_type: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          studio_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          booking_date: string
          booking_type?: Database["public"]["Enums"]["booking_type"]
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          details?: string | null
          end_time: string
          id?: string
          notes?: string | null
          people_count?: number | null
          quote_id?: string | null
          session_type?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          studio_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          booking_date?: string
          booking_type?: Database["public"]["Enums"]["booking_type"]
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          details?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          people_count?: number | null
          quote_id?: string | null
          session_type?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          studio_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_bookings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_bookings_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          calendar_color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          thumbnail_url: string | null
          type: Database["public"]["Enums"]["studio_type"]
          updated_at: string | null
        }
        Insert: {
          calendar_color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          thumbnail_url?: string | null
          type: Database["public"]["Enums"]["studio_type"]
          updated_at?: string | null
        }
        Update: {
          calendar_color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          thumbnail_url?: string | null
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
      app_role: "admin" | "staff" | "user" | "affiliate"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      booking_type: "customer" | "internal" | "unavailable"
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
      app_role: ["admin", "staff", "user", "affiliate"],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      booking_type: ["customer", "internal", "unavailable"],
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
