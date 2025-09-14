// File: src/app/api/ketua-tim/projects/[id]/members/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface ProjectAssignment {
  assignee_id: string;
}

interface User {
  id: string;
  nama_lengkap: string;
  email: string;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = (await createClient()) as SupabaseClient;
    const { id: projectId } = await params; // Fix untuk Next.js 15

    // Auth check - ketua tim only
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          code: "AUTH_REQUIRED",
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Verify user role
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
      return NextResponse.json(
        {
          error: "Forbidden",
          code: "INSUFFICIENT_PERMISSIONS",
          required_role: "ketua_tim",
        },
        { status: 403 }
      );
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, ketua_tim_id")
      .eq("id", projectId)
      .eq("ketua_tim_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        {
          error: "Project not found or access denied",
          code: "PROJECT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Get pegawai assigned to this project
    const { data: assignments, error: assignmentError } = await supabase
      .from("project_assignments")
      .select("assignee_id")
      .eq("project_id", projectId)
      .eq("assignee_type", "pegawai");

    if (assignmentError) {
      console.error("Assignment fetch error:", assignmentError);
      throw assignmentError;
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        data: [],
        meta: {
          timestamp: new Date().toISOString(),
          project_id: projectId,
          total_members: 0,
        },
      });
    }

    // Get user details for assigned pegawai
    const assigneeIds = assignments.map(
      (assignment: ProjectAssignment) => assignment.assignee_id
    );
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, nama_lengkap, email")
      .in("id", assigneeIds)
      .eq("role", "pegawai");

    if (usersError) {
      console.error("Users fetch error:", usersError);
      throw usersError;
    }

    // Format response untuk dropdown
    const projectMembers = (users || []).map((user: User) => ({
      id: user.id,
      nama_lengkap: user.nama_lengkap,
      email: user.email,
    }));

    return NextResponse.json({
      data: projectMembers,
      meta: {
        timestamp: new Date().toISOString(),
        project_id: projectId,
        total_members: projectMembers.length,
      },
    });
  } catch (error) {
    console.error("Project Members API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
