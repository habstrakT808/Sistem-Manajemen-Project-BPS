"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  ArrowLeft,
  FileCheck,
  FilePlus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export function ExportDashboard() {
  const router = useRouter();
  const [_selectedType, setSelectedType] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Array<{ id: string; type: string; data: any; created_at: string }>
  >([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  const documentTypes = [
    {
      id: "sk-tim",
      title: "SK Tim Pelaksana",
      description:
        "Surat Keputusan untuk Tim Pelaksana Kegiatan Pendataan Survei",
      icon: FileCheck,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      available: true,
    },
    {
      id: "spk",
      title: "Surat Perjanjian Kerja (SPK)",
      description:
        "Surat Perjanjian Kerja Petugas Kegiatan Survei/Sensus Bulanan untuk Mitra",
      icon: FilePlus,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      available: true,
    },
    {
      id: "reimbursement",
      title: "Form Reimbursement",
      description: "Formulir Pengajuan Reimbursement",
      icon: FileText,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
      available: false,
    },
  ];

  const fetchDrafts = async (type?: string) => {
    try {
      setLoadingDrafts(true);
      const qs =
        type && type !== "all" ? `?type=${encodeURIComponent(type)}` : "";
      const res = await fetch(`/api/admin/export/draft${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat draft");
      setDrafts(json.drafts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDrafts(false);
    }
  };

  useEffect(() => {
    fetchDrafts(filterType);
  }, [filterType]);

  const getTypeTitle = (type: string) => {
    switch (type) {
      case "sk-tim":
        return "SK Tim Pelaksana";
      case "spk":
        return "Surat Perjanjian Kerja (SPK)";
      default:
        return type;
    }
  };

  const getDraftNumber = (draft: { type: string; data?: any }) => {
    if (draft.type === "spk") {
      return draft.data?.nomorSPK || "-";
    }
    return draft.data?.nomorSK || "-";
  };

  const handlePreviewDraft = (draft: any) => {
    try {
      if (draft.type === "sk-tim") {
        localStorage.setItem("sk_draft_to_preview", JSON.stringify(draft.data));
        router.push("/admin/export/sk-tim");
      } else if (draft.type === "spk") {
        localStorage.setItem(
          "spk_draft_to_preview",
          JSON.stringify(draft.data),
        );
        router.push("/admin/export/spk");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadDraft = async (draft: any) => {
    try {
      const response = await fetch("/api/admin/export/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: draft.type,
          format: "docx",
          data: draft.data,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Gagal export");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const fileName =
        getDraftNumber(draft) !== "-" ? getDraftNumber(draft) : draft.id;
      a.download = `Draft-${draft.type}-${fileName}.docx`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      const res = await fetch(
        `/api/admin/export/draft?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      await res.json();
      fetchDrafts(filterType);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin">
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
                  Generate Surat
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Buat dan kelola dokumen resmi dengan mudah
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  Auto-generate
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Document Types */}
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
                <Download className="w-8 h-8 mr-3 text-blue-600" />
                Pilih Jenis Dokumen
              </h2>
              <p className="text-lg text-gray-600">
                Pilih jenis dokumen yang ingin Anda buat
              </p>
              {drafts.length > 0 && (
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {getTypeTitle(drafts[0].type)} - {getDraftNumber(drafts[0])}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {documentTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <Card
                    key={type.id}
                    className={`group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 border-2 ${
                      !type.available
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:border-blue-300"
                    }`}
                    onClick={() => {
                      if (type.available) {
                        setSelectedType(type.id);
                        router.push(`/admin/export/${type.id}`);
                      }
                    }}
                  >
                    <CardHeader className="pb-4">
                      <div
                        className={`w-16 h-16 bg-gradient-to-r ${type.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                      >
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {type.title}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-2">
                        {type.description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      {type.available ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-green-600 font-medium bg-green-100 px-3 py-1 rounded-full">
                            Tersedia
                          </span>
                          <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            →
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                          Segera Hadir
                        </span>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
        {/* Saved Drafts - moved below */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Draft Tersimpan
            </h3>
            <div className="flex items-center space-x-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Semua Jenis</option>
                <option value="sk-tim">SK Tim Pelaksana</option>
                <option value="spk">Surat Perjanjian Kerja (SPK)</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchDrafts(filterType)}
              >
                Refresh
              </Button>
            </div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            {loadingDrafts ? (
              <div className="text-sm text-gray-500">Memuat draft...</div>
            ) : drafts.length === 0 ? (
              <div className="text-sm text-gray-500">
                Belum ada draft tersimpan
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {getTypeTitle(d.type)} - {getDraftNumber(d)}
                      </div>
                      <div className="text-xs text-gray-600">
                        Dibuat: {new Date(d.created_at).toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewDraft(d)}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDraft(d)}
                      >
                        Download DOCX
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteDraft(d.id)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
