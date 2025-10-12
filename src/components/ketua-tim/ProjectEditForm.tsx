"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Users,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
} from "lucide-react";

import { toast } from "sonner";
import Link from "next/link";

interface ProjectData {
  id: string;
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  status: "upcoming" | "active" | "completed";
  created_at: string;
  project_assignments: Array<{
    id: string;
    assignee_type: "pegawai" | "mitra";
    assignee_id: string;
    uang_transport: number | null;
    honor: number | null;
    users?: { id: string; nama_lengkap: string; email: string };
    mitra?: {
      id: string;
      nama_mitra: string;
      jenis: string;
      rating_average: number;
    };
  }>;
}

interface User {
  id: string;
  nama_lengkap: string;
  email: string;
}

interface Mitra {
  id: string;
  nama_mitra: string;
  jenis: string;
  rating_average: number;
}

interface ProjectEditFormProps {
  projectId: string;
}

export default function ProjectEditForm({ projectId }: ProjectEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [mitra, setMitra] = useState<Mitra[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    nama_project: "",
    deskripsi: "",
    tanggal_mulai: "",
    deadline: "",
    status: "upcoming" as "upcoming" | "active" | "completed",
  });

  const [selectedPegawai, setSelectedPegawai] = useState<string[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string[]>([]);
  const [pegawaiTransport, setPegawaiTransport] = useState<
    Record<string, number>
  >({});
  const [mitraHonor, setMitraHonor] = useState<Record<string, number>>({});
  const [pegawaiSearchTerm, setPegawaiSearchTerm] = useState("");
  const [mitraSearchTerm, setMitraSearchTerm] = useState("");

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ketua-tim/projects/${projectId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch project");
      }

      const projectData = result.data;
      setProject(projectData);

      // Populate form data
      setFormData({
        nama_project: projectData.nama_project || "",
        deskripsi: projectData.deskripsi || "",
        tanggal_mulai: projectData.tanggal_mulai
          ? new Date(projectData.tanggal_mulai).toISOString().split("T")[0]
          : "",
        deadline: projectData.deadline
          ? new Date(projectData.deadline).toISOString().split("T")[0]
          : "",
        status: projectData.status || "upcoming",
      });

      // Populate assignments
      const pegawaiIds: string[] = [];
      const mitraIds: string[] = [];
      const transportData: Record<string, number> = {};
      const honorData: Record<string, number> = {};

      projectData.project_assignments?.forEach(
        (assignment: {
          assignee_type: string;
          assignee_id: string;
          uang_transport?: number;
          honor?: number;
        }) => {
          if (assignment.assignee_type === "pegawai") {
            pegawaiIds.push(assignment.assignee_id);
            transportData[assignment.assignee_id] =
              assignment.uang_transport || 0;
          } else if (assignment.assignee_type === "mitra") {
            mitraIds.push(assignment.assignee_id);
            honorData[assignment.assignee_id] = assignment.honor || 0;
          }
        },
      );

      setSelectedPegawai(pegawaiIds);
      setSelectedMitra(mitraIds);
      setPegawaiTransport(transportData);
      setMitraHonor(honorData);
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Failed to load project details");
      router.prefetch("/ketua-tim/projects");
      router.push("/ketua-tim/projects");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  const fetchUsersAndMitra = useCallback(async () => {
    try {
      const [usersResponse, mitraResponse] = await Promise.all([
        fetch("/api/ketua-tim/team"),
        fetch("/api/admin/mitra"),
      ]);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.data || []);
      }

      if (mitraResponse.ok) {
        const mitraData = await mitraResponse.json();
        setMitra(mitraData.data || []);
      }
    } catch (error) {
      console.error("Error fetching users and mitra:", error);
    }
  }, []);

  useEffect(() => {
    fetchProject();
    fetchUsersAndMitra();
  }, [fetchProject, fetchUsersAndMitra]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "upcoming":
        return Clock;
      case "active":
        return AlertTriangle;
      case "completed":
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.nama_project &&
          formData.deskripsi &&
          formData.tanggal_mulai &&
          formData.deadline
        );
      case 2:
        return selectedPegawai.length > 0;
      case 3:
        return true; // Review step is always valid
      default:
        return false;
    }
  };

  const handleSave = async () => {
    if (!validateStep(currentStep)) {
      toast.error("Please complete all required fields");
      return;
    }

    setSaving(true);
    try {
      const assignments = [
        ...selectedPegawai.map((userId) => ({
          assignee_type: "pegawai" as const,
          assignee_id: userId,
          uang_transport: pegawaiTransport[userId] || 0,
          honor: null,
        })),
        ...selectedMitra.map((mitraId) => ({
          assignee_type: "mitra" as const,
          assignee_id: mitraId,
          uang_transport: null,
          honor: mitraHonor[mitraId] || 0,
        })),
      ];

      const response = await fetch(`/api/ketua-tim/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          project_assignments: assignments,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update project");
      }

      toast.success("Project updated successfully!");

      // Invalidate related caches so other pages update instantly
      queryClient.invalidateQueries({ queryKey: ["ketua", "projects"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "financial"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "team"] });

      const detailHref = `/ketua-tim/projects/${projectId}`;
      router.prefetch(detailHref);
      router.push(detailHref);
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  const handlePegawaiSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedPegawai([...selectedPegawai, userId]);
      setPegawaiTransport({ ...pegawaiTransport, [userId]: 0 });
    } else {
      setSelectedPegawai(selectedPegawai.filter((id) => id !== userId));
      const newTransport = { ...pegawaiTransport };
      delete newTransport[userId];
      setPegawaiTransport(newTransport);
    }
  };

  const handleMitraSelection = (mitraId: string, checked: boolean) => {
    if (checked) {
      setSelectedMitra([...selectedMitra, mitraId]);
      setMitraHonor({ ...mitraHonor, [mitraId]: 0 });
    } else {
      setSelectedMitra(selectedMitra.filter((id) => id !== mitraId));
      const newHonor = { ...mitraHonor };
      delete newHonor[mitraId];
      setMitraHonor(newHonor);
    }
  };

  // Filter and sort users - selected first, then alphabetically
  const filteredUsers = React.useMemo(() => {
    let filtered = users;

    // Apply search filter
    if (pegawaiSearchTerm.trim()) {
      const searchLower = pegawaiSearchTerm.toLowerCase();
      filtered = users.filter(
        (user) =>
          user.nama_lengkap.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower),
      );
    }

    // Sort: selected first, then alphabetically by name
    return filtered.sort((a, b) => {
      const aSelected = selectedPegawai.includes(a.id);
      const bSelected = selectedPegawai.includes(b.id);

      // Selected items first
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      // Alphabetically by name
      return a.nama_lengkap.localeCompare(b.nama_lengkap, "id");
    });
  }, [users, pegawaiSearchTerm, selectedPegawai]);

  // Filter and sort mitra - selected first, then alphabetically
  const filteredMitra = React.useMemo(() => {
    let filtered = mitra;

    // Apply search filter
    if (mitraSearchTerm.trim()) {
      const searchLower = mitraSearchTerm.toLowerCase();
      filtered = mitra.filter(
        (m) =>
          m.nama_mitra.toLowerCase().includes(searchLower) ||
          m.jenis.toLowerCase().includes(searchLower),
      );
    }

    // Sort: selected first, then alphabetically by name
    return filtered.sort((a, b) => {
      const aSelected = selectedMitra.includes(a.id);
      const bSelected = selectedMitra.includes(b.id);

      // Selected items first
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      // Alphabetically by name
      return a.nama_mitra.localeCompare(b.nama_mitra, "id");
    });
  }, [mitra, mitraSearchTerm, selectedMitra]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Memuat detail proyek...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Proyek tidak ditemukan
        </h3>
        <p className="text-gray-500 mb-6">Proyek yang Anda cari tidak ada.</p>
        <Button asChild>
          <Link href="/ketua-tim/projects">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Proyek
          </Link>
        </Button>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(formData.status);
  // Remove budget calculation since we're removing the budget tab
  // const totalBudget =
  //   Object.values(pegawaiTransport).reduce((sum, amount) => sum + amount, 0) +
  //   Object.values(mitraHonor).reduce((sum, amount) => sum + amount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Ubah Proyek
              </h1>
              <Badge
                className={`${getStatusColor(formData.status)} border flex items-center space-x-1`}
              >
                <StatusIcon className="w-3 h-3" />
                <span>{formData.status.toUpperCase()}</span>
              </Badge>
            </div>
            <p className="text-gray-600 text-lg">
              Perbarui detail proyek dan penugasan tim
            </p>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button
            onClick={handleSave}
            disabled={saving || !validateStep(currentStep)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </div>

      {/* Progress Steps - Updated to 3 steps */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step <= currentStep
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step}
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">
                  {step === 1 && "Informasi Dasar"}
                  {step === 2 && "Tim & Mitra"}
                  {step === 3 && "Tinjau"}
                </div>
              </div>
              {step < 3 && (
                <div
                  className={`w-16 h-1 mx-4 ${
                    step < currentStep
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content - Updated to 3 tabs */}
      <Tabs
        value={currentStep.toString()}
        onValueChange={(value) => setCurrentStep(parseInt(value))}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="1">Informasi Dasar</TabsTrigger>
          <TabsTrigger value="2">Tim & Mitra</TabsTrigger>
          <TabsTrigger value="3">Tinjau</TabsTrigger>
        </TabsList>

        {/* Step 1: Basic Information */}
        <TabsContent value="1" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="leading-none font-semibold flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Informasi Proyek
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nama_project" className="text-sm font-medium">
                    Nama Proyek *
                  </Label>
                  <Input
                    id="nama_project"
                    value={formData.nama_project}
                    onChange={(e) =>
                      setFormData({ ...formData, nama_project: e.target.value })
                    }
                    placeholder="Masukkan nama proyek"
                    className="border-2 border-gray-200 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(
                      value: "upcoming" | "active" | "completed",
                    ) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="border-2 border-gray-200 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deskripsi" className="text-sm font-medium">
                  Deskripsi *
                </Label>
                <Textarea
                  id="deskripsi"
                  value={formData.deskripsi}
                  onChange={(e) =>
                    setFormData({ ...formData, deskripsi: e.target.value })
                  }
                  placeholder="Masukkan deskripsi proyek"
                  rows={4}
                  className="border-2 border-gray-200 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="tanggal_mulai"
                    className="text-sm font-medium"
                  >
                    Tanggal Mulai *
                  </Label>
                  <Input
                    id="tanggal_mulai"
                    type="date"
                    value={formData.tanggal_mulai}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tanggal_mulai: e.target.value,
                      })
                    }
                    className="border-2 border-gray-200 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline" className="text-sm font-medium">
                    Tenggat Waktu *
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                    className="border-2 border-gray-200 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Step 2: Team & Partners */}
        <TabsContent value="2" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Members */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6">
                <div className="leading-none font-semibold flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Anggota Tim
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Search Input for Pegawai */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Anggota Tim (Pegawai)
                    </Label>
                    <div className="text-sm text-gray-500">
                      {selectedPegawai.length} dipilih
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Cari anggota tim berdasarkan nama atau email..."
                      value={pegawaiSearchTerm}
                      onChange={(e) => setPegawaiSearchTerm(e.target.value)}
                      className="pl-10 border-2 border-gray-200 focus:border-green-500"
                    />
                  </div>
                </div>

                {/* Live Search Results */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p>
                        {pegawaiSearchTerm.trim()
                          ? "Tidak ada anggota tim yang sesuai dengan pencarian"
                          : "Tidak ada anggota tim"}
                      </p>
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center p-3 border rounded-lg transition-all duration-200 ${
                          selectedPegawai.includes(user.id)
                            ? "border-green-300 bg-green-50"
                            : "border-gray-200 hover:border-green-300 hover:bg-green-50"
                        }`}
                      >
                        <Checkbox
                          id={`pegawai-${user.id}`}
                          checked={selectedPegawai.includes(user.id)}
                          onCheckedChange={(checked) =>
                            handlePegawaiSelection(user.id, checked as boolean)
                          }
                          className="mr-3"
                        />
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {user.nama_lengkap.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {user.nama_lengkap}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Partners */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
                <div className="leading-none font-semibold flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Mitra
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Search Input for Mitra */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Mitra</Label>
                    <div className="text-sm text-gray-500">
                      {selectedMitra.length} dipilih
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Cari mitra berdasarkan nama atau jenis..."
                      value={mitraSearchTerm}
                      onChange={(e) => setMitraSearchTerm(e.target.value)}
                      className="pl-10 border-2 border-gray-200 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Live Search Results */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredMitra.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p>
                        {mitraSearchTerm.trim()
                          ? "Tidak ada mitra yang sesuai dengan pencarian"
                          : "Tidak ada mitra"}
                      </p>
                    </div>
                  ) : (
                    filteredMitra.map((m) => (
                      <div
                        key={m.id}
                        className={`flex items-center p-3 border rounded-lg transition-all duration-200 ${
                          selectedMitra.includes(m.id)
                            ? "border-purple-300 bg-purple-50"
                            : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                        }`}
                      >
                        <Checkbox
                          id={`mitra-${m.id}`}
                          checked={selectedMitra.includes(m.id)}
                          onCheckedChange={(checked) =>
                            handleMitraSelection(m.id, checked as boolean)
                          }
                          className="mr-3"
                        />
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {m.nama_mitra.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {m.nama_mitra}
                            </div>
                            <div className="text-sm text-gray-500">
                              {m.jenis} • ⭐ {m.rating_average.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Step 3: Review */}
        <TabsContent value="3" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-gray-600 to-slate-600 text-white p-6">
              <div className="leading-none font-semibold flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Review & Save
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Penugasan Tim
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Anggota Tim:</span>
                      <span className="font-medium">
                        {selectedPegawai.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mitra:</span>
                      <span className="font-medium">
                        {selectedMitra.length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detail Proyek
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nama:</span>
                      <span className="font-medium">
                        {formData.nama_project}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className={getStatusColor(formData.status)}>
                        {formData.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tanggal Mulai:</span>
                      <span className="font-medium">
                        {new Date(formData.tanggal_mulai).toLocaleDateString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tenggat Waktu:</span>
                      <span className="font-medium">
                        {new Date(formData.deadline).toLocaleDateString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Deskripsi
                </h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {formData.deskripsi}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
