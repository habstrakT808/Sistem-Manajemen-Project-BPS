"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DollarSign,
  Calendar,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Plus,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
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

      projectData.project_assignments?.forEach((assignment: any) => {
        if (assignment.assignee_type === "pegawai") {
          pegawaiIds.push(assignment.assignee_id);
          transportData[assignment.assignee_id] =
            assignment.uang_transport || 0;
        } else if (assignment.assignee_type === "mitra") {
          mitraIds.push(assignment.assignee_id);
          honorData[assignment.assignee_id] = assignment.honor || 0;
        }
      });

      setSelectedPegawai(pegawaiIds);
      setSelectedMitra(mitraIds);
      setPegawaiTransport(transportData);
      setMitraHonor(honorData);
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Failed to load project details");
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
          formData.nama_project.trim() &&
          formData.deskripsi.trim() &&
          formData.tanggal_mulai &&
          formData.deadline
        );
      case 2:
        return selectedPegawai.length > 0 || selectedMitra.length > 0;
      case 3:
        return true; // Financial step always valid (amounts can be 0)
      case 4:
        return true; // Review step always valid
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
      router.push(`/ketua-tim/projects/${projectId}`);
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  const addPegawai = (userId: string) => {
    if (!selectedPegawai.includes(userId)) {
      setSelectedPegawai([...selectedPegawai, userId]);
      setPegawaiTransport({ ...pegawaiTransport, [userId]: 0 });
    }
  };

  const removePegawai = (userId: string) => {
    setSelectedPegawai(selectedPegawai.filter((id) => id !== userId));
    const newTransport = { ...pegawaiTransport };
    delete newTransport[userId];
    setPegawaiTransport(newTransport);
  };

  const addMitra = (mitraId: string) => {
    if (!selectedMitra.includes(mitraId)) {
      setSelectedMitra([...selectedMitra, mitraId]);
      setMitraHonor({ ...mitraHonor, [mitraId]: 0 });
    }
  };

  const removeMitra = (mitraId: string) => {
    setSelectedMitra(selectedMitra.filter((id) => id !== mitraId));
    const newHonor = { ...mitraHonor };
    delete newHonor[mitraId];
    setMitraHonor(newHonor);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Project not found
        </h3>
        <p className="text-gray-500 mb-6">
          The project you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild>
          <Link href="/ketua-tim/projects">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Link>
        </Button>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(formData.status);
  const totalBudget =
    Object.values(pegawaiTransport).reduce((sum, amount) => sum + amount, 0) +
    Object.values(mitraHonor).reduce((sum, amount) => sum + amount, 0);

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
            Back
          </Button>
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Edit Project
              </h1>
              <Badge
                className={`${getStatusColor(formData.status)} border flex items-center space-x-1`}
              >
                <StatusIcon className="w-3 h-3" />
                <span>{formData.status.toUpperCase()}</span>
              </Badge>
            </div>
            <p className="text-gray-600 text-lg">
              Update project details and team assignments
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
            Save Changes
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
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
                  {step === 1 && "Basic Info"}
                  {step === 2 && "Team & Partners"}
                  {step === 3 && "Budget"}
                  {step === 4 && "Review"}
                </div>
              </div>
              {step < 4 && (
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

      {/* Form Content */}
      <Tabs
        value={currentStep.toString()}
        onValueChange={(value) => setCurrentStep(parseInt(value))}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="1">Basic Info</TabsTrigger>
          <TabsTrigger value="2">Team & Partners</TabsTrigger>
          <TabsTrigger value="3">Budget</TabsTrigger>
          <TabsTrigger value="4">Review</TabsTrigger>
        </TabsList>

        {/* Step 1: Basic Information */}
        <TabsContent value="1" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="leading-none font-semibold flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Project Information
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nama_project" className="text-sm font-medium">
                    Project Name *
                  </Label>
                  <Input
                    id="nama_project"
                    value={formData.nama_project}
                    onChange={(e) =>
                      setFormData({ ...formData, nama_project: e.target.value })
                    }
                    placeholder="Enter project name"
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
                      value: "upcoming" | "active" | "completed"
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
                  Description *
                </Label>
                <Textarea
                  id="deskripsi"
                  value={formData.deskripsi}
                  onChange={(e) =>
                    setFormData({ ...formData, deskripsi: e.target.value })
                  }
                  placeholder="Enter project description"
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
                    Start Date *
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
                    Deadline *
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
                  Team Members
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Add Team Member</Label>
                  <Select onValueChange={addPegawai}>
                    <SelectTrigger className="border-2 border-gray-200 focus:border-green-500">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter((user) => !selectedPegawai.includes(user.id))
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.nama_lengkap} ({user.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  {selectedPegawai.map((userId) => {
                    const user = users.find((u) => u.id === userId);
                    return (
                      <div
                        key={userId}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {user?.nama_lengkap?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {user?.nama_lengkap}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user?.email}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePegawai(userId)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Partners */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
                <div className="leading-none font-semibold flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Partners
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Add Partner</Label>
                  <Select onValueChange={addMitra}>
                    <SelectTrigger className="border-2 border-gray-200 focus:border-purple-500">
                      <SelectValue placeholder="Select partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {mitra
                        .filter((m) => !selectedMitra.includes(m.id))
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nama_mitra} ({m.jenis}) - ⭐{" "}
                            {m.rating_average.toFixed(1)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  {selectedMitra.map((mitraId) => {
                    const m = mitra.find((mit) => mit.id === mitraId);
                    return (
                      <div
                        key={mitraId}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {m?.nama_mitra?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {m?.nama_mitra}
                            </div>
                            <div className="text-sm text-gray-500">
                              {m?.jenis} • ⭐ {m?.rating_average.toFixed(1)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMitra(mitraId)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Step 3: Budget */}
        <TabsContent value="3" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Member Transport */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
                <div className="leading-none font-semibold flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Team Member Transport
                </div>
              </div>
              <div className="p-6 space-y-4">
                {selectedPegawai.map((userId) => {
                  const user = users.find((u) => u.id === userId);
                  return (
                    <div key={userId} className="space-y-2">
                      <Label className="text-sm font-medium">
                        {user?.nama_lengkap}
                      </Label>
                      <Input
                        type="number"
                        value={pegawaiTransport[userId] || 0}
                        onChange={(e) =>
                          setPegawaiTransport({
                            ...pegawaiTransport,
                            [userId]: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="Enter transport amount"
                        className="border-2 border-gray-200 focus:border-orange-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Partner Honor */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                <div className="leading-none font-semibold flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Partner Honor
                </div>
              </div>
              <div className="p-6 space-y-4">
                {selectedMitra.map((mitraId) => {
                  const m = mitra.find((mit) => mit.id === mitraId);
                  return (
                    <div key={mitraId} className="space-y-2">
                      <Label className="text-sm font-medium">
                        {m?.nama_mitra}
                      </Label>
                      <Input
                        type="number"
                        value={mitraHonor[mitraId] || 0}
                        onChange={(e) =>
                          setMitraHonor({
                            ...mitraHonor,
                            [mitraId]: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="Enter honor amount"
                        className="border-2 border-gray-200 focus:border-indigo-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Budget Summary */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
              <div className="leading-none font-semibold flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Budget Summary
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-orange-50 rounded-xl">
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {formatCurrency(
                      Object.values(pegawaiTransport).reduce(
                        (sum, amount) => sum + amount,
                        0
                      )
                    )}
                  </div>
                  <div className="text-sm text-orange-700">Total Transport</div>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-xl">
                  <div className="text-2xl font-bold text-indigo-600 mb-1">
                    {formatCurrency(
                      Object.values(mitraHonor).reduce(
                        (sum, amount) => sum + amount,
                        0
                      )
                    )}
                  </div>
                  <div className="text-sm text-indigo-700">Total Honor</div>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                  <div className="text-2xl font-bold text-emerald-600 mb-1">
                    {formatCurrency(totalBudget)}
                  </div>
                  <div className="text-sm text-emerald-700">Total Budget</div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Step 4: Review */}
        <TabsContent value="4" className="space-y-6">
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
                    Project Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
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
                      <span className="text-gray-600">Start Date:</span>
                      <span className="font-medium">
                        {new Date(formData.tanggal_mulai).toLocaleDateString(
                          "id-ID"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deadline:</span>
                      <span className="font-medium">
                        {new Date(formData.deadline).toLocaleDateString(
                          "id-ID"
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Team & Budget
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Team Members:</span>
                      <span className="font-medium">
                        {selectedPegawai.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Partners:</span>
                      <span className="font-medium">
                        {selectedMitra.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Budget:</span>
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(totalBudget)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Description
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
