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
      admin_invitations: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          tenant_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          tenant_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          tenant_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          branch_id: string | null
          created_at: string | null
          event_date: string
          event_id: string | null
          event_type: string
          id: string
          marked_at: string | null
          marked_by: string | null
          member_id: string
          scan_method: string | null
          tenant_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          event_date: string
          event_id?: string | null
          event_type: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          member_id: string
          scan_method?: string | null
          tenant_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          event_date?: string
          event_id?: string | null
          event_type?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          member_id?: string
          scan_method?: string | null
          tenant_id?: string | null
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
            foreignKeyName: "attendance_records_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records_archive: {
        Row: {
          archived_at: string
          archived_by: string | null
          branch_id: string | null
          created_at: string | null
          event_date: string
          event_id: string | null
          event_type: string
          id: string
          marked_at: string | null
          marked_by: string | null
          member_id: string
          scan_method: string | null
          tenant_id: string | null
        }
        Insert: {
          archived_at?: string
          archived_by?: string | null
          branch_id?: string | null
          created_at?: string | null
          event_date: string
          event_id?: string | null
          event_type: string
          id: string
          marked_at?: string | null
          marked_by?: string | null
          member_id: string
          scan_method?: string | null
          tenant_id?: string | null
        }
        Update: {
          archived_at?: string
          archived_by?: string | null
          branch_id?: string | null
          created_at?: string | null
          event_date?: string
          event_id?: string | null
          event_type?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          member_id?: string
          scan_method?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          bank_name: string | null
          branch_id: string | null
          created_at: string
          current_balance: number | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          branch_id?: string | null
          created_at?: string
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          branch_id?: string | null
          created_at?: string
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          created_at: string
          description: string | null
          id: string
          is_reconciled: boolean | null
          linked_donation_id: string | null
          linked_expense_id: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reference_number: string | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_reconciled?: boolean | null
          linked_donation_id?: string | null
          linked_expense_id?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference_number?: string | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_reconciled?: boolean | null
          linked_donation_id?: string | null
          linked_expense_id?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference_number?: string | null
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_linked_donation_id_fkey"
            columns: ["linked_donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_linked_expense_id_fkey"
            columns: ["linked_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          branch_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          fiscal_year: number
          id: string
          name: string
          notes: string | null
          planned_amount: number
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          fiscal_year: number
          id?: string
          name: string
          notes?: string | null
          planned_amount?: number
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          fiscal_year?: number
          id?: string
          name?: string
          notes?: string | null
          planned_amount?: number
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          branch_id: string | null
          created_at: string
          current_balance: number | null
          id: string
          is_active: boolean | null
          name: string
          responsible_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          responsible_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          responsible_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          cash_register_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          linked_donation_id: string | null
          linked_expense_id: string | null
          reference_number: string | null
          tenant_id: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          cash_register_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          linked_donation_id?: string | null
          linked_expense_id?: string | null
          reference_number?: string | null
          tenant_id?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          cash_register_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          linked_donation_id?: string | null
          linked_expense_id?: string | null
          reference_number?: string | null
          tenant_id?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_linked_donation_id_fkey"
            columns: ["linked_donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_linked_expense_id_fkey"
            columns: ["linked_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      church_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "church_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_operations: {
        Row: {
          amount_paid: number
          branch_id: string | null
          counterparty: string
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          interest_rate: number
          notes: string | null
          start_date: string
          status: string
          tenant_id: string
          total_amount: number
          type: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          branch_id?: string | null
          counterparty: string
          created_at?: string
          created_by: string
          description: string
          due_date?: string | null
          id?: string
          interest_rate?: number
          notes?: string | null
          start_date?: string
          status?: string
          tenant_id: string
          total_amount: number
          type: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          branch_id?: string | null
          counterparty?: string
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          interest_rate?: number
          notes?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          total_amount?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_operations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_operations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          credit_operation_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          credit_operation_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          credit_operation_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_payments_credit_operation_id_fkey"
            columns: ["credit_operation_id"]
            isOneToOne: false
            referencedRelation: "credit_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_field_id: string
          entity_id: string
          field_value?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_field_id?: string
          entity_id?: string
          field_value?: string | null
          id?: string
          tenant_id?: string | null
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
          {
            foreignKeyName: "custom_field_values_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      data_cleanup_logs: {
        Row: {
          archived_by: string
          created_at: string
          data_type: string
          date_before: string
          id: string
          records_archived: number
          tenant_id: string
        }
        Insert: {
          archived_by: string
          created_at?: string
          data_type: string
          date_before: string
          id?: string
          records_archived?: number
          tenant_id: string
        }
        Update: {
          archived_by?: string
          created_at?: string
          data_type?: string
          date_before?: string
          id?: string
          records_archived?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_cleanup_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          bank_account_id: string | null
          branch_id: string | null
          cash_register_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          donation_date: string
          donation_type: string
          id: string
          member_id: string | null
          notes: string | null
          payment_method: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          branch_id?: string | null
          cash_register_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          donation_date?: string
          donation_type?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          payment_method?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          branch_id?: string | null
          cash_register_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          donation_date?: string
          donation_type?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          payment_method?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "income_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      donations_archive: {
        Row: {
          amount: number
          archived_at: string
          archived_by: string | null
          bank_account_id: string | null
          branch_id: string | null
          cash_register_id: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          donation_date: string
          donation_type: string
          id: string
          member_id: string | null
          notes: string | null
          payment_method: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          archived_at?: string
          archived_by?: string | null
          bank_account_id?: string | null
          branch_id?: string | null
          cash_register_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          donation_date: string
          donation_type: string
          id: string
          member_id?: string | null
          notes?: string | null
          payment_method: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          archived_at?: string
          archived_by?: string | null
          bank_account_id?: string | null
          branch_id?: string | null
          cash_register_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          donation_date?: string
          donation_type?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          payment_method?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string
          id: string
          is_active: boolean
          subject: string
          template_type: string
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          id?: string
          is_active?: boolean
          subject: string
          template_type: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          is_active?: boolean
          subject?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          bank_account_id: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          last_name: string
          payment_frequency: string | null
          phone: string | null
          position: string
          salary_amount: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          bank_account_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_name: string
          payment_frequency?: string | null
          phone?: string | null
          position: string
          salary_amount?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          bank_account_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          payment_frequency?: string | null
          phone?: string | null
          position?: string
          salary_amount?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          created_at: string
          email: string | null
          event_id: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          registered_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_id: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          registered_at?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          event_id?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          registered_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_category: string | null
          event_date: string
          event_time: string | null
          expected_attendees: number | null
          id: string
          location: string | null
          name: string
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_category?: string | null
          event_date: string
          event_time?: string | null
          expected_attendees?: number | null
          id?: string
          location?: string | null
          name: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_category?: string | null
          event_date?: string
          event_time?: string | null
          expected_attendees?: number | null
          id?: string
          location?: string | null
          name?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_category_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_category_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_category_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_account_id: string | null
          branch_id: string | null
          cash_register_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          reference_number: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          tenant_id: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          branch_id?: string | null
          cash_register_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          tenant_id?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          branch_id?: string | null
          cash_register_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          tenant_id?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses_archive: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          archived_at: string
          archived_by: string | null
          bank_account_id: string | null
          branch_id: string | null
          cash_register_id: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          reference_number: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string
          archived_by?: string | null
          bank_account_id?: string | null
          branch_id?: string | null
          cash_register_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          expense_date: string
          id: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string
          archived_by?: string | null
          bank_account_id?: string | null
          branch_id?: string | null
          cash_register_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Relationships: []
      }
      financial_audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          tenant_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          fund_id: string
          id: string
          reference_number: string | null
          tenant_id: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          fund_id: string
          id?: string
          reference_number?: string | null
          tenant_id?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          fund_id?: string
          id?: string
          reference_number?: string | null
          tenant_id?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_transactions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "special_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      income_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          branch_id: string | null
          category: string
          condition: string | null
          created_at: string
          created_by: string | null
          current_value: number | null
          description: string | null
          id: string
          location: string | null
          min_quantity: number | null
          name: string
          notes: string | null
          photo_url: string | null
          purchase_date: string | null
          purchase_price: number | null
          quantity: number | null
          serial_number: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          branch_id?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          location?: string | null
          min_quantity?: number | null
          name: string
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          serial_number?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          branch_id?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          location?: string | null
          min_quantity?: number | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          serial_number?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_maintenance: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          item_id: string
          maintenance_date: string
          maintenance_type: string
          next_maintenance_date: string | null
          notes: string | null
          performed_by: string | null
          status: string | null
          tenant_id: string | null
          vendor: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          item_id: string
          maintenance_date?: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          notes?: string | null
          performed_by?: string | null
          status?: string | null
          tenant_id?: string | null
          vendor?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          item_id?: string
          maintenance_date?: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          notes?: string | null
          performed_by?: string | null
          status?: string | null
          tenant_id?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_maintenance_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_maintenance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_usage: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string | null
          event_name: string | null
          id: string
          item_id: string
          notes: string | null
          quantity_used: number | null
          returned: boolean | null
          start_date: string
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          event_name?: string | null
          id?: string
          item_id: string
          notes?: string | null
          quantity_used?: number | null
          returned?: boolean | null
          start_date: string
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          event_name?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          quantity_used?: number | null
          returned?: boolean | null
          start_date?: string
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_usage_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_usage_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          content_en: string
          content_fr: string
          content_ht: string
          created_at: string
          document_type: string
          id: string
          is_active: boolean
          title_en: string
          title_fr: string
          title_ht: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          content_en?: string
          content_fr?: string
          content_ht?: string
          created_at?: string
          document_type: string
          id?: string
          is_active?: boolean
          title_en?: string
          title_fr?: string
          title_ht?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          content_en?: string
          content_fr?: string
          content_ht?: string
          created_at?: string
          document_type?: string
          id?: string
          is_active?: boolean
          title_en?: string
          title_fr?: string
          title_ht?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      login_verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      member_documents: {
        Row: {
          created_at: string
          document_date: string | null
          document_name: string
          document_type: string
          document_url: string | null
          id: string
          member_id: string
          notes: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_date?: string | null
          document_name: string
          document_type: string
          document_url?: string | null
          id?: string
          member_id: string
          notes?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_date?: string | null
          document_name?: string
          document_type?: string
          document_url?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      member_engagement_scores: {
        Row: {
          attendance_count_90d: number | null
          attendance_score: number | null
          calculated_at: string | null
          created_at: string | null
          giving_consistency: number | null
          giving_score: number | null
          growth_score: number | null
          id: string
          last_attendance_date: string | null
          member_id: string
          ministry_score: number | null
          tenant_id: string
          total_score: number | null
          trend: string | null
          trend_change: number | null
          updated_at: string | null
        }
        Insert: {
          attendance_count_90d?: number | null
          attendance_score?: number | null
          calculated_at?: string | null
          created_at?: string | null
          giving_consistency?: number | null
          giving_score?: number | null
          growth_score?: number | null
          id?: string
          last_attendance_date?: string | null
          member_id: string
          ministry_score?: number | null
          tenant_id: string
          total_score?: number | null
          trend?: string | null
          trend_change?: number | null
          updated_at?: string | null
        }
        Update: {
          attendance_count_90d?: number | null
          attendance_score?: number | null
          calculated_at?: string | null
          created_at?: string | null
          giving_consistency?: number | null
          giving_score?: number | null
          growth_score?: number | null
          id?: string
          last_attendance_date?: string | null
          member_id?: string
          ministry_score?: number | null
          tenant_id?: string
          total_score?: number | null
          trend?: string | null
          trend_change?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_engagement_scores_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_engagement_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      member_requests: {
        Row: {
          academic_formation: string | null
          address: Json | null
          baptism_date: string | null
          baptism_status: string | null
          children_names: string | null
          christian_experience: string | null
          conversion_date: string | null
          created_at: string
          date_of_birth: string | null
          desired_ministry_id: string | null
          email: string | null
          emergency_phone: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          marital_status: string | null
          marriage_date: string | null
          message: string | null
          number_of_children: number | null
          origin_church: string | null
          phone: string | null
          professional_formation: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          spouse_name: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          academic_formation?: string | null
          address?: Json | null
          baptism_date?: string | null
          baptism_status?: string | null
          children_names?: string | null
          christian_experience?: string | null
          conversion_date?: string | null
          created_at?: string
          date_of_birth?: string | null
          desired_ministry_id?: string | null
          email?: string | null
          emergency_phone?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          marital_status?: string | null
          marriage_date?: string | null
          message?: string | null
          number_of_children?: number | null
          origin_church?: string | null
          phone?: string | null
          professional_formation?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spouse_name?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          academic_formation?: string | null
          address?: Json | null
          baptism_date?: string | null
          baptism_status?: string | null
          children_names?: string | null
          christian_experience?: string | null
          conversion_date?: string | null
          created_at?: string
          date_of_birth?: string | null
          desired_ministry_id?: string | null
          email?: string | null
          emergency_phone?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          marital_status?: string | null
          marriage_date?: string | null
          message?: string | null
          number_of_children?: number | null
          origin_church?: string | null
          phone?: string | null
          professional_formation?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spouse_name?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_requests_desired_ministry_id_fkey"
            columns: ["desired_ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      member_risk_predictions: {
        Row: {
          attendance_trend_slope: number | null
          contributing_factors: Json | null
          created_at: string | null
          days_since_last_attendance: number | null
          giving_trend_slope: number | null
          id: string
          member_id: string
          model_version: string | null
          predicted_at: string | null
          predicted_inactive_date: string | null
          risk_category: string | null
          risk_probability: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          attendance_trend_slope?: number | null
          contributing_factors?: Json | null
          created_at?: string | null
          days_since_last_attendance?: number | null
          giving_trend_slope?: number | null
          id?: string
          member_id: string
          model_version?: string | null
          predicted_at?: string | null
          predicted_inactive_date?: string | null
          risk_category?: string | null
          risk_probability?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          attendance_trend_slope?: number | null
          contributing_factors?: Json | null
          created_at?: string | null
          days_since_last_attendance?: number | null
          giving_trend_slope?: number | null
          id?: string
          member_id?: string
          model_version?: string | null
          predicted_at?: string | null
          predicted_inactive_date?: string | null
          risk_category?: string | null
          risk_probability?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_risk_predictions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_risk_predictions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          gender: string | null
          groups: string[] | null
          id: string
          join_date: string | null
          last_name: string
          marital_status: string | null
          marriage_date: string | null
          member_number: string | null
          member_type: string | null
          number_of_children: number | null
          origin_church: string | null
          phone: string | null
          photo_url: string | null
          professional_formation: string | null
          qr_code: string | null
          role: string | null
          spouse_name: string | null
          status: string | null
          tenant_id: string | null
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
          gender?: string | null
          groups?: string[] | null
          id?: string
          join_date?: string | null
          last_name: string
          marital_status?: string | null
          marriage_date?: string | null
          member_number?: string | null
          member_type?: string | null
          number_of_children?: number | null
          origin_church?: string | null
          phone?: string | null
          photo_url?: string | null
          professional_formation?: string | null
          qr_code?: string | null
          role?: string | null
          spouse_name?: string | null
          status?: string | null
          tenant_id?: string | null
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
          gender?: string | null
          groups?: string[] | null
          id?: string
          join_date?: string | null
          last_name?: string
          marital_status?: string | null
          marriage_date?: string | null
          member_number?: string | null
          member_type?: string | null
          number_of_children?: number | null
          origin_church?: string | null
          phone?: string | null
          photo_url?: string | null
          professional_formation?: string | null
          qr_code?: string | null
          role?: string | null
          spouse_name?: string | null
          status?: string | null
          tenant_id?: string | null
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
          {
            foreignKeyName: "members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "ministries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      pastoral_alerts: {
        Row: {
          action_suggested: string | null
          alert_type: string
          assigned_to: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          member_id: string
          message: string | null
          metadata: Json | null
          priority: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          action_suggested?: string | null
          alert_type: string
          assigned_to?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          member_id: string
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          action_suggested?: string | null
          alert_type?: string
          assigned_to?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          member_id?: string
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pastoral_alerts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_activity_logs: {
        Row: {
          created_at: string
          description: string
          event_category: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          tenant_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          event_category?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          event_category?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_announcement_banners: {
        Row: {
          banner_type: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          message: string
          priority: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          banner_type?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          priority?: string
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          banner_type?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          priority?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_announcements: {
        Row: {
          announcement_type: string
          created_at: string
          id: string
          message: string
          priority: string
          recipient_count: number | null
          sent_at: string | null
          sent_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          announcement_type?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          recipient_count?: number | null
          sent_at?: string | null
          sent_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          announcement_type?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          recipient_count?: number | null
          sent_at?: string | null
          sent_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_employees: {
        Row: {
          bank_info: string | null
          created_at: string
          created_by: string | null
          email: string | null
          employment_type: string
          full_name: string
          hire_date: string | null
          id: string
          notes: string | null
          pay_frequency: string
          phone: string | null
          role_title: string
          salary_amount: number
          status: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          bank_info?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          employment_type?: string
          full_name: string
          hire_date?: string | null
          id?: string
          notes?: string | null
          pay_frequency?: string
          phone?: string | null
          role_title?: string
          salary_amount?: number
          status?: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          bank_info?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          employment_type?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          notes?: string | null
          pay_frequency?: string
          phone?: string | null
          role_title?: string
          salary_amount?: number
          status?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          receipt_filename: string | null
          receipt_url: string | null
          recurring_frequency: string | null
          tax_category: string | null
          tax_deductible: boolean
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          receipt_filename?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          tax_category?: string | null
          tax_deductible?: boolean
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          receipt_filename?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          tax_category?: string | null
          tax_deductible?: boolean
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      platform_notifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          metadata: Json | null
          notification_type: string
          severity: string
          tenant_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          metadata?: Json | null
          notification_type: string
          severity?: string
          tenant_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          metadata?: Json | null
          notification_type?: string
          severity?: string
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_payroll: {
        Row: {
          created_at: string
          created_by: string | null
          deductions: Json
          employee_id: string
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          pay_period_end: string
          pay_period_start: string
          payment_date: string | null
          payment_method: string | null
          reference_number: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deductions?: Json
          employee_id: string
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          pay_period_end: string
          pay_period_start: string
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deductions?: Json
          employee_id?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          pay_period_end?: string
          pay_period_start?: string
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "platform_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          role: Database["public"]["Enums"]["platform_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission: string
          role: Database["public"]["Enums"]["platform_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["platform_role"]
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_category: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_category?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_category?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      platform_tax_records: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          created_by: string | null
          document_url: string | null
          due_date: string
          filing_notes: string | null
          id: string
          paid_date: string | null
          reference_number: string | null
          status: string
          tax_period: string
          tax_type: string
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          due_date: string
          filing_notes?: string | null
          id?: string
          paid_date?: string | null
          reference_number?: string | null
          status?: string
          tax_period: string
          tax_type?: string
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          due_date?: string
          filing_notes?: string | null
          id?: string
          paid_date?: string | null
          reference_number?: string | null
          status?: string
          tax_period?: string
          tax_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          language: string | null
          last_name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          language?: string | null
          last_name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          applied_by_role: string
          created_at: string
          days_added: number
          id: string
          notes: string | null
          referral_id: string
          reward_type: Database["public"]["Enums"]["referral_reward_type"]
          stripe_coupon_id: string | null
          tenant_id: string
        }
        Insert: {
          applied_by_role?: string
          created_at?: string
          days_added?: number
          id?: string
          notes?: string | null
          referral_id: string
          reward_type: Database["public"]["Enums"]["referral_reward_type"]
          stripe_coupon_id?: string | null
          tenant_id: string
        }
        Update: {
          applied_by_role?: string
          created_at?: string
          days_added?: number
          id?: string
          notes?: string | null
          referral_id?: string
          reward_type?: Database["public"]["Enums"]["referral_reward_type"]
          stripe_coupon_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          notes: string | null
          qualified_at: string | null
          referral_code: string
          referred_reward_applied: boolean
          referred_tenant_id: string
          referrer_reward_applied: boolean
          referrer_tenant_id: string
          rewarded_at: string | null
          status: Database["public"]["Enums"]["referral_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          notes?: string | null
          qualified_at?: string | null
          referral_code: string
          referred_reward_applied?: boolean
          referred_tenant_id: string
          referrer_reward_applied?: boolean
          referrer_tenant_id: string
          rewarded_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          notes?: string | null
          qualified_at?: string | null
          referral_code?: string
          referred_reward_applied?: boolean
          referred_tenant_id?: string
          referrer_reward_applied?: boolean
          referrer_tenant_id?: string
          rewarded_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_group: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_group: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_group?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          cash_register_id: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          period_end: string
          period_start: string
          reference_number: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          period_end: string
          period_start: string
          reference_number?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          period_end?: string
          period_start?: string
          reference_number?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_roles: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      special_funds: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          current_amount: number | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
          target_amount: number | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          current_amount?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
          target_amount?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          current_amount?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string | null
          target_amount?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_funds_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_funds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_audit_logs: {
        Row: {
          action_type: string
          created_at: string
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          tenant_id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          tenant_id: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          tenant_id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_discounts: {
        Row: {
          applied_by: string | null
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          previous_plan: string | null
          previous_price_id: string | null
          previous_stripe_subscription_id: string | null
          reason: string | null
          target_plan: string | null
          tenant_id: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applied_by?: string | null
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          previous_plan?: string | null
          previous_price_id?: string | null
          previous_stripe_subscription_id?: string | null
          reason?: string | null
          target_plan?: string | null
          tenant_id: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applied_by?: string | null
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          previous_plan?: string | null
          previous_price_id?: string | null
          previous_stripe_subscription_id?: string | null
          reason?: string | null
          target_plan?: string | null
          tenant_id?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_discounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tax_exemption_refunds: {
        Row: {
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          status: string
          stripe_invoice_id: string
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          tax_amount_refunded: number
          tax_exemption_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          status?: string
          stripe_invoice_id: string
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          tax_amount_refunded?: number
          tax_exemption_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          status?: string
          stripe_invoice_id?: string
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          tax_amount_refunded?: number
          tax_exemption_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_exemption_refunds_tax_exemption_id_fkey"
            columns: ["tax_exemption_id"]
            isOneToOne: false
            referencedRelation: "tenant_tax_exemptions"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_custom_role_permissions: {
        Row: {
          custom_role_id: string
          id: string
          permission_group: string
        }
        Insert: {
          custom_role_id: string
          id?: string
          permission_group: string
        }
        Update: {
          custom_role_id?: string
          id?: string
          permission_group?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_custom_role_permissions_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "tenant_custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_custom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_health_scores: {
        Row: {
          active_members_30d: number
          attendance_rate_30d: number
          attendance_score: number
          avg_donation: number
          calculated_at: string
          created_at: string
          details: Json | null
          donation_score: number
          feature_adoption_score: number
          features_total: number
          features_used: number
          health_grade: string
          id: string
          member_engagement_score: number
          overall_score: number
          tenant_id: string
          total_donations_30d: number
          total_members: number
          trend: string
          updated_at: string
        }
        Insert: {
          active_members_30d?: number
          attendance_rate_30d?: number
          attendance_score?: number
          avg_donation?: number
          calculated_at?: string
          created_at?: string
          details?: Json | null
          donation_score?: number
          feature_adoption_score?: number
          features_total?: number
          features_used?: number
          health_grade?: string
          id?: string
          member_engagement_score?: number
          overall_score?: number
          tenant_id: string
          total_donations_30d?: number
          total_members?: number
          trend?: string
          updated_at?: string
        }
        Update: {
          active_members_30d?: number
          attendance_rate_30d?: number
          attendance_score?: number
          avg_donation?: number
          calculated_at?: string
          created_at?: string
          details?: Json | null
          donation_score?: number
          feature_adoption_score?: number
          features_total?: number
          features_used?: number
          health_grade?: string
          id?: string
          member_engagement_score?: number
          overall_score?: number
          tenant_id?: string
          total_donations_30d?: number
          total_members?: number
          trend?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_health_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_notifications: {
        Row: {
          created_at: string
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          metadata: Json | null
          notification_type: string
          severity: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          metadata?: Json | null
          notification_type?: string
          severity?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          metadata?: Json | null
          notification_type?: string
          severity?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          step_admin_invited: boolean
          step_first_branch_created: boolean
          step_first_donation_recorded: boolean
          step_first_event_created: boolean
          step_first_member_added: boolean
          step_logo_uploaded: boolean
          step_profile_completed: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          step_admin_invited?: boolean
          step_first_branch_created?: boolean
          step_first_donation_recorded?: boolean
          step_first_event_created?: boolean
          step_first_member_added?: boolean
          step_logo_uploaded?: boolean
          step_profile_completed?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          step_admin_invited?: boolean
          step_first_branch_created?: boolean
          step_first_donation_recorded?: boolean
          step_first_event_created?: boolean
          step_first_member_added?: boolean
          step_logo_uploaded?: boolean
          step_profile_completed?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_onboarding_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_policy_acceptances: {
        Row: {
          accepted_at: string
          accepted_by: string | null
          accepted_by_email: string | null
          accepted_by_name: string | null
          document_type: string
          document_version: number
          id: string
          ip_address: string | null
          tenant_id: string
        }
        Insert: {
          accepted_at?: string
          accepted_by?: string | null
          accepted_by_email?: string | null
          accepted_by_name?: string | null
          document_type: string
          document_version?: number
          id?: string
          ip_address?: string | null
          tenant_id: string
        }
        Update: {
          accepted_at?: string
          accepted_by?: string | null
          accepted_by_email?: string | null
          accepted_by_name?: string | null
          document_type?: string
          document_version?: number
          id?: string
          ip_address?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_policy_acceptances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_requests: {
        Row: {
          address: string | null
          church_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          created_tenant_id: string | null
          id: string
          message: string | null
          requested_plan: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          church_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          created_tenant_id?: string | null
          id?: string
          message?: string | null
          requested_plan?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          church_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          created_tenant_id?: string | null
          id?: string
          message?: string | null
          requested_plan?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_requests_created_tenant_id_fkey"
            columns: ["created_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          features: Json | null
          id: string
          max_branches: number | null
          max_members: number | null
          max_storage_mb: number | null
          max_users: number | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_monthly: number
          status: Database["public"]["Enums"]["tenant_status"]
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          features?: Json | null
          id?: string
          max_branches?: number | null
          max_members?: number | null
          max_storage_mb?: number | null
          max_users?: number | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_monthly?: number
          status?: Database["public"]["Enums"]["tenant_status"]
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          features?: Json | null
          id?: string
          max_branches?: number | null
          max_members?: number | null
          max_storage_mb?: number | null
          max_users?: number | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_monthly?: number
          status?: Database["public"]["Enums"]["tenant_status"]
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_tax_exemptions: {
        Row: {
          certificate_url: string | null
          created_at: string
          ein_number: string | null
          expires_at: string | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          status: Database["public"]["Enums"]["tax_exemption_status"]
          submitted_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string
          ein_number?: string | null
          expires_at?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["tax_exemption_status"]
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          certificate_url?: string | null
          created_at?: string
          ein_number?: string | null
          expires_at?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["tax_exemption_status"]
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_tax_exemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_usage: {
        Row: {
          branches_count: number | null
          created_at: string
          donations_count: number | null
          events_count: number | null
          id: string
          members_count: number | null
          period_end: string
          period_start: string
          storage_used_mb: number | null
          tenant_id: string
          updated_at: string
          users_count: number | null
        }
        Insert: {
          branches_count?: number | null
          created_at?: string
          donations_count?: number | null
          events_count?: number | null
          id?: string
          members_count?: number | null
          period_end: string
          period_start: string
          storage_used_mb?: number | null
          tenant_id: string
          updated_at?: string
          users_count?: number | null
        }
        Update: {
          branches_count?: number | null
          created_at?: string
          donations_count?: number | null
          events_count?: number | null
          id?: string
          members_count?: number | null
          period_end?: string
          period_start?: string
          storage_used_mb?: number | null
          tenant_id?: string
          updated_at?: string
          users_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_user_roles: {
        Row: {
          created_at: string | null
          custom_role_id: string | null
          id: string
          is_approved: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_role_id?: string | null
          id?: string
          is_approved?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_role_id?: string | null
          id?: string
          is_approved?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_user_roles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "tenant_custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          slug?: string
          updated_at?: string
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
      visitor_follow_ups: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          follow_up_date: string
          follow_up_type: string
          id: string
          is_completed: boolean | null
          notes: string | null
          tenant_id: string
          visitor_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          follow_up_date?: string
          follow_up_type?: string
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          tenant_id: string
          visitor_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          follow_up_date?: string
          follow_up_type?: string
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          tenant_id?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_follow_ups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_follow_ups_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          assigned_to: string | null
          converted_to_member_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          follow_up_status: string
          how_heard: string | null
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
          visit_date: string
        }
        Insert: {
          assigned_to?: string | null
          converted_to_member_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          follow_up_status?: string
          how_heard?: string | null
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
          visit_date?: string
        }
        Update: {
          assigned_to?: string | null
          converted_to_member_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          follow_up_status?: string
          how_heard?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitors_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_converted_to_member_id_fkey"
            columns: ["converted_to_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          member_id: string
          notes: string | null
          service_date: string
          service_role_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          member_id: string
          notes?: string | null
          service_date: string
          service_role_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          service_date?: string
          service_role_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_schedules_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_schedules_service_role_id_fkey"
            columns: ["service_role_id"]
            isOneToOne: false
            referencedRelation: "service_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_tenant_monthly_attendance: {
        Row: {
          event_days: number | null
          month: string | null
          tenant_id: string | null
          total_records: number | null
          unique_members: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_tenant_monthly_donations: {
        Row: {
          donation_count: number | null
          month: string | null
          tenant_id: string | null
          total_amount: number | null
          unique_donors: number | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_tenant_monthly_expenses: {
        Row: {
          expense_count: number | null
          month: string | null
          tenant_id: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      archive_tenant_attendance: {
        Args: { _before_date: string; _tenant_id: string; _user_id: string }
        Returns: number
      }
      archive_tenant_donations: {
        Args: { _before_date: string; _tenant_id: string; _user_id: string }
        Returns: number
      }
      archive_tenant_expenses: {
        Args: { _before_date: string; _tenant_id: string; _user_id: string }
        Returns: number
      }
      claim_tenant_admin: { Args: { _tenant_id: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      event_belongs_to_tenant: {
        Args: { _event_id: string; _tenant_id: string }
        Returns: boolean
      }
      generate_referral_code_for_tenant: {
        Args: { _tenant_id: string }
        Returns: string
      }
      get_member_archived_stats: { Args: { _member_id: string }; Returns: Json }
      get_referral_code_info: {
        Args: { _code: string }
        Returns: {
          code: string
          is_active: boolean
          referrer_name: string
          referrer_tenant_id: string
        }[]
      }
      get_tenant_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          primary_color: string
          slug: string
        }[]
      }
      get_tenant_monthly_attendance: {
        Args: { _tenant_id: string }
        Returns: {
          event_days: number
          month: string
          total_records: number
          unique_members: number
        }[]
      }
      get_tenant_monthly_donations: {
        Args: { _tenant_id: string }
        Returns: {
          donation_count: number
          month: string
          total_amount: number
          unique_donors: number
        }[]
      }
      get_tenant_monthly_expenses: {
        Args: { _tenant_id: string }
        Returns: {
          expense_count: number
          month: string
          total_amount: number
        }[]
      }
      get_tenant_onboarding_state: {
        Args: { _tenant_id: string }
        Returns: Json
      }
      get_tenant_public_info: {
        Args: { _tenant_id: string }
        Returns: {
          id: string
          logo_url: string
          name: string
        }[]
      }
      get_tenant_referral_stats: { Args: { _tenant_id: string }; Returns: Json }
      get_tenant_storage_mb: { Args: { _tenant_id: string }; Returns: number }
      get_tenant_storage_usage: {
        Args: { _tenant_id: string }
        Returns: number
      }
      get_user_branch_id: { Args: { user_uuid: string }; Returns: string }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_any_platform_role: { Args: { _user_id: string }; Returns: boolean }
      has_platform_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_platform_role: {
        Args: {
          _role: Database["public"]["Enums"]["platform_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: { Args: { _user_id: string }; Returns: boolean }
      mark_admin_invitation_used: {
        Args: { _invitation_id: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refresh_tenant_stats: { Args: never; Returns: undefined }
      tenant_has_admin: { Args: { _tenant_id: string }; Returns: boolean }
      validate_admin_invitation: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          tenant_id: string
          used_at: string
        }[]
      }
      validate_and_mark_super_admin_invitation: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
        }[]
      }
      validate_super_admin_invitation: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          used_at: string
        }[]
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
      platform_role:
        | "super_admin"
        | "finance_admin"
        | "moderator"
        | "support"
        | "sales"
      referral_reward_type: "trial_extension" | "stripe_coupon"
      referral_status:
        | "pending"
        | "qualified"
        | "rewarded"
        | "expired"
        | "rejected"
      subscription_plan:
        | "basic"
        | "standard"
        | "premium"
        | "enterprise"
        | "free"
      tax_exemption_status: "none" | "pending" | "approved" | "rejected"
      tenant_status: "active" | "suspended" | "trial" | "cancelled"
      transaction_status: "pending" | "approved" | "rejected"
      transaction_type: "income" | "expense"
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
      platform_role: [
        "super_admin",
        "finance_admin",
        "moderator",
        "support",
        "sales",
      ],
      referral_reward_type: ["trial_extension", "stripe_coupon"],
      referral_status: [
        "pending",
        "qualified",
        "rewarded",
        "expired",
        "rejected",
      ],
      subscription_plan: ["basic", "standard", "premium", "enterprise", "free"],
      tax_exemption_status: ["none", "pending", "approved", "rejected"],
      tenant_status: ["active", "suspended", "trial", "cancelled"],
      transaction_status: ["pending", "approved", "rejected"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
