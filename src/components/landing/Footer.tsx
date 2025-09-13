"use client";

import React from "react";
import { User, Mail, Phone, ExternalLink } from "lucide-react";

const Footer = () => {
  const quickLinks = [
    { label: "Beranda", href: "#beranda" },
    { label: "Tentang", href: "#tentang" },
    { label: "Login Admin", href: "#admin" },
    { label: "Login Ketua Tim", href: "#ketua-tim" },
    { label: "Login Pegawai", href: "#pegawai" },
  ];

  const features = [
    { label: "Project Management", href: "#" },
    { label: "Team Monitoring", href: "#" },
    { label: "Financial Tracking", href: "#" },
    { label: "Automated Reports", href: "#" },
    { label: "Review System", href: "#" },
  ];

  const support = [
    { label: "Help Center", href: "#" },
    { label: "Documentation", href: "#" },
    { label: "Contact Support", href: "#kontak" },
    { label: "System Status", href: "#" },
    { label: "Training", href: "#" },
  ];

  const legal = [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
    { label: "Data Security", href: "#" },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Sistem Manajemen</h3>
                <p className="text-gray-400 text-sm">Project & Pegawai</p>
              </div>
            </div>

            <p className="text-gray-300 leading-relaxed mb-6">
              Platform digital terintegrasi untuk manajemen project, monitoring
              pegawai, dan pelaporan keuangan yang akurat. Meningkatkan
              efisiensi kerja tim Anda hingga 90%.
            </p>

            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <Mail className="w-5 h-5 mr-3 text-blue-400" />
                <span>support@sistemmanajemen.id</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Phone className="w-5 h-5 mr-3 text-blue-400" />
                <span>(021) 555-0123</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-blue-400">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center group"
                  >
                    {link.label}
                    <ExternalLink className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-blue-400">
              Features
            </h4>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index}>
                  <a
                    href={feature.href}
                    className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center group"
                  >
                    {feature.label}
                    <ExternalLink className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-blue-400">
              Support
            </h4>
            <ul className="space-y-3">
              {support.map((item, index) => (
                <li key={index}>
                  <a
                    href={item.href}
                    className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center group"
                  >
                    {item.label}
                    <ExternalLink className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-16 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 mb-4 md:mb-0">
              <p>
                &copy; 2024 Sistem Manajemen Project & Pegawai. All rights
                reserved.
              </p>
            </div>

            <div className="flex space-x-6">
              {legal.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Dibuat dengan ❤️ untuk meningkatkan efisiensi kerja tim Indonesia
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
