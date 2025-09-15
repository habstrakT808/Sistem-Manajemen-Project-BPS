"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Star,
  StarOff,
  Search,
  Filter,
  RefreshCw,
  Building,
  User,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

type MitraListItem = {
  id: string;
  nama_mitra: string;
  jenis: "perusahaan" | "individu";
  rating_average: number;
  total_reviews: number;
  last_review_at: string | null;
  projects_count: number;
};

type MitraDetail = {
  mitra: {
    id: string;
    nama_mitra: string;
    jenis: "perusahaan" | "individu";
    kontak?: string;
    alamat?: string;
    deskripsi?: string;
    rating_average: number;
  };
  summary: {
    total_reviews: number;
    average_rating: number;
    projects_count: number;
  };
  projects: Array<{
    id: string;
    nama_project: string;
    status: string;
    deadline: string;
    average_rating: number;
    ratings_count: number;
  }>;
  reviewers: Array<{
    pegawai_id: string;
    nama_lengkap: string;
    rating: number;
    komentar?: string;
    created_at: string;
    project_id: string;
    project_name: string;
  }>;
};

export default function MitraReviews() {
  const [items, setItems] = useState<MitraListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [jenis, setJenis] = useState<string>("all");
  const [selected, setSelected] = useState<MitraListItem | null>(null);
  const [detail, setDetail] = useState<MitraDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (jenis) params.set("jenis", jenis);
      const res = await fetch(
        `/api/ketua-tim/mitra-reviews?${params.toString()}`
      );
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Failed to load mitra reviews");
      setItems(result.data || []);
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "Failed to load mitra reviews"
      );
    } finally {
      setLoading(false);
    }
  }, [search, jenis]);

  const openDetail = useCallback(async (item: MitraListItem) => {
    setSelected(item);
    setDetail(null);
    setDetailOpen(true);
    try {
      const res = await fetch(`/api/ketua-tim/mitra-reviews/${item.id}`);
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Failed to load mitra detail");
      setDetail(result.data);
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "Failed to load mitra detail"
      );
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const StarRating = ({ rating }: { rating: number }) => {
    const r = Math.round(rating);
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((i) =>
          i <= r ? (
            <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          ) : (
            <StarOff key={i} className="w-4 h-4 text-gray-300" />
          )
        )}
        <span className="text-xs text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const filtered = useMemo(() => items, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Mitra Reviews</h2>
          <p className="text-gray-600">
            Evaluasi kualitas mitra berdasarkan rating dan ulasan
          </p>
        </div>
        <Button
          onClick={fetchList}
          variant="outline"
          className="border-2 border-gray-200"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Cari mitra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchList();
            }}
            className="pl-10"
          />
        </div>
        <Select value={jenis} onValueChange={setJenis}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Jenis Mitra" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="perusahaan">Perusahaan</SelectItem>
            <SelectItem value="individu">Individu</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={fetchList}
          className="border-2 border-gray-200"
        >
          <Filter className="w-4 h-4 mr-2" /> Terapkan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border-0 shadow-xl rounded-xl p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Tidak ada mitra
            </h3>
            <p className="text-gray-500">Coba ubah kata kunci atau filter.</p>
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className="border-0 shadow-xl rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {m.nama_mitra}
                      </h3>
                      <Badge
                        className={
                          m.jenis === "perusahaan"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }
                      >
                        {m.jenis === "perusahaan" ? (
                          <Building className="w-3 h-3 mr-1" />
                        ) : (
                          <User className="w-3 h-3 mr-1" />
                        )}
                        {m.jenis}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <StarRating rating={m.rating_average} />
                      </span>
                      <span>•</span>
                      <span>{m.total_reviews} reviews</span>
                      <span>•</span>
                      <span>{m.projects_count} projects</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => openDetail(m)}
                    variant="outline"
                    className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    Lihat Detail
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader>
            <div className="p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold">
                      {(selected?.nama_mitra || "M").charAt(0).toUpperCase()}
                    </div>
                    <DialogTitle className="text-2xl font-bold text-white">
                      {selected?.nama_mitra || "Mitra Detail"}
                    </DialogTitle>
                    {selected && (
                      <Badge
                        className={
                          selected.jenis === "perusahaan"
                            ? "bg-white/20 text-white"
                            : "bg-white/20 text-white"
                        }
                      >
                        {selected.jenis}
                      </Badge>
                    )}
                  </div>
                  <p className="text-white/80 mt-2 text-sm">
                    Ringkasan reputasi, performa proyek, dan ulasan dari para
                    pegawai
                  </p>
                </div>
              </div>
              {detail && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/10 rounded-xl p-4 text-white">
                    <div className="text-sm opacity-80 mb-1">
                      Average Rating
                    </div>
                    <div className="flex items-center justify-between">
                      <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                      <div className="text-2xl font-bold">
                        {detail.summary.average_rating.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-xs opacity-80 mt-1">
                      {detail.summary.total_reviews} reviews
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 text-white">
                    <div className="text-sm opacity-80 mb-1">Projects</div>
                    <div className="text-2xl font-bold">
                      {detail.summary.projects_count}
                    </div>
                    <div className="text-xs opacity-80 mt-1">
                      Total dikerjakan
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 text-white">
                    <div className="text-sm opacity-80 mb-1">Profil</div>
                    <div className="text-xs space-y-0.5">
                      {detail.mitra.kontak && (
                        <div>Kontak: {detail.mitra.kontak}</div>
                      )}
                      {detail.mitra.alamat && (
                        <div>Alamat: {detail.mitra.alamat}</div>
                      )}
                      {detail.mitra.deskripsi && (
                        <div className="italic opacity-90">
                          &quot;{detail.mitra.deskripsi}&quot;
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>

          {!detail ? (
            <div className="p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-24 bg-gray-200 rounded" />
                <div className="h-24 bg-gray-200 rounded" />
                <div className="h-24 bg-gray-200 rounded" />
              </div>
            </div>
          ) : (
            <div className="p-6">
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="border-0 shadow-xl rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Ringkasan</h3>
                      <div className="space-y-3 text-sm text-gray-700">
                        <div className="flex items-center justify-between">
                          <span>Average Rating</span>
                          <StarRating rating={detail.summary.average_rating} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Total Reviews</span>
                          <span className="font-semibold">
                            {detail.summary.total_reviews}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Projects Dikerjakan</span>
                          <span className="font-semibold">
                            {detail.summary.projects_count}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="border-0 shadow-xl rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Profil</h3>
                      <div className="text-sm text-gray-700 space-y-1">
                        {detail.mitra.jenis && (
                          <div>Jenis: {detail.mitra.jenis}</div>
                        )}
                        {detail.mitra.kontak && (
                          <div>Kontak: {detail.mitra.kontak}</div>
                        )}
                        {detail.mitra.alamat && (
                          <div>Alamat: {detail.mitra.alamat}</div>
                        )}
                        {detail.mitra.deskripsi && (
                          <div className="italic text-gray-600">
                            &quot;{detail.mitra.deskripsi}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="reviews" className="space-y-6">
                  <div className="border-0 shadow-xl rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Semua Komentar
                    </h3>
                    {detail.reviewers.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        Belum ada komentar
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
                        {detail.reviewers.map((r, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-xl bg-gray-50 border border-gray-100"
                          >
                            <div className="text-sm text-gray-600 mb-1">
                              Project: {r.project_name || r.project_id}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-gray-900">
                                {r.nama_lengkap}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(r.created_at).toLocaleDateString(
                                  "id-ID"
                                )}
                              </div>
                            </div>
                            <div className="mt-1">
                              <StarRating rating={r.rating} />
                            </div>
                            {r.komentar && (
                              <div className="text-sm text-gray-700 mt-2">
                                &quot;{r.komentar}&quot;
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="projects" className="space-y-6">
                  <div className="border-0 shadow-xl rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Project Ratings
                    </h3>
                    {detail.projects.length === 0 ? (
                      <p className="text-sm text-gray-500">Belum ada project</p>
                    ) : (
                      <div className="space-y-3">
                        {detail.projects.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium text-gray-900">
                                {p.nama_project}
                              </div>
                              <div className="text-xs text-gray-500">
                                Due{" "}
                                {new Date(p.deadline).toLocaleDateString(
                                  "id-ID"
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <StarRating rating={p.average_rating} />
                              <div className="text-xs text-gray-500">
                                {p.ratings_count} ratings
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
