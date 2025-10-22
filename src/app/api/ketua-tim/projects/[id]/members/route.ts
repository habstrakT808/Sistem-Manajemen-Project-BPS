// File: src/app/api/ketua-tim/projects/[id]/members/route.ts
// FIXED: Complete implementation for task creation dropdown

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface ProjectMember {
  users: {
    id: string;
    nama_lengkap: string;
    email: string;
  };
  role: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { id: projectId } = await params;

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    // Verify ownership (leader or ketua) using service client to avoid RLS
    const { data: project, error: projectError } = await (svc as any)
      .from("projects")
      .select("id, leader_user_id, ketua_tim_id")
      .eq("id", projectId)
      .single();

    if (
      projectError ||
      !project ||
      ((project as { leader_user_id?: string; ketua_tim_id?: string })
        .leader_user_id !== user.id &&
        (project as { leader_user_id?: string; ketua_tim_id?: string })
          .ketua_tim_id !== user.id)
    ) {
      return NextResponse.json(
        {
          error: "Project not found or access denied",
          code: "PROJECT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Get project members (including leader)
    const { data: members, error: membersError } = await (svc as any)
      .from("project_members")
      .select(
        `
        user_id,
        role,
        users:users!project_members_user_id_fkey (
          id,
          nama_lengkap,
          email,
          is_active
        )
      `,
      )
      .eq("project_id", projectId)
      .eq("users.is_active", true);

    if (membersError) {
      console.error("Members fetch error:", membersError);
      throw membersError;
    }

    // First, get all pegawai assignments to determine who is actually working on this project
    const { data: assigns, error: assignsError } = await (svc as any)
      .from("project_assignments")
      .select("assignee_id")
      .eq("project_id", projectId)
      .eq("assignee_type", "pegawai");

    // Get the set of user IDs who are assigned as pegawai (workers)
    const assignedPegawaiIds = new Set<string>(
      (assigns || [])
        .map((a: { assignee_id: string }) => a.assignee_id)
        .filter(Boolean),
    );

    // Map members - only include those who are explicitly assigned as pegawai
    let projectMembers = (members || [])
      .filter((member: ProjectMember) => {
        const userId = member.users.id;
        const isAssigned = assignedPegawaiIds.has(userId);
        console.log(
          `🔍 DEBUG - Checking ${member.users.nama_lengkap} (${userId}): ${isAssigned ? "✅ INCLUDED" : "❌ FILTERED OUT"}`,
        );
        // Include member only if they are in project_assignments as pegawai
        return isAssigned;
      })
      .map((member: ProjectMember) => ({
        id: member.users.id,
        nama_lengkap: member.users.nama_lengkap,
        email: member.users.email,
        role: member.role,
      }));

    console.log(
      "🔍 DEBUG - Final projectMembers count:",
      projectMembers.length,
    );

    // Fallback: If no project_assignments found, include all project_members who have "member" role
    // This handles cases where project uses project_members table only
    if (assignedPegawaiIds.size === 0 && members && members.length > 0) {
      console.log(
        "⚠️ FALLBACK: No pegawai assignments found, using all project_members with 'member' role",
      );
      projectMembers = (members || []).map((member: ProjectMember) => ({
        id: member.users.id,
        nama_lengkap: member.users.nama_lengkap,
        email: member.users.email,
        role: member.role,
      }));
      console.log(
        "⚠️ FALLBACK: projectMembers after fallback:",
        projectMembers.length,
      );
    }

    // Add any assigned pegawai that aren't in project_members yet
    if (!assignsError && assigns && assigns.length > 0) {
      const existingIds = new Set(
        projectMembers.map((m: { id: string }) => m.id),
      );
      // Get user IDs that are assigned but not yet in projectMembers
      const userIds = (assigns as Array<{ assignee_id: string }>)
        .map((a) => a.assignee_id)
        .filter((uid) => !!uid && !existingIds.has(uid)); // Only include if not already in list

      if (userIds.length > 0) {
        const { data: userRows } = await (svc as any)
          .from("users")
          .select("id, nama_lengkap, email, is_active")
          .in("id", userIds)
          .eq("is_active", true);

        const additionalMembers = (userRows || [])
          .filter((u: { id: string }) => !existingIds.has(u.id))
          .map((u: { id: string; nama_lengkap: string; email: string }) => ({
            id: u.id,
            nama_lengkap: u.nama_lengkap,
            email: u.email,
            role: "member",
          }));

        if (additionalMembers.length > 0) {
          projectMembers = [...projectMembers, ...additionalMembers];
          // Upsert missing project_members for future consistency
          try {
            const upserts = additionalMembers.map((m: { id: string }) => ({
              project_id: projectId,
              user_id: m.id,
              role: "member",
            }));
            await (svc as any)
              .from("project_members")
              .upsert(upserts, { onConflict: "project_id,user_id" });
          } catch (e) {
            console.warn(
              "Non-fatal: failed to upsert project_members from assignments",
              e,
            );
          }
        }
      }
    }

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
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: projectId } = await params;
    const { user_ids } = await request.json();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify project leadership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("leader_user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 },
      );
    }

    // Add members to project
    const memberInserts = user_ids.map((userId: string) => ({
      project_id: projectId,
      user_id: userId,
      role: "member",
      created_by: user.id,
    }));

    const { data: newMembers, error: insertError } = await supabase
      .from("project_members")
      .upsert(memberInserts, { onConflict: "project_id,user_id" }).select(`
        user_id,
        users!inner (
          nama_lengkap,
          email
        )
      `);

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      data: newMembers,
      message: "Members added successfully",
    });
  } catch (error) {
    console.error("Add Members API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: projectId } = await params;
    const { user_id } = await request.json();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify project leadership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("leader_user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 },
      );
    }

    // Remove member from project
    const { error: deleteError } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user_id)
      .neq("role", "leader"); // Cannot remove leader

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove Member API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
