// File: src/app/api/pegawai/schedule/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Simple in-memory storage for events when personal_events table doesn't exist
const mockEventsStorage = new Map<string, any[]>();

interface PersonalEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  event_type: string;
  related_id?: string;
  color: string;
  is_all_day: boolean;
}

// Database row typing helpers
interface DbProject {
  id: string;
  nama_project: string;
  status: string;
}

interface DbTaskRow {
  id: string;
  deskripsi_tugas: string;
  tanggal_tugas: string;
  status: "pending" | "in_progress" | "completed";
  project_id: string;
  projects: DbProject;
}

interface DbPersonalEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  event_type: string;
  related_id: string | null;
  color: string;
  is_all_day: boolean;
  reminder_minutes: number | null;
  created_at?: string;
  updated_at?: string;
}

interface ScheduleTask {
  id: string;
  deskripsi_tugas: string;
  tanggal_tugas: string;
  status: "pending" | "in_progress" | "completed";
  project_name: string;
  project_status: string;
  project_id: string;
}

interface WorkloadIndicator {
  date: string;
  workload_level: "low" | "medium" | "high";
  event_count: number;
  task_count: number;
}

interface ProjectSpanDay {
  date: string;
  project_count: number;
}

//

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const month =
      searchParams.get("month") || (new Date().getMonth() + 1).toString();
    const year =
      searchParams.get("year") || new Date().getFullYear().toString();

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

    // Get comprehensive schedule data
    const scheduleData = await getComprehensiveScheduleData(
      user.id,
      parseInt(month),
      parseInt(year),
    );

    return NextResponse.json(scheduleData);
  } catch (error) {
    console.error("Schedule API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate input
    if (!body.title || !body.start_date || !body.end_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check if personal_events table exists
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    try {
      // Try to create personal event
      const insertPayload = {
        user_id: user.id,
        title: body.title as string,
        description: (body.description ?? null) as string | null,
        start_date: body.start_date as string,
        end_date: body.end_date as string,
        event_type: (body.event_type ?? "personal") as string,
        related_id: (body.related_id ?? null) as string | null,
        color: (body.color ?? "#22c55e") as string,
        is_all_day: Boolean(body.is_all_day),
        reminder_minutes: (body.reminder_minutes ?? 15) as number,
      };

      const { data: newEvent, error: createError } = await serviceClient
        .from("personal_events")
        .insert(insertPayload)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return NextResponse.json({
        data: newEvent,
        message: "Event created successfully",
      });
    } catch (tableError) {
      // If personal_events table doesn't exist, store in memory and return mock response
      console.warn("Personal events table not available:", tableError);

      const mockEvent = {
        id: `mock-${Date.now()}`,
        user_id: user.id,
        title: body.title,
        description: body.description,
        start_date: body.start_date,
        end_date: body.end_date,
        event_type: body.event_type || "personal",
        color: body.color || "#22c55e",
        is_all_day: Boolean(body.is_all_day),
        reminder_minutes: body.reminder_minutes || 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store in memory
      if (!mockEventsStorage.has(user.id)) {
        mockEventsStorage.set(user.id, []);
      }
      mockEventsStorage.get(user.id)!.push(mockEvent);
      console.log(
        `Stored event in memory for user ${user.id}, total events: ${mockEventsStorage.get(user.id)!.length}`,
      );

      return NextResponse.json({
        data: mockEvent,
        message:
          "Event created successfully (local storage only - personal events table not available)",
      });
    }
  } catch (error) {
    console.error("Create Event Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body.id) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    // Update personal event via service client
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    try {
      const updatePayload = {
        title: body.title as string | undefined,
        description: (body.description ?? undefined) as
          | string
          | null
          | undefined,
        start_date: body.start_date as string | undefined,
        end_date: body.end_date as string | undefined,
        event_type: body.event_type as string | undefined,
        color: body.color as string | undefined,
        is_all_day: body.is_all_day as boolean | undefined,
        reminder_minutes: body.reminder_minutes as number | undefined,
      };

      const { data: updatedEvent, error: updateError } = await serviceClient
        .from("personal_events")
        .update(updatePayload)
        .eq("id", body.id as string)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        data: updatedEvent,
        message: "Event updated successfully",
      });
    } catch (tableError) {
      console.warn(
        "Personal events table not available for update:",
        tableError,
      );

      // Update in memory storage
      const userEvents = mockEventsStorage.get(user.id) || [];
      const eventIndex = userEvents.findIndex((e) => e.id === body.id);
      if (eventIndex !== -1) {
        userEvents[eventIndex] = {
          ...userEvents[eventIndex],
          ...body,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        };
        mockEventsStorage.set(user.id, userEvents);
      }

      return NextResponse.json({
        data: { ...body, user_id: user.id },
        message:
          "Event updated successfully (local storage only - personal events table not available)",
      });
    }
  } catch (error) {
    console.error("Update Event Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("id");

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    try {
      // Delete personal event
      const { error: deleteError } = await supabase
        .from("personal_events")
        .delete()
        .eq("id", eventId)
        .eq("user_id", user.id);

      if (deleteError) {
        throw deleteError;
      }

      return NextResponse.json({ message: "Event deleted successfully" });
    } catch (tableError) {
      console.warn(
        "Personal events table not available for delete:",
        tableError,
      );

      // Delete from memory storage
      const userEvents = mockEventsStorage.get(user.id) || [];
      const filteredEvents = userEvents.filter((e) => e.id !== eventId);
      mockEventsStorage.set(user.id, filteredEvents);

      return NextResponse.json({
        message:
          "Event deleted successfully (local storage only - personal events table not available)",
      });
    }
  } catch (error) {
    console.error("Delete Event Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function getComprehensiveScheduleData(
  userId: string,
  month: number,
  year: number,
) {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
  // Build month end date string in local time without timezone conversion
  const monthEndLocal = new Date(year, month, 0); // last day of month (local)
  const endDate = formatYMDLocal(monthEndLocal);

  // Get tasks for the month (avoid joins to prevent FK relationship errors)
  const { data: tasks, error: tasksError } = await serviceClient
    .from("tasks")
    .select(
      `
      id,
      deskripsi_tugas,
      tanggal_tugas,
      status,
      project_id,
      assignee_user_id,
      pegawai_id
    `,
    )
    .or(`assignee_user_id.eq.${userId},pegawai_id.eq.${userId}`)
    .gte("tanggal_tugas", startDate)
    .lte("tanggal_tugas", endDate)
    .order("tanggal_tugas", { ascending: true });

  if (tasksError) {
    console.warn("Schedule tasks query error:", tasksError.message);
  }

  // Get project details separately
  const projectIds = Array.from(
    new Set((tasks || []).map((t: any) => t.project_id).filter(Boolean)),
  );

  let projectDetails: Record<string, { nama_project: string; status: string }> =
    {};
  if (projectIds.length > 0) {
    const { data: projects } = await serviceClient
      .from("projects")
      .select("id, nama_project, status")
      .in("id", projectIds);

    (projects || []).forEach((p: any) => {
      projectDetails[p.id] = {
        nama_project: p.nama_project,
        status: p.status,
      };
    });
  }

  // Get personal events for the month (skip if table doesn't exist)
  let events: any[] = [];
  try {
    const { data: eventsData, error: eventsError } = await serviceClient
      .from("personal_events")
      .select("*")
      .eq("user_id", userId)
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
      .order("start_date", { ascending: true });

    if (eventsError) {
      console.warn("Personal events query error:", eventsError.message);
      // If there's an error (like table not found), use in-memory storage
      const userEvents = mockEventsStorage.get(userId) || [];
      console.log(
        `Using in-memory storage for user ${userId}, found ${userEvents.length} events`,
      );
      events = userEvents.filter((event) => {
        const eventStart = new Date(event.start_date);
        const eventEnd = new Date(event.end_date);
        const monthStart = new Date(startDate);
        const monthEnd = new Date(endDate);
        return eventStart <= monthEnd && eventEnd >= monthStart;
      });
      console.log(
        `Filtered to ${events.length} events for month ${month}/${year}`,
      );
    } else {
      events = eventsData || [];
      console.log(`Using database storage, found ${events.length} events`);
    }
  } catch (error) {
    console.warn("Personal events table not found, using in-memory storage");
    // Use in-memory storage as fallback
    const userEvents = mockEventsStorage.get(userId) || [];
    events = userEvents.filter((event) => {
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
      const monthStart = new Date(startDate);
      const monthEnd = new Date(endDate);
      return eventStart <= monthEnd && eventEnd >= monthStart;
    });
  }

  // Skip workload indicators RPC if function doesn't exist
  let workloadData: any[] = [];
  try {
    const { data: workloadDataResult, error: workloadError } =
      await serviceClient.rpc("get_workload_indicator", {
        user_id_param: userId,
        start_date_param: startDate,
        end_date_param: endDate,
      });

    if (workloadError) {
      console.warn("Workload indicator RPC error:", workloadError.message);
    } else {
      workloadData = workloadDataResult || [];
    }
  } catch (error) {
    console.warn(
      "Workload indicator function not found, skipping workload data",
    );
  }

  // Format tasks
  const formattedTasks: ScheduleTask[] =
    (tasks as any[] | null)?.map((task) => ({
      id: task.id,
      deskripsi_tugas: task.deskripsi_tugas,
      tanggal_tugas: task.tanggal_tugas,
      status: task.status,
      project_name:
        projectDetails[task.project_id]?.nama_project || "Unknown Project",
      project_status: projectDetails[task.project_id]?.status || "unknown",
      project_id: task.project_id,
    })) || [];

  // Format events
  const formattedEvents: PersonalEvent[] =
    (events as any[] | null)?.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description ?? undefined,
      start_date: event.start_date,
      end_date: event.end_date,
      event_type: event.event_type,
      related_id: event.related_id ?? undefined,
      color: event.color,
      is_all_day: event.is_all_day,
    })) || [];

  // Calculate monthly summary
  const monthlySummary = {
    total_tasks: formattedTasks.length,
    pending_tasks: formattedTasks.filter((t) => t.status === "pending").length,
    in_progress_tasks: formattedTasks.filter((t) => t.status === "in_progress")
      .length,
    completed_tasks: formattedTasks.filter((t) => t.status === "completed")
      .length,
    total_events: formattedEvents.length,
    personal_events: formattedEvents.filter((e) => e.event_type === "personal")
      .length,
  };

  // Compute project spans per day within the month for assigned projects
  let projectSpans: ProjectSpanDay[] = [];
  try {
    projectSpans = await getProjectSpansForUser(
      serviceClient,
      userId,
      startDate,
      endDate,
    );
  } catch (error) {
    console.warn("Project spans calculation error:", error);
  }

  return {
    tasks: formattedTasks,
    events: formattedEvents,
    workload_indicators: workloadData || [],
    project_spans: projectSpans,
    monthly_summary: monthlySummary,
    month,
    year,
  };
}

// Helpers
async function getProjectSpansForUser(
  serviceClient: any,
  userId: string,
  monthStart: string,
  monthEnd: string,
): Promise<ProjectSpanDay[]> {
  // Fetch assigned projects for the user (using project_members table)
  const { data: assignments, error: assignError } = await serviceClient
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId);

  if (assignError) {
    console.warn("Assignments fetch error:", assignError.message);
    return [];
  }

  const projectIds = (assignments || []).map(
    (a: { project_id: string }) => a.project_id,
  );
  if (projectIds.length === 0) return [];

  // Fetch projects date ranges
  const { data: projects, error: projectsError } = await serviceClient
    .from("projects")
    .select("id, tanggal_mulai, deadline")
    .in("id", projectIds);

  if (projectsError) {
    console.warn("Projects fetch error:", projectsError.message);
    return [];
  }

  // Build a map of date -> count within the given month window (local date-only)
  const counts = new Map<string, number>();
  const start = parseYMDToLocalDate(monthStart);
  const end = parseYMDToLocalDate(monthEnd);

  type ProjectDateRow = { id: string; tanggal_mulai: string; deadline: string };
  for (const p of (projects || []) as ProjectDateRow[]) {
    const pStart = parseYMDToLocalDate(p.tanggal_mulai.slice(0, 10));
    const pEnd = parseYMDToLocalDate(p.deadline.slice(0, 10));

    // Determine overlap with month window
    const spanStart = pStart > start ? pStart : start;
    const spanEnd = pEnd < end ? pEnd : end;

    if (
      isNaN(spanStart.getTime()) ||
      isNaN(spanEnd.getTime()) ||
      spanStart > spanEnd
    ) {
      continue;
    }

    // Iterate days inclusive in local time
    const cursor = new Date(
      spanStart.getFullYear(),
      spanStart.getMonth(),
      spanStart.getDate(),
    );
    const endInclusive = new Date(
      spanEnd.getFullYear(),
      spanEnd.getMonth(),
      spanEnd.getDate(),
    );

    while (cursor <= endInclusive) {
      const key = formatYMDLocal(cursor);
      counts.set(key, (counts.get(key) || 0) + 1);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const results: ProjectSpanDay[] = Array.from(counts.entries()).map(
    ([date, project_count]) => ({ date, project_count }),
  );
  // Sort ascending by date for consistency
  results.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return results;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatYMDLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYMDToLocalDate(ymd: string): Date {
  // ymd expected as YYYY-MM-DD
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}
