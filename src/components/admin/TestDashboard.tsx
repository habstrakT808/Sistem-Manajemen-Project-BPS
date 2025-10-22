"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TestDashboard() {
  const [testResult, setTestResult] = useState<string>("Testing...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const supabase = createClient();

        // Simple test query
        const { data, error } = await supabase
          .from("users")
          .select("count", { count: "exact", head: true });

        if (error) {
          console.error("Database error:", error);
          setTestResult(`Database Error: ${error.message}`);
        } else {
          setTestResult(`Database OK - User count: ${data || 0}`);
        }
      } catch (error) {
        console.error("Connection error:", error);
        setTestResult(`Connection Error: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    testConnection();
  }, []);

  if (loading) {
    return <div>Testing database connection...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Test</h1>
      <p className="text-lg">{testResult}</p>
    </div>
  );
}
