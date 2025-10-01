import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(_request: NextRequest) {
  try {
    console.log("🔍 [DEBUG] Checking users...");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check users
    const { data: users } = await supabase
      .from("users")
      .select("id, nama_lengkap, email, role, is_active")
      .eq("is_active", true)
      .order("role");

    // Check user_profiles (auth users)
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, email, nama_lengkap, role")
      .order("role");

    return NextResponse.json({
      success: true,
      data: {
        users: users || [],
        profiles: profiles || [],
        summary: {
          usersCount: users?.length || 0,
          profilesCount: profiles?.length || 0,
          ketuaTimUsers: users?.filter((u) => u.role === "ketua_tim") || [],
          pegawaiUsers: users?.filter((u) => u.role === "pegawai") || [],
          mitraUsers: users?.filter((u) => u.role === "mitra") || [],
        },
      },
    });
  } catch (error) {
    console.error("🔍 [DEBUG] Error checking users:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
