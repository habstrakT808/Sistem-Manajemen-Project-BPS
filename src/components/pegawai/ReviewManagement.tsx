// File: src/components/pegawai/ReviewManagement.tsx

"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  StarOff,
  MessageSquare,
  // Calendar,
  RefreshCw,
  Filter,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  Award,
  // Users,
  Building,
  User,
  Send,
  History,
  TrendingUp,
  BarChart3,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

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
  collaboration_duration: number; // in days
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

type ViewMode = "pending" | "completed" | "stats";
type FilterType = "all" | "perusahaan" | "individu";

async function fetchReviews(): Promise<ReviewsData> {
  const response = await fetch("/api/pegawai/reviews", { cache: "no-store" });
  if (!response.ok) {
    const errorResult = await response.json();
    throw new Error(errorResult.error || "Failed to fetch reviews data");
  }
  const result = await response.json();
  return result as ReviewsData;
}

export function ReviewManagement() {
  const [currentView, setCurrentView] = useState<ViewMode>("pending");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedReview, setSelectedReview] = useState<
    PendingReview | CompletedReview | null
  >(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Review form state
  const [reviewForm, setReviewForm] = useState({ rating: 0, komentar: "" });

  const {
    data: reviewsData,
    isLoading,
    error,
    refetch,
  } = useQuery<ReviewsData, Error>({
    queryKey: ["pegawai", "reviews"],
    queryFn: fetchReviews,
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = useCallback(async () => {
    const res = await refetch();
    if (res.error) toast.error(res.error.message);
    else toast.success("Reviews data refreshed successfully");
  }, [refetch]);

  const handleSubmitReview = useCallback(async () => {
    if (
      !selectedReview ||
      !("mitra" in selectedReview) ||
      reviewForm.rating === 0
    ) {
      toast.error("Please provide a rating");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/pegawai/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedReview.project.id,
          mitra_id: selectedReview.mitra.id,
          rating: reviewForm.rating,
          komentar: reviewForm.komentar.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || "Failed to submit review");
      }

      toast.success("Review submitted successfully!");
      setReviewDialog(false);
      setSelectedReview(null);
      setReviewForm({ rating: 0, komentar: "" });
      await refetch();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit review",
      );
    } finally {
      setSubmitting(false);
    }
  }, [selectedReview, reviewForm, refetch]);

  const handleSkipReview = useCallback(
    async (review: PendingReview) => {
      if (
        !confirm(
          "Are you sure you want to skip this review? This action cannot be undone.",
        )
      ) {
        return;
      }

      setSubmitting(true);
      try {
        const response = await fetch("/api/pegawai/reviews", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: review.project.id,
            mitra_id: review.mitra.id,
            action: "skip",
          }),
        });

        if (!response.ok) {
          const errorResult = await response.json();
          throw new Error(errorResult.error || "Failed to skip review");
        }

        toast.success("Review skipped successfully!");
        await refetch();
      } catch (error) {
        console.error("Error skipping review:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to skip review",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [refetch],
  );

  const handleEditReview = useCallback(async () => {
    if (
      !selectedReview ||
      !("id" in selectedReview) ||
      reviewForm.rating === 0
    ) {
      toast.error("Please provide a rating");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/pegawai/reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_id: (selectedReview as CompletedReview).id,
          rating: reviewForm.rating,
          komentar: reviewForm.komentar.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || "Failed to update review");
      }

      toast.success("Review updated successfully!");
      setEditDialog(false);
      setSelectedReview(null);
      setReviewForm({ rating: 0, komentar: "" });
      await refetch();
    } catch (error) {
      console.error("Error updating review:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update review",
      );
    } finally {
      setSubmitting(false);
    }
  }, [selectedReview, reviewForm, refetch]);

  const openReviewDialog = useCallback((review: PendingReview) => {
    setSelectedReview(review);
    setReviewForm({ rating: 0, komentar: "" });
    setReviewDialog(true);
  }, []);

  const openEditDialog = useCallback((review: CompletedReview) => {
    setSelectedReview(review);
    setReviewForm({ rating: review.rating, komentar: review.komentar || "" });
    setEditDialog(true);
  }, []);

  // Filtered data based on current view and filter
  const filteredData = useMemo(() => {
    if (!reviewsData) return { pending: [], completed: [] };

    const filterByType = (items: (PendingReview | CompletedReview)[]) => {
      if (filterType === "all") return items;
      return items.filter((item) => item.mitra.jenis === filterType);
    };

    return {
      pending: filterByType(reviewsData.pending_reviews) as PendingReview[],
      completed: filterByType(
        reviewsData.completed_reviews,
      ) as CompletedReview[],
    };
  }, [reviewsData, filterType]);

  // Render star rating component (unchanged)
  const StarRating = ({
    rating,
    onRatingChange,
    readonly = false,
    size = "md",
  }: {
    rating: number;
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;
    size?: "sm" | "md" | "lg";
  }) => {
    const starSize =
      size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-6 h-6";
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onRatingChange?.(star)}
            className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform duration-200`}
          >
            {star <= rating ? (
              <Star className={`${starSize} text-yellow-500 fill-yellow-500`} />
            ) : (
              <StarOff className={`${starSize} text-gray-300`} />
            )}
          </button>
        ))}
        <span className="ml-2 text-sm font-medium text-gray-700">
          ({rating}/5)
        </span>
      </div>
    );
  };

  if (isLoading && !reviewsData) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-6 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="flex space-x-4">
            <div className="h-12 bg-gray-200 rounded-xl w-32"></div>
            <div className="h-12 bg-gray-200 rounded-xl w-32"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-0 shadow-xl rounded-xl p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-0 shadow-xl rounded-xl p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !reviewsData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Failed to Load Reviews Data
            </h2>
            <p className="text-gray-600 max-w-md">{error.message}</p>
            <Button
              onClick={handleRefresh}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!reviewsData) return null;

  const { review_stats } = reviewsData;

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              Mitra Reviews
            </h1>
            <div className="flex items-center space-x-4 mt-3">
              <Badge className="bg-gradient-to-r from-green-500 to-teal-600 text-white border-0">
                <MessageSquare className="w-3 h-3 mr-1" />
                {review_stats.total_reviews} Reviews
              </Badge>
              <Badge className="bg-white text-green-600 border border-green-200">
                <Clock className="w-3 h-3 mr-1" />
                {review_stats.pending_count} Pending
              </Badge>
              <Badge className="bg-white text-teal-600 border border-teal-200">
                <Award className="w-3 h-3 mr-1" />
                {review_stats.average_rating_given.toFixed(1)} Avg Rating
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Selector */}
            <Select
              value={currentView}
              onValueChange={(value: ViewMode) => setCurrentView(value)}
            >
              <SelectTrigger className="w-40">
                <Eye className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="stats">Statistics</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter */}
            <Select
              value={filterType}
              onValueChange={(value: FilterType) => setFilterType(value)}
            >
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="perusahaan">Companies</SelectItem>
                <SelectItem value="individu">Individuals</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
              className="border-2 border-gray-200 hover:bg-gray-50"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer rounded-xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Total Reviews
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {review_stats.total_reviews}
                </p>
                <p className="text-sm text-gray-500">All time reviews</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer rounded-xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Pending Reviews
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {review_stats.pending_count}
                </p>
                <p className="text-sm text-gray-500">Need your review</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Clock className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer rounded-xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Average Rating
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {review_stats.average_rating_given.toFixed(1)}
                </p>
                <p className="text-sm text-gray-500">Your avg rating</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Star className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer rounded-xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  This Month
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {review_stats.this_month_reviews}
                </p>
                <p className="text-sm text-gray-500">Reviews submitted</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on current view */}
      {currentView === "pending" && (
        <div className="bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-white">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <AlertCircle className="w-6 h-6 mr-3 text-orange-600" />
              Pending Reviews ({filteredData.pending.length})
            </h2>
            <p className="text-gray-700 text-sm mt-2">
              Reviews needed for completed projects
            </p>
          </div>
          <div className="p-6 bg-white">
            {filteredData.pending.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No pending reviews!</p>
                <p className="text-gray-400 text-sm mt-2">
                  All your reviews are up to date
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredData.pending.map((review, index) => (
                  <div
                    key={index}
                    className="group p-6 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors text-lg">
                            {review.mitra.nama_mitra}
                          </div>
                          <Badge
                            className={`${
                              review.mitra.jenis === "perusahaan"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {review.mitra.jenis === "perusahaan" ? (
                              <Building className="w-3 h-3 mr-1" />
                            ) : (
                              <User className="w-3 h-3 mr-1" />
                            )}
                            {review.mitra.jenis}
                          </Badge>
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Project:</strong>{" "}
                          {review.project.nama_project}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Team Lead:</strong>{" "}
                          {review.project.ketua_tim_name}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center space-x-4">
                          {"collaboration_duration" in review && (
                            <span>
                              Duration:{" "}
                              {(review as PendingReview).collaboration_duration}{" "}
                              days
                            </span>
                          )}
                          <span>•</span>
                          <span>
                            Honor: {formatCurrency(review.honor_amount)}
                          </span>
                          <span>•</span>
                          <span>
                            Completed:{" "}
                            {new Date(
                              review.project.deadline,
                            ).toLocaleDateString("id-ID")}
                          </span>
                        </div>

                        {review.mitra.deskripsi && (
                          <div className="text-sm text-gray-500 mt-2 italic">
                            &quot;{review.mitra.deskripsi}&quot;
                          </div>
                        )}
                      </div>

                      <div className="ml-6 flex space-x-3">
                        <Button
                          onClick={() => openReviewDialog(review)}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Submit Review
                        </Button>
                        <Button
                          onClick={() => handleSkipReview(review)}
                          variant="outline"
                          className="border-gray-300 text-gray-600 hover:bg-gray-50"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Skip
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {currentView === "completed" && (
        <div className="bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-white">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
              Completed Reviews ({filteredData.completed.length})
            </h2>
            <p className="text-gray-700 text-sm mt-2">Your review history</p>
          </div>
          <div className="p-6 bg-white">
            {filteredData.completed.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  No completed reviews yet
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Your review history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredData.completed.map((review, index) => (
                  <div
                    key={index}
                    className="group p-6 rounded-2xl border border-gray-200 bg-white hover:border-green-300 hover:bg-green-50 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors text-lg">
                            {review.mitra.nama_mitra}
                          </div>
                          <Badge
                            className={`${
                              review.mitra.jenis === "perusahaan"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {review.mitra.jenis === "perusahaan" ? (
                              <Building className="w-3 h-3 mr-1" />
                            ) : (
                              <User className="w-3 h-3 mr-1" />
                            )}
                            {review.mitra.jenis}
                          </Badge>
                        </div>

                        <div className="mb-3">
                          <StarRating rating={review.rating} readonly />
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Project:</strong>{" "}
                          {review.project.nama_project}
                        </div>

                        {review.komentar && (
                          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg mb-3">
                            <strong>Your Review:</strong> &quot;
                            {review.komentar}&quot;
                          </div>
                        )}

                        <div className="text-sm text-gray-500">
                          Reviewed on:{" "}
                          {new Date(review.created_at).toLocaleDateString(
                            "id-ID",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </div>
                      </div>

                      <div className="ml-6">
                        {review.can_edit && (
                          <Button
                            onClick={() => openEditDialog(review)}
                            variant="outline"
                            className="border-2 border-green-200 text-green-600 hover:bg-green-50"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {currentView === "stats" && (
        <div className="bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-white">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-3 text-purple-600" />
              Review Statistics
            </h2>
            <p className="text-gray-700 text-sm mt-2">
              Your review analytics and insights
            </p>
          </div>
          <div className="p-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Rating Distribution */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Rating Distribution
                </h3>
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = filteredData.completed.filter(
                    (r) => r.rating === rating,
                  ).length;
                  const percentage =
                    filteredData.completed.length > 0
                      ? (count / filteredData.completed.length) * 100
                      : 0;

                  return (
                    <div key={rating} className="flex items-center space-x-3">
                      <div className="flex items-center w-16">
                        <span className="text-sm font-medium">{rating}</span>
                        <Star className="w-4 h-4 text-yellow-500 ml-1" />
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="w-12 text-sm text-gray-600 text-right">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mitra Type Distribution */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Mitra Type Distribution
                </h3>
                <div className="space-y-4">
                  {["perusahaan", "individu"].map((type) => {
                    const count = filteredData.completed.filter(
                      (r) => r.mitra.jenis === type,
                    ).length;
                    const percentage =
                      filteredData.completed.length > 0
                        ? (count / filteredData.completed.length) * 100
                        : 0;

                    return (
                      <div key={type} className="flex items-center space-x-3">
                        <div className="flex items-center w-24">
                          {type === "perusahaan" ? (
                            <Building className="w-4 h-4 text-blue-500 mr-2" />
                          ) : (
                            <User className="w-4 h-4 text-green-500 mr-2" />
                          )}
                          <span className="text-sm font-medium capitalize">
                            {type}
                          </span>
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${
                              type === "perusahaan"
                                ? "bg-gradient-to-r from-blue-400 to-blue-500"
                                : "bg-gradient-to-r from-green-400 to-green-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="w-12 text-sm text-gray-600 text-right">
                          {count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Submission Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="w-[92vw] max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              Submit Review
            </DialogTitle>
            <DialogDescription>
              Share your experience working with this mitra
            </DialogDescription>
          </DialogHeader>

          {selectedReview && "mitra" in selectedReview && (
            <div className="space-y-4">
              {/* Mitra Info */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="font-semibold text-gray-900 text-base">
                    {selectedReview.mitra.nama_mitra}
                  </div>
                  <Badge
                    className={`${
                      selectedReview.mitra.jenis === "perusahaan"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {selectedReview.mitra.jenis === "perusahaan" ? (
                      <Building className="w-3 h-3 mr-1" />
                    ) : (
                      <User className="w-3 h-3 mr-1" />
                    )}
                    {selectedReview.mitra.jenis}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  <strong>Project:</strong>{" "}
                  {selectedReview.project.nama_project}
                </div>
                {"collaboration_duration" in selectedReview && (
                  <div className="text-sm text-gray-600">
                    <strong>Collaboration Duration:</strong>{" "}
                    {(selectedReview as PendingReview).collaboration_duration}{" "}
                    days
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">
                  Rating *
                </label>
                <StarRating
                  rating={reviewForm.rating}
                  onRatingChange={(rating) =>
                    setReviewForm((prev) => ({ ...prev, rating }))
                  }
                  size="md"
                />
              </div>

              {/* Comment */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">
                  Comments (Optional)
                </label>
                <Textarea
                  placeholder="Share your experience, feedback, or suggestions..."
                  value={reviewForm.komentar}
                  onChange={(e) =>
                    setReviewForm((prev) => ({
                      ...prev,
                      komentar: e.target.value,
                    }))
                  }
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setReviewDialog(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={submitting || reviewForm.rating === 0}
                  className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Review
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Review Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              Edit Review
            </DialogTitle>
            <DialogDescription>Update your review and rating</DialogDescription>
          </DialogHeader>

          {selectedReview && "id" in selectedReview && (
            <div className="space-y-6">
              {/* Mitra Info */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="font-semibold text-gray-900 text-lg">
                    {selectedReview.mitra.nama_mitra}
                  </div>
                  <Badge
                    className={`${
                      selectedReview.mitra.jenis === "perusahaan"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {selectedReview.mitra.jenis === "perusahaan" ? (
                      <Building className="w-3 h-3 mr-1" />
                    ) : (
                      <User className="w-3 h-3 mr-1" />
                    )}
                    {selectedReview.mitra.jenis}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  <strong>Project:</strong>{" "}
                  {selectedReview.project.nama_project}
                </div>
                <div className="text-sm text-gray-500">
                  Originally reviewed:{" "}
                  {new Date(selectedReview.created_at).toLocaleDateString(
                    "id-ID",
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">
                  Rating *
                </label>
                <StarRating
                  rating={reviewForm.rating}
                  onRatingChange={(rating) =>
                    setReviewForm((prev) => ({ ...prev, rating }))
                  }
                  size="lg"
                />
              </div>

              {/* Comment */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">
                  Comments (Optional)
                </label>
                <Textarea
                  placeholder="Share your experience, feedback, or suggestions..."
                  value={reviewForm.komentar}
                  onChange={(e) =>
                    setReviewForm((prev) => ({
                      ...prev,
                      komentar: e.target.value,
                    }))
                  }
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditDialog(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditReview}
                  disabled={submitting || reviewForm.rating === 0}
                  className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Update Review
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
