// File: src/app/api/debug-transport-earnings/route.ts
// Debug endpoint to check for duplicate transport earnings

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function GET(request: NextRequest) {
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

    // Use service client to avoid RLS issues
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get all transport allocations for this user
    const { data: allocations, error: allocError } = await svc
      .from("task_transport_allocations")
      .select(
        `
        id,
        task_id,
        amount,
        allocation_date,
        allocated_at,
        canceled_at,
        tasks!inner (
          id,
          title,
          project_id
        )
      `,
      )
      .eq("user_id", user.id)
      .is("canceled_at", null)
      .order("allocation_date", { ascending: false });

    if (allocError) {
      throw allocError;
    }

    // Get project details separately
    const projectIds = [
      ...new Set(
        (allocations || [])
          .map((alloc) => alloc.tasks?.project_id)
          .filter(Boolean),
      ),
    ];
    let projectDetails = {};

    if (projectIds.length > 0) {
      const { data: projects, error: projectsError } = await svc
        .from("projects")
        .select("id, nama_project")
        .in("id", projectIds);

      if (!projectsError && projects) {
        projectDetails = projects.reduce(
          (acc, project) => {
            acc[project.id] = project;
            return acc;
          },
          {} as Record<string, any>,
        );
      }
    }

    // Get all earnings_ledger entries for this user
    const { data: earnings, error: earningsError } = await svc
      .from("earnings_ledger")
      .select(
        `
        id,
        type,
        amount,
        occurred_on,
        posted_at,
        source_id,
        source_table
      `,
      )
      .eq("user_id", user.id)
      .eq("type", "transport")
      .order("occurred_on", { ascending: false });

    if (earningsError) {
      throw earningsError;
    }

    // Check for duplicates
    const earningsBySource = new Map();
    const duplicates = [];

    (earnings || []).forEach((earning) => {
      const key = `${earning.source_table}-${earning.source_id}`;
      if (earningsBySource.has(key)) {
        duplicates.push({
          source: key,
          entries: [earningsBySource.get(key), earning],
        });
      } else {
        earningsBySource.set(key, earning);
      }
    });

    // Calculate totals
    const totalAllocations = (allocations || []).reduce(
      (sum, alloc) => sum + alloc.amount,
      0,
    );
    const totalEarnings = (earnings || []).reduce(
      (sum, earning) => sum + earning.amount,
      0,
    );
    const allocatedCount = (allocations || []).filter(
      (alloc) => alloc.allocation_date,
    ).length;
    const pendingCount = (allocations || []).filter(
      (alloc) => !alloc.allocation_date,
    ).length;

    // Enrich allocations with project details
    const enrichedAllocations = (allocations || []).map((alloc) => ({
      ...alloc,
      tasks: {
        ...alloc.tasks,
        projects: projectDetails[alloc.tasks?.project_id] || {
          id: alloc.tasks?.project_id,
          nama_project: "Unknown Project",
        },
      },
    }));

    return NextResponse.json({
      user_id: user.id,
      allocations: {
        total: allocations?.length || 0,
        allocated: allocatedCount,
        pending: pendingCount,
        total_amount: totalAllocations,
      },
      earnings: {
        total: earnings?.length || 0,
        total_amount: totalEarnings,
        duplicates: duplicates.length,
        duplicate_entries: duplicates,
      },
      discrepancy: {
        difference: totalEarnings - totalAllocations,
        has_duplicates: duplicates.length > 0,
      },
      allocations_detail: enrichedAllocations,
      earnings_detail: earnings || [],
    });
  } catch (error) {
    console.error("Debug Transport Earnings Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
