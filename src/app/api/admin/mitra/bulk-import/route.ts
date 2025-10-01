import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Database } from "@/../database/types/database.types";

const supabaseAdmin = createServiceClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

type MitraInsert = Database["public"]["Tables"]["mitra"]["Insert"] & {
  posisi_id?: string;
  jeniskelamin?: "laki_laki" | "perempuan";
  pendidikan?: "sma" | "d4s1";
  pekerjaan_id?: string;
  sobat_id?: string;
  email?: string;
};

interface ImportMitraData {
  nama_mitra: string;
  jenis: "individu";
  kontak: string;
  alamat: string;
  is_active: boolean;
  posisi_id?: string;
  jeniskelamin?: "laki_laki" | "perempuan";
  pendidikan?: "sma" | "d4s1";
  pekerjaan_id?: string;
  sobat_id: string;
  email: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin

    const { data: userProfile } = await (supabaseAdmin as any)
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { mitra } = body;

    if (!Array.isArray(mitra) || mitra.length === 0) {
      return NextResponse.json(
        { error: "Invalid data: mitra array is required" },
        { status: 400 },
      );
    }

    // Validate each mitra data
    const validatedMitra: ImportMitraData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < mitra.length; i++) {
      const item = mitra[i];
      const rowErrors: string[] = [];

      // Required field validation
      if (!item.nama_mitra?.trim()) {
        rowErrors.push("Nama mitra is required");
      }
      if (!item.kontak?.trim()) {
        rowErrors.push("Kontak is required");
      }
      if (!item.alamat?.trim()) {
        rowErrors.push("Alamat is required");
      }
      if (!item.sobat_id?.trim()) {
        rowErrors.push("SOBAT ID is required");
      }
      if (!item.email?.trim()) {
        rowErrors.push("Email is required");
      } else if (!/\S+@\S+\.\S+/.test(item.email)) {
        rowErrors.push("Invalid email format");
      }

      // Enum validation
      if (!["laki_laki", "perempuan"].includes(item.jeniskelamin)) {
        rowErrors.push("Invalid jenis kelamin");
      }
      if (!["sma", "d4s1"].includes(item.pendidikan)) {
        rowErrors.push("Invalid pendidikan");
      }

      if (rowErrors.length > 0) {
        errors.push(`Row ${i + 1}: ${rowErrors.join(", ")}`);
        continue;
      }

      validatedMitra.push({
        nama_mitra: item.nama_mitra.trim(),
        jenis: "individu",
        kontak: item.kontak.trim(),
        alamat: item.alamat.trim(),
        is_active: true,
        posisi_id: item.posisi_id,
        jeniskelamin: item.jeniskelamin,
        pendidikan: item.pendidikan,
        pekerjaan_id: item.pekerjaan_id,
        sobat_id: item.sobat_id.trim(),
        email: item.email.trim(),
      });
    }

    if (validatedMitra.length === 0) {
      return NextResponse.json(
        {
          error: "No valid data to import",
          validation_errors: errors,
        },
        { status: 400 },
      );
    }

    // Check for existing SOBAT IDs in the database
    const sobatIds = validatedMitra.map((m) => m.sobat_id);

    const { data: existingMitra } = await (supabaseAdmin as any)
      .from("mitra")
      .select("sobat_id, id")
      .in("sobat_id", sobatIds);

    const existingSobatIds = new Set(
      existingMitra?.map((m: any) => m.sobat_id) || [],
    );

    // Separate data for insert and update
    const newMitra = validatedMitra.filter(
      (m) => !existingSobatIds.has(m.sobat_id),
    );
    const updateMitra = validatedMitra.filter((m) =>
      existingSobatIds.has(m.sobat_id),
    );

    // Prepare data for insertion (remove null values for optional fields)
    const insertData: MitraInsert[] = newMitra.map((item) => {
      const data: MitraInsert = {
        nama_mitra: item.nama_mitra,
        jenis: item.jenis,
        kontak: item.kontak,
        alamat: item.alamat,
        is_active: item.is_active,
        jeniskelamin: item.jeniskelamin,
        pendidikan: item.pendidikan,
        sobat_id: item.sobat_id,
        email: item.email,
      };

      // Only include posisi_id and pekerjaan_id if they have values
      if (item.posisi_id) {
        data.posisi_id = item.posisi_id;
      }
      if (item.pekerjaan_id) {
        data.pekerjaan_id = item.pekerjaan_id;
      }

      return data;
    });

    // Prepare data for updates (remove null values for optional fields)
    const updateData: (MitraInsert & { sobat_id: string })[] = updateMitra.map(
      (item) => {
        const data: MitraInsert & { sobat_id: string } = {
          nama_mitra: item.nama_mitra,
          jenis: item.jenis,
          kontak: item.kontak,
          alamat: item.alamat,
          is_active: item.is_active,
          jeniskelamin: item.jeniskelamin,
          pendidikan: item.pendidikan,
          sobat_id: item.sobat_id,
          email: item.email,
        };

        // Only include posisi_id and pekerjaan_id if they have values
        if (item.posisi_id) {
          data.posisi_id = item.posisi_id;
        }
        if (item.pekerjaan_id) {
          data.pekerjaan_id = item.pekerjaan_id;
        }

        return data;
      },
    );

    // Process data in batches to avoid timeout
    const batchSize = 100;
    let totalInserted = 0;
    let totalUpdated = 0;
    const processErrors: string[] = [];

    // Insert new data
    for (let i = 0; i < insertData.length; i += batchSize) {
      const batch = insertData.slice(i, i + batchSize);

      const { data: insertResult, error: insertError } = await (
        supabaseAdmin as any
      )
        .from("mitra")
        .insert(batch)
        .select("id");

      if (insertError) {
        console.error("Batch insert error:", insertError);
        processErrors.push(
          `Insert batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`,
        );
      } else {
        totalInserted += insertResult?.length || 0;
      }
    }

    // Update existing data
    for (let i = 0; i < updateData.length; i += batchSize) {
      const batch = updateData.slice(i, i + batchSize);

      for (const item of batch) {
        const { sobat_id, ...updateFields } = item;

        const { error: updateError } = await (supabaseAdmin as any)
          .from("mitra")
          .update(updateFields)
          .eq("sobat_id", sobat_id);

        if (updateError) {
          console.error("Update error:", updateError);
          processErrors.push(
            `Update SOBAT ID ${sobat_id}: ${updateError.message}`,
          );
        } else {
          totalUpdated++;
        }
      }
    }

    const response: any = {
      inserted_count: totalInserted,
      updated_count: totalUpdated,
      total_processed: validatedMitra.length,
      new_records: newMitra.length,
      updated_records: updateMitra.length,
    };

    if (errors.length > 0) {
      response.validation_errors = errors;
    }

    if (processErrors.length > 0) {
      response.process_errors = processErrors;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
