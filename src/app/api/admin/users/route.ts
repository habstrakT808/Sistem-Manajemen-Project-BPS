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
  }
);

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
      is_active,
    } = body;

    // Validate required fields
    if (!email || !password || !role || !nama_lengkap) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return NextResponse.json(
        { error: "Failed to create user: " + authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "No user data returned" },
        { status: 400 }
      );
    }

    // Create user profile
    const insertData: Database["public"]["Tables"]["users"]["Insert"] = {
      id: authData.user.id,
      email,
      role,
      nama_lengkap,
      no_telepon: no_telepon || null,
      alamat: alamat || null,
      is_active: is_active !== undefined ? is_active : true,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await (supabaseAdmin as any)
      .from("users")
      .insert(insertData);

    if (profileError) {
      console.error("Error creating user profile:", profileError);
      // Try to delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 400 }
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, role, nama_lengkap, no_telepon, alamat, is_active } =
      body;

    // Only require id for partial updates
    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
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
    if (typeof is_active === "boolean") updateData.is_active = is_active;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await (supabaseAdmin as any)
      .from("users")
      .update(updateData)
      .eq("id", id);

    if (profileError) {
      console.error("Error updating user profile:", profileError);
      return NextResponse.json(
        { error: "Failed to update user profile" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error in PUT /api/admin/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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
        { status: 400 }
      );
    }

    // Delete user profile first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await (supabaseAdmin as any)
      .from("users")
      .delete()
      .eq("id", id);

    if (profileError) {
      console.error("Error deleting user profile:", profileError);
      return NextResponse.json(
        { error: "Failed to delete user profile" },
        { status: 400 }
      );
    }

    // Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.error("Error deleting auth user:", authError);
      return NextResponse.json(
        { error: "Failed to delete auth user" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
