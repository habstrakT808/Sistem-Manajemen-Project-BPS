// File: src/app/api/admin/settings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SystemConfig {
  financial: {
    mitra_monthly_limit: number;
    default_transport_amount: number;
    currency_locale: string;
  };
  workload: {
    low_threshold: number;
    medium_threshold: number;
    high_threshold: number;
  };
  notifications: {
    email_enabled: boolean;
    task_deadline_reminder: boolean;
    project_deadline_reminder: boolean;
    financial_limit_warning: boolean;
    system_maintenance_notice: boolean;
  };
  system: {
    auto_project_status_update: boolean;
    data_retention_days: number;
    backup_frequency: string;
    maintenance_mode: boolean;
  };
  security: {
    session_timeout_minutes: number;
    password_min_length: number;
    require_password_change_days: number;
    max_login_attempts: number;
  };
}

interface SystemSettings {
  id: number;
  config: string | object;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get settings from database (or return defaults if not found)
    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settingsError && settingsError.code !== "PGRST116") {
      throw settingsError;
    }

    // Return settings or defaults
    const defaultConfig: SystemConfig = {
      financial: {
        mitra_monthly_limit: 3300000,
        default_transport_amount: 50000,
        currency_locale: "id-ID",
      },
      workload: {
        low_threshold: 2,
        medium_threshold: 4,
        high_threshold: 6,
      },
      notifications: {
        email_enabled: true,
        task_deadline_reminder: true,
        project_deadline_reminder: true,
        financial_limit_warning: true,
        system_maintenance_notice: true,
      },
      system: {
        auto_project_status_update: true,
        data_retention_days: 365,
        backup_frequency: "daily",
        maintenance_mode: false,
      },
      security: {
        session_timeout_minutes: 480,
        password_min_length: 8,
        require_password_change_days: 90,
        max_login_attempts: 5,
      },
    };

    return NextResponse.json({
      data: settings
        ? typeof (settings as SystemSettings).config === "string"
          ? JSON.parse((settings as SystemSettings).config as string)
          : (settings as SystemSettings).config
        : defaultConfig,
    });
  } catch (error) {
    console.error("Settings GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { config } = body;

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate config structure (basic validation)
    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "Invalid configuration format" },
        { status: 400 }
      );
    }

    // Upsert settings
    const settingsData: Omit<SystemSettings, "created_at"> = {
      id: 1, // Single row for system settings
      config: JSON.stringify(config),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("system_settings")
      .upsert(settingsData as any);

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({
      message: "Settings saved successfully",
    });
  } catch (error) {
    console.error("Settings POST Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
