// File: src/app/api/ketua-tim/projects/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// Removed unused Database import

interface ProjectFormData {
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  pegawai_assignments: {
    pegawai_id: string;
    uang_transport: number;
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
}

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "ketua_tim"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate required fields
    if (
      !formData.nama_project ||
      !formData.deskripsi ||
      !formData.tanggal_mulai ||
      !formData.deadline
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(formData.tanggal_mulai);
    const endDate = new Date(formData.deadline);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "Deadline must be after start date" },
        { status: 400 }
      );
    }

    // Validate mitra monthly limits
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    for (const mitraAssignment of formData.mitra_assignments) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: currentTotal } = await (supabase as any).rpc(
        "get_mitra_monthly_total",
        {
          mitra_id: mitraAssignment.mitra_id,
          month: currentMonth,
          year: currentYear,
        }
      );

      const totalAmount =
        (currentTotal?.[0]?.total_amount || 0) + mitraAssignment.honor;

      if (totalAmount > 3300000) {
        return NextResponse.json(
          {
            error: `Mitra monthly limit exceeded. Current total would be: ${totalAmount}`,
            mitra_id: mitraAssignment.mitra_id,
          },
          { status: 400 }
        );
      }
    }

    // Create project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        nama_project: formData.nama_project,
        deskripsi: formData.deskripsi,
        tanggal_mulai: formData.tanggal_mulai,
        deadline: formData.deadline,
        ketua_tim_id: user.id,
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
        uang_transport: assignment.uang_transport,
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
      const { error: assignmentError } = await supabase
        .from("project_assignments")
        .insert(assignments);

      if (assignmentError) {
        // Rollback project creation
        await supabase.from("projects").delete().eq("id", project.id);
        throw assignmentError;
      }
    }

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
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");

    // Check if user is ketua tim
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "ketua_tim"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from("projects")
      .select(
        `
        *,
        project_assignments (
          id,
          assignee_type,
          assignee_id,
          uang_transport,
          honor
        )
      `
      )
      .eq("ketua_tim_id", user.id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    // Get total count (all projects for this ketua tim)
    const { count } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("ketua_tim_id", user.id);

    // Get per-status counts
    const [upcomingCountRes, activeCountRes, completedCountRes] =
      await Promise.all([
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("ketua_tim_id", user.id)
          .eq("status", "upcoming"),
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("ketua_tim_id", user.id)
          .eq("status", "active"),
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("ketua_tim_id", user.id)
          .eq("status", "completed"),
      ]);

    // Get paginated results
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: projects, error } = await query.range(from, to);

    if (error) {
      throw error;
    }

    // Enrich projects with assignee names
    const enrichedProjects = await Promise.all(
      (projects || []).map(async (project: Project) => {
        if (
          project.project_assignments &&
          project.project_assignments.length > 0
        ) {
          const enrichedAssignments = await Promise.all(
            project.project_assignments.map(
              async (assignment: ProjectAssignment) => {
                let assigneeName = null;

                if (assignment.assignee_type === "pegawai") {
                  const { data: user } = await supabase
                    .from("users")
                    .select("nama_lengkap")
                    .eq("id", assignment.assignee_id)
                    .single();
                  assigneeName = user?.nama_lengkap;
                } else if (assignment.assignee_type === "mitra") {
                  const { data: mitra } = await supabase
                    .from("mitra")
                    .select("nama_mitra")
                    .eq("id", assignment.assignee_id)
                    .single();
                  assigneeName = mitra?.nama_mitra;
                }

                return {
                  ...assignment,
                  assignee_name: assigneeName,
                };
              }
            )
          );

          return {
            ...project,
            project_assignments: enrichedAssignments,
          } as ProjectWithProgress;
        }

        return project as ProjectWithProgress;
      })
    );

    // Compute progress for each project based on tasks
    const projectIds = (enrichedProjects || []).map((p) => p.id);
    if (projectIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tasks } = await (supabase as any)
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
        for (const [pid, stats] of Object.entries(grouped)) {
          const pct =
            stats.total > 0
              ? Math.round((stats.completed / stats.total) * 100)
              : 0;
          idToProgress.set(pid, pct);
        }
      }

      for (const p of enrichedProjects as ProjectWithProgress[]) {
        // If project status is completed, force 100%
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
      { status: 500 }
    );
  }
}
