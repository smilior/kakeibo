export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// 家族情報の型定義
export interface FamilyInfo {
  children?: { name?: string; birthDate: string }[]  // birthDate: YYYY-MM-DD形式
  region?: string
  interests?: string[]
}

export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          line_notify_token: string | null
          high_amount_threshold: number
          reset_day: number
          ai_model: string | null
          ai_system_prompt: string | null
          family_info: FamilyInfo | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          line_notify_token?: string | null
          high_amount_threshold?: number
          reset_day?: number
          ai_model?: string | null
          ai_system_prompt?: string | null
          family_info?: FamilyInfo | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          line_notify_token?: string | null
          high_amount_threshold?: number
          reset_day?: number
          ai_model?: string | null
          ai_system_prompt?: string | null
          family_info?: FamilyInfo | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          nickname: string | null
          avatar_url: string | null
          household_id: string | null
          role: 'owner' | 'member'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          nickname?: string | null
          avatar_url?: string | null
          household_id?: string | null
          role?: 'owner' | 'member'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          nickname?: string | null
          avatar_url?: string | null
          household_id?: string | null
          role?: 'owner' | 'member'
          created_at?: string
          updated_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          household_id: string
          token: string
          expires_at: string
          used_at: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          token?: string
          expires_at?: string
          used_at?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          token?: string
          expires_at?: string
          used_at?: string | null
          created_by?: string
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          household_id: string
          name: string
          icon: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          icon?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          icon?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      rules: {
        Row: {
          id: string
          household_id: string
          category_id: string
          monthly_limit: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          category_id: string
          monthly_limit: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          category_id?: string
          monthly_limit?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          household_id: string
          user_id: string
          category_id: string
          amount: number
          date: string
          memo: string | null
          is_family: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          category_id: string
          amount: number
          date?: string
          memo?: string | null
          is_family?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          category_id?: string
          amount?: number
          date?: string
          memo?: string | null
          is_family?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      daily_advice: {
        Row: {
          id: string
          household_id: string
          date: string
          advice: string
          prompt: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          date: string
          advice: string
          prompt?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          date?: string
          advice?: string
          prompt?: string | null
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          household_id: string
          category_id: string
          name: string
          monthly_amount: number
          contract_date: string
          renewal_date: string | null
          memo: string | null
          is_active: boolean
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          category_id: string
          name: string
          monthly_amount: number
          contract_date: string
          renewal_date?: string | null
          memo?: string | null
          is_active?: boolean
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          category_id?: string
          name?: string
          monthly_amount?: number
          contract_date?: string
          renewal_date?: string | null
          memo?: string | null
          is_active?: boolean
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ai_diaries: {
        Row: {
          id: string
          household_id: string
          date: string
          content: string
          prompt: string | null
          theme: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          date: string
          content: string
          prompt?: string | null
          theme?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          date?: string
          content?: string
          prompt?: string | null
          theme?: string | null
          created_at?: string
        }
      }
      period_analyses: {
        Row: {
          id: string
          household_id: string
          period_type: 'week' | 'month'
          period_start: string
          period_end: string
          analysis: string
          prompt: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          period_type: 'week' | 'month'
          period_start: string
          period_end: string
          analysis: string
          prompt?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          period_type?: 'week' | 'month'
          period_start?: string
          period_end?: string
          analysis?: string
          prompt?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      monthly_expense_summary: {
        Row: {
          household_id: string
          category_id: string
          category_name: string
          month: string
          count: number
          total_amount: number
        }
      }
      monthly_user_expense_summary: {
        Row: {
          household_id: string
          user_id: string
          user_name: string
          user_nickname: string | null
          month: string
          count: number
          total_amount: number
        }
      }
    }
    Functions: {
      get_current_period: {
        Args: { p_household_id: string }
        Returns: { start_date: string; end_date: string }[]
      }
      get_remaining_counts: {
        Args: { p_household_id: string }
        Returns: {
          category_id: string
          category_name: string
          category_icon: string
          monthly_limit: number
          current_count: number
          remaining_count: number
        }[]
      }
      create_default_categories: {
        Args: { p_household_id: string }
        Returns: void
      }
      create_household_and_setup: {
        Args: { p_household_name: string; p_nickname: string }
        Returns: string
      }
      remove_household_member: {
        Args: { p_member_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: 'owner' | 'member'
    }
  }
}

// 便利な型エイリアス
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Household = Tables<'households'>
export type User = Tables<'users'>
export type Invitation = Tables<'invitations'>
export type Category = Tables<'categories'>
export type Rule = Tables<'rules'>
export type Expense = Tables<'expenses'>
export type Subscription = Tables<'subscriptions'>
export type AiDiary = Tables<'ai_diaries'>
export type PeriodAnalysis = Tables<'period_analyses'>
