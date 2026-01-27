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
      contests: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      execution_logs: {
        Row: {
          code_length: number | null
          created_at: string
          execution_time_ms: number | null
          id: string
          language: string
          mode: string
          problem_id: string | null
          session_id: string
          status: string
        }
        Insert: {
          code_length?: number | null
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          language: string
          mode: string
          problem_id?: string | null
          session_id: string
          status: string
        }
        Update: {
          code_length?: number | null
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          language?: string
          mode?: string
          problem_id?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_logs_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "admin_leaderboard_view"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "execution_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "execution_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "student_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hidden_test_cases: {
        Row: {
          created_at: string
          expected_output: string
          id: string
          input: string
          problem_id: string
        }
        Insert: {
          created_at?: string
          expected_output: string
          id?: string
          input: string
          problem_id: string
        }
        Update: {
          created_at?: string
          expected_output?: string
          id?: string
          input?: string
          problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_test_cases_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      problems: {
        Row: {
          contest_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          score: number
          title: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          score?: number
          title: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          score?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "problems_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      sample_test_cases: {
        Row: {
          created_at: string
          expected_output: string
          id: string
          input: string
          problem_id: string
        }
        Insert: {
          created_at?: string
          expected_output: string
          id?: string
          input: string
          problem_id: string
        }
        Update: {
          created_at?: string
          expected_output?: string
          id?: string
          input?: string
          problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_test_cases_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      student_problem_status: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          is_locked: boolean
          opened_at: string
          problem_id: string
          session_id: string
          wrong_attempts: number
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          opened_at?: string
          problem_id: string
          session_id: string
          wrong_attempts?: number
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          opened_at?: string
          problem_id?: string
          session_id?: string
          wrong_attempts?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_problem_status_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_problem_status_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "admin_leaderboard_view"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "student_problem_status_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "student_problem_status_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "student_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_sessions: {
        Row: {
          contest_id: string
          created_at: string
          ended_at: string | null
          execution_count: number
          id: string
          is_disqualified: boolean
          started_at: string
          user_id: string | null
          username: string
          warnings: number
        }
        Insert: {
          contest_id: string
          created_at?: string
          ended_at?: string | null
          execution_count?: number
          id?: string
          is_disqualified?: boolean
          started_at?: string
          user_id?: string | null
          username: string
          warnings?: number
        }
        Update: {
          contest_id?: string
          created_at?: string
          ended_at?: string | null
          execution_count?: number
          id?: string
          is_disqualified?: boolean
          started_at?: string
          user_id?: string | null
          username?: string
          warnings?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_sessions_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          code: string
          id: string
          language: string
          problem_id: string
          score: number | null
          session_id: string
          status: string
          submitted_at: string
        }
        Insert: {
          code: string
          id?: string
          language: string
          problem_id: string
          score?: number | null
          session_id: string
          status?: string
          submitted_at?: string
        }
        Update: {
          code?: string
          id?: string
          language?: string
          problem_id?: string
          score?: number | null
          session_id?: string
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "admin_leaderboard_view"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "student_sessions"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      admin_leaderboard_view: {
        Row: {
          contest_id: string | null
          execution_count: number | null
          is_disqualified: boolean | null
          last_accepted_at: string | null
          problems_solved: number | null
          rank: number | null
          session_id: string | null
          total_score: number | null
          total_time_seconds: number | null
          username: string | null
          warnings: number | null
          wrong_attempts: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_sessions_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_view: {
        Row: {
          contest_id: string | null
          last_accepted_at: string | null
          problems_solved: number | null
          rank: number | null
          session_id: string | null
          total_score: number | null
          total_time_seconds: number | null
          username: string | null
          wrong_attempts: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_sessions_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
