// File: src/app/api/pegawai/profile/skills/[name]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/../database/types/database.types";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const supabase = await createClient();
    const { name: skillName } = await context.params;

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation
    const { data: userProfile, error: profileError } = (await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()) as {
      data: {
        role: Database["public"]["Tables"]["users"]["Row"]["role"];
      } | null;
      error: unknown;
    };

    if (
      profileError ||
      !userProfile ||
      (userProfile as any).role !== "pegawai"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get current skills
    const currentSkills = user.user_metadata?.skills || [];

    // Remove skill
    const updatedSkills = (currentSkills as Array<{ name: string }>).filter(
      (skill) => skill.name !== decodeURIComponent(skillName)
    );

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        skills: updatedSkills,
      },
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      message: "Skill removed successfully",
    });
  } catch (error) {
    console.error("Remove Skill Error:", error);
    return NextResponse.json(
      { error: "Failed to remove skill" },
      { status: 500 }
    );
  }
}
