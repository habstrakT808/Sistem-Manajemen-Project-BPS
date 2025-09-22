// File: src/app/api/pegawai/profile/skills/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/../database/types/database.types";
import { z } from "zod";

const SkillSchema = z.object({
  name: z.string().min(1, "Skill name is required").max(50),
  level: z.number().min(1).max(5),
  category: z.string().min(1, "Category is required"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    if (profileError || !userProfile || (userProfile as any).role !== "pegawai") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const skillData = SkillSchema.parse(body);

    // Get current skills
    const currentSkills = user.user_metadata?.skills || [];

    // Check if skill already exists
    const skillExists = (currentSkills as Array<{ name: string }>).some(
      (skill) => skill.name.toLowerCase() === skillData.name.toLowerCase()
    );

    if (skillExists) {
      return NextResponse.json(
        { error: "Skill already exists" },
        { status: 400 }
      );
    }

    // Add new skill
    const updatedSkills = [...currentSkills, skillData];

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
      message: "Skill added successfully",
      skill: skillData,
    });
  } catch (error) {
    console.error("Add Skill Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to add skill" }, { status: 500 });
  }
}
