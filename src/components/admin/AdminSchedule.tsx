"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { id as localeId } from "date-fns/locale";
import { format } from "date-fns";
import {
  Plus,
  Trash2,
  RefreshCw,
  CalendarDays,
  Clock,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface AdminScheduleItem {
  id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
}

export default function AdminSchedule() {
  const [selectedRange, setSelectedRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [schedules, setSchedules] = useState<AdminScheduleItem[]>([]);
  const [month, setMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/schedule");
      const j = await r.json();
      setSchedules(j.schedules || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!selectedRange.from || !selectedRange.to || !title.trim()) {
      toast.error("Isi judul dan rentang tanggal terlebih dahulu");
      return;
    }
    try {
      const r = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          start_date: format(selectedRange.from, "yyyy-MM-dd"),
          end_date: format(selectedRange.to, "yyyy-MM-dd"),
        }),
      });
      if (!r.ok) {
        const j = await r.json();
        throw new Error(j.error || "Gagal menyimpan jadwal");
      }
      toast.success("Jadwal global berhasil dibuat");
      setTitle("");
      setDescription("");
      setSelectedRange({});
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  };

  const remove = async (id: string) => {
    try {
      const r = await fetch(
        `/api/admin/schedule?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!r.ok) throw new Error("Gagal menghapus");
      toast.success("Terhapus");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    }
  };

  const getDayCount = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return diff + 1;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl opacity-10"></div>
        <div className="relative p-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <CalendarDays className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-900 to-teal-800 bg-clip-text text-transparent">
                  Jadwal Global Admin
                </h1>
              </div>
              <p className="text-gray-600 text-lg ml-15">
                Atur tanggal terblokir untuk alokasi transport pegawai
              </p>
            </div>
            <Button
              onClick={load}
              disabled={loading}
              variant="outline"
              className="border-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:border-emerald-300 shadow-sm"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Memuat..." : "Muat Ulang"}
            </Button>
          </div>
        </div>
      </div>

      {/* Create Schedule Section */}
      <Card className="border-0 shadow-2xl overflow-hidden bg-gradient-to-br from-white to-emerald-50/30">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 rounded-t-2xl -mt-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-xl">
                Buat Jadwal Baru
              </CardTitle>
              <p className="text-emerald-100 text-sm mt-1">
                Pilih rentang tanggal dan deskripsi jadwal
              </p>
            </div>
          </div>
        </div>
        <CardContent className="p-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Calendar Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <CalendarDays className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">
                  Pilih Rentang Tanggal
                </h3>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-emerald-100">
                <Calendar
                  mode="range"
                  selected={selectedRange as any}
                  onSelect={(r: any) => setSelectedRange(r || {})}
                  month={month}
                  onMonthChange={setMonth}
                  locale={localeId as any}
                  className="rounded-xl !w-full"
                  style={{
                    ...({
                      "--cell-size": "52px",
                    } as React.CSSProperties),
                  }}
                />
              </div>
              {selectedRange.from && selectedRange.to && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-900">
                      {getDayCount(
                        format(selectedRange.from, "yyyy-MM-dd"),
                        format(selectedRange.to, "yyyy-MM-dd"),
                      )}{" "}
                      hari terpilih
                    </span>
                  </div>
                  <div className="text-sm text-emerald-700 mt-2">
                    {format(selectedRange.from, "dd MMMM yyyy", {
                      locale: localeId,
                    })}{" "}
                    -{" "}
                    {format(selectedRange.to, "dd MMMM yyyy", {
                      locale: localeId,
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Form Section */}
            <div className="space-y-5">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
                  <span>Judul Jadwal</span>
                </label>
                <Input
                  placeholder="Contoh: Diklat Internal, Rapat Koordinasi, dll."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-2 border-emerald-100 focus:border-emerald-400 rounded-xl h-12 text-base shadow-sm"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-teal-600 rounded-full"></span>
                  <span>Keterangan (opsional)</span>
                </label>
                <Textarea
                  placeholder="Tambahkan detail atau informasi tambahan tentang jadwal ini..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="border-2 border-emerald-100 focus:border-emerald-400 rounded-xl text-base shadow-sm resize-none"
                />
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <span className="font-semibold">Perhatian:</span> Pegawai
                    tidak dapat mengalokasikan transport pada tanggal yang masuk
                    dalam jadwal global ini.
                  </div>
                </div>
              </div>

              <Button
                onClick={create}
                disabled={
                  !selectedRange.from || !selectedRange.to || !title.trim()
                }
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold h-12 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Plus className="w-5 h-5 mr-2" />
                Buat Jadwal Global
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedules List */}
      <Card className="border-0 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-10 rounded-t-2xl min-h-[140px] -mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-xl">
                  Daftar Jadwal Aktif
                </CardTitle>
                <p className="text-gray-300 text-sm mt-1">
                  {schedules.length} jadwal terdaftar
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-white/10 text-white border-white/30 px-4 py-2"
            >
              Total: {schedules.length}
            </Badge>
          </div>
        </div>
        <CardContent className="p-6">
          {schedules.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium">
                Belum ada jadwal global
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Buat jadwal pertama Anda untuk memblokir tanggal transport
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {schedules.map((s, index) => (
                <div
                  key={s.id}
                  className="group relative bg-gradient-to-br from-white to-emerald-50/50 border-2 border-emerald-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-emerald-300 hover:-translate-y-1"
                >
                  <div className="absolute top-4 right-4">
                    <Badge
                      variant="outline"
                      className="bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold"
                    >
                      #{index + 1}
                    </Badge>
                  </div>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                          <CalendarDays className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {s.title}
                        </h3>
                      </div>

                      <div className="space-y-2 ml-13">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-medium text-gray-700">
                              {format(new Date(s.start_date), "dd MMM yyyy", {
                                locale: localeId,
                              })}
                            </span>
                          </div>
                          <span className="text-gray-400">→</span>
                          <span className="text-sm font-medium text-gray-700">
                            {format(new Date(s.end_date), "dd MMM yyyy", {
                              locale: localeId,
                            })}
                          </span>
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                          >
                            {getDayCount(s.start_date, s.end_date)} hari
                          </Badge>
                        </div>

                        {s.description && (
                          <p className="text-sm text-gray-600 bg-white/50 rounded-lg p-3 border border-emerald-100">
                            {s.description}
                          </p>
                        )}

                        <div className="flex items-center space-x-2 text-xs text-gray-500 pt-2">
                          <Clock className="w-3 h-3" />
                          <span>
                            Dibuat:{" "}
                            {format(
                              new Date(s.created_at),
                              "dd MMM yyyy, HH:mm",
                              { locale: localeId },
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(s.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
