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

interface Mitra {
  id: string;
  nama_mitra: string;
  alamat: string;
  kontak: string;
  pekerjaan: string;
  taskCount: number;
  totalHonor: number;
}

interface FormData {
  nomorSPK: string; // Base nomor SPK, akan auto-generate per tugas
  month: string;
  year: string;
  mitraIds: string[]; // Multiple mitra selection
  tanggalPenandatanganan: string;
  namaPejabat: string;
}

export function SPKForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mitraList, setMitraList] = useState<Mitra[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingMitra, setLoadingMitra] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [formData, setFormData] = useState<FormData>({
    nomorSPK: "",
    month: currentMonth.toString(),
    year: currentYear.toString(),
    mitraIds: [],
    tanggalPenandatanganan: "",
    namaPejabat: "",
  });

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

  // Fetch mitra when month and year changes (no project filter)
  useEffect(() => {
    if (formData.month && formData.year) {
      fetchMitra();
    } else {
      setMitraList([]);
    }
  }, [formData.month, formData.year]);

  const fetchMitra = async () => {
    try {
      setLoadingMitra(true);
      const response = await fetch(
        `/api/admin/export/spk/mitra?month=${formData.month}&year=${formData.year}`,
      );
      if (response.ok) {
        const data = await response.json();
        setMitraList(data.mitra || []);
        if (data.mitra.length === 0) {
          toast.info("Tidak ada mitra dengan tugas di bulan ini");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Gagal memuat data mitra");
      }
    } catch (error) {
      console.error("Error fetching mitra:", error);
      toast.error("Gagal memuat data mitra. Periksa koneksi Anda.");
    } finally {
      setLoadingMitra(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const validateForm = (): boolean => {
    if (!formData.nomorSPK) {
      toast.error("Nomor SPK harus diisi");
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
    if (!formData.namaPejabat) {
      toast.error("Nama pejabat harus diisi");
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

  // Calculate total tasks count for selected mitra
  const getTotalTasksCount = () => {
    return mitraList
      .filter((m) => formData.mitraIds.includes(m.id))
      .reduce((sum, m) => sum + (m.taskCount || 0), 0);
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
    const monthName =
      months.find((m) => m.value === formData.month)?.label || "";
    const selectedMitraList = mitraList.filter((m) =>
      formData.mitraIds.includes(m.id),
    );
    const totalTasks = getTotalTasksCount();

    return (
      <Card className="border-2 border-green-200 overflow-hidden pt-0">
        <CardHeader className="px-0 py-0 bg-transparent">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-6 rounded-t-xl">
            <CardTitle className="text-center">
              Preview SPK Generation
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-6">
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

            <div className="mt-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-semibold text-blue-900 mb-2">
                  Ringkasan Generate SPK:
                </p>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>
                    • Periode: {monthName} {formData.year}
                  </li>
                  <li>• Jumlah Mitra: {selectedMitraList.length}</li>
                  <li>• Total Tugas: {totalTasks}</li>
                  <li>
                    • Akan di-generate: {selectedMitraList.length} SPK (1 SPK
                    per mitra)
                  </li>
                  <li>
                    • Tanggal Penandatanganan:{" "}
                    {dateToIndonesianText(formData.tanggalPenandatanganan)}
                  </li>
                  <li>• Pejabat: {formData.namaPejabat}</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-semibold text-green-900 mb-2">
                  Mitra yang dipilih:
                </p>
                <ul className="space-y-1 text-sm text-green-800">
                  {selectedMitraList.map((mitra, index) => (
                    <li key={mitra.id}>
                      • {mitra.nama_mitra} - {mitra.taskCount} tugas (SPK:{" "}
                      {index === 0
                        ? formData.nomorSPK
                        : `${formData.nomorSPK}-${String(index + 1).padStart(3, "0")}`}
                      )
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Catatan:</strong> Setiap mitra akan di-generate
                  menjadi 1 SPK yang berisi semua tugas mitra tersebut dalam
                  bulan yang dipilih. Page break akan ditambahkan di antara
                  setiap SPK.
                </p>
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

              {/* Mitra Selection - Multiple */}
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
                      {formData.month && formData.year
                        ? "Tidak ada mitra dengan tugas di bulan ini"
                        : "Pilih bulan dan tahun terlebih dahulu"}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="border border-green-200 rounded-md max-h-60 overflow-y-auto p-2">
                    {mitraList.map((mitra) => (
                      <label
                        key={mitra.id}
                        className="flex items-center p-2 hover:bg-green-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.mitraIds.includes(mitra.id)}
                          onChange={() => toggleMitraSelection(mitra.id)}
                          className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="text-sm">
                          {mitra.nama_mitra} ({mitra.taskCount} tugas, Total:{" "}
                          {formatRupiah(mitra.totalHonor)})
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
            {showPreview && formData.mitraIds.length > 0 ? (
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

            {/* Task List dihapus pada mode multi-generate */}
          </div>
        </div>
      </div>
    </div>
  );
}
