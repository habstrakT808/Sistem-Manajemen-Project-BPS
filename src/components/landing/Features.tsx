"use client";

import React from "react";
import {
  Clipboard,
  Users,
  DollarSign,
  BarChart3,
  Zap,
  Star,
  CheckCircle,
  Clock,
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Clipboard,
      title: "Manajemen Project Terintegrasi",
      description:
        "Buat, kelola, dan monitor project dengan timeline yang jelas dan assignment otomatis",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: Users,
      title: "Monitoring Tim Real-time",
      description:
        "Pantau workload pegawai dengan indikator visual dan tracking progress harian",
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: DollarSign,
      title: "Tracking Keuangan Akurat",
      description:
        "Kelola uang transport dan honor mitra dengan limit otomatis dan laporan reimburse",
      color: "from-yellow-500 to-orange-500",
      bgColor: "bg-yellow-50",
    },
    {
      icon: BarChart3,
      title: "Laporan Otomatis",
      description:
        "Generate laporan untuk walikota dengan template resmi dan export PDF/Excel",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: Zap,
      title: "Kolaborasi Real-time",
      description:
        "Update task, notifikasi instant, dan sinkronisasi data live untuk semua user",
      color: "from-red-500 to-pink-500",
      bgColor: "bg-red-50",
    },
    {
      icon: Star,
      title: "Sistem Review Mitra",
      description:
        "Evaluasi performa mitra dengan rating dan feedback untuk project mendatang",
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  return (
    <section id="fitur" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Fitur Unggulan
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Solusi lengkap untuk semua kebutuhan manajemen project dan pegawai
            Anda
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;

            return (
              <div
                key={index}
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
              >
                <div
                  className={`w-16 h-16 ${feature.bgColor} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <IconComponent
                    className={`w-8 h-8 bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}
                  />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-200">
                  {feature.title}
                </h3>

                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>

                <div className="mt-6 flex items-center text-sm text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Pelajari lebih lanjut</span>
                  <CheckCircle className="w-4 h-4 ml-2" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Stats */}
        <div className="mt-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="text-white">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-8 h-8 mb-2" />
              </div>
              <div className="text-3xl font-bold mb-2">90%</div>
              <div className="text-blue-100">
                Pengurangan waktu administrasi
              </div>
            </div>
            <div className="text-white">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-8 h-8 mb-2" />
              </div>
              <div className="text-3xl font-bold mb-2">100%</div>
              <div className="text-blue-100">Akurasi laporan keuangan</div>
            </div>
            <div className="text-white">
              <div className="flex items-center justify-center mb-2">
                <Zap className="w-8 h-8 mb-2" />
              </div>
              <div className="text-3xl font-bold mb-2">Real-time</div>
              <div className="text-blue-100">Monitoring dan notifikasi</div>
            </div>
            <div className="text-white">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-8 h-8 mb-2" />
              </div>
              <div className="text-3xl font-bold mb-2">Unlimited</div>
              <div className="text-blue-100">Project dan team members</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
