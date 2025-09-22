// Database type definitions for Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          nama_lengkap: string;
          role: "admin" | "ketua_tim" | "pegawai";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nama_lengkap: string;
          role: "admin" | "ketua_tim" | "pegawai";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nama_lengkap?: string;
          role?: "admin" | "ketua_tim" | "pegawai";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          leader_user_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          leader_user_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          leader_user_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          nama_project: string;
          deskripsi: string | null;
          status: "active" | "completed" | "cancelled";
          start_date: string;
          end_date: string;
          leader_user_id: string;
          team_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nama_project: string;
          deskripsi?: string | null;
          status?: "active" | "completed" | "cancelled";
          start_date: string;
          end_date: string;
          leader_user_id: string;
          team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nama_project?: string;
          deskripsi?: string | null;
          status?: "active" | "completed" | "cancelled";
          start_date?: string;
          end_date?: string;
          leader_user_id?: string;
          team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          assignee_user_id: string;
          title: string;
          deskripsi_tugas: string | null;
          start_date: string;
          end_date: string;
          status: "pending" | "in_progress" | "completed";
          has_transport: boolean;
          response_pegawai: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          assignee_user_id: string;
          title: string;
          deskripsi_tugas?: string | null;
          start_date: string;
          end_date: string;
          status?: "pending" | "in_progress" | "completed";
          has_transport?: boolean;
          response_pegawai?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          assignee_user_id?: string;
          title?: string;
          deskripsi_tugas?: string | null;
          start_date?: string;
          end_date?: string;
          status?: "pending" | "in_progress" | "completed";
          has_transport?: boolean;
          response_pegawai?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: "member" | "observer";
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: "member" | "observer";
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: "member" | "observer";
          created_at?: string;
        };
      };
      earnings_ledger: {
        Row: {
          id: string;
          user_id: string;
          type: "transport" | "honor" | "bonus";
          amount: number;
          description: string;
          occurred_on: string;
          posted_at: string;
          source_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "transport" | "honor" | "bonus";
          amount: number;
          description: string;
          occurred_on: string;
          posted_at: string;
          source_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "transport" | "honor" | "bonus";
          amount?: number;
          description?: string;
          occurred_on?: string;
          posted_at?: string;
          source_id?: string | null;
          created_at?: string;
        };
      };
      task_transport_allocations: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          allocation_date: string | null;
          canceled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          allocation_date?: string | null;
          canceled_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          allocation_date?: string | null;
          canceled_at?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string;
          action: string;
          entity: string;
          entity_id: string;
          before_data: Record<string, unknown> | null;
          after_data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id: string;
          action: string;
          entity: string;
          entity_id: string;
          before_data?: Record<string, unknown> | null;
          after_data?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string;
          action?: string;
          entity?: string;
          entity_id?: string;
          before_data?: Record<string, unknown> | null;
          after_data?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      get_dashboard_stats_v2: {
        Args: {
          user_id: string;
        };
        Returns: Record<string, unknown>;
      };
      get_user_projects: {
        Args: {
          user_id_param: string;
        };
        Returns: Array<{
          project_id: string;
          project_name: string;
          leader_name: string;
          status: string;
          start_date: string;
          end_date: string;
        }>;
      };
      get_available_transport_dates: {
        Args: {
          user_id_param: string;
          task_id_param: string;
        };
        Returns: Array<{
          date: string;
          available: boolean;
          reason?: string;
        }>;
      };
      create_transport_allocation: {
        Args: {
          task_id_param: string;
          user_id_param: string;
        };
        Returns: Record<string, unknown> | null;
      };
      cancel_transport_allocation: {
        Args: {
          allocation_id_param: string;
        };
        Returns: Record<string, unknown> | null;
      };
    };
  };
}
