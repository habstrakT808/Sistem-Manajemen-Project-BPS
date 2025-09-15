import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Task, Project } from "@/types";

interface TaskWithProject {
  id: string;
  deskripsi_tugas: string;
  tanggal_tugas: string;
  status: string;
  response_pegawai: string | null;
  created_at: string;
  updated_at: string;
  projects: {
    id: string;
    nama_project: string;
    status: string;
    users: {
      nama_lengkap: string;
    };
  };
}

interface QueryParams {
  status?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const queryParams: QueryParams = {
      status: searchParams.get("status") || undefined,
      projectId: searchParams.get("project_id") || undefined,
      dateFrom: searchParams.get("date_from") || undefined,
      dateTo: searchParams.get("date_to") || undefined,
    };

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

    // Get tasks with filters
    const tasks = await getTasksWithFilters(
      await supabase,
      user.id,
      queryParams
    );

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get project and team lead data
    const enrichedTasks = await enrichTasksWithProjectData(tasks);

    return NextResponse.json({ data: enrichedTasks });
  } catch (error) {
    console.error("Pegawai Tasks API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getTasksWithFilters(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  params: QueryParams
): Promise<Task[]> {
  let query = supabase
    .from("tasks")
    .select(
      "id, project_id, pegawai_id, tanggal_tugas, deskripsi_tugas, status, response_pegawai, created_at, updated_at"
    )
    .eq("pegawai_id", userId);

  // Apply filters
  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  }
  if (params.dateFrom) {
    query = query.gte("tanggal_tugas", params.dateFrom);
  }
  if (params.dateTo) {
    query = query.lte("tanggal_tugas", params.dateTo);
  }

  const { data: tasks, error } = await query
    .order("tanggal_tugas", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  return tasks || [];
}

async function enrichTasksWithProjectData(
  tasks: Task[]
): Promise<TaskWithProject[]> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const projectIds = [...new Set(tasks.map((task) => task.project_id))];

  // Get projects data
  const { data: projects, error: projectsError } = await serviceClient
    .from("projects")
    .select("*")
    .in("id", projectIds);

  if (projectsError) {
    // Fallback: Get projects individually
    const projectsData = await getProjectsIndividually(
      serviceClient,
      projectIds
    );
    return createEnrichedTasks(tasks, projectsData, []);
  }

  // Get team leads data
  const ketuaTimIds = [
    ...new Set((projects || []).map((p: Project) => p.ketua_tim_id)),
  ];

  const { data: ketuaTims, error: ketuaTimsError } = await serviceClient
    .from("users")
    .select("id, nama_lengkap")
    .in("id", ketuaTimIds);

  const ketuaTimsData = ketuaTimsError ? [] : ketuaTims || [];

  return createEnrichedTasks(tasks, projects || [], ketuaTimsData);
}

async function getProjectsIndividually(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  projectIds: string[]
): Promise<Project[]> {
  const projectsData: Project[] = [];

  for (const projectId of projectIds) {
    try {
      const { data: project, error } = await serviceClient
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (!error && project) {
        projectsData.push(project);
      }
    } catch {
      // Continue with next project if one fails
      continue;
    }
  }

  return projectsData;
}

function createEnrichedTasks(
  tasks: Task[],
  projects: Project[],
  ketuaTims: { id: string; nama_lengkap: string }[]
): TaskWithProject[] {
  // Create lookup maps for better performance
  const projectMap = new Map<string, Project>();
  projects.forEach((project) => {
    projectMap.set(project.id, project);
  });

  const ketuaTimMap = new Map<string, { id: string; nama_lengkap: string }>();
  ketuaTims.forEach((ketuaTim) => {
    ketuaTimMap.set(ketuaTim.id, ketuaTim);
  });

  // Enrich tasks with project and team lead data
  return tasks.map((task) => {
    const project = projectMap.get(task.project_id);
    const ketuaTim = project ? ketuaTimMap.get(project.ketua_tim_id) : null;

    return {
      id: task.id,
      deskripsi_tugas: task.deskripsi_tugas,
      tanggal_tugas: task.tanggal_tugas,
      status: task.status,
      response_pegawai: task.response_pegawai || null,
      created_at: task.created_at,
      updated_at: task.updated_at,
      projects: {
        id: project?.id || task.project_id,
        nama_project: project?.nama_project || "Unknown Project",
        status: project?.status || "unknown",
        users: {
          nama_lengkap: ketuaTim?.nama_lengkap || "Unknown Team Lead",
        },
      },
    };
  });
}
