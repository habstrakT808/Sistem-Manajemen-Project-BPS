"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Bagaimana cara mendapatkan akses sistem?",
      answer:
        "Admin sistem akan memberikan kredensial akses sesuai dengan peran Anda. Hubungi admin untuk mendapatkan username dan password, kemudian login melalui halaman utama dengan memilih peran yang sesuai.",
    },
    {
      question: "Apakah data aman dan terlindungi?",
      answer:
        "Ya, sistem menggunakan enkripsi tingkat enterprise dengan backup otomatis harian. Semua data disimpan dengan standar keamanan tinggi dan hanya bisa diakses oleh user yang memiliki otorisasi sesuai perannya.",
    },
    {
      question: "Bagaimana sistem backup dan recovery?",
      answer:
        "Sistem melakukan backup otomatis setiap hari pada pukul 2 pagi. Data backup disimpan dalam multiple location untuk memastikan keamanan. Recovery data dapat dilakukan dalam waktu maksimal 4 jam jika terjadi masalah.",
    },
    {
      question: "Apakah bisa diakses dari mobile?",
      answer:
        "Tentu saja! Sistem dirancang responsive dan dapat diakses dengan optimal melalui smartphone, tablet, laptop, maupun desktop. Interface akan menyesuaikan dengan ukuran layar device Anda.",
    },
    {
      question: "Bagaimana sistem support dan maintenance?",
      answer:
        "Tim support tersedia 24/7 melalui chat, email, dan telepon. Maintenance rutin dilakukan setiap minggu pada hari Minggu pukul 1-3 pagi untuk memastikan performa sistem tetap optimal.",
    },
    {
      question: "Apakah ada batasan jumlah project atau user?",
      answer:
        "Tidak ada batasan untuk jumlah project, user, atau data yang bisa disimpan dalam sistem. Anda dapat menambahkan sebanyak yang dibutuhkan sesuai dengan kebutuhan organisasi.",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Pertanyaan yang sering diajukan tentang sistem kami
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-2xl overflow-hidden hover:bg-gray-100 transition-colors duration-200"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-8 py-6 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              >
                <h3 className="text-lg font-semibold text-gray-900 pr-4">
                  {faq.question}
                </h3>
                <div className="flex-shrink-0">
                  {openIndex === index ? (
                    <ChevronUp className="w-6 h-6 text-blue-600 transform transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-gray-400 transform transition-transform duration-200" />
                  )}
                </div>
              </button>

              {openIndex === index && (
                <div className="px-8 pb-6 animate-fadeIn">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">Masih ada pertanyaan lain?</p>
          <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105">
            Hubungi Support
          </button>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
