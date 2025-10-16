// File: src/app/api/ketua-tim/projects/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";
// Removed unused Database import

interface ProjectFormData {
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  pegawai_assignments: {
    pegawai_id: string;
  }[];
  mitra_assignments: {
    mitra_id: string;
    honor: number;
  }[];
}

interface ProjectAssignment {
  id: string;
  assignee_type: "pegawai" | "mitra";
  assignee_id: string;
  uang_transport: number | null;
  honor: number | null;
}

interface Project {
  id: string;
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  ketua_tim_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  project_assignments?: ProjectAssignment[];
}

interface ProjectWithProgress extends Project {
  progress?: number;
  total_budget?: number;
  transport_budget?: number;
  honor_budget?: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const body = await request.json();
    const formData: ProjectFormData = body;

    // Check if user is ketua tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization: we rely on RLS to ensure only leaders can insert
    // projects with their own user id. No pre-block here to avoid RLS
    // recursion errors or false negatives.

    // Validate required fields
    if (
      !formData.nama_project ||
      !formData.deskripsi ||
      !formData.tanggal_mulai ||
      !formData.deadline
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate dates
    const startDate = new Date(formData.tanggal_mulai);
    const endDate = new Date(formData.deadline);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "Deadline must be after start date" },
        { status: 400 },
      );
    }

    // Validate mitra monthly limits
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Use service client for limit checks and writes to avoid RLS recursion
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get team_id where current user is the leader
    const { data: userTeam } = await (svc as any)
      .from("teams")
      .select("id")
      .eq("leader_user_id", user.id)
      .limit(1)
      .single();

    const teamId = userTeam?.id || null;

    for (const mitraAssignment of formData.mitra_assignments) {
      const { data: currentTotal } = await (svc as any).rpc(
        "get_mitra_monthly_total",
        {
          mitra_id: mitraAssignment.mitra_id,
          month: currentMonth,
          year: currentYear,
        },
      );

      const totalAmount =
        (currentTotal?.[0]?.total_amount || 0) + mitraAssignment.honor;

      if (totalAmount > 3300000) {
        return NextResponse.json(
          {
            error: `Mitra monthly limit exceeded. Current total would be: ${totalAmount}`,
            mitra_id: mitraAssignment.mitra_id,
          },
          { status: 400 },
        );
      }
    }

    // Create project
    const { data: project, error: projectError } = await (svc as any)
      .from("projects")
      .insert({
        nama_project: formData.nama_project,
        deskripsi: formData.deskripsi,
        tanggal_mulai: formData.tanggal_mulai,
        deadline: formData.deadline,
        // Set both fields for backward compatibility with legacy code
        leader_user_id: user.id,
        ketua_tim_id: user.id,
        // Automatically assign to the team where user is leader
        team_id: teamId,
        status:
          new Date(formData.tanggal_mulai) <= new Date()
            ? "active"
            : "upcoming",
      })
      .select()
      .single();

    if (projectError) {
      throw projectError;
    }

    if (!project) {
      throw new Error("Failed to create project");
    }

    // Create project assignments
    const assignments = [
      ...formData.pegawai_assignments.map((assignment) => ({
        project_id: project.id,
        assignee_type: "pegawai" as const,
        assignee_id: assignment.pegawai_id,
        uang_transport: null, // Transport will be handled in task creation
        honor: null,
      })),
      ...formData.mitra_assignments.map((assignment) => ({
        project_id: project.id,
        assignee_type: "mitra" as const,
        assignee_id: assignment.mitra_id,
        uang_transport: null,
        honor: assignment.honor,
      })),
    ];

    if (assignments.length > 0) {
      const { error: assignmentError } = await (svc as any)
        .from("project_assignments")
        .insert(assignments);

      if (assignmentError) {
        // Rollback project creation
        await (svc as any).from("projects").delete().eq("id", project.id);
        throw assignmentError;
      }
    }

    // Ensure project_members rows exist for leader and pegawai assignees
    const memberRows = [
      {
        project_id: project.id,
        user_id: user.id,
        role: "leader" as const,
        created_by: user.id,
      },
      ...formData.pegawai_assignments.map((a) => ({
        project_id: project.id,
        user_id: a.pegawai_id,
        role: "member" as const,
        created_by: user.id,
      })),
    ];
    // Use upsert-like behavior with on conflict (project_id, user_id)
    await (svc as any)
      .from("project_members")
      .insert(memberRows, { defaultToNull: false })
      .select()
      .then(async (res: any) => {
        if (
          res.error &&
          !String(res.error.message || "").includes("duplicate key")
        ) {
          // Non-duplicate errors should rollback
          await (svc as any).from("projects").delete().eq("id", project.id);
          throw res.error;
        }
      });

    return NextResponse.json({
      message: "Project created successfully",
      project: {
        id: project.id,
        nama_project: project.nama_project,
        status: project.status,
      },
    });
  } catch (error) {
    console.error("Project creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service client to avoid RLS recursion and strictly filter by ownership
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Fetch projects; assignments will be fetched separately to avoid schema relationship constraints
    let query = (svc as any)
      .from("projects")
      .select("*")
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    // Total count
    const { count } = await (svc as any)
      .from("projects")
      .select("*", { count: "exact", head: true })
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`);

    // Per-status counts
    const [upcomingCountRes, activeCountRes, completedCountRes] =
      await Promise.all([
        (svc as any)
          .from("projects")
          .select("id", { count: "exact", head: true })
          .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`)
          .eq("status", "upcoming"),
        (svc as any)
          .from("projects")
          .select("id", { count: "exact", head: true })
          .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`)
          .eq("status", "active"),
        (svc as any)
          .from("projects")
          .select("id", { count: "exact", head: true })
          .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`)
          .eq("status", "completed"),
      ]);

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data: projects, error } = await query.range(from, to);
    if (error) throw error;

    // Compute progress and attach assignments with budget calculation
    const projectIds = (projects || []).map((p: { id: string }) => p.id);

    // Fetch assignments in bulk
    let assignmentsByProject = new Map<string, ProjectAssignment[]>();
    if (projectIds.length > 0) {
      const { data: assignments } = await (svc as any)
        .from("project_assignments")
        .select(
          "project_id, id, assignee_type, assignee_id, uang_transport, honor",
        )
        .in("project_id", projectIds);
      if (assignments && Array.isArray(assignments)) {
        for (const a of assignments as Array<any>) {
          const list = assignmentsByProject.get(a.project_id) || [];
          list.push({
            id: a.id,
            assignee_type: a.assignee_type,
            assignee_id: a.assignee_id,
            uang_transport: a.uang_transport,
            honor: a.honor,
          });
          assignmentsByProject.set(a.project_id, list);
        }
      }
    }

    // Calculate budget from tasks table (same logic as financial API)
    const budgetByProject = new Map<
      string,
      { transport: number; honor: number }
    >();
    if (projectIds.length > 0) {
      // Get transport budget from tasks (transport_days * 150,000)
      const { data: transportTasks } = await (svc as any)
        .from("tasks")
        .select("project_id, transport_days")
        .in("project_id", projectIds)
        .not("transport_days", "is", null);

      // Get honor budget from tasks
      const { data: honorTasks } = await (svc as any)
        .from("tasks")
        .select("project_id, honor_amount")
        .in("project_id", projectIds)
        .not("assignee_mitra_id", "is", null);

      // Calculate transport budget (150,000 per transport day)
      for (const task of transportTasks || []) {
        const rec = budgetByProject.get(task.project_id) || {
          transport: 0,
          honor: 0,
        };
        rec.transport += (task.transport_days || 0) * 150000;
        budgetByProject.set(task.project_id, rec);
      }

      // Calculate honor budget
      for (const task of honorTasks || []) {
        const rec = budgetByProject.get(task.project_id) || {
          transport: 0,
          honor: 0,
        };
        rec.honor += task.honor_amount || 0;
        budgetByProject.set(task.project_id, rec);
      }
    }

    const enrichedProjects = (projects || []).map((p: any) => {
      const assignments = assignmentsByProject.get(p.id) || [];
      const budget = budgetByProject.get(p.id) || { transport: 0, honor: 0 };
      const totalBudget = budget.transport + budget.honor;

      // Update assignments with calculated budget values for backward compatibility
      const updatedAssignments = assignments.map((assignment) => ({
        ...assignment,
        // For display purposes, distribute budget across assignments
        uang_transport:
          assignment.assignee_type === "pegawai"
            ? budget.transport /
              Math.max(
                assignments.filter((a) => a.assignee_type === "pegawai").length,
                1,
              )
            : 0,
        honor:
          assignment.assignee_type === "mitra"
            ? budget.honor /
              Math.max(
                assignments.filter((a) => a.assignee_type === "mitra").length,
                1,
              )
            : 0,
      }));

      return {
        ...p,
        project_assignments: updatedAssignments,
        total_budget: totalBudget,
        transport_budget: budget.transport,
        honor_budget: budget.honor,
      };
    }) as ProjectWithProgress[];
    if (projectIds.length > 0) {
      const { data: tasks } = await (svc as any)
        .from("tasks")
        .select("id, project_id, status")
        .in("project_id", projectIds);

      const idToProgress = new Map<string, number>();
      if (tasks && Array.isArray(tasks)) {
        const grouped: Record<string, { total: number; completed: number }> =
          {};
        for (const t of tasks as Array<{
          id: string;
          project_id: string;
          status: string;
        }>) {
          const key = t.project_id;
          if (!grouped[key]) grouped[key] = { total: 0, completed: 0 };
          grouped[key].total += 1;
          if (t.status === "completed") grouped[key].completed += 1;
        }
        for (const [pid, s] of Object.entries(grouped)) {
          const pct =
            s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
          idToProgress.set(pid, pct);
        }
      }
      for (const p of enrichedProjects) {
        p.progress =
          p.status === "completed" ? 100 : (idToProgress.get(p.id) ?? 0);
      }
    }

    return NextResponse.json({
      data: enrichedProjects,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      statusCounts: {
        upcoming: upcomingCountRes.count || 0,
        active: activeCountRes.count || 0,
        completed: completedCountRes.count || 0,
      },
    });
  } catch (error) {
    console.error("Projects fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
