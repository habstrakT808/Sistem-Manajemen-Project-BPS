import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

const svc = createServiceClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
