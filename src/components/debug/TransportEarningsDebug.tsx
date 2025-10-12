// File: src/components/debug/TransportEarningsDebug.tsx
// Debug component for transport earnings issues

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar,
  Trash2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface AllocationData {
  id: string;
  task_id: string;
  amount: number;
  allocation_date: string | null;
  allocated_at: string | null;
  canceled_at: string | null;
  tasks: {
    id: string;
    title: string;
    project_id: string;
    projects: {
      id: string;
      nama_project: string;
    };
  };
}

interface EarningsData {
  id: string;
  type: string;
  amount: number;
  occurred_on: string;
  posted_at: string;
  source_id: string;
  source_table: string;
}

interface DebugData {
  user_id: string;
  allocations: {
    total: number;
    allocated: number;
    pending: number;
    total_amount: number;
  };
  earnings: {
    total: number;
    total_amount: number;
    duplicates: number;
    duplicate_entries: Array<{
      source: string;
      entries: EarningsData[];
    }>;
  };
  discrepancy: {
    difference: number;
    has_duplicates: boolean;
  };
  allocations_detail: AllocationData[];
  earnings_detail: EarningsData[];
}

export default function TransportEarningsDebug() {
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [forceCleaning, setForceCleaning] = useState(false);

  const fetchDebugData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/debug-transport-earnings");
      const data = await response.json();

      if (response.ok) {
        setDebugData(data);
      } else {
        toast.error(data.error || "Failed to fetch debug data");
      }
    } catch (error) {
      console.error("Error fetching debug data:", error);
      toast.error("Failed to fetch debug data");
    } finally {
      setLoading(false);
    }
  };

  const fixDuplicates = async () => {
    try {
      setFixing(true);
      const response = await fetch("/api/fix-transport-earnings", {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        // Refresh debug data
        await fetchDebugData();
      } else {
        toast.error(data.error || "Failed to fix duplicates");
      }
    } catch (error) {
      console.error("Error fixing duplicates:", error);
      toast.error("Failed to fix duplicates");
    } finally {
      setFixing(false);
    }
  };

  const cleanupInvalidEntries = async () => {
    try {
      setCleaning(true);
      const response = await fetch("/api/cleanup-transport-earnings", {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        // Refresh debug data
        await fetchDebugData();

        // Clear all React Query caches related to projects and earnings
        if (typeof window !== "undefined") {
          // Force refresh all project-related queries
          window.location.reload();
        }
      } else {
        toast.error(data.error || "Failed to cleanup invalid entries");
      }
    } catch (error) {
      console.error("Error cleaning up invalid entries:", error);
      toast.error("Failed to cleanup invalid entries");
    } finally {
      setCleaning(false);
    }
  };

  const forceCleanupAllEarnings = async () => {
    try {
      setForceCleaning(true);
      const response = await fetch("/api/force-cleanup-earnings", {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        // Refresh debug data
        await fetchDebugData();

        // Force page reload to clear all caches
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      } else {
        toast.error(data.error || "Failed to force cleanup earnings");
      }
    } catch (error) {
      console.error("Error force cleaning earnings:", error);
      toast.error("Failed to force cleanup earnings");
    } finally {
      setForceCleaning(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  if (!debugData) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading debug data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Transport Earnings Debug</h2>
        <div className="flex space-x-2">
          <Button onClick={fetchDebugData} disabled={loading} variant="outline">
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {debugData.earnings.duplicates > 0 && (
            <Button
              onClick={fixDuplicates}
              disabled={fixing}
              variant="destructive"
            >
              <Trash2
                className={`w-4 h-4 mr-2 ${fixing ? "animate-spin" : ""}`}
              />
              Fix Duplicates
            </Button>
          )}
          {debugData.discrepancy.difference > 0 && (
            <Button
              onClick={cleanupInvalidEntries}
              disabled={cleaning}
              variant="destructive"
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Trash2
                className={`w-4 h-4 mr-2 ${cleaning ? "animate-spin" : ""}`}
              />
              Cleanup Invalid Entries
            </Button>
          )}
          <Button
            onClick={forceCleanupAllEarnings}
            disabled={forceCleaning}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2
              className={`w-4 h-4 mr-2 ${forceCleaning ? "animate-spin" : ""}`}
            />
            Force Cleanup All Earnings
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {debugData.allocations.total}
            </div>
            <p className="text-xs text-muted-foreground">
              {debugData.allocations.allocated} allocated,{" "}
              {debugData.allocations.pending} pending
            </p>
            <p className="text-sm font-medium text-green-600">
              {formatCurrency(debugData.allocations.total_amount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{debugData.earnings.total}</div>
            <p className="text-xs text-muted-foreground">
              {debugData.earnings.duplicates} duplicates
            </p>
            <p className="text-sm font-medium text-blue-600">
              {formatCurrency(debugData.earnings.total_amount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Discrepancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {debugData.discrepancy.difference > 0 ? "+" : ""}
              {formatCurrency(debugData.discrepancy.difference)}
            </div>
            <p className="text-xs text-muted-foreground">
              {debugData.discrepancy.has_duplicates
                ? "Has duplicates"
                : "No duplicates"}
            </p>
            {debugData.discrepancy.difference !== 0 && (
              <Badge
                variant={
                  debugData.discrepancy.difference > 0
                    ? "destructive"
                    : "secondary"
                }
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Issue
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {debugData.earnings.duplicates > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Found {debugData.earnings.duplicates} duplicate earnings entries.
            This is causing the incorrect total of{" "}
            {formatCurrency(debugData.earnings.total_amount)}
            instead of the expected{" "}
            {formatCurrency(debugData.allocations.total_amount)}.
          </AlertDescription>
        </Alert>
      )}

      {debugData.discrepancy.difference === 0 &&
        debugData.earnings.duplicates === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No issues found. Transport earnings are correctly calculated.
            </AlertDescription>
          </Alert>
        )}

      {/* Detailed Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Transport Allocations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {debugData.allocations_detail.map((allocation) => (
                <div key={allocation.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {allocation.tasks.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {allocation.tasks.projects.nama_project}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(allocation.amount)}
                      </p>
                      <Badge
                        variant={
                          allocation.allocation_date ? "default" : "secondary"
                        }
                      >
                        {allocation.allocation_date ? "Allocated" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                  {allocation.allocation_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Date:{" "}
                      {new Date(
                        allocation.allocation_date,
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Earnings Ledger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {debugData.earnings_detail.map((earning) => (
                <div key={earning.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {earning.source_table}: {earning.source_id}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(earning.occurred_on).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">
                        {formatCurrency(earning.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(earning.posted_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Duplicate Details */}
      {debugData.earnings.duplicate_entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Duplicate Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {debugData.earnings.duplicate_entries.map((duplicate, index) => (
                <div
                  key={index}
                  className="border border-red-200 rounded-lg p-4 bg-red-50"
                >
                  <p className="font-medium text-red-800 mb-2">
                    Source: {duplicate.source}
                  </p>
                  <div className="space-y-2">
                    {duplicate.entries.map((entry, entryIndex) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between bg-white rounded p-2"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            Entry {entryIndex + 1}
                          </p>
                          <p className="text-xs text-gray-500">
                            ID: {entry.id} | Posted:{" "}
                            {new Date(entry.posted_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">
                            {formatCurrency(entry.amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(entry.occurred_on).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
