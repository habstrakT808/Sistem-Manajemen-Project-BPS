import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

const svc = createServiceClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  const { data, error } = await (svc as any)
    .from("mitra_occupations")
    .select("id, name")
    .order("name", { ascending: true });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = String(body?.name || "").trim();
  if (!name)
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  const { data, error } = await (svc as any)
    .from("mitra_occupations")
    .insert({ name })
    .select("id, name")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const force = searchParams.get("force");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  // If force is requested, nullify references first to avoid FK violation
  if (force) {
    const { error: updErr } = await (svc as any)
      .from("mitra")
      .update({ pekerjaan_id: null })
      .eq("pekerjaan_id", id);
    if (updErr)
      return NextResponse.json({ error: updErr.message }, { status: 400 });
  } else {
    // Check for existing references; if present, block with a clear error
    const { count, error: cntErr } = await (svc as any)
      .from("mitra")
      .select("id", { count: "exact", head: true })
      .eq("pekerjaan_id", id);
    if (cntErr)
      return NextResponse.json({ error: cntErr.message }, { status: 400 });
    if ((count || 0) > 0) {
      return NextResponse.json(
        {
          error:
            "Pekerjaan sedang dipakai oleh mitra lain. Gunakan force=1 untuk menghapus dan mengosongkan referensi.",
          in_use_count: count,
        },
        { status: 409 },
      );
    }
  }

  const { error } = await (svc as any)
    .from("mitra_occupations")
    .delete()
    .eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
