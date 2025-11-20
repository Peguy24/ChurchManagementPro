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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          branch_id: string | null
          created_at: string | null
          event_date: string
          event_type: string
          id: string
          marked_at: string | null
          marked_by: string | null
          member_id: string
          scan_method: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          event_date: string
          event_type: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          member_id: string
          scan_method?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          event_date?: string
          event_type?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          member_id?: string
          scan_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          leader_id: string | null
          name: string
          parent_branch_id: string | null
          phone: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          leader_id?: string | null
          name: string
          parent_branch_id?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          parent_branch_id?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_parent_branch_id_fkey"
            columns: ["parent_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          created_at: string | null
          custom_field_id: string
          entity_id: string
          field_value: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_field_id: string
          entity_id: string
          field_value?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_field_id?: string
          entity_id?: string
          field_value?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string | null
          display_order: number | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: Database["public"]["Enums"]["custom_field_type"]
          id: string
          is_active: boolean | null
          is_required: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      members: {
        Row: {
          academic_formation: string | null
          address: string | null
          baptism_date: string | null
          baptism_status: string | null
          branch_id: string | null
          children_names: string | null
          christian_experience: string | null
          civic_status: string | null
          conversion_date: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          emergency_phone: string | null
          first_name: string
          groups: string[] | null
          id: string
          last_name: string
          marital_status: string | null
          marriage_date: string | null
          member_type: string | null
          number_of_children: number | null
          phone: string | null
          photo_url: string | null
          professional_formation: string | null
          qr_code: string | null
          role: string | null
          spouse_name: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          academic_formation?: string | null
          address?: string | null
          baptism_date?: string | null
          baptism_status?: string | null
          branch_id?: string | null
          children_names?: string | null
          christian_experience?: string | null
          civic_status?: string | null
          conversion_date?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_phone?: string | null
          first_name: string
          groups?: string[] | null
          id?: string
          last_name: string
          marital_status?: string | null
          marriage_date?: string | null
          member_type?: string | null
          number_of_children?: number | null
          phone?: string | null
          photo_url?: string | null
          professional_formation?: string | null
          qr_code?: string | null
          role?: string | null
          spouse_name?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          academic_formation?: string | null
          address?: string | null
          baptism_date?: string | null
          baptism_status?: string | null
          branch_id?: string | null
          children_names?: string | null
          christian_experience?: string | null
          civic_status?: string | null
          conversion_date?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_phone?: string | null
          first_name?: string
          groups?: string[] | null
          id?: string
          last_name?: string
          marital_status?: string | null
          marriage_date?: string | null
          member_type?: string | null
          number_of_children?: number | null
          phone?: string | null
          photo_url?: string | null
          professional_formation?: string | null
          qr_code?: string | null
          role?: string | null
          spouse_name?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ministries: {
        Row: {
          branch_id: string | null
          created_at: string
          description: string | null
          id: string
          leader_id: string | null
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministries_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      ministry_members: {
        Row: {
          created_at: string
          id: string
          joined_date: string | null
          member_id: string
          ministry_id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          joined_date?: string | null
          member_id: string
          ministry_id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          joined_date?: string | null
          member_id?: string
          ministry_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministry_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_members_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      app_role:
        | "admin"
        | "pastor"
        | "treasurer"
        | "secretary"
        | "volunteer"
        | "user"
      custom_field_type:
        | "text"
        | "textarea"
        | "number"
        | "date"
        | "select"
        | "checkbox"
      entity_type: "member" | "branch" | "ministry" | "event" | "donation"
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
      app_role: [
        "admin",
        "pastor",
        "treasurer",
        "secretary",
        "volunteer",
        "user",
      ],
      custom_field_type: [
        "text",
        "textarea",
        "number",
        "date",
        "select",
        "checkbox",
      ],
      entity_type: ["member", "branch", "ministry", "event", "donation"],
    },
  },
} as const
