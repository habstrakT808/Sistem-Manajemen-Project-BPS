// File: src/components/admin/SystemSettings.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  Users,
  Bell,
  Database,
  Shield,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Save,
  RotateCcw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface SystemConfig {
  financial: {
    mitra_monthly_limit: number;
    default_transport_amount: number;
    currency_locale: string;
  };
  workload: {
    low_threshold: number;
    medium_threshold: number;
    high_threshold: number;
  };
  notifications: {
    email_enabled: boolean;
    task_deadline_reminder: boolean;
    project_deadline_reminder: boolean;
    financial_limit_warning: boolean;
    system_maintenance_notice: boolean;
  };
  system: {
    auto_project_status_update: boolean;
    data_retention_days: number;
    backup_frequency: string;
    maintenance_mode: boolean;
  };
  security: {
    session_timeout_minutes: number;
    password_min_length: number;
    require_password_change_days: number;
    max_login_attempts: number;
  };
}

const defaultConfig: SystemConfig = {
  financial: {
    mitra_monthly_limit: 3300000,
    default_transport_amount: 50000,
    currency_locale: "id-ID",
  },
  workload: {
    low_threshold: 2,
    medium_threshold: 4,
    high_threshold: 6,
  },
  notifications: {
    email_enabled: true,
    task_deadline_reminder: true,
    project_deadline_reminder: true,
    financial_limit_warning: true,
    system_maintenance_notice: true,
  },
  system: {
    auto_project_status_update: true,
    data_retention_days: 365,
    backup_frequency: "daily",
    maintenance_mode: false,
  },
  security: {
    session_timeout_minutes: 480,
    password_min_length: 8,
    require_password_change_days: 90,
    max_login_attempts: 5,
  },
};

export default function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengambil pengaturan");
      }

      setConfig(result.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Gagal memuat pengaturan sistem");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal menyimpan pengaturan");
      }

      setHasChanges(false);
      toast.success("Pengaturan sistem berhasil disimpan");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Gagal menyimpan pengaturan sistem");
    } finally {
      setSaving(false);
    }
  }, [config]);

  const resetSettings = useCallback(() => {
    setConfig(defaultConfig);
    setHasChanges(true);
    toast.info("Pengaturan diatur ulang ke bawaan");
  }, []);

  const updateConfig = useCallback(
    (
      section: keyof SystemConfig,
      key: string,
      value: string | number | boolean,
    ) => {
      setConfig((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [key]: value,
        },
      }));
      setHasChanges(true);
    },
    [],
  );

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Pengaturan Sistem
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Konfigurasi parameter dan preferensi sistem
          </p>
        </div>

        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={resetSettings}
            className="border-2 border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Atur Ulang ke Bawaan
          </Button>
          <Button
            onClick={saveSettings}
            disabled={!hasChanges || saving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </div>

      {/* Changes Indicator */}
      {hasChanges && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="text-amber-800 font-medium">
                Anda memiliki perubahan yang belum disimpan. Jangan lupa
                menyimpan pengaturan.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger
            value="financial"
            className="flex items-center space-x-2"
          >
            <DollarSign className="w-4 h-4" />
            <span>Financial</span>
          </TabsTrigger>
          <TabsTrigger value="workload" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Workload</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center space-x-2"
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span>System</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
              <div className="font-semibold flex items-center text-white text-xl">
                <DollarSign className="w-6 h-6 mr-3" />
                Financial Configuration
              </div>
              <div className="text-sm text-green-100 mt-2">
                Configure financial limits and currency settings
              </div>
            </div>
            <div className="p-6 space-y-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="mitra_limit">Mitra Monthly Limit</Label>
                  <Input
                    id="mitra_limit"
                    type="number"
                    value={config.financial.mitra_monthly_limit}
                    onChange={(e) =>
                      updateConfig(
                        "financial",
                        "mitra_monthly_limit",
                        parseInt(e.target.value),
                      )
                    }
                    className="text-lg font-semibold"
                  />
                  <p className="text-sm text-gray-500">
                    Current:{" "}
                    {formatCurrency(config.financial.mitra_monthly_limit)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_transport">
                    Default Transport Amount
                  </Label>
                  <Input
                    id="default_transport"
                    type="number"
                    value={config.financial.default_transport_amount}
                    onChange={(e) =>
                      updateConfig(
                        "financial",
                        "default_transport_amount",
                        parseInt(e.target.value),
                      )
                    }
                    className="text-lg font-semibold"
                  />
                  <p className="text-sm text-gray-500">
                    Current:{" "}
                    {formatCurrency(config.financial.default_transport_amount)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Financial Rules
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        Mitra Limit Enforcement
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      Automatically prevent assignments exceeding monthly limits
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        Real-time Validation
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Check limits before assignment confirmation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="workload" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <div className="font-semibold flex items-center text-white text-xl">
                <Users className="w-6 h-6 mr-3" />
                Workload Configuration
              </div>
              <div className="text-sm text-blue-100 mt-2">
                Configure workload thresholds and indicators
              </div>
            </div>
            <div className="p-6 space-y-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="low_threshold">Low Workload Threshold</Label>
                  <Input
                    id="low_threshold"
                    type="number"
                    value={config.workload.low_threshold}
                    onChange={(e) =>
                      updateConfig(
                        "workload",
                        "low_threshold",
                        parseInt(e.target.value),
                      )
                    }
                    className="text-lg font-semibold"
                  />
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-500">
                      Green indicator
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medium_threshold">
                    Medium Workload Threshold
                  </Label>
                  <Input
                    id="medium_threshold"
                    type="number"
                    value={config.workload.medium_threshold}
                    onChange={(e) =>
                      updateConfig(
                        "workload",
                        "medium_threshold",
                        parseInt(e.target.value),
                      )
                    }
                    className="text-lg font-semibold"
                  />
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-500">
                      Yellow indicator
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="high_threshold">
                    High Workload Threshold
                  </Label>
                  <Input
                    id="high_threshold"
                    type="number"
                    value={config.workload.high_threshold}
                    onChange={(e) =>
                      updateConfig(
                        "workload",
                        "high_threshold",
                        parseInt(e.target.value),
                      )
                    }
                    className="text-lg font-semibold"
                  />
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-500">Red indicator</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Workload Rules
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <Badge className="bg-green-100 text-green-800 mb-2">
                      Low (Green)
                    </Badge>
                    <p className="text-sm text-green-700">
                      1-{config.workload.low_threshold} active projects
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <Badge className="bg-yellow-100 text-yellow-800 mb-2">
                      Medium (Yellow)
                    </Badge>
                    <p className="text-sm text-yellow-700">
                      {config.workload.low_threshold + 1}-
                      {config.workload.medium_threshold} active projects
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <Badge className="bg-red-100 text-red-800 mb-2">
                      High (Red)
                    </Badge>
                    <p className="text-sm text-red-700">
                      {config.workload.medium_threshold + 1}+ active projects
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
              <div className="font-semibold flex items-center text-white text-xl">
                <Bell className="w-6 h-6 mr-3" />
                Notification Settings
              </div>
              <div className="text-sm text-purple-100 mt-2">
                Configure system notifications and alerts
              </div>
            </div>
            <div className="p-6 space-y-6 bg-white">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="email_enabled">Email Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Send email notifications for important events
                    </p>
                  </div>
                  <Switch
                    id="email_enabled"
                    checked={config.notifications.email_enabled}
                    onCheckedChange={(checked) =>
                      updateConfig("notifications", "email_enabled", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="task_deadline">
                      Task Deadline Reminders
                    </Label>
                    <p className="text-sm text-gray-500">
                      Notify users about approaching task deadlines
                    </p>
                  </div>
                  <Switch
                    id="task_deadline"
                    checked={config.notifications.task_deadline_reminder}
                    onCheckedChange={(checked) =>
                      updateConfig(
                        "notifications",
                        "task_deadline_reminder",
                        checked,
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="project_deadline">
                      Project Deadline Reminders
                    </Label>
                    <p className="text-sm text-gray-500">
                      Notify ketua tim about approaching project deadlines
                    </p>
                  </div>
                  <Switch
                    id="project_deadline"
                    checked={config.notifications.project_deadline_reminder}
                    onCheckedChange={(checked) =>
                      updateConfig(
                        "notifications",
                        "project_deadline_reminder",
                        checked,
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="financial_warning">
                      Financial Limit Warnings
                    </Label>
                    <p className="text-sm text-gray-500">
                      Alert when mitra approaches monthly spending limit
                    </p>
                  </div>
                  <Switch
                    id="financial_warning"
                    checked={config.notifications.financial_limit_warning}
                    onCheckedChange={(checked) =>
                      updateConfig(
                        "notifications",
                        "financial_limit_warning",
                        checked,
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="maintenance_notice">
                      System Maintenance Notices
                    </Label>
                    <p className="text-sm text-gray-500">
                      Notify all users about scheduled maintenance
                    </p>
                  </div>
                  <Switch
                    id="maintenance_notice"
                    checked={config.notifications.system_maintenance_notice}
                    onCheckedChange={(checked) =>
                      updateConfig(
                        "notifications",
                        "system_maintenance_notice",
                        checked,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6">
              <div className="font-semibold flex items-center text-white text-xl">
                <Database className="w-6 h-6 mr-3" />
                System Configuration
              </div>
              <div className="text-sm text-orange-100 mt-2">
                Configure system behavior and maintenance
              </div>
            </div>
            <div className="p-6 space-y-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="data_retention">Data Retention (Days)</Label>
                  <Input
                    id="data_retention"
                    type="number"
                    value={config.system.data_retention_days}
                    onChange={(e) =>
                      updateConfig(
                        "system",
                        "data_retention_days",
                        parseInt(e.target.value),
                      )
                    }
                    className="text-lg font-semibold"
                  />
                  <p className="text-sm text-gray-500">
                    How long to keep completed project data
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup_frequency">Backup Frequency</Label>
                  <select
                    id="backup_frequency"
                    value={config.system.backup_frequency}
                    onChange={(e) =>
                      updateConfig("system", "backup_frequency", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <Separator />

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto_status">
                      Auto Project Status Update
                    </Label>
                    <p className="text-sm text-gray-500">
                      Automatically update project status based on dates
                    </p>
                  </div>
                  <Switch
                    id="auto_status"
                    checked={config.system.auto_project_status_update}
                    onCheckedChange={(checked) =>
                      updateConfig(
                        "system",
                        "auto_project_status_update",
                        checked,
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="maintenance_mode">Maintenance Mode</Label>
                    <p className="text-sm text-gray-500">
                      Enable maintenance mode to restrict access
                    </p>
                  </div>
                  <Switch
                    id="maintenance_mode"
                    checked={config.system.maintenance_mode}
                    onCheckedChange={(checked) =>
                      updateConfig("system", "maintenance_mode", checked)
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Data Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export System Data
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-green-200 text-green-600 hover:bg-green-50"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-pink-600 p-6">
              <div className="font-semibold flex items-center text-white text-xl">
                <Shield className="w-6 h-6 mr-3" />
                Security Configuration
              </div>
              <div className="text-sm text-red-100 mt-2">
                Configure security policies and authentication
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="session_timeout">
                    Session Timeout (Minutes)
                  </Label>
                  <Input
                    id="session_timeout"
                    type="number"
                    value={config.security.session_timeout_minutes}
                    onChange={(e) =>
                      updateConfig(
                        "security",
                        "session_timeout_minutes",
                        parseInt(e.target.value),
                      )
                    }
                    className="text-lg font-semibold"
                  />
                  <p className="text-sm text-gray-500">
                    Auto logout after inactivity
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_length">
                    Minimum Password Length
                  </Label>
                  <Input
                    id="password_length"
                    type="number"
                    value={config.security.password_min_length}
                    onChange={(e) =>
                      updateConfig(
                        "security",
                        "password_min_length",
                        parseInt(e.target.value),
                      )
                    }
                    className="text-lg font-semibold"
                  />
                  <p className="text-sm text-gray-500">
                    Required minimum characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_change">
                    Password Change Requirement (Days)
                  </Label>
                  <Input
                    id="password_change"
                    type="number"
                    value={config.security.require_password_change_days}
                    onChange={(e) =>
                      updateConfig(
                        "security",
                        "require_password_change_days",
                        parseInt(e.target.value),
                      )
                    }
                    className="text-lg font-semibold"
                  />
                  <p className="text-sm text-gray-500">
                    Force password change interval
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login_attempts">Max Login Attempts</Label>
                  <Input
                    id="login_attempts"
                    type="number"
                    value={config.security.max_login_attempts}
                    onChange={(e) =>
                      updateConfig(
                        "security",
                        "max_login_attempts",
                        parseInt(e.target.value),
                      )
                    }
                    className="text-lg font-semibold"
                  />
                  <p className="text-sm text-gray-500">
                    Lock account after failed attempts
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Security Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        SSL Enabled
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      All connections are encrypted
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        RLS Active
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Row-level security enforced
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
