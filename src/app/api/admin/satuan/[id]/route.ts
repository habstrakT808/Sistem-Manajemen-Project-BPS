// File: src/app/api/admin/satuan/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface SatuanFormData {
  nama_satuan: string;
  deskripsi: string;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { id: satuanId } = await params;

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

    // Check if satuan exists
    const { data: existingSatuan } = await serviceClient
      .from("satuan_master")
      .select("id")
      .eq("id", satuanId)
      .single();

    if (!existingSatuan) {
      return NextResponse.json(
        { error: "Satuan tidak ditemukan" },
        { status: 404 },
      );
    }

    // Check if nama_satuan already exists (excluding current record)
    const { data: duplicateSatuan } = await serviceClient
      .from("satuan_master")
      .select("id")
      .eq("nama_satuan", nama_satuan.trim())
      .neq("id", satuanId)
      .single();

    if (duplicateSatuan) {
      return NextResponse.json(
        { error: "Satuan dengan nama tersebut sudah ada" },
        { status: 400 },
      );
    }

    // Update satuan
    const updateData = {
      nama_satuan: nama_satuan.trim(),
      deskripsi: deskripsi?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedSatuan, error: updateError } = await (
      serviceClient as any
    )
      .from("satuan_master")
      .update(updateData)
      .eq("id", satuanId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      message: "Satuan berhasil diperbarui",
      data: updatedSatuan,
    });
  } catch (error) {
    console.error("Satuan PUT API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { id: satuanId } = await params;

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

    // Check if satuan exists
    const { data: existingSatuan } = await serviceClient
      .from("satuan_master")
      .select("id, nama_satuan")
      .eq("id", satuanId)
      .single();

    if (!existingSatuan) {
      return NextResponse.json(
        { error: "Satuan tidak ditemukan" },
        { status: 404 },
      );
    }

    // Check if satuan is being used in tasks
    const { data: tasksUsingSatuan } = await serviceClient
      .from("tasks")
      .select("id")
      .eq("satuan_id", satuanId)
      .limit(1);

    if (tasksUsingSatuan && tasksUsingSatuan.length > 0) {
      return NextResponse.json(
        {
          error:
            "Satuan tidak dapat dihapus karena sedang digunakan dalam tugas",
        },
        { status: 400 },
      );
    }

    // Check if satuan is being used in allocations
    const { data: allocationsUsingSatuan } = await serviceClient
      .from("task_transport_allocations")
      .select("id")
      .eq("satuan_id", satuanId)
      .limit(1);

    if (allocationsUsingSatuan && allocationsUsingSatuan.length > 0) {
      return NextResponse.json(
        {
          error:
            "Satuan tidak dapat dihapus karena sedang digunakan dalam alokasi",
        },
        { status: 400 },
      );
    }

    // Delete satuan
    const { error: deleteError } = await serviceClient
      .from("satuan_master")
      .delete()
      .eq("id", satuanId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: "Satuan berhasil dihapus",
    });
  } catch (error) {
    console.error("Satuan DELETE API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
