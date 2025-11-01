"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface TransportAllocation {
  id: string;
  task_id: string;
  amount: number;
  allocation_date: string | null;
  allocated_at: string | null;
  canceled_at: string | null;
  task: {
    title: string;
    project_name: string;
    start_date: string;
    end_date: string;
    // New fields for satuan system
    satuan_id?: string | null;
    rate_per_satuan?: number | null;
    volume?: number | null;
    total_amount?: number | null;
  };
}

function buildGlobalLockedDates(allocs: TransportAllocation[]): Set<string> {
  const s = new Set<string>();
  allocs.forEach((a) => {
    if (a.allocation_date && !a.canceled_at) s.add(String(a.allocation_date));
  });
  return s;
}

interface TransportCalendarProps {
  onAllocationUpdate?: () => void;
  projectId?: string | null;
}

export default function TransportCalendar({
  onAllocationUpdate,
  projectId,
}: TransportCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allocations, setAllocations] = useState<TransportAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAllocation, setSelectedAllocation] =
    useState<TransportAllocation | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [lockedDates, setLockedDates] = useState<Set<string>>(new Set());
  const [activityNote, setActivityNote] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [adminSchedules, setAdminSchedules] = useState<any[]>([]);
  const [scheduleDetailOpen, setScheduleDetailOpen] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>("");

  // Get first day of current month
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  );
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Generate calendar days
  const calendarDays = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const fetchAllocations = useCallback(async () => {
    try {
      // 1) Always load global locked dates first
      const globalRes = await fetch(`/api/pegawai/transport-allocations`, {
        cache: "no-store",
      });
      if (globalRes.ok) {
        const globalJson = await globalRes.json();
        if (Array.isArray(globalJson.locked_dates)) {
          setLockedDates(new Set(globalJson.locked_dates as string[]));
        } else if (Array.isArray(globalJson.allocations)) {
          setLockedDates(buildGlobalLockedDates(globalJson.allocations));
        }
      }

      // 1b) Load admin schedules for detail view
      try {
        const schRes = await fetch(`/api/admin/schedule`, {
          cache: "no-store",
        });
        if (schRes.ok) {
          const schJson = await schRes.json();
          if (Array.isArray(schJson.schedules)) {
            setAdminSchedules(schJson.schedules);
            // Union locked dates with expanded schedule ranges (client-side)
            const parseYmd = (ymd: string) => {
              const [yy, mm, dd] = ymd.split("-").map((x: string) => Number(x));
              return new Date(yy, (mm || 1) - 1, dd || 1);
            };
            const expandRangeToDates = (
              start: string,
              end: string,
            ): string[] => {
              const out: string[] = [];
              const s = parseYmd(String(start));
              const e = parseYmd(String(end));
              const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
              while (cur.getTime() <= e.getTime()) {
                const y = cur.getFullYear();
                const m = String(cur.getMonth() + 1).padStart(2, "0");
                const d = String(cur.getDate()).padStart(2, "0");
                out.push(`${y}-${m}-${d}`);
                cur.setDate(cur.getDate() + 1);
              }
              return out;
            };
            const scheduleDates = new Set<string>();
            (schJson.schedules as any[]).forEach((s: any) => {
              if (s?.start_date && s?.end_date) {
                expandRangeToDates(s.start_date, s.end_date).forEach((ds) =>
                  scheduleDates.add(ds),
                );
              }
            });
            setLockedDates((prev) => {
              const merged = new Set(prev);
              scheduleDates.forEach((d) => merged.add(d));
              return merged;
            });
          }
        }
      } catch (_) {}

      // 2) Then load allocations for selected project (or all)
      const qs = projectId
        ? `?project_id=${encodeURIComponent(projectId)}`
        : "";
      const response = await fetch(`/api/pegawai/transport-allocations${qs}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch allocations");

      const data = await response.json();
      const arr = Array.isArray(data.allocations) ? data.allocations : [];
      setAllocations(arr);
      // Jika endpoint per-proyek mengirim locked_dates non-kosong, gabungkan (union) dengan global agar tidak hilang
      if (
        Array.isArray(data.locked_dates) &&
        (data.locked_dates as any[]).length > 0
      ) {
        setLockedDates((prev) => {
          const merged = new Set(prev);
          (data.locked_dates as string[]).forEach((d) => merged.add(d));
          return merged;
        });
      } else {
      }
    } catch (error) {
      console.error("Error fetching allocations:", error);
      toast.error("Failed to load transport allocations");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchAllocations();
  }, [projectId, fetchAllocations]);

  // Always preload activity note when modal opens or selection changes
  useEffect(() => {
    if (showEditModal && selectedAllocation) {
      fetch(
        `/api/pegawai/transport-notes?allocation_id=${encodeURIComponent(selectedAllocation.id)}`,
      )
        .then((r) => r.json())
        .then((j) => setActivityNote(j?.notes?.[0]?.note || ""))
        .catch(() => {});
    }
  }, [showEditModal, selectedAllocation]);

  // Keep detail panel in sync with latest stored note
  useEffect(() => {
    if (detailOpen && selectedAllocation) {
      fetch(
        `/api/pegawai/transport-notes?allocation_id=${encodeURIComponent(selectedAllocation.id)}`,
      )
        .then((r) => r.json())
        .then((j) => setActivityNote(j?.notes?.[0]?.note || ""))
        .catch(() => {});
    }
  }, [detailOpen, selectedAllocation]);

  const handleAllocateTransport = async () => {
    if (!selectedAllocation || !selectedDate) return;

    try {
      const response = await fetch(
        `/api/pegawai/transport-allocations/${selectedAllocation.id}/allocate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allocation_date: selectedDate }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to allocate transport");
      }

      toast.success("Transport allocated successfully!");
      setSelectedAllocation(null);
      setSelectedDate("");
      setIsEditMode(false);
      setShowEditModal(false);
      fetchAllocations();
      onAllocationUpdate?.();

      // Navigate to transport page after successful allocation
      setTimeout(() => {
        router.push("/pegawai/transport");
      }, 500);
    } catch (error) {
      console.error("Error allocating transport:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to allocate transport",
      );
    }
  };

  const handleUpdateTransport = async () => {
    if (!selectedAllocation || !selectedDate) return;

    try {
      const response = await fetch(
        `/api/pegawai/transport-allocations/${selectedAllocation.id}/update`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allocation_date: selectedDate }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update transport allocation");
      }

      toast.success("Transport allocation updated successfully!");
      setSelectedAllocation(null);
      setSelectedDate("");
      setIsEditMode(false);
      setShowEditModal(false);
      fetchAllocations();
      onAllocationUpdate?.();

      // Navigate to transport page after successful update
      setTimeout(() => {
        router.push("/pegawai/transport");
      }, 500);
    } catch (error) {
      console.error("Error updating transport allocation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update transport allocation",
      );
    }
  };

  const isAllocated = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return allocations.some(
      (allocation) => allocation.allocation_date === dateStr,
    );
  };

  const getAllocationForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return allocations.find(
      (allocation) => allocation.allocation_date === dateStr,
    );
  };

  const isLockedDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return lockedDates.has(dateStr);
  };

  const getPendingAllocations = () => {
    const pending = allocations.filter(
      (allocation) => !allocation.allocation_date && !allocation.canceled_at,
    );
    return pending;
  };

  const getPendingAllocationsByTask = () => {
    const _pendingAllocations = getPendingAllocations();
    const groupedByTask = pendingAllocations.reduce(
      (acc, allocation) => {
        const taskId = allocation.task_id;
        if (!acc[taskId]) {
          acc[taskId] = {
            task: allocation.task,
            allocations: [],
            totalAmount: 0,
            requiredDays: 0,
          };
        }
        acc[taskId].allocations.push(allocation);
        acc[taskId].totalAmount += allocation.amount;

        // Calculate required days based on new satuan system or legacy system
        if (allocation.task.volume && allocation.task.volume > 0) {
          // New satuan system: use volume as required days
          acc[taskId].requiredDays = allocation.task.volume;
        } else {
          // Legacy system: use allocations length
          acc[taskId].requiredDays = acc[taskId].allocations.length;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          task: any;
          allocations: TransportAllocation[];
          totalAmount: number;
          requiredDays: number;
        }
      >,
    );

    return Object.values(groupedByTask);
  };

  const getAllocatedAllocationsByTask = () => {
    const allocatedAllocations = allocations.filter(
      (allocation) => allocation.allocation_date && !allocation.canceled_at,
    );
    const groupedByTask = allocatedAllocations.reduce(
      (acc, allocation) => {
        const taskId = allocation.task_id;
        if (!acc[taskId]) {
          acc[taskId] = {
            task: allocation.task,
            allocations: [],
            totalAmount: 0,
            requiredDays: 0,
          };
        }
        acc[taskId].allocations.push(allocation);
        acc[taskId].totalAmount += allocation.amount;
        // Get total allocations for this task (including pending ones)
        const totalAllocationsForTask = allocations.filter(
          (a) => a.task_id === taskId && !a.canceled_at,
        );
        acc[taskId].requiredDays = totalAllocationsForTask.length;
        return acc;
      },
      {} as Record<
        string,
        {
          task: any;
          allocations: TransportAllocation[];
          totalAmount: number;
          requiredDays: number;
        }
      >,
    );

    return Object.values(groupedByTask);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
    });
  };

  const pendingAllocations = getPendingAllocations();
  const pendingAllocationsByTask = getPendingAllocationsByTask();
  const _allocatedAllocationsByTask = getAllocatedAllocationsByTask();

  if (loading) {
    return (
      <Card className="border-green-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-emerald-800">
            <Calendar className="w-5 h-5" />
            <span>Kalender Transport</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="space-y-6"
      data-lock-debug={JSON.stringify(Array.from(lockedDates))}
    >
      {/* Pending Allocations */}
      {pendingAllocationsByTask.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-emerald-800">
              <AlertCircle className="w-5 h-5" />
              <span>Alokasi Transport Menunggu</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAllocationsByTask.map((taskGroup) => (
                <div
                  key={taskGroup.task.title}
                  className="p-4 bg-white rounded-lg border border-emerald-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {taskGroup.task.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {taskGroup.task.project_name}
                      </p>
                      <p className="text-sm font-medium text-emerald-700">
                        {taskGroup.allocations.length} dari{" "}
                        {taskGroup.requiredDays}{" "}
                        {taskGroup.task.volume ? "volume" : "hari transport"}{" "}
                        belum dialokasikan • Total: Rp{" "}
                        {taskGroup.totalAmount.toLocaleString()}
                      </p>
                      <div className="w-full bg-emerald-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${((taskGroup.requiredDays - taskGroup.allocations.length) / taskGroup.requiredDays) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-emerald-600 mt-1">
                        {taskGroup.requiredDays - taskGroup.allocations.length}{" "}
                        {taskGroup.task.volume ? "volume" : "hari"} teralokasi,{" "}
                        {taskGroup.allocations.length} tersisa
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {taskGroup.allocations.map((allocation, index) => (
                      <Button
                        key={allocation.id}
                        onClick={() => {
                          setSelectedAllocation(allocation);
                          setSelectedDate("");
                          setIsEditMode(false);
                          setDetailOpen(true);
                          setShowEditModal(true);
                          // Preload existing note if any
                          fetch(
                            `/api/pegawai/transport-notes?allocation_id=${encodeURIComponent(allocation.id)}`,
                          )
                            .then((r) => r.json())
                            .then((j) =>
                              setActivityNote(j?.notes?.[0]?.note || ""),
                            )
                            .catch(() => setActivityNote(""));
                        }}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        Alokasikan {taskGroup.task.volume
                          ? "Volume"
                          : "Hari"}{" "}
                        {index + 1} dari {taskGroup.requiredDays}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Allocated Allocations removed as requested to keep UI clean */}

      {/* Calendar */}
      <Card className="border-green-100">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-800">
              <Calendar className="w-5 h-5" />
              <span>Kalender Transport - {formatDate(currentDate)}</span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="border-green-200 hover:bg-emerald-50"
                onClick={() => navigateMonth("prev")}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-green-200 hover:bg-emerald-50"
                onClick={() => navigateMonth("next")}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {["Ming", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-emerald-700"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={index} className="p-2"></div>;
              }

              const isAllocatedDay = isAllocated(day);
              const locked = isLockedDate(day);
              const allocationForDate = getAllocationForDate(day);
              const isToday =
                new Date().toDateString() ===
                new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  day,
                ).toDateString();

              return (
                <div
                  key={index}
                  className={`relative p-2 text-center text-sm rounded-lg cursor-pointer transition-colors ${
                    isAllocatedDay
                      ? "bg-emerald-100 text-emerald-800 border-2 border-emerald-300 font-semibold"
                      : locked
                        ? "bg-gray-100 text-gray-700 border-2 border-gray-300 font-semibold"
                        : isToday
                          ? "bg-emerald-50 text-emerald-800 font-semibold"
                          : "hover:bg-emerald-50"
                  }`}
                  title={
                    isAllocatedDay && allocationForDate
                      ? `Transport: ${allocationForDate.task.title} - ${allocationForDate.task.project_name}`
                      : locked
                        ? "Tanggal sudah dialokasikan pada proyek lain"
                        : undefined
                  }
                  onClick={() => {
                    if (isAllocatedDay && allocationForDate) {
                      setSelectedAllocation(allocationForDate);
                      setSelectedDate(allocationForDate.allocation_date!);
                      setIsEditMode(true);
                      // Load note for detail only
                      fetch(
                        `/api/pegawai/transport-notes?allocation_id=${encodeURIComponent(allocationForDate.id)}`,
                      )
                        .then((r) => r.json())
                        .then((j) => setActivityNote(j?.notes?.[0]?.note || ""))
                        .catch(() => setActivityNote(""));
                      setDetailOpen(true);
                      setShowEditModal(false);
                    } else if (locked && !isAllocatedDay) {
                      const y = currentDate.getFullYear();
                      const m = String(currentDate.getMonth() + 1).padStart(
                        2,
                        "0",
                      );
                      const d = String(day).padStart(2, "0");
                      const ds = `${y}-${m}-${d}`;
                      setSelectedScheduleDate(ds);
                      setScheduleDetailOpen(true);
                    }
                  }}
                >
                  {day}
                  {isAllocatedDay && (
                    <div className="w-2 h-2 bg-emerald-600 rounded-full mx-auto mt-1"></div>
                  )}
                  {locked && !isAllocatedDay && (
                    <div className="w-2 h-2 bg-gray-400 rounded-full mx-auto mt-1"></div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Date Selection Modal */}
      {showEditModal && selectedAllocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {isEditMode
                  ? "Edit Alokasi Transport"
                  : "Pilih Tanggal Transport"}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {(() => {
                  const taskAllocations = allocations.filter(
                    (a) =>
                      a.task_id === selectedAllocation.task_id &&
                      !a.canceled_at,
                  );
                  const currentIndex = taskAllocations.findIndex(
                    (a) => a.id === selectedAllocation.id,
                  );
                  return `Transport ke ${currentIndex + 1} dari ${taskAllocations.length}`;
                })()}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">
                  {selectedAllocation.task.title}
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedAllocation.task.project_name}
                </p>
                <div className="mt-2 grid grid-cols-1 gap-1 text-sm">
                  <span className="text-emerald-800">
                    {(() => {
                      const taskAllocations = allocations.filter(
                        (a) =>
                          a.task_id === selectedAllocation.task_id &&
                          !a.canceled_at,
                      );
                      const currentIndex = taskAllocations.findIndex(
                        (a) => a.id === selectedAllocation.id,
                      );
                      return `Transport ke ${currentIndex + 1} dari ${taskAllocations.length}`;
                    })()}
                  </span>
                  {selectedAllocation.allocation_date && (
                    <span className="text-gray-700">
                      Tanggal Alokasi:{" "}
                      {new Date(
                        selectedAllocation.allocation_date,
                      ).toLocaleDateString("id-ID")}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-emerald-700">
                  Nominal: Rp {selectedAllocation.amount.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-emerald-800">
                  Pilih Tanggal
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={selectedAllocation.task.start_date}
                  max={selectedAllocation.task.end_date}
                  className="w-full p-2 border border-green-200 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Hanya tanggal antara{" "}
                  {new Date(
                    selectedAllocation.task.start_date,
                  ).toLocaleDateString("id-ID")}{" "}
                  and{" "}
                  {new Date(
                    selectedAllocation.task.end_date,
                  ).toLocaleDateString("id-ID")}{" "}
                  yang diizinkan
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-emerald-800">
                  Kegiatan pada tanggal ini
                </label>
                <textarea
                  value={activityNote}
                  onChange={(e) => setActivityNote(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Survey lapangan, koordinasi tim, input data, dll."
                  className="w-full p-2 border border-green-200 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setIsEditMode(false);
                  }}
                  className="flex-1 border-green-200 hover:bg-emerald-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    const current = selectedAllocation;
                    const savedDate = selectedDate; // persist before any state resets
                    const noteToSave = activityNote.trim();

                    try {
                      // Save activity note first if provided
                      if (current && noteToSave) {
                        try {
                          await fetch(`/api/pegawai/transport-notes`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              allocation_id: current.id,
                              date: savedDate,
                              project_id: undefined,
                              task_id: current.task_id,
                              note: noteToSave,
                            }),
                          });
                        } catch (noteError) {
                          // Note save is not critical, continue anyway
                          console.warn(
                            "Failed to save activity note:",
                            noteError,
                          );
                        }
                      }

                      // Then allocate/update transport - this will redirect to /pegawai/transport
                      if (isEditMode) {
                        await handleUpdateTransport();
                      } else {
                        await handleAllocateTransport();
                      }
                      // Note: Don't set detail panel or reopen modal - we're redirecting
                    } catch (error) {
                      // Error already handled in handleUpdateTransport/handleAllocateTransport
                      console.error("Error in transport allocation:", error);
                    }
                  }}
                  disabled={!selectedDate}
                  className={`flex-1 ${isEditMode ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                >
                  {isEditMode ? "Update Transport" : "Allocate Transport"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sidebar Detail */}
      {detailOpen && selectedAllocation && (
        <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l z-40 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-emerald-800">
              Detail Transport
            </h3>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="border-green-200"
                onClick={() => setDetailOpen(false)}
              >
                Tutup
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  setShowEditModal(true);
                  setIsEditMode(true);
                }}
              >
                Edit Form
              </Button>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">Tanggal: </span>
              <span className="font-medium">
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString("id-ID")
                  : "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Proyek: </span>
              <span className="font-medium">
                {selectedAllocation.task.project_name}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Tugas: </span>
              <span className="font-medium">
                {selectedAllocation.task.title}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Periode Tugas: </span>
              <span className="font-medium">
                {new Date(
                  selectedAllocation.task.start_date,
                ).toLocaleDateString("id-ID")}{" "}
                -{" "}
                {new Date(selectedAllocation.task.end_date).toLocaleDateString(
                  "id-ID",
                )}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Nominal: </span>
              <span className="font-medium">
                Rp {selectedAllocation.amount.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Kegiatan: </span>
              <div className="mt-1 p-3 bg-emerald-50 border border-emerald-100 rounded">
                {activityNote || "-"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Detail Jadwal (Admin Schedule) */}
      {scheduleDetailOpen && selectedScheduleDate && (
        <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l z-40 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-emerald-800">
              Detail Jadwal
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="border-green-200"
              onClick={() => setScheduleDetailOpen(false)}
            >
              Tutup
            </Button>
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-gray-500">Tanggal: </span>
              <span className="font-medium">
                {new Date(selectedScheduleDate).toLocaleDateString("id-ID")}
              </span>
            </div>
            {(() => {
              const list = adminSchedules.filter((s) => {
                const sd = new Date(s.start_date);
                const ed = new Date(s.end_date);
                const cur = new Date(selectedScheduleDate);
                return cur >= sd && cur <= ed;
              });
              if (list.length === 0) {
                return (
                  <div className="text-gray-600">
                    Tidak ada jadwal aktif di tanggal ini.
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  {list.map((s: any) => (
                    <div key={s.id} className="p-3 border rounded-lg">
                      <div className="font-medium text-gray-900">{s.title}</div>
                      <div className="text-gray-600 text-xs mt-1">
                        Periode:{" "}
                        {new Date(s.start_date).toLocaleDateString("id-ID")} -{" "}
                        {new Date(s.end_date).toLocaleDateString("id-ID")}
                      </div>
                      {s.description && (
                        <div className="text-gray-700 text-sm mt-2">
                          {s.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs">
              Pegawai tidak dapat mengalokasikan transport pada tanggal dalam
              jadwal global.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
