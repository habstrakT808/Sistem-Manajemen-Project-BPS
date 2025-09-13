"use client";

import React from "react";
import { Lock, Plus, Zap, FileText, ArrowRight } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      icon: Lock,
      title: "Login & Setup",
      description:
        "Admin membuat user dan mitra dengan konfigurasi yang sesuai",
      color: "from-blue-500 to-blue-600",
    },
    {
      number: "02",
      icon: Plus,
      title: "Create Project",
      description: "Ketua tim buat project dan assign team sesuai keahlian",
      color: "from-green-500 to-green-600",
    },
    {
      number: "03",
      icon: Zap,
      title: "Execute & Monitor",
      description: "Pegawai kerjakan task dengan real-time monitoring progress",
      color: "from-yellow-500 to-orange-500",
    },
    {
      number: "04",
      icon: FileText,
      title: "Report & Reimburse",
      description: "Generate laporan otomatis untuk reimburse walikota",
      color: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Cara Kerja Sistem
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Proses yang sederhana dan efisien untuk memaksimalkan produktivitas
            tim Anda
          </p>
        </div>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-20 left-1/2 transform -translate-x-1/2 w-3/4 h-0.5 bg-gradient-to-r from-blue-200 via-green-200 via-yellow-200 to-purple-200"></div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const IconComponent = step.icon;

              return (
                <div key={index} className="relative group text-center">
                  {/* Step Number */}
                  <div className="relative mb-6">
                    <div
                      className={`w-20 h-20 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                    >
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                      <span className="text-sm font-bold text-gray-700">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow for desktop */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 -right-4 z-10">
                      <ArrowRight className="w-8 h-8 text-gray-300 group-hover:text-gray-500 transition-colors duration-200" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Siap Untuk Mulai?
            </h3>
            <p className="text-gray-600 mb-6">
              Bergabunglah dengan ratusan organisasi yang telah merasakan
              efisiensi sistem kami
            </p>
            <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center space-x-2 mx-auto">
              <span>Mulai Gratis Sekarang</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
