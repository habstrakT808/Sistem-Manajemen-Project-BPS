"use client";

import React from "react";
import { Play, ArrowRight, CheckCircle } from "lucide-react";

const HeroSection = () => {
  const benefits = [
    "Real-time monitoring dan tracking",
    "Laporan otomatis untuk reimburse",
    "Manajemen tim yang efektif",
    "Tracking finansial yang akurat",
  ];

  return (
    <section
      id="beranda"
      className="relative min-h-screen flex items-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-16 overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-blue-100/30 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-indigo-100/30 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
              Sistem Terdepan untuk Manajemen Project
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Kelola Project dan Tim Anda dengan
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {" "}
                Efisien
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Platform digital terintegrasi untuk manajemen project, monitoring
              pegawai, dan pelaporan keuangan yang akurat untuk reimburse
              walikota
            </p>

            {/* Benefits */}
            <div className="space-y-3 mb-10">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="font-medium">{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  document
                    .getElementById("role-selection")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>Mulai Sekarang</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>

              <button
                onClick={() => {
                  // Scroll to role selection section
                  document
                    .getElementById("role-selection")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group bg-white text-blue-600 border-2 border-blue-200 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Play className="w-5 h-5" />
                <span>Lihat Demo</span>
              </button>
            </div>
          </div>

          {/* Hero Image/Illustration */}
          <div className="relative">
            <div className="relative bg-white p-8 rounded-2xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
                {/* Mock Dashboard */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-32 h-6 bg-gray-300 rounded animate-pulse"></div>
                    <div className="w-16 h-6 bg-blue-300 rounded animate-pulse"></div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="w-8 h-8 bg-blue-200 rounded-full mb-2 animate-pulse"></div>
                      <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="w-8 h-8 bg-green-200 rounded-full mb-2 animate-pulse"></div>
                      <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="w-8 h-8 bg-orange-200 rounded-full mb-2 animate-pulse"></div>
                      <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="space-y-3">
                      <div className="w-full h-3 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-3/4 h-3 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-1/2 h-3 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-bounce"></div>
            <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-full animate-pulse"></div>
            <div className="absolute top-1/2 -right-8 w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full animate-ping"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
