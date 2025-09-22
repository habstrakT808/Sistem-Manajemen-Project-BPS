import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function GET() {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (allocationsError) {
      console.error("Error fetching allocations:", allocationsError);
      return NextResponse.json(
        { error: "Failed to fetch transport allocations" },
        { status: 500 }
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
          { status: 500 }
        );
      }

      // Create lookup map
      tasks?.forEach((task: any) => {
        taskDetails[task.id] = {
          title: task.title || "Unknown Task",
          project_id: task.project_id,
          start_date: task.start_date,
          end_date: task.end_date,
        };
      });
    }

    // Get project details separately
    const projectIds = Object.values(taskDetails).map(
      (task) => task.project_id
    );
    let projectDetails: Record<string, { nama_project: string }> = {};

    if (projectIds.length > 0) {
      const { data: projects, error: projectsError } = await serviceClient
        .from("projects")
        .select("id, nama_project")
        .in("id", projectIds);

      if (projectsError) {
        console.error("Error fetching projects:", projectsError);
        return NextResponse.json(
          { error: "Failed to fetch project details" },
          { status: 500 }
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
      allocations?.map((allocation: any) => {
        const task = taskDetails[allocation.task_id];
        const project = task ? projectDetails[task.project_id] : null;

        return {
          id: allocation.id,
          task_id: allocation.task_id,
          amount: allocation.amount,
          allocation_date: allocation.allocation_date,
          allocated_at: allocation.allocated_at,
          canceled_at: allocation.canceled_at,
          task: {
            title: task?.title || "Unknown Task",
            project_name: project?.nama_project || "Unknown Project",
            start_date: task?.start_date || "",
            end_date: task?.end_date || "",
          },
        };
      }) || [];

    return NextResponse.json({
      allocations: transformedAllocations,
    });
  } catch (error) {
    console.error("Transport allocations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
