import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Project } from "@/types";

interface ProjectAssignment {
  id: string;
  project_id: string;
  assignee_type: string;
  assignee_id: string;
  uang_transport: number | null;
  honor: number | null;
  created_at: string;
}

interface TaskStats {
  pending: number;
  in_progress: number;
  completed: number;
  total: number;
}

interface EnrichedProject {
  id: string;
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  status: string;
  created_at: string;
  ketua_tim: {
    nama_lengkap: string;
    email: string;
  };
  uang_transport: number | null;
  my_task_stats: TaskStats;
  my_progress: number;
  team_size: number;
}

export async function GET() {
  try {
    const supabase = await createClient();

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

    // Get assigned projects
    const projectAssignments = await getProjectAssignments(user.id);

    if (!projectAssignments || projectAssignments.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Enrich projects with additional data
    const enrichedProjects = await enrichProjectsWithData(
      projectAssignments,
      user.id
    );

    return NextResponse.json({ data: enrichedProjects });
  } catch (error) {
    console.error("Pegawai Projects API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getProjectAssignments(
  userId: string
): Promise<ProjectAssignment[]> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: assignments, error } = await serviceClient
    .from("project_assignments")
    .select(
      "id, project_id, assignee_type, assignee_id, uang_transport, honor, created_at"
    )
    .eq("assignee_type", "pegawai")
    .eq("assignee_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch project assignments: ${error.message}`);
  }

  return assignments || [];
}

async function enrichProjectsWithData(
  assignments: ProjectAssignment[],
  userId: string
): Promise<EnrichedProject[]> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const projectIds = assignments.map((assignment) => assignment.project_id);

  // Get projects data
  const { data: projects, error: projectsError } = await serviceClient
    .from("projects")
    .select("*")
    .in("id", projectIds);

  if (projectsError) {
    throw new Error(`Failed to fetch projects: ${projectsError.message}`);
  }

  // Get ketua tim data
  const ketuaTimIds = [
    ...new Set((projects || []).map((p: Project) => p.ketua_tim_id)),
  ];

  const { data: ketuaTims, error: ketuaTimsError } = await serviceClient
    .from("users")
    .select("id, nama_lengkap, email")
    .in("id", ketuaTimIds);

  if (ketuaTimsError) {
    throw new Error(`Failed to fetch ketua tims: ${ketuaTimsError.message}`);
  }

  // Create lookup maps
  const projectMap = new Map<string, Project>();
  (projects || []).forEach((project) => {
    projectMap.set(project.id, project);
  });

  const ketuaTimMap = new Map<
    string,
    { id: string; nama_lengkap: string; email: string }
  >();
  (ketuaTims || []).forEach((ketuaTim) => {
    ketuaTimMap.set(ketuaTim.id, ketuaTim);
  });

  // Enrich each assignment with project data
  const enrichedProjects = await Promise.all(
    assignments.map(async (assignment) => {
      const project = projectMap.get(assignment.project_id);

      if (!project) {
        throw new Error(`Project not found for assignment ${assignment.id}`);
      }

      const ketuaTim = ketuaTimMap.get(project.ketua_tim_id);

      // Get task statistics for this project
      const taskStats = await getTaskStatistics(
        serviceClient,
        project.id,
        userId
      );

      // Get team size
      const teamSize = await getTeamSize(serviceClient, project.id);

      // Calculate progress
      const progress =
        taskStats.total > 0
          ? Math.round((taskStats.completed / taskStats.total) * 100)
          : 0;

      return {
        id: project.id,
        nama_project: project.nama_project,
        deskripsi: project.deskripsi,
        tanggal_mulai: project.tanggal_mulai,
        deadline: project.deadline,
        status: project.status,
        created_at: project.created_at,
        ketua_tim: {
          nama_lengkap: ketuaTim?.nama_lengkap || "Unknown Team Lead",
          email: ketuaTim?.email || "unknown@example.com",
        },
        uang_transport: assignment.uang_transport,
        my_task_stats: taskStats,
        my_progress: progress,
        team_size: teamSize,
      };
    })
  );

  return enrichedProjects;
}

async function getTaskStatistics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  projectId: string,
  userId: string
): Promise<TaskStats> {
  const { data: tasks, error } = await serviceClient
    .from("tasks")
    .select("status")
    .eq("project_id", projectId)
    .eq("pegawai_id", userId);

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  const taskList = tasks || [];

  return {
    pending: taskList.filter((t: { status: string }) => t.status === "pending")
      .length,
    in_progress: taskList.filter(
      (t: { status: string }) => t.status === "in_progress"
    ).length,
    completed: taskList.filter(
      (t: { status: string }) => t.status === "completed"
    ).length,
    total: taskList.length,
  };
}

async function getTeamSize(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  projectId: string
): Promise<number> {
  const { data: assignments, error } = await serviceClient
    .from("project_assignments")
    .select("id")
    .eq("project_id", projectId);

  if (error) {
    throw new Error(`Failed to fetch team assignments: ${error.message}`);
  }

  return (assignments || []).length;
}
