import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const projectIdFilter = searchParams.get("project_id");
    const serviceClient = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get transport allocations for the user (without joins to avoid FK errors)
    const { data: allocations, error: allocationsError } = await serviceClient
      .from("task_transport_allocations")
      .select(
        `
        id,
        task_id,
        amount,
        allocation_date,
        allocated_at,
        canceled_at
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (allocationsError) {
      console.error("Error fetching allocations:", allocationsError);
      return NextResponse.json(
        { error: "Failed to fetch transport allocations" },
        { status: 500 },
      );
    }

    // Get task details separately
    const taskIds =
      allocations?.map((allocation: any) => allocation.task_id) || [];
    let taskDetails: Record<
      string,
      {
        title: string;
        project_id: string;
        start_date: string;
        end_date: string;
      }
    > = {};

    if (taskIds.length > 0) {
      const { data: tasks, error: tasksError } = await serviceClient
        .from("tasks")
        .select("id, title, project_id, start_date, end_date")
        .in("id", taskIds);

      if (tasksError) {
        console.error("Error fetching tasks:", tasksError);
        return NextResponse.json(
          { error: "Failed to fetch task details" },
          { status: 500 },
        );
      }

      // Create lookup map
      tasks?.forEach((task: any) => {
        // Apply project filter early if provided
        if (projectIdFilter && String(task.project_id) !== projectIdFilter) {
          return;
        }
        taskDetails[task.id] = {
          title: task.title || "Unknown Task",
          project_id: task.project_id,
          start_date: task.start_date,
          end_date: task.end_date,
        };
      });
    }

    // Get project details separately (filter to real teams only)
    const projectIds = Object.values(taskDetails)
      .map((task) => task.project_id)
      .filter(Boolean);
    let projectDetails: Record<string, { nama_project: string }> = {};

    if (projectIds.length > 0) {
      const { data: projects, error: projectsError } = await serviceClient
        .from("projects")
        .select("id, nama_project, team_id")
        .in("id", projectIds);

      if (projectsError) {
        console.error("Error fetching projects:", projectsError);
        return NextResponse.json(
          { error: "Failed to fetch project details" },
          { status: 500 },
        );
      }

      // Create lookup map
      projects?.forEach((project: any) => {
        projectDetails[project.id] = {
          nama_project: project.nama_project,
        };
      });
    }

    // Transform the data to match our interface
    const transformedAllocations =
      allocations
        ?.filter((allocation: any) => {
          const task = taskDetails[allocation.task_id];
          if (!task) return false;
          if (projectIdFilter && String(task.project_id) !== projectIdFilter) {
            return false;
          }
          const project = projectDetails[task.project_id];
          // remove known dummy/test titles or projects
          const isDummyTitle = String(task.title || "")
            .toLowerCase()
            .includes("task with ");
          const isDummyProject = String(project?.nama_project || "")
            .toLowerCase()
            .includes("test project for transport");
          if (isDummyTitle || isDummyProject) return false;
          return true;
        })
        .map((allocation: any) => {
          const task = taskDetails[allocation.task_id];
          const project = projectDetails[task.project_id];

          return {
            id: allocation.id,
            task_id: allocation.task_id,
            amount: allocation.amount,
            allocation_date: allocation.allocation_date,
            allocated_at: allocation.allocated_at,
            canceled_at: allocation.canceled_at,
            task: {
              title: task.title || "",
              project_name: project?.nama_project || "",
              start_date: task.start_date || "",
              end_date: task.end_date || "",
            },
          };
        }) || [];

    // Build global locked dates across all projects for this user, excluding dummy/test data
    const lockedDates = Array.from(
      new Set(
        (allocations || [])
          .filter((a: any) => a.allocation_date && !a.canceled_at)
          .filter((a: any) => {
            const task = taskDetails[a.task_id];
            if (!task) return false;
            const project = projectDetails[task.project_id];
            const isDummyTitle = String(task.title || "")
              .toLowerCase()
              .includes("task with ");
            const isDummyProject = String(project?.nama_project || "")
              .toLowerCase()
              .includes("test project for transport");
            return !(isDummyTitle || isDummyProject);
          })
          .map((a: any) => String(a.allocation_date).slice(0, 10)),
      ),
    );

    return NextResponse.json({
      allocations: transformedAllocations,
      locked_dates: lockedDates,
    });
  } catch (error) {
    console.error("Transport allocations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
