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
      admin_broadcast_responses: {
        Row: {
          broadcast_id: string
          created_at: string
          dismissed: boolean
          id: string
          name: string | null
          rating: number | null
          response_text: string | null
          session_key: string
        }
        Insert: {
          broadcast_id: string
          created_at?: string
          dismissed?: boolean
          id?: string
          name?: string | null
          rating?: number | null
          response_text?: string | null
          session_key: string
        }
        Update: {
          broadcast_id?: string
          created_at?: string
          dismissed?: boolean
          id?: string
          name?: string | null
          rating?: number | null
          response_text?: string | null
          session_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_broadcast_responses_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "admin_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_broadcasts: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_path: string | null
          image_url: string | null
          kind: string
          message: string
          target_name: string | null
          target_session_key: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          kind: string
          message: string
          target_name?: string | null
          target_session_key?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          kind?: string
          message?: string
          target_name?: string | null
          target_session_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_changelog: {
        Row: {
          active: boolean
          created_at: string
          detail: string | null
          id: string
          image_path: string | null
          image_url: string | null
          kind: string
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          detail?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          kind?: string
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          detail?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          kind?: string
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_daily_rollup: {
        Row: {
          day: string
          minutes: number
          updated_at: string
          visits: number
        }
        Insert: {
          day: string
          minutes?: number
          updated_at?: string
          visits?: number
        }
        Update: {
          day?: string
          minutes?: number
          updated_at?: string
          visits?: number
        }
        Relationships: []
      }
      api_endpoints: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          request_count: number
          slug: string
          upstream_header_name: string | null
          upstream_header_value: string | null
          upstream_url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          request_count?: number
          slug: string
          upstream_header_name?: string | null
          upstream_header_value?: string | null
          upstream_url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          request_count?: number
          slug?: string
          upstream_header_name?: string | null
          upstream_header_value?: string | null
          upstream_url?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          label: string
          last_used_at: string | null
          owner_name: string | null
          rate_limit_per_hour: number
          request_count: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          label?: string
          last_used_at?: string | null
          owner_name?: string | null
          rate_limit_per_hour?: number
          request_count?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          label?: string
          last_used_at?: string | null
          owner_name?: string | null
          rate_limit_per_hour?: number
          request_count?: number
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key: string | null
          api_key_id: string | null
          created_at: string
          id: string
          path: string
          status: number | null
        }
        Insert: {
          api_key?: string | null
          api_key_id?: string | null
          created_at?: string
          id?: string
          path: string
          status?: number | null
        }
        Update: {
          api_key?: string | null
          api_key_id?: string | null
          created_at?: string
          id?: string
          path?: string
          status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      downloadable_titles: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number | null
          episode: number | null
          id: string
          kind: string
          mime: string
          poster_url: string | null
          season: number | null
          size_bytes: number
          storage_path: string
          title: string
          tmdb_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          episode?: number | null
          id?: string
          kind: string
          mime?: string
          poster_url?: string | null
          season?: number | null
          size_bytes?: number
          storage_path: string
          title: string
          tmdb_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          episode?: number | null
          id?: string
          kind?: string
          mime?: string
          poster_url?: string | null
          season?: number | null
          size_bytes?: number
          storage_path?: string
          title?: string
          tmdb_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      featured_events: {
        Row: {
          active: boolean
          away_flag: string | null
          away_team: string | null
          bg_color: string | null
          click_count: number
          created_at: string
          display_mode: string
          ends_at: string | null
          flag_left: string | null
          flag_right: string | null
          home_flag: string | null
          home_team: string | null
          id: string
          image_url: string | null
          kind: string
          link_url: string
          priority: number
          sport: string | null
          starts_at: string | null
          subtitle: string | null
          team_left: string | null
          team_right: string | null
          timer_mode: string
          timer_target_at: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          active?: boolean
          away_flag?: string | null
          away_team?: string | null
          bg_color?: string | null
          click_count?: number
          created_at?: string
          display_mode?: string
          ends_at?: string | null
          flag_left?: string | null
          flag_right?: string | null
          home_flag?: string | null
          home_team?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          link_url: string
          priority?: number
          sport?: string | null
          starts_at?: string | null
          subtitle?: string | null
          team_left?: string | null
          team_right?: string | null
          timer_mode?: string
          timer_target_at?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          active?: boolean
          away_flag?: string | null
          away_team?: string | null
          bg_color?: string | null
          click_count?: number
          created_at?: string
          display_mode?: string
          ends_at?: string | null
          flag_left?: string | null
          flag_right?: string | null
          home_flag?: string | null
          home_team?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          link_url?: string
          priority?: number
          sport?: string | null
          starts_at?: string | null
          subtitle?: string | null
          team_left?: string | null
          team_right?: string | null
          timer_mode?: string
          timer_target_at?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      match_chats: {
        Row: {
          created_at: string
          id: string
          match_id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_blocked: boolean
          updated_at: string
          username: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_blocked?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_blocked?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      review_requests: {
        Row: {
          created_at: string
          fulfilled: boolean
          id: string
          session_key: string
        }
        Insert: {
          created_at?: string
          fulfilled?: boolean
          id?: string
          session_key: string
        }
        Update: {
          created_at?: string
          fulfilled?: boolean
          id?: string
          session_key?: string
        }
        Relationships: []
      }
      site_reviews: {
        Row: {
          country: string | null
          created_at: string
          id: string
          message: string
          rating: number
          session_key: string
          user_agent: string | null
          user_name: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          message: string
          rating: number
          session_key: string
          user_agent?: string | null
          user_name?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          message?: string
          rating?: number
          session_key?: string
          user_agent?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      social_orders: {
        Row: {
          code: string
          created_at: string
          customer: string | null
          delivered: number
          id: string
          network: string | null
          note: string | null
          platform: string
          quantity: number
          reason: string | null
          service: string
          status: string
          target_url: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          customer?: string | null
          delivered?: number
          id?: string
          network?: string | null
          note?: string | null
          platform: string
          quantity?: number
          reason?: string | null
          service: string
          status?: string
          target_url: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          customer?: string | null
          delivered?: number
          id?: string
          network?: string | null
          note?: string | null
          platform?: string
          quantity?: number
          reason?: string | null
          service?: string
          status?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      sub_codes: {
        Row: {
          active: boolean
          buyer_contact: string | null
          buyer_name: string | null
          code: string
          created_at: string
          duration_days: number
          id: string
          max_devices: number
          note: string | null
          plan: string
        }
        Insert: {
          active?: boolean
          buyer_contact?: string | null
          buyer_name?: string | null
          code: string
          created_at?: string
          duration_days?: number
          id?: string
          max_devices?: number
          note?: string | null
          plan?: string
        }
        Update: {
          active?: boolean
          buyer_contact?: string | null
          buyer_name?: string | null
          code?: string
          created_at?: string
          duration_days?: number
          id?: string
          max_devices?: number
          note?: string | null
          plan?: string
        }
        Relationships: []
      }
      sub_payments: {
        Row: {
          amount: number
          buyer_contact: string | null
          buyer_name: string | null
          code_id: string | null
          created_at: string
          currency: string
          id: string
          method: string | null
          note: string | null
          plan: string
          status: string
        }
        Insert: {
          amount?: number
          buyer_contact?: string | null
          buyer_name?: string | null
          code_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          note?: string | null
          plan?: string
          status?: string
        }
        Update: {
          amount?: number
          buyer_contact?: string | null
          buyer_name?: string | null
          code_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          note?: string | null
          plan?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_payments_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "sub_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_redemptions: {
        Row: {
          activated_at: string
          code_id: string
          device_id: string
          device_label: string | null
          expires_at: string | null
          id: string
          last_seen_at: string
        }
        Insert: {
          activated_at?: string
          code_id: string
          device_id: string
          device_label?: string | null
          expires_at?: string | null
          id?: string
          last_seen_at?: string
        }
        Update: {
          activated_at?: string
          code_id?: string
          device_id?: string
          device_label?: string | null
          expires_at?: string | null
          id?: string
          last_seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "sub_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_downloads: {
        Row: {
          bytes_downloaded: number
          completed_at: string | null
          device_label: string | null
          id: string
          started_at: string
          status: string
          title_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bytes_downloaded?: number
          completed_at?: string | null
          device_label?: string | null
          id?: string
          started_at?: string
          status?: string
          title_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bytes_downloaded?: number
          completed_at?: string | null
          device_label?: string | null
          id?: string
          started_at?: string
          status?: string
          title_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_downloads_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "downloadable_titles"
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
      visitor_sessions: {
        Row: {
          city: string | null
          country: string | null
          current_path: string | null
          device: string | null
          duration_seconds: number
          events: Json
          id: string
          ip: string | null
          last_seen_at: string
          name: string | null
          page_views: number
          path_log: Json
          searches: Json
          session_key: string
          started_at: string
          user_agent: string | null
          user_id: string | null
          watched: Json
        }
        Insert: {
          city?: string | null
          country?: string | null
          current_path?: string | null
          device?: string | null
          duration_seconds?: number
          events?: Json
          id?: string
          ip?: string | null
          last_seen_at?: string
          name?: string | null
          page_views?: number
          path_log?: Json
          searches?: Json
          session_key: string
          started_at?: string
          user_agent?: string | null
          user_id?: string | null
          watched?: Json
        }
        Update: {
          city?: string | null
          country?: string | null
          current_path?: string | null
          device?: string | null
          duration_seconds?: number
          events?: Json
          id?: string
          ip?: string | null
          last_seen_at?: string
          name?: string | null
          page_views?: number
          path_log?: Json
          searches?: Json
          session_key?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string | null
          watched?: Json
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
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
