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

    // Fetch mitra
    const { data: mitra, error: mitraError } = await (svc as any)
      .from("mitra")
      .select("id, nama_mitra, sobat_id")
      .eq("is_active", true)
      .order("nama_mitra", { ascending: true });

    if (mitraError) {
      throw mitraError;
    }

    return NextResponse.json(mitra || []);
  } catch (error) {
    console.error("Error fetching mitra:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
