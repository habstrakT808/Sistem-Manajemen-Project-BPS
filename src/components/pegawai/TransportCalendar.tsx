"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface TransportAllocation {
  id: string;
  task_id: string;
  amount: number;
  allocation_date: string | null;
  allocated_at: string | null;
  canceled_at: string | null;
  task: {
    title: string;
    project_name: string;
    start_date: string;
    end_date: string;
  };
}

interface TransportCalendarProps {
  onAllocationUpdate?: () => void;
}

export default function TransportCalendar({
  onAllocationUpdate,
}: TransportCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allocations, setAllocations] = useState<TransportAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAllocation, setSelectedAllocation] =
    useState<TransportAllocation | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Get first day of current month
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Generate calendar days
  const calendarDays = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const fetchAllocations = async () => {
    try {
      const response = await fetch("/api/pegawai/transport-allocations");
      if (!response.ok) throw new Error("Failed to fetch allocations");

      const data = await response.json();
      setAllocations(data.allocations || []);
    } catch (error) {
      console.error("Error fetching allocations:", error);
      toast.error("Failed to load transport allocations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  const handleAllocateTransport = async () => {
    if (!selectedAllocation || !selectedDate) return;

    try {
      const response = await fetch(
        `/api/pegawai/transport-allocations/${selectedAllocation.id}/allocate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allocation_date: selectedDate }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to allocate transport");
      }

      toast.success("Transport allocated successfully!");
      setSelectedAllocation(null);
      setSelectedDate("");
      setIsEditMode(false);
      fetchAllocations();
      onAllocationUpdate?.();
    } catch (error) {
      console.error("Error allocating transport:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to allocate transport"
      );
    }
  };

  const handleUpdateTransport = async () => {
    if (!selectedAllocation || !selectedDate) return;

    try {
      const response = await fetch(
        `/api/pegawai/transport-allocations/${selectedAllocation.id}/update`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allocation_date: selectedDate }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update transport allocation");
      }

      toast.success("Transport allocation updated successfully!");
      setSelectedAllocation(null);
      setSelectedDate("");
      setIsEditMode(false);
      fetchAllocations();
      onAllocationUpdate?.();
    } catch (error) {
      console.error("Error updating transport allocation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update transport allocation"
      );
    }
  };

  const isAllocated = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return allocations.some(
      (allocation) => allocation.allocation_date === dateStr
    );
  };

  const getAllocationForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return allocations.find(
      (allocation) => allocation.allocation_date === dateStr
    );
  };

  const getPendingAllocations = () => {
    return allocations.filter(
      (allocation) => !allocation.allocation_date && !allocation.canceled_at
    );
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
    });
  };

  const pendingAllocations = getPendingAllocations();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Transport Calendar</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Allocations */}
      {pendingAllocations.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <AlertCircle className="w-5 h-5" />
              <span>Pending Transport Allocations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAllocations.map((allocation) => (
                <div
                  key={allocation.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-200"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {allocation.task.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {allocation.task.project_name}
                    </p>
                    <p className="text-sm font-medium text-orange-600">
                      Amount: Rp {allocation.amount.toLocaleString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => setSelectedAllocation(allocation)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Select Date
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Allocated Allocations */}
      {allocations.filter(
        (allocation) => allocation.allocation_date && !allocation.canceled_at
      ).length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <MapPin className="w-5 h-5" />
              <span>Allocated Transport</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allocations
                .filter(
                  (allocation) =>
                    allocation.allocation_date && !allocation.canceled_at
                )
                .map((allocation) => (
                  <div
                    key={allocation.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-200"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {allocation.task.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {allocation.task.project_name}
                      </p>
                      <p className="text-sm font-medium text-green-600">
                        Amount: Rp {allocation.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-green-700">
                        Allocated:{" "}
                        {new Date(
                          allocation.allocation_date!
                        ).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedAllocation(allocation);
                        setSelectedDate(allocation.allocation_date!);
                        setIsEditMode(true);
                      }}
                      variant="outline"
                      className="border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Edit Date
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Transport Calendar - {formatDate(currentDate)}</span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("prev")}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("next")}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {["Ming", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={index} className="p-2"></div>;
              }

              const isAllocatedDay = isAllocated(day);
              const allocationForDate = getAllocationForDate(day);
              const isToday =
                new Date().toDateString() ===
                new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  day
                ).toDateString();

              return (
                <div
                  key={index}
                  className={`relative p-2 text-center text-sm rounded-lg cursor-pointer transition-colors ${
                    isAllocatedDay
                      ? "bg-red-100 text-red-800 border-2 border-red-300 font-semibold"
                      : isToday
                        ? "bg-blue-100 text-blue-800 font-semibold"
                        : "hover:bg-gray-100"
                  }`}
                  title={
                    isAllocatedDay && allocationForDate
                      ? `Transport: ${allocationForDate.task.title} - ${allocationForDate.task.project_name}`
                      : undefined
                  }
                >
                  {day}
                  {isAllocatedDay && (
                    <div className="w-2 h-2 bg-red-500 rounded-full mx-auto mt-1"></div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Date Selection Modal */}
      {selectedAllocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {isEditMode ? "Edit Transport Date" : "Select Transport Date"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">
                  {selectedAllocation.task.title}
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedAllocation.task.project_name}
                </p>
                <p className="text-sm font-medium text-orange-600">
                  Amount: Rp {selectedAllocation.amount.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={selectedAllocation.task.start_date}
                  max={selectedAllocation.task.end_date}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only dates between{" "}
                  {new Date(
                    selectedAllocation.task.start_date
                  ).toLocaleDateString("id-ID")}{" "}
                  and{" "}
                  {new Date(
                    selectedAllocation.task.end_date
                  ).toLocaleDateString("id-ID")}{" "}
                  are allowed
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedAllocation(null);
                    setSelectedDate("");
                    setIsEditMode(false);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={
                    isEditMode ? handleUpdateTransport : handleAllocateTransport
                  }
                  disabled={!selectedDate}
                  className={`flex-1 ${isEditMode ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {isEditMode ? "Update Transport" : "Allocate Transport"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
