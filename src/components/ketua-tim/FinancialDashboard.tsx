// File: src/components/ketua-tim/FinancialDashboard.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  DollarSign,
  TrendingUp,
  Users,
  FolderOpen,
  Download,
  FileText,
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface FinancialStats {
  total_monthly_spending: number;
  transport_spending: number;
  honor_spending: number;
  active_projects_budget: number;
  budget_utilization: number;
  projects_with_budget: number;
}

interface ProjectBudget {
  id: string;
  nama_project: string;
  total_budget: number;
  transport_budget: number;
  honor_budget: number;
  status: "upcoming" | "active" | "completed";
  deadline: string;
  budget_percentage: number;
}

interface SpendingTrend {
  month: string;
  transport: number;
  honor: number;
  total: number;
}

interface FinancialData {
  stats: FinancialStats;
  project_budgets: ProjectBudget[];
  spending_trends: SpendingTrend[];
  top_spenders: {
    pegawai: Array<{ name: string; amount: number; projects: number }>;
    mitra: Array<{
      name: string;
      amount: number;
      projects: number;
      remaining_limit: number;
    }>;
  };
}

async function fetchFinancialData(
  selectedPeriod: string,
  month?: number,
  year?: number,
): Promise<FinancialData> {
  const response = await fetch(
    `/api/ketua-tim/financial?period=${selectedPeriod}${month ? `&month=${month}` : ""}${year ? `&year=${year}` : ""}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const errorResult = await response.json();
    throw new Error(errorResult.error || "Failed to fetch financial data");
  }
  const result = await response.json();
  return result as FinancialData;
}

async function fetchDaily(month: number, year: number) {
  const res = await fetch(
    `/api/ketua-tim/financial/daily?month=${month}&year=${year}`,
    { cache: "no-store" },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to fetch daily data");
  return json as {
    month: number;
    year: number;
    days: Array<{
      date: string;
      total: number;
      transport: number;
      honor: number;
    }>;
  };
}

async function fetchDailyDetails(ymd: string) {
  const res = await fetch(`/api/ketua-tim/financial/daily?day=${ymd}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to fetch details");
  return json as {
    date: string;
    details: Array<{
      recipient_type: string;
      recipient_id: string;
      recipient_name: string;
      amount: number;
      project_id: string;
      project_name: string | null;
      task_title: string;
    }>;
  };
}

const MONTH_NAMES = [
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
];

// Generate list of years for dropdown (5 years back from current)
function generateYearOptions(): number[] {
  const years: number[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  for (let i = 0; i < 5; i++) {
    years.push(currentYear - i);
  }

  return years;
}

export default function FinancialDashboard() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");
  const [activeTab, setActiveTab] = useState<
    "overview" | "spending" | "transport"
  >("overview");
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const yearOptions = generateYearOptions();

  // selectedDate tetap digunakan untuk calendar tab
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Use selectedMonth and selectedYear for financial queries
  const month = selectedMonth;
  const year = selectedYear;

  const {
    data: financialData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<FinancialData, Error>({
    queryKey: ["ketua", "financial", { selectedPeriod, month, year }],
    queryFn: () => fetchFinancialData(selectedPeriod, month, year),
    staleTime: 5 * 60 * 1000,
  });

  const ymd = format(selectedDate, "yyyy-MM-dd");

  // Use selectedDate month/year for spending calendar (not filter month/year)
  const spendingCalendarMonth = selectedDate.getMonth() + 1;
  const spendingCalendarYear = selectedDate.getFullYear();

  const { data: daily, isLoading: loadingDaily } = useQuery({
    queryKey: [
      "ketua",
      "financial",
      "daily",
      { month: spendingCalendarMonth, year: spendingCalendarYear },
    ],
    queryFn: () => fetchDaily(spendingCalendarMonth, spendingCalendarYear),
    enabled:
      activeTab === "spending" &&
      !!spendingCalendarMonth &&
      !!spendingCalendarYear,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: dailyDetails,
    refetch: refetchDailyDetails,
    isFetching: fetchingDay,
  } = useQuery({
    queryKey: ["ketua", "financial", "day", { ymd }],
    queryFn: () => fetchDailyDetails(ymd),
    enabled: activeTab === "spending",
    staleTime: 5 * 60 * 1000,
  });

  // Transport allocations calendar
  async function fetchTransportDaily(m: number, y: number) {
    const res = await fetch(
      `/api/ketua-tim/financial/transport/daily?month=${m}&year=${y}`,
      { cache: "no-store" },
    );
    const json = await res.json();
    if (!res.ok)
      throw new Error(json.error || "Failed to fetch transport daily");
    return json as {
      month: number;
      year: number;
      days: Array<{ date: string; count: number }>;
    };
  }

  async function fetchTransportDayDetails(dateYmd: string) {
    const res = await fetch(
      `/api/ketua-tim/financial/transport/daily?day=${dateYmd}`,
      { cache: "no-store" },
    );
    const json = await res.json();
    if (!res.ok)
      throw new Error(json.error || "Failed to fetch transport details");
    return json as {
      date: string;
      details: Array<{
        allocation_id: string;
        allocation_date: string;
        employee_name: string;
        project_name: string;
        task_title: string;
        task_description: string;
        amount: number;
        volume: number;
        activity_note: string;
      }>;
    };
  }

  // Use selectedDate month/year for transport calendar (not filter month/year)
  const calendarMonth = selectedDate.getMonth() + 1;
  const calendarYear = selectedDate.getFullYear();

  const { data: transportDaily, isLoading: loadingTransportDaily } = useQuery({
    queryKey: [
      "ketua",
      "financial",
      "transport",
      { month: calendarMonth, year: calendarYear },
    ],
    queryFn: () => fetchTransportDaily(calendarMonth, calendarYear),
    enabled: activeTab === "transport" && !!calendarMonth && !!calendarYear,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: transportDetails,
    refetch: refetchTransportDetails,
    isFetching: fetchingTransportDay,
  } = useQuery({
    queryKey: ["ketua", "financial", "transport", "day", { ymd }],
    queryFn: () => fetchTransportDayDetails(ymd),
    enabled: activeTab === "transport",
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    router.prefetch("/ketua-tim/financial");
    router.prefetch("/ketua-tim/projects");
  }, [router]);

  const handleRefresh = async () => {
    const res = await refetch();
    if (res.error) toast.error(res.error.message);
    else toast.success("Data keuangan berhasil diperbarui");
  };

  if (isLoading && !financialData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse border-0 shadow-xl rounded-xl"
            >
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!financialData) return null;

  const { stats, project_budgets, top_spenders } = financialData;
  const selectedMonthName = MONTH_NAMES[selectedMonth - 1];

  const statsCards = [
    {
      title: "Pengeluaran Bulanan",
      value: formatCurrency(stats.total_monthly_spending),
      description: `Total ${selectedMonthName} ${selectedYear}`,
      icon: DollarSign,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "Anggaran Transport",
      value: formatCurrency(stats.transport_spending),
      description: `Uang transport ${selectedMonthName} ${selectedYear}`,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      trend: "+8%",
      trendUp: true,
    },
    {
      title: "Honor Mitra",
      value: formatCurrency(stats.honor_spending),
      description: `Pembayaran untuk mitra ${selectedMonthName} ${selectedYear}`,
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      trend: "+15%",
      trendUp: true,
    },
    // Removed: Budget Utilization card
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Dasbor Keuangan
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Pantau anggaran proyek, tren pengeluaran, dan performa keuangan.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 text-sm font-medium ${activeTab === "overview" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Ikhtisar
            </button>
            <button
              onClick={() => setActiveTab("spending")}
              className={`px-4 py-2 text-sm font-medium ${activeTab === "spending" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Detail Pengeluaran
            </button>
            <button
              onClick={() => setActiveTab("transport")}
              className={`px-4 py-2 text-sm font-medium ${activeTab === "transport" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Alokasi Transport
            </button>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isFetching}
            variant="outline"
            className="border-2 border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Muat Ulang
          </Button>

          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            <Download className="w-4 h-4 mr-2" />
            Ekspor Laporan
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon as any;
          return (
            <div
              key={index}
              className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group overflow-hidden rounded-xl"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} opacity-50`}
              ></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-600 mb-2">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mb-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-500">{stat.description}</p>
                  </div>
                  <div
                    className={`w-16 h-16 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                  >
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {stat.trendUp ? (
                      <ArrowUp className="w-4 h-4 text-green-600 mr-1" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-600 mr-1" />
                    )}
                    <span
                      className={`text-sm font-semibold ${stat.trendUp ? "text-green-600" : "text-red-600"}`}
                    >
                      {stat.trend}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      vs last month
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <>
          {/* Project Budgets & Top Spenders */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Project Budgets */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-white text-xl font-semibold">
                    <FolderOpen className="w-6 h-6 mr-3" />
                    Anggaran Proyek
                  </div>
                  <Badge className="bg-white/20 text-white">
                    {project_budgets.length}
                  </Badge>
                </div>
                <div className="text-purple-100 mt-2 text-sm">
                  Proyek dengan tugas yang dimulai di {selectedMonthName}{" "}
                  {selectedYear}
                </div>
              </div>
              <div className="p-6 space-y-4">
                {project_budgets.map((project, index) => (
                  <Link
                    key={index}
                    href={`/ketua-tim/projects/${project.id}`}
                    prefetch
                    onMouseEnter={() =>
                      router.prefetch(`/ketua-tim/projects/${project.id}`)
                    }
                  >
                    <div className="group flex items-center p-4 rounded-2xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-gray-100 hover:border-purple-200 hover:shadow-lg">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                          {project.nama_project}
                        </div>
                        <div className="text-sm text-gray-500 group-hover:text-purple-500 mt-1">
                          Transport: {formatCurrency(project.transport_budget)}{" "}
                          • Honor: {formatCurrency(project.honor_budget)}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          Tenggat:{" "}
                          {new Date(project.deadline).toLocaleDateString(
                            "id-ID",
                          )}
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(project.total_budget)}
                        </div>
                        <Badge
                          className={`${project.status === "active" ? "bg-green-100 text-green-800" : project.status === "upcoming" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {project.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Monthly Spending */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-white text-xl font-semibold">
                    <BarChart3 className="w-6 h-6 mr-3" />
                    Pengeluaran Per Bulan
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={selectedMonth.toString()}
                      onValueChange={(v) => setSelectedMonth(parseInt(v))}
                    >
                      <SelectTrigger className="w-[160px] bg-white/10 text-white border-white/30">
                        <SelectValue placeholder="Bulan" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_NAMES.map((monthName, index) => (
                          <SelectItem
                            key={index + 1}
                            value={(index + 1).toString()}
                          >
                            {monthName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(v) => setSelectedYear(parseInt(v))}
                    >
                      <SelectTrigger className="w-[140px] bg-white/10 text-white border-white/30">
                        <SelectValue placeholder="Tahun" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-orange-100 mt-2 text-sm">
                  Total pengeluaran per penerima pada bulan terpilih
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Top Pegawai */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Anggota Tim
                  </h4>
                  <div className="space-y-2">
                    {top_spenders.pegawai.map((pegawai, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {pegawai.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {pegawai.projects} proyek
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-600">
                            {formatCurrency(pegawai.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Mitra */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Mitra</h4>
                  <div className="space-y-2">
                    {top_spenders.mitra.map((mitra, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border ${mitra.remaining_limit < 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-100"}`}
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {mitra.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {mitra.projects} proyek
                          </div>
                          {mitra.remaining_limit < 0 && (
                            <div className="text-xs text-red-600 flex items-center mt-1">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Melebihi batas sebesar{" "}
                              {formatCurrency(Math.abs(mitra.remaining_limit))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-semibold ${mitra.remaining_limit < 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            {formatCurrency(mitra.amount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {mitra.remaining_limit >= 0
                              ? `${formatCurrency(mitra.remaining_limit)} tersisa`
                              : "Melebihi batas"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden rounded-xl">
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-6">
                Laporan & Aksi Keuangan
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <Button
                  asChild
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-auto p-4 justify-start"
                >
                  <Link
                    href="/ketua-tim/reports"
                    prefetch
                    onMouseEnter={() => router.prefetch("/ketua-tim/reports")}
                  >
                    <div className="flex items-center">
                      <FileText className="w-6 h-6 mr-3" />
                      <div className="text-left">
                        <div className="font-semibold">Buat Laporan</div>
                        <div className="text-sm opacity-80">
                          Laporan keuangan bulanan
                        </div>
                      </div>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-auto p-4 justify-start"
                >
                  <Link
                    href="/ketua-tim/projects/new"
                    prefetch
                    onMouseEnter={() =>
                      router.prefetch("/ketua-tim/projects/new")
                    }
                  >
                    <div className="flex items-center">
                      <FolderOpen className="w-6 h-6 mr-3" />
                      <div className="text-left">
                        <div className="font-semibold">Proyek Baru</div>
                        <div className="text-sm opacity-80">
                          Buat dengan anggaran
                        </div>
                      </div>
                    </div>
                  </Link>
                </Button>

                <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-auto p-4 justify-start">
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">Tinjau Anggaran</div>
                      <div className="text-sm opacity-80">Tinjau alokasi</div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "spending" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  Kalender Pengeluaran
                </h2>
                <div className="text-white text-sm">
                  {format(selectedDate, "MMMM yyyy", { locale: localeId })}
                </div>
              </div>
            </div>
            <div className="p-5">
              <Calendar
                mode="single"
                month={selectedDate}
                onMonthChange={(d) => d && setSelectedDate(d)}
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                className="!w-full"
                modifiers={{
                  lowWorkload: (date) => {
                    if (!daily?.days || loadingDaily) return false;
                    const y = format(date, "yyyy-MM-dd");
                    const rec = daily.days.find((d) => d.date === y);
                    return !!rec && rec.total > 0 && rec.total < 1_000_000;
                  },
                  mediumWorkload: (date) => {
                    if (!daily?.days || loadingDaily) return false;
                    const y = format(date, "yyyy-MM-dd");
                    const rec = daily.days.find((d) => d.date === y);
                    return (
                      !!rec && rec.total >= 1_000_000 && rec.total <= 3_000_000
                    );
                  },
                  highWorkload: (date) => {
                    if (!daily?.days || loadingDaily) return false;
                    const y = format(date, "yyyy-MM-dd");
                    const rec = daily.days.find((d) => d.date === y);
                    return !!rec && rec.total > 3_000_000;
                  },
                  hasEvents: (date) => {
                    if (!daily?.days || loadingDaily) return false;
                    const y = format(date, "yyyy-MM-dd");
                    const rec = daily.days.find((d) => d.date === y);
                    return !!(rec && rec.total > 0);
                  },
                }}
              />
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="text-gray-500">Legenda:</span>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  &lt; 1 juta
                </Badge>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  1 - 3 juta
                </Badge>
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  &gt; 3 juta
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4">
              <h3 className="font-bold text-white">Detail Pengeluaran</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-600">
                {format(selectedDate, "EEEE, dd MMMM yyyy", {
                  locale: localeId,
                })}
              </div>
              <Button
                variant="outline"
                className="border-2 border-gray-200 hover:bg-gray-50"
                onClick={() => refetchDailyDetails()}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${fetchingDay ? "animate-spin" : ""}`}
                />{" "}
                Muat Ulang Hari
              </Button>
              <div className="divide-y">
                {(dailyDetails?.details || []).map((d, i) => (
                  <div
                    key={i}
                    className="py-3 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {d.recipient_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {d.recipient_type.toUpperCase()} •{" "}
                        {d.project_name || d.project_id}
                      </div>
                      {d.task_title && (
                        <div className="text-xs text-gray-400 mt-1">
                          {d.task_title}
                        </div>
                      )}
                    </div>
                    <div className="font-semibold text-gray-900 ml-4">
                      {formatCurrency(d.amount)}
                    </div>
                  </div>
                ))}
                {(!dailyDetails ||
                  !dailyDetails.details ||
                  dailyDetails.details.length === 0) && (
                  <div className="text-sm text-gray-500 py-6">
                    Tidak ada pengeluaran untuk tanggal ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "transport" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  Kalender Alokasi Transport
                </h2>
                <div className="text-white text-sm">
                  {format(selectedDate, "MMMM yyyy", { locale: localeId })}
                </div>
              </div>
            </div>
            <div className="p-5">
              <Calendar
                mode="single"
                month={selectedDate}
                onMonthChange={(d) => d && setSelectedDate(d)}
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                className="!w-full"
                modifiers={{
                  hasEvents: (date) => {
                    if (!transportDaily?.days || loadingTransportDaily)
                      return false;
                    const dateStr = format(date, "yyyy-MM-dd");
                    const dayData = transportDaily.days.find(
                      (d) => d.date === dateStr,
                    );
                    return !!(dayData && dayData.count > 0);
                  },
                }}
              />
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="text-gray-500">Legenda:</span>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  Ada alokasi
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
              <h3 className="font-bold text-white">Detail Alokasi</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-600">
                {format(selectedDate, "EEEE, dd MMMM yyyy", {
                  locale: localeId,
                })}
              </div>
              <Button
                variant="outline"
                className="border-2 border-gray-200 hover:bg-gray-50"
                onClick={() => refetchTransportDetails()}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${fetchingTransportDay ? "animate-spin" : ""}`}
                />{" "}
                Muat Ulang Hari
              </Button>
              <div className="divide-y">
                {(transportDetails?.details || []).map((d, i) => (
                  <div key={i} className="py-3 space-y-1">
                    <div className="font-medium text-gray-900">
                      {d.employee_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {d.project_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {d.task_title || d.task_description}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="text-xs">
                        <span className="font-semibold text-gray-700">
                          Nilai:
                        </span>{" "}
                        <span className="text-green-600 font-medium">
                          {formatCurrency(d.amount || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs mt-1">
                      <span className="font-semibold text-gray-700">
                        Kegiatan:
                      </span>{" "}
                      <span className="text-gray-600">
                        {d.activity_note || "-"}
                      </span>
                    </div>
                  </div>
                ))}
                {(!transportDetails ||
                  !transportDetails.details ||
                  transportDetails.details.length === 0) && (
                  <div className="text-sm text-gray-500 py-6">
                    Tidak ada alokasi transport pada tanggal ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
