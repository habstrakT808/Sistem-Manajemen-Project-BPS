"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Download,
  ArrowLeft,
  Save,
  Eye,
  Calendar,
  User,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  dateToIndonesianText,
  formatRupiah,
  rupiahToWords,
  getMonthRange,
} from "@/lib/utils/documentUtils";

interface Project {
  id: string;
  nama_project: string;
  tanggal_mulai: string;
  deadline: string;
}

interface Mitra {
  id: string;
  nama_mitra: string;
  alamat: string;
  kontak: string;
  pekerjaan: string;
  taskCount: number;
  totalHonor: number;
}

interface Task {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  honor_amount: number;
}

interface TaskDetail {
  uraianTugas: string;
  jangkaWaktu: string;
  volume: string;
  satuan: string;
  hargaSatuan: number;
  nilaiPerjanjian: number;
}

interface FormData {
  nomorSPK: string;
  projectId: string;
  month: string;
  year: string;
  mitraId: string;
  tanggalPenandatanganan: string;
  namaPejabat: string;
}

export function SPKForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [mitraList, setMitraList] = useState<Mitra[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingMitra, setLoadingMitra] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [formData, setFormData] = useState<FormData>({
    nomorSPK: "",
    projectId: "",
    month: currentMonth.toString(),
    year: currentYear.toString(),
    mitraId: "",
    tanggalPenandatanganan: "",
    namaPejabat: "",
  });

  // Fetch initial data
  useEffect(() => {
    fetchProjects();
  }, []);

  // Load draft if exists
  useEffect(() => {
    const draftStr = localStorage.getItem("spk_draft_to_preview");
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        setFormData(draft);
        localStorage.removeItem("spk_draft_to_preview");
        setShowPreview(true);
      } catch (e) {
        console.error("Error loading draft:", e);
      }
    }
  }, []);

  // Fetch mitra when project and month changes
  useEffect(() => {
    if (formData.projectId && formData.month && formData.year) {
      fetchMitra();
    } else {
      setMitraList([]);
      setTasks([]);
    }
  }, [formData.projectId, formData.month, formData.year]);

  // Fetch tasks when mitra changes
  useEffect(() => {
    if (
      formData.mitraId &&
      formData.projectId &&
      formData.month &&
      formData.year
    ) {
      fetchTasks();
    } else {
      setTasks([]);
    }
  }, [formData.mitraId]);

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

  const fetchMitra = async () => {
    try {
      setLoadingMitra(true);
      const response = await fetch(
        `/api/admin/export/spk/mitra?projectId=${formData.projectId}&month=${formData.month}&year=${formData.year}`,
      );
      if (response.ok) {
        const data = await response.json();
        setMitraList(data.mitra || []);
        if (data.mitra.length === 0) {
          toast.info("Tidak ada mitra dengan tugas di bulan ini");
        }
      }
    } catch (error) {
      console.error("Error fetching mitra:", error);
      toast.error("Gagal memuat data mitra");
    } finally {
      setLoadingMitra(false);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      const response = await fetch(
        `/api/admin/export/spk/tasks?projectId=${formData.projectId}&month=${formData.month}&year=${formData.year}&mitraId=${formData.mitraId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Gagal memuat data tasks");
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.nomorSPK) {
      toast.error("Nomor SPK harus diisi");
      return false;
    }
    if (!formData.projectId) {
      toast.error("Project harus dipilih");
      return false;
    }
    if (!formData.month || !formData.year) {
      toast.error("Bulan dan tahun harus dipilih");
      return false;
    }
    if (!formData.mitraId) {
      toast.error("Mitra harus dipilih");
      return false;
    }
    if (!formData.tanggalPenandatanganan) {
      toast.error("Tanggal penandatanganan harus diisi");
      return false;
    }
    if (!formData.namaPejabat) {
      toast.error("Nama pejabat harus diisi");
      return false;
    }
    if (tasks.length === 0) {
      toast.error("Tidak ada tugas untuk mitra ini di bulan yang dipilih");
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validateForm()) return;
    setShowPreview(true);
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await fetch("/api/admin/export/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "spk",
          data: formData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal menyimpan draft");
      }

      toast.success("Draft berhasil disimpan");
      router.push("/admin/export");
    } catch (error: any) {
      console.error("Error saving draft:", error);
      toast.error(error.message || "Gagal menyimpan draft");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "docx" | "pdf") => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      toast.loading("Sedang generate dokumen...");

      const response = await fetch("/api/admin/export/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "spk",
          format,
          data: formData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal export dokumen");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SPK-${formData.nomorSPK}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss();
      toast.success(
        `Dokumen berhasil di-export sebagai ${format.toUpperCase()}`,
      );
    } catch (error: any) {
      console.error("Error exporting:", error);
      toast.dismiss();
      toast.error(error.message || "Gagal export dokumen");
    } finally {
      setLoading(false);
    }
  };

  const getSelectedProject = () => {
    return projects.find((p) => p.id === formData.projectId);
  };

  const getSelectedMitra = () => {
    return mitraList.find((m) => m.id === formData.mitraId);
  };

  const getTotalHonor = () => {
    return tasks.reduce(
      (sum, task) => sum + parseFloat(task.honor_amount.toString()),
      0,
    );
  };

  const months = [
    { value: "1", label: "Januari" },
    { value: "2", label: "Februari" },
    { value: "3", label: "Maret" },
    { value: "4", label: "April" },
    { value: "5", label: "Mei" },
    { value: "6", label: "Juni" },
    { value: "7", label: "Juli" },
    { value: "8", label: "Agustus" },
    { value: "9", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const renderPreview = () => {
    const selectedMitra = getSelectedMitra();
    const monthRange = getMonthRange(
      parseInt(formData.year),
      parseInt(formData.month),
    );
    const totalHonor = getTotalHonor();
    const monthName =
      months.find((m) => m.value === formData.month)?.label || "";

    if (!selectedMitra) return null;

    return (
      <Card className="border-2 border-blue-200 overflow-hidden pt-0">
        <CardHeader className="px-0 py-0 bg-transparent">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-6 rounded-t-xl">
            <CardTitle className="text-center">Preview SPK</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="font-bold text-lg">PERJANJIAN KERJA</h2>
              <h2 className="font-bold text-lg">
                PETUGAS KEGIATAN SURVEI / SENSUS BULAN {monthName.toUpperCase()}{" "}
                TAHUN {formData.year}
              </h2>
              <h2 className="font-bold text-lg">
                PADA BADAN PUSAT STATISTIK KOTA BATU
              </h2>
              <h2 className="font-bold text-lg">NOMOR: {formData.nomorSPK}</h2>
            </div>

            {/* Tanggal Penandatanganan */}
            <div className="mt-6">
              <p>
                Pada hari ini{" "}
                {dateToIndonesianText(formData.tanggalPenandatanganan)},
                bertempat di Kota Batu, yang bertanda tangan di bawah ini:
              </p>
            </div>

            {/* Para Pihak */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1">1.</div>
                <div className="col-span-3">{formData.namaPejabat}</div>
                <div className="col-span-1">:</div>
                <div className="col-span-7">
                  Pejabat Pembuat Komitmen Badan Pusat Statistik Kota Batu,
                  berkedudukan di Jalan Melati No 1 Songgokerto Kota Batu,
                  bertindak untuk dan atas nama Badan Pusat Statistik Kota Batu,
                  selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1">2.</div>
                <div className="col-span-3">{selectedMitra.nama_mitra}</div>
                <div className="col-span-1">:</div>
                <div className="col-span-7">
                  {selectedMitra.pekerjaan}, berkedudukan di{" "}
                  {selectedMitra.alamat} bertindak untuk dan atas nama diri
                  sendiri, selanjutnya disebut <strong>PIHAK KEDUA</strong>.
                </div>
              </div>
            </div>

            {/* Masa Kerja */}
            <div className="mt-4">
              <p className="font-semibold">Pasal 3</p>
              <p>
                Jangka Waktu Perjanjian terhitung sejak tanggal{" "}
                {monthRange.startText} sampai dengan tanggal{" "}
                {monthRange.endText}.
              </p>
            </div>

            {/* Lampiran - Daftar Tugas */}
            <div className="mt-6">
              <h3 className="font-bold text-center mb-2">LAMPIRAN</h3>
              <p className="text-center">
                PERJANJIAN KERJA PETUGAS KEGIATAN SURVEI / SENSUS
              </p>
              <p className="text-center">
                BULAN {monthName.toUpperCase()} PADA BADAN PUSAT STATISTIK KOTA
                BATU
              </p>
              <p className="text-center">NOMOR: {formData.nomorSPK}</p>

              <p className="mt-4 font-semibold">
                Nama Petugas: {selectedMitra.nama_mitra}
              </p>

              <table className="w-full mt-4 border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2">Uraian Tugas</th>
                    <th className="border border-gray-300 p-2">Jangka Waktu</th>
                    <th className="border border-gray-300 p-2">Volume</th>
                    <th className="border border-gray-300 p-2">Satuan</th>
                    <th className="border border-gray-300 p-2">Harga Satuan</th>
                    <th className="border border-gray-300 p-2">
                      Nilai Perjanjian
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, idx) => {
                    const startDate = new Date(task.start_date);
                    const endDate = new Date(task.end_date);
                    const monthNames = months.map((m) => m.label);
                    const jangkaWaktu = `${startDate.getDate()} - ${endDate.getDate()} ${monthNames[endDate.getMonth()]} ${endDate.getFullYear()}`;

                    const volume = (task as any).volume || "-";
                    const namaSatuan = (task as any).satuan?.nama_satuan || "-";
                    const rate = (task as any).rate_per_satuan || 0;
                    const nilai =
                      rate && volume ? rate * volume : task.honor_amount;
                    return (
                      <tr key={idx}>
                        <td className="border border-gray-300 p-2">
                          {task.title}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {jangkaWaktu}
                        </td>
                        <td className="border border-gray-300 p-2 text-center">
                          {volume || "-"}
                        </td>
                        <td className="border border-gray-300 p-2 text-center">
                          {namaSatuan}
                        </td>
                        <td className="border border-gray-300 p-2 text-right">
                          {formatRupiah(rate || 0)}
                        </td>
                        <td className="border border-gray-300 p-2 text-right">
                          {formatRupiah(nilai)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold">
                    <td
                      colSpan={5}
                      className="border border-gray-300 p-2 text-center"
                    >
                      Terbilang: {rupiahToWords(getTotalHonor())}
                    </td>
                    <td className="border border-gray-300 p-2 text-right">
                      {formatRupiah(getTotalHonor())}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tanda Tangan */}
            <div className="mt-8 grid grid-cols-2 gap-8">
              <div className="text-center">
                <p className="font-semibold">PIHAK KEDUA,</p>
                <div className="h-20"></div>
                <p className="font-semibold">{selectedMitra.nama_mitra}</p>
              </div>
              <div className="text-center">
                <p className="font-semibold">PIHAK PERTAMA,</p>
                <div className="h-20"></div>
                <p className="font-semibold">{formData.namaPejabat}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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
                  <FileText className="w-8 h-8 mr-3 text-green-600" />
                  Surat Perjanjian Kerja (SPK)
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Generate SPK untuk Mitra Bulanan
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card className="border-2 border-green-200 overflow-hidden pt-0">
            <CardHeader className="px-0 py-0 bg-transparent">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-6 rounded-t-xl">
                <CardTitle className="text-lg font-semibold text-white flex items-center">
                  <Briefcase className="w-5 h-5 mr-2 text-white" />
                  Informasi SPK
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Nomor SPK */}
              <div>
                <Label htmlFor="nomorSPK" className="flex items-center mb-2">
                  <FileText className="w-4 h-4 mr-2" />
                  Nomor SPK
                </Label>
                <Input
                  id="nomorSPK"
                  value={formData.nomorSPK}
                  onChange={(e) =>
                    handleInputChange("nomorSPK", e.target.value)
                  }
                  placeholder="Contoh: B-005/3579/PK/02/2025"
                  className="border-green-200 focus:border-green-400"
                />
              </div>

              {/* Project Selection */}
              <div>
                <Label htmlFor="projectId" className="flex items-center mb-2">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Project
                </Label>
                <select
                  id="projectId"
                  value={formData.projectId}
                  onChange={(e) =>
                    handleInputChange("projectId", e.target.value)
                  }
                  className="w-full border border-green-200 rounded-md px-3 py-2 focus:border-green-400 focus:outline-none"
                >
                  <option value="">Pilih Project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.nama_project}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month and Year Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="month" className="flex items-center mb-2">
                    <Calendar className="w-4 h-4 mr-2" />
                    Bulan
                  </Label>
                  <select
                    id="month"
                    value={formData.month}
                    onChange={(e) => handleInputChange("month", e.target.value)}
                    className="w-full border border-green-200 rounded-md px-3 py-2 focus:border-green-400 focus:outline-none"
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="year" className="flex items-center mb-2">
                    <Calendar className="w-4 h-4 mr-2" />
                    Tahun
                  </Label>
                  <select
                    id="year"
                    value={formData.year}
                    onChange={(e) => handleInputChange("year", e.target.value)}
                    className="w-full border border-green-200 rounded-md px-3 py-2 focus:border-green-400 focus:outline-none"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mitra Selection */}
              <div>
                <Label htmlFor="mitraId" className="flex items-center mb-2">
                  <User className="w-4 h-4 mr-2" />
                  Mitra
                </Label>
                {loadingMitra ? (
                  <div className="text-sm text-gray-500">
                    Memuat daftar mitra...
                  </div>
                ) : mitraList.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {formData.projectId && formData.month && formData.year
                        ? "Tidak ada mitra dengan tugas di bulan ini"
                        : "Pilih project, bulan, dan tahun terlebih dahulu"}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <select
                    id="mitraId"
                    value={formData.mitraId}
                    onChange={(e) =>
                      handleInputChange("mitraId", e.target.value)
                    }
                    className="w-full border border-green-200 rounded-md px-3 py-2 focus:border-green-400 focus:outline-none"
                  >
                    <option value="">Pilih Mitra</option>
                    {mitraList.map((mitra) => (
                      <option key={mitra.id} value={mitra.id}>
                        {mitra.nama_mitra} ({mitra.taskCount} tugas, Total:{" "}
                        {formatRupiah(mitra.totalHonor)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Tanggal Penandatanganan */}
              <div>
                <Label
                  htmlFor="tanggalPenandatanganan"
                  className="flex items-center mb-2"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Tanggal Penandatanganan (dd/mm/yyyy)
                </Label>
                <Input
                  id="tanggalPenandatanganan"
                  value={formData.tanggalPenandatanganan}
                  onChange={(e) =>
                    handleInputChange("tanggalPenandatanganan", e.target.value)
                  }
                  placeholder="31/10/2025"
                  className="border-green-200 focus:border-green-400"
                />
                {formData.tanggalPenandatanganan && (
                  <p className="text-xs text-gray-600 mt-1">
                    Preview:{" "}
                    {dateToIndonesianText(formData.tanggalPenandatanganan)}
                  </p>
                )}
              </div>

              {/* Nama Pejabat */}
              <div>
                <Label htmlFor="namaPejabat" className="flex items-center mb-2">
                  <User className="w-4 h-4 mr-2" />
                  Nama Pejabat Pembuat Komitmen
                </Label>
                <Input
                  id="namaPejabat"
                  value={formData.namaPejabat}
                  onChange={(e) =>
                    handleInputChange("namaPejabat", e.target.value)
                  }
                  placeholder="Contoh: Arif Nugroho Wicaksono, S.Si"
                  className="border-green-200 focus:border-green-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-3 pt-4">
                <Button
                  onClick={handlePreview}
                  variant="outline"
                  className="w-full border-green-300 text-green-700 hover:bg-green-50"
                  disabled={loading}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  onClick={handleSaveDraft}
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Draft
                </Button>
                <Button
                  onClick={() => handleExport("docx")}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                  disabled={loading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export DOCX
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <div>
            {showPreview && formData.mitraId ? (
              renderPreview()
            ) : (
              <Card className="border-2 border-gray-200">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Eye className="w-16 h-16 text-gray-300" />
                    <p className="text-gray-500">
                      Isi form dan klik Preview untuk melihat tampilan SPK
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Task List */}
            {loadingTasks && (
              <Card className="border-2 border-gray-200 mt-4">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-500">
                    Memuat daftar tugas...
                  </p>
                </CardContent>
              </Card>
            )}

            {!loadingTasks && tasks.length > 0 && (
              <Card className="border-2 border-green-200 mt-4 overflow-hidden pt-0">
                <CardHeader className="px-0 py-0 bg-transparent">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-6 rounded-t-xl">
                    <CardTitle className="text-white">
                      Daftar Tugas ({tasks.length})
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {tasks.map((task, idx) => (
                      <div key={idx} className="border rounded p-3 bg-white">
                        <p className="font-semibold text-sm">{task.title}</p>
                        <div className="text-xs text-gray-600 mt-1">
                          <p>
                            Periode:{" "}
                            {new Date(task.start_date).toLocaleDateString(
                              "id-ID",
                            )}{" "}
                            -{" "}
                            {new Date(task.end_date).toLocaleDateString(
                              "id-ID",
                            )}
                          </p>
                          <p>Honor: {formatRupiah(task.honor_amount)}</p>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <p className="font-bold text-right">
                        Total: {formatRupiah(getTotalHonor())}
                      </p>
                      <p className="text-xs text-gray-600 text-right">
                        {rupiahToWords(getTotalHonor())}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
