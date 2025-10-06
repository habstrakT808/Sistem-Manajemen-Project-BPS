// File: src/app/pegawai/tasks/[id]/transport/page.tsx
// NEW: Transport allocation page for specific task

"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import TransportCalendar from "@/components/pegawai/TransportCalendar";
import { formatCurrency } from "@/lib/utils";

interface TransportPageProps {
  params: Promise<{ id: string }>;
}

interface TaskData {
  id: string;
  title: string;
  deskripsi_tugas: string;
  start_date: string;
  end_date: string;
  has_transport: boolean;
  transport_days: number;
  status: string;
  response_pegawai: string | null;
  created_at: string;
  updated_at: string;
  project: {
    id: string;
    nama_project: string;
    deskripsi: string;
    status: string;
  };
}

async function fetchTaskData(taskId: string): Promise<TaskData> {
  const response = await fetch(`/api/pegawai/tasks/${taskId}`, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Gagal mengambil data tugas");
  }
  return result.data;
}

export default function TransportAllocationPage({
  params,
}: TransportPageProps) {
  const router = useRouter();
  const [taskId, setTaskId] = React.useState<string>("");

  // Calculate transport days based on task duration
  const _calculateTransportDays = (task: TaskData): number => {
    if (!task.start_date || !task.end_date) return 0;
    const startDate = new Date(task.start_date);
    const endDate = new Date(task.end_date);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays; // Minimum 1 day if same date
  };

  // Calculate total transport amount
  const calculateTransportAmount = (task: TaskData): number => {
    // Use the actual transport_days from the task, not calculated from date range
    const transportDays = task.transport_days || 0;
    return 150000 * transportDays;
  };

  React.useEffect(() => {
    params.then(({ id }) => setTaskId(id));
  }, [params]);

  const {
    data: task,
    isLoading,
    error,
  } = useQuery<TaskData, Error>({
    queryKey: ["pegawai", "tasks", "detail", taskId],
    queryFn: () => fetchTaskData(taskId),
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-96"></div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Tugas Tidak Ditemukan
            </h2>
            <p className="text-gray-600 max-w-md">
              {error?.message || "Tugas yang diminta tidak ditemukan."}
            </p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!task.has_transport) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Tidak Ada Alokasi Transport
            </h2>
            <p className="text-gray-600 max-w-md">
              Tugas ini tidak memiliki tunjangan transport.
            </p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Tugas
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Tugas
          </Button>

          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Pemilihan Tanggal Transport
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Pilih tanggal alokasi transport untuk tugas ini.
          </p>
        </div>
      </div>

      {/* Task Info */}
      <div className="border-0 shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
          <div className="flex items-center text-white text-xl font-semibold">
            <MapPin className="w-6 h-6 mr-3" />
            Informasi Tugas
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {task.title}
            </h3>
            <p className="text-gray-600 mb-4">{task.deskripsi_tugas}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <div className="text-sm">
                <div className="font-medium text-gray-900">Periode Tugas</div>
                <div className="text-gray-500">
                  {new Date(task.start_date).toLocaleDateString("id-ID")} -{" "}
                  {new Date(task.end_date).toLocaleDateString("id-ID")}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <FolderOpen className="w-4 h-4 text-purple-500" />
              <div className="text-sm">
                <div className="font-medium text-gray-900">Proyek</div>
                <div className="text-gray-500">{task.project.nama_project}</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <div className="text-sm">
                <div className="font-medium text-gray-900">
                  Jumlah Transport
                </div>
                <div className="text-green-600 font-semibold">
                  {formatCurrency(calculateTransportAmount(task))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transport Calendar */}
      <div className="border-0 shadow-xl rounded-xl overflow-hidden">
        <TransportCalendar />
      </div>
    </div>
  );
}
