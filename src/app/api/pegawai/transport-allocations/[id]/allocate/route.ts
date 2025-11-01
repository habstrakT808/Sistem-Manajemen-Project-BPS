import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { id: allocationId } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allocation_date } = await request.json();

    if (!allocation_date) {
      return NextResponse.json(
        { error: "Allocation date is required" },
        { status: 400 },
      );
    }

    // Verify the allocation belongs to the user and get task details
    const { data: allocation, error: allocationError } = await serviceClient
      .from("task_transport_allocations")
      .select(
        `
        id, 
        user_id, 
        allocation_date,
        amount,
        task_id,
        task:tasks (
          start_date,
          end_date
        )
      `,
      )
      .eq("id", allocationId)
      .eq("user_id", user.id)
      .single();

    if (allocationError || !allocation) {
      return NextResponse.json(
        { error: "Transport allocation not found or access denied" },
        { status: 404 },
      );
    }

    if ((allocation as any).allocation_date) {
      return NextResponse.json(
        { error: "Transport allocation already allocated" },
        { status: 400 },
      );
    }

    // Validate that allocation date is within task date range
    const taskData = (allocation as any).task as any;
    if (taskData && taskData.start_date && taskData.end_date) {
      const allocationDate = new Date(allocation_date);
      const taskStartDate = new Date(taskData.start_date);
      const taskEndDate = new Date(taskData.end_date);

      if (allocationDate < taskStartDate || allocationDate > taskEndDate) {
        return NextResponse.json(
          {
            error: `Allocation date must be within task date range (${taskData.start_date} to ${taskData.end_date})`,
          },
          { status: 400 },
        );
      }
    }

    // Block if date falls into an admin global schedule
    try {
      const { data: settings, error: setErr } = await (serviceClient as any)
        .from("system_settings")
        .select("id, config")
        .eq("id", 1)
        .single();
      if (!setErr) {
        const raw = (settings as any)?.config;
        const cfg =
          raw && typeof raw === "string" ? JSON.parse(raw) : raw || {};
        const schedules: any[] = cfg?.admin_schedules ?? [];
        if (schedules.length > 0) {
          const parseYmd = (ymd: string) => {
            const [yy, mm, dd] = ymd.split("-").map((x: string) => Number(x));
            return new Date(yy, (mm || 1) - 1, dd || 1);
          };
          const alloc = parseYmd(String(allocation_date).slice(0, 10));
          const blocked = schedules.some((s) => {
            const sd = parseYmd(String(s.start_date));
            const ed = parseYmd(String(s.end_date));
            return (
              alloc.getTime() >= sd.getTime() && alloc.getTime() <= ed.getTime()
            );
          });
          if (blocked) {
            return NextResponse.json(
              { error: "Tanggal ini diblokir oleh jadwal global admin." },
              { status: 400 },
            );
          }
        }
      }
    } catch (_) {}

    // Check if the date is already allocated by the same user
    const { data: existingAllocation, error: checkError } = await serviceClient
      .from("task_transport_allocations")
      .select("id")
      .eq("user_id", user.id)
      .eq("allocation_date", allocation_date)
      .is("canceled_at", null)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error checking existing allocation:", checkError);
      return NextResponse.json(
        { error: "Failed to validate allocation date" },
        { status: 500 },
      );
    }

    if (existingAllocation) {
      return NextResponse.json(
        {
          error: `Tanggal ${new Date(allocation_date).toLocaleDateString("id-ID")} sudah terisi. Silakan pilih tanggal lain.`,
        },
        { status: 400 },
      );
    }

    // Check if earnings_ledger entry already exists to avoid duplicate key error
    const { data: existingEarnings } = await (serviceClient as any)
      .from("earnings_ledger")
      .select("id")
      .eq("type", "transport")
      .eq("source_table", "task_transport_allocations")
      .eq("source_id", allocationId)
      .maybeSingle();

    // If earnings entry exists but allocation_date is null, update it instead of creating new
    if (existingEarnings && !(allocation as any).allocation_date) {
      await (serviceClient as any)
        .from("earnings_ledger")
        .update({
          user_id: user.id,
          amount: (allocation as any).amount || 150000,
          occurred_on: allocation_date,
          posted_at: new Date().toISOString(),
        })
        .eq("type", "transport")
        .eq("source_table", "task_transport_allocations")
        .eq("source_id", allocationId);
    }

    // Update the allocation with the selected date
    const { error: updateError } = await (serviceClient as any)
      .from("task_transport_allocations")
      .update({
        allocation_date: allocation_date,
        allocated_at: new Date().toISOString(),
      })
      .eq("id", allocationId);

    if (updateError) {
      console.error("Error updating allocation:", updateError);

      // If it's a duplicate key error from trigger, try to fix it
      if (
        updateError.code === "23505" &&
        updateError.message?.includes("earnings_ledger")
      ) {
        // Update existing earnings_ledger entry instead
        const { error: earningsError } = await (serviceClient as any)
          .from("earnings_ledger")
          .update({
            user_id: user.id,
            amount: (allocation as any).amount || 150000,
            occurred_on: allocation_date,
            posted_at: new Date().toISOString(),
          })
          .eq("type", "transport")
          .eq("source_table", "task_transport_allocations")
          .eq("source_id", allocationId);

        if (!earningsError) {
          // Retry the allocation update
          const { error: retryError } = await (serviceClient as any)
            .from("task_transport_allocations")
            .update({
              allocation_date: allocation_date,
              allocated_at: new Date().toISOString(),
            })
            .eq("id", allocationId);

          if (!retryError) {
            return NextResponse.json({
              message: "Transport allocated successfully",
              allocation_date: allocation_date,
            });
          }
        }
      }

      return NextResponse.json(
        { error: "Failed to allocate transport" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Transport allocated successfully",
      allocation_date: allocation_date,
    });
  } catch (error) {
    console.error("Allocate transport error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
