"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Database } from "@/../database/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Star,
  Eye,
  EyeOff,
  Building,
  User,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { MitraForm } from "./MitraForm";

type MitraRow = Database["public"]["Tables"]["mitra"]["Row"];

interface MitraWithStats extends MitraRow {
  review_count?: number;
  average_rating?: string;
  monthly_usage?: number;
  total_projects?: number;
}

const jenisConfig = {
  perusahaan: {
    label: "Perusahaan",
    icon: Building,
    color: "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
    description: "Corporate Partner",
  },
  individu: {
    label: "Individu",
    icon: User,
    color: "bg-gradient-to-r from-green-500 to-green-600 text-white",
    description: "Individual Partner",
  },
};

export function MitraManagement() {
  const [mitra, setMitra] = useState<MitraWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [jenisFilter, setJenisFilter] = useState<
    "perusahaan" | "individu" | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [showMitraForm, setShowMitraForm] = useState(false);
  const [editingMitra, setEditingMitra] = useState<MitraRow | null>(null);
  const [deletingMitra, setDeletingMitra] = useState<MitraRow | null>(null);

  const fetchMitra = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/admin/mitra");
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to fetch mitra");
        return;
      }

      setMitra(result.data);
    } catch (error) {
      console.error("Error fetching mitra:", error);
      toast.error("Failed to fetch mitra");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMitra();
  }, [fetchMitra]);

  const handleDeleteMitra = async (mitraItem: MitraRow) => {
    try {
      const response = await fetch(`/api/admin/mitra?id=${mitraItem.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to delete mitra");
        return;
      }

      toast.success("Mitra deleted successfully");
      fetchMitra();
      setDeletingMitra(null);
    } catch (error) {
      console.error("Error deleting mitra:", error);
      toast.error("Failed to delete mitra");
    }
  };

  const handleToggleMitraStatus = async (mitraItem: MitraRow) => {
    try {
      const response = await fetch("/api/admin/mitra", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: mitraItem.id,
          nama_mitra: mitraItem.nama_mitra,
          jenis: mitraItem.jenis,
          kontak: mitraItem.kontak,
          alamat: mitraItem.alamat,
          deskripsi: mitraItem.deskripsi,
          is_active: !mitraItem.is_active,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to update mitra status");
        return;
      }

      toast.success(
        `Mitra ${mitraItem.is_active ? "deactivated" : "activated"} successfully`
      );
      fetchMitra();
    } catch (error) {
      console.error("Error updating mitra status:", error);
      toast.error("Failed to update mitra status");
    }
  };

  const renderStarRating = (rating: string) => {
    const numRating = parseFloat(rating);
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= numRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
        />
      );
    }

    return (
      <div className="flex items-center space-x-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-600 ml-2">({rating})</span>
      </div>
    );
  };

  const filteredMitra = mitra.filter((mitraItem) => {
    const matchesSearch =
      mitraItem.nama_mitra.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mitraItem.kontak &&
        mitraItem.kontak.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesJenis =
      jenisFilter === "all" || mitraItem.jenis === jenisFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && mitraItem.is_active) ||
      (statusFilter === "inactive" && !mitraItem.is_active);

    return matchesSearch && matchesJenis && matchesStatus;
  });

  if (showMitraForm) {
    return (
      <MitraForm
        mitra={editingMitra}
        onClose={() => {
          setShowMitraForm(false);
          setEditingMitra(null);
        }}
        onSuccess={() => {
          setShowMitraForm(false);
          setEditingMitra(null);
          fetchMitra();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent flex items-center">
            <Building2 className="w-8 h-8 mr-3 text-purple-600" />
            Mitra Management
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Manage business partners and individual contractors
          </p>
        </div>

        <Button
          onClick={() => setShowMitraForm(true)}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Mitra
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Total Mitra
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {mitra.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Active Partners
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {mitra.filter((m) => m.is_active).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Companies
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {mitra.filter((m) => m.jenis === "perusahaan").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Individuals
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {mitra.filter((m) => m.jenis === "individu").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-0 shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6">
          <div className="font-semibold text-xl text-gray-900">
            Filters & Search
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Find and filter mitra based on their information
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search mitra..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 py-3 rounded-xl border-2 focus:border-purple-300 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-xl px-6"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Type:{" "}
                    {jenisFilter === "all"
                      ? "All"
                      : jenisConfig[jenisFilter].label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-xl shadow-xl">
                  <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setJenisFilter("all")}>
                    All Types
                  </DropdownMenuItem>
                  {Object.entries(jenisConfig).map(([jenis, config]) => (
                    <DropdownMenuItem
                      key={jenis}
                      onClick={() =>
                        setJenisFilter(jenis as "perusahaan" | "individu")
                      }
                    >
                      <config.icon className="w-4 h-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-xl px-6"
                  >
                    Status: {statusFilter === "all" ? "All" : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-xl shadow-xl">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>
                    Inactive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Mitra Table */}
      <div className="border-0 shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-purple-50 p-6">
          <div className="font-semibold text-xl">
            Mitra ({filteredMitra.length})
          </div>
          <div className="text-muted-foreground text-sm">
            A list of all business partners and contractors
          </div>
        </div>
        <div className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="text-gray-600">Loading mitra...</span>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold text-gray-900">
                    Partner
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Type
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Rating
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Contact
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Created
                  </TableHead>
                  <TableHead className="w-[70px] font-semibold text-gray-900">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMitra.map((mitraItem) => {
                  const config = jenisConfig[mitraItem.jenis];
                  const IconComponent = config.icon;

                  return (
                    <TableRow
                      key={mitraItem.id}
                      className="hover:bg-purple-50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                              {mitraItem.nama_mitra.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {mitraItem.nama_mitra}
                            </div>
                            <div className="text-sm text-gray-500">
                              {mitraItem.deskripsi || "No description"}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`${config.color} border-0 font-semibold`}
                        >
                          <IconComponent className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {mitraItem.average_rating &&
                        parseFloat(mitraItem.average_rating) > 0 ? (
                          renderStarRating(mitraItem.average_rating)
                        ) : (
                          <span className="text-sm text-gray-400">
                            No reviews
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`${
                            mitraItem.is_active
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          } font-semibold`}
                        >
                          {mitraItem.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          <div className="text-gray-900">
                            {mitraItem.kontak || "No contact"}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {mitraItem.alamat || "No address"}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {new Date(mitraItem.created_at).toLocaleDateString(
                            "id-ID"
                          )}
                        </span>
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-purple-100 rounded-lg"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-xl shadow-xl"
                          >
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingMitra(mitraItem);
                                setShowMitraForm(true);
                              }}
                              className="rounded-lg"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleMitraStatus(mitraItem)}
                              className="rounded-lg"
                            >
                              {mitraItem.is_active ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingMitra(mitraItem)}
                              className="text-red-600 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredMitra.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="text-gray-500">
                        <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No mitra found</p>
                        <p className="text-sm mt-2">
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingMitra}
        onOpenChange={() => setDeletingMitra(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              mitra <strong> {deletingMitra?.nama_mitra}</strong> and remove all
              associated data including reviews and project assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMitra && handleDeleteMitra(deletingMitra)}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl"
            >
              Delete Mitra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
