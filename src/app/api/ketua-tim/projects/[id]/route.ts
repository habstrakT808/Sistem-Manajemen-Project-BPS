// File: src/app/api/ketua-tim/projects/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface ProjectAssignment {
  id: string;
  assignee_type: "pegawai" | "mitra";
  assignee_id: string;
  uang_transport: number | null;
  honor: number | null;
}

interface Project {
  id: string;
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  ketua_tim_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  project_assignments?: ProjectAssignment[];
}

interface UpdateProjectRequest {
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  status: "upcoming" | "active" | "completed";
  project_assignments: Array<{
    assignee_type: "pegawai" | "mitra";
    assignee_id: string;
    uang_transport: number | null;
    honor: number | null;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { id: projectId } = await params;

    // Check if user is ketua tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "ketua_tim"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get project with assignments
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(
        `
        *,
        project_assignments (
          id,
          assignee_type,
          assignee_id,
          uang_transport,
          honor
        )
      `
      )
      .eq("id", projectId)
      .eq("ketua_tim_id", user.id)
      .single();

    if (projectError) {
      if (projectError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
      throw projectError;
    }

    // Enrich project with assignee details
    if (
      project &&
      project.project_assignments &&
      project.project_assignments.length > 0
    ) {
      const typedProject = project as Project;
      const enrichedAssignments = await Promise.all(
        (typedProject.project_assignments || []).map(
          async (assignment: ProjectAssignment) => {
            if (assignment.assignee_type === "pegawai") {
              const { data: user } = await supabase
                .from("users")
                .select("nama_lengkap, email")
                .eq("id", assignment.assignee_id)
                .single();

              return {
                ...assignment,
                users: user || null,
              };
            } else if (assignment.assignee_type === "mitra") {
              const { data: mitra } = await supabase
                .from("mitra")
                .select("nama_mitra, jenis, rating_average")
                .eq("id", assignment.assignee_id)
                .single();

              return {
                ...assignment,
                mitra: mitra || null,
              };
            }

            return assignment;
          }
        )
      );

      typedProject.project_assignments = enrichedAssignments;
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("Project detail fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { id: projectId } = await params;

    // Check if user is ketua tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "ketua_tim"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const body: UpdateProjectRequest = await request.json();

    // Validate required fields
    if (
      !body.nama_project ||
      !body.deskripsi ||
      !body.tanggal_mulai ||
      !body.deadline
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if project exists and belongs to user
    const { data: existingProject, error: projectError } = await supabase
      .from("projects")
      .select("id, ketua_tim_id")
      .eq("id", projectId)
      .eq("ketua_tim_id", user.id)
      .single();

    if (projectError || !existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update({
        nama_project: body.nama_project,
        deskripsi: body.deskripsi,
        tanggal_mulai: body.tanggal_mulai,
        deadline: body.deadline,
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("ketua_tim_id", user.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Delete existing assignments
    const { error: deleteError } = await supabase
      .from("project_assignments")
      .delete()
      .eq("project_id", projectId);

    if (deleteError) {
      console.error("Error deleting existing assignments:", deleteError);
    }

    // Insert new assignments
    if (body.project_assignments && body.project_assignments.length > 0) {
      const assignments = body.project_assignments.map((assignment) => ({
        project_id: projectId,
        assignee_type: assignment.assignee_type,
        assignee_id: assignment.assignee_id,
        uang_transport: assignment.uang_transport,
        honor: assignment.honor,
      }));

      const { error: insertError } = await supabase
        .from("project_assignments")
        .insert(assignments);

      if (insertError) {
        console.error("Error inserting new assignments:", insertError);
        return NextResponse.json(
          { error: "Failed to update project assignments" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      data: updatedProject,
      message: "Project updated successfully",
    });
  } catch (error) {
    console.error("Project update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
