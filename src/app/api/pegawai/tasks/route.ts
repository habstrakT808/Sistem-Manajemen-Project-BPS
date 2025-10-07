// File: src/app/api/pegawai/tasks/route.ts
// UPDATED: Support new task structure and transport allocations

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface TaskData {
  id: string;
  project_id: string;
  assignee_user_id: string | null;
  pegawai_id: string | null;
  title: string;
  deskripsi_tugas: string;
  start_date: string;
  end_date: string;
  tanggal_tugas: string;
  has_transport: boolean;
  transport_days: number;
  status: string;
  response_pegawai: string;
  created_at: string;
  updated_at: string;
  task_transport_allocations?: Array<{
    id: string;
    amount: number;
    allocation_date: string;
    allocated_at: string;
    canceled_at: string;
    task_id?: string;
    user_id?: string;
  }>;
}

interface ProjectData {
  id: string;
  nama_project: string;
  status: string;
  leader_user_id: string;
}

interface UserData {
  id: string;
  nama_lengkap: string;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Service client to avoid RLS issues
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Build query for tasks assigned to this user
    // Check both assignee_user_id (new) and pegawai_id (legacy) fields
    let query = svc
      .from("tasks")
      .select(
        `
        id,
        project_id,
        assignee_user_id,
        pegawai_id,
        title,
        deskripsi_tugas,
        start_date,
        end_date,
        tanggal_tugas,
        has_transport,
        transport_days,
        status,
        response_pegawai,
        created_at,
        updated_at,
        task_transport_allocations (
          id,
          amount,
          allocation_date,
          allocated_at,
          canceled_at
        )
      `,
      )
      .or(`assignee_user_id.eq.${user.id},pegawai_id.eq.${user.id}`);

    // Add project filter if project_id is provided
    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data: tasks, error: tasksError } = await query
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (tasksError) {
      throw tasksError;
    }

    // Enforce project scoping defensively even after DB filter
    const scopedTasks = projectId
      ? ((tasks as TaskData[]) || []).filter(
          (t) => String(t.project_id) === String(projectId),
        )
      : (tasks as TaskData[]) || [];

    // Get project details separately to avoid FK relationship issues
    const projectIds = Array.from(
      new Set(scopedTasks.map((t) => t.project_id).filter(Boolean)),
    );

    const projectDetails: Record<
      string,
      {
        id: string;
        nama_project: string;
        status: string;
        users: { nama_lengkap: string };
      }
    > = {};

    if (projectIds.length > 0) {
      const { data: projects } = await svc
        .from("projects")
        .select("id, nama_project, status, leader_user_id")
        .in("id", projectIds);

      // Get leader names
      const leaderIds = Array.from(
        new Set(
          ((projects as ProjectData[]) || [])
            .map((p) => p.leader_user_id)
            .filter(Boolean),
        ),
      );

      const leaderNames: Record<string, string> = {};
      if (leaderIds.length > 0) {
        const { data: leaders } = await svc
          .from("users")
          .select("id, nama_lengkap")
          .in("id", leaderIds);

        ((leaders as UserData[]) || []).forEach((l) => {
          leaderNames[l.id] = l.nama_lengkap;
        });
      }

      // Build project details map
      ((projects as ProjectData[]) || []).forEach((p) => {
        projectDetails[p.id] = {
          id: p.id,
          nama_project: p.nama_project,
          status: p.status,
          users: {
            nama_lengkap: leaderNames[p.leader_user_id] || "Unknown Leader",
          },
        };
      });
    }

    // Fetch transport allocations for these tasks for the current user only
    const taskIds = Array.from(new Set(scopedTasks.map((t) => t.id)));

    const allocationsByTaskId: Record<
      string,
      Array<{
        id: string;
        amount: number;
        allocation_date: string | null;
        allocated_at: string | null;
        canceled_at: string | null;
      }>
    > = {};

    if (taskIds.length > 0) {
      type Alloc = {
        id: string;
        task_id: string;
        user_id: string;
        amount: number;
        allocation_date: string | null;
        allocated_at: string | null;
        canceled_at: string | null;
      };

      const { data: allocations, error: allocError } = await svc
        .from("task_transport_allocations")
        .select(
          "id, task_id, user_id, amount, allocation_date, allocated_at, canceled_at",
        )
        .in("task_id", taskIds)
        .eq("user_id", user.id)
        .is("canceled_at", null);

      if (allocError) {
        throw allocError;
      }

      (allocations as Alloc[] | null)?.forEach((a) => {
        if (!allocationsByTaskId[a.task_id]) {
          allocationsByTaskId[a.task_id] = [];
        }
        allocationsByTaskId[a.task_id].push({
          id: a.id,
          amount: a.amount,
          allocation_date: a.allocation_date,
          allocated_at: a.allocated_at,
          canceled_at: a.canceled_at,
        });
      });
    }

    // Remove known testing/dummy tasks & projects from results
    const cleanedTasks = scopedTasks.filter((t) => {
      const title = (t.title || "").toLowerCase();
      const desc = (t.deskripsi_tugas || "").toLowerCase();
      const projectName = (
        projectDetails[t.project_id]?.nama_project || ""
      ).toLowerCase();
      const isDummyTitle =
        title.includes("task with allocated transport") ||
        title.includes("task with pending transport");
      const isDummyProject = projectName.includes("test project for transport");
      const isDummyDesc = desc.includes("dummy") || desc.includes("testing");
      return !(isDummyTitle || isDummyProject || isDummyDesc);
    });

    // Format response
    const formattedTasks = cleanedTasks.map((task) => ({
      id: task.id,
      project_id: task.project_id,
      title: task.title,
      deskripsi_tugas: task.deskripsi_tugas,
      start_date: task.start_date,
      end_date: task.end_date,
      tanggal_tugas: task.tanggal_tugas, // Keep for backward compatibility
      has_transport: task.has_transport,
      transport_days: task.transport_days || 0, // Add missing transport_days
      status: task.status,
      response_pegawai: task.response_pegawai,
      created_at: task.created_at,
      updated_at: task.updated_at,
      projects: projectDetails[task.project_id] || {
        id: task.project_id,
        nama_project: "Unknown Project",
        status: "unknown",
        users: { nama_lengkap: "Unknown Leader" },
      },
      transport_allocations: allocationsByTaskId[task.id] || [],
    }));

    return NextResponse.json({
      data: formattedTasks,
      meta: {
        timestamp: new Date().toISOString(),
        total: formattedTasks.length,
      },
    });
  } catch (error) {
    console.error("Pegawai Tasks API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
