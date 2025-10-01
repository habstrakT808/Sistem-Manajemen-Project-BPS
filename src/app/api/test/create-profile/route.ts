import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  try {
    console.log("🔍 [DEBUG] Creating user profile...");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get the ketua_tim auth user
    const authUserId = "c73d8e77-e312-4525-bc5f-07ad2263a0c1";

    // Use one of the existing users as the linked user
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("role", "pegawai")
      .limit(1)
      .single();

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "No existing user found to link",
        },
        { status: 404 },
      );
    }

    // Create user profile linking to existing user
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: authUserId,
        email: "ketua@test.com",
        nama_lengkap: "Ketua Tim 1",
        role: "ketua_tim",
        user_id: existingUser.id, // Link to existing user
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

    console.log("🔍 [DEBUG] User profile created successfully");

    return NextResponse.json({
      success: true,
      message: "User profile created successfully",
      data: {
        authUserId: authUserId,
        email: "ketua@test.com",
        password: "password123", // Default password
        role: "ketua_tim",
        linkedUserId: existingUser.id,
      },
    });
  } catch (error) {
    console.error("🔍 [DEBUG] Error creating user profile:", error);
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
