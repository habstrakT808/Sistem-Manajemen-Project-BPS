// File: src/components/pegawai/PersonalSchedule.tsx

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Calendar as CalendarIcon,
  List,
  Grid3X3,
  Users,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  isSameDay,
  addHours,
} from "date-fns";
import { id as localeId } from "date-fns/locale";

interface PersonalEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  event_type: string;
  related_id?: string;
  color: string;
  is_all_day: boolean;
}

interface ScheduleTask {
  id: string;
  deskripsi_tugas: string;
  tanggal_tugas: string;
  start_date?: string;
  end_date?: string;
  effective_end_date?: string;
  status: "pending" | "in_progress" | "completed";
  project_name: string;
  project_status: string;
  project_id: string;
}

interface WorkloadIndicator {
  date: string;
  workload_level: "low" | "medium" | "high";
  event_count: number;
  task_count: number;
  task_span_count?: number;
}

interface ProjectSpanDay {
  date: string;
  project_count: number;
}

interface ScheduleData {
  tasks: ScheduleTask[];
  events: PersonalEvent[];
  workload_indicators: WorkloadIndicator[];
  project_spans?: ProjectSpanDay[];
  monthly_summary: {
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    total_events: number;
    personal_events: number;
  };
}

const EVENT_TYPES = [
  { value: "personal", label: "Personal", color: "#22c55e" },
  { value: "meeting", label: "Meeting", color: "#3b82f6" },
  { value: "task", label: "Task", color: "#f59e0b" },
  { value: "project", label: "Project", color: "#8b5cf6" },
];

const EVENT_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#84cc16",
];

export default function PersonalSchedule() {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list" | "agenda">(
    "calendar",
  );
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarCardRef = useRef<HTMLDivElement | null>(null);
  const calendarContentRef = useRef<HTMLDivElement | null>(null);
  const [cellSizePx, setCellSizePx] = useState<number>(32);

  // Event management states
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PersonalEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    event_type: "personal",
    color: "#22c55e",
    is_all_day: false,
  });

  const fetchScheduleData = useCallback(async () => {
    try {
      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();

      const response = await fetch(
        `/api/pegawai/schedule?month=${month}&year=${year}`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengambil jadwal");
      }

      setScheduleData(result);
    } catch (error) {
      console.error("Error fetching schedule:", error);
      toast.error("Gagal memuat jadwal");
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  // Dynamically size calendar day cells so the whole month fits inside the card
  useEffect(() => {
    const recomputeCellSize = () => {
      const card = calendarCardRef.current;
      const content = calendarContentRef.current;
      if (!card || !content) return;

      // Available height target for entire calendar root
      const cardRect = card.getBoundingClientRect();
      const targetHeight = Math.min(
        cardRect.height,
        Math.round(window.innerHeight * 0.44),
      );

      // Start with a reasonable base, then proportionally fit to target
      const base = 40;
      setCellSizePx(base);

      // Defer measuring until the DOM applies the base size
      requestAnimationFrame(() => {
        const calendarRoot = content.querySelector(
          '[data-slot="calendar"]',
        ) as HTMLElement | null;
        if (!calendarRoot) return;

        const currentHeight = calendarRoot.scrollHeight;
        if (!currentHeight || currentHeight <= 0) return;

        const ratio = targetHeight / currentHeight;
        const fitted = Math.floor(base * ratio);
        const clamped = Math.max(18, Math.min(44, fitted));
        setCellSizePx(clamped);
      });
    };

    recomputeCellSize();
    window.addEventListener("resize", recomputeCellSize);
    return () => window.removeEventListener("resize", recomputeCellSize);
  }, [currentMonth, viewMode]);

  // No-op: previous equal-height logic removed to fit in one screen

  const handleCreateEvent = async () => {
    try {
      if (!eventForm.title || !eventForm.start_date || !eventForm.end_date) {
        toast.error("Mohon isi semua kolom yang wajib");
        return;
      }

      const response = await fetch("/api/pegawai/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventForm),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal membuat acara");
      }

      toast.success("Acara berhasil dibuat");
      setShowEventDialog(false);
      resetEventForm();
      fetchScheduleData();
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Gagal membuat acara");
    }
  };

  const handleUpdateEvent = async () => {
    try {
      if (!editingEvent) return;

      const response = await fetch("/api/pegawai/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...eventForm, id: editingEvent.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal memperbarui acara");
      }

      toast.success("Acara berhasil diperbarui");
      setShowEventDialog(false);
      setEditingEvent(null);
      resetEventForm();
      fetchScheduleData();
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Gagal memperbarui acara");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/pegawai/schedule?id=${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Gagal menghapus acara");
      }

      toast.success("Acara berhasil dihapus");
      fetchScheduleData();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Gagal menghapus acara");
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      event_type: "personal",
      color: "#22c55e",
      is_all_day: false,
    });
  };

  const openEditDialog = (event: PersonalEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || "",
      start_date: event.start_date,
      end_date: event.end_date,
      event_type: event.event_type,
      color: event.color,
      is_all_day: event.is_all_day,
    });
    setShowEventDialog(true);
  };

  const openCreateDialog = (date?: Date) => {
    const startDate = date || selectedDate;
    const endDate = addHours(startDate, 1);

    setEditingEvent(null);
    setEventForm({
      title: "",
      description: "",
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      event_type: "personal",
      color: "#22c55e",
      is_all_day: false,
    });
    setShowEventDialog(true);
  };

  const getEventsForDate = (date: Date) => {
    if (!scheduleData) return { events: [], tasks: [] };

    const events = scheduleData.events.filter((event) => {
      const eventStart = parseISO(event.start_date);
      const eventEnd = parseISO(event.end_date);
      return date >= startOfDay(eventStart) && date <= endOfDay(eventEnd);
    });

    const tasks = scheduleData.tasks.filter((task) =>
      isSameDay(parseISO(task.tanggal_tugas), date),
    );

    return { events, tasks };
  };

  const getWorkloadForDate = (date: Date) => {
    if (!scheduleData) return null;

    const dateString = format(date, "yyyy-MM-dd");
    return scheduleData.workload_indicators.find((w) => w.date === dateString);
  };

  // Disable project span indicators on calendar (only tasks should show)
  const hasProjectSpanOnDate = (_date: Date) => false;

  const getProjectSpanCount = (_date: Date) => 0;

  const getEffectiveWorkloadLevel = (date: Date) => {
    // Use task span concurrency for coloring per requirement
    const w = getWorkloadForDate(date) as WorkloadIndicator | null;
    const spanCount = w?.task_span_count ?? 0;
    if (spanCount <= 0) return null;
    if (spanCount <= 2) return "low" as const; // green
    if (spanCount <= 4) return "medium" as const; // yellow for 3-4 spans
    return "high" as const; // red for 5+
  };

  const isInCurrentMonth = (date: Date) => {
    return (
      date.getMonth() === currentMonth.getMonth() &&
      date.getFullYear() === currentMonth.getFullYear()
    );
  };

  const getWorkloadColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-100 border-green-300 text-gray-900";
      case "medium":
        return "bg-yellow-100 border-yellow-300 text-gray-900";
      case "high":
        return "bg-red-100 border-red-300 text-gray-900";
      default:
        return "bg-gray-100 border-gray-300 text-gray-900";
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return Clock;
      case "in_progress":
        return AlertTriangle;
      case "completed":
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const filteredTasks =
    scheduleData?.tasks.filter((task) => {
      if (filterStatus === "all") return true;
      return task.status === filterStatus;
    }) || [];

  const handleMonthChange = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth);
    if (direction === "prev") {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  if (loading) {
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
              className="animate-pulse border-0 shadow-xl rounded-xl p-6 h-24"
            ></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="animate-pulse border-0 shadow-xl rounded-xl p-6 h-96"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse border-0 shadow-xl rounded-xl p-4 h-24"
              ></div>
            ))}
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Jadwal Saya
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Kelola kalender pribadi, tugas, dan lini masa proyek.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Select
            value={viewMode}
            onValueChange={(value: "calendar" | "list" | "agenda") =>
              setViewMode(value)
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="calendar">
                <div className="flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Kalender
                </div>
              </SelectItem>
              <SelectItem value="list">
                <div className="flex items-center">
                  <List className="w-4 h-4 mr-2" />
                  Tampilan Daftar
                </div>
              </SelectItem>
              <SelectItem value="agenda">
                <div className="flex items-center">
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  Agenda
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => openCreateDialog()}
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Acara
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? "Ubah Acara" : "Buat Acara Baru"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Judul *</Label>
                  <Input
                    id="title"
                    className="mt-1"
                    value={eventForm.title}
                    onChange={(e) =>
                      setEventForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Judul acara"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    className="mt-1"
                    value={eventForm.description}
                    onChange={(e) =>
                      setEventForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Deskripsi acara"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Tanggal Mulai *</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      className="mt-1"
                      value={
                        eventForm.start_date
                          ? format(
                              parseISO(eventForm.start_date),
                              "yyyy-MM-dd'T'HH:mm",
                            )
                          : ""
                      }
                      onChange={(e) =>
                        setEventForm((prev) => ({
                          ...prev,
                          start_date: new Date(e.target.value).toISOString(),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">Tanggal Selesai *</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      className="mt-1"
                      value={
                        eventForm.end_date
                          ? format(
                              parseISO(eventForm.end_date),
                              "yyyy-MM-dd'T'HH:mm",
                            )
                          : ""
                      }
                      onChange={(e) =>
                        setEventForm((prev) => ({
                          ...prev,
                          end_date: new Date(e.target.value).toISOString(),
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="event_type">Jenis Acara</Label>
                  <Select
                    value={eventForm.event_type}
                    onValueChange={(value) =>
                      setEventForm((prev) => ({ ...prev, event_type: value }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: type.color }}
                            />
                            {type.value === "personal"
                              ? "Pribadi"
                              : type.value === "meeting"
                                ? "Rapat"
                                : type.value === "task"
                                  ? "Tugas"
                                  : "Proyek"}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="color">Warna</Label>
                  <div className="flex space-x-2 mt-2">
                    {EVENT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setEventForm((prev) => ({ ...prev, color }))
                        }
                        className={`w-6 h-6 rounded-full border-2 ${
                          eventForm.color === color
                            ? "border-gray-900"
                            : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_all_day"
                    checked={eventForm.is_all_day}
                    onChange={(e) =>
                      setEventForm((prev) => ({
                        ...prev,
                        is_all_day: e.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                  <Label htmlFor="is_all_day">Acara seharian</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEventDialog(false);
                      setEditingEvent(null);
                      resetEventForm();
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={
                      editingEvent ? handleUpdateEvent : handleCreateEvent
                    }
                    className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                  >
                    {editingEvent ? "Perbarui" : "Buat"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={fetchScheduleData}
            variant="outline"
            className="border-2 border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="relative bg-white border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Total Tasks
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {scheduleData?.monthly_summary.total_tasks || 0}
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="relative bg-white border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-yellow-50 to-yellow-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Pending
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {scheduleData?.monthly_summary.pending_tasks || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="relative bg-white border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  In Progress
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {scheduleData?.monthly_summary.in_progress_tasks || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="relative bg-white border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Completed
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {scheduleData?.monthly_summary.completed_tasks || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="relative bg-white border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Events
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {scheduleData?.monthly_summary.total_events || 0}
                </p>
              </div>
              <CalendarDays className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Calendar/List View */}
        <div className="lg:col-span-2">
          <div
            ref={calendarCardRef}
            className="border-0 shadow-xl rounded-xl overflow-hidden"
            style={{}}
          >
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <CalendarDays className="w-6 h-6 mr-3" />
                  {viewMode === "calendar"
                    ? "Tampilan Kalender"
                    : viewMode === "list"
                      ? "Tampilan Daftar"
                      : "Tampilan Agenda"}
                </h2>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMonthChange("prev")}
                    className="text-white hover:bg-white hover:bg-opacity-20"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-white font-semibold min-w-[120px] text-center">
                    {format(currentMonth, "MMMM yyyy", { locale: localeId })}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleToday}
                    className="bg-white/20 text-white hover:bg-white/30"
                  >
                    Hari ini
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMonthChange("next")}
                    className="text-white hover:bg-white hover:bg-opacity-20"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-5 lg:p-6" ref={calendarContentRef}>
              {viewMode === "calendar" ? (
                <div className="w-full">
                  <div className="mx-auto w-[90%]">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      month={currentMonth}
                      onMonthChange={setCurrentMonth}
                      className="!w-full rounded-md border-0"
                      style={{
                        ...({
                          "--cell-size": `${cellSizePx}px`,
                        } as React.CSSProperties),
                      }}
                      modifiers={{
                        hasEvents: (date) => {
                          const w = getWorkloadForDate(
                            date,
                          ) as WorkloadIndicator | null;
                          const spanCount = w?.task_span_count ?? 0;
                          return spanCount > 0;
                        },
                        // Do not use deadline marker; replaced by completion/check logic
                        deadline: (_date) => false,
                        // New: mark a day as fully completed when all tasks that day are completed
                        allCompletedDay: (date) => {
                          const { tasks } = getEventsForDate(date);
                          return (
                            tasks.length > 0 &&
                            tasks.every((t) => t.status === "completed")
                          );
                        },
                        projectSpanDay: (_date) => false,
                        // Show workload indicators when there is at least one event/task
                        // OR the day falls within a project span. Project spans contribute to level.
                        lowWorkload: (date) => {
                          const wLevel = getEffectiveWorkloadLevel(date);
                          if (!wLevel) return false;
                          const w = getWorkloadForDate(
                            date,
                          ) as WorkloadIndicator | null;
                          return (
                            wLevel === "low" && (w?.task_span_count ?? 0) > 0
                          );
                        },
                        mediumWorkload: (date) => {
                          const wLevel = getEffectiveWorkloadLevel(date);
                          if (!wLevel) return false;
                          const w = getWorkloadForDate(
                            date,
                          ) as WorkloadIndicator | null;
                          return (
                            wLevel === "medium" && (w?.task_span_count ?? 0) > 0
                          );
                        },
                        highWorkload: (date) => {
                          const wLevel = getEffectiveWorkloadLevel(date);
                          if (!wLevel) return false;
                          const w = getWorkloadForDate(
                            date,
                          ) as WorkloadIndicator | null;
                          return (
                            wLevel === "high" && (w?.task_span_count ?? 0) > 0
                          );
                        },
                      }}
                      modifiersStyles={
                        {
                          // Use custom circular indicators in CalendarDayButton; no outline/background here
                        }
                      }
                    />
                  </div>
                </div>
              ) : viewMode === "list" ? (
                <div className="space-y-4">
                  {filteredTasks
                    .filter((task) =>
                      isInCurrentMonth(parseISO(task.tanggal_tugas)),
                    )
                    .map((task) => {
                      const TaskStatusIcon = getTaskStatusIcon(task.status);
                      return (
                        <div
                          key={task.id}
                          className="p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <Badge
                                  className={`${getTaskStatusColor(task.status)} border flex items-center space-x-1`}
                                >
                                  <TaskStatusIcon className="w-3 h-3" />
                                  <span>
                                    {task.status
                                      .replace("_", " ")
                                      .toUpperCase()}
                                  </span>
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {task.start_date && task.end_date
                                    ? `${format(parseISO(task.start_date), "dd MMM yyyy", { locale: localeId })} - ${format(parseISO(task.end_date), "dd MMM yyyy", { locale: localeId })}`
                                    : format(
                                        parseISO(task.tanggal_tugas),
                                        "dd MMM yyyy",
                                        { locale: localeId },
                                      )}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900 mb-1">
                                {task.deskripsi_tugas}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Proyek: {task.project_name}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {scheduleData?.events
                    .filter((event) => {
                      // Show if any overlap with current month range
                      const start = startOfDay(parseISO(event.start_date));
                      const end = endOfDay(parseISO(event.end_date));
                      const monthStart = new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth(),
                        1,
                      );
                      const monthEnd = new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1,
                        0,
                        23,
                        59,
                        59,
                        999,
                      );
                      return end >= monthStart && start <= monthEnd;
                    })
                    .map((event) => (
                      <div
                        key={event.id}
                        className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: event.color }}
                              />
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                {event.event_type.toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {event.is_all_day
                                  ? format(
                                      parseISO(event.start_date),
                                      "dd MMM yyyy",
                                      { locale: localeId },
                                    )
                                  : `${format(parseISO(event.start_date), "dd MMM yyyy HH:mm", { locale: localeId })} - ${format(parseISO(event.end_date), "HH:mm", { locale: localeId })}`}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {event.title}
                            </h4>
                            {event.description && (
                              <p className="text-sm text-gray-600">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => openEditDialog(event)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Ubah
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteEvent(event.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                // Agenda View
                <div className="space-y-6">
                  {(() => {
                    const monthStart = new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth(),
                      1,
                    );
                    const monthEnd = new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() + 1,
                      0,
                    );
                    const items: React.ReactElement[] = [];
                    const cursor = new Date(monthStart);
                    let idx = 0;
                    while (cursor <= monthEnd) {
                      const date = new Date(cursor);
                      const { events, tasks } = getEventsForDate(date);
                      const workload = getWorkloadForDate(date);
                      if (events.length > 0 || tasks.length > 0) {
                        items.push(
                          <div
                            key={`${date.toISOString()}-${idx++}`}
                            className="border-l-4 border-green-500 pl-4"
                          >
                            <div className="flex items-center space-x-3 mb-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {format(date, "EEEE, dd MMMM yyyy", {
                                  locale: localeId,
                                })}
                              </h3>
                              {workload && (
                                <Badge
                                  className={getWorkloadColor(
                                    workload.workload_level,
                                  )}
                                >
                                  {workload.workload_level.toUpperCase()} BEBAN
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2">
                              {tasks.map((task) => {
                                const TaskStatusIcon = getTaskStatusIcon(
                                  task.status,
                                );
                                return (
                                  <div
                                    key={task.id}
                                    className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
                                  >
                                    <TaskStatusIcon className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium">
                                      {task.deskripsi_tugas}
                                    </span>
                                    <Badge
                                      className={`${getTaskStatusColor(task.status)} text-xs`}
                                    >
                                      {task.status
                                        .replace("_", " ")
                                        .toUpperCase()}
                                    </Badge>
                                  </div>
                                );
                              })}

                              {events.map((event) => (
                                <div
                                  key={event.id}
                                  className="flex items-center space-x-3 p-2 bg-purple-50 rounded-lg"
                                >
                                  <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: event.color }}
                                  />
                                  <span className="font-medium">
                                    {event.title}
                                  </span>
                                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                                    {event.event_type.toUpperCase()}
                                  </Badge>
                                  {!event.is_all_day && (
                                    <span className="text-sm text-gray-500">
                                      {format(
                                        parseISO(event.start_date),
                                        "HH:mm",
                                      )}{" "}
                                      -{" "}
                                      {format(
                                        parseISO(event.end_date),
                                        "HH:mm",
                                      )}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>,
                        );
                      }
                      cursor.setDate(cursor.getDate() + 1);
                    }
                    if (items.length === 0) {
                      return (
                        <div className="text-gray-500 text-sm">
                          Tidak ada task atau event pada bulan ini.
                        </div>
                      );
                    }
                    return items;
                  })()}
                </div>
              )}
              {viewMode === "calendar" && (
                <div className="mt-4 md:mt-6 flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm">
                  <span className="text-gray-500">Legenda:</span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Beban rendah
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    Sedang
                  </Badge>
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    Tinggi
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                    Ada acara/tugas
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Date Details */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
              <h3 className="font-bold text-white">
                {format(selectedDate, "EEEE, dd MMMM", { locale: localeId })}
              </h3>
            </div>
            <div className="p-4">
              {(() => {
                const { events, tasks } = getEventsForDate(selectedDate);
                const workload = getWorkloadForDate(selectedDate);

                // Build running tasks list (spans) for selected date
                const runningTasks = (scheduleData?.tasks || []).filter((t) => {
                  const s = t.start_date
                    ? parseISO(t.start_date)
                    : parseISO(t.tanggal_tugas);
                  const e = t.effective_end_date
                    ? parseISO(t.effective_end_date)
                    : t.end_date
                      ? parseISO(t.end_date)
                      : parseISO(t.tanggal_tugas);
                  const day = startOfDay(selectedDate);
                  return day >= startOfDay(s) && day <= endOfDay(e);
                });

                if (
                  events.length === 0 &&
                  tasks.length === 0 &&
                  runningTasks.length === 0
                ) {
                  return (
                    <div className="text-center py-8">
                      <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">
                        Tidak ada acara atau tugas pada tanggal ini
                      </p>
                      <Button
                        size="sm"
                        onClick={() => openCreateDialog(selectedDate)}
                        className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Acara
                      </Button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {workload && (
                      <div className="p-2 rounded-lg border-l-4 border-gray-300">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Beban kerja
                          </span>
                          <Badge
                            className={getWorkloadColor(
                              workload.workload_level,
                            )}
                          >
                            {workload.workload_level.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {
                            (scheduleData?.events || []).filter((e) => {
                              const s = parseISO(e.start_date);
                              const en = parseISO(e.end_date);
                              const day = startOfDay(selectedDate);
                              return (
                                day >= startOfDay(s) && day <= endOfDay(en)
                              );
                            }).length
                          }{" "}
                          acara, {runningTasks.length} tugas berjalan
                        </p>
                      </div>
                    )}

                    {(runningTasks.length > 0 ? runningTasks : tasks).map(
                      (task) => {
                        const TaskStatusIcon = getTaskStatusIcon(task.status);
                        return (
                          <div
                            key={task.id}
                            className="p-3 border border-gray-200 rounded-lg"
                          >
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge
                                className={`${getTaskStatusColor(task.status)} text-xs`}
                              >
                                <TaskStatusIcon className="w-3 h-3 mr-1" />
                                {task.status.replace("_", " ").toUpperCase()}
                              </Badge>
                              <span className="text-[11px] text-gray-500">
                                {task.start_date && task.end_date
                                  ? `${format(parseISO(task.start_date), "dd MMM yyyy", { locale: localeId })} - ${format(parseISO(task.end_date), "dd MMM yyyy", { locale: localeId })}`
                                  : format(
                                      parseISO(task.tanggal_tugas),
                                      "dd MMM yyyy",
                                      { locale: localeId },
                                    )}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900 text-sm mb-1">
                              {task.deskripsi_tugas}
                            </h4>
                            <p className="text-xs text-gray-600">
                              {task.project_name}
                            </p>
                          </div>
                        );
                      },
                    )}

                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: event.color }}
                            />
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              {event.event_type.toUpperCase()}
                            </Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => openEditDialog(event)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Ubah
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteEvent(event.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">
                          {event.title}
                        </h4>
                        {!event.is_all_day && (
                          <p className="text-xs text-gray-600">
                            {format(parseISO(event.start_date), "HH:mm")} -{" "}
                            {format(parseISO(event.end_date), "HH:mm")}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Filter */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
              <h3 className="font-bold text-white flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filter Tugas
              </h3>
            </div>
            <div className="p-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="pending">Menunggu</SelectItem>
                  <SelectItem value="in_progress">Berjalan</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4">
              <h3 className="font-bold text-white flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Statistik Singkat
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Bulan ini:</span>
                <span className="font-semibold text-gray-900">
                  {scheduleData?.monthly_summary.total_tasks || 0} tugas
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Acara Pribadi:</span>
                <span className="font-semibold text-gray-900">
                  {scheduleData?.monthly_summary.personal_events || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Tingkat Penyelesaian:
                </span>
                <span className="font-semibold text-green-600">
                  {scheduleData?.monthly_summary.total_tasks
                    ? Math.round(
                        (scheduleData.monthly_summary.completed_tasks /
                          scheduleData.monthly_summary.total_tasks) *
                          100,
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
