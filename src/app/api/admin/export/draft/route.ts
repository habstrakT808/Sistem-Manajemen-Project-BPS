import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SavedDraft = {
  id: string;
  type: string; // e.g., 'sk-tim'
  data: any;
  created_at: string;
  updated_at: string;
};

async function ensureAdmin(supabase: any) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const { data: userProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!userProfile || (userProfile as { role: string }).role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = await ensureAdmin(supabase);
    if ("error" in admin) return admin.error as NextResponse;

    const type = request.nextUrl.searchParams.get("type") || undefined;
    // Prefer dedicated table if exists
    try {
      const query = supabase
        .from("export_drafts" as any)
        .select("id, type, data, created_at")
        .order("created_at", { ascending: false });
      const { data: rows, error } = await (type
        ? (query as any).eq("type", type)
        : (query as any));
      if (!error && Array.isArray(rows)) {
        return NextResponse.json({ drafts: rows });
      }
    } catch (_) {}

    // Fallback to system_settings.config.saved_exports
    const { data: settings } = await supabase
      .from("system_settings")
      .select("config")
      .limit(1)
      .maybeSingle();
    const config = (settings as any)?.config
      ? typeof (settings as any).config === "string"
        ? JSON.parse((settings as any).config as string)
        : (settings as any).config
      : {};
    const drafts: SavedDraft[] = (config.saved_exports || []) as SavedDraft[];
    const filtered = type ? drafts.filter((d) => d.type === type) : drafts;
    return NextResponse.json({ drafts: filtered });
  } catch (error) {
    console.error("Error fetching drafts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = await ensureAdmin(supabase);
    if ("error" in admin) return admin.error as NextResponse;

    const body = await request.json();
    const { type, data } = body as { type: string; data: any };
    if (!type || !data) {
      return NextResponse.json(
        { error: "Missing type or data" },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();
    // Prefer table
    try {
      const { data: inserted, error } = await (supabase as any)
        .from("export_drafts")
        .insert({ type, data, created_at: nowIso })
        .select()
        .single();
      if (!error && inserted) {
        return NextResponse.json({
          message: "Draft saved successfully",
          draft: inserted,
        });
      }
    } catch (_) {}

    // Fallback to system_settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("config")
      .limit(1)
      .maybeSingle();
    const config = (settings as any)?.config
      ? typeof (settings as any).config === "string"
        ? JSON.parse((settings as any).config as string)
        : (settings as any).config
      : {};
    const drafts: SavedDraft[] = Array.isArray(config.saved_exports)
      ? (config.saved_exports as SavedDraft[])
      : [];
    const draft: SavedDraft = {
      id: `draft_${Date.now()}`,
      type,
      data,
      created_at: nowIso,
      updated_at: nowIso,
    };
    const newConfig = {
      ...config,
      saved_exports: [draft, ...drafts].slice(0, 200),
    };
    const { error: upsertError } = await (supabase as any)
      .from("system_settings")
      .upsert({ id: 1, config: newConfig, updated_at: nowIso });
    if (upsertError) throw upsertError;
    return NextResponse.json({ message: "Draft saved successfully", draft });
  } catch (error) {
    console.error("Error saving draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = await ensureAdmin(supabase);
    if ("error" in admin) return admin.error as NextResponse;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Prefer table
    try {
      const { error } = await (supabase as any)
        .from("export_drafts")
        .delete()
        .eq("id", id);
      if (!error) {
        return NextResponse.json({ message: "Draft deleted" });
      }
    } catch (_) {}

    // Fallback system_settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("config")
      .limit(1)
      .maybeSingle();
    const config = (settings as any)?.config
      ? typeof (settings as any).config === "string"
        ? JSON.parse((settings as any).config as string)
        : (settings as any).config
      : {};
    const drafts: SavedDraft[] = Array.isArray(config.saved_exports)
      ? (config.saved_exports as SavedDraft[])
      : [];
    const newDrafts = drafts.filter((d) => d.id !== id);
    const nowIso = new Date().toISOString();
    const newConfig = { ...config, saved_exports: newDrafts };
    const { error: upsertError } = await (supabase as any)
      .from("system_settings")
      .upsert({ id: 1, config: newConfig, updated_at: nowIso });
    if (upsertError) throw upsertError;
    return NextResponse.json({ message: "Draft deleted" });
  } catch (error) {
    console.error("Error deleting draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
