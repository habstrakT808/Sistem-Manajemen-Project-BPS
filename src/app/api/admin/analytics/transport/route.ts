// File: src/app/api/admin/analytics/transport/route.ts
// NEW: Transport analytics for admin

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface TransportRecord {
  occurred_on: string;
  amount: number;
  user_id: string;
  users?: {
    nama_lengkap: string;
  };
  tasks?: {
    title: string;
    projects?: {
      nama_project: string;
    };
  };
}

interface UserTransportRow {
  user_id: string;
  amount: number;
}

// interface ProjectTransportRecord kept for future when FK to tasks is available

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30";

    // Auth check - admin only
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    type UserProfile = { role: "admin" | "ketua_tim" | "pegawai" };
    if (
      profileError ||
      !userProfile ||
      (userProfile as UserProfile).role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const daysBack = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Use service-role client for analytics queries to avoid RLS edge-cases
    const supabaseAdmin = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // If there are no transport entries at all, short-circuit with empty stats
    const { count: anyTransportCount, error: countError } = await supabaseAdmin
      .from("earnings_ledger")
      .select("id", { count: "exact", head: true })
      .eq("type", "transport");

    if (countError) {
      throw countError;
    }

    if (!anyTransportCount || anyTransportCount === 0) {
      return NextResponse.json({
        data: {
          daily_transport: [],
          user_statistics: [],
          project_statistics: [],
          summary: {
            total_amount: 0,
            total_allocations: 0,
            unique_users: 0,
            unique_projects: 0,
          },
        },
      });
    }

    // Transport analytics by date
    const { data: dailyTransport, error: dailyError } = await supabaseAdmin
      .from("earnings_ledger")
      .select(`occurred_on, amount, user_id`)
      .eq("type", "transport")
      .gte("occurred_on", startDate.toISOString().split("T")[0])
      .order("occurred_on", { ascending: false });

    if (dailyError) {
      throw dailyError;
    }

    // Transport by user
    const { data: userTransport, error: userError } = await supabaseAdmin
      .from("earnings_ledger")
      .select(`user_id, amount`)
      .eq("type", "transport")
      .gte("occurred_on", startDate.toISOString().split("T")[0]);

    if (userError) {
      throw userError;
    }

    // Process user statistics
    const userStats = new Map<
      string,
      { name: string; email: string; total: number; count: number }
    >();
    // Build user map for names/emails
    const distinctUserIds = Array.from(
      new Set(
        ((userTransport || []) as UserTransportRow[]).map((r) => r.user_id)
      )
    );
    const userMap = new Map<string, { nama_lengkap: string; email: string }>();
    if (distinctUserIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from("users")
        .select("id, nama_lengkap, email")
        .in("id", distinctUserIds as unknown as string[]);
      (usersData || []).forEach((u) => {
        // @ts-expect-error loose type from db
        userMap.set(u.id, { nama_lengkap: u.nama_lengkap, email: u.email });
      });
    }

    ((userTransport || []) as UserTransportRow[]).forEach((record) => {
      const key = record.user_id;
      const meta = userMap.get(key) || { nama_lengkap: "-", email: "-" };
      const existing = userStats.get(key) || {
        name: meta.nama_lengkap,
        email: meta.email,
        total: 0,
        count: 0,
      };
      existing.total += record.amount;
      existing.count += 1;
      userStats.set(key, existing);
    });

    // Transport by task (via allocation -> task)
    const { data: transportRows, error: transportRowsError } =
      await supabaseAdmin
        .from("earnings_ledger")
        .select(`source_id, amount`)
        .eq("type", "transport")
        .gte("occurred_on", startDate.toISOString().split("T")[0]);

    if (transportRowsError) {
      throw transportRowsError;
    }

    const allocationIds = Array.from(
      new Set(
        (transportRows || []).map((r: { source_id: string }) => r.source_id)
      )
    );

    const { data: allocationLookup } = await supabaseAdmin
      .from("task_transport_allocations")
      .select("id, task_id")
      .in("id", allocationIds.length > 0 ? allocationIds : ["__none__"]);

    const allocationToTask = new Map<string, string>();
    (allocationLookup || []).forEach((a) => {
      // @ts-expect-error db loose types
      allocationToTask.set(a.id as string, a.task_id as string);
    });

    // Aggregate totals per task_id
    const taskTotals = new Map<string, { total: number; count: number }>();
    (transportRows || []).forEach((row) => {
      const taskId = allocationToTask.get(
        (row as { source_id: string }).source_id
      );
      if (!taskId) return;
      const agg = taskTotals.get(taskId) || { total: 0, count: 0 };
      agg.total += (row as { amount: number }).amount;
      agg.count += 1;
      taskTotals.set(taskId, agg);
    });

    // Fetch task titles
    const taskIds = Array.from(taskTotals.keys());
    const taskNameById = new Map<string, string>();
    if (taskIds.length > 0) {
      const { data: tasksData } = await supabaseAdmin
        .from("tasks")
        .select("id, title")
        .in("id", taskIds as unknown as string[]);
      (tasksData || []).forEach((t) => {
        // @ts-expect-error db loose types
        taskNameById.set(t.id as string, (t.title as string) || "Unknown Task");
      });
    }

    // Build stats array (reusing project_statistics slot for tasks)
    const projectStats = new Map<
      string,
      { name: string; total: number; count: number }
    >();
    taskTotals.forEach((agg, taskId) => {
      const name = taskNameById.get(taskId) || "Unknown Task";
      projectStats.set(taskId, { name, total: agg.total, count: agg.count });
    });

    return NextResponse.json({
      data: {
        daily_transport: dailyTransport || [],
        user_statistics: Array.from(userStats.values()).sort(
          (a, b) => b.total - a.total
        ),
        project_statistics: Array.from(projectStats.values()).sort(
          (a, b) => b.total - a.total
        ),
        summary: {
          total_amount: (dailyTransport || []).reduce(
            (sum: number, r: TransportRecord) => sum + r.amount,
            0
          ),
          total_allocations: (dailyTransport || []).length,
          unique_users: userStats.size,
          unique_projects: projectStats.size,
        },
      },
    });
  } catch (error) {
    console.error("Transport Analytics API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
