// File: src/app/api/pegawai/notifications/route.ts
// NEW: Notification data for pegawai layout

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

    // Get pending transport allocations
    const { count: pendingTransport } = await supabase
      .from("task_transport_allocations")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .is("allocation_date", null)
      .is("canceled_at", null);

    // Get urgent tasks (due within 3 days)
    const urgentDate = new Date();
    urgentDate.setDate(urgentDate.getDate() + 3);

    const { count: urgentTasks } = await supabase
      .from("tasks")
      .select("id", { count: "exact" })
      .eq("assignee_user_id", user.id)
      .in("status", ["pending", "in_progress"])
      .lte("end_date", urgentDate.toISOString().split("T")[0]);

    // Get pending reviews
    const { count: pendingReviews } = await supabase
      .from("mitra_reviews")
      .select("id", { count: "exact" })
      .eq("pegawai_id", user.id)
      .is("rating", null); // Assuming null rating means pending

    return NextResponse.json({
      data: {
        pending_transport_allocations: pendingTransport || 0,
        urgent_tasks: urgentTasks || 0,
        pending_reviews: pendingReviews || 0,
      },
    });
  } catch (error) {
    console.error("Notifications API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
