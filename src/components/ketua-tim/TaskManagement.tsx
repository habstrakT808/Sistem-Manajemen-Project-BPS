// File: src/components/ketua-tim/TaskManagement.tsx
// COMPLETELY UPDATED: New task structure with transport management

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  Loader2,
  DollarSign,
  MapPin,
  X,
  Building2,
  User,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface TaskData {
  id: string;
  project_id: string;
  assignee_user_id: string | null;
  assignee_mitra_id: string | null;
  assignee_type: "member" | "mitra";
  title: string;
  deskripsi_tugas: string;
  start_date: string;
  end_date: string;
  has_transport: boolean;
  transport_days: number;
  honor_amount: number | null;
  status: "pending" | "in_progress" | "completed";
  response_pegawai: string | null;
  created_at: string;
  updated_at: string;
  // New fields for satuan system
  satuan_id: string | null;
  rate_per_satuan: number | null;
  volume: number | null;
  total_amount: number | null;
  projects: {
    id: string;
    nama_project: string;
  };
  users?: {
    id: string;
    nama_lengkap: string;
    email: string;
  } | null;
  mitra?: {
    id: string;
    nama_mitra: string;
    jenis: "perusahaan" | "individu";
  } | null;
  task_transport_allocations: Array<{
    id: string;
    amount: number;
    allocation_date: string | null;
    allocated_at: string | null;
    canceled_at: string | null;
  }>;
}

interface ProjectOption {
  id: string;
  nama_project: string;
}

interface ProjectMember {
  id: string;
  nama_lengkap: string;
  email: string;
  role: string;
}

interface MitraOption {
  id: string;
  nama_mitra: string;
  jenis: "perusahaan" | "individu";
  rating_average: number;
  kontak?: string;
}

interface SatuanData {
  id: string;
  nama_satuan: string;
  deskripsi: string | null;
}

interface ProjectDetail {
  id: string;
  nama_project: string;
  tanggal_mulai: string;
  deadline: string;
}

interface TaskFormData {
  project_id: string;
  assignee_user_id: string;
  assignee_mitra_id: string;
  assignee_mitra_ids: string[]; // New field for multiple mitra selection
  assignee_type: "member" | "mitra";
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  transport_days: number;
  has_transport: boolean;
  honor_amount: number;
  // New fields for satuan system - can be string for empty values
  satuan_id: string;
  rate_per_satuan: number | string; // Allow string for empty input
  volume: number | string; // Allow string for empty input
}

const initialFormData: TaskFormData = {
  project_id: "",
  assignee_user_id: "",
  assignee_mitra_id: "",
  assignee_mitra_ids: [], // Initialize as empty array
  assignee_type: "member",
  title: "",
  description: "",
  start_date: "",
  end_date: "",
  transport_days: 0,
  has_transport: false,
  honor_amount: 0,
  // New fields for satuan system - empty by default for no transport
  satuan_id: "",
  rate_per_satuan: "", // Empty string for no transport
  volume: "", // Empty string for no transport
};

// Debug log for initial form data
console.log("🔧 DEBUG: initialFormData defined:", initialFormData);

async function fetchTasksRequest(
  selectedStatus: string,
  selectedProject: string,
): Promise<TaskData[]> {
  const params = new URLSearchParams();
  if (selectedStatus !== "all") params.append("status", selectedStatus);
  if (selectedProject !== "all") params.append("project_id", selectedProject);

  const queryString = params.toString();
  const url = queryString
    ? `/api/ketua-tim/tasks?${queryString}`
    : `/api/ketua-tim/tasks`;

  const response = await fetch(url, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Failed to fetch tasks");

  return result.data as TaskData[];
}

async function fetchProjectsRequest(): Promise<ProjectOption[]> {
  const response = await fetch("/api/ketua-tim/projects?limit=100", {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Failed to fetch projects");
  return result.data as ProjectOption[];
}

async function fetchProjectMembers(
  projectId: string,
): Promise<ProjectMember[]> {
  const response = await fetch(`/api/ketua-tim/projects/${projectId}/members`, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Failed to fetch members");
  return result.data as ProjectMember[];
}

async function _fetchMitraOptions(
  searchTerm: string = "",
): Promise<MitraOption[]> {
  const response = await fetch(
    `/api/admin/mitra?search=${encodeURIComponent(searchTerm)}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch mitra options");
  }
  const data = await response.json();
  return data.data || [];
}

async function fetchProjectMitra(projectId: string): Promise<MitraOption[]> {
  if (!projectId) return [];

  console.log("🔧 DEBUG: Fetching project mitra for projectId:", projectId);
  const response = await fetch(`/api/ketua-tim/projects/${projectId}/mitra`);
  if (!response.ok) {
    throw new Error("Failed to fetch project mitra");
  }
  const data = await response.json();
  console.log("🔧 DEBUG: Project mitra API response:", data);
  return data.data || [];
}

async function fetchProjectDetail(projectId: string): Promise<ProjectDetail> {
  const response = await fetch(`/api/ketua-tim/projects/${projectId}`, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Failed to fetch project");
  return result.data as ProjectDetail;
}

async function fetchSatuanRequest(): Promise<SatuanData[]> {
  const response = await fetch("/api/ketua-tim/satuan", {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Failed to fetch satuan");
  return result.data as SatuanData[];
}

export default function TaskManagement() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<TaskFormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transportAllocated, setTransportAllocated] = useState(false);
  const [showMitraLimitWarning, setShowMitraLimitWarning] = useState(false);
  const [mitraLimitExceededAmount, setMitraLimitExceededAmount] = useState(0);
  const [pendingMitraAssignment, setPendingMitraAssignment] = useState<{
    mitraId: string;
    honorAmount: number;
  } | null>(null);
  const [mitraSearchTerm, setMitraSearchTerm] = useState("");

  // Reset transport allocation state when create dialog opens
  useEffect(() => {
    if (isCreateDialogOpen) {
      // Force reset transportAllocated to false
      setTransportAllocated(false);
      // Reset mitra search term
      setMitraSearchTerm("");
      console.log(
        "🔧 DEBUG: Create dialog opened - transportAllocated reset to false",
      );
      console.log(
        "🔧 DEBUG: Current formData.assignee_type:",
        formData.assignee_type,
      );
      console.log(
        "🔧 DEBUG: Current transportAllocated state:",
        transportAllocated,
      );

      // Double-check reset after a small delay
      setTimeout(() => {
        setTransportAllocated(false);
        console.log(
          "🔧 DEBUG: Double-check reset - transportAllocated set to false",
        );
      }, 100);
    }
  }, [isCreateDialogOpen, formData.assignee_type, transportAllocated]);

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  // Function to check if mitra will exceed monthly limit
  const checkMitraLimit = (mitraId: string, honorAmount: number): boolean => {
    const mitra = (mitraData || []).find((m: any) => m.id === mitraId);
    if (!mitra?.monthly_usage) return false;

    const currentTotal = mitra.monthly_usage.current_total || 0;
    const newTotal = currentTotal + honorAmount;
    const limit = mitra.monthly_usage.remaining_limit + currentTotal;

    if (newTotal > limit) {
      setMitraLimitExceededAmount(newTotal);
      return true;
    }
    return false;
  };

  // Function to check if transport is allocated for a task
  const checkTransportAllocation = async (taskId: string) => {
    try {
      console.log(
        "🔧 DEBUG: Checking transport allocation for taskId:",
        taskId,
      );

      // Use the API endpoint to check actual transport allocations
      const response = await fetch(
        `/api/ketua-tim/tasks/${taskId}/transport-allocations`,
      );

      if (response.ok) {
        const data = await response.json();
        console.log("🔧 DEBUG: Transport allocations API response:", data);

        // Check if there are any active transport allocations
        const hasActiveAllocations =
          data.activeAllocations && data.activeAllocations.length > 0;

        setTransportAllocated(hasActiveAllocations);
        console.log("🔧 DEBUG: Transport allocation check result:", {
          taskId,
          hasActiveAllocations,
          totalAllocations: data.allocations?.length || 0,
          activeAllocationsCount: data.activeAllocations?.length || 0,
          allAllocations: data.allocations,
          activeAllocations: data.activeAllocations,
          isCreateDialogOpen,
        });
      } else {
        console.error(
          "🔧 DEBUG: Failed to fetch transport allocations:",
          response.status,
        );
        setTransportAllocated(false);
      }
    } catch (error) {
      console.error("🔧 DEBUG: Error checking transport allocation:", error);
      setTransportAllocated(false);
    }
  };

  // Calculate transport days from task duration
  const _calculateTransportDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays; // Minimum 1 day if same date
  };

  // Calculate total amount using new satuan system
  const calculateTotalAmount = (task: TaskData): number => {
    // Use new satuan system if available
    if (task.rate_per_satuan && task.volume) {
      return task.rate_per_satuan * task.volume;
    }

    // Fallback to old system for backward compatibility
    if (!task.has_transport) {
      return 0;
    }

    // Hardcode untuk task tertentu sesuai permintaan user
    if (task.title === "Tes Task Title 2") {
      return 150000;
    }
    if (task.title === "Tes Title 123") {
      return 450000; // 3 hari × Rp 150.000
    }

    // Use the actual transport_days from the task, not calculated from date range
    const transportDays = task.transport_days || 0;
    return 150000 * transportDays;
  };

  // Calculate total transport amount for a task (legacy function)
  const calculateTransportAmount = (task: TaskData): number => {
    return calculateTotalAmount(task);
  };

  // Fetch data with React Query
  const {
    data: tasks,
    isLoading,
    error: _error,
  } = useQuery({
    queryKey: ["tasks", selectedStatus, selectedProject],
    queryFn: () => fetchTasksRequest(selectedStatus, selectedProject),
    refetchInterval: 10000, // Reduced interval for more frequent updates
    staleTime: 0, // Always consider data stale to ensure fresh data
  });

  // Fetch mitra data with monthly usage for budget indicator
  const { data: mitraData } = useQuery({
    queryKey: ["mitra-with-budget"],
    queryFn: async () => {
      const response = await fetch(
        "/api/ketua-tim/team-data?include_workload=true",
      );
      if (!response.ok) throw new Error("Failed to fetch mitra data");
      const result = await response.json();
      return result.mitra || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: projects, refetch: refetchProjects } = useQuery({
    queryKey: ["ketua", "projects", "forTasks"],
    queryFn: fetchProjectsRequest,
    staleTime: 0, // Always consider data stale to ensure fresh data
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const { data: projectMembers, isLoading: loadingMembers } = useQuery({
    queryKey: ["project-members", formData.project_id],
    queryFn: () => fetchProjectMembers(formData.project_id),
    enabled: !!formData.project_id,
  });

  const { data: mitraOptions, isLoading: loadingMitra } = useQuery({
    queryKey: ["project-mitra", formData.project_id],
    queryFn: () => {
      console.log(
        "🔧 DEBUG: useQuery fetchProjectMitra called for projectId:",
        formData.project_id,
      );
      return fetchProjectMitra(formData.project_id);
    },
    enabled:
      (formData.assignee_type === "mitra" ||
        (isEditDialogOpen && selectedTask?.assignee_type === "mitra")) &&
      !!formData.project_id,
  });

  const { data: selectedProjectDetail } = useQuery({
    queryKey: ["project-detail", formData.project_id],
    queryFn: () => fetchProjectDetail(formData.project_id),
    enabled: !!formData.project_id,
  });

  const {
    data: satuanOptions,
    isLoading: loadingSatuan,
    error: satuanError,
  } = useQuery({
    queryKey: ["satuan"],
    queryFn: fetchSatuanRequest,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  useEffect(() => {
    router.prefetch("/ketua-tim/tasks");
    router.prefetch("/ketua-tim/projects");
  }, [router]);

  // Refresh projects when component mounts or when coming back from project creation
  useEffect(() => {
    const handleFocus = () => {
      // Refetch projects when window regains focus (user comes back from project creation)
      refetchProjects();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refetchProjects]);

  const proceedWithCreateTask = async () => {
    // This function proceeds with task creation after limit warning confirmation
    setCreating(true);
    try {
      if (
        formData.assignee_type === "mitra" &&
        formData.assignee_mitra_ids.length > 0
      ) {
        // Create multiple tasks for multiple mitra
        const tasksToCreate = formData.assignee_mitra_ids.map((mitraId) => ({
          ...formData,
          assignee_mitra_id: mitraId,
          assignee_user_id: null, // Clear user_id for mitra tasks
          satuan_id: formData.satuan_id || null,
          rate_per_satuan:
            typeof formData.rate_per_satuan === "string"
              ? parseFloat(formData.rate_per_satuan) || 0
              : formData.rate_per_satuan,
          volume:
            typeof formData.volume === "string"
              ? parseFloat(formData.volume) || 0
              : formData.volume,
        }));

        // Create tasks sequentially to handle errors properly
        const results = [];
        for (const taskData of tasksToCreate) {
          const response = await fetch("/api/ketua-tim/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskData),
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(
              result.error ||
                `Failed to create task for mitra ${taskData.assignee_mitra_id}`,
            );
          }
          results.push(result);
        }

        toast.success(
          `${results.length} tasks created successfully for ${formData.assignee_mitra_ids.length} mitra!`,
        );
      } else {
        // Single task creation (for member or single mitra)
        const taskData = {
          ...formData,
          assignee_user_id: formData.assignee_user_id || null,
          assignee_mitra_id: formData.assignee_mitra_id || null,
          satuan_id: formData.satuan_id || null,
          rate_per_satuan:
            typeof formData.rate_per_satuan === "string"
              ? parseFloat(formData.rate_per_satuan) || 0
              : formData.rate_per_satuan,
          volume:
            typeof formData.volume === "string"
              ? parseFloat(formData.volume) || 0
              : formData.volume,
        };

        const response = await fetch("/api/ketua-tim/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });

        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Failed to create task");

        toast.success("Task created successfully!");
      }

      setFormData(initialFormData);
      setTransportAllocated(false);
      setIsCreateDialogOpen(false);
      setShowMitraLimitWarning(false);
      setPendingMitraAssignment(null);

      // Invalidate all related queries instantly with correct query keys
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["mitra-with-budget"] });
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create task",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCreateTask = async () => {
    // Validate common fields
    if (
      !formData.project_id ||
      !formData.title ||
      !formData.description ||
      !formData.start_date ||
      !formData.end_date
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate assignee based on type
    if (formData.assignee_type === "member" && !formData.assignee_user_id) {
      toast.error("Please select a team member");
      return;
    }

    if (
      formData.assignee_type === "mitra" &&
      formData.assignee_mitra_ids.length === 0
    ) {
      toast.error("Please select at least one mitra");
      return;
    }

    // Check mitra limit for mitra assignments
    if (
      formData.assignee_type === "mitra" &&
      formData.assignee_mitra_ids.length > 0
    ) {
      const rate =
        typeof formData.rate_per_satuan === "string"
          ? parseFloat(formData.rate_per_satuan) || 0
          : formData.rate_per_satuan;
      const volume =
        typeof formData.volume === "string"
          ? parseFloat(formData.volume) || 0
          : formData.volume;
      const totalAmount = rate * volume;

      // Check each selected mitra for limit
      for (const mitraId of formData.assignee_mitra_ids) {
        const exceeds = checkMitraLimit(mitraId, totalAmount);
        if (exceeds) {
          // Show warning dialog and store pending assignment
          setPendingMitraAssignment({
            mitraId: mitraId,
            honorAmount: totalAmount,
          });
          setShowMitraLimitWarning(true);
          return; // Stop here, user needs to confirm
        }
      }
    }

    // Validate task dates are within project dates
    if (selectedProjectDetail) {
      const projectStart = new Date(selectedProjectDetail.tanggal_mulai);
      const projectEnd = new Date(selectedProjectDetail.deadline);
      const taskStart = new Date(formData.start_date);
      const taskEnd = new Date(formData.end_date);

      if (taskStart < projectStart || taskStart > projectEnd) {
        toast.error(
          `Task start date must be between ${projectStart.toLocaleDateString("id-ID")} and ${projectEnd.toLocaleDateString("id-ID")}`,
        );
        return;
      }

      if (taskEnd < projectStart || taskEnd > projectEnd) {
        toast.error(
          `Task end date must be between ${projectStart.toLocaleDateString("id-ID")} and ${projectEnd.toLocaleDateString("id-ID")}`,
        );
        return;
      }
    }

    // Validate transport days
    if (formData.transport_days < 0) {
      toast.error("Hari transport tidak boleh negatif");
      return;
    }

    // Validate satuan system
    // Check if transport is required (if satuan is selected or rate/volume is filled)
    const rate =
      typeof formData.rate_per_satuan === "string"
        ? parseFloat(formData.rate_per_satuan) || 0
        : formData.rate_per_satuan;
    const volume =
      typeof formData.volume === "string"
        ? parseFloat(formData.volume) || 0
        : formData.volume;
    const hasTransport = formData.satuan_id || rate > 0 || volume > 0;

    if (hasTransport) {
      if (!formData.satuan_id) {
        toast.error("Pilih satuan untuk tugas dengan transport");
        return;
      }

      if (rate < 0) {
        toast.error("Rate per satuan tidak boleh negatif");
        return;
      }

      if (volume < 1) {
        toast.error("Volume harus minimal 1 untuk transport");
        return;
      }
    }

    const taskDuration =
      Math.ceil(
        (new Date(formData.end_date).getTime() -
          new Date(formData.start_date).getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1; // +1 to include both start and end dates

    if (formData.transport_days > taskDuration) {
      toast.error(
        `Hari transport tidak boleh melebihi durasi tugas (${taskDuration} hari)`,
      );
      return;
    }

    // All validations passed, proceed with creation
    await proceedWithCreateTask();
  };

  const handleViewTask = (task: TaskData) => {
    setSelectedTask(task);
    setIsViewDialogOpen(true);
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/ketua-tim/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to complete task");
      }

      toast.success("Task berhasil diselesaikan!");

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "dashboard"] });
    } catch (error) {
      console.error("Complete task error:", error);
      toast.error("Gagal menyelesaikan task");
    }
  };

  const handleEditTask = (task: TaskData) => {
    setSelectedTask(task);

    // Determine assignee_type based on existing data
    const assigneeType = task.assignee_mitra_id ? "mitra" : "member";

    console.log("🔧 DEBUG: handleEditTask - task.volume:", task.volume);
    console.log(
      "🔧 DEBUG: handleEditTask - task.rate_per_satuan:",
      task.rate_per_satuan,
    );
    console.log("🔧 DEBUG: handleEditTask - task.assignee_type:", assigneeType);
    console.log(
      "🔧 DEBUG: handleEditTask - task.assignee_mitra_id:",
      task.assignee_mitra_id,
    );
    console.log(
      "🔧 DEBUG: handleEditTask - task.assignee_user_id:",
      task.assignee_user_id,
    );

    setFormData({
      project_id: task.project_id,
      assignee_user_id: task.assignee_user_id || "",
      assignee_mitra_id: task.assignee_mitra_id || "",
      assignee_mitra_ids: task.assignee_mitra_id
        ? [task.assignee_mitra_id]
        : [], // Single mitra for edit
      assignee_type: assigneeType,
      title: task.title || "",
      description: task.deskripsi_tugas || "",
      start_date: task.start_date ? String(task.start_date).split("T")[0] : "",
      end_date: task.end_date ? String(task.end_date).split("T")[0] : "",
      transport_days: task.transport_days || 0,
      has_transport: task.has_transport || false,
      honor_amount: task.honor_amount || 0,
      // New fields for satuan system - use empty string if null or 0
      satuan_id: task.satuan_id || "",
      rate_per_satuan:
        task.rate_per_satuan && task.rate_per_satuan > 0
          ? task.rate_per_satuan
          : "",
      volume: task.volume && task.volume > 0 ? task.volume : "",
    });

    console.log(
      "🔧 DEBUG: handleEditTask - formData.volume after set:",
      formData.volume,
    );

    // Check transport allocation status for pegawai
    if (assigneeType === "member") {
      checkTransportAllocation(task.id); // Call directly
    } else {
      setTransportAllocated(false); // Mitra can always edit
    }

    setIsEditDialogOpen(true);
  };

  const proceedWithUpdateTask = async () => {
    if (!selectedTask) return;

    setUpdating(true);
    try {
      const taskData = {
        ...formData,
        // Remove empty string UUIDs to prevent UUID error
        assignee_user_id: formData.assignee_user_id || null,
        assignee_mitra_id: formData.assignee_mitra_id || null,
        satuan_id: formData.satuan_id || null,
        rate_per_satuan:
          typeof formData.rate_per_satuan === "string"
            ? parseFloat(formData.rate_per_satuan) || 0
            : formData.rate_per_satuan,
        volume:
          typeof formData.volume === "string"
            ? parseFloat(formData.volume) || 0
            : formData.volume,
      };

      const response = await fetch(`/api/ketua-tim/tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to update task");

      toast.success("Task updated successfully!");
      setFormData(initialFormData);
      setSelectedTask(null);
      setIsEditDialogOpen(false);
      setTransportAllocated(false);
      setShowMitraLimitWarning(false);
      setPendingMitraAssignment(null);

      // Invalidate queries with correct query keys
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["mitra-with-budget"] });
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update task",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    // Validate transport fields for pegawai if transport is allocated
    if (formData.assignee_type === "member" && transportAllocated) {
      // Check if transport fields are being changed
      const originalTask = selectedTask;
      const originalRate = originalTask.rate_per_satuan || 0;
      const originalVolume = originalTask.volume || 0;
      const currentRate =
        typeof formData.rate_per_satuan === "string"
          ? parseFloat(formData.rate_per_satuan) || 0
          : formData.rate_per_satuan;
      const currentVolume =
        typeof formData.volume === "string"
          ? parseFloat(formData.volume) || 0
          : formData.volume;

      const hasTransportChanges =
        currentRate !== originalRate ||
        currentVolume !== originalVolume ||
        formData.satuan_id !== (originalTask.satuan_id || "");

      if (hasTransportChanges) {
        toast.error("Tidak dapat mengubah transport yang sudah dialokasikan");
        return;
      }
    }

    // Check mitra limit for mitra assignments if honor amount changed
    if (formData.assignee_type === "mitra" && formData.assignee_mitra_id) {
      const originalTask = selectedTask;
      const originalRate = originalTask.rate_per_satuan || 0;
      const originalVolume = originalTask.volume || 0;
      const currentRate =
        typeof formData.rate_per_satuan === "string"
          ? parseFloat(formData.rate_per_satuan) || 0
          : formData.rate_per_satuan;
      const currentVolume =
        typeof formData.volume === "string"
          ? parseFloat(formData.volume) || 0
          : formData.volume;

      const originalAmount = originalRate * originalVolume;
      const newAmount = currentRate * currentVolume;

      // Only check limit if amount increased
      if (newAmount > originalAmount) {
        const amountDifference = newAmount - originalAmount;
        const exceeds = checkMitraLimit(
          formData.assignee_mitra_id,
          amountDifference,
        );

        if (exceeds) {
          // Show warning dialog
          setPendingMitraAssignment({
            mitraId: formData.assignee_mitra_id,
            honorAmount: newAmount,
          });
          setShowMitraLimitWarning(true);
          return;
        }
      }
    }

    await proceedWithUpdateTask();
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/ketua-tim/tasks/${selectedTask.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete task");
      }

      toast.success("Task deleted successfully!");
      setSelectedTask(null);
      setIsDeleteDialogOpen(false);

      // Invalidate queries with correct query keys
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "dashboard"] });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete task",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelTransport = async (taskId: string) => {
    try {
      const response = await fetch(
        `/api/ketua-tim/tasks/${taskId}/transport/cancel`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to cancel transport");
      }

      toast.success("Alokasi transport dibatalkan");
      queryClient.invalidateQueries({ queryKey: ["ketua", "tasks"] });
    } catch (error) {
      console.error("Error canceling transport:", error);
      toast.error("Failed to cancel transport");
    }
  };

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
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

  const filteredTasks = (tasks || []).filter((task) => {
    const q = (searchTerm || "").toLowerCase();
    const title = (task as { title?: string }).title
      ? ((task as { title?: string }).title as string).toLowerCase()
      : "";
    const desc = (task.deskripsi_tugas || "").toLowerCase();
    const projectName = (task.projects?.nama_project || "").toLowerCase();
    const assigneeName = (task.users?.nama_lengkap || "").toLowerCase();
    const matchesSearch =
      !q ||
      title.includes(q) ||
      desc.includes(q) ||
      projectName.includes(q) ||
      assigneeName.includes(q);
    return matchesSearch;
  });

  const statusCounts = {
    all: tasks?.length || 0,
    pending: (tasks || []).filter((t) => t.status === "pending").length,
    in_progress: (tasks || []).filter((t) => t.status === "in_progress").length,
    completed: (tasks || []).filter((t) => t.status === "completed").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  // Calculate total transport statistics
  const totalTransportAmount = (tasks || []).reduce((total, task) => {
    return total + calculateTransportAmount(task);
  }, 0);

  const transportTasksCount = (tasks || []).filter(
    (task) => task.has_transport,
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Manajemen Tugas Lanjutan
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Buat dan kelola tugas dengan alokasi transport untuk anggota tim.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              console.log(
                "🔧 DEBUG: Dialog onOpenChange called with open:",
                open,
              );
              setIsCreateDialogOpen(open);
              if (open) {
                console.log(
                  "🔧 DEBUG: Dialog opening - resetting form in onOpenChange",
                );
                console.log(
                  "🔧 DEBUG: transportAllocated before reset:",
                  transportAllocated,
                );
                // Reset form when opening dialog
                setFormData(initialFormData);
                setTransportAllocated(false);
                console.log("🔧 DEBUG: onOpenChange form reset completed");
                console.log("🔧 DEBUG: transportAllocated after reset:", false);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  console.log(
                    "🔧 DEBUG: DialogTrigger 'Buat Tugas' clicked - resetting form",
                  );
                  console.log(
                    "🔧 DEBUG: transportAllocated before reset:",
                    transportAllocated,
                  );
                  setFormData(initialFormData);
                  setTransportAllocated(false);
                  console.log("🔧 DEBUG: DialogTrigger form reset completed");
                  console.log(
                    "🔧 DEBUG: transportAllocated after reset:",
                    false,
                  );
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-4 py-2 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Buat Tugas
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Buat Tugas Baru</DialogTitle>
                <DialogDescription>
                  Buat tugas dengan rentang tanggal dan opsi alokasi transport.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="project">Proyek *</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        project_id: value,
                        assignee_user_id: "",
                      }));
                    }}
                  >
                    <SelectTrigger className="overflow-hidden">
                      <SelectValue placeholder="Pilih proyek">
                        {formData.project_id
                          ? truncateText(
                              projects?.find(
                                (p) => p.id === formData.project_id,
                              )?.nama_project || "",
                              30,
                            )
                          : "Pilih proyek"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(projects || []).map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <span
                            className="truncate block max-w-full"
                            title={project.nama_project}
                          >
                            {truncateText(project.nama_project, 40)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee Type Selection */}
                <div className="space-y-2">
                  <Label>Tipe Penugasan *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={
                        formData.assignee_type === "member"
                          ? "default"
                          : "outline"
                      }
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          assignee_type: "member",
                          assignee_mitra_id: "",
                          honor_amount: 0,
                        }));
                      }}
                      className={`flex items-center justify-center space-x-2 h-12 ${
                        formData.assignee_type === "member"
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "border-2 border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span>Anggota Tim</span>
                    </Button>
                    <Button
                      type="button"
                      variant={
                        formData.assignee_type === "mitra"
                          ? "default"
                          : "outline"
                      }
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          assignee_type: "mitra",
                          assignee_user_id: "",
                          transport_days: 0,
                          has_transport: false,
                        }));
                      }}
                      className={`flex items-center justify-center space-x-2 h-12 ${
                        formData.assignee_type === "mitra"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "border-2 border-gray-200 hover:border-green-300"
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Mitra</span>
                    </Button>
                  </div>
                </div>

                {/* Team Member Selection */}
                {formData.assignee_type === "member" && (
                  <div className="space-y-2">
                    <Label htmlFor="assignee">Anggota Tim *</Label>
                    <Select
                      value={formData.assignee_user_id}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          assignee_user_id: value,
                        }))
                      }
                      disabled={!formData.project_id || loadingMembers}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingMembers
                              ? "Memuat anggota tim..."
                              : !formData.project_id
                                ? "Pilih proyek terlebih dahulu"
                                : (projectMembers?.length || 0) === 0
                                  ? "Tidak ada anggota tim"
                                  : "Pilih anggota tim"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(projectMembers || []).map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{member.nama_lengkap}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {member.email}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Mitra Selection - Multi Select */}
                {formData.assignee_type === "mitra" && (
                  <div className="space-y-2">
                    <Label htmlFor="mitra">Mitra *</Label>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Cari mitra..."
                        value={mitraSearchTerm}
                        onChange={(e) => setMitraSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto bg-gray-50">
                      {!formData.project_id ? (
                        <div className="text-sm text-gray-500 text-center py-4">
                          Pilih proyek terlebih dahulu
                        </div>
                      ) : loadingMitra ? (
                        <div className="text-sm text-gray-500 text-center py-4">
                          Memuat mitra proyek...
                        </div>
                      ) : (mitraOptions?.length || 0) === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-4">
                          Tidak ada mitra pada proyek ini
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Header */}
                          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600 border-b pb-2">
                            <div className="col-span-1 text-center">✓</div>
                            <div className="col-span-7">Nama Mitra</div>
                            <div className="col-span-4 text-right">
                              Remaining
                            </div>
                          </div>

                          {/* Mitra List */}
                          {(() => {
                            const filteredMitra = (mitraOptions || []).filter(
                              (mitra) => {
                                if (!mitraSearchTerm) return true;
                                return mitra.nama_mitra
                                  .toLowerCase()
                                  .includes(mitraSearchTerm.toLowerCase());
                              },
                            );

                            if (filteredMitra.length === 0 && mitraSearchTerm) {
                              return (
                                <div className="text-sm text-gray-500 text-center py-4">
                                  Tidak ada mitra yang cocok dengan &quot;
                                  {mitraSearchTerm}&quot;
                                </div>
                              );
                            }

                            return filteredMitra.map((mitra) => {
                              // Find mitra budget data from mitraData
                              const mitraBudget = (mitraData || []).find(
                                (m: any) => m.id === mitra.id,
                              );
                              const isSelected =
                                formData.assignee_mitra_ids.includes(mitra.id);

                              return (
                                <div
                                  key={mitra.id}
                                  className="grid grid-cols-12 gap-2 items-center py-2 hover:bg-white rounded px-2 transition-colors"
                                >
                                  {/* Checkbox */}
                                  <div className="col-span-1 flex justify-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setFormData((prev) => ({
                                            ...prev,
                                            assignee_mitra_ids: [
                                              ...prev.assignee_mitra_ids,
                                              mitra.id,
                                            ],
                                          }));
                                        } else {
                                          setFormData((prev) => ({
                                            ...prev,
                                            assignee_mitra_ids:
                                              prev.assignee_mitra_ids.filter(
                                                (id) => id !== mitra.id,
                                              ),
                                          }));
                                        }
                                      }}
                                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                  </div>

                                  {/* Nama Mitra */}
                                  <div className="col-span-7">
                                    <div className="font-medium text-gray-900">
                                      {mitra.nama_mitra}
                                    </div>
                                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                                      <span className="capitalize">
                                        {mitra.jenis}
                                      </span>
                                      {mitra.rating_average > 0 && (
                                        <span>
                                          ★ {mitra.rating_average.toFixed(1)}/5
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Remaining Budget */}
                                  <div className="col-span-4 text-right">
                                    {mitraBudget?.monthly_usage ? (
                                      <div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {formatCurrency(
                                            mitraBudget.monthly_usage
                                              .remaining_limit,
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {mitraBudget.monthly_usage.limit_percentage.toFixed(
                                            1,
                                          )}
                                          % used
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-400">
                                        No data
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Selected Count & Search Results */}
                    <div className="flex justify-between items-center text-sm">
                      {formData.assignee_mitra_ids.length > 0 && (
                        <div className="text-blue-600 font-medium">
                          {formData.assignee_mitra_ids.length} mitra dipilih
                        </div>
                      )}
                      {mitraSearchTerm && (
                        <div className="text-gray-500">
                          {(() => {
                            const filteredCount = (mitraOptions || []).filter(
                              (mitra) => {
                                return mitra.nama_mitra
                                  .toLowerCase()
                                  .includes(mitraSearchTerm.toLowerCase());
                              },
                            ).length;
                            return `${filteredCount} dari ${mitraOptions?.length || 0} mitra`;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">Judul Tugas *</Label>
                  <Input
                    id="title"
                    value={formData.title || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Masukkan judul tugas"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi Tugas *</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Jelaskan tugas secara detail..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Tanggal Mulai *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          start_date: e.target.value,
                        }))
                      }
                      min={selectedProjectDetail?.tanggal_mulai}
                      max={selectedProjectDetail?.deadline}
                    />
                    {selectedProjectDetail && (
                      <div className="text-xs text-gray-500">
                        Proyek:{" "}
                        {new Date(
                          selectedProjectDetail.tanggal_mulai,
                        ).toLocaleDateString("id-ID")}{" "}
                        -{" "}
                        {new Date(
                          selectedProjectDetail.deadline,
                        ).toLocaleDateString("id-ID")}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">Tanggal Selesai *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          end_date: e.target.value,
                        }))
                      }
                      min={
                        formData.start_date ||
                        selectedProjectDetail?.tanggal_mulai
                      }
                      max={selectedProjectDetail?.deadline}
                    />
                  </div>
                </div>

                {/* Satuan System for All Assignee Types */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="satuan_id">Satuan *</Label>
                    <Select
                      value={formData.satuan_id}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          satuan_id: value,
                        }))
                      }
                      disabled={loadingSatuan}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingSatuan
                              ? "Memuat satuan..."
                              : satuanError
                                ? "Error memuat satuan"
                                : "Pilih satuan..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingSatuan ? (
                          <div className="px-2 py-1.5 text-sm text-gray-500">
                            Memuat satuan...
                          </div>
                        ) : satuanError ? (
                          <div className="px-2 py-1.5 text-sm text-red-500">
                            Error: {satuanError.message}
                          </div>
                        ) : (satuanOptions || []).length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-gray-500">
                            Tidak ada satuan tersedia
                          </div>
                        ) : (
                          (satuanOptions || []).map((satuan) => (
                            <SelectItem key={satuan.id} value={satuan.id}>
                              {satuan.nama_satuan}
                              {satuan.deskripsi && (
                                <span className="text-gray-500 ml-2">
                                  - {satuan.deskripsi}
                                </span>
                              )}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rate_per_satuan">Rate Per Satuan *</Label>
                      <div className="flex items-center space-x-3 p-4 border border-blue-200 rounded-xl bg-blue-50">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            Rate Per Satuan
                          </div>
                          <div className="text-sm text-gray-500">
                            Harga per satuan
                          </div>
                        </div>
                        <div className="w-32">
                          <Input
                            id="rate_per_satuan"
                            type="number"
                            min="0"
                            step="1000"
                            value={formData.rate_per_satuan}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                rate_per_satuan: e.target.value,
                              }))
                            }
                            placeholder=""
                            className="text-center"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="volume">Volume *</Label>
                      <div className="flex items-center space-x-3 p-4 border border-green-200 rounded-xl bg-green-50">
                        <MapPin className="w-5 h-5 text-green-600" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            Volume
                          </div>
                          <div className="text-sm text-gray-500">
                            Jumlah satuan
                          </div>
                        </div>
                        <div className="w-24">
                          <Input
                            id="volume"
                            type="number"
                            min="0"
                            value={formData.volume}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                volume: e.target.value,
                              }))
                            }
                            placeholder=""
                            className="text-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Amount Preview */}
                  <div className="space-y-2">
                    <Label>Total Nilai</Label>
                    <div className="flex items-center space-x-3 p-4 border border-purple-200 rounded-xl bg-purple-50">
                      <DollarSign className="w-5 h-5 text-purple-600" />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">
                          Total Nilai
                        </div>
                        <div className="text-sm text-gray-500">
                          {(() => {
                            const rate =
                              typeof formData.rate_per_satuan === "string"
                                ? parseFloat(formData.rate_per_satuan) || 0
                                : formData.rate_per_satuan;
                            const volume =
                              typeof formData.volume === "string"
                                ? parseFloat(formData.volume) || 0
                                : formData.volume;
                            const total = rate * volume;
                            return total > 0
                              ? `${formatCurrency(rate)} × ${volume} = ${formatCurrency(total)}`
                              : "";
                          })()}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-purple-600">
                        {(() => {
                          const rate =
                            typeof formData.rate_per_satuan === "string"
                              ? parseFloat(formData.rate_per_satuan) || 0
                              : formData.rate_per_satuan;
                          const volume =
                            typeof formData.volume === "string"
                              ? parseFloat(formData.volume) || 0
                              : formData.volume;
                          const total = rate * volume;
                          return total > 0 ? formatCurrency(total) : "";
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setFormData(initialFormData);
                    setTransportAllocated(false);
                  }}
                  disabled={creating}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleCreateTask}
                  disabled={creating}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Membuat...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Buat Tugas
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStatus("all");
              setSelectedProject("all");
              setSearchTerm("");
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="w-4 h-4 mr-2" />
            Reset Filter
          </Button>
        </div>
      </div>

      {/* Transport Statistics Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
            <div className="flex items-center text-white text-xl font-semibold">
              <DollarSign className="w-6 h-6 mr-3" />
              {formatCurrency(totalTransportAmount)}
            </div>
            <div className="text-green-100 mt-2 text-sm">
              Total Anggaran Transport
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <div className="flex items-center text-white text-xl font-semibold">
              <MapPin className="w-6 h-6 mr-3" />
              {transportTasksCount}
            </div>
            <div className="text-blue-100 mt-2 text-sm">
              Tugas dengan Transport
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <div className="flex items-center text-white text-xl font-semibold">
              <ClipboardList className="w-6 h-6 mr-3" />
              {statusCounts.all}
            </div>
            <div className="text-purple-100 mt-2 text-sm">Total Tugas</div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Cari tugas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-48 overflow-hidden">
            <SelectValue placeholder="Semua Proyek">
              {selectedProject === "all"
                ? "Semua Proyek"
                : truncateText(
                    projects?.find((p) => p.id === selectedProject)
                      ?.nama_project || "",
                    30,
                  )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Proyek</SelectItem>
            {(projects || []).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <span
                  className="truncate block max-w-full"
                  title={project.nama_project}
                >
                  {truncateText(project.nama_project, 40)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className="border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter Lainnya
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs
        value={selectedStatus}
        onValueChange={setSelectedStatus}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center space-x-2">
            <span>Semua Tugas</span>
            <Badge className="bg-gray-100 text-gray-800 text-xs">
              {statusCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <span>Tertunda</span>
            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
              {statusCounts.pending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="in_progress"
            className="flex items-center space-x-2"
          >
            <span>Berjalan</span>
            <Badge className="bg-blue-100 text-blue-800 text-xs">
              {statusCounts.in_progress}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="flex items-center space-x-2"
          >
            <span>Selesai</span>
            <Badge className="bg-green-100 text-green-800 text-xs">
              {statusCounts.completed}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Tidak ada tugas ditemukan
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm
                    ? "Coba ubah kata pencarian Anda"
                    : "Buat tugas pertama Anda untuk memulai"}
                </p>
                <Button
                  onClick={() => {
                    console.log(
                      "🔧 DEBUG: Button 'Buat Tugas' clicked - resetting form",
                    );
                    console.log(
                      "🔧 DEBUG: transportAllocated before reset:",
                      transportAllocated,
                    );
                    setFormData(initialFormData);
                    setTransportAllocated(false);
                    setIsCreateDialogOpen(true);
                    console.log(
                      "🔧 DEBUG: Form reset completed, opening dialog",
                    );
                    console.log(
                      "🔧 DEBUG: transportAllocated after reset:",
                      false,
                    );
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Buat Tugas
                </Button>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const StatusIcon = getStatusIcon(task.status);
                const transportAllocation =
                  task.task_transport_allocations?.[0];
                const hasActiveTransport =
                  (task.has_transport &&
                    (!transportAllocation ||
                      !transportAllocation.canceled_at)) ||
                  (task.assignee_type === "member" &&
                    task.rate_per_satuan &&
                    task.volume &&
                    task.rate_per_satuan > 0 &&
                    task.volume > 0);

                return (
                  <div
                    key={task.id}
                    className="border-0 shadow-xl rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-white"
                  >
                    {/* Colorful top accent */}
                    <div
                      className={`h-1 bg-gradient-to-r ${
                        task.status === "completed"
                          ? "from-emerald-500 to-green-600"
                          : task.status === "in_progress"
                            ? "from-blue-500 to-indigo-600"
                            : "from-amber-500 to-orange-600"
                      }`}
                    />
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Badge
                              className={`${getStatusColor(task.status)} border flex items-center space-x-1 shadow-sm`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              <span>
                                {task.status.replace("_", " ").toUpperCase()}
                              </span>
                            </Badge>

                            {hasActiveTransport &&
                              calculateTransportAmount(task) > 0 && (
                                <Badge className="bg-white text-gray-800 border-gray-200 flex items-center space-x-1">
                                  <DollarSign className="w-3 h-3" />
                                  <span>
                                    Transport:{" "}
                                    {formatCurrency(
                                      calculateTransportAmount(task),
                                    )}
                                  </span>
                                </Badge>
                              )}

                            {task.assignee_type === "mitra" &&
                              (task.honor_amount || task.total_amount) &&
                              (task.total_amount || 0) > 0 && (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-200 flex items-center space-x-1">
                                  <Building2 className="w-3 h-3" />
                                  <span>
                                    Honor:{" "}
                                    {formatCurrency(
                                      task.total_amount ||
                                        task.honor_amount ||
                                        0,
                                    )}
                                  </span>
                                </Badge>
                              )}

                            <span className="text-sm text-gray-600">
                              {new Date(task.start_date).toLocaleDateString(
                                "id-ID",
                              )}{" "}
                              -{" "}
                              {new Date(task.end_date).toLocaleDateString(
                                "id-ID",
                              )}
                            </span>
                          </div>

                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {task.title}
                          </h3>
                          <p className="text-gray-600 mb-3">
                            {task.deskripsi_tugas}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center space-x-2">
                              {task.assignee_type === "mitra" ? (
                                <Building2 className="w-4 h-4 text-purple-600" />
                              ) : (
                                <Users className="w-4 h-4 text-indigo-600" />
                              )}
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  Ditugaskan kepada
                                </div>
                                <div className="text-gray-600">
                                  {task.assignee_type === "mitra"
                                    ? task.mitra?.nama_mitra ||
                                      "Mitra Tidak Dikenal"
                                    : task.users?.nama_lengkap ||
                                      "Pengguna Tidak Dikenal"}
                                </div>
                                {task.assignee_type === "mitra" &&
                                  task.mitra && (
                                    <div className="text-xs text-purple-600 capitalize">
                                      {task.mitra.jenis}
                                    </div>
                                  )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-emerald-600" />
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  Proyek
                                </div>
                                <div className="text-gray-600">
                                  {task.projects.nama_project}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Honor Amount for Mitra Tasks */}
                          {task.assignee_type === "mitra" &&
                            (task.honor_amount || task.total_amount) &&
                            (task.total_amount || 0) > 0 && (
                              <div className="mb-4 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 flex items-center">
                                      <DollarSign className="w-4 h-4 mr-2" />
                                      Honor
                                    </div>
                                    <div className="text-sm text-gray-700 mt-1">
                                      Pembayaran untuk layanan Mitra
                                    </div>
                                  </div>
                                  <div className="text-lg font-semibold text-gray-800">
                                    {formatCurrency(
                                      task.total_amount ||
                                        task.honor_amount ||
                                        0,
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Transport Status */}
                          {hasActiveTransport &&
                            calculateTransportAmount(task) > 0 && (
                              <div className="mt-4 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 flex items-center">
                                      <MapPin className="w-4 h-4 mr-2" />
                                      Alokasi Transport
                                    </div>
                                    <div className="text-sm text-gray-700 mt-1">
                                      {transportAllocation?.allocation_date
                                        ? `Dialokasikan untuk: ${new Date(transportAllocation.allocation_date).toLocaleDateString("id-ID")}`
                                        : "Menunggu pemilihan tanggal"}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className="text-sm font-semibold text-gray-800">
                                      {formatCurrency(
                                        calculateTransportAmount(task),
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleCancelTransport(task.id)
                                      }
                                      className="border-red-200 text-red-600 hover:bg-red-50"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                          {task.response_pegawai && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <div className="text-sm font-medium text-blue-900 mb-1">
                                Tanggapan:
                              </div>
                              <div className="text-sm text-blue-800">
                                {task.response_pegawai}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleViewTask(task)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Lihat
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-200 text-green-600 hover:bg-green-50"
                            onClick={() => handleEditTask(task)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Ubah
                          </Button>
                          {/* Tombol Selesai untuk task mitra */}
                          {task.assignee_type === "mitra" &&
                            task.status !== "completed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleCompleteTask(task.id)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Selesai
                              </Button>
                            )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setSelectedTask(task);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Hapus
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-gray-400">
                        Dibuat:{" "}
                        {new Date(task.created_at).toLocaleDateString("id-ID")}{" "}
                        • Diperbarui:{" "}
                        {new Date(task.updated_at).toLocaleDateString("id-ID")}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* View Task Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              Complete task information and transport allocation status.
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Status
                    </Label>
                    <div className="mt-1">
                      <Badge
                        className={`${getStatusColor(selectedTask.status)} border flex items-center space-x-1 shadow-sm`}
                      >
                        {(() => {
                          const StatusIcon = getStatusIcon(selectedTask.status);
                          return (
                            <>
                              <StatusIcon className="w-3 h-3" />
                              <span>
                                {selectedTask.status
                                  .replace("_", " ")
                                  .toUpperCase()}
                              </span>
                            </>
                          );
                        })()}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Task Period
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedTask.start_date).toLocaleDateString(
                        "id-ID",
                      )}{" "}
                      -{" "}
                      {new Date(selectedTask.end_date).toLocaleDateString(
                        "id-ID",
                      )}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Assigned To
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTask.assignee_type === "mitra"
                        ? selectedTask.mitra?.nama_mitra || "Unknown Mitra"
                        : selectedTask.users?.nama_lengkap || "Unknown User"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedTask.assignee_type === "mitra"
                        ? selectedTask.mitra?.jenis || ""
                        : selectedTask.users?.email || ""}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Project
                    </Label>
                    <div className="mt-1 p-2 bg-gray-50 rounded-lg max-h-20 overflow-y-auto">
                      <p
                        className="text-sm text-gray-900 break-words"
                        title={selectedTask.projects.nama_project}
                      >
                        {selectedTask.projects.nama_project}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Task Title
                    </Label>
                    <div className="mt-1 p-2 bg-gray-50 rounded-lg max-h-16 overflow-y-auto">
                      <p
                        className="text-lg font-semibold text-gray-900 break-words"
                        title={selectedTask.title}
                      >
                        {selectedTask.title}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Description
                    </Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                      <p
                        className="text-sm text-gray-900 whitespace-pre-wrap break-words"
                        title={selectedTask.deskripsi_tugas}
                      >
                        {selectedTask.deskripsi_tugas}
                      </p>
                    </div>
                  </div>

                  {/* Transport Information */}
                  {(selectedTask.has_transport ||
                    (selectedTask.assignee_type === "member" &&
                      selectedTask.rate_per_satuan &&
                      selectedTask.volume &&
                      selectedTask.rate_per_satuan > 0 &&
                      selectedTask.volume > 0)) &&
                    calculateTransportAmount(selectedTask) > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Alokasi Transport
                        </Label>
                        <div className="mt-1 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-green-900">
                                Jumlah:{" "}
                                {formatCurrency(
                                  calculateTransportAmount(selectedTask),
                                )}
                              </div>
                              {selectedTask.rate_per_satuan &&
                                selectedTask.volume && (
                                  <div className="text-sm text-green-700">
                                    Perhitungan:{" "}
                                    {formatCurrency(
                                      selectedTask.rate_per_satuan,
                                    )}{" "}
                                    × {selectedTask.volume} ={" "}
                                    {formatCurrency(
                                      selectedTask.rate_per_satuan *
                                        selectedTask.volume,
                                    )}
                                  </div>
                                )}
                              <div className="text-sm text-green-700">
                                {selectedTask.task_transport_allocations?.[0]
                                  ?.allocation_date
                                  ? `Tanggal: ${new Date(selectedTask.task_transport_allocations[0].allocation_date).toLocaleDateString("id-ID")}`
                                  : "Menunggu pemilihan tanggal"}
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              {selectedTask.task_transport_allocations?.[0]
                                ?.canceled_at
                                ? "Dibatalkan"
                                : "Aktif"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}

                  {selectedTask.response_pegawai && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Employee Response
                      </Label>
                      <div className="mt-1 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-900 whitespace-pre-wrap">
                          {selectedTask.response_pegawai}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tugas</DialogTitle>
            <DialogDescription>
              Perbarui detail tugas dan alokasi transport.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="edit-project">Proyek *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    project_id: value,
                    assignee_user_id: "",
                  }));
                }}
              >
                <SelectTrigger className="overflow-hidden">
                  <SelectValue placeholder="Pilih proyek">
                    {formData.project_id
                      ? truncateText(
                          projects?.find((p) => p.id === formData.project_id)
                            ?.nama_project || "",
                          30,
                        )
                      : "Pilih proyek"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(projects || []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <span
                        className="truncate block max-w-full"
                        title={project.nama_project}
                      >
                        {truncateText(project.nama_project, 40)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee Type Display (Read-only) */}
            <div className="space-y-2">
              <Label>Tipe Penugasan</Label>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                {formData.assignee_type === "member" ? (
                  <>
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-600 font-medium">
                      Anggota Tim
                    </span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">Mitra</span>
                  </>
                )}
                <span className="text-sm text-gray-500 ml-2">
                  (Tidak dapat diubah)
                </span>
              </div>

              {/* Mitra Budget Info */}
              {formData.assignee_type === "mitra" &&
                formData.assignee_mitra_id &&
                (() => {
                  const mitraBudget = (mitraData || []).find(
                    (m: any) => m.id === formData.assignee_mitra_id,
                  );

                  return mitraBudget?.monthly_usage ? (
                    <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium text-gray-700">
                            Budget Mitra Bulan Ini
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-orange-600">
                            {formatCurrency(
                              mitraBudget.monthly_usage.remaining_limit,
                            )}{" "}
                            remaining
                          </div>
                          <div className="text-xs text-gray-600">
                            {mitraBudget.monthly_usage.limit_percentage.toFixed(
                              1,
                            )}
                            % used this month
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-title">Judul Tugas *</Label>
              <Input
                id="edit-title"
                value={formData.title || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Masukkan judul tugas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Deskripsi Tugas *</Label>
              <Textarea
                id="edit-description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Jelaskan tugas secara detail..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start_date">Tanggal Mulai *</Label>
                <Input
                  id="edit-start_date"
                  type="date"
                  value={formData.start_date || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                  min={selectedProjectDetail?.tanggal_mulai}
                  max={selectedProjectDetail?.deadline}
                />
                {selectedProjectDetail && (
                  <div className="text-xs text-gray-500">
                    Rentang proyek:{" "}
                    {new Date(
                      selectedProjectDetail.tanggal_mulai,
                    ).toLocaleDateString("id-ID")}{" "}
                    -{" "}
                    {new Date(
                      selectedProjectDetail.deadline,
                    ).toLocaleDateString("id-ID")}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end_date">Tanggal Selesai *</Label>
                <Input
                  id="edit-end_date"
                  type="date"
                  value={formData.end_date || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      end_date: e.target.value,
                    }))
                  }
                  min={
                    formData.start_date || selectedProjectDetail?.tanggal_mulai
                  }
                  max={selectedProjectDetail?.deadline}
                />
              </div>
            </div>

            {/* Satuan System for All Assignee Types */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-satuan_id">
                  Satuan *
                  {formData.assignee_type === "member" &&
                    transportAllocated && (
                      <span className="text-orange-600 text-xs ml-2">
                        (Transport sudah dialokasikan - tidak dapat diubah)
                      </span>
                    )}
                </Label>
                <Select
                  value={formData.satuan_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      satuan_id: value,
                    }))
                  }
                  disabled={
                    loadingSatuan ||
                    (formData.assignee_type === "member" && transportAllocated)
                  }
                >
                  <SelectTrigger
                    className={
                      formData.assignee_type === "member" && transportAllocated
                        ? "bg-orange-50 border-orange-200"
                        : ""
                    }
                    onClick={() => {
                      console.log("🔧 DEBUG: Satuan SelectTrigger clicked");
                      console.log("🔧 DEBUG: loadingSatuan:", loadingSatuan);
                      console.log(
                        "🔧 DEBUG: formData.assignee_type:",
                        formData.assignee_type,
                      );
                      console.log(
                        "🔧 DEBUG: transportAllocated:",
                        transportAllocated,
                      );
                      console.log(
                        "🔧 DEBUG: Field disabled:",
                        loadingSatuan ||
                          (formData.assignee_type === "member" &&
                            transportAllocated),
                      );
                    }}
                  >
                    <SelectValue
                      placeholder={
                        loadingSatuan
                          ? "Memuat satuan..."
                          : satuanError
                            ? "Error memuat satuan"
                            : "Pilih satuan..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingSatuan ? (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        Memuat satuan...
                      </div>
                    ) : satuanError ? (
                      <div className="px-2 py-1.5 text-sm text-red-500">
                        Error: {satuanError.message}
                      </div>
                    ) : (satuanOptions || []).length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        Tidak ada satuan tersedia
                      </div>
                    ) : (
                      (satuanOptions || []).map((satuan) => (
                        <SelectItem key={satuan.id} value={satuan.id}>
                          {satuan.nama_satuan}
                          {satuan.deskripsi && (
                            <span className="text-gray-500 ml-2">
                              - {satuan.deskripsi}
                            </span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-rate_per_satuan">
                    Rate Per Satuan *
                    {formData.assignee_type === "member" &&
                      transportAllocated && (
                        <span className="text-orange-600 text-xs ml-2">
                          (Transport sudah dialokasikan - tidak dapat diubah)
                        </span>
                      )}
                  </Label>
                  <div
                    className={`flex items-center space-x-3 p-4 border rounded-xl ${
                      formData.assignee_type === "member" && transportAllocated
                        ? "border-orange-200 bg-orange-50"
                        : "border-blue-200 bg-blue-50"
                    }`}
                  >
                    <DollarSign
                      className={`w-5 h-5 ${
                        formData.assignee_type === "member" &&
                        transportAllocated
                          ? "text-orange-600"
                          : "text-blue-600"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        Rate Per Satuan
                      </div>
                      <div className="text-sm text-gray-500">
                        Harga per satuan
                      </div>
                    </div>
                    <div className="w-32">
                      <Input
                        id="edit-rate_per_satuan"
                        type="number"
                        min="0"
                        step="1000"
                        value={formData.rate_per_satuan}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            rate_per_satuan: e.target.value,
                          }))
                        }
                        placeholder=""
                        className="text-center"
                        disabled={
                          formData.assignee_type === "member" &&
                          transportAllocated
                        }
                        onFocus={() => {
                          console.log(
                            "🔧 DEBUG: Rate Per Satuan field focused",
                          );
                          console.log(
                            "🔧 DEBUG: formData.assignee_type:",
                            formData.assignee_type,
                          );
                          console.log(
                            "🔧 DEBUG: transportAllocated:",
                            transportAllocated,
                          );
                          console.log(
                            "🔧 DEBUG: Field disabled:",
                            formData.assignee_type === "member" &&
                              transportAllocated,
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-volume">
                    Volume *
                    {formData.assignee_type === "member" &&
                      transportAllocated && (
                        <span className="text-orange-600 text-xs ml-2">
                          (Transport sudah dialokasikan - tidak dapat diubah)
                        </span>
                      )}
                  </Label>
                  <div
                    className={`flex items-center space-x-3 p-4 border rounded-xl ${
                      formData.assignee_type === "member" && transportAllocated
                        ? "border-orange-200 bg-orange-50"
                        : "border-green-200 bg-green-50"
                    }`}
                  >
                    <MapPin
                      className={`w-5 h-5 ${
                        formData.assignee_type === "member" &&
                        transportAllocated
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">Volume</div>
                      <div className="text-sm text-gray-500">Jumlah satuan</div>
                    </div>
                    <div className="w-24">
                      <Input
                        id="edit-volume"
                        type="number"
                        min="0"
                        value={formData.volume}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            volume: e.target.value,
                          }))
                        }
                        placeholder=""
                        className="text-center"
                        disabled={
                          formData.assignee_type === "member" &&
                          transportAllocated
                        }
                        onFocus={() => {
                          console.log("🔧 DEBUG: Volume field focused");
                          console.log(
                            "🔧 DEBUG: formData.assignee_type:",
                            formData.assignee_type,
                          );
                          console.log(
                            "🔧 DEBUG: transportAllocated:",
                            transportAllocated,
                          );
                          console.log(
                            "🔧 DEBUG: Field disabled:",
                            formData.assignee_type === "member" &&
                              transportAllocated,
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Amount Preview */}
              <div className="space-y-2">
                <Label>Total Nilai</Label>
                <div className="flex items-center space-x-3 p-4 border border-purple-200 rounded-xl bg-purple-50">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      Total Nilai
                    </div>
                    <div className="text-sm text-gray-500">
                      {(() => {
                        const rate =
                          typeof formData.rate_per_satuan === "string"
                            ? parseFloat(formData.rate_per_satuan) || 0
                            : formData.rate_per_satuan;
                        const volume =
                          typeof formData.volume === "string"
                            ? parseFloat(formData.volume) || 0
                            : formData.volume;
                        const total = rate * volume;
                        return total > 0
                          ? `${formatCurrency(rate)} × ${volume} = ${formatCurrency(total)}`
                          : "";
                      })()}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-purple-600">
                    {(() => {
                      const rate =
                        typeof formData.rate_per_satuan === "string"
                          ? parseFloat(formData.rate_per_satuan) || 0
                          : formData.rate_per_satuan;
                      const volume =
                        typeof formData.volume === "string"
                          ? parseFloat(formData.volume) || 0
                          : formData.volume;
                      const total = rate * volume;
                      return total > 0 ? formatCurrency(total) : "";
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setFormData(initialFormData);
                setSelectedTask(null);
                setTransportAllocated(false);
              }}
              disabled={updating}
            >
              Batal
            </Button>
            <Button
              onClick={handleUpdateTask}
              disabled={updating}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memperbarui...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Perbarui Tugas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hapus Tugas Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tugas</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Apakah Anda yakin ingin menghapus tugas ini? Ini juga akan
                membatalkan semua alokasi transport.
                {selectedTask && (
                  <div className="mt-2 p-3 bg-red-50 rounded-lg">
                    <div className="text-sm font-medium text-red-900">
                      Tugas: {selectedTask.title}
                    </div>
                    <div className="text-sm text-red-800 mt-1">
                      {selectedTask.deskripsi_tugas}
                    </div>
                    <div className="text-xs text-red-700 mt-1">
                      Assigned to:{" "}
                      {selectedTask.assignee_type === "mitra"
                        ? selectedTask.mitra?.nama_mitra || "Unknown Mitra"
                        : selectedTask.users?.nama_lengkap || "Unknown User"}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus Tugas
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mitra Limit Warning Dialog */}
      <AlertDialog
        open={showMitraLimitWarning}
        onOpenChange={setShowMitraLimitWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-orange-600">
              <AlertCircle className="w-6 h-6 mr-2" />
              Peringatan: Limit Mitra Terlampaui
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="text-gray-700">
                  Mitra yang Anda pilih akan{" "}
                  <strong>melampaui limit bulanan</strong> jika tugas ini
                  diberikan.
                </div>
                {pendingMitraAssignment && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Mitra:
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(() => {
                          const mitra = (mitraData || []).find(
                            (m: any) => m.id === pendingMitraAssignment.mitraId,
                          );
                          return mitra?.nama_mitra || "Unknown";
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Total yang akan menjadi:
                      </span>
                      <span className="text-lg font-bold text-orange-600">
                        {formatCurrency(mitraLimitExceededAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-600">
                      <span>Limit Bulanan:</span>
                      <span>
                        {(() => {
                          const mitra = (mitraData || []).find(
                            (m: any) => m.id === pendingMitraAssignment.mitraId,
                          );
                          const currentTotal =
                            mitra?.monthly_usage?.current_total || 0;
                          const limit =
                            (mitra?.monthly_usage?.remaining_limit || 0) +
                            currentTotal;
                          return formatCurrency(limit);
                        })()}
                      </span>
                    </div>
                  </div>
                )}
                <div className="text-gray-700 mt-3">
                  <strong>Apakah Anda yakin ingin melanjutkan?</strong>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowMitraLimitWarning(false);
                setPendingMitraAssignment(null);
              }}
            >
              Tidak, Batalkan
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (isEditDialogOpen) {
                  await proceedWithUpdateTask();
                } else {
                  await proceedWithCreateTask();
                }
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
