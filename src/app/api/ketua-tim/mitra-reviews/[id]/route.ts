import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id: mitraId } = await ctx.params;

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service client to avoid RLS recursion issues
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check ownership: user must be ketua or leader for any project
    const { data: ownedProjects } = await svc
      .from("projects")
      .select("id")
      .or(`ketua_tim_id.eq.${user.id},leader_user_id.eq.${user.id}`)
      .limit(1);

    const isOwner = (ownedProjects || []).length > 0;

    if (!isOwner) {
      return NextResponse.json(
        {
          error: "Forbidden",
          details: "User must be a project leader to access this endpoint",
        },
        { status: 403 },
      );
    }

    // Fetch mitra info
    const { data: mitra, error: mitraErr } = await svc
      .from("mitra")
      .select(
        "id, nama_mitra, jenis, kontak, alamat, deskripsi, rating_average",
      )
      .eq("id", mitraId)
      .single();
    if (mitraErr || !mitra) {
      return NextResponse.json({ error: "Mitra not found" }, { status: 404 });
    }

    // Fetch reviews with project and reviewer info
    const { data: reviews } = await svc
      .from("mitra_reviews")
      .select(
        `id, rating, komentar, created_at, project_id, pegawai_id,
         projects!inner (id, nama_project, deadline, status, ketua_tim_id),
         users!inner (id, nama_lengkap)`,
      )
      .eq("mitra_id", mitraId)
      .order("created_at", { ascending: false });

    // Build aggregates
    const total = (reviews || []).length;
    const avgRating = total
      ? (reviews || []).reduce(
          (s: number, r: { rating: number }) => s + r.rating,
          0,
        ) / total
      : 0;

    // Projects covered and reviewers breakdown
    const projectMap = new Map<
      string,
      {
        id: string;
        nama_project: string;
        status: string;
        deadline: string;
        ratings: number[];
      }
    >();
    const reviewers: Array<{
      pegawai_id: string;
      nama_lengkap: string;
      rating: number;
      komentar?: string;
      created_at: string;
      project_id: string;
      project_name: string;
    }> = [];

    (reviews || []).forEach((r: any) => {
      const p = Array.isArray(r.projects) ? r.projects[0] : r.projects;
      const u = Array.isArray(r.users) ? r.users[0] : r.users;
      if (p) {
        const entry: {
          id: string;
          nama_project: string;
          status: string;
          deadline: string;
          ratings: number[];
        } = (projectMap.get(p.id) as any) || {
          id: p.id,
          nama_project: p.nama_project,
          status: p.status,
          deadline: p.deadline,
          ratings: [],
        };
        entry.ratings.push(r.rating);
        projectMap.set(p.id, entry);
      }
      if (u) {
        reviewers.push({
          pegawai_id: u.id,
          nama_lengkap: u.nama_lengkap,
          rating: r.rating,
          komentar: r.komentar || undefined,
          created_at: r.created_at,
          project_id: r.project_id,
          project_name: p?.nama_project ?? "",
        });
      }
    });

    const projects = Array.from(projectMap.values()).map((p) => ({
      id: p.id,
      nama_project: p.nama_project,
      status: p.status,
      deadline: p.deadline,
      average_rating: p.ratings.length
        ? p.ratings.reduce((s, v) => s + v, 0) / p.ratings.length
        : 0,
      ratings_count: p.ratings.length,
    }));

    return NextResponse.json({
      data: {
        mitra,
        summary: {
          total_reviews: total,
          average_rating: avgRating,
          projects_count: projects.length,
        },
        projects,
        reviewers,
      },
    });
  } catch (error) {
    console.error("KT Mitra Review Detail Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
