"use client";

import React from "react";
import {
  Mail,
  Phone,
  Clock,
  MapPin,
  MessageCircle,
  HeadphonesIcon,
} from "lucide-react";

const Contact = () => {
  const contactInfo = [
    {
      icon: Mail,
      title: "Email Support",
      value: "support@sistemmanajemen.id",
      description: "Respon dalam 2 jam kerja",
    },
    {
      icon: Phone,
      title: "Telepon",
      value: "(021) 555-0123",
      description: "Senin - Jumat, 08:00 - 17:00",
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      value: "Chat langsung",
      description: "24/7 tersedia",
    },
    {
      icon: MapPin,
      title: "Alamat",
      value: "Jakarta Pusat",
      description: "Gedung Perkantoran Central",
    },
  ];

  return (
    <section
      id="kontak"
      className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Butuh Bantuan?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Tim support kami siap membantu Anda 24/7. Jangan ragu untuk
            menghubungi kami
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {contactInfo.map((contact, index) => {
            const IconComponent = contact.icon;

            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-center group"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <IconComponent className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {contact.title}
                </h3>

                <p className="text-blue-600 font-semibold mb-2">
                  {contact.value}
                </p>

                <p className="text-gray-600 text-sm">{contact.description}</p>
              </div>
            );
          })}
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Form */}
            <div className="p-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Kirim Pesan
              </h3>

              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subjek
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Pertanyaan tentang sistem"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pesan
                  </label>
                  <textarea
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Tulis pesan Anda disini..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105"
                >
                  Kirim Pesan
                </button>
              </form>
            </div>

            {/* Support Info */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-white">
              <div className="h-full flex flex-col justify-center">
                <HeadphonesIcon className="w-16 h-16 mb-8 opacity-80" />

                <h3 className="text-3xl font-bold mb-6">Support 24/7</h3>

                <p className="text-blue-100 text-lg leading-relaxed mb-8">
                  Tim ahli kami siap membantu Anda menyelesaikan masalah dan
                  memberikan solusi terbaik untuk kebutuhan sistem manajemen
                  Anda.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-3 text-blue-200" />
                    <span className="text-blue-100">
                      Response time: &lt; 2 jam
                    </span>
                  </div>
                  <div className="flex items-center">
                    <HeadphonesIcon className="w-5 h-5 mr-3 text-blue-200" />
                    <span className="text-blue-100">Live chat tersedia</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 mr-3 text-blue-200" />
                    <span className="text-blue-100">Telepon support aktif</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
