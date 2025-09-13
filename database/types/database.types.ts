export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: "admin" | "ketua_tim" | "pegawai";
          nama_lengkap: string;
          no_telepon: string | null;
          alamat: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role: "admin" | "ketua_tim" | "pegawai";
          nama_lengkap: string;
          no_telepon?: string | null;
          alamat?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: "admin" | "ketua_tim" | "pegawai";
          nama_lengkap?: string;
          no_telepon?: string | null;
          alamat?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      mitra: {
        Row: {
          id: string;
          nama_mitra: string;
          jenis: "perusahaan" | "individu";
          kontak: string | null;
          alamat: string | null;
          deskripsi: string | null;
          rating_average: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nama_mitra: string;
          jenis: "perusahaan" | "individu";
          kontak?: string | null;
          alamat?: string | null;
          deskripsi?: string | null;
          rating_average?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nama_mitra?: string;
          jenis?: "perusahaan" | "individu";
          kontak?: string | null;
          alamat?: string | null;
          deskripsi?: string | null;
          rating_average?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          nama_project: string;
          deskripsi: string;
          tanggal_mulai: string;
          deadline: string;
          ketua_tim_id: string;
          status: "upcoming" | "active" | "completed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nama_project: string;
          deskripsi: string;
          tanggal_mulai: string;
          deadline: string;
          ketua_tim_id: string;
          status?: "upcoming" | "active" | "completed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nama_project?: string;
          deskripsi?: string;
          tanggal_mulai?: string;
          deadline?: string;
          ketua_tim_id?: string;
          status?: "upcoming" | "active" | "completed";
          created_at?: string;
          updated_at?: string;
        };
      };
      project_assignments: {
        Row: {
          id: string;
          project_id: string;
          assignee_type: "pegawai" | "mitra";
          assignee_id: string;
          uang_transport: number | null;
          honor: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          assignee_type: "pegawai" | "mitra";
          assignee_id: string;
          uang_transport?: number | null;
          honor?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          assignee_type?: "pegawai" | "mitra";
          assignee_id?: string;
          uang_transport?: number | null;
          honor?: number | null;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          pegawai_id: string;
          tanggal_tugas: string;
          deskripsi_tugas: string;
          status: "pending" | "in_progress" | "completed";
          response_pegawai: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          pegawai_id: string;
          tanggal_tugas: string;
          deskripsi_tugas: string;
          status?: "pending" | "in_progress" | "completed";
          response_pegawai?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          pegawai_id?: string;
          tanggal_tugas?: string;
          deskripsi_tugas?: string;
          status?: "pending" | "in_progress" | "completed";
          response_pegawai?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      mitra_reviews: {
        Row: {
          id: string;
          project_id: string;
          mitra_id: string;
          pegawai_id: string;
          rating: number;
          komentar: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          mitra_id: string;
          pegawai_id: string;
          rating: number;
          komentar?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          mitra_id?: string;
          pegawai_id?: string;
          rating?: number;
          komentar?: string | null;
          created_at?: string;
        };
      };
      financial_records: {
        Row: {
          id: string;
          project_id: string;
          recipient_type: "pegawai" | "mitra";
          recipient_id: string;
          amount: number;
          description: string;
          bulan: number;
          tahun: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          recipient_type: "pegawai" | "mitra";
          recipient_id: string;
          amount: number;
          description: string;
          bulan: number;
          tahun: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          recipient_type?: "pegawai" | "mitra";
          recipient_id?: string;
          amount?: number;
          description?: string;
          bulan?: number;
          tahun?: number;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: "info" | "success" | "warning" | "error";
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: "info" | "success" | "warning" | "error";
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: "info" | "success" | "warning" | "error";
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_pegawai_workload: {
        Args: {
          pegawai_id: string;
          start_date: string;
          end_date: string;
        };
        Returns: {
          project_count: number;
          workload_level: string;
        }[];
      };
      get_mitra_monthly_total: {
        Args: {
          mitra_id: string;
          month: number;
          year: number;
        };
        Returns: {
          total_amount: number;
        }[];
      };
      update_project_status: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      update_mitra_rating: {
        Args: {
          mitra_id: string;
        };
        Returns: undefined;
      };
      get_dashboard_stats: {
        Args: {
          user_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      user_role: "admin" | "ketua_tim" | "pegawai";
      project_status: "upcoming" | "active" | "completed";
      task_status: "pending" | "in_progress" | "completed";
      assignee_type: "pegawai" | "mitra";
      notification_type: "info" | "success" | "warning" | "error";
    };
  };
};
