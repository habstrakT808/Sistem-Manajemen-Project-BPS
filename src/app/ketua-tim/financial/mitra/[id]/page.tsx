"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FolderOpen,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

async function fetchMitraDetail(id: string, month: string, year: string) {
  const res = await fetch(
    `/api/ketua-tim/financial/mitra/${id}?month=${month}&year=${year}`,
    { cache: "no-store" },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to fetch mitra detail");
  return json as {
    mitra: { id: string; nama_mitra: string };
    month: number;
    year: number;
    projects: Array<{ id: string; nama_project: string; status: string }>;
    tasks: Array<{
      id: string;
      title: string | null;
      description: string | null;
      project_id: string;
      start_date: string;
      end_date: string | null;
      honor_amount: number | null;
      total_amount: number | null;
      has_transport: boolean | null;
      transport_days: number | null;
    }>;
  };
}

export default function MitraFinancialDetailPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const id = params.id;
  const initialMonth = search.get("month") || String(new Date().getMonth() + 1);
  const initialYear = search.get("year") || String(new Date().getFullYear());

  const MONTH_NAMES = useMemo(
    () => [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ],
    [],
  );

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return [now, now - 1, now - 2, now - 3, now - 4];
  }, []);

  const [month, setMonth] = useState<string>(initialMonth);
  const [year, setYear] = useState<string>(initialYear);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ketua", "financial", "mitra", { id, month, year }],
    queryFn: () => fetchMitraDetail(id, month, year),
    staleTime: 5 * 60 * 1000,
  });

  // Sinkronkan URL dengan pilihan bulan/tahun
  useEffect(() => {
    const url = `/ketua-tim/financial/mitra/${id}?month=${month}&year=${year}`;
    router.replace(url);
  }, [id, month, year, router]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Link href={`/ketua-tim/financial?month=${month}&year=${year}`}>
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Detail Mitra
            </h1>
            {/* Filter bulan/tahun dipindah ke sisi kanan header card */}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <div className="h-24 bg-white rounded-2xl border animate-pulse" />
          <div className="h-64 bg-white rounded-2xl border animate-pulse" />
        </div>
      )}

      {error && (
        <div className="p-4 border rounded-xl bg-red-50 text-red-700">
          Gagal memuat data.
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* Header Card */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Mitra</div>
                <div className="text-2xl font-bold text-gray-900">
                  {data.mitra.nama_mitra}
                </div>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <CalendarDays className="w-5 h-5" />
                <div className="flex items-center gap-2">
                  <Select value={month} onValueChange={(v) => setMonth(v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Bulan" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((m, idx) => (
                        <SelectItem key={idx + 1} value={String(idx + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={year} onValueChange={(v) => setYear(v)}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue placeholder="Tahun" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Tasks List */}
            <div className="lg:col-span-2 bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b bg-gray-50">
                <div className="font-semibold text-gray-900 flex items-center">
                  <ClipboardList className="w-5 h-5 mr-2 text-blue-600" />
                  Tugas pada Bulan Ini
                </div>
              </div>
              <div className="p-5 space-y-6">
                {data.tasks.length === 0 && (
                  <div className="text-sm text-gray-500">
                    Belum ada tugas untuk bulan/tahun ini pada proyek yang Anda
                    pimpin.
                  </div>
                )}
                {data.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 border rounded-xl hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="pr-4">
                        <div className="font-semibold text-gray-900">
                          {t.title || "Tugas Tanpa Judul"}
                        </div>
                        {t.description && (
                          <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {t.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          Mulai:{" "}
                          {new Date(t.start_date).toLocaleDateString("id-ID")}{" "}
                          {t.end_date
                            ? `• Selesai: ${new Date(t.end_date).toLocaleDateString("id-ID")}`
                            : ""}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {t.has_transport && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              Transport {t.transport_days || 0} hari
                            </Badge>
                          )}
                          {(t.total_amount || t.honor_amount) && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              {formatCurrency(
                                t.total_amount || t.honor_amount || 0,
                              )}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Projects List */}
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b bg-gray-50">
                <div className="font-semibold text-gray-900 flex items-center">
                  <FolderOpen className="w-5 h-5 mr-2 text-purple-600" />
                  Proyek Terkait
                </div>
              </div>
              <div className="p-5 space-y-6">
                {data.projects.length === 0 && (
                  <div className="text-sm text-gray-500">
                    Belum ada proyek terkait untuk periode ini.
                  </div>
                )}
                {data.projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/ketua-tim/projects/${p.id}`}
                    prefetch
                    className="block"
                  >
                    <div className="p-4 border rounded-xl hover:bg-purple-50/50 hover:border-purple-200 transition-all cursor-pointer">
                      <div className="font-semibold text-gray-900">
                        {p.nama_project}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Status: {p.status}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
