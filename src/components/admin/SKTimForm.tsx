"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Eye,
  Download,
  FileText,
  Plus,
  Trash2,
  Building,
  User as UserIcon,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Project {
  id: string;
  nama_project: string;
  created_at: string;
  ketua_tim_id: string;
}

interface Task {
  id: string;
  title: string;
  project_id: string;
  assignee_type: "pegawai" | "mitra";
  assignee_user_id?: string;
  assignee_mitra_id?: string;
}

interface Pegawai {
  id: string;
  nama_lengkap: string;
  nip?: string;
}

interface Mitra {
  id: string;
  nama_mitra: string;
  sobat_id?: string;
}

interface TeamMember {
  id: string;
  type: "pegawai" | "mitra";
  personId: string;
  personName: string;
  nipOrSobat: string;
  taskId: string;
  taskTitle: string;
}

interface FormData {
  nomorSK: string;
  projectId: string;
  kotaKabupaten: string;
  tanggalPenetapan: string;
  masaKerjaAkhir: string;
  namaKetua: string;
  teamMembers: TeamMember[];
}

export function SKTimForm() {
  const _router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [mitraList, setMitraList] = useState<Mitra[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    nomorSK: "",
    projectId: "",
    kotaKabupaten: "Kota Batu",
    tanggalPenetapan: "",
    masaKerjaAkhir: "",
    namaKetua: "",
    teamMembers: [],
  });

  // Fetch initial data
  useEffect(() => {
    fetchProjects();
    fetchPegawai();
    fetchMitra();
  }, []);

  // Fetch tasks when project changes
  useEffect(() => {
    if (formData.projectId) {
      fetchTasks(formData.projectId);
    }
  }, [formData.projectId]);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/admin/export/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Gagal memuat data project");
    }
  };

  const fetchTasks = async (projectId: string) => {
    try {
      const response = await fetch(
        `/api/admin/export/tasks?projectId=${projectId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Gagal memuat data tasks");
    }
  };

  const fetchPegawai = async () => {
    try {
      const response = await fetch("/api/admin/export/pegawai");
      if (response.ok) {
        const data = await response.json();
        setPegawaiList(data);
      }
    } catch (error) {
      console.error("Error fetching pegawai:", error);
      toast.error("Gagal memuat data pegawai");
    }
  };

  const fetchMitra = async () => {
    try {
      const response = await fetch("/api/admin/export/mitra");
      if (response.ok) {
        const data = await response.json();
        setMitraList(data);
      }
    } catch (error) {
      console.error("Error fetching mitra:", error);
      toast.error("Gagal memuat data mitra");
    }
  };

  const addTeamMember = () => {
    const newMember: TeamMember = {
      id: `temp-${Date.now()}`,
      type: "pegawai",
      personId: "",
      personName: "",
      nipOrSobat: "",
      taskId: "",
      taskTitle: "",
    };
    setFormData({
      ...formData,
      teamMembers: [...formData.teamMembers, newMember],
    });
  };

  const removeTeamMember = (id: string) => {
    setFormData({
      ...formData,
      teamMembers: formData.teamMembers.filter((m) => m.id !== id),
    });
  };

  const updateTeamMember = (
    id: string,
    field: keyof TeamMember,
    value: string,
  ) => {
    setFormData({
      ...formData,
      teamMembers: formData.teamMembers.map((member) => {
        if (member.id === id) {
          const updated = { ...member, [field]: value };

          // Auto-fill name and NIP/SOBAT when person is selected
          if (field === "personId") {
            // Reset task selection when person changes
            updated.taskId = "";
            updated.taskTitle = "";

            if (member.type === "pegawai") {
              const pegawai = pegawaiList.find((p) => p.id === value);
              if (pegawai) {
                updated.personName = pegawai.nama_lengkap;
                updated.nipOrSobat = pegawai.nip || "-";
              }
            } else {
              const mitra = mitraList.find((m) => m.id === value);
              if (mitra) {
                updated.personName = mitra.nama_mitra;
                updated.nipOrSobat = mitra.sobat_id || "-";
              }
            }
          }

          // Auto-fill task title when task is selected
          if (field === "taskId") {
            const task = tasks.find((t) => t.id === value);
            if (task) {
              updated.taskTitle = task.title;
            }
          }

          // Reset person selection when type changes
          if (field === "type") {
            updated.personId = "";
            updated.personName = "";
            updated.nipOrSobat = "";
            updated.taskId = "";
            updated.taskTitle = "";
          }

          return updated;
        }
        return member;
      }),
    });
  };

  const handlePreview = () => {
    // Validate form
    if (
      !formData.nomorSK ||
      !formData.projectId ||
      !formData.tanggalPenetapan
    ) {
      toast.error("Mohon lengkapi data yang diperlukan");
      return;
    }
    setShowPreview(true);
  };

  const handleExport = async (format: "docx") => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/export/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sk-tim",
          format,
          data: formData,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `SK-Tim-${formData.nomorSK}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Berhasil export ${format.toUpperCase()}!`);
      } else {
        const errorData = await response.json();
        console.error("Export error:", errorData);
        throw new Error(errorData.error || "Export failed");
      }
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Gagal export dokumen");
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === formData.projectId);
  const projectYear = selectedProject
    ? new Date(selectedProject.created_at).getFullYear()
    : new Date().getFullYear();
  const projectName = selectedProject?.nama_project || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin/export">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <FileText className="w-8 h-8 mr-3 text-blue-600" />
                  SK Tim Pelaksana
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Surat Keputusan Tim Pelaksana Kegiatan Pendataan
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handlePreview}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showPreview ? (
          <>
            {/* Form Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Card className="shadow-xl pt-0">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 border-b pt-2 rounded-t-xl">
                    <CardTitle className="text-lg font-semibold text-white flex items-center">
                      <Building className="w-5 h-5 mr-2 text-white" />
                      Informasi Dasar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nomorSK">Nomor SK *</Label>
                        <Input
                          id="nomorSK"
                          placeholder="14 Tahun 2025"
                          value={formData.nomorSK}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nomorSK: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="kotaKabupaten">Kota/Kabupaten *</Label>
                        <Input
                          id="kotaKabupaten"
                          placeholder="Kota Batu"
                          value={formData.kotaKabupaten}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              kotaKabupaten: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="projectId">Pilih Project *</Label>
                      <Select
                        value={formData.projectId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, projectId: value })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Pilih project..." />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.nama_project}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="tanggalPenetapan">
                          Tanggal Penetapan *
                        </Label>
                        <Input
                          id="tanggalPenetapan"
                          type="date"
                          value={formData.tanggalPenetapan}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              tanggalPenetapan: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="masaKerjaAkhir">
                          Masa Kerja Berakhir *
                        </Label>
                        <Input
                          id="masaKerjaAkhir"
                          type="date"
                          value={formData.masaKerjaAkhir}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              masaKerjaAkhir: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="namaKetua">
                        Nama Kepala/Penandatangan *
                      </Label>
                      <Input
                        id="namaKetua"
                        placeholder="THOMAS WUNANG TJAHJO, M.Sc., M.Eng"
                        value={formData.namaKetua}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            namaKetua: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Team Members */}
                <Card className="shadow-xl pt-0">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 border-b pt-2 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-white flex items-center">
                        <UserIcon className="w-5 h-5 mr-2 text-white" />
                        Anggota Tim
                      </CardTitle>
                      <Button
                        onClick={addTeamMember}
                        size="sm"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Anggota
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {formData.teamMembers.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <UserIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>Belum ada anggota tim</p>
                          <p className="text-sm mt-1">
                            Klik tombol &quot;Tambah Anggota&quot; untuk
                            menambahkan
                          </p>
                        </div>
                      ) : (
                        formData.teamMembers.map((member, index) => (
                          <div
                            key={member.id}
                            className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <span className="text-sm font-semibold text-gray-700">
                                Anggota #{index + 1}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTeamMember(member.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 -mt-2 -mr-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label>Tipe</Label>
                                <Select
                                  value={member.type}
                                  onValueChange={(value) =>
                                    updateTeamMember(
                                      member.id,
                                      "type",
                                      value as "pegawai" | "mitra",
                                    )
                                  }
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pegawai">
                                      Pegawai
                                    </SelectItem>
                                    <SelectItem value="mitra">Mitra</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>
                                  {member.type === "pegawai"
                                    ? "Pegawai"
                                    : "Mitra"}
                                </Label>
                                <Select
                                  value={member.personId}
                                  onValueChange={(value) =>
                                    updateTeamMember(
                                      member.id,
                                      "personId",
                                      value,
                                    )
                                  }
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Pilih..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {member.type === "pegawai"
                                      ? pegawaiList
                                          .filter((p) => {
                                            // Filter pegawai yang sudah di-assign pada project ini
                                            return tasks.some(
                                              (task) =>
                                                task.assignee_user_id === p.id,
                                            );
                                          })
                                          .map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                              {p.nama_lengkap}
                                            </SelectItem>
                                          ))
                                      : mitraList
                                          .filter((m) => {
                                            // Filter mitra yang sudah di-assign pada project ini
                                            return tasks.some(
                                              (task) =>
                                                task.assignee_mitra_id === m.id,
                                            );
                                          })
                                          .map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                              {m.nama_mitra}
                                            </SelectItem>
                                          ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>Tugas</Label>
                                <Select
                                  value={member.taskId}
                                  onValueChange={(value) =>
                                    updateTeamMember(member.id, "taskId", value)
                                  }
                                  disabled={
                                    !formData.projectId || !member.personId
                                  }
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Pilih tugas..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {tasks
                                      .filter((task) => {
                                        // Filter tasks berdasarkan tipe dan person yang dipilih
                                        if (member.type === "pegawai") {
                                          return (
                                            task.assignee_user_id ===
                                            member.personId
                                          );
                                        } else {
                                          return (
                                            task.assignee_mitra_id ===
                                            member.personId
                                          );
                                        }
                                      })
                                      .map((task) => (
                                        <SelectItem
                                          key={task.id}
                                          value={task.id}
                                        >
                                          {task.title}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>NIP/SOBAT ID</Label>
                                <Input
                                  value={member.nipOrSobat}
                                  disabled
                                  className="mt-1 bg-gray-100"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Info & Help */}
              <div className="space-y-6">
                {/* Quick Info */}
                <Card className="shadow-xl border-2 border-blue-200 pt-0">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 pt-2 rounded-t-xl">
                    <CardTitle className="text-lg font-semibold text-white">
                      ℹ️ Informasi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Project:
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {projectName || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Tahun:
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {projectYear}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Anggota Tim:
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {formData.teamMembers.length} orang
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Help Card */}
                <Card className="shadow-xl border-2 border-green-200 pt-0">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 pt-2 rounded-t-xl">
                    <CardTitle className="text-lg font-semibold text-white">
                      💡 Panduan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ul className="space-y-3 text-sm text-gray-700">
                      <li className="flex items-start">
                        <Check className="w-4 h-4 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Pilih project terlebih dahulu</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="w-4 h-4 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Tambahkan anggota tim sesuai kebutuhan</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="w-4 h-4 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>
                          Satu pegawai/mitra bisa ditambahkan berkali-kali
                        </span>
                      </li>
                      <li className="flex items-start">
                        <Check className="w-4 h-4 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>
                          Preview sebelum export untuk memastikan data
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Preview Section */}
            <Card className="shadow-2xl pt-0">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-b pt-2 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold">
                    Preview Surat SK
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      onClick={() => setShowPreview(false)}
                      className="text-white hover:bg-white/20"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Tutup
                    </Button>
                    <Button
                      onClick={() => handleExport("docx")}
                      disabled={loading}
                      className="bg-white text-blue-600 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export DOCX
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 bg-white">
                {/* Preview content will be rendered here */}
                <div
                  className="max-w-4xl mx-auto bg-white p-12 shadow-inner"
                  style={{
                    fontFamily: "Calibri, Arial, sans-serif",
                    fontSize: "11pt",
                    lineHeight: "1.5",
                  }}
                >
                  <div className="space-y-4">
                    {/* Logo BPS */}
                    <div className="text-center mb-6">
                      <img
                        src="/assets/logo-bps.png"
                        alt="Logo BPS"
                        className="w-16 h-16 mx-auto"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>

                    {/* Header */}
                    <div className="text-center space-y-1">
                      <p className="font-bold">KEPUTUSAN</p>
                      <p className="font-bold">
                        KEPALA BADAN PUSAT STATISTIK{" "}
                        {formData.kotaKabupaten.toUpperCase()}
                      </p>
                      <p className="font-bold">NOMOR : {formData.nomorSK}</p>
                      <p className="font-bold mt-4">TENTANG</p>
                      <p className="font-bold">
                        TIM PELAKSANA PENDATAAN {projectName.toUpperCase()}
                      </p>
                      <p className="font-bold">
                        BADAN PUSAT STATISTIK{" "}
                        {formData.kotaKabupaten.toUpperCase()}
                      </p>
                      <p className="font-bold">TAHUN ANGGARAN {projectYear}</p>
                    </div>

                    {/* Content */}
                    <div className="space-y-4 mt-8 text-justify">
                      <p className="text-center font-bold">
                        KEPALA BADAN PUSAT STATISTIK{" "}
                        {formData.kotaKabupaten.toUpperCase()}
                      </p>

                      {/* Menimbang */}
                      <div className="flex">
                        <span className="w-32 flex-shrink-0">Menimbang</span>
                        <span className="w-4 flex-shrink-0">:</span>
                        <p className="flex-1">
                          Bahwa untuk kelancaran kegiatan Pendataan{" "}
                          {projectName} pada Badan Pusat Statistik{" "}
                          {formData.kotaKabupaten}, perlu menetapkan Tim
                          pelaksana Pendataan Pendataan {projectName} Tahun{" "}
                          {projectYear} dengan Keputusan Kepala Badan Pusat
                          Statistik {formData.kotaKabupaten};
                        </p>
                      </div>

                      {/* Mengingat */}
                      <div className="flex">
                        <span className="w-32 flex-shrink-0">Mengingat</span>
                        <span className="w-4 flex-shrink-0">:</span>
                        <div className="flex-1 space-y-2">
                          <p className="flex">
                            <span className="w-6 flex-shrink-0">1.</span>
                            <span className="flex-1">
                              Undang-undang Nomor 16 Tahun 1997 tentang
                              Statistik;
                            </span>
                          </p>
                          <p className="flex">
                            <span className="w-6 flex-shrink-0">2.</span>
                            <span className="flex-1">
                              Peraturan Pemerintah Nomor 51 Tahun 1999 tentang
                              Penyelenggaraan Statistik;
                            </span>
                          </p>
                          <p className="flex">
                            <span className="w-6 flex-shrink-0">3.</span>
                            <span className="flex-1">
                              Peraturan Presiden Nomor 86 Tahun 2007 tentang
                              Badan Pusat Statistik;
                            </span>
                          </p>
                          <p className="flex">
                            <span className="w-6 flex-shrink-0">4.</span>
                            <span className="flex-1">
                              Peraturan Badan Pusat Statistik Nomor 5 Tahun 2019
                              tentang Tata Naskah Dinas di Lingkungan Badan
                              Pusat Statistik;
                            </span>
                          </p>
                          <p className="flex">
                            <span className="w-6 flex-shrink-0">5.</span>
                            <span className="flex-1">
                              Peraturan Badan Pusat Statistik Nomor 5 Tahun 2023
                              tentang Organisasi dan Tata Kerja Badan Pusat
                              Statistik Provinsi dan Badan Pusat Statistik
                              Kabupaten/Kota;
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* MEMUTUSKAN */}
                      <p className="text-center font-bold mt-6">MEMUTUSKAN :</p>

                      {/* Menetapkan */}
                      <div className="flex">
                        <span className="w-32 flex-shrink-0">Menetapkan</span>
                        <span className="w-4 flex-shrink-0">:</span>
                        <p className="flex-1">
                          KEPUTUSAN KEPALA BADAN PUSAT STATISTIK{" "}
                          {formData.kotaKabupaten.toUpperCase()} TENTANG TIM
                          PELAKSANA KEGIATAN PENDATAAN{" "}
                          {projectName.toUpperCase()} TAHUN {projectYear} PADA
                          BADAN PUSAT STATISTIK{" "}
                          {formData.kotaKabupaten.toUpperCase()}
                        </p>
                      </div>

                      {/* KESATU */}
                      <div className="flex">
                        <span className="w-32 flex-shrink-0">KESATU</span>
                        <span className="w-4 flex-shrink-0">:</span>
                        <p className="flex-1">
                          Membentuk Tim Pelaksana kegiatan Pendataan{" "}
                          {projectName} Tahun {projectYear} pada Badan Pusat
                          Statistik {formData.kotaKabupaten} Tahun {projectYear}{" "}
                          dengan susunan sebagaimana tersebut pada lampiran
                          keputusan ini;
                        </p>
                      </div>

                      {/* KEDUA */}
                      <div className="flex">
                        <span className="w-32 flex-shrink-0">KEDUA</span>
                        <span className="w-4 flex-shrink-0">:</span>
                        <div className="flex-1">
                          <p className="mb-2">
                            Tim Pelaksana kegiatan Pendataan {projectName} Tahun{" "}
                            {projectYear} pada Badan Pusat Statistik{" "}
                            {formData.kotaKabupaten} mempunyai tugas antara
                            lain:
                          </p>
                          <div className="space-y-1 ml-4">
                            <p className="flex">
                              <span className="w-6 flex-shrink-0">a.</span>
                              <span className="flex-1">
                                Mengikuti briefing/pelatihan Pendataan{" "}
                                {projectName} tahun {projectYear};
                              </span>
                            </p>
                            <p className="flex">
                              <span className="w-6 flex-shrink-0">b.</span>
                              <span className="flex-1">
                                Melakukan pengumpulan data Pendataan{" "}
                                {projectName} tahun {projectYear};
                              </span>
                            </p>
                            <p className="flex">
                              <span className="w-6 flex-shrink-0">c.</span>
                              <span className="flex-1">
                                Melakukan editing coding, entry dan validasi
                                dokumen kuesioner hasil pengumpulan data
                                Pendataan {projectName} tahun {projectYear}.
                              </span>
                            </p>
                            <p className="flex">
                              <span className="w-6 flex-shrink-0">d.</span>
                              <span className="flex-1">
                                Menjaga dan menyimpan keamanan materi kegiataan
                                Pendataan {projectName} tahun {projectYear}.
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* KETIGA */}
                      <div className="flex">
                        <span className="w-32 flex-shrink-0">KETIGA</span>
                        <span className="w-4 flex-shrink-0">:</span>
                        <p className="flex-1">
                          Masa kerja berakhir pada tanggal{" "}
                          {new Date(formData.masaKerjaAkhir).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </div>

                      {/* KEEMPAT */}
                      <div className="flex">
                        <span className="w-32 flex-shrink-0">KEEMPAT</span>
                        <span className="w-4 flex-shrink-0">:</span>
                        <p className="flex-1">
                          Keputusan ini berlaku sejak tanggal ditetapkan.
                        </p>
                      </div>

                      {/* Signature */}
                      <div className="mt-8 text-right pr-12">
                        <p>Ditetapkan di {formData.kotaKabupaten}</p>
                        <p>
                          Pada tanggal{" "}
                          {new Date(
                            formData.tanggalPenetapan,
                          ).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="mt-2 font-bold">
                          KEPALA BADAN PUSAT STATISTIK
                        </p>
                        <p className="font-bold">
                          {formData.kotaKabupaten.toUpperCase()}
                        </p>
                        <p className="mt-12">{formData.namaKetua}</p>
                      </div>
                    </div>

                    {/* Lampiran - Page Break */}
                    <div className="mt-16 pt-16 border-t-2 border-dashed border-gray-300">
                      {/* LAMPIRAN Header - Right Aligned */}
                      <div className="text-right pr-12 space-y-1 mb-8">
                        <p className="font-bold">LAMPIRAN</p>
                        <p className="font-bold">KEPUTUSAN KEPALA</p>
                        <p className="font-bold">
                          BADAN PUSAT STATISTIK{" "}
                          {formData.kotaKabupaten.toUpperCase()}
                        </p>
                        <p>
                          NOMOR{" "}
                          <span className="ml-8">: {formData.nomorSK}</span>
                        </p>
                        <p>
                          TANGGAL{" "}
                          <span className="ml-4">
                            :{" "}
                            {new Date(
                              formData.tanggalPenetapan,
                            ).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </p>
                      </div>

                      {/* Title */}
                      <div className="text-center space-y-1 mb-6">
                        <p className="font-bold">
                          DAFTAR TIM PELAKSANA PENDATAAN{" "}
                          {projectName.toUpperCase()}
                        </p>
                        <p className="font-bold">TAHUN {projectYear}</p>
                        <p className="font-bold">
                          BADAN PUSAT STATISTIK{" "}
                          {formData.kotaKabupaten.toUpperCase()}
                        </p>
                      </div>

                      {/* Table */}
                      <table className="w-full border-collapse border border-black text-sm">
                        <thead>
                          <tr>
                            <th
                              className="border border-black p-3 text-center"
                              style={{ width: "5%" }}
                            >
                              NO.
                            </th>
                            <th
                              className="border border-black p-3 text-center"
                              style={{ width: "25%" }}
                            >
                              NAMA PETUGAS
                            </th>
                            <th
                              className="border border-black p-3 text-center"
                              style={{ width: "20%" }}
                            >
                              NIP/NMS
                            </th>
                            <th
                              className="border border-black p-3 text-center"
                              style={{ width: "50%" }}
                            >
                              BERTUGAS SEBAGAI
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.teamMembers.map((member, index) => (
                            <tr key={member.id}>
                              <td className="border border-black p-3 text-center">
                                {index + 1}
                              </td>
                              <td className="border border-black p-3 text-center">
                                {member.personName}
                              </td>
                              <td className="border border-black p-3 text-center">
                                {member.nipOrSobat}
                              </td>
                              <td className="border border-black p-3 text-center">
                                {member.taskTitle}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Signature - Right Aligned */}
                      <div className="mt-8 text-right pr-12">
                        <p className="font-bold">
                          KEPALA BADAN PUSAT STATISTIK
                        </p>
                        <p className="font-bold">
                          {formData.kotaKabupaten.toUpperCase()}
                        </p>
                        <p className="mt-12">{formData.namaKetua}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
