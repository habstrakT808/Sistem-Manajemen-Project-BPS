// File: src/app/api/ketua-tim/projects/[id]/mitra/route.ts
// API endpoint for fetching Mitra assigned to a specific project

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface ProjectMitra {
  id: string;
  nama_mitra: string;
  jenis: "perusahaan" | "individu";
  rating_average: number;
  kontak?: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { id: projectId } = await params;

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    // Verify ownership (leader or ketua) using service client to avoid RLS
    const { data: project, error: projectError } = await (svc as any)
      .from("projects")
      .select("id, leader_user_id, ketua_tim_id")
      .eq("id", projectId)
      .single();

    if (
      projectError ||
      !project ||
      ((project as { leader_user_id?: string; ketua_tim_id?: string })
        .leader_user_id !== user.id &&
        (project as { leader_user_id?: string; ketua_tim_id?: string })
          .ketua_tim_id !== user.id)
    ) {
      return NextResponse.json(
        {
          error: "Project not found or access denied",
          code: "PROJECT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Get project mitra assignments
    const { data: mitraAssignments, error: mitraError } = await (svc as any)
      .from("project_assignments")
      .select("assignee_id, honor")
      .eq("project_id", projectId)
      .eq("assignee_type", "mitra");

    if (mitraError) {
      console.error("Mitra assignments fetch error:", mitraError);
      throw mitraError;
    }

    if (!mitraAssignments || mitraAssignments.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get mitra details
    const mitraIds = mitraAssignments.map(
      (assignment: { assignee_id: string }) => assignment.assignee_id,
    );
    const { data: mitraData, error: mitraDataError } = await (svc as any)
      .from("mitra")
      .select("id, nama_mitra, jenis, rating_average, kontak")
      .in("id", mitraIds)
      .eq("is_active", true);

    if (mitraDataError) {
      console.error("Mitra data fetch error:", mitraDataError);
      throw mitraDataError;
    }

    // Format response
    const projectMitra: ProjectMitra[] = (mitraData || []).map(
      (mitra: any) => ({
        id: mitra.id,
        nama_mitra: mitra.nama_mitra,
        jenis: mitra.jenis,
        rating_average: mitra.rating_average || 0,
        kontak: mitra.kontak,
      }),
    );

    return NextResponse.json({ data: projectMitra });
  } catch (error) {
    console.error("Project mitra fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
