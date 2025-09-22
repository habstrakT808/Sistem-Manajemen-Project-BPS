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

  // Check if pegawai has access to this project via project_members or as leader
  const { data: projectAccess, error: accessError } = await serviceClient
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", pegawaiId)
    .single();

  // Also check if user is the project leader
  const { data: project, error: projectError } = await serviceClient
    .from("projects")
    .select("leader_user_id, ketua_tim_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error(`Project not found: ${projectError?.message}`);
  }

  const isLeader =
    project.leader_user_id === pegawaiId || project.ketua_tim_id === pegawaiId;
  const isMember = projectAccess && !accessError;

  if (!isLeader && !isMember) {
    throw new Error("Project not found or access denied");
  }

  // Get full project info
  const { data: fullProject, error: fullProjectError } = await serviceClient
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (fullProjectError || !fullProject) {
    throw new Error(`Project not found: ${fullProjectError?.message}`);
  }

  // Get ketua tim info
  const { data: ketuaTim, error: ketuaTimError } = await serviceClient
    .from("users")
    .select("nama_lengkap, email")
    .eq("id", fullProject.ketua_tim_id)
    .single();

  if (ketuaTimError) {
    throw new Error(`Failed to fetch ketua tim: ${ketuaTimError.message}`);
  }

  // Get pegawai's tasks for this project
  const { data: tasks, error: tasksError } = await serviceClient
    .from("tasks")
    .select("id, deskripsi_tugas, tanggal_tugas, status, response_pegawai")
    .eq("project_id", projectId)
    .or(`assignee_user_id.eq.${pegawaiId},pegawai_id.eq.${pegawaiId}`)
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

  // Get all team members (pegawai) from project_members
  const { data: teamMembersData, error: teamError } = await serviceClient
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId);

  if (teamError) {
    console.warn("Failed to fetch team members:", teamError.message);
  }

  const pegawaiIds = (teamMembersData || [])
    .map((m: { user_id: string }) => m.user_id)
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

    teamMembers = (usersRows || []).map((user: any) => ({
      id: user.id,
      nama_lengkap: user.nama_lengkap || "",
      email: user.email || "",
      uang_transport: 0, // Will be calculated from tasks
    }));
  }

  // Get mitra partners (simplified for now)
  let mitraPartners: ProjectDetail["mitra_partners"] = [];
  // TODO: Implement mitra partners if needed

  // Get team size (total members)
  const teamSize = teamMembers.length;

  return {
    id: fullProject.id,
    nama_project: fullProject.nama_project,
    deskripsi: fullProject.deskripsi,
    tanggal_mulai: fullProject.tanggal_mulai,
    deadline: fullProject.deadline,
    status: fullProject.status,
    ketua_tim: {
      nama_lengkap: ketuaTim?.nama_lengkap || "Unknown",
      email: ketuaTim?.email || "unknown@example.com",
    },
    uang_transport: 0, // Will be calculated from tasks or assignments
    my_task_stats: taskStats,
    my_progress: progress,
    team_size: teamSize,
    my_tasks: taskList,
    team_members: teamMembers,
    mitra_partners: mitraPartners,
  };
}
