// File: src/app/api/pegawai/earnings/route.ts
// UPDATED: Support new earnings ledger system

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface HistoricalRecord {
  occurred_on: string;
  amount: number;
}

interface EarningsRecord {
  id: string;
  type: string;
  amount: number;
  occurred_on: string;
  posted_at: string;
  source_id: string;
}

interface TaskRecord {
  id: string;
  title: string;
  project_id: string;
}

interface ProjectRecord {
  id: string;
  nama_project: string;
  tanggal_mulai: string;
  deadline: string;
}

interface TransportAllocationRecord {
  id: string;
  task_id: string;
  user_id: string;
  amount: number;
  allocation_date: string | null;
  allocated_at: string | null;
}

interface AllocationLookupRecord {
  id: string;
  task_id: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const month = parseInt(
      searchParams.get("month") || String(new Date().getMonth() + 1),
    );
    const year = parseInt(
      searchParams.get("year") || String(new Date().getFullYear()),
    );

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Service client to avoid RLS issues
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // First get transport allocations that have been allocated (have allocation_date)
    const { data: allocatedTransport, error: transportError } = await svc
      .from("task_transport_allocations")
      .select("id, amount, allocation_date")
      .eq("user_id", user.id)
      .not("allocation_date", "is", null)
      .is("canceled_at", null); // Only active (not canceled)

    if (transportError) {
      throw transportError;
    }

    // Get earnings only for allocated transport
    const allocationIds = (allocatedTransport || []).map(
      (t: TransportAllocationRecord) => t.id,
    );

    const { data: currentEarnings, error: currentError } = await svc
      .from("earnings_ledger")
      .select(
        `
        id,
        type,
        amount,
        occurred_on,
        posted_at,
        source_id
      `,
      )
      .eq("user_id", user.id)
      .in("source_id", allocationIds)
      .gte("occurred_on", `${year}-${month.toString().padStart(2, "0")}-01`)
      .lt(
        "occurred_on",
        `${year}-${(month + 1).toString().padStart(2, "0")}-01`,
      )
      .order("occurred_on", { ascending: false });

    if (currentError) {
      throw currentError;
    }

    // Get task details separately to avoid FK relationship errors
    // source_id refers to task_transport_allocations.id, not tasks.id
    const earningsAllocationIds = Array.from(
      new Set(
        ((currentEarnings as EarningsRecord[]) || [])
          .map((e) => e.source_id)
          .filter(Boolean),
      ),
    );

    const taskDetails: Record<string, { title: string; project_id: string }> =
      {};
    let allocations: AllocationLookupRecord[] = [];
    if (earningsAllocationIds.length > 0) {
      // First get task_transport_allocations to get task_id
      const { data: allocationsData } = await svc
        .from("task_transport_allocations")
        .select("id, task_id")
        .in("id", earningsAllocationIds);

      allocations = (allocationsData as AllocationLookupRecord[]) || [];
      const taskIds = allocations.map((a) => a.task_id).filter(Boolean);

      if (taskIds.length > 0) {
        // Then get tasks using the task_ids
        const { data: tasks } = await svc
          .from("tasks")
          .select("id, title, project_id")
          .in("id", taskIds);

        ((tasks as TaskRecord[]) || []).forEach((t) => {
          taskDetails[t.id] = {
            title: t.title,
            project_id: t.project_id,
          };
        });
      }
    }

    // Get project details separately
    const projectIds = Array.from(
      new Set(
        Object.values(taskDetails)
          .map((t) => t.project_id)
          .filter(Boolean),
      ),
    );

    const projectDetails: Record<
      string,
      { nama_project: string; tanggal_mulai: string; deadline: string }
    > = {};
    if (projectIds.length > 0) {
      const { data: projects } = await svc
        .from("projects")
        .select("id, nama_project, tanggal_mulai, deadline")
        .in("id", projectIds);

      ((projects as ProjectRecord[]) || []).forEach((p) => {
        projectDetails[p.id] = {
          nama_project: p.nama_project,
          tanggal_mulai: p.tanggal_mulai,
          deadline: p.deadline,
        };
      });
    }

    // Get historical data (last 12 months)
    const { data: historicalData, error: historicalError } = await svc
      .from("earnings_ledger")
      .select("amount, occurred_on")
      .eq("user_id", user.id)
      .gte("occurred_on", `${year - 1}-${month.toString().padStart(2, "0")}-01`)
      .order("occurred_on", { ascending: true });

    if (historicalError) {
      throw historicalError;
    }

    // Process historical data by month
    const monthlyData = new Map<string, number>();
    (historicalData || []).forEach((record: HistoricalRecord) => {
      const recordDate = new Date(record.occurred_on);
      const monthKey = `${recordDate.getFullYear()}-${(recordDate.getMonth() + 1).toString().padStart(2, "0")}`;
      monthlyData.set(
        monthKey,
        (monthlyData.get(monthKey) || 0) + record.amount,
      );
    });

    const historical = Array.from(monthlyData.entries()).map(([key, total]) => {
      const [year, month] = key.split("-");
      return {
        month: parseInt(month),
        year: parseInt(year),
        month_name: new Date(
          parseInt(year),
          parseInt(month) - 1,
        ).toLocaleDateString("id-ID", {
          month: "short",
          year: "numeric",
        }),
        total,
      };
    });

    const totalCurrentMonth = (
      (currentEarnings as EarningsRecord[]) || []
    ).reduce((sum: number, e) => sum + e.amount, 0);

    return NextResponse.json({
      current_month: {
        month,
        year,
        total_earnings: totalCurrentMonth,
        records: ((currentEarnings as EarningsRecord[]) || []).map((record) => {
          // Find the task details by looking up the allocation first
          let task = null;
          let project = null;

          // Get allocation to find task_id
          const allocation = allocations.find((a) => a.id === record.source_id);
          if (allocation) {
            task = taskDetails[allocation.task_id];
            if (task) {
              project = projectDetails[task.project_id];
            }
          }

          return {
            id: record.id,
            type: record.type,
            amount: record.amount,
            occurred_on: record.occurred_on,
            description: `Transport allowance for task: ${task?.title || "Unknown Task"}`,
            projects: project || {
              nama_project: "Unknown Project",
              tanggal_mulai: "",
              deadline: "",
            },
          };
        }),
      },
      historical_data: historical,
    });
  } catch (error) {
    console.error("Earnings API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
