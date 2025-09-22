"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, User, LogIn, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const menuItems = [
    { label: "Beranda", href: "#beranda" },
    { label: "Tentang Sistem", href: "#tentang" },
    { label: "Fitur", href: "#fitur" },
    { label: "Panduan", href: "#panduan" },
    { label: "Kontak", href: "#kontak" },
  ];

  const prefetchAndPush = (href: string) => {
    router.prefetch(href);
    router.push(href);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Sistem Manajemen
              </h1>
              <p className="text-xs text-gray-600 -mt-1">Project & Pegawai</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200 font-medium"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA Button with Role Dropdown (Desktop) */}
          <div className="hidden md:flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 flex items-center space-x-2">
                  <LogIn className="w-4 h-4" />
                  <span>Masuk Sistem</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Masuk sebagai</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => prefetchAndPush("/auth/login?role=admin")}
                >
                  <Shield className="w-4 h-4 text-red-600" />
                  <span>Admin</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => prefetchAndPush("/auth/login?role=pegawai")}
                >
                  <User className="w-4 h-4 text-green-600" />
                  <span>Pegawai</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <nav className="flex flex-col space-y-4">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-gray-600 hover:text-blue-600 transition-colors duration-200 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 mt-4">
                    <LogIn className="w-4 h-4" />
                    <span>Masuk Sistem</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Masuk sebagai</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      prefetchAndPush("/auth/login?role=admin");
                      setIsMenuOpen(false);
                    }}
                  >
                    <Shield className="w-4 h-4 text-red-600" />
                    <span>Admin</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      prefetchAndPush("/auth/login?role=pegawai");
                      setIsMenuOpen(false);
                    }}
                  >
                    <User className="w-4 h-4 text-green-600" />
                    <span>Pegawai</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
