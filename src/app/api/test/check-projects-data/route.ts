// File: src/app/api/test/check-projects-data/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function GET(_request: NextRequest) {
  try {
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // First, let's check all auth users
    const { data: authUsers, error: _authError } = await (
      svc as any
    ).auth.admin.listUsers();
    console.log(
      "Auth users:",
      authUsers?.users?.map((u: any) => ({ id: u.id, email: u.email })),
    );

    // Get all projects to see what's available
    const { data: allProjects, error: _allProjectsError } = await (svc as any)
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("All projects:", allProjects);

    // Get projects for ketua tim user - use the correct user ID from the projects
    const ketuaUserId = "f93cdf9c-a6a5-4cc7-8c27-002c7a2e3572"; // Correct user ID from projects

    const { data: projects, error: projectsError } = await (svc as any)
      .from("projects")
      .select("*")
      .or(`ketua_tim_id.eq.${ketuaUserId},leader_user_id.eq.${ketuaUserId}`)
      .order("created_at", { ascending: false });

    if (projectsError) {
      console.error("Projects fetch error:", projectsError);
      return NextResponse.json(
        { error: projectsError.message },
        { status: 500 },
      );
    }

    console.log("Projects found:", projects);

    // Get ALL project assignments to see what data exists
    const { data: allAssignments, error: _allAssignmentsError } = await (
      svc as any
    )
      .from("project_assignments")
      .select("*");

    console.log("All project assignments:", allAssignments);

    // Get project assignments for these projects
    const projectIds = (projects || []).map((p: { id: string }) => p.id);
    let assignmentsByProject = new Map<string, any[]>();

    if (projectIds.length > 0) {
      const { data: assignments, error: assignmentsError } = await (svc as any)
        .from("project_assignments")
        .select(
          "project_id, id, assignee_type, assignee_id, uang_transport, honor",
        )
        .in("project_id", projectIds);

      if (assignmentsError) {
        console.error("Assignments fetch error:", assignmentsError);
      } else {
        console.log("Assignments found:", assignments);

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
    }

    // Enrich projects with assignments
    const enrichedProjects = (projects || []).map((p: any) => {
      const assignments = assignmentsByProject.get(p.id) || [];
      console.log(`Project ${p.nama_project} assignments:`, assignments);

      // Calculate budget
      const budget = assignments.reduce((total: number, assignment: any) => {
        return (
          total + (assignment.uang_transport || 0) + (assignment.honor || 0)
        );
      }, 0);

      console.log(`Project ${p.nama_project} budget: ${budget}`);

      return {
        ...p,
        project_assignments: assignments,
        calculated_budget: budget,
      };
    });

    return NextResponse.json({
      message: "Projects data check",
      projects: enrichedProjects,
      assignmentsByProject: Object.fromEntries(assignmentsByProject),
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
