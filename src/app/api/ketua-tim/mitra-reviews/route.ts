import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface MitraListItem {
  id: string;
  nama_mitra: string;
  jenis: "perusahaan" | "individu";
  rating_average: number;
  total_reviews: number;
  last_review_at: string | null;
  projects_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const jenis = searchParams.get("jenis"); // perusahaan | individu | all

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation: must be ketua_tim
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profileError || !userProfile || userProfile.role !== "ketua_tim") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch mitra base info
    const { data: mitraBase, error: mitraErr } = await supabase
      .from("mitra")
      .select("id, nama_mitra, jenis, rating_average");
    if (mitraErr) throw mitraErr;

    const mitraIds = (mitraBase || []).map((m) => m.id);

    // Aggregations: total reviews and last review date
    const { data: reviewsAgg } = await supabase
      .from("mitra_reviews")
      .select("mitra_id, created_at")
      .in(
        "mitra_id",
        mitraIds.length ? mitraIds : ["00000000-0000-0000-0000-000000000000"]
      );

    // Projects count where mitra assigned
    const { data: assignments } = await supabase
      .from("project_assignments")
      .select("assignee_id, project_id")
      .eq("assignee_type", "mitra")
      .in(
        "assignee_id",
        mitraIds.length ? mitraIds : ["00000000-0000-0000-0000-000000000000"]
      );

    const reviewsByMitra = new Map<
      string,
      { total: number; last: string | null }
    >();
    (reviewsAgg || []).forEach(
      (r: { mitra_id: string; created_at: string }) => {
        const prev = reviewsByMitra.get(r.mitra_id) || { total: 0, last: null };
        const last =
          prev.last && new Date(prev.last) > new Date(r.created_at)
            ? prev.last
            : r.created_at;
        reviewsByMitra.set(r.mitra_id, { total: prev.total + 1, last });
      }
    );

    const projectsCountByMitra = new Map<string, number>();
    (assignments || []).forEach((a: { assignee_id: string }) => {
      projectsCountByMitra.set(
        a.assignee_id,
        (projectsCountByMitra.get(a.assignee_id) || 0) + 1
      );
    });

    let items: MitraListItem[] = (mitraBase || []).map((m) => ({
      id: m.id,
      nama_mitra: m.nama_mitra,
      jenis: m.jenis as "perusahaan" | "individu",
      rating_average: m.rating_average ?? 0,
      total_reviews: reviewsByMitra.get(m.id)?.total || 0,
      last_review_at: reviewsByMitra.get(m.id)?.last || null,
      projects_count: projectsCountByMitra.get(m.id) || 0,
    }));

    if (jenis && jenis !== "all") {
      items = items.filter((i) => i.jenis === jenis);
    }
    if (search) {
      items = items.filter((i) => i.nama_mitra.toLowerCase().includes(search));
    }

    // Default sort: by total_reviews desc then rating desc
    items.sort((a, b) => {
      if (b.total_reviews !== a.total_reviews)
        return b.total_reviews - a.total_reviews;
      return b.rating_average - a.rating_average;
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("KT Mitra Reviews List Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
