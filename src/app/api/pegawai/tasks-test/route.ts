import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  console.log("🔍 [DEBUG] Starting pegawai tasks TEST API (no auth)");
  try {
    const supabase = (await createClient()) as any;
    console.log("🔍 [DEBUG] Supabase client created");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("project_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    console.log("🔍 [DEBUG] Search params:", {
      status,
      projectId,
      dateFrom,
      dateTo,
    });

    // Skip auth for testing - use a hardcoded user ID
    const testUserId = "00000000-0000-0000-0000-000000000000"; // Dummy UUID
    console.log("🔍 [DEBUG] Using test user ID:", testUserId);

    // Build base query - get tasks first
    console.log("🔍 [DEBUG] Building tasks query");
    let query = supabase
      .from("tasks")
      .select(
        `
        id,
        project_id,
        deskripsi_tugas,
        tanggal_tugas,
        status,
        response_pegawai,
        created_at,
        updated_at
      `,
      )
      .eq("pegawai_id", testUserId);

    console.log("🔍 [DEBUG] Base query created");

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }
    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    if (dateFrom) {
      query = query.gte("tanggal_tugas", dateFrom);
    }
    if (dateTo) {
      query = query.lte("tanggal_tugas", dateTo);
    }

    console.log("🔍 [DEBUG] Executing tasks query");
    const { data: tasks, error: tasksError } = await query
      .order("tanggal_tugas", { ascending: false })
      .limit(50);

    console.log("🔍 [DEBUG] Tasks query result:", {
      tasksCount: tasks?.length || 0,
      tasksError: tasksError?.message || null,
    });

    if (tasksError) {
      console.log("🔍 [DEBUG] Tasks query failed:", tasksError);
      throw tasksError;
    }

    // If no tasks, return empty array with success
    if (!tasks || tasks.length === 0) {
      console.log("🔍 [DEBUG] No tasks found, returning empty array");
      return NextResponse.json({
        data: [],
        message:
          "No tasks found. This is expected if no data exists in the database.",
        debug: {
          testUserId,
          tasksQuery: "SELECT * FROM tasks WHERE pegawai_id = ?",
          suggestion:
            "Add some test data to the tasks table or create a user account",
        },
      });
    }

    // Get project data for all tasks
    console.log("🔍 [DEBUG] Getting project data");
    const projectIds = [
      ...new Set(
        (tasks || []).map((task: { project_id: string }) => task.project_id),
      ),
    ];
    console.log("🔍 [DEBUG] Project IDs:", projectIds);

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, nama_project, status, ketua_tim_id")
      .in("id", projectIds);

    console.log("🔍 [DEBUG] Projects query result:", {
      projectsCount: projects?.length || 0,
      projectsError: projectsError?.message || null,
    });

    if (projectsError) {
      console.log("🔍 [DEBUG] Projects query failed:", projectsError);
      throw projectsError;
    }

    // Create a map for quick project lookup
    const projectMap = new Map(
      (projects || []).map(
        (p: {
          id: string;
          nama_project: string;
          status: string;
          ketua_tim_id: string;
        }) => [p.id, p],
      ),
    );

    // Get user data for all project ketua tims
    console.log("🔍 [DEBUG] Getting user data");
    const ketuaTimIds = [
      ...new Set(
        (projects || []).map((p: { ketua_tim_id: string }) => p.ketua_tim_id),
      ),
    ];
    console.log("🔍 [DEBUG] Ketua tim IDs:", ketuaTimIds);

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, nama_lengkap")
      .in("id", ketuaTimIds);

    console.log("🔍 [DEBUG] Users query result:", {
      usersCount: users?.length || 0,
      usersError: usersError?.message || null,
    });

    if (usersError) {
      console.log("🔍 [DEBUG] Users query failed:", usersError);
      throw usersError;
    }

    // Create a map for quick user lookup
    const userMap = new Map(
      (users || []).map((u: { id: string; nama_lengkap: string }) => [u.id, u]),
    );

    // Enrich tasks with project and user data
    console.log("🔍 [DEBUG] Enriching tasks with project and user data");
    const enrichedTasks = (tasks || []).map(
      (task: {
        project_id: string;
        id: string;
        deskripsi_tugas: string;
        tanggal_tugas: string;
        status: string;
        response_pegawai: string | null;
        created_at: string;
        updated_at: string;
      }) => {
        const project = projectMap.get(task.project_id) as
          | {
              id: string;
              nama_project: string;
              status: string;
              ketua_tim_id: string;
            }
          | undefined;
        const user = project ? userMap.get(project.ketua_tim_id) : null;

        return {
          ...task,
          projects: {
            ...(project || {}),
            users: user || { id: "", nama_lengkap: "Unknown" },
          },
        };
      },
    );

    console.log("🔍 [DEBUG] Enrichment complete, returning data");
    return NextResponse.json({ data: enrichedTasks || [] });
  } catch (error) {
    console.error("🔍 [DEBUG] Pegawai Tasks TEST API Error:", error);
    console.error("🔍 [DEBUG] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
