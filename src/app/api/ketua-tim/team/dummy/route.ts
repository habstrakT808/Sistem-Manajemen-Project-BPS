import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
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

    // Return realistic dummy data
    const dummyData = {
      data: [
        {
          id: "dummy-1",
          nama_lengkap: "Pegawai 1",
          email: "pegawai@test.com",
          is_active: true,
          workload: {
            project_count: 3,
            workload_level: "medium",
          },
          current_projects: [
            {
              id: "project-1",
              nama_project: "Project Survey Kelapa",
              status: "active",
              deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            },
            {
              id: "project-2",
              nama_project: "Project Analisis Data",
              status: "active",
              deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            },
          ],
          task_stats: {
            pending: 5,
            in_progress: 3,
            completed: 12,
            total: 20,
          },
          monthly_earnings: 2500000,
        },
        {
          id: "dummy-2",
          nama_lengkap: "Pegawai 2",
          email: "pegawai2@test.com",
          is_active: true,
          workload: {
            project_count: 2,
            workload_level: "low",
          },
          current_projects: [
            {
              id: "project-3",
              nama_project: "Project Monitoring",
              status: "active",
              deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            },
          ],
          task_stats: {
            pending: 2,
            in_progress: 1,
            completed: 8,
            total: 11,
          },
          monthly_earnings: 1800000,
        },
      ],
      message: "Dummy data for testing",
    };

    return NextResponse.json(dummyData);
  } catch (error) {
    console.error("Dummy data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
