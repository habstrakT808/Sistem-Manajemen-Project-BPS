import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/database/types/database.types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    if (!projectId) {
      return NextResponse.json(
        { error: "project_id parameter required" },
        { status: 400 },
      );
    }

    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: assignments, error } = await svc
      .from("project_assignments")
      .select("*")
      .eq("project_id", projectId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      project_id: projectId,
      assignments: assignments || [],
    });
  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
