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
          bg_color: string | null
          click_count: number
          created_at: string
          display_mode: string
          ends_at: string | null
          flag_left: string | null
          flag_right: string | null
          id: string
          image_url: string | null
          kind: string
          link_url: string
          priority: number
          starts_at: string | null
          subtitle: string | null
          team_left: string | null
          team_right: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          active?: boolean
          bg_color?: string | null
          click_count?: number
          created_at?: string
          display_mode?: string
          ends_at?: string | null
          flag_left?: string | null
          flag_right?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          link_url: string
          priority?: number
          starts_at?: string | null
          subtitle?: string | null
          team_left?: string | null
          team_right?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          active?: boolean
          bg_color?: string | null
          click_count?: number
          created_at?: string
          display_mode?: string
          ends_at?: string | null
          flag_left?: string | null
          flag_right?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          link_url?: string
          priority?: number
          starts_at?: string | null
          subtitle?: string | null
          team_left?: string | null
          team_right?: string | null
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
      app_role: ["admin", "user"],
    },
  },
} as const
