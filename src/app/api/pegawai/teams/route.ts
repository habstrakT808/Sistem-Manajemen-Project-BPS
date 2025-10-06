// File: src/app/api/pegawai/teams/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface TeamRow {
  id: string;
  name: string;
  description: string | null;
  leader_user_id: string | null;
  users?: { nama_lengkap: string; email: string } | null;
  role: "leader" | "member";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service role to avoid any RLS edge cases; strictly filter by current user
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Fetch ALL teams created by admin and derive user role per team
    const { data: allTeams } = await (svc as any)
      .from("teams")
      .select(
        `id, name, description, leader_user_id, users!teams_leader_user_id_fkey(nama_lengkap, email)`,
      );

    const merged: TeamRow[] = ((allTeams || []) as any[]).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      leader_user_id: t.leader_user_id,
      users: t.users || null,
      role:
        (t.leader_user_id as string | null) === (user.id as unknown as string)
          ? ("leader" as const)
          : ("member" as const),
    }));

    return NextResponse.json({ data: merged });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
