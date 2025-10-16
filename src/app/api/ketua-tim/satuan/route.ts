// File: src/app/api/ketua-tim/satuan/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function GET() {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation
    const { data: userProfile, error: profileError } = await serviceClient
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

    // Allow access for ketua_tim, admin, and pegawai
    const userRole = (userProfile as any).role;
    if (userRole && !["ketua_tim", "admin", "pegawai"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Invalid role" },
        { status: 403 },
      );
    }

    // Get active satuan only
    const { data: satuanList, error } = await serviceClient
      .from("satuan_master")
      .select("id, nama_satuan, deskripsi")
      .eq("is_active", true)
      .order("nama_satuan", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      data: satuanList || [],
    });
  } catch (error) {
    console.error("Satuan GET API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
