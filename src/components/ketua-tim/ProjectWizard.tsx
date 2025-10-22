// File: src/components/ketua-tim/ProjectWizard.tsx

"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
// Removed unused Card imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  // Removed unused Building2 import
  Calendar,
  CheckCircle,
  Loader2,
  Search,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface PegawaiData {
  id: string;
  nama_lengkap: string;
  email: string;
  workload: {
    project_count: number;
    workload_level: "low" | "medium" | "high";
  };
}

interface MitraData {
  id: string;
  nama_mitra: string;
  jenis: "perusahaan" | "individu";
  rating_average: number;
  monthly_usage: {
    current_total: number;
    remaining_limit: number;
    limit_percentage: number;
  };
}

interface ProjectFormData {
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  pegawai_assignments: {
    pegawai_id: string;
    uang_transport: number;
  }[];
  mitra_assignments: {
    mitra_id: string;
    honor: number;
  }[];
}

const initialFormData: ProjectFormData = {
  nama_project: "",
  deskripsi: "",
  tanggal_mulai: "",
  deadline: "",
  pegawai_assignments: [],
  mitra_assignments: [],
};

export default function ProjectWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [pegawaiData, setPegawaiData] = useState<PegawaiData[]>([]);
  const [mitraData, setMitraData] = useState<MitraData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPegawai, setSelectedPegawai] = useState<string[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string[]>([]);
  const [pegawaiSearchTerm, setPegawaiSearchTerm] = useState("");
  const [mitraSearchTerm, setMitraSearchTerm] = useState("");
  const [showMitraLimitWarning, setShowMitraLimitWarning] = useState(false);
  const [mitraLimitWarnings, setMitraLimitWarnings] = useState<
    Array<{
      mitraId: string;
      mitraName: string;
      newTotal: number;
      limit: number;
    }>
  >([]);

  const fetchTeamData = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/ketua-tim/team-data?include_workload=true",
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengambil data tim");
      }

      setPegawaiData(result.pegawai || []);
      setMitraData(result.mitra || []);
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("Gagal memuat data tim");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const updateFormData = useCallback(
    (field: keyof ProjectFormData, value: string | number | Array<unknown>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  const getWorkloadColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getWorkloadLabel = (level: string) => {
    switch (level) {
      case "low":
        return "Ringan";
      case "medium":
        return "Sedang";
      case "high":
        return "Berat";
      default:
        return "Unknown";
    }
  };

  // Filtered data based on search terms
  const filteredPegawaiData = useMemo(() => {
    if (!pegawaiSearchTerm.trim()) return pegawaiData;

    const searchLower = pegawaiSearchTerm.toLowerCase();
    return pegawaiData.filter(
      (pegawai) =>
        pegawai.nama_lengkap.toLowerCase().includes(searchLower) ||
        pegawai.email.toLowerCase().includes(searchLower),
    );
  }, [pegawaiData, pegawaiSearchTerm]);

  const filteredMitraData = useMemo(() => {
    if (!mitraSearchTerm.trim()) return mitraData;

    const searchLower = mitraSearchTerm.toLowerCase();
    return mitraData.filter(
      (mitra) =>
        mitra.nama_mitra.toLowerCase().includes(searchLower) ||
        mitra.jenis.toLowerCase().includes(searchLower),
    );
  }, [mitraData, mitraSearchTerm]);

  const handlePegawaiSelection = (pegawaiId: string, checked: boolean) => {
    if (checked) {
      setSelectedPegawai((prev) => [...prev, pegawaiId]);
      setFormData((prev) => ({
        ...prev,
        pegawai_assignments: [
          ...prev.pegawai_assignments,
          { pegawai_id: pegawaiId, uang_transport: 0 },
        ],
      }));
    } else {
      setSelectedPegawai((prev) => prev.filter((id) => id !== pegawaiId));
      setFormData((prev) => ({
        ...prev,
        pegawai_assignments: prev.pegawai_assignments.filter(
          (a) => a.pegawai_id !== pegawaiId,
        ),
      }));
    }
  };

  const handleMitraSelection = (mitraId: string, checked: boolean) => {
    if (checked) {
      setSelectedMitra((prev) => [...prev, mitraId]);
      setFormData((prev) => ({
        ...prev,
        mitra_assignments: [
          ...prev.mitra_assignments,
          { mitra_id: mitraId, honor: 0 },
        ],
      }));
    } else {
      setSelectedMitra((prev) => prev.filter((id) => id !== mitraId));
      setFormData((prev) => ({
        ...prev,
        mitra_assignments: prev.mitra_assignments.filter(
          (a) => a.mitra_id !== mitraId,
        ),
      }));
    }
  };

  // Transport allowance removed - will be handled in task creation

  const _updateMitraHonor = (mitraId: string, amount: number) => {
    setFormData((prev) => ({
      ...prev,
      mitra_assignments: prev.mitra_assignments.map((a) =>
        a.mitra_id === mitraId ? { ...a, honor: amount } : a,
      ),
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.nama_project.trim() &&
          formData.deskripsi.trim() &&
          formData.tanggal_mulai &&
          formData.deadline
        );
      case 2:
        return selectedPegawai.length > 0 || selectedMitra.length > 0;
      case 3:
        // Review & Create step - validate all previous steps
        return !!(
          formData.nama_project.trim() &&
          formData.deskripsi.trim() &&
          formData.tanggal_mulai &&
          formData.deadline &&
          (selectedPegawai.length > 0 || selectedMitra.length > 0)
        );
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    } else {
      toast.error("Harap lengkapi semua field yang wajib diisi");
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const checkMitraLimits = (): boolean => {
    const warnings: Array<{
      mitraId: string;
      mitraName: string;
      newTotal: number;
      limit: number;
    }> = [];

    for (const assignment of formData.mitra_assignments) {
      const mitra = mitraData.find((m) => m.id === assignment.mitra_id);
      if (!mitra?.monthly_usage) continue;

      const currentTotal = mitra.monthly_usage.current_total || 0;
      const newTotal = currentTotal + assignment.honor;
      const limit = (mitra.monthly_usage.remaining_limit || 0) + currentTotal;

      if (newTotal > limit) {
        warnings.push({
          mitraId: mitra.id,
          mitraName: mitra.nama_mitra,
          newTotal,
          limit,
        });
      }
    }

    if (warnings.length > 0) {
      setMitraLimitWarnings(warnings);
      setShowMitraLimitWarning(true);
      return true; // Has warnings
    }

    return false; // No warnings
  };

  const proceedWithSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/ketua-tim/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal membuat proyek");
      }

      toast.success("Proyek berhasil dibuat!");

      // Invalidate related caches so other pages update instantly
      queryClient.invalidateQueries({ queryKey: ["ketua", "projects"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "financial"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "team"] });
      queryClient.invalidateQueries({
        queryKey: ["ketua", "projects", "forTasks"],
      });
      // Also invalidate the old query key for backward compatibility
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      // Invalidate project mitra cache so task creation dropdown updates
      queryClient.invalidateQueries({ queryKey: ["project-mitra"] });
      queryClient.invalidateQueries({
        queryKey: ["project-mitra", result.project.id],
      });

      const detailHref = `/ketua-tim/projects/${result.project.id}`;
      router.prefetch(detailHref);
      router.push(detailHref);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal membuat proyek",
      );
    } finally {
      setSubmitting(false);
      setShowMitraLimitWarning(false);
      setMitraLimitWarnings([]);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast.error("Harap lengkapi semua field yang wajib diisi");
      return;
    }

    // Check mitra limits first
    const hasWarnings = checkMitraLimits();
    if (hasWarnings) {
      return; // Show warning dialog, user must confirm
    }

    // No warnings, proceed directly
    await proceedWithSubmit();
  };

  const steps = [
    { number: 1, title: "Detail Proyek", icon: Calendar },
    { number: 2, title: "Pemilihan Tim", icon: Users },
    { number: 3, title: "Tinjau & Buat", icon: CheckCircle },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Memuat data tim...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Buat Proyek Baru
        </h1>
        <p className="text-gray-600 text-lg mt-2">
          Ikuti langkah-langkah untuk membuat proyek baru beserta penugasan tim
          dan alokasi anggaran.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <div key={step.number} className="flex items-center">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                  isCompleted
                    ? "bg-green-500 border-green-500 text-white"
                    : isActive
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <IconComponent className="w-6 h-6" />
                )}
              </div>
              <div className="ml-3">
                <div
                  className={`font-semibold ${
                    isActive
                      ? "text-blue-600"
                      : isCompleted
                        ? "text-green-600"
                        : "text-gray-400"
                  }`}
                >
                  {step.title}
                </div>
                <div className="text-sm text-gray-500">Step {step.number}</div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-8 ${
                    currentStep > step.number ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="border-0 shadow-xl rounded-xl overflow-hidden">
        {/* Step 1: Project Details */}
        {currentStep === 1 && (
          <div>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <div className="flex items-center text-white text-xl font-semibold">
                <Calendar className="w-6 h-6 mr-3" />
                Detail Proyek
              </div>
              <div className="text-blue-100 mt-2 text-sm">
                Masukkan informasi dasar proyek dan lini masa
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nama_project">Nama Proyek *</Label>
                  <Input
                    id="nama_project"
                    value={formData.nama_project}
                    onChange={(e) =>
                      updateFormData("nama_project", e.target.value)
                    }
                    placeholder="Masukkan nama proyek"
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deskripsi">Deskripsi Proyek *</Label>
                  <Textarea
                    id="deskripsi"
                    value={formData.deskripsi}
                    onChange={(e) =>
                      updateFormData("deskripsi", e.target.value)
                    }
                    placeholder="Jelaskan tujuan dan ruang lingkup proyek"
                    rows={4}
                    className="text-lg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tanggal_mulai">Tanggal Mulai *</Label>
                    <Input
                      id="tanggal_mulai"
                      type="date"
                      value={formData.tanggal_mulai}
                      onChange={(e) =>
                        updateFormData("tanggal_mulai", e.target.value)
                      }
                      className="text-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline">Tenggat Waktu *</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) =>
                        updateFormData("deadline", e.target.value)
                      }
                      className="text-lg"
                      min={formData.tanggal_mulai}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Team Selection */}
        {currentStep === 2 && (
          <div>
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
              <div className="flex items-center text-white text-xl font-semibold">
                <Users className="w-6 h-6 mr-3" />
                Pemilihan Tim
              </div>
              <div className="text-green-100 mt-2 text-sm">
                Pilih anggota tim dan mitra untuk proyek ini
              </div>
            </div>
            <div className="p-6 space-y-8">
              {/* Pegawai Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Anggota Tim (Pegawai)
                  </h3>
                  <div className="text-sm text-gray-500">
                    {filteredPegawaiData.length} dari {pegawaiData.length}{" "}
                    anggota
                  </div>
                </div>

                {/* Search Input for Pegawai */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Cari anggota tim berdasarkan nama atau email..."
                    value={pegawaiSearchTerm}
                    onChange={(e) => setPegawaiSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-200 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                  {filteredPegawaiData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p>
                        {pegawaiSearchTerm.trim()
                          ? "Tidak ada anggota tim yang sesuai dengan pencarian"
                          : "Tidak ada anggota tim"}
                      </p>
                    </div>
                  ) : (
                    filteredPegawaiData.map((pegawai) => (
                      <div
                        key={pegawai.id}
                        className="flex items-center p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                      >
                        <Checkbox
                          id={`pegawai-${pegawai.id}`}
                          checked={selectedPegawai.includes(pegawai.id)}
                          onCheckedChange={(checked) =>
                            handlePegawaiSelection(
                              pegawai.id,
                              checked as boolean,
                            )
                          }
                          className="mr-4"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {pegawai.nama_lengkap}
                          </div>
                          <div className="text-sm text-gray-500">
                            {pegawai.email}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            className={`${getWorkloadColor(pegawai.workload.workload_level)} border`}
                          >
                            {getWorkloadLabel(pegawai.workload.workload_level)}{" "}
                            ({pegawai.workload.project_count})
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Mitra Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Mitra</h3>
                  <div className="text-sm text-gray-500">
                    {filteredMitraData.length} dari {mitraData.length} mitra
                  </div>
                </div>

                {/* Search Input for Mitra */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Cari mitra berdasarkan nama atau jenis..."
                    value={mitraSearchTerm}
                    onChange={(e) => setMitraSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-200 focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                  {filteredMitraData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p>
                        {mitraSearchTerm.trim()
                          ? "No partners found matching your search"
                          : "No partners available"}
                      </p>
                    </div>
                  ) : (
                    filteredMitraData.map((mitra) => (
                      <div
                        key={mitra.id}
                        className="flex items-center p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
                      >
                        <Checkbox
                          id={`mitra-${mitra.id}`}
                          checked={selectedMitra.includes(mitra.id)}
                          onCheckedChange={(checked) =>
                            handleMitraSelection(mitra.id, checked as boolean)
                          }
                          className="mr-4"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {mitra.nama_mitra}
                          </div>
                          <div className="text-sm text-gray-500">
                            {mitra.jenis} • Rating:{" "}
                            {mitra.rating_average.toFixed(1)}/5
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(
                              mitra.monthly_usage.remaining_limit,
                            )}{" "}
                            remaining
                          </div>
                          <div className="text-xs text-gray-500">
                            {mitra.monthly_usage.limit_percentage.toFixed(1)}%
                            used this month
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review & Create */}
        {currentStep === 3 && (
          <div>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
              <div className="flex items-center text-white text-xl font-semibold">
                <CheckCircle className="w-6 h-6 mr-3" />
                Tinjau & Buat
              </div>
              <div className="text-purple-100 mt-2 text-sm">
                Tinjau semua detail proyek sebelum membuat
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Project Details Review */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detail Proyek
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div>
                    <strong>Nama:</strong> {formData.nama_project}
                  </div>
                  <div>
                    <strong>Deskripsi:</strong> {formData.deskripsi}
                  </div>
                  <div>
                    <strong>Tanggal Mulai:</strong>{" "}
                    {new Date(formData.tanggal_mulai).toLocaleDateString(
                      "id-ID",
                    )}
                  </div>
                  <div>
                    <strong>Tenggat Waktu:</strong>{" "}
                    {new Date(formData.deadline).toLocaleDateString("id-ID")}
                  </div>
                </div>
              </div>

              {/* Team Review */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Penugasan Tim
                </h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">
                        Anggota Tim ({formData.pegawai_assignments.length})
                      </h4>
                      <ul className="space-y-1">
                        {formData.pegawai_assignments.map((assignment) => {
                          const pegawai = pegawaiData.find(
                            (p) => p.id === assignment.pegawai_id,
                          );
                          return (
                            <li key={assignment.pegawai_id} className="text-sm">
                              {pegawai?.nama_lengkap}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">
                        Mitra ({formData.mitra_assignments.length})
                      </h4>
                      <ul className="space-y-1">
                        {formData.mitra_assignments.map((assignment) => {
                          const mitra = mitraData.find(
                            (m) => m.id === assignment.mitra_id,
                          );
                          return (
                            <li key={assignment.mitra_id} className="text-sm">
                              {mitra?.nama_mitra}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Sebelumnya
        </Button>

        <div className="flex space-x-4">
          <Button
            variant="outline"
            onMouseEnter={() => router.prefetch("/ketua-tim/projects")}
            onClick={() => router.push("/ketua-tim/projects")}
            className="border-2 border-red-200 text-red-600 hover:bg-red-50"
          >
            Batal
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Berikutnya
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !validateStep(currentStep)}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Membuat...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Buat Proyek
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Mitra Limit Warning Dialog */}
      <AlertDialog
        open={showMitraLimitWarning}
        onOpenChange={setShowMitraLimitWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-orange-600">
              <AlertTriangle className="w-6 h-6 mr-2" />
              Peringatan: Limit Mitra Terlampaui
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="text-gray-700">
                  {mitraLimitWarnings.length} mitra akan{" "}
                  <strong>melampaui limit bulanan</strong> jika proyek ini
                  dibuat.
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {mitraLimitWarnings.map((warning) => (
                    <div
                      key={warning.mitraId}
                      className="p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">
                          Mitra:
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {warning.mitraName}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">
                          Total yang akan menjadi:
                        </span>
                        <span className="text-lg font-bold text-orange-600">
                          {formatCurrency(warning.newTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-600">
                        <span>Limit Bulanan:</span>
                        <span>{formatCurrency(warning.limit)}</span>
                      </div>
                    </div>
                  ))}
                </div>
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
                setMitraLimitWarnings([]);
              }}
            >
              Tidak, Batalkan
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await proceedWithSubmit();
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
