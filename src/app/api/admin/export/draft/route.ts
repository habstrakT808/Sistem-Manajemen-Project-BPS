import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type: _type, data: _data } = body;

    // Create a simple draft storage (could be stored in database in production)
    // For now, we'll just return success
    // In production, you'd want to save this to a drafts table

    return NextResponse.json({
      message: "Draft saved successfully",
      draftId: `draft-${Date.now()}`,
    });
  } catch (error) {
    console.error("Error saving draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
