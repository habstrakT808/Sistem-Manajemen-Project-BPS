// File: src/lib/utils/transport.ts
// NEW: Transport utility functions

export const TRANSPORT_AMOUNT = 150000; // Fixed amount in IDR

export function validateTransportDate(
  allocationDate: string,
  taskStartDate: string,
  taskEndDate: string
): { valid: boolean; error?: string } {
  const allocDate = new Date(allocationDate);
  const startDate = new Date(taskStartDate);
  const endDate = new Date(taskEndDate);

  if (allocDate < startDate) {
    return {
      valid: false,
      error: "Allocation date cannot be before task start date",
    };
  }

  if (allocDate > endDate) {
    return {
      valid: false,
      error: "Allocation date cannot be after task end date",
    };
  }

  return { valid: true };
}

export function formatTransportAmount(
  amount: number = TRANSPORT_AMOUNT
): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getTransportStatus(allocation: {
  allocation_date?: string | null;
  allocated_at?: string | null;
  canceled_at?: string | null;
}): {
  status: "pending" | "allocated" | "canceled";
  label: string;
  color: string;
} {
  if (allocation.canceled_at) {
    return {
      status: "canceled",
      label: "Canceled",
      color: "bg-red-100 text-red-800 border-red-200",
    };
  }

  if (allocation.allocation_date && allocation.allocated_at) {
    return {
      status: "allocated",
      label: "Allocated",
      color: "bg-green-100 text-green-800 border-green-200",
    };
  }

  return {
    status: "pending",
    label: "Pending Date Selection",
    color: "bg-orange-100 text-orange-800 border-orange-200",
  };
}

export function calculateTransportSummary(
  allocations: Array<{
    amount: number;
    allocation_date?: string | null;
    canceled_at?: string | null;
  }>
): {
  total_allocated: number;
  total_pending: number;
  total_canceled: number;
  count_allocated: number;
  count_pending: number;
  count_canceled: number;
} {
  const summary = {
    total_allocated: 0,
    total_pending: 0,
    total_canceled: 0,
    count_allocated: 0,
    count_pending: 0,
    count_canceled: 0,
  };

  allocations.forEach((allocation) => {
    if (allocation.canceled_at) {
      summary.total_canceled += allocation.amount;
      summary.count_canceled += 1;
    } else if (allocation.allocation_date) {
      summary.total_allocated += allocation.amount;
      summary.count_allocated += 1;
    } else {
      summary.total_pending += allocation.amount;
      summary.count_pending += 1;
    }
  });

  return summary;
}
