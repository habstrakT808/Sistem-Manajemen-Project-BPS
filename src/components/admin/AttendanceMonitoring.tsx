// File: src/components/admin/AttendanceMonitoring.tsx
// Admin attendance monitoring component

"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  Users,
  Clock,
  RefreshCw,
  Calendar,
  CheckCircle2,
  XCircle,
  Power,
  ArrowLeft,
  Eye,
} from "lucide-react";
import { format, parse } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";
import { Input } from "@/components/ui/input";

interface AttendanceLog {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  check_out_reason: string | null;
  duration: string | null;
}

interface MonitoringData {
  user_id: string;
  nama_lengkap: string;
  email: string;
  status: "check_in" | "check_out" | "off";
  logs: AttendanceLog[];
  activeLog: {
    id: string;
    check_in_at: string;
    check_in_time: string;
  } | null;
}

interface MonitoringResponse {
  success: boolean;
  data: MonitoringData[];
  date: string;
  isWorkingHours: boolean;
  message: string;
}

async function fetchMonitoringData(date: string): Promise<MonitoringResponse> {
  const response = await fetch(
    `/api/admin/attendance/monitoring?date=${date}`,
    {
      cache: "no-store",
    },
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Gagal mengambil data monitoring");
  }
  return result;
}

export default function AttendanceMonitoring() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    format(new Date(), "yyyy"),
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "MM"),
  );
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Generate years (current year ± 5 years)
  const currentYear = parseInt(format(new Date(), "yyyy"));
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Generate months
  const months = [
    { value: "01", label: "Januari" },
    { value: "02", label: "Februari" },
    { value: "03", label: "Maret" },
    { value: "04", label: "April" },
    { value: "05", label: "Mei" },
    { value: "06", label: "Juni" },
    { value: "07", label: "Juli" },
    { value: "08", label: "Agustus" },
    { value: "09", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  // Update selectedDate when year or month changes (only update day to 01, keep existing day if valid)
  useEffect(() => {
    if (selectedDate) {
      try {
        const currentDate = parse(selectedDate, "yyyy-MM-dd", new Date());
        const currentYear = format(currentDate, "yyyy");
        const currentMonth = format(currentDate, "MM");
        const currentDay = format(currentDate, "dd");

        // Only update if year or month actually changed via dropdown
        if (currentYear !== selectedYear || currentMonth !== selectedMonth) {
          // Try to keep the same day if it's valid for the new month, otherwise use 01
          const daysInMonth = new Date(
            parseInt(selectedYear),
            parseInt(selectedMonth),
            0,
          ).getDate();
          const dayToUse =
            parseInt(currentDay) <= daysInMonth ? currentDay : "01";
          const newDate = `${selectedYear}-${selectedMonth}-${dayToUse}`;
          setSelectedDate(newDate);
        }
      } catch (error) {
        // If parsing fails, just set to first day of selected month
        const newDate = `${selectedYear}-${selectedMonth}-01`;
        setSelectedDate(newDate);
      }
    }
  }, [selectedYear, selectedMonth]);

  // Update year and month when selectedDate changes (from date input)
  useEffect(() => {
    if (selectedDate) {
      try {
        const date = parse(selectedDate, "yyyy-MM-dd", new Date());
        const year = format(date, "yyyy");
        const month = format(date, "MM");
        // Only update if different to avoid unnecessary re-renders
        if (year !== selectedYear) {
          setSelectedYear(year);
        }
        if (month !== selectedMonth) {
          setSelectedMonth(month);
        }
      } catch (error) {
        // Invalid date, skip update
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const {
    data: monitoringData,
    isLoading,
    error,
  } = useQuery<MonitoringResponse, Error>({
    queryKey: ["admin", "attendance", "monitoring", selectedDate],
    queryFn: () => fetchMonitoringData(selectedDate),
    refetchInterval: autoRefresh ? 10000 : false, // Auto-refresh every 10 seconds
    staleTime: 5000,
  });

  // Auto-refresh when working hours
  useEffect(() => {
    if (monitoringData?.isWorkingHours) {
      setAutoRefresh(true);
    } else {
      setAutoRefresh(false);
    }
  }, [monitoringData?.isWorkingHours]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["admin", "attendance", "monitoring"],
    });
    toast.success("Data berhasil diperbarui");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "check_in":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300 font-semibold">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Check In
          </Badge>
        );
      case "check_out":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300 font-semibold">
            <XCircle className="w-3 h-3 mr-1" />
            Check Out
          </Badge>
        );
      case "off":
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300 font-semibold">
            <Power className="w-3 h-3 mr-1" />
            Off
          </Badge>
        );
      default:
        return null;
    }
  };

  const toggleUserExpansion = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-2 border-red-200">
            <CardContent className="p-12 text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-semibold text-lg">
                {error.message}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const data = monitoringData?.data || [];
  const checkInCount = data.filter((d) => d.status === "check_in").length;
  const checkOutCount = data.filter((d) => d.status === "check_out").length;
  const offCount = data.filter((d) => d.status === "off").length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin/teams">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Users className="w-8 h-8 mr-3 text-gray-700" />
                  Monitoring Tim
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Pantau status kehadiran pegawai secara real-time
                </p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    Check In
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {checkInCount}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">pegawai aktif</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    Check Out
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {checkOutCount}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">pegawai keluar</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    Off
                  </p>
                  <p className="text-3xl font-bold text-gray-900">{offCount}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    di luar jam kerja
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                  <Power className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    Total Pegawai
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {data.length}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    pegawai terdaftar
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Date Filters */}
        <Card className="border-2 border-gray-200 mb-8">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm leading-none font-medium text-gray-700 mb-4">
                <Calendar className="w-5 h-5" />
                Filter Tanggal
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Tahun
                </label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Bulan
                </label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Tanggal Terpilih
                </label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border-gray-200"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monitoring Table */}
        <Card className="border-2 border-gray-200 shadow-2xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm leading-none font-medium text-gray-700">
                <Users className="w-5 h-5" />
                Daftar Pegawai ({data.length})
              </label>
              {monitoringData?.isWorkingHours && (
                <Badge className="bg-green-500 text-white border-0">
                  <Clock className="w-3 h-3 mr-1" />
                  Jam Kerja Aktif
                </Badge>
              )}
            </div>
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-600" />
                <p className="text-gray-600">Memuat data...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">
                  Tidak ada data pegawai
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.map((employee) => (
                  <div
                    key={employee.user_id}
                    className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {employee.nama_lengkap}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {employee.email}
                            </p>
                          </div>
                          {getStatusBadge(employee.status)}
                        </div>
                        {employee.activeLog && (
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1 text-green-600" />
                              <span className="font-medium">Check In:</span>
                              <span className="ml-1">
                                {employee.activeLog.check_in_time}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => toggleUserExpansion(employee.user_id)}
                        variant="outline"
                        size="sm"
                        className="border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {expandedUser === employee.user_id
                          ? "Sembunyikan"
                          : "Detail"}
                      </Button>
                    </div>

                    {/* Expanded Details */}
                    {expandedUser === employee.user_id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        {employee.logs.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-4">
                            Belum ada riwayat kehadiran pada tanggal ini
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {employee.logs.map((log, index) => (
                              <div
                                key={log.id}
                                className="bg-white border border-gray-100 rounded-lg p-4"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <Badge
                                    variant="outline"
                                    className="bg-gray-50 text-gray-700 border-gray-200"
                                  >
                                    Sesi #{index + 1}
                                  </Badge>
                                  {log.duration && (
                                    <span className="text-xs text-gray-500">
                                      Durasi: {log.duration}
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600 font-medium">
                                      Check In:
                                    </span>
                                    <span className="ml-2 text-gray-900">
                                      {log.check_in_time || "-"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 font-medium">
                                      Check Out:
                                    </span>
                                    <span className="ml-2 text-gray-900">
                                      {log.check_out_time || "Belum checkout"}
                                    </span>
                                  </div>
                                </div>
                                {log.check_out_reason && (
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <span className="text-gray-600 font-medium text-sm">
                                      Alasan:
                                    </span>
                                    <p className="text-gray-700 text-sm mt-1">
                                      {log.check_out_reason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
