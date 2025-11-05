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

    // Ensure allocations are released if they collide with admin schedules
    // Only release if the schedule applies to this user (employee_ids is null/empty OR includes this user)
    try {
      const { data: settingsRow } = await serviceClient
        .from("system_settings")
        .select("id, config")
        .eq("id", 1)
        .single();
      const rawCfg = (settingsRow as any)?.config;
      const cfg =
        rawCfg && typeof rawCfg === "string"
          ? JSON.parse(rawCfg)
          : rawCfg || {};
      const schedules: any[] = cfg?.admin_schedules ?? [];
      if (schedules.length > 0) {
        for (const s of schedules) {
          if (s?.start_date && s?.end_date) {
            // Check if this schedule applies to current user
            const appliesToUser =
              // If employee_ids is null or empty, it applies to all employees
              !s.employee_ids ||
              s.employee_ids.length === 0 ||
              // Otherwise, only if current user is in the list
              (s.employee_ids &&
                Array.isArray(s.employee_ids) &&
                s.employee_ids.includes(user.id));

            if (appliesToUser) {
              await (serviceClient as any)
                .from("task_transport_allocations")
                .update({ allocation_date: null, allocated_at: null })
                .eq("user_id", user.id)
                .gte("allocation_date", s.start_date)
                .lte("allocation_date", s.end_date)
                .is("canceled_at", null);
            }
          }
        }
      }
    } catch (_) {}

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
        satuan_id: string | null;
        rate_per_satuan: number | null;
        volume: number | null;
        total_amount: number | null;
      }
    > = {};

    if (taskIds.length > 0) {
      const { data: tasks, error: tasksError } = await serviceClient
        .from("tasks")
        .select(
          "id, title, project_id, start_date, end_date, satuan_id, rate_per_satuan, volume, total_amount",
        )
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
          satuan_id: task.satuan_id,
          rate_per_satuan: task.rate_per_satuan,
          volume: task.volume,
          total_amount: task.total_amount,
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

          if (!task) {
            return false;
          }
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
          if (isDummyTitle || isDummyProject) {
            return false;
          }
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
              satuan_id: task.satuan_id,
              rate_per_satuan: task.rate_per_satuan,
              volume: task.volume,
              total_amount: task.total_amount,
            },
          };
        }) || [];

    // Build global locked dates across all projects for this user, excluding dummy/test data
    const allocationLocked = new Set(
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
    );

    // Include admin global schedules (system_settings.config.admin_schedules)
    const parseYmd = (ymd: string) => {
      const [yy, mm, dd] = ymd.split("-").map((x) => Number(x));
      return new Date(yy, (mm || 1) - 1, dd || 1);
    };
    const expandRangeToDates = (start: string, end: string): string[] => {
      const out: string[] = [];
      const s = parseYmd(start);
      const e = parseYmd(end);
      const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      while (cur.getTime() <= e.getTime()) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(cur.getDate()).padStart(2, "0");
        out.push(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
      }
      return out;
    };

    try {
      const { data: settingsRow } = await serviceClient
        .from("system_settings")
        .select("id, config")
        .eq("id", 1)
        .single();
      const schedules: any[] =
        (settingsRow as any)?.config?.admin_schedules ?? [];
      schedules.forEach((s: any) => {
        if (s?.start_date && s?.end_date) {
          // CRITICAL: Only add dates from schedules that apply to this user
          // If employee_ids is null or empty, it applies to all employees
          // Otherwise, only if current user is in the list
          const scheduleEmployeeIds = Array.isArray(s.employee_ids)
            ? s.employee_ids
            : [];
          const appliesToUser =
            scheduleEmployeeIds.length === 0 ||
            scheduleEmployeeIds.includes(user.id);

          if (appliesToUser) {
            expandRangeToDates(s.start_date, s.end_date).forEach((ds) =>
              allocationLocked.add(ds),
            );
          }
        }
      });
    } catch (_) {}

    const lockedDates = Array.from(allocationLocked);

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
