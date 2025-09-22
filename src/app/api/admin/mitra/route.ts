import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/../database/types/database.types";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from("mitra")
      .select(
        `
        *,
        mitra_reviews (
          rating
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching mitra:", error);
      return NextResponse.json(
        { error: "Failed to fetch mitra" },
        { status: 400 }
      );
    }

    // Calculate average rating for each mitra
    const mitraWithStats =
      data?.map(
        (
          mitra: Database["public"]["Tables"]["mitra"]["Row"] & {
            mitra_reviews?: { rating: number }[];
          }
        ) => ({
          ...mitra,
          review_count: mitra.mitra_reviews?.length || 0,
          average_rating: mitra.mitra_reviews?.length
            ? (
                mitra.mitra_reviews.reduce(
                  (sum: number, review: { rating: number }) =>
                    sum + review.rating,
                  0
                ) / mitra.mitra_reviews.length
              ).toFixed(1)
            : 0,
        })
      ) || [];

    return NextResponse.json({ data: mitraWithStats });
  } catch (error) {
    console.error("Error in GET /api/admin/mitra:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nama_mitra,
      jenis,
      kontak,
      alamat,
      deskripsi,
      is_active,
      posisi_id,
      posisi_nama,
      jeniskelamin,
      pendidikan,
      pekerjaan_id,
      pekerjaan_nama,
      sobat_id,
      email,
    } = body;

    // Validate required fields
    if (!nama_mitra || !jenis) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const insertData = {
      nama_mitra,
      jenis,
      kontak: kontak || null,
      alamat: alamat || null,
      deskripsi: deskripsi || null,
      is_active: is_active !== undefined ? is_active : true,
      posisi_id: posisi_id || null,
      jeniskelamin: jeniskelamin || null,
      pendidikan: pendidikan || null,
      pekerjaan_id: pekerjaan_id || null,
      sobat_id: sobat_id || null,
      email: email || null,
    } as any;

    // If posisi_nama provided and no posisi_id, create it
    if (!insertData.posisi_id && posisi_nama) {
      const { data: pos } = await (supabaseAdmin as any)
        .from("mitra_positions")
        .insert({ name: posisi_nama })
        .select("id")
        .single();
      if (pos?.id) insertData.posisi_id = pos.id;
    }

    // If pekerjaan_nama provided and no pekerjaan_id, create it
    if (!insertData.pekerjaan_id && pekerjaan_nama) {
      const { data: occ } = await (supabaseAdmin as any)
        .from("mitra_occupations")
        .insert({ name: pekerjaan_nama })
        .select("id")
        .single();
      if (occ?.id) insertData.pekerjaan_id = occ.id;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from("mitra")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating mitra:", error);
      return NextResponse.json(
        { error: "Failed to create mitra" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Mitra created successfully",
      data,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/mitra:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      nama_mitra,
      jenis,
      kontak,
      alamat,
      deskripsi,
      is_active,
      posisi_id,
      posisi_nama,
      jeniskelamin,
      pendidikan,
      pekerjaan_id,
      pekerjaan_nama,
      sobat_id,
      email,
    } = body;

    if (!id || !nama_mitra || !jenis) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const updateData = {
      nama_mitra,
      jenis,
      kontak: kontak || null,
      alamat: alamat || null,
      deskripsi: deskripsi || null,
      is_active: is_active !== undefined ? is_active : true,
      updated_at: new Date().toISOString(),
      posisi_id: posisi_id || null,
      jeniskelamin: jeniskelamin || null,
      pendidikan: pendidikan || null,
      pekerjaan_id: pekerjaan_id || null,
      sobat_id: sobat_id || null,
      email: email || null,
    } as any;

    if (!updateData.posisi_id && posisi_nama) {
      const { data: pos } = await (supabaseAdmin as any)
        .from("mitra_positions")
        .insert({ name: posisi_nama })
        .select("id")
        .single();
      if (pos?.id) updateData.posisi_id = pos.id;
    }

    if (!updateData.pekerjaan_id && pekerjaan_nama) {
      const { data: occ } = await (supabaseAdmin as any)
        .from("mitra_occupations")
        .insert({ name: pekerjaan_nama })
        .select("id")
        .single();
      if (occ?.id) updateData.pekerjaan_id = occ.id;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("mitra")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating mitra:", error);
      return NextResponse.json(
        { error: "Failed to update mitra" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Mitra updated successfully",
    });
  } catch (error) {
    console.error("Error in PUT /api/admin/mitra:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Mitra ID is required" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("mitra")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting mitra:", error);
      return NextResponse.json(
        { error: "Failed to delete mitra" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Mitra deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/mitra:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
