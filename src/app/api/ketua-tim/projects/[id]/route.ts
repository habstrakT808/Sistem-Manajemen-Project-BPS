// File: src/app/api/ketua-tim/projects/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

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

interface _Project {
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
    const supabase = (await createClient()) as any;
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { id: projectId } = await params;

    // Check if user is ketua tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization: rely on ownership checks below instead of global role

    // Get project with assignments
    const { data: project, error: projectError } = await (svc as any)
      .from("projects")
      .select(
        `
        *,
        project_members:project_members (
          id,
          user_id,
          role
        )
      `,
      )
      .eq("id", projectId)
      .single();

    if (projectError) {
      if (projectError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 },
        );
      }
      throw projectError;
    }

    // Enrich project with assignee details
    // Ownership check (since we used service client)
    if (
      !project ||
      ((project as any).ketua_tim_id !== user.id &&
        (project as any).leader_user_id !== user.id)
    ) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Enrich project members with user details
    if (project && Array.isArray((project as any).project_members)) {
      const members = (project as any).project_members as Array<{
        id: string;
        user_id: string;
        role: string;
      }>;
      const enriched = await Promise.all(
        members.map(async (m) => {
          const { data: u } = await (svc as any)
            .from("users")
            .select("nama_lengkap, email")
            .eq("id", m.user_id)
            .single();
          return { ...m, user: u || null };
        }),
      );
      (project as any).project_members = enriched;
    }

    // Build synthetic project_assignments array from assignment tables
    // Pegawai assignments (transport)
    const { data: paPegawai } = await (svc as any)
      .from("project_assignments")
      .select("id, assignee_id, uang_transport")
      .eq("project_id", projectId)
      .eq("assignee_type", "pegawai");
    const pegawaiAssignments = await Promise.all(
      (paPegawai || []).map(async (a: any) => {
        const { data: u } = await (svc as any)
          .from("users")
          .select("nama_lengkap, email")
          .eq("id", a.assignee_id)
          .single();
        return {
          id: a.id,
          assignee_type: "pegawai" as const,
          assignee_id: a.assignee_id,
          uang_transport: a.uang_transport ?? 0,
          honor: null,
          users: u || null,
        };
      }),
    );

    // Mitra assignments (honor)
    const { data: paMitra } = await (svc as any)
      .from("project_assignments")
      .select("id, assignee_id, honor")
      .eq("project_id", projectId)
      .eq("assignee_type", "mitra");
    const mitraAssignments = await Promise.all(
      (paMitra || []).map(async (a: any) => {
        const { data: m } = await (svc as any)
          .from("mitra")
          .select("nama_mitra, jenis, rating_average")
          .eq("id", a.assignee_id)
          .single();
        return {
          id: a.id,
          assignee_type: "mitra" as const,
          assignee_id: a.assignee_id,
          uang_transport: null,
          honor: a.honor ?? 0,
          mitra: m || null,
        };
      }),
    );

    (project as any).project_assignments = [
      ...pegawaiAssignments,
      ...mitraAssignments,
    ];

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("Project detail fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = (await createClient()) as any;
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { id: projectId } = await params;

    // Check if user is ketua tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Skip global role gating; we will check ownership instead

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
        { status: 400 },
      );
    }

    // Check if project exists and belongs to user (using service client to bypass RLS but enforce ownership ourselves)
    const { data: existingProject, error: projectError } = await (svc as any)
      .from("projects")
      .select("id, ketua_tim_id, leader_user_id")
      .eq("id", projectId)
      .single();

    if (
      projectError ||
      !existingProject ||
      ((existingProject as any).ketua_tim_id !== user.id &&
        (existingProject as any).leader_user_id !== user.id)
    ) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update project
    const { data: updatedProject, error: updateError } = await (svc as any)
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
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Delete existing assignments
    const { error: deleteError } = await (svc as any)
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

      const { error: insertError } = await (svc as any)
        .from("project_assignments")
        .insert(assignments);

      if (insertError) {
        console.error("Error inserting new assignments:", insertError);
        return NextResponse.json(
          { error: "Failed to update project assignments" },
          { status: 500 },
        );
      }
    }

    // Sync project_members with pegawai assignments (ensure leader stays)
    try {
      // Fetch current members
      const { data: currentMembers } = await (svc as any)
        .from("project_members")
        .select("user_id, role")
        .eq("project_id", projectId);

      const currentMemberIds = new Set<string>(
        (currentMembers || []).map((m: any) => m.user_id),
      );

      // Desired members: leader + all pegawai assignees
      const leaderId =
        (existingProject as any).leader_user_id ||
        (existingProject as any).ketua_tim_id;
      const desiredMemberIds = new Set<string>([leaderId]);
      for (const a of body.project_assignments) {
        if (a.assignee_type === "pegawai" && a.assignee_id)
          desiredMemberIds.add(a.assignee_id);
      }

      // Upsert missing members (as member role)
      const toInsert: Array<{
        project_id: string;
        user_id: string;
        role: string;
      }> = [];
      desiredMemberIds.forEach((uid) => {
        if (!currentMemberIds.has(uid)) {
          toInsert.push({
            project_id: projectId,
            user_id: uid,
            role: uid === leaderId ? "leader" : "member",
          });
        }
      });
      if (toInsert.length > 0) {
        await (svc as any).from("project_members").insert(toInsert);
      }

      // Remove members no longer desired (but never remove leader)
      const toRemove = (currentMembers || [])
        .filter(
          (m: any) => m.role !== "leader" && !desiredMemberIds.has(m.user_id),
        )
        .map((m: any) => m.user_id);
      if (toRemove.length > 0) {
        await (svc as any)
          .from("project_members")
          .delete()
          .eq("project_id", projectId)
          .in("user_id", toRemove);
      }
    } catch (syncErr) {
      console.error("Warning: failed to sync project_members:", syncErr);
      // Do not fail the whole request; members can be adjusted later
    }

    return NextResponse.json({
      data: updatedProject,
      message: "Project updated successfully",
    });
  } catch (error) {
    console.error("Project update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = (await createClient()) as any;
    const { id: projectId } = await params;

    // Auth: must be ketua_tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service client to avoid RLS issues like in GET endpoint
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Ensure the project belongs to this ketua tim
    const { data: project, error: projectError } = await (svc as any)
      .from("projects")
      .select("id, ketua_tim_id, leader_user_id")
      .eq("id", projectId)
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 },
      );
    }

    // Delete dependent rows first (assignments, tasks)
    const { error: deleteAssignmentsError } = await (svc as any)
      .from("project_assignments")
      .delete()
      .eq("project_id", projectId);

    if (deleteAssignmentsError) {
      console.error("Failed to delete assignments:", deleteAssignmentsError);
    }

    const { error: deleteTasksError } = await (svc as any)
      .from("tasks")
      .delete()
      .eq("project_id", projectId);

    if (deleteTasksError) {
      console.error("Failed to delete tasks:", deleteTasksError);
    }

    // Delete the project using OR condition to match ownership check
    const { error: deleteProjectError } = await (svc as any)
      .from("projects")
      .delete()
      .eq("id", projectId)
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`);

    if (deleteProjectError) {
      throw deleteProjectError;
    }

    return NextResponse.json({ message: "Project deleted" });
  } catch (error) {
    console.error("Project delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
