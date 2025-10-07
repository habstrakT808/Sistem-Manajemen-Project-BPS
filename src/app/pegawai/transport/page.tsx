"use client";
import TransportCalendar from "@/components/pegawai/TransportCalendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import React from "react";

async function fetchMyProjects() {
  const res = await fetch("/api/pegawai/tasks");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load");
  const tasks = json.data || [];
  const map = new Map<string, { id: string; nama_project: string }>();
  tasks.forEach((t: any) => {
    if (t.projects?.id)
      map.set(String(t.projects.id), {
        id: String(t.projects.id),
        nama_project: t.projects.nama_project,
      });
  });
  return Array.from(map.values());
}

export default function TransportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedProjectId = searchParams.get("project_id");
  const { data: projects = [] } = useQuery({
    queryKey: ["pegawai", "transport", "projects"],
    queryFn: fetchMyProjects,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="px-1">
        <h1 className="text-3xl font-bold text-emerald-900">
          Kalender Transport
        </h1>
        <p className="text-gray-600 mt-2">
          Alokasikan tunjangan transport Anda ke tanggal tertentu
        </p>
      </div>

      {/* Filter Project */}
      <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Pilih proyek untuk memfilter tanggal transport.
        </div>
        <Select
          value={selectedProjectId || "all"}
          onValueChange={(v) => {
            const p = new URLSearchParams(Array.from(searchParams.entries()));
            if (v === "all") p.delete("project_id");
            else p.set("project_id", v);
            router.push(`/pegawai/transport?${p.toString()}`);
          }}
        >
          <SelectTrigger className="w-64 bg-white border-2 border-green-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            <SelectValue placeholder="Pilih Proyek" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Semua Proyek</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nama_project}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border border-green-100 bg-white shadow-sm p-2">
        <TransportCalendar projectId={selectedProjectId} />
      </div>
    </div>
  );
}
