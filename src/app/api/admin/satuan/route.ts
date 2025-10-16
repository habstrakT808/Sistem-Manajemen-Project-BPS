// File: src/app/api/admin/satuan/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface SatuanFormData {
  nama_satuan: string;
  deskripsi: string;
}

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

    if (profileError || !userProfile || (userProfile as any).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all satuan
    const { data: satuanList, error } = await serviceClient
      .from("satuan_master")
      .select("*")
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

export async function POST(request: NextRequest) {
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

    if (profileError || !userProfile || (userProfile as any).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { nama_satuan, deskripsi }: SatuanFormData = body;

    // Validate input
    if (!nama_satuan || nama_satuan.trim() === "") {
      return NextResponse.json(
        { error: "Nama satuan harus diisi" },
        { status: 400 },
      );
    }

    // Check if satuan already exists
    const { data: existingSatuan } = await serviceClient
      .from("satuan_master")
      .select("id")
      .eq("nama_satuan", nama_satuan.trim())
      .single();

    if (existingSatuan) {
      return NextResponse.json(
        { error: "Satuan dengan nama tersebut sudah ada" },
        { status: 400 },
      );
    }

    // Create new satuan
    const { data: newSatuan, error: insertError } = await (serviceClient as any)
      .from("satuan_master")
      .insert({
        nama_satuan: nama_satuan.trim(),
        deskripsi: deskripsi?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      message: "Satuan berhasil dibuat",
      data: newSatuan,
    });
  } catch (error) {
    console.error("Satuan POST API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
