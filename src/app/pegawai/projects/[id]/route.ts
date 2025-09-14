// File: src/app/api/pegawai/projects/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { id: projectId } = await params;

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "pegawai"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify pegawai is assigned to this project
    const { data: assignment, error: assignmentError } = await supabase
      .from("project_assignments")
      .select("uang_transport")
      .eq("project_id", projectId)
      .eq("assignee_type", "pegawai")
      .eq("assignee_id", user.id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(
        `
        id,
        nama_project,
        deskripsi,
        tanggal_mulai,
        deadline,
        status,
        users!inner (nama_lengkap, email)
      `
      )
      .eq("id", projectId)
      .single();

    if (projectError) {
      throw projectError;
    }

    // Get my tasks for this project
    const { data: myTasks } = await supabase
      .from("tasks")
      .select("id, deskripsi_tugas, tanggal_tugas, status, response_pegawai")
      .eq("project_id", projectId)
      .eq("pegawai_id", user.id)
      .order("tanggal_tugas", { ascending: true });

    // Calculate my task stats
    const taskStats = {
      pending: (myTasks || []).filter(
        (t: { status: string }) => t.status === "pending"
      ).length,
      in_progress: (myTasks || []).filter(
        (t: { status: string }) => t.status === "in_progress"
      ).length,
      completed: (myTasks || []).filter(
        (t: { status: string }) => t.status === "completed"
      ).length,
      total: (myTasks || []).length,
    };

    const myProgress =
      taskStats.total > 0
        ? Math.round((taskStats.completed / taskStats.total) * 100)
        : 0;

    // Get team members (pegawai)
    const { data: teamAssignments } = await supabase
      .from("project_assignments")
      .select(
        `
        assignee_id,
        uang_transport,
        users!inner (nama_lengkap, email)
      `
      )
      .eq("project_id", projectId)
      .eq("assignee_type", "pegawai");

    // Get mitra partners
    const { data: mitraAssignments } = await supabase
      .from("project_assignments")
      .select(
        `
        assignee_id,
        honor,
        mitra!inner (nama_mitra, jenis, rating_average)
      `
      )
      .eq("project_id", projectId)
      .eq("assignee_type", "mitra");

    // Format team members
    const teamMembers = (teamAssignments || []).map(
      (assignment: {
        assignee_id: string;
        uang_transport: number | null;
        users: {
          nama_lengkap: string;
          email: string;
        };
      }) => ({
        id: assignment.assignee_id,
        nama_lengkap: assignment.users.nama_lengkap,
        email: assignment.users.email,
        uang_transport: assignment.uang_transport || 0,
      })
    );

    // Format mitra partners
    const mitraPartners = (mitraAssignments || []).map(
      (assignment: {
        assignee_id: string;
        honor: number | null;
        mitra: {
          nama_mitra: string;
          jenis: string;
          rating_average: number;
        };
      }) => ({
        id: assignment.assignee_id,
        nama_mitra: assignment.mitra.nama_mitra,
        jenis: assignment.mitra.jenis,
        honor: assignment.honor || 0,
        rating_average: assignment.mitra.rating_average,
      })
    );

    const projectDetail = {
      id: project.id,
      nama_project: project.nama_project,
      deskripsi: project.deskripsi,
      tanggal_mulai: project.tanggal_mulai,
      deadline: project.deadline,
      status: project.status,
      ketua_tim: project.users,
      uang_transport: assignment.uang_transport || 0,
      my_task_stats: taskStats,
      my_progress: myProgress,
      team_size: teamMembers.length + mitraPartners.length,
      my_tasks: myTasks || [],
      team_members: teamMembers,
      mitra_partners: mitraPartners,
    };

    return NextResponse.json({ data: projectDetail });
  } catch (error) {
    console.error("Project Detail API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
