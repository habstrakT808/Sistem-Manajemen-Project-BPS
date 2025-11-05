// File: src/components/attendance/AttendanceStatus.tsx
// Attendance status component for ketua tim and pegawai

"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Power, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// Helper function to get WIB time (UTC+7)
function getWIBTime(date: Date = new Date()): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const wibTime = new Date(utc + 7 * 3600000); // UTC+7
  return wibTime;
}

interface AttendanceStatusData {
  status: "check_in" | "check_out" | "off";
  isWorkingHours: boolean;
  currentLog: {
    id: string;
    check_in_at: string;
    check_in_time: string;
  } | null;
  todayLogs: any[];
  message: string;
}

interface AttendanceStatusProps {
  variant?: "default" | "gradient"; // For styling on gradient backgrounds
}

async function fetchAttendanceStatus(): Promise<AttendanceStatusData> {
  const response = await fetch("/api/attendance/status", {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Gagal mengambil status kehadiran");
  }
  return result;
}

export function AttendanceStatus({
  variant = "default",
}: AttendanceStatusProps) {
  const queryClient = useQueryClient();
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkoutReason, setCheckoutReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingCheckInLog, setPendingCheckInLog] = useState<{
    id: string;
    check_in_at: string;
  } | null>(null);

  const { data: statusData, isLoading } = useQuery<AttendanceStatusData, Error>(
    {
      queryKey: ["attendance", "status"],
      queryFn: fetchAttendanceStatus,
      refetchInterval: 30000, // Refresh every 30 seconds
      staleTime: 10000,
    },
  );

  const handleStatusClick = async () => {
    if (!statusData) {
      console.log("No status data");
      return;
    }

    console.log(
      "Status click - Status:",
      statusData.status,
      "CurrentLog:",
      statusData.currentLog,
    );

    // If status is "off", do nothing (button is disabled)
    if (statusData.status === "off") {
      return;
    }

    // If status is "check_in"
    if (statusData.status === "check_in") {
      // If no active log, check-in first, then open checkout dialog
      if (!statusData.currentLog) {
        console.log("No current log, auto check-in first");
        // Auto check-in first
        setSubmitting(true);
        try {
          const response = await fetch("/api/attendance/check-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || "Gagal melakukan check-in");
          }

          console.log("Check-in response:", result);

          toast.success("Check-in berhasil");

          // Invalidate and wait for refetch
          await queryClient.invalidateQueries({
            queryKey: ["attendance", "status"],
          });

          // Wait a moment for the query to refetch
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Try to get updated status
          const { data: updatedStatus } = await queryClient.fetchQuery({
            queryKey: ["attendance", "status"],
            queryFn: fetchAttendanceStatus,
            staleTime: 0, // Force fresh fetch
          });

          console.log("Updated status after check-in:", updatedStatus);

          // Use the check-in response data directly
          const checkInData = result.data;
          if (checkInData && checkInData.id) {
            // Store the check-in log for checkout
            setPendingCheckInLog({
              id: checkInData.id,
              check_in_at: checkInData.check_in_at,
            });

            console.log(
              "Using check-in response data, opening checkout dialog",
            );
            setCheckoutDialogOpen(true);
          } else if (updatedStatus?.currentLog) {
            console.log("Using updated status, opening checkout dialog");
            setPendingCheckInLog(null); // Clear pending log if we have status
            setCheckoutDialogOpen(true);
          } else {
            console.error(
              "No currentLog after check-in, but opening dialog anyway",
            );
            // Open dialog anyway - the checkout will handle the validation
            setCheckoutDialogOpen(true);
          }
        } catch (error) {
          console.error("Error checking in:", error);
          toast.error(
            error instanceof Error ? error.message : "Gagal melakukan check-in",
          );
        } finally {
          setSubmitting(false);
        }
      } else {
        // Already checked in, open checkout dialog directly
        console.log("Has currentLog, opening checkout dialog directly");
        setCheckoutDialogOpen(true);
      }
    }
  };

  const handleCheckout = async () => {
    if (!checkoutReason.trim()) {
      toast.error("Alasan checkout wajib diisi");
      return;
    }

    // Use pending check-in log if available, otherwise refetch status
    let currentLog = null;

    if (pendingCheckInLog) {
      // Use the pending check-in log
      currentLog = {
        id: pendingCheckInLog.id,
        check_in_at: pendingCheckInLog.check_in_at,
        check_in_time: format(
          getWIBTime(new Date(pendingCheckInLog.check_in_at)),
          "HH:mm:ss",
        ),
      };
    } else {
      // Refetch status to get latest currentLog
      const { data: latestStatus } = await queryClient.fetchQuery({
        queryKey: ["attendance", "status"],
        queryFn: fetchAttendanceStatus,
        staleTime: 0,
      });

      currentLog = latestStatus?.currentLog || statusData?.currentLog;
    }

    if (!currentLog || !currentLog.id) {
      toast.error(
        "Tidak ada data check-in aktif. Silakan check-in terlebih dahulu.",
      );
      setCheckoutDialogOpen(false);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceLogId: currentLog.id,
          reason: checkoutReason.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Gagal melakukan check-out");
      }

      toast.success("Check-out berhasil");
      setCheckoutDialogOpen(false);
      setCheckoutReason("");
      setPendingCheckInLog(null); // Clear pending log after successful checkout

      // Invalidate and refetch status immediately
      await queryClient.invalidateQueries({
        queryKey: ["attendance", "status"],
      });

      // Force refetch to get updated status
      await queryClient.refetchQueries({ queryKey: ["attendance", "status"] });
    } catch (error) {
      console.error("Error checking out:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal melakukan check-out",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Gagal melakukan check-in");
      }

      toast.success("Check-in berhasil");

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["attendance", "status"] });
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal melakukan check-in",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="border-gray-300 text-gray-500"
      >
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (!statusData) {
    return null;
  }

  const getStatusBadge = (isGradientBackground = false) => {
    const baseClasses = isGradientBackground
      ? "bg-white/20 backdrop-blur-sm border-white/30 text-white font-semibold"
      : "bg-green-100 text-green-800 border-green-300 font-semibold";

    switch (statusData.status) {
      case "check_in":
        return (
          <Badge
            className={`${baseClasses} cursor-pointer hover:bg-green-200 transition-colors ${isGradientBackground ? "hover:bg-white/30" : ""}`}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Check In
          </Badge>
        );
      case "check_out":
        return (
          <Badge
            className={
              isGradientBackground
                ? "bg-white/20 backdrop-blur-sm border-white/30 text-white font-semibold"
                : "bg-orange-100 text-orange-800 border-orange-300 font-semibold"
            }
          >
            <XCircle className="w-3 h-3 mr-1" />
            Check Out
          </Badge>
        );
      case "off":
        return (
          <Badge
            className={
              isGradientBackground
                ? "bg-white/20 backdrop-blur-sm border-white/30 text-white font-semibold"
                : "bg-gray-100 text-gray-800 border-gray-300 font-semibold"
            }
          >
            <Power className="w-3 h-3 mr-1" />
            Off
          </Badge>
        );
      default:
        return null;
    }
  };

  // Disable buttons outside working hours or when status is "off"
  const isDisabled = statusData.status === "off" || !statusData.isWorkingHours;
  const isGradientBackground = variant === "gradient";

  return (
    <>
      <div className="flex items-center space-x-3">
        {statusData.status === "check_out" && (
          <Button
            onClick={handleCheckIn}
            disabled={submitting}
            size="sm"
            className={
              isGradientBackground
                ? "bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 text-xs px-3 py-1 h-7"
                : "bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 h-7"
            }
          >
            {submitting ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3 mr-1" />
            )}
            Check In
          </Button>
        )}
        <Button
          onClick={handleStatusClick}
          disabled={isDisabled || submitting}
          variant="outline"
          size="sm"
          className={
            isGradientBackground
              ? `bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`
              : `border-gray-300 text-gray-700 hover:bg-gray-50 ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`
          }
        >
          {getStatusBadge(isGradientBackground)}
        </Button>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check Out</DialogTitle>
            <DialogDescription>
              Silakan isi alasan checkout Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="checkout-reason">Alasan Checkout *</Label>
              <Textarea
                id="checkout-reason"
                value={checkoutReason}
                onChange={(e) => setCheckoutReason(e.target.value)}
                placeholder="Contoh: Perlu keluar untuk meeting klien, istirahat makan siang, dll."
                className="min-h-[100px]"
              />
            </div>
            {(statusData.currentLog || pendingCheckInLog) && (
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>
                    Check In:{" "}
                    {statusData.currentLog?.check_in_time ||
                      (pendingCheckInLog
                        ? format(
                            getWIBTime(new Date(pendingCheckInLog.check_in_at)),
                            "HH:mm:ss",
                          )
                        : "")}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCheckoutDialogOpen(false);
                setCheckoutReason("");
              }}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={submitting || !checkoutReason.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Check Out"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
