"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ExcelRow {
  "Nama Lengkap": string;
  Posisi: string;
  "Status Seleksi (1=Terpilih, 2=Tidak Terpilih)": string;
  "Posisi Daftar": string;
  "Alamat Detail": string;
  "Alamat Prov": string;
  "Alamat Kab": string;
  "Alamat Kec": string;
  "Alamat Desa": string;
  "Tempat, Tanggal Lahir (Umur)*": string;
  "Jenis Kelamin": string;
  Pendidikan: string;
  Pekerjaan: string;
  "Deskripsi Pekerjaan Lain": string;
  "No Telp": string;
  "SOBAT ID": string;
  Email: string;
}

interface ProcessedMitra {
  nama_mitra: string;
  jenis: "individu";
  kontak: string;
  alamat: string;
  is_active: boolean;
  posisi_id: string | null;
  jeniskelamin: "laki_laki" | "perempuan";
  pendidikan: "sma" | "d4s1";
  pekerjaan_id: string | null;
  sobat_id: string;
  email: string;
  // For validation display
  original_posisi?: string;
  original_pendidikan?: string;
  original_jeniskelamin?: string;
  original_pekerjaan?: string;
  validation_errors?: string[];
}

interface MitraExcelImportProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PositionOption {
  id: string;
  name: string;
}

interface OccupationOption {
  id: string;
  name: string;
}

export function MitraExcelImport({
  open,
  onClose,
  onSuccess,
}: MitraExcelImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ProcessedMitra[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [occupations, setOccupationOption] = useState<OccupationOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load reference data
  const loadReferenceData = useCallback(async () => {
    try {
      const [posRes, occRes] = await Promise.all([
        fetch("/api/admin/mitra-positions"),
        fetch("/api/admin/mitra-occupations"),
      ]);

      const posData = await posRes.json();
      const occData = await occRes.json();

      if (posRes.ok && Array.isArray(posData.data)) {
        setPositions(posData.data);
      }

      if (occRes.ok && Array.isArray(occData.data)) {
        setOccupationOption(occData.data);
      }
    } catch (error) {
      console.error("Failed to load reference data:", error);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      loadReferenceData();
    }
  }, [open, loadReferenceData]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewData([]);
      setShowPreview(false);
    }
  };

  const mapPosisi = (posisiText: string): string | null => {
    const normalizedText = posisiText.toLowerCase().trim();

    if (normalizedText.includes("pendataan dan pengolahan")) {
      return (
        positions.find((p) => p.name === "Pendataan dan Pengolahan")?.id || null
      );
    } else if (normalizedText.includes("pendataan")) {
      return positions.find((p) => p.name === "Pendataan")?.id || null;
    } else if (normalizedText.includes("pengolahan")) {
      return positions.find((p) => p.name === "Pengolahan")?.id || null;
    }

    return null;
  };

  const mapPendidikan = (pendidikanText: string): "sma" | "d4s1" => {
    const normalizedText = pendidikanText.toLowerCase().trim();

    if (
      normalizedText.includes("sms") ||
      normalizedText.includes("sma") ||
      normalizedText.includes("sederajat")
    ) {
      return "sma";
    } else if (normalizedText.includes("d4") || normalizedText.includes("s1")) {
      return "d4s1";
    }

    return "sma"; // default
  };

  const mapJenisKelamin = (
    jenisKelaminText: string,
  ): "laki_laki" | "perempuan" => {
    const normalizedText = jenisKelaminText.toLowerCase().trim();

    if (normalizedText === "lk" || normalizedText.includes("laki")) {
      return "laki_laki";
    } else if (
      normalizedText === "pr" ||
      normalizedText.includes("perempuan")
    ) {
      return "perempuan";
    }

    return "laki_laki"; // default
  };

  const findOccupationId = (pekerjaanText: string): string | null => {
    const normalizedText = pekerjaanText.toLowerCase().trim();

    // Try to find exact match first
    const exactMatch = occupations.find(
      (occ) => occ.name.toLowerCase() === normalizedText,
    );

    if (exactMatch) return exactMatch.id;

    // Try partial match
    const partialMatch = occupations.find(
      (occ) =>
        occ.name.toLowerCase().includes(normalizedText) ||
        normalizedText.includes(occ.name.toLowerCase()),
    );

    return partialMatch?.id || null;
  };

  const validateMitraData = (mitra: ProcessedMitra): string[] => {
    const errors: string[] = [];

    if (!mitra.nama_mitra.trim()) {
      errors.push("Nama lengkap tidak boleh kosong");
    }

    if (!mitra.kontak.trim()) {
      errors.push("No telepon tidak boleh kosong");
    }

    if (!mitra.alamat.trim()) {
      errors.push("Alamat tidak boleh kosong");
    }

    if (!mitra.sobat_id.trim()) {
      errors.push("SOBAT ID tidak boleh kosong");
    }

    if (!mitra.email.trim()) {
      errors.push("Email tidak boleh kosong");
    } else if (!/\S+@\S+\.\S+/.test(mitra.email)) {
      errors.push("Format email tidak valid");
    }

    if (!mitra.posisi_id) {
      errors.push(`Posisi "${mitra.original_posisi}" tidak dikenali`);
    }

    return errors;
  };

  const processExcelData = async () => {
    if (!file) return;

    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

      if (jsonData.length === 0) {
        toast.error("File Excel kosong atau tidak memiliki data");
        return;
      }

      const processedData: ProcessedMitra[] = jsonData.map((row, _index) => {
        const posisiId = mapPosisi(row["Posisi"] || "");
        const pekerjaanId = findOccupationId(row["Pekerjaan"] || "");

        const mitra: ProcessedMitra = {
          nama_mitra: (row["Nama Lengkap"] || "").trim(),
          jenis: "individu",
          kontak: (row["No Telp"] || "").trim(),
          alamat: (row["Alamat Detail"] || "").trim(),
          is_active: true,
          posisi_id: posisiId,
          jeniskelamin: mapJenisKelamin(row["Jenis Kelamin"] || ""),
          pendidikan: mapPendidikan(row["Pendidikan"] || ""),
          pekerjaan_id: pekerjaanId,
          sobat_id: (row["SOBAT ID"] || "").trim(),
          email: (row["Email"] || "").trim(),
          // Store original values for display
          original_posisi: row["Posisi"] || "",
          original_pendidikan: row["Pendidikan"] || "",
          original_jeniskelamin: row["Jenis Kelamin"] || "",
          original_pekerjaan: row["Pekerjaan"] || "",
        };

        mitra.validation_errors = validateMitraData(mitra);

        return mitra;
      });

      setPreviewData(processedData);
      setShowPreview(true);
    } catch (error) {
      console.error("Error processing Excel file:", error);
      toast.error("Gagal memproses file Excel. Pastikan format file benar.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);

    try {
      // Filter out data with validation errors
      const validData = previewData.filter(
        (item) =>
          !item.validation_errors || item.validation_errors.length === 0,
      );

      if (validData.length === 0) {
        toast.error("Tidak ada data valid untuk diimport");
        return;
      }

      const response = await fetch("/api/admin/mitra/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mitra: validData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengimport data");
      }

      // Create detailed success message
      let successMessage = "";
      if (result.inserted_count > 0 && result.updated_count > 0) {
        successMessage = `Berhasil menambah ${result.inserted_count} mitra baru dan mengupdate ${result.updated_count} mitra yang sudah ada`;
      } else if (result.inserted_count > 0) {
        successMessage = `Berhasil menambah ${result.inserted_count} mitra baru`;
      } else if (result.updated_count > 0) {
        successMessage = `Berhasil mengupdate ${result.updated_count} mitra yang sudah ada`;
      } else {
        successMessage = "Import selesai";
      }

      toast.success(successMessage);
      setShowConfirmDialog(false);
      setShowPreview(false);
      setFile(null);
      setPreviewData([]);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal mengimport data",
      );
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        "Nama Lengkap": "Contoh Nama",
        Posisi: "Mitra (Pendataan dan Pengolahan)",
        "Status Seleksi (1=Terpilih, 2=Tidak Terpilih)": "Diterima",
        "Posisi Daftar": "Mitra (Pendataan dan Pengolahan)",
        "Alamat Detail": "Jl. Contoh No. 123",
        "Alamat Prov": "35",
        "Alamat Kab": "79",
        "Alamat Kec": "010",
        "Alamat Desa": "008",
        "Tempat, Tanggal Lahir (Umur)*": "MALANG, 01 Januari 1990 (34)",
        "Jenis Kelamin": "Lk",
        Pendidikan: "Tamat SMS/Sederajat",
        Pekerjaan: "Wiraswasta",
        "Deskripsi Pekerjaan Lain": "",
        "No Telp": "+62 812-3456-7890",
        "SOBAT ID": "357922020001",
        Email: "contoh@email.com",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Mitra");
    XLSX.writeFile(wb, "template_import_mitra.xlsx");
  };

  const validCount = previewData.filter(
    (item) => !item.validation_errors || item.validation_errors.length === 0,
  ).length;
  const errorCount = previewData.filter(
    (item) => item.validation_errors && item.validation_errors.length > 0,
  ).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Import Mitra dari Excel
            </DialogTitle>
            <DialogDescription>
              Upload file Excel dengan data mitra untuk import massal. Pastikan
              format sesuai dengan template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Template Download */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-900">
                    Download Template
                  </h3>
                  <p className="text-sm text-blue-700">
                    Download template Excel untuk memastikan format yang benar
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="border-blue-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {file ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="w-12 h-12 text-green-600 mx-auto" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="text-gray-600">
                      Pilih file Excel (.xlsx, .xls)
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4"
                >
                  {file ? "Ganti File" : "Pilih File"}
                </Button>
              </div>

              {file && (
                <div className="flex gap-2">
                  <Button
                    onClick={processExcelData}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Proses File
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Preview Data */}
            {showPreview && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Preview Data</h3>
                  <div className="flex gap-2">
                    <Badge
                      variant="outline"
                      className="text-green-700 border-green-300"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Valid: {validCount}
                    </Badge>
                    {errorCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-red-700 border-red-300"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Error: {errorCount}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg max-h-96 overflow-y-auto overflow-x-hidden">
                  <div className="min-w-full">
                    <Table className="w-full table-fixed">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Status</TableHead>
                          <TableHead className="w-32">Nama</TableHead>
                          <TableHead className="w-24">Posisi</TableHead>
                          <TableHead className="w-20">Gender</TableHead>
                          <TableHead className="w-24">Pendidikan</TableHead>
                          <TableHead className="w-28">Kontak</TableHead>
                          <TableHead className="w-32">Email</TableHead>
                          <TableHead className="w-24">SOBAT ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="w-16">
                              {item.validation_errors &&
                              item.validation_errors.length > 0 ? (
                                <div className="flex items-center gap-1 text-red-600">
                                  <XCircle className="w-3 h-3" />
                                  <span className="text-xs">Error</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="text-xs">Valid</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="w-32">
                              <div>
                                <div
                                  className="font-medium text-sm truncate"
                                  title={item.nama_mitra}
                                >
                                  {item.nama_mitra}
                                </div>
                                {item.validation_errors &&
                                  item.validation_errors.length > 0 && (
                                    <div
                                      className="text-xs text-red-600 mt-1 truncate"
                                      title={item.validation_errors.join(", ")}
                                    >
                                      {item.validation_errors.join(", ")}
                                    </div>
                                  )}
                              </div>
                            </TableCell>
                            <TableCell className="w-24">
                              <div>
                                <div
                                  className="text-sm truncate"
                                  title={item.original_posisi}
                                >
                                  {item.original_posisi}
                                </div>
                                {!item.posisi_id && (
                                  <div className="text-xs text-red-600">
                                    Tidak dikenali
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="w-20">
                              <div>
                                <div
                                  className="text-sm truncate"
                                  title={item.original_jeniskelamin}
                                >
                                  {item.original_jeniskelamin}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  →{" "}
                                  {item.jeniskelamin === "laki_laki"
                                    ? "L"
                                    : "P"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="w-24">
                              <div>
                                <div
                                  className="text-sm truncate"
                                  title={item.original_pendidikan}
                                >
                                  {item.original_pendidikan}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  →{" "}
                                  {item.pendidikan === "sma" ? "SMA" : "D4/S1"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell
                              className="w-28 text-sm truncate"
                              title={item.kontak}
                            >
                              {item.kontak}
                            </TableCell>
                            <TableCell
                              className="w-32 text-sm truncate"
                              title={item.email}
                            >
                              {item.email}
                            </TableCell>
                            <TableCell
                              className="w-24 text-sm truncate"
                              title={item.sobat_id}
                            >
                              {item.sobat_id}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {validCount > 0 && (
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setShowConfirmDialog(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Import {validCount} Mitra Valid
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Konfirmasi Import
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan mengimport {validCount} mitra ke dalam sistem.
              {errorCount > 0 &&
                ` ${errorCount} data dengan error akan diabaikan.`}
              <br />
              <br />
              Proses ini tidak dapat dibatalkan. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImport}
              disabled={importing}
              className="bg-green-600 hover:bg-green-700"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengimport...
                </>
              ) : (
                "Ya, Import"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
