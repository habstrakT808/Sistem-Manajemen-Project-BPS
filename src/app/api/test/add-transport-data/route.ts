import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  // Disabled: test route removed to avoid hardcoded dummy project/data
  return NextResponse.json({ success: false, message: "Test route disabled" });
}
