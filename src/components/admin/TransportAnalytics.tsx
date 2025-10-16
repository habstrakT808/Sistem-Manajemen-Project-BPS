// File: src/components/admin/TransportAnalytics.tsx
// NEW: Transport analytics dashboard for admin with global data

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import SatuanManagement from "./SatuanManagement";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Users,
  FolderOpen,
  TrendingUp,
  Download,
  RefreshCw,
  Settings,
  Calendar as CalendarIcon,
  BarChart3,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FinancialData {
  period: string;
  transportSpending: number;
  honorSpending: number;
  totalSpending: number;
  monthlyBudget: number;
  topSpenders: Array<{
    name: string;
    amount: number;
    projects: Set<string>;
  }>;
  filters: {
    pegawaiId?: string;
    mitraId?: string;
    projectId?: string;
    teamId?: string;
    type: string;
  };
}

interface DailyData {
  date: string;
  details: Array<{
    recipient_type: "pegawai" | "mitra";
    recipient_id: string;
    recipient_name: string;
    amount: number;
    project_id: string;
    project_name: string | null;
  }>;
}

interface TransportDailyData {
  month: number;
  year: number;
  days: Array<{ date: string; count: number }>;
}

async function fetchFinancialData(
  period: string,
  filters: {
    pegawaiId?: string;
    mitraId?: string;
    projectId?: string;
    teamId?: string;
    type?: string;
  },
): Promise<FinancialData> {
  const params = new URLSearchParams({
    period,
    ...filters,
  });

  const response = await fetch(`/api/admin/financial?${params}`, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Gagal mengambil data keuangan");
  }
  return result;
}

async function fetchDailyDetails(
  day: string,
  filters: {
    pegawaiId?: string;
    mitraId?: string;
    projectId?: string;
    teamId?: string;
    type?: string;
  },
): Promise<DailyData> {
  const params = new URLSearchParams({
    day,
    pegawai_id: filters.pegawaiId || "",
    mitra_id: filters.mitraId || "",
    project_id: filters.projectId || "",
    team_id: filters.teamId || "",
    type: filters.type || "all",
  });

  const response = await fetch(`/api/admin/financial/daily?${params}`, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Gagal mengambil detail harian");
  }
  return result;
}

async function fetchTransportDaily(
  month: number,
  year: number,
  filters: {
    pegawaiId?: string;
    projectId?: string;
    teamId?: string;
  },
  day?: string,
): Promise<TransportDailyData> {
  const params = new URLSearchParams({
    month: month.toString(),
    year: year.toString(),
    pegawai_id: filters.pegawaiId || "",
    project_id: filters.projectId || "",
    team_id: filters.teamId || "",
  });

  // Add day parameter if provided
  if (day) {
    params.set("day", day);
  }

  const response = await fetch(
    `/api/admin/financial/transport/daily?${params}`,
    {
      cache: "no-store",
    },
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Gagal mengambil data transport");
  }
  return result;
}

export default function TransportAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");
  const [activeTab, setActiveTab] = useState<
    "overview" | "spending" | "transport"
  >("overview");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showSatuanManagement, setShowSatuanManagement] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    pegawaiId: "",
    mitraId: "",
    projectId: "",
    teamId: "",
    type: "all",
  });

  // Filter data and search states
  const [filterData, setFilterData] = useState({
    pegawai: [] as Array<{ id: string; name: string }>,
    mitra: [] as Array<{ id: string; name: string }>,
    projects: [] as Array<{ id: string; name: string }>,
    teams: [] as Array<{ id: string; name: string }>,
  });

  const [searchTerms, setSearchTerms] = useState({
    pegawai: "",
    mitra: "",
    project: "",
    team: "",
  });

  // Refs for search inputs to prevent focus conflicts
  const pegawaiSearchRef = useRef<HTMLInputElement>(null);
  const mitraSearchRef = useRef<HTMLInputElement>(null);
  const projectSearchRef = useRef<HTMLInputElement>(null);
  const teamSearchRef = useRef<HTMLInputElement>(null);

  const {
    data: financialData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<FinancialData, Error>({
    queryKey: ["admin", "financial", { selectedPeriod, filters }],
    queryFn: () => fetchFinancialData(selectedPeriod, filters),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch filter data
  const { data: filterDataResponse } = useQuery({
    queryKey: ["admin", "filter-data"],
    queryFn: async () => {
      const response = await fetch("/api/admin/filter-data", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Gagal mengambil data filter");
      }
      return result;
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const month = selectedDate.getMonth() + 1;
  const year = selectedDate.getFullYear();
  const ymd = format(selectedDate, "yyyy-MM-dd");

  // Update filter data when response changes
  useEffect(() => {
    if (filterDataResponse) {
      setFilterData(filterDataResponse);
    }
  }, [filterDataResponse]);

  const { data: daily } = useQuery({
    queryKey: ["admin", "financial", "daily", { ymd, filters }],
    queryFn: () => {
      return fetchDailyDetails(ymd, filters);
    },
    enabled: activeTab === "spending",
    staleTime: 5 * 60 * 1000,
  });

  const { data: transportDaily } = useQuery({
    queryKey: ["admin", "financial", "transport", { ymd, filters }],
    queryFn: () => {
      return fetchTransportDaily(month, year, filters, ymd);
    },
    enabled: activeTab === "transport",
    staleTime: 0, // Always refetch when ymd changes
  });

  // Monthly data for calendar dots (spending tab)
  const { data: monthlyData } = useQuery({
    queryKey: ["admin", "financial", "monthly", { month, year, filters }],
    queryFn: () => fetchDailyDetails("", filters), // Empty day to get monthly data
    enabled: activeTab === "spending",
    staleTime: 5 * 60 * 1000,
  });

  // Monthly data for transport calendar dots
  const { data: monthlyTransportData } = useQuery({
    queryKey: [
      "admin",
      "financial",
      "transport",
      "monthly",
      { month, year, filters },
    ],
    queryFn: () => fetchTransportDaily(month, year, filters), // No day parameter for monthly data
    enabled: activeTab === "transport",
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    const res = await refetch();
    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success("Data berhasil diperbarui");
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/admin/analytics/transport/export?period=${selectedPeriod}`,
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transport_analytics_${selectedPeriod}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Ekspor berhasil diunduh");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Gagal mengekspor data");
    }
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse border-0 shadow-xl rounded-xl p-6"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!financialData) return null;

  const statsCards = [
    {
      title: "Anggaran Transport",
      value: formatCurrency(financialData.transportSpending),
      description: "Total transport pegawai",
      icon: DollarSign,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
    },
    {
      title: "Honor Mitra",
      value: formatCurrency(financialData.honorSpending),
      description: "Total honor mitra",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
    },
    {
      title: "Total Pengeluaran",
      value: formatCurrency(financialData.totalSpending),
      description: "Transport + Honor",
      icon: TrendingUp,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
    },
    {
      title: "Anggaran Bulanan",
      value: formatCurrency(financialData.monthlyBudget),
      description: "Total anggaran semua proyek",
      icon: FolderOpen,
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Analitik Transport Global
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Pantau semua pengeluaran transport dan honor dari seluruh sistem.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Bulan ini</SelectItem>
              <SelectItem value="last_month">Bulan lalu</SelectItem>
              <SelectItem value="current_year">Tahun ini</SelectItem>
            </SelectContent>
          </Select>

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

          <Button
            onClick={() => setShowSatuanManagement(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Settings className="w-4 h-4 mr-2" />
            Manajemen Satuan
          </Button>

          <Button
            onClick={handleExport}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Ekspor CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group overflow-hidden rounded-xl bg-white"
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
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-500">{stat.description}</p>
                  </div>
                  <div
                    className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                  >
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white border-0 shadow-xl rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filter Data</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilters({
                pegawaiId: "",
                mitraId: "",
                projectId: "",
                teamId: "",
                type: "all",
              });
              setSearchTerms({
                pegawai: "",
                mitra: "",
                project: "",
                team: "",
              });
            }}
            className="text-gray-600 hover:text-gray-800"
          >
            Clear Filter
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Tipe Data
            </label>
            <Select
              value={filters.type}
              onValueChange={(value) => setFilters({ ...filters, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="pegawai">Pegawai Saja</SelectItem>
                <SelectItem value="mitra">Mitra Saja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Pegawai
            </label>
            <Select
              value={filters.pegawaiId}
              onValueChange={(value) =>
                setFilters({ ...filters, pegawaiId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Pegawai" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Semua Pegawai
                </div>
                <div className="px-2 py-1">
                  <input
                    ref={pegawaiSearchRef}
                    type="text"
                    placeholder="Cari pegawai..."
                    className="w-full px-2 py-1 text-sm border rounded"
                    value={searchTerms.pegawai}
                    onChange={(e) => {
                      setSearchTerms({
                        ...searchTerms,
                        pegawai: e.target.value,
                      });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                {filterData.pegawai
                  .filter((p) =>
                    p.name
                      .toLowerCase()
                      .includes(searchTerms.pegawai.toLowerCase()),
                  )
                  .map((pegawai) => (
                    <SelectItem key={pegawai.id} value={pegawai.id}>
                      {pegawai.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Mitra
            </label>
            <Select
              value={filters.mitraId}
              onValueChange={(value) =>
                setFilters({ ...filters, mitraId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Mitra" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Semua Mitra
                </div>
                <div className="px-2 py-1">
                  <input
                    ref={mitraSearchRef}
                    type="text"
                    placeholder="Cari mitra..."
                    className="w-full px-2 py-1 text-sm border rounded"
                    value={searchTerms.mitra}
                    onChange={(e) => {
                      setSearchTerms({ ...searchTerms, mitra: e.target.value });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                {filterData.mitra
                  .filter((m) =>
                    m.name
                      .toLowerCase()
                      .includes(searchTerms.mitra.toLowerCase()),
                  )
                  .map((mitra) => (
                    <SelectItem key={mitra.id} value={mitra.id}>
                      {mitra.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Proyek
            </label>
            <Select
              value={filters.projectId}
              onValueChange={(value) =>
                setFilters({ ...filters, projectId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Proyek" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Semua Proyek
                </div>
                <div className="px-2 py-1">
                  <input
                    ref={projectSearchRef}
                    type="text"
                    placeholder="Cari proyek..."
                    className="w-full px-2 py-1 text-sm border rounded"
                    value={searchTerms.project}
                    onChange={(e) => {
                      setSearchTerms({
                        ...searchTerms,
                        project: e.target.value,
                      });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                {filterData.projects
                  .filter((p) =>
                    p.name
                      .toLowerCase()
                      .includes(searchTerms.project.toLowerCase()),
                  )
                  .map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Tim
            </label>
            <Select
              value={filters.teamId}
              onValueChange={(value) =>
                setFilters({ ...filters, teamId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Tim" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Semua Tim
                </div>
                <div className="px-2 py-1">
                  <input
                    ref={teamSearchRef}
                    type="text"
                    placeholder="Cari tim..."
                    className="w-full px-2 py-1 text-sm border rounded"
                    value={searchTerms.team}
                    onChange={(e) => {
                      setSearchTerms({ ...searchTerms, team: e.target.value });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                {filterData.teams
                  .filter((t) =>
                    t.name
                      .toLowerCase()
                      .includes(searchTerms.team.toLowerCase()),
                  )
                  .map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-0 shadow-xl rounded-xl overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2 inline" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("spending")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "spending"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <DollarSign className="w-4 h-4 mr-2 inline" />
              Detail Pengeluaran
            </button>
            <button
              onClick={() => setActiveTab("transport")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "transport"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <CalendarIcon className="w-4 h-4 mr-2 inline" />
              Alokasi Transport
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Top Spenders */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Users className="w-6 h-6 mr-3" />
                Pengeluaran Tertinggi
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Ranking pegawai dan mitra dengan pengeluaran tertinggi
              </p>
            </div>
            <div className="p-6 space-y-4">
              {financialData.topSpenders.slice(0, 10).map((spender, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {spender.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {spender.projects.size} proyek
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-blue-600">
                      {formatCurrency(spender.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "spending" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6">
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
                  hasEvents: (date) => {
                    const y = format(date, "yyyy-MM-dd");
                    const rec = (monthlyData as any)?.days?.find(
                      (d: any) => d.date === y,
                    );
                    return !!rec && rec.total > 0;
                  },
                }}
              />
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="text-gray-500">Legenda:</span>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  Ada pengeluaran
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
              <h2 className="text-xl font-bold text-white">
                Detail Pengeluaran
              </h2>
              <p className="text-green-100 text-sm mt-1">
                {format(selectedDate, "EEEE, dd MMMM yyyy", {
                  locale: localeId,
                })}
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {daily?.details?.map((detail, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {detail.recipient_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {detail.project_name || "Proyek tidak tersedia"}
                        </div>
                        <Badge
                          variant="outline"
                          className={`mt-1 ${
                            detail.recipient_type === "pegawai"
                              ? "border-blue-200 text-blue-700"
                              : "border-purple-200 text-purple-700"
                          }`}
                        >
                          {detail.recipient_type === "pegawai"
                            ? "Pegawai"
                            : "Mitra"}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(detail.amount)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(!daily?.details || daily.details.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    Tidak ada pengeluaran pada tanggal ini
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
                    const y = format(date, "yyyy-MM-dd");
                    // Use monthly data for dots, specific day data for details
                    const monthlyRec = monthlyTransportData?.days?.find(
                      (d) => d.date === y,
                    );
                    return !!monthlyRec && monthlyRec.count > 0;
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

          <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
              <h2 className="text-xl font-bold text-white">Detail Alokasi</h2>
              <p className="text-green-100 text-sm mt-1">
                {format(selectedDate, "EEEE, dd MMMM yyyy", {
                  locale: localeId,
                })}
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {(transportDaily as any)?.details?.length > 0 ? (
                  (transportDaily as any).details.map(
                    (detail: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {detail.employee_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {detail.project_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {detail.task_title}
                          </div>
                          {/* New satuan system details */}
                          {detail.satuan_name && (
                            <div className="mt-2 space-y-1">
                              <div className="text-xs text-gray-500">
                                <span className="font-medium">Satuan:</span>{" "}
                                {detail.satuan_name}
                              </div>
                              {detail.rate_per_satuan && (
                                <div className="text-xs text-gray-500">
                                  <span className="font-medium">Rate:</span>{" "}
                                  {formatCurrency(detail.rate_per_satuan)} per{" "}
                                  {detail.satuan_name}
                                </div>
                              )}
                              {detail.volume && (
                                <div className="text-xs text-gray-500">
                                  <span className="font-medium">Volume:</span>{" "}
                                  {detail.volume} {detail.satuan_name}
                                </div>
                              )}
                              {detail.total_amount && (
                                <div className="text-xs font-medium text-green-600">
                                  <span className="font-medium">Total:</span>{" "}
                                  {formatCurrency(detail.total_amount)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {format(
                              new Date(detail.allocation_date),
                              "dd MMM yyyy",
                            )}
                          </div>
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Transport
                          </Badge>
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Tidak ada alokasi transport untuk tanggal ini
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Satuan Management Section */}
      {showSatuanManagement && (
        <div className="mt-8">
          <div className="flex items-center justify-end mb-6">
            <Button
              onClick={() => setShowSatuanManagement(false)}
              variant="outline"
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Tutup
            </Button>
          </div>
          <SatuanManagement />
        </div>
      )}
    </div>
  );
}
