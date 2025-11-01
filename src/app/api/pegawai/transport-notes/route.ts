import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

type TransportNote = {
  id: string; // `${userId}_${allocation_id || date}`
  user_id: string;
  allocation_id?: string;
  date?: string; // YYYY-MM-DD
  project_id?: string;
  task_id?: string;
  note: string;
  updated_at: string;
};

async function getSettings(reader: any) {
  const { data } = await reader
    .from("system_settings")
    .select("config")
    .limit(1)
    .maybeSingle();
  const cfg = data?.config
    ? typeof data.config === "string"
      ? JSON.parse(data.config)
      : data.config
    : {};
  return cfg || {};
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const searchParams = request.nextUrl.searchParams;
    const allocationId = searchParams.get("allocation_id") || undefined;
    const date = searchParams.get("date") || undefined;

    const cfg = await getSettings(svc);
    const notes: TransportNote[] = Array.isArray(cfg.saved_transport_notes)
      ? (cfg.saved_transport_notes as TransportNote[])
      : [];

    const filtered = notes.filter((n) => {
      if (allocationId && n.allocation_id === allocationId) return true;
      if (date && n.date === date) return true;
      return false;
    });

    return NextResponse.json({ notes: filtered });
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
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const body = await request.json();
    const { allocation_id, date, project_id, task_id, note } = body || {};

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cfg = await getSettings(svc);
    const notes: TransportNote[] = Array.isArray(cfg.saved_transport_notes)
      ? (cfg.saved_transport_notes as TransportNote[])
      : [];

    const id = `${user.id}_${allocation_id || date}`;
    const now = new Date().toISOString();
    const newNote: TransportNote = {
      id,
      user_id: user.id,
      allocation_id,
      date,
      project_id,
      task_id,
      note: String(note || ""),
      updated_at: now,
    };

    const existingIndex = notes.findIndex((n) => n.id === id);
    if (existingIndex >= 0) notes[existingIndex] = newNote;
    else notes.unshift(newNote);

    const { error: upsertError } = await (svc as any)
      .from("system_settings")
      .upsert({
        id: 1,
        config: {
          ...(cfg || {}),
          saved_transport_notes: notes,
        },
        updated_at: now,
      });

    if (upsertError) throw upsertError;

    return NextResponse.json({ message: "Saved", note: newNote });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
