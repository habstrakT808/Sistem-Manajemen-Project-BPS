import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  // Disabled: no-op cleanup (hardcoded dummy project/tasks not used anymore)
  return NextResponse.json({ success: true, message: "Cleanup disabled" });
}

export async function GET() {
  return NextResponse.json({ message: "Disabled" });
}
