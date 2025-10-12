// File: src/app/debug/transport-earnings/page.tsx
// Debug page for transport earnings issues

"use client";

import TransportEarningsDebug from "@/components/debug/TransportEarningsDebug";

export default function TransportEarningsDebugPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <TransportEarningsDebug />
      </div>
    </div>
  );
}
