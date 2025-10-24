import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || (userProfile as { role: string }).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use service client to bypass RLS and avoid infinite recursion
    const svc = await createServiceRoleClient();

    // Fetch pegawai (users with role pegawai)
    const { data: pegawai, error: pegawaiError } = await (svc as any)
      .from("users")
      .select("id, nama_lengkap, nip")
      .eq("role", "pegawai")
      .order("nama_lengkap", { ascending: true });

    if (pegawaiError) {
      throw pegawaiError;
    }

    return NextResponse.json(pegawai || []);
  } catch (error) {
    console.error("Error fetching pegawai:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
