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
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  // Removed unused Building2 import
  Calendar,
  CheckCircle,
  Loader2,
  Search,
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

  const fetchTeamData = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/ketua-tim/team-data?include_workload=true",
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch team data");
      }

      setPegawaiData(result.pegawai || []);
      setMitraData(result.mitra || []);
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to load team data");
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
      toast.error("Please fill in all required fields");
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast.error("Please complete all required fields");
      return;
    }

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
        throw new Error(result.error || "Failed to create project");
      }

      toast.success("Project created successfully!");

      // Invalidate related caches so other pages update instantly
      queryClient.invalidateQueries({ queryKey: ["ketua", "projects"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "financial"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "team"] });
      queryClient.invalidateQueries({
        queryKey: ["ketua", "projects", "forTasks"],
      });

      const detailHref = `/ketua-tim/projects/${result.project.id}`;
      router.prefetch(detailHref);
      router.push(detailHref);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create project",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Project Details", icon: Calendar },
    { number: 2, title: "Team Selection", icon: Users },
    { number: 3, title: "Review & Create", icon: CheckCircle },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading team data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Create New Project
        </h1>
        <p className="text-gray-600 text-lg mt-2">
          Follow the steps to create a new project with team assignments and
          budget allocation.
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
                Project Details
              </div>
              <div className="text-blue-100 mt-2 text-sm">
                Enter basic project information and timeline
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nama_project">Project Name *</Label>
                  <Input
                    id="nama_project"
                    value={formData.nama_project}
                    onChange={(e) =>
                      updateFormData("nama_project", e.target.value)
                    }
                    placeholder="Enter project name"
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deskripsi">Project Description *</Label>
                  <Textarea
                    id="deskripsi"
                    value={formData.deskripsi}
                    onChange={(e) =>
                      updateFormData("deskripsi", e.target.value)
                    }
                    placeholder="Describe the project objectives and scope"
                    rows={4}
                    className="text-lg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tanggal_mulai">Start Date *</Label>
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
                    <Label htmlFor="deadline">Deadline *</Label>
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
                Team Selection
              </div>
              <div className="text-green-100 mt-2 text-sm">
                Select team members and partners for this project
              </div>
            </div>
            <div className="p-6 space-y-8">
              {/* Pegawai Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Team Members (Pegawai)
                  </h3>
                  <div className="text-sm text-gray-500">
                    {filteredPegawaiData.length} of {pegawaiData.length} members
                  </div>
                </div>

                {/* Search Input for Pegawai */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search team members by name or email..."
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
                          ? "No team members found matching your search"
                          : "No team members available"}
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    Partners (Mitra)
                  </h3>
                  <div className="text-sm text-gray-500">
                    {filteredMitraData.length} of {mitraData.length} partners
                  </div>
                </div>

                {/* Search Input for Mitra */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search partners by name or type..."
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
                Review & Create
              </div>
              <div className="text-purple-100 mt-2 text-sm">
                Review all project details before creating
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Project Details Review */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Project Details
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div>
                    <strong>Name:</strong> {formData.nama_project}
                  </div>
                  <div>
                    <strong>Description:</strong> {formData.deskripsi}
                  </div>
                  <div>
                    <strong>Start Date:</strong>{" "}
                    {new Date(formData.tanggal_mulai).toLocaleDateString(
                      "id-ID",
                    )}
                  </div>
                  <div>
                    <strong>Deadline:</strong>{" "}
                    {new Date(formData.deadline).toLocaleDateString("id-ID")}
                  </div>
                </div>
              </div>

              {/* Team Review */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Team Assignment
                </h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">
                        Team Members ({formData.pegawai_assignments.length})
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
                        Partners ({formData.mitra_assignments.length})
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
          Previous
        </Button>

        <div className="flex space-x-4">
          <Button
            variant="outline"
            onMouseEnter={() => router.prefetch("/ketua-tim/projects")}
            onClick={() => router.push("/ketua-tim/projects")}
            className="border-2 border-red-200 text-red-600 hover:bg-red-50"
          >
            Cancel
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Next
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
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
