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
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { dateToIndonesianText } from "@/lib/utils/documentUtils";

interface Project {
  id: string;
  nama_project: string;
}

interface Mitra {
  id: string;
  nama_mitra: string;
  alamat: string;
  kontak: string;
  pekerjaan: string;
  taskCount: number;
}

interface FormData {
  nomorBAST: string;
  projectId: string;
  month: string;
  year: string;
  mitraIds: string[];
  tanggalPenandatanganan: string;
  nomorSK: string;
  tanggalSK: string;
}

export function BASTForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaderName, setLeaderName] = useState<string>("");
  const [mitraList, setMitraList] = useState<Mitra[]>([]);
  const [volumeData, setVolumeData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingMitra, setLoadingMitra] = useState(false);
  const [loadingVolume, setLoadingVolume] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [formData, setFormData] = useState<FormData>({
    nomorBAST: "",
    projectId: "",
    month: currentMonth.toString(),
    year: currentYear.toString(),
    mitraIds: [],
    tanggalPenandatanganan: "",
    nomorSK: "",
    tanggalSK: "",
  });

  // Fetch initial data
  useEffect(() => {
    fetchProjects();
  }, []);

  // Load draft if exists
  useEffect(() => {
    const draftStr = localStorage.getItem("bast_draft_to_preview");
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        setFormData(draft);
        localStorage.removeItem("bast_draft_to_preview");
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
      fetchProjectLeader();
    } else {
      setMitraList([]);
      setVolumeData(null);
      setLeaderName("");
    }
  }, [formData.projectId, formData.month, formData.year]);

  // Fetch volume data when mitra changes
  useEffect(() => {
    if (formData.mitraIds.length > 0 && formData.projectId) {
      fetchVolumeData();
    } else {
      setVolumeData(null);
    }
  }, [formData.mitraIds]);

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

  const fetchProjectLeader = async () => {
    try {
      if (!formData.projectId) return;
      const res = await fetch(
        `/api/admin/export/project?projectId=${formData.projectId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setLeaderName(data.leader_name || "");
      }
    } catch {
      // ignore for preview
    }
  };

  const fetchMitra = async () => {
    try {
      setLoadingMitra(true);
      const response = await fetch(
        `/api/admin/export/bast/mitra?projectId=${formData.projectId}&month=${formData.month}&year=${formData.year}`,
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

  const fetchVolumeData = async () => {
    try {
      setLoadingVolume(true);
      // Fetch volume for first selected mitra for preview
      const firstMitraId = formData.mitraIds[0];
      if (!firstMitraId) return;

      const response = await fetch(
        `/api/admin/export/bast/tasks?projectId=${formData.projectId}&mitraId=${firstMitraId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setVolumeData(data);
      }
    } catch (error) {
      console.error("Error fetching volume data:", error);
      toast.error("Gagal memuat data volume");
    } finally {
      setLoadingVolume(false);
    }
  };

  const toggleMitraSelection = (mitraId: string) => {
    setFormData((prev) => {
      const isSelected = prev.mitraIds.includes(mitraId);
      return {
        ...prev,
        mitraIds: isSelected
          ? prev.mitraIds.filter((id) => id !== mitraId)
          : [...prev.mitraIds, mitraId],
      };
    });
  };

  const selectAllMitra = () => {
    setFormData((prev) => ({
      ...prev,
      mitraIds: mitraList.map((m) => m.id),
    }));
  };

  const deselectAllMitra = () => {
    setFormData((prev) => ({
      ...prev,
      mitraIds: [],
    }));
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.nomorBAST) {
      toast.error("Nomor BAST harus diisi");
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
    if (formData.mitraIds.length === 0) {
      toast.error("Minimal 1 mitra harus dipilih");
      return false;
    }
    if (!formData.tanggalPenandatanganan) {
      toast.error("Tanggal penandatanganan harus diisi");
      return false;
    }
    if (!formData.nomorSK) {
      toast.error("Nomor SK harus diisi");
      return false;
    }
    if (!formData.tanggalSK) {
      toast.error("Tanggal SK harus diisi");
      return false;
    }
    if (!volumeData || volumeData.volumeBySatuan.length === 0) {
      toast.error("Tidak ada data volume untuk mitra ini");
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
          type: "bast",
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
          type: "bast",
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
      a.download = `BAST-${formData.nomorBAST}.${format}`;
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

  const getSelectedMitras = () => {
    return mitraList.filter((m) => formData.mitraIds.includes(m.id));
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
    const selectedProject = getSelectedProject();
    const selectedMitras = getSelectedMitras();

    if (selectedMitras.length === 0 || !selectedProject) return null;

    // Show preview for first mitra only
    const selectedMitra = selectedMitras[0];
    if (!selectedMitra || !volumeData) return null;

    // Build volume text
    let volumeText = "";
    if (volumeData.volumeBySatuan.length === 1) {
      volumeText = `${volumeData.volumeBySatuan[0].total} ${volumeData.volumeBySatuan[0].nama_satuan}`;
    } else if (volumeData.volumeBySatuan.length > 1) {
      volumeText = volumeData.volumeBySatuan
        .map((v: any) => `${v.total} ${v.nama_satuan}`)
        .join(", ");
    } else {
      volumeText = "0 dokumen";
    }

    const baseStyle: React.CSSProperties = {
      fontFamily: 'Bookman Old Style, "Times New Roman", serif',
      fontSize: "12pt",
      lineHeight: 1.0,
      color: "#000",
    };

    const paragraph: React.CSSProperties = {
      textAlign: "justify",
      margin: 0,
      marginBottom: "10px",
    };

    const hang05: React.CSSProperties = {
      paddingLeft: "0.5in",
      textIndent: "-0.5in",
    };

    return (
      <Card className="border-2 border-purple-200 overflow-hidden pt-0">
        <CardHeader className="px-0 py-0 bg-transparent">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-6 rounded-t-xl">
            <CardTitle className="text-center">Preview BAST</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div style={baseStyle}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "6px" }}>
              <div style={{ fontWeight: 700, fontSize: "16pt" }}>
                BERITA ACARA SERAH TERIMA HASIL PEKERJAAN
              </div>
              <div
                style={{ fontWeight: 700, fontSize: "16pt", color: "#e11d48" }}
              >
                NOMOR: {formData.nomorBAST}
              </div>
              <div
                style={{
                  borderBottom: "3px solid #000",
                  width: "100%",
                  margin: "2px 0 12px",
                }}
              />
              {selectedMitras.length > 1 && (
                <div
                  style={{
                    fontSize: "10pt",
                    color: "#6b7280",
                    marginTop: "2px",
                  }}
                >
                  Preview untuk: {selectedMitra.nama_mitra} (1 dari{" "}
                  {selectedMitras.length} mitra)
                </div>
              )}
            </div>

            {/* Tanggal */}
            <p style={paragraph}>
              Pada hari ini{" "}
              {dateToIndonesianText(formData.tanggalPenandatanganan)}, kami yang
              bertanda tangan dibawah ini:
            </p>

            {/* Para Pihak */}
            <p style={{ ...paragraph, ...hang05 }}>
              <strong>I.</strong> <strong> </strong>
              <strong>{leaderName || "Ketua Tim"}</strong>, selaku Penanggung
              Jawab Pendataan Lapangan {selectedProject.nama_project} Badan
              Pusat Statistik Kota Batu, berkedudukan di Jalan Melati No.1
              Songgokerto Batu, bertindak untuk dan atas nama Badan Pusat
              Statistik Kota Batu yang selanjutnya dalam hal ini disebut sebagai{" "}
              <strong>PIHAK PERTAMA.</strong>
            </p>
            <p style={{ ...paragraph, ...hang05 }}>
              <strong>II.</strong> <strong> </strong>
              <strong>{selectedMitra.nama_mitra}</strong>, selaku Petugas
              Pendataan Lapangan {selectedProject.nama_project}, berkedudukan di{" "}
              {selectedMitra.alamat}, bertindak untuk dan atas nama diri sendiri
              yang selanjutnya dalam hal ini disebut{" "}
              <strong>PIHAK KEDUA.</strong>
            </p>

            {/* Memperhatikan (table mimic) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "20% 2% 78%",
                alignItems: "start",
                marginBottom: "0px",
                rowGap: 0,
              }}
            >
              <div style={{ ...baseStyle }}>Memperhatikan</div>
              <div style={{ ...baseStyle, textAlign: "center" }}>:</div>
              <div style={{ ...baseStyle, textAlign: "justify" }}>
                Surat Keputusan Kepala BPS Kota Batu tentang SK Tim Pelaksanaan
                Pendataan Lapangan {selectedProject.nama_project} Badan Pusat
                Statistik Kota Batu, Nomor {formData.nomorSK} tanggal{" "}
                {formData.tanggalSK} dan lampiran alokasi tugas pada SK Nomor{" "}
                {formData.nomorSK} tanggal {formData.tanggalSK}.
              </div>
            </div>

            {/* Menyatakan */}
            <p style={{ ...paragraph }}>Menyatakan bahwa :</p>
            <p style={{ ...paragraph, ...hang05 }}>
              <strong>1.</strong> PIHAK KEDUA menyerahkan hasil pekerjaan kepada
              PIHAK PERTAMA berupa {volumeText} {selectedProject.nama_project}
            </p>
            <p style={{ ...paragraph, ...hang05 }}>
              <strong>2.</strong> PIHAK PERTAMA menyatakan telah menerima dengan
              baik dan lengkap pekerjaan tersebut diatas dari PIHAK KEDUA.
            </p>

            {/* Penutup */}
            <p style={paragraph}>
              Demikian Berita Acara Serah Terima Hasil Pekerjaan ini dibuat
              dengan rangkap yang cukup untuk dapat digunakan sebagaimana
              mestinya.
            </p>

            {/* Tanda Tangan */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "35% 30% 35%",
                columnGap: "10px",
                marginTop: "24px",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700 }}>PIHAK KEDUA,</div>
                <div style={{ height: "80px" }} />
                <div style={{ fontWeight: 700 }}>
                  {selectedMitra.nama_mitra}
                </div>
              </div>
              <div />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700 }}>PIHAK PERTAMA,</div>
                <div style={{ height: "80px" }} />
                <div style={{ fontWeight: 700 }}>
                  {leaderName || "Ketua Tim"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50">
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
                  <FileCheck className="w-8 h-8 mr-3 text-purple-600" />
                  Berita Acara Serah Terima (BAST)
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Generate BAST Hasil Pekerjaan untuk Mitra
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
          <Card className="border-2 border-purple-200 overflow-hidden pt-0">
            <CardHeader className="px-0 py-0 bg-transparent">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-6 rounded-t-xl">
                <CardTitle className="text-lg font-semibold text-white flex items-center">
                  <Briefcase className="w-5 h-5 mr-2 text-white" />
                  Informasi BAST
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Nomor BAST */}
              <div>
                <Label htmlFor="nomorBAST" className="flex items-center mb-2">
                  <FileText className="w-4 h-4 mr-2" />
                  Nomor BAST
                </Label>
                <Input
                  id="nomorBAST"
                  value={formData.nomorBAST}
                  onChange={(e) =>
                    handleInputChange("nomorBAST", e.target.value)
                  }
                  placeholder="Contoh: BA-045/35790/PL.810/2025"
                  className="border-purple-200 focus:border-purple-400"
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
                  className="w-full border border-purple-200 rounded-md px-3 py-2 focus:border-purple-400 focus:outline-none"
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
                    className="w-full border border-purple-200 rounded-md px-3 py-2 focus:border-purple-400 focus:outline-none"
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
                    className="w-full border border-purple-200 rounded-md px-3 py-2 focus:border-purple-400 focus:outline-none"
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
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Mitra ({formData.mitraIds.length} dipilih)
                  </Label>
                  {mitraList.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllMitra}
                        disabled={formData.mitraIds.length === mitraList.length}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={deselectAllMitra}
                        disabled={formData.mitraIds.length === 0}
                        className="text-xs"
                      >
                        Deselect All
                      </Button>
                    </div>
                  )}
                </div>
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
                  <div className="border border-purple-200 rounded-md max-h-60 overflow-y-auto p-2">
                    {mitraList.map((mitra) => (
                      <label
                        key={mitra.id}
                        className="flex items-center p-2 hover:bg-purple-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.mitraIds.includes(mitra.id)}
                          onChange={() => toggleMitraSelection(mitra.id)}
                          className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-sm">
                          {mitra.nama_mitra} ({mitra.taskCount} tugas)
                        </span>
                      </label>
                    ))}
                  </div>
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
                  placeholder="31/07/2025"
                  className="border-purple-200 focus:border-purple-400"
                />
                {formData.tanggalPenandatanganan && (
                  <p className="text-xs text-gray-600 mt-1">
                    Preview:{" "}
                    {dateToIndonesianText(formData.tanggalPenandatanganan)}
                  </p>
                )}
              </div>

              {/* Nomor SK */}
              <div>
                <Label htmlFor="nomorSK" className="flex items-center mb-2">
                  <FileText className="w-4 h-4 mr-2" />
                  Nomor SK
                </Label>
                <Input
                  id="nomorSK"
                  value={formData.nomorSK}
                  onChange={(e) => handleInputChange("nomorSK", e.target.value)}
                  placeholder="Contoh: 66.1 Tahun 2026"
                  className="border-purple-200 focus:border-purple-400"
                />
              </div>

              {/* Tanggal SK */}
              <div>
                <Label htmlFor="tanggalSK" className="flex items-center mb-2">
                  <Calendar className="w-4 h-4 mr-2" />
                  Tanggal SK
                </Label>
                <Input
                  id="tanggalSK"
                  value={formData.tanggalSK}
                  onChange={(e) =>
                    handleInputChange("tanggalSK", e.target.value)
                  }
                  placeholder="Contoh: 17 Juni 2025"
                  className="border-purple-200 focus:border-purple-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-3 pt-4">
                <Button
                  onClick={handlePreview}
                  variant="outline"
                  className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
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
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700"
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
            {showPreview && formData.mitraIds.length > 0 ? (
              renderPreview()
            ) : (
              <Card className="border-2 border-gray-200">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Eye className="w-16 h-16 text-gray-300" />
                    <p className="text-gray-500">
                      Isi form dan klik Preview untuk melihat tampilan BAST
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Volume Info */}
            {loadingVolume && (
              <Card className="border-2 border-gray-200 mt-4">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-500">Memuat data volume...</p>
                </CardContent>
              </Card>
            )}

            {!loadingVolume &&
              volumeData &&
              volumeData.volumeBySatuan.length > 0 && (
                <Card className="border-2 border-purple-200 mt-4 overflow-hidden pt-0">
                  <CardHeader className="px-0 py-0 bg-transparent">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-6 rounded-t-xl">
                      <CardTitle className="text-white">
                        Volume Pekerjaan
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {volumeData.volumeBySatuan.map(
                        (item: any, idx: number) => (
                          <div
                            key={idx}
                            className="border rounded p-3 bg-white"
                          >
                            <p className="font-semibold text-sm">
                              {item.total} {item.nama_satuan}
                            </p>
                          </div>
                        ),
                      )}
                      <div className="border-t pt-2 mt-2">
                        <p className="font-bold">
                          Total Volume: {volumeData.totalVolume}
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
