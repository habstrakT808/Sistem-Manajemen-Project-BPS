// File: src/app/api/pegawai/projects/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface ProjectDetail {
  id: string;
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  status: "upcoming" | "active" | "completed";
  ketua_tim: {
    nama_lengkap: string;
    email: string;
  };
  uang_transport: number;
  my_task_stats: {
    pending: number;
    in_progress: number;
    completed: number;
    total: number;
  };
  my_progress: number;
  team_size: number;
  my_tasks: Array<{
    id: string;
    deskripsi_tugas: string;
    tanggal_tugas: string;
    status: "pending" | "in_progress" | "completed";
    response_pegawai?: string;
  }>;
  team_members: Array<{
    id: string;
    nama_lengkap: string;
    email: string;
    uang_transport: number;
  }>;
  mitra_partners: Array<{
    id: string;
    nama_mitra: string;
    jenis: string;
    honor: number;
    rating_average: number;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: projectId } = await params;

    // Authentication check
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

    // Get comprehensive project details (includes assignment check)
    const projectDetail = await getProjectDetail(projectId, user.id);

    return NextResponse.json({ data: projectDetail });
  } catch (error) {
    console.error("Pegawai Project Detail API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getProjectDetail(
  projectId: string,
  pegawaiId: string
): Promise<ProjectDetail> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if pegawai is assigned to this project first
  const { data: assignment, error: assignmentError } = await serviceClient
    .from("project_assignments")
    .select("uang_transport")
    .eq("project_id", projectId)
    .eq("assignee_type", "pegawai")
    .eq("assignee_id", pegawaiId)
    .single();

  if (assignmentError || !assignment) {
    throw new Error("Project not found or access denied");
  }

  // Get basic project info
  const { data: project, error: projectError } = await serviceClient
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error(`Project not found: ${projectError?.message}`);
  }

  // Get ketua tim info
  const { data: ketuaTim, error: ketuaTimError } = await serviceClient
    .from("users")
    .select("nama_lengkap, email")
    .eq("id", project.ketua_tim_id)
    .single();

  if (ketuaTimError) {
    throw new Error(`Failed to fetch ketua tim: ${ketuaTimError.message}`);
  }

  // Get pegawai's tasks for this project
  const { data: tasks, error: tasksError } = await serviceClient
    .from("tasks")
    .select("id, deskripsi_tugas, tanggal_tugas, status, response_pegawai")
    .eq("project_id", projectId)
    .eq("pegawai_id", pegawaiId)
    .order("tanggal_tugas", { ascending: true });

  if (tasksError) {
    throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
  }

  // Calculate task statistics
  const taskList = tasks || [];
  const taskStats = {
    pending: taskList.filter((t) => t.status === "pending").length,
    in_progress: taskList.filter((t) => t.status === "in_progress").length,
    completed: taskList.filter((t) => t.status === "completed").length,
    total: taskList.length,
  };

  // Calculate progress percentage
  const progress =
    taskStats.total > 0
      ? Math.round((taskStats.completed / taskStats.total) * 100)
      : 0;

  // Get all team members (pegawai)
  const { data: teamAssignments, error: teamError } = await serviceClient
    .from("project_assignments")
    .select("assignee_id, uang_transport")
    .eq("project_id", projectId)
    .eq("assignee_type", "pegawai");

  if (teamError) {
    console.warn("Failed to fetch team member assignments:", teamError.message);
  }

  const pegawaiIds = (teamAssignments || [])
    .map((a: { assignee_id: string }) => a.assignee_id)
    .filter((id: string | null | undefined) => Boolean(id));

  let teamMembers: ProjectDetail["team_members"] = [];
  if (pegawaiIds.length > 0) {
    const { data: usersRows, error: usersError } = await serviceClient
      .from("users")
      .select("id, nama_lengkap, email")
      .in("id", pegawaiIds);

    if (usersError) {
      console.warn(
        "Failed to fetch users for team members:",
        usersError.message
      );
    }

    const idToUser: Record<
      string,
      { id: string; nama_lengkap: string; email: string }
    > = {};
    (usersRows || []).forEach((u) => {
      idToUser[u.id] = u as { id: string; nama_lengkap: string; email: string };
    });

    teamMembers = (teamAssignments || []).map(
      (assignment: { assignee_id: string; uang_transport: number }) => {
        const userRow = idToUser[assignment.assignee_id];
        return {
          id: userRow?.id || assignment.assignee_id,
          nama_lengkap: userRow?.nama_lengkap || "",
          email: userRow?.email || "",
          uang_transport: assignment.uang_transport || 0,
        };
      }
    );
  }

  // Get mitra partners
  const { data: mitraAssignments, error: mitraError } = await serviceClient
    .from("project_assignments")
    .select("assignee_id, honor")
    .eq("project_id", projectId)
    .eq("assignee_type", "mitra");

  if (mitraError) {
    console.warn("Failed to fetch mitra assignments:", mitraError.message);
  }

  const mitraIds = (mitraAssignments || [])
    .map((a: { assignee_id: string }) => a.assignee_id)
    .filter((id: string | null | undefined) => Boolean(id));

  let mitraPartners: ProjectDetail["mitra_partners"] = [];
  if (mitraIds.length > 0) {
    const { data: mitraRows, error: mitraRowsError } = await serviceClient
      .from("mitra")
      .select("id, nama_mitra, jenis, rating_average")
      .in("id", mitraIds);

    if (mitraRowsError) {
      console.warn("Failed to fetch mitra rows:", mitraRowsError.message);
    }

    const idToMitra: Record<
      string,
      { id: string; nama_mitra: string; jenis: string; rating_average: number }
    > = {};
    (mitraRows || []).forEach((m) => {
      idToMitra[m.id] = m as {
        id: string;
        nama_mitra: string;
        jenis: string;
        rating_average: number;
      };
    });

    mitraPartners = (mitraAssignments || []).map(
      (assignment: { assignee_id: string; honor: number }) => {
        const mitraRow = idToMitra[assignment.assignee_id];
        return {
          id: mitraRow?.id || assignment.assignee_id,
          nama_mitra: mitraRow?.nama_mitra || "",
          jenis: mitraRow?.jenis || "",
          honor: assignment.honor || 0,
          rating_average: mitraRow?.rating_average || 0,
        };
      }
    );
  }

  // Get team size (total assignments)
  const { data: allAssignments, error: countError } = await serviceClient
    .from("project_assignments")
    .select("id")
    .eq("project_id", projectId);

  if (countError) {
    console.warn("Failed to fetch assignment count:", countError.message);
  }

  const teamSize = allAssignments?.length || 0;

  return {
    id: project.id,
    nama_project: project.nama_project,
    deskripsi: project.deskripsi,
    tanggal_mulai: project.tanggal_mulai,
    deadline: project.deadline,
    status: project.status,
    ketua_tim: {
      nama_lengkap: ketuaTim?.nama_lengkap || "Unknown",
      email: ketuaTim?.email || "unknown@example.com",
    },
    uang_transport: assignment?.uang_transport || 0,
    my_task_stats: taskStats,
    my_progress: progress,
    team_size: teamSize,
    my_tasks: taskList,
    team_members: teamMembers,
    mitra_partners: mitraPartners,
  };
}
