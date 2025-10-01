"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TestPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prev) => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  useEffect(() => {
    const testSupabase = async () => {
      addLog("=== SUPABASE CONNECTION TEST STARTED ===");

      try {
        // Check environment variables
        addLog(
          `NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "NOT SET"}`,
        );
        addLog(
          `NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "NOT SET"}`,
        );

        const supabase = createClient();
        addLog("Supabase client created successfully");

        // Test 1: Get session with timeout
        addLog("Testing getSession...");
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Session timeout")), 5000),
        );

        const sessionResult = await Promise.race([
          sessionPromise,
          sessionTimeout,
        ]);
        addLog(`Session result: ${JSON.stringify(sessionResult)}`);

        // Test 2: Get user with timeout
        addLog("Testing getUser...");
        const userPromise = supabase.auth.getUser();
        const userTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("User timeout")), 5000),
        );

        const userResult = await Promise.race([userPromise, userTimeout]);
        addLog(`User result: ${JSON.stringify(userResult)}`);

        // Test 3: Test database connection with timeout
        addLog("Testing database connection...");
        const dbPromise = supabase.from("users").select("count").limit(1);
        const dbTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database timeout")), 5000),
        );

        const dbResult = await Promise.race([dbPromise, dbTimeout]);
        addLog(`Database result: ${JSON.stringify(dbResult)}`);

        setResults({
          session: sessionResult,
          user: userResult,
          database: dbResult,
          success: true,
        });

        addLog("=== ALL TESTS COMPLETED SUCCESSFULLY ===");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(`ERROR: ${errorMessage}`);
        setResults({ error: errorMessage, success: false });
      } finally {
        setLoading(false);
        addLog("=== TEST FINISHED ===");
      }
    };

    testSupabase();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">
          Testing Supabase Connection...
        </h1>
        <div className="bg-gray-100 p-4 rounded">
          {logs.map((log, index) => (
            <div key={index} className="text-sm font-mono">
              {log}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Supabase Connection Test Results
      </h1>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Test Logs:</h2>
        <div className="bg-gray-100 p-4 rounded max-h-64 overflow-auto">
          {logs.map((log, index) => (
            <div key={index} className="text-sm font-mono">
              {log}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Results:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(results, null, 2)}
        </pre>
      </div>
    </div>
  );
}
