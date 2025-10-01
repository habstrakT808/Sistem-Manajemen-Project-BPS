"use client";

import { useAuthSimple } from "@/lib/hooks/useAuthSimple";

export default function TestAuthPage() {
  const { user, loading, error } = useAuthSimple();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Auth Test</h1>

      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold">Loading State:</h2>
          <p
            className={`text-lg ${loading ? "text-red-500" : "text-green-500"}`}
          >
            {loading ? "LOADING..." : "NOT LOADING"}
          </p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold">User State:</h2>
          <p className={`text-lg ${user ? "text-green-500" : "text-gray-500"}`}>
            {user ? `User ID: ${user.id}` : "No user"}
          </p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold">Error State:</h2>
          <p className={`text-lg ${error ? "text-red-500" : "text-gray-500"}`}>
            {error || "No error"}
          </p>
        </div>

        <div className="p-4 border rounded bg-gray-50">
          <h2 className="font-semibold mb-2">Instructions:</h2>
          <p className="text-sm">
            This page uses a simplified useAuth hook. Check the browser console
            for detailed logs. The loading state should automatically become
            false after 5 seconds maximum.
          </p>
        </div>
      </div>
    </div>
  );
}
