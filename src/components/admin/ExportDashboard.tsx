"use client";

import React, { useState } from "react";
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
      id: "surat-tugas",
      title: "Surat Tugas",
      description: "Surat Tugas untuk Pegawai atau Mitra",
      icon: FilePlus,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      available: false,
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
      </div>
    </div>
  );
}
