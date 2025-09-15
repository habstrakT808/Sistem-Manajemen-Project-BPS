// File: src/app/api/pegawai/reviews/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

interface MitraInfo {
  id: string;
  nama_mitra: string;
  jenis: "perusahaan" | "individu";
  kontak?: string;
  alamat?: string;
  deskripsi?: string;
  rating_average: number;
}

interface ProjectInfo {
  id: string;
  nama_project: string;
  tanggal_mulai: string;
  deadline: string;
  status: "upcoming" | "active" | "completed";
  ketua_tim_name: string;
}

interface PendingReview {
  project: ProjectInfo;
  mitra: MitraInfo;
  honor_amount: number;
  collaboration_duration: number;
}

interface CompletedReview {
  id: string;
  project: ProjectInfo;
  mitra: MitraInfo;
  rating: number;
  komentar?: string;
  created_at: string;
  can_edit: boolean;
}

interface ReviewsData {
  pending_reviews: PendingReview[];
  completed_reviews: CompletedReview[];
  review_stats: {
    total_reviews: number;
    average_rating_given: number;
    pending_count: number;
    this_month_reviews: number;
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation
    const { data: userProfile, error: profileError } = await serviceClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== "pegawai") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get completed projects where pegawai worked with mitra
    const { data: completedProjectAssignments } = await serviceClient
      .from("project_assignments")
      .select(
        `
        project_id,
        projects!inner (
          id,
          nama_project,
          tanggal_mulai,
          deadline,
          status,
          users!inner (nama_lengkap)
        )
      `
      )
      .eq("assignee_type", "pegawai")
      .eq("assignee_id", user.id)
      .eq("projects.status", "completed");

    const completedProjectIds = (completedProjectAssignments || []).map(
      (assignment: { project_id: string }) => assignment.project_id
    );

    if (completedProjectIds.length === 0) {
      return NextResponse.json({
        pending_reviews: [],
        completed_reviews: [],
        review_stats: {
          total_reviews: 0,
          average_rating_given: 0,
          pending_count: 0,
          this_month_reviews: 0,
        },
      });
    }

    // Get mitra assignments for completed projects
    const { data: mitraAssignments } = await serviceClient
      .from("project_assignments")
      .select("project_id, assignee_id, honor")
      .eq("assignee_type", "mitra")
      .in("project_id", completedProjectIds);

    // Get existing reviews by this pegawai
    const { data: existingReviews } = await serviceClient
      .from("mitra_reviews")
      .select(
        `
        id,
        project_id,
        mitra_id,
        rating,
        komentar,
        created_at
      `
      )
      .eq("pegawai_id", user.id);

    // Get all mitra info
    const mitraIds = Array.from(
      new Set(
        (mitraAssignments || []).map(
          (ma: { assignee_id: string }) => ma.assignee_id
        )
      )
    );
    const { data: mitraData } = await serviceClient
      .from("mitra")
      .select(
        "id, nama_mitra, jenis, kontak, alamat, deskripsi, rating_average"
      )
      .in(
        "id",
        mitraIds.length ? mitraIds : ["00000000-0000-0000-0000-000000000000"]
      );

    // Create maps for efficient lookup
    type InnerProject = {
      id: string;
      nama_project: string;
      tanggal_mulai: string;
      deadline: string;
      status: "upcoming" | "active" | "completed" | string;
      users: { nama_lengkap: string } | { nama_lengkap: string }[];
    };
    type CompletedProjectAssignment = {
      project_id: string;
      projects: InnerProject | InnerProject[];
    };

    const projectMap = new Map();
    (completedProjectAssignments || []).forEach(
      (assignment: CompletedProjectAssignment) => {
        const projects = Array.isArray(assignment.projects)
          ? assignment.projects[0]
          : assignment.projects;
        const usersSingle: { nama_lengkap: string } | undefined = projects
          ? Array.isArray(projects.users)
            ? (projects.users[0] as { nama_lengkap: string })
            : (projects.users as { nama_lengkap: string })
          : undefined;

        projectMap.set(assignment.project_id, {
          id: projects?.id ?? "",
          nama_project: projects?.nama_project ?? "",
          tanggal_mulai: projects?.tanggal_mulai ?? "",
          deadline: projects?.deadline ?? "",
          status: (projects?.status ?? "completed") as
            | "upcoming"
            | "active"
            | "completed",
          ketua_tim_name: usersSingle?.nama_lengkap ?? "",
        });
      }
    );

    const mitraMap = new Map();
    (mitraData || []).forEach((mitra: MitraInfo) => {
      mitraMap.set(mitra.id, mitra);
    });

    const mitraAssignmentMap = new Map();
    (mitraAssignments || []).forEach(
      (assignment: {
        project_id: string;
        assignee_id: string;
        honor: number;
      }) => {
        const key = `${assignment.project_id}-${assignment.assignee_id}`;
        mitraAssignmentMap.set(key, assignment);
      }
    );

    const existingReviewsSet = new Set();
    (existingReviews || []).forEach(
      (review: { project_id: string; mitra_id: string }) => {
        existingReviewsSet.add(`${review.project_id}-${review.mitra_id}`);
      }
    );

    // Calculate pending reviews
    const pendingReviews: PendingReview[] = [];
    (mitraAssignments || []).forEach(
      (assignment: {
        project_id: string;
        assignee_id: string;
        honor: number;
      }) => {
        const key = `${assignment.project_id}-${assignment.assignee_id}`;
        if (!existingReviewsSet.has(key)) {
          const project = projectMap.get(assignment.project_id);
          const mitra = mitraMap.get(assignment.assignee_id);

          if (project && mitra) {
            const startDate = new Date(project.tanggal_mulai);
            const endDate = new Date(project.deadline);
            const collaborationDuration = Math.ceil(
              (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            pendingReviews.push({
              project,
              mitra,
              honor_amount: assignment.honor || 0,
              collaboration_duration: collaborationDuration,
            });
          }
        }
      }
    );

    // Calculate completed reviews
    const completedReviews: CompletedReview[] = (existingReviews || [])
      .map(
        (review: {
          id: string;
          project_id: string;
          mitra_id: string;
          rating: number;
          komentar?: string;
          created_at: string;
        }) => {
          const project = projectMap.get(review.project_id);
          const mitra = mitraMap.get(review.mitra_id);

          // Allow editing if review was created within last 30 days
          const reviewDate = new Date(review.created_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const canEdit = reviewDate > thirtyDaysAgo;

          return {
            id: review.id,
            project: project || {
              id: "",
              nama_project: "Unknown Project",
              tanggal_mulai: "",
              deadline: "",
              status: "completed" as const,
              ketua_tim_name: "",
            },
            mitra: mitra || {
              id: "",
              nama_mitra: "Unknown Mitra",
              jenis: "individu" as const,
              rating_average: 0,
            },
            rating: review.rating,
            komentar: review.komentar,
            created_at: review.created_at,
            can_edit: canEdit,
          };
        }
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    // Calculate stats
    const totalReviews = completedReviews.length;
    const averageRatingGiven =
      totalReviews > 0
        ? completedReviews.reduce((sum, review) => sum + review.rating, 0) /
          totalReviews
        : 0;
    const pendingCount = pendingReviews.length;

    const thisMonth = new Date();
    const thisMonthReviews = completedReviews.filter((review) => {
      const reviewDate = new Date(review.created_at);
      return (
        reviewDate.getMonth() === thisMonth.getMonth() &&
        reviewDate.getFullYear() === thisMonth.getFullYear()
      );
    }).length;

    const reviewsData: ReviewsData = {
      pending_reviews: pendingReviews,
      completed_reviews: completedReviews,
      review_stats: {
        total_reviews: totalReviews,
        average_rating_given: averageRatingGiven,
        pending_count: pendingCount,
        this_month_reviews: thisMonthReviews,
      },
    };

    return NextResponse.json(reviewsData);
  } catch (error) {
    console.error("Reviews GET API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { project_id, mitra_id, rating, komentar } = body;

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation
    const { data: userProfile, error: profileError } = await serviceClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== "pegawai") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate input
    if (!project_id || !mitra_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    // Verify project is completed and pegawai was assigned
    const { data: projectCheck } = await serviceClient
      .from("projects")
      .select("id, status")
      .eq("id", project_id)
      .eq("status", "completed")
      .single();

    if (!projectCheck) {
      return NextResponse.json(
        { error: "Project not found or not completed" },
        { status: 400 }
      );
    }

    // Verify pegawai was assigned to this project
    const { data: pegawaiAssignment } = await serviceClient
      .from("project_assignments")
      .select("id")
      .eq("project_id", project_id)
      .eq("assignee_type", "pegawai")
      .eq("assignee_id", user.id)
      .single();

    if (!pegawaiAssignment) {
      return NextResponse.json(
        { error: "You were not assigned to this project" },
        { status: 400 }
      );
    }

    // Verify mitra was assigned to this project
    const { data: mitraAssignment } = await serviceClient
      .from("project_assignments")
      .select("id")
      .eq("project_id", project_id)
      .eq("assignee_type", "mitra")
      .eq("assignee_id", mitra_id)
      .single();

    if (!mitraAssignment) {
      return NextResponse.json(
        { error: "Mitra was not assigned to this project" },
        { status: 400 }
      );
    }

    // Check if review already exists
    const { data: existingReview } = await serviceClient
      .from("mitra_reviews")
      .select("id")
      .eq("project_id", project_id)
      .eq("mitra_id", mitra_id)
      .eq("pegawai_id", user.id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: "Review already exists for this mitra in this project" },
        { status: 400 }
      );
    }

    // Insert review
    const { data: newReview, error: insertError } = await serviceClient
      .from("mitra_reviews")
      .insert({
        project_id,
        mitra_id,
        pegawai_id: user.id,
        rating,
        komentar: komentar || null,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Create notification for admin about new review
    await serviceClient.rpc("create_notification", {
      user_id: "00000000-0000-0000-0000-000000000000", // Admin user ID
      title: "New Mitra Review",
      message: `A new review has been submitted for mitra with rating ${rating}/5`,
      notification_type: "info",
    });

    return NextResponse.json({
      message: "Review submitted successfully",
      data: newReview,
    });
  } catch (error) {
    console.error("Reviews POST API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { review_id, rating, komentar } = body;

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation
    const { data: userProfile, error: profileError } = await serviceClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== "pegawai") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate input
    if (!review_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    // Verify review exists and belongs to this pegawai
    const { data: existingReview } = await serviceClient
      .from("mitra_reviews")
      .select("id, created_at")
      .eq("id", review_id)
      .eq("pegawai_id", user.id)
      .single();

    if (!existingReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Check if review can be edited (within 30 days)
    const reviewDate = new Date(existingReview.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (reviewDate <= thirtyDaysAgo) {
      return NextResponse.json(
        { error: "Review can only be edited within 30 days of submission" },
        { status: 400 }
      );
    }

    // Update review
    const { error: updateError } = await serviceClient
      .from("mitra_reviews")
      .update({
        rating,
        komentar: komentar || null,
      })
      .eq("id", review_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      message: "Review updated successfully",
    });
  } catch (error) {
    console.error("Reviews PUT API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
