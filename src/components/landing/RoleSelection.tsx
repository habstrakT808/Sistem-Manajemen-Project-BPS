"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Shield, Users, User, ArrowRight } from "lucide-react";

const RoleSelection = () => {
  const router = useRouter();

  const roles = [
    {
      title: "ADMIN",
      icon: Shield,
      description: "Kelola seluruh sistem, user, dan konfigurasi platform",
      permissions: [
        "Manajemen User",
        "Konfigurasi Sistem",
        "Laporan Global",
        "Backup Data",
      ],
      color: "from-red-500 to-red-600",
      bgColor: "from-red-50 to-red-100",
      textColor: "text-red-600",
      role: "admin",
    },
    {
      title: "KETUA TIM",
      icon: Users,
      description: "Buat project, assign tim, dan monitor progress",
      permissions: [
        "Buat Project",
        "Assign Team",
        "Monitor Progress",
        "Laporan Tim",
      ],
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      textColor: "text-blue-600",
      role: "ketua_tim",
    },
    {
      title: "PEGAWAI",
      icon: User,
      description: "Kerjakan task, update progress, dan submit laporan",
      permissions: [
        "Terima Task",
        "Update Progress",
        "Submit Report",
        "View Timeline",
      ],
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      textColor: "text-green-600",
      role: "pegawai",
    },
  ];

  const prefetchAndPush = (href: string) => {
    router.prefetch(href);
    router.push(href);
  };

  return (
    <section id="role-selection" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Akses Berdasarkan Peran
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Setiap peran memiliki akses dan fitur yang disesuaikan dengan
            tanggung jawabnya
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {roles.map((role, index) => {
            const IconComponent = role.icon;

            return (
              <div
                key={index}
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              >
                <div
                  className={`w-16 h-16 bg-gradient-to-br ${role.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <IconComponent className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {role.title}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {role.description}
                </p>

                <div className="space-y-3 mb-8">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Yang bisa Anda lakukan:
                  </p>
                  {role.permissions.map((permission, idx) => (
                    <div
                      key={idx}
                      className="flex items-center text-sm text-gray-700"
                    >
                      <div
                        className={`w-2 h-2 bg-gradient-to-r ${role.color} rounded-full mr-3`}
                      ></div>
                      {permission}
                    </div>
                  ))}
                </div>

                <button
                  onMouseEnter={() =>
                    router.prefetch(`/auth/login?role=${role.role}`)
                  }
                  onClick={() =>
                    prefetchAndPush(`/auth/login?role=${role.role}`)
                  }
                  className={`w-full bg-gradient-to-r ${role.color} text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform group-hover:scale-105 flex items-center justify-center space-x-2`}
                >
                  <span>Login sebagai {role.title}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RoleSelection;
