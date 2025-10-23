import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/../database/types/database.types";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const isActiveParam = searchParams.get("is_active");

    // Build query

    let query: any = (supabaseAdmin as any)
      .from("users")
      .select(
        "id, email, role, nama_lengkap, no_telepon, alamat, nip, is_active",
      );

    if (role) {
      query = query.eq("role", role);
    }

    if (isActiveParam !== null) {
      const isActive = isActiveParam === "true";
      query = query.eq("is_active", isActive);
    }

    const { data, error } = await query.order("nama_lengkap", {
      ascending: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      role,
      nama_lengkap,
      no_telepon,
      alamat,
      nip,
      is_active,
    } = body;

    // Validate required fields
    if (!email || !password || !role || !nama_lengkap) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Disallow global role 'ketua_tim' – use project-level leader instead
    if (role === "ketua_tim") {
      return NextResponse.json(
        {
          error:
            "Role 'ketua_tim' is not allowed globally. Use 'pegawai' and assign leader per project.",
        },
        { status: 400 },
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    const userExists = existingUser?.users?.some(
      (user) => user.email === email,
    );
    if (userExists) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 },
      );
    }

    // Create auth user with additional metadata
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nama_lengkap,
          no_telepon: no_telepon || null,
          alamat: alamat || null,
          role,
        },
      });

    if (authError) {
      console.error("Error creating auth user:", authError);
      console.error("Auth error details:", JSON.stringify(authError, null, 2));
      return NextResponse.json(
        { error: "Failed to create user: " + authError.message },
        { status: 400 },
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "No user data returned" },
        { status: 400 },
      );
    }

    // Wait a moment for any triggers to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check if user profile was created by trigger
    const { data: existingProfile, error: checkError } = await (
      supabaseAdmin as any
    )
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking user profile:", checkError);
    }

    // Create or update user profile
    const insertData: Database["public"]["Tables"]["users"]["Insert"] = {
      id: authData.user.id,
      email,
      role,
      nama_lengkap,
      no_telepon: no_telepon || null,
      alamat: alamat || null,
      nip: nip || null,
      is_active: is_active !== undefined ? is_active : true,
    };

    let profileError;
    if (existingProfile) {
      // Update existing profile
      const { error } = await (supabaseAdmin as any)
        .from("users")
        .update(insertData)
        .eq("id", authData.user.id);
      profileError = error;
    } else {
      // Insert new profile
      const { error } = await (supabaseAdmin as any)
        .from("users")
        .insert(insertData);
      profileError = error;
    }

    if (profileError) {
      console.error("Error creating/updating user profile:", profileError);
      console.error(
        "Profile error details:",
        JSON.stringify(profileError, null, 2),
      );
      // Try to delete the auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error("Error deleting auth user:", deleteError);
      }
      return NextResponse.json(
        { error: "Failed to create user profile: " + profileError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "User created successfully",
      user: {
        id: authData.user.id,
        email,
        role,
        nama_lengkap,
        no_telepon,
        alamat,
        is_active,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/admin/users:", error);
    console.error("Full error details:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Internal server error: " + (error as Error).message },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      email,
      role,
      nama_lengkap,
      no_telepon,
      alamat,
      nip,
      is_active,
    } = body;

    // Only require id for partial updates
    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Get original user data for rollback if needed
    let originalEmail = null;
    if (email !== undefined) {
      const { data: originalUser } = await (supabaseAdmin as any)
        .from("users")
        .select("email")
        .eq("id", id)
        .single();

      originalEmail = originalUser?.email;
    }

    // Build partial update object only with provided fields
    const updateData: Database["public"]["Tables"]["users"]["Update"] = {
      updated_at: new Date().toISOString(),
    } as Database["public"]["Tables"]["users"]["Update"];

    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (nama_lengkap !== undefined) updateData.nama_lengkap = nama_lengkap;
    if (no_telepon !== undefined) updateData.no_telepon = no_telepon || null;
    if (alamat !== undefined) updateData.alamat = alamat || null;
    if (nip !== undefined) updateData.nip = nip || null;
    if (typeof is_active === "boolean") updateData.is_active = is_active;

    // Update public.users table

    const { error: profileError } = await (supabaseAdmin as any)
      .from("users")
      .update(updateData)
      .eq("id", id);

    if (profileError) {
      console.error("Error updating user profile:", profileError);
      return NextResponse.json(
        { error: "Failed to update user profile" },
        { status: 400 },
      );
    }

    // If email is being updated, also update auth.users table
    if (email !== undefined) {
      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(id, { email: email });

      if (authError) {
        console.error("Error updating auth user email:", authError);
        // Rollback the public.users update if auth update fails
        if (originalEmail) {
          await (supabaseAdmin as any)
            .from("users")
            .update({ email: originalEmail })
            .eq("id", id);
        }

        return NextResponse.json(
          { error: "Failed to update user authentication email" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error in PUT /api/admin/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Step 1: Clean up related records that reference this user

    const supabase = supabaseAdmin as any;

    // Update project_members.created_by to NULL where it references this user
    const { error: updateProjectMembersError } = await supabase
      .from("project_members")
      .update({ created_by: null })
      .eq("created_by", id);

    if (updateProjectMembersError) {
      console.error(
        "Error updating project_members.created_by:",
        updateProjectMembersError,
      );
      return NextResponse.json(
        { error: "Failed to clean up project member references" },
        { status: 400 },
      );
    }

    // Update projects.created_by to NULL where it references this user
    const { error: updateProjectsCreatedByError } = await supabase
      .from("projects")
      .update({ created_by: null })
      .eq("created_by", id);

    if (updateProjectsCreatedByError) {
      console.error(
        "Error updating projects.created_by:",
        updateProjectsCreatedByError,
      );
    }

    // Update projects.updated_by to NULL where it references this user
    const { error: updateProjectsUpdatedByError } = await supabase
      .from("projects")
      .update({ updated_by: null })
      .eq("updated_by", id);

    if (updateProjectsUpdatedByError) {
      console.error(
        "Error updating projects.updated_by:",
        updateProjectsUpdatedByError,
      );
    }

    // Update tasks.created_by to NULL where it references this user
    const { error: updateTasksCreatedByError } = await supabase
      .from("tasks")
      .update({ created_by: null })
      .eq("created_by", id);

    if (updateTasksCreatedByError) {
      console.error(
        "Error updating tasks.created_by:",
        updateTasksCreatedByError,
      );
    }

    // Update system_settings.updated_by to NULL where it references this user
    const { error: updateSystemSettingsError } = await supabase
      .from("system_settings")
      .update({ updated_by: null })
      .eq("updated_by", id);

    if (updateSystemSettingsError) {
      console.error(
        "Error updating system_settings.updated_by:",
        updateSystemSettingsError,
      );
    }

    // Update project_assignments.created_by to NULL where it references this user
    const { error: updateAssignmentsError } = await supabase
      .from("project_assignments")
      .update({ created_by: null })
      .eq("created_by", id);

    if (updateAssignmentsError) {
      console.error(
        "Error updating project_assignments.created_by:",
        updateAssignmentsError,
      );
    }

    // Update activity_logs.actor_user_id to NULL where it references this user
    const { error: updateActivityLogsError } = await supabase
      .from("activity_logs")
      .update({ actor_user_id: null })
      .eq("actor_user_id", id);

    if (updateActivityLogsError) {
      console.error(
        "Error updating activity_logs.actor_user_id:",
        updateActivityLogsError,
      );
    }

    // Step 2: Delete user profile
    const { error: profileError } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (profileError) {
      console.error("Error deleting user profile:", profileError);
      return NextResponse.json(
        { error: "Failed to delete user profile" },
        { status: 400 },
      );
    }

    // Step 3: Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.error("Error deleting auth user:", authError);
      return NextResponse.json(
        { error: "Failed to delete auth user" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
