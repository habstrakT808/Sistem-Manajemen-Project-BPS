import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  try {
    console.log("🔍 [DEBUG] Creating auth user...");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get the first user (Dhika) to create auth profile
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", "57bf81a6-9278-47c4-9800-9d1999915eb9")
      .single();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    // Create auth user
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: user.email,
        password: "password123", // Simple test password
        email_confirm: true,
        user_metadata: {
          nama_lengkap: user.nama_lengkap,
          role: user.role,
        },
      });

    if (authError) {
      console.error("Auth user creation error:", authError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create auth user",
          details: authError,
        },
        { status: 500 },
      );
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: authUser.user.id,
        email: user.email,
        nama_lengkap: user.nama_lengkap,
        role: user.role,
        user_id: user.id, // Link to existing user
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create user profile",
          details: profileError,
        },
        { status: 500 },
      );
    }

    // Update the user to be ketua_tim so they can access financial dashboard
    const { error: updateError } = await supabase
      .from("users")
      .update({ role: "ketua_tim" })
      .eq("id", user.id);

    if (updateError) {
      console.error("User role update error:", updateError);
    }

    console.log("🔍 [DEBUG] Auth user created:", authUser.user.id);

    return NextResponse.json({
      success: true,
      message: "Auth user created successfully",
      data: {
        authUserId: authUser.user.id,
        email: user.email,
        password: "password123",
        role: "ketua_tim",
      },
    });
  } catch (error) {
    console.error("🔍 [DEBUG] Error creating auth user:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
