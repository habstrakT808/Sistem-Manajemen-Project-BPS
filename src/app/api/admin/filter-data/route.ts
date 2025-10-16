import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function GET(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 },
      );
    }

    if (userProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Fetch all filter data in parallel
    const [pegawaiResult, mitraResult, projectsResult, teamsResult] =
      await Promise.all([
        // Pegawai data
        (svc as any)
          .from("users")
          .select("id, nama_lengkap")
          .not("nama_lengkap", "is", null)
          .order("nama_lengkap"),

        // Mitra data
        (svc as any)
          .from("mitra")
          .select("id, nama_mitra")
          .eq("is_active", true)
          .order("nama_mitra"),

        // Projects data
        (svc as any)
          .from("projects")
          .select("id, nama_project")
          .order("nama_project"),

        // Teams data
        (svc as any).from("teams").select("id, name").order("name"),
      ]);

    if (pegawaiResult.error) throw pegawaiResult.error;
    if (mitraResult.error) throw mitraResult.error;
    if (projectsResult.error) throw projectsResult.error;
    if (teamsResult.error) throw teamsResult.error;

    return NextResponse.json({
      pegawai: (pegawaiResult.data || []).map((p: any) => ({
        id: p.id,
        name: p.nama_lengkap,
      })),
      mitra: (mitraResult.data || []).map((m: any) => ({
        id: m.id,
        name: m.nama_mitra,
      })),
      projects: (projectsResult.data || []).map((p: any) => ({
        id: p.id,
        name: p.nama_project,
      })),
      teams: (teamsResult.data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
      })),
    });
  } catch (error) {
    console.error("Admin filter data API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
