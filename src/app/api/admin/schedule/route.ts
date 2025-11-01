import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Service = ReturnType<typeof createServiceClient<Database>>;

function getService(): Service {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Structure stored in system_settings.config.admin_schedules
// [{ id, title, description?, start_date, end_date, created_by, created_at }]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const svc = getService();
    const { data, error } = await (svc as any)
      .from("system_settings")
      .select("id, config")
      .eq("id", 1)
      .single();

    if (error && (error as any).code !== "PGRST116") {
      return NextResponse.json(
        { error: "Failed to load settings" },
        { status: 500 },
      );
    }

    const raw = data?.config;
    const cfg = raw && typeof raw === "string" ? JSON.parse(raw) : raw || {};
    const schedules = cfg?.admin_schedules ?? [];
    return NextResponse.json({ schedules });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, description, start_date, end_date } = body as {
      title: string;
      description?: string;
      start_date: string;
      end_date: string;
    };

    if (!title || !start_date || !end_date) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const newItem = {
      id: crypto.randomUUID(),
      title,
      description: description ?? null,
      start_date,
      end_date,
      created_by: user.id,
      created_at: new Date().toISOString(),
    };

    const svc = getService();
    // Upsert config
    const { data: settingsRow, error: loadErr } = await (svc as any)
      .from("system_settings")
      .select("id, config")
      .eq("id", 1)
      .single();

    if (loadErr && (loadErr as any).code !== "PGRST116") {
      return NextResponse.json(
        { error: "Failed to read settings" },
        { status: 500 },
      );
    }

    const existingRaw = settingsRow?.config;
    const existingConfig =
      existingRaw && typeof existingRaw === "string"
        ? JSON.parse(existingRaw)
        : existingRaw || {};
    const arr = existingConfig.admin_schedules ?? [];
    const nextConfig = {
      ...existingConfig,
      admin_schedules: [newItem, ...arr],
    };

    if (settingsRow?.id) {
      const { error: updErr } = await (svc as any)
        .from("system_settings")
        .update({ config: nextConfig })
        .eq("id", settingsRow.id);
      if (updErr)
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    } else {
      const { error: insErr } = await (svc as any)
        .from("system_settings")
        .insert({ id: 1, config: nextConfig });
      if (insErr)
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    // Auto-clear existing allocations that now fall into the scheduled (blocked) dates
    try {
      await (svc as any)
        .from("task_transport_allocations")
        .update({ allocation_date: null, allocated_at: null })
        .gte("allocation_date", start_date)
        .lte("allocation_date", end_date)
        .is("canceled_at", null);
    } catch (_) {}

    return NextResponse.json({ schedule: newItem });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    const svc = getService();
    const { data: settingsRow, error: loadErr } = await (svc as any)
      .from("system_settings")
      .select("id, config")
      .eq("id", 1)
      .single();

    if (loadErr)
      return NextResponse.json({ error: "Failed to read" }, { status: 500 });

    const existingRaw = settingsRow?.config;
    const existingConfig =
      existingRaw && typeof existingRaw === "string"
        ? JSON.parse(existingRaw)
        : existingRaw || {};
    const arr = existingConfig.admin_schedules ?? [];
    const nextArr = arr.filter((x: any) => x.id !== id);
    const nextConfig = { ...existingConfig, admin_schedules: nextArr };

    const { error: updErr } = await (svc as any)
      .from("system_settings")
      .update({ config: nextConfig })
      .eq("id", settingsRow.id);
    if (updErr)
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
