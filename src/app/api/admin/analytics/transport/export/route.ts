// File: src/app/api/admin/analytics/transport/export/route.ts
// NEW: Export transport analytics as Excel (XLSX)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get filter parameters
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const dayParam = searchParams.get("day");
    const pegawaiId = searchParams.get("pegawaiId") || "";
    const mitraId = searchParams.get("mitraId") || "";
    const projectId = searchParams.get("projectId") || "";
    const teamId = searchParams.get("teamId") || "";
    const type = searchParams.get("type") || "all";

    // Auth check - admin only
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    type UserProfile = { role: "admin" | "ketua_tim" | "pegawai" };
    if (
      profileError ||
      !userProfile ||
      (userProfile as UserProfile).role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use the same financial API endpoint to get consistent data
    // This ensures export uses exactly the same data as what's shown in the UI
    const financialApiUrl = new URL("/api/admin/financial", request.url);
    financialApiUrl.searchParams.set("period", "current_month"); // Dummy period, we use date filters
    if (yearParam) financialApiUrl.searchParams.set("year", yearParam);
    if (monthParam) financialApiUrl.searchParams.set("month", monthParam);
    if (dayParam) financialApiUrl.searchParams.set("day", dayParam);
    if (pegawaiId) financialApiUrl.searchParams.set("pegawaiId", pegawaiId);
    if (mitraId) financialApiUrl.searchParams.set("mitraId", mitraId);
    if (projectId) financialApiUrl.searchParams.set("projectId", projectId);
    if (teamId) financialApiUrl.searchParams.set("teamId", teamId);
    if (type) financialApiUrl.searchParams.set("type", type);

    // Create internal request to financial API
    const internalRequest = new Request(financialApiUrl.toString(), {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    // Import and call the financial API handler
    const { GET: getFinancialData } = await import(
      "@/app/api/admin/financial/route"
    );
    const financialResponse = await getFinancialData(
      internalRequest as NextRequest,
    );

    if (!financialResponse.ok) {
      throw new Error("Failed to fetch financial data");
    }

    const financialData = await financialResponse.json();

    // Get transactions from financial API response
    const transactions = financialData.transactions || [];

    if (!transactions || transactions.length === 0) {
      // If no transactions, return empty Excel file
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([
        {
          No: "",
          Nama: "",
          Proyek: "",
          Tugas: "",
          Volume: "",
          Rate: "",
          "Total Pengeluaran": "",
        },
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Transport Analytics");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const dateStr =
        dayParam && dayParam !== "all"
          ? `${yearParam}-${monthParam!.padStart(2, "0")}-${dayParam.padStart(2, "0")}`
          : monthParam && monthParam !== "all"
            ? `${yearParam}-${monthParam.padStart(2, "0")}`
            : yearParam || "all";

      const filename = `transport_analytics_${dateStr}.xlsx`;

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Group transactions by task_id and recipient_name (same logic as frontend)
    const groupedMap = new Map<
      string,
      {
        recipient_name: string;
        recipient_type: "pegawai" | "mitra";
        project_name: string;
        task_title: string;
        volume: number;
        rate: number;
        amount: number;
      }
    >();

    transactions.forEach((t: any) => {
      const key = `${t.task_id || "no-task"}-${t.recipient_name}`;
      if (groupedMap.has(key)) {
        const existing = groupedMap.get(key)!;
        existing.volume += t.volume || 1;
        existing.amount += t.amount;
        // Rate is preserved from first entry (consistent with frontend)
      } else {
        groupedMap.set(key, {
          recipient_name: t.recipient_name,
          recipient_type: t.recipient_type || "pegawai",
          project_name: t.project_name,
          task_title: t.task_title,
          volume: t.volume || 1,
          rate: t.rate || t.amount,
          amount: t.amount,
        });
      }
    });

    const groupedTransactions = Array.from(groupedMap.values());

    // Separate pegawai and mitra
    const pegawaiTransactions = groupedTransactions
      .filter((t) => t.recipient_type === "pegawai")
      .sort((a, b) => b.amount - a.amount);

    const mitraTransactions = groupedTransactions
      .filter((t) => t.recipient_type === "mitra")
      .sort((a, b) => b.amount - a.amount);

    // Calculate totals
    const totalPegawai = pegawaiTransactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );
    const totalMitra = mitraTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalAll = totalPegawai + totalMitra;

    // Prepare Excel data with separators
    const excelData: any[] = [];

    // Add pegawai section
    if (pegawaiTransactions.length > 0) {
      // Add section title
      excelData.push({
        No: "PEGAWAI",
        Nama: "",
        Proyek: "",
        Tugas: "",
        Volume: "",
        Rate: "",
        "Total Pengeluaran": "",
      });

      // Add header row for pegawai section
      excelData.push({
        No: "No",
        Nama: "Nama",
        Proyek: "Proyek",
        Tugas: "Tugas",
        Volume: "Volume",
        Rate: "Rate",
        "Total Pengeluaran": "Total Pengeluaran",
      });

      pegawaiTransactions.forEach((transaction, index) => {
        excelData.push({
          No: index + 1,
          Nama: transaction.recipient_name,
          Proyek: transaction.project_name,
          Tugas: transaction.task_title,
          Volume: transaction.volume,
          Rate: transaction.rate,
          "Total Pengeluaran": transaction.amount,
        });
      });

      // Add separator row
      excelData.push({
        No: "",
        Nama: "",
        Proyek: "",
        Tugas: "",
        Volume: "",
        Rate: "",
        "Total Pengeluaran": "",
      });
    }

    // Add mitra section
    if (mitraTransactions.length > 0) {
      // Add section title
      excelData.push({
        No: "MITRA",
        Nama: "",
        Proyek: "",
        Tugas: "",
        Volume: "",
        Rate: "",
        "Total Pengeluaran": "",
      });

      // Add header row for mitra section
      excelData.push({
        No: "No",
        Nama: "Nama",
        Proyek: "Proyek",
        Tugas: "Tugas",
        Volume: "Volume",
        Rate: "Rate",
        "Total Pengeluaran": "Total Pengeluaran",
      });

      mitraTransactions.forEach((transaction, index) => {
        excelData.push({
          No: index + 1,
          Nama: transaction.recipient_name,
          Proyek: transaction.project_name,
          Tugas: transaction.task_title,
          Volume: transaction.volume,
          Rate: transaction.rate,
          "Total Pengeluaran": transaction.amount,
        });
      });
    }

    // Add separator before total
    excelData.push({
      No: "",
      Nama: "",
      Proyek: "",
      Tugas: "",
      Volume: "",
      Rate: "",
      "Total Pengeluaran": "",
    });

    // Add total row
    excelData.push({
      No: "",
      Nama: "TOTAL",
      Proyek: "",
      Tugas: "",
      Volume: "",
      Rate: "",
      "Total Pengeluaran": totalAll,
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Create worksheet manually to avoid automatic header
    const ws: XLSX.WorkSheet = {};
    const range = { s: { c: 0, r: 0 }, e: { c: 6, r: excelData.length - 1 } };

    // Write data cell by cell
    excelData.forEach((row: any, rowIndex: number) => {
      const columns = [
        "No",
        "Nama",
        "Proyek",
        "Tugas",
        "Volume",
        "Rate",
        "Total Pengeluaran",
      ];
      columns.forEach((colName, colIndex) => {
        const cellAddress = XLSX.utils.encode_cell({
          r: rowIndex,
          c: colIndex,
        });
        const cellValue = row[colName] !== undefined ? row[colName] : "";
        ws[cellAddress] = {
          v: cellValue,
          t: typeof cellValue === "number" ? "n" : "s",
        };
      });
    });

    ws["!ref"] = XLSX.utils.encode_range(range);

    // Set column widths (much wider)
    ws["!cols"] = [
      { wch: 8 }, // No
      { wch: 35 }, // Nama
      { wch: 45 }, // Proyek
      { wch: 45 }, // Tugas
      { wch: 12 }, // Volume
      { wch: 18 }, // Rate
      { wch: 22 }, // Total Pengeluaran
    ];

    // Add styling and formatting
    // Note: xlsx library has limited styling support, but we can add basic formatting
    const styledRange = XLSX.utils.decode_range(ws["!ref"] || "A1");

    // Style section headers (PEGAWAI and MITRA) and their header rows
    for (let row = 0; row <= styledRange.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
      const cellValue = ws[cellAddress]?.v;
      const namaCell = XLSX.utils.encode_cell({ r: row, c: 1 });
      const namaValue = ws[namaCell]?.v;

      if (cellValue === "PEGAWAI" || cellValue === "MITRA") {
        // Style the section title row (PEGAWAI or MITRA)
        for (let col = styledRange.s.c; col <= styledRange.e.c; col++) {
          const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
          if (ws[cellAddr]) {
            if (!ws[cellAddr].s) ws[cellAddr].s = {};
            ws[cellAddr].s.fill = {
              fgColor: { rgb: cellValue === "PEGAWAI" ? "4F81BD" : "F79646" },
            };
            ws[cellAddr].s.font = {
              bold: true,
              color: { rgb: "FFFFFF" },
              sz: 12,
            };
            ws[cellAddr].s.alignment = {
              horizontal: "left",
              vertical: "center",
            };
          }
        }

        // Style the header row right after section title (row + 1)
        const headerRow = row + 1;
        if (headerRow <= styledRange.e.r) {
          for (let col = styledRange.s.c; col <= styledRange.e.c; col++) {
            const headerCell = XLSX.utils.encode_cell({ r: headerRow, c: col });
            if (ws[headerCell]) {
              if (!ws[headerCell].s) ws[headerCell].s = {};
              // Different colors for PEGAWAI and MITRA headers
              ws[headerCell].s.fill = {
                fgColor: { rgb: cellValue === "PEGAWAI" ? "8DB4E2" : "FAC08F" },
              };
              ws[headerCell].s.font = {
                bold: true,
                color: { rgb: "000000" },
                sz: 11,
              };
              ws[headerCell].s.alignment = {
                horizontal: "center",
                vertical: "center",
              };
              ws[headerCell].s.border = {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } },
              };
            }
          }
        }
      }

      // Style total row
      if (namaValue === "TOTAL") {
        for (let col = styledRange.s.c; col <= styledRange.e.c; col++) {
          const totalCell = XLSX.utils.encode_cell({ r: row, c: col });
          if (ws[totalCell]) {
            if (!ws[totalCell].s) ws[totalCell].s = {};
            if (col === 1) {
              // Nama column - style as total label
              ws[totalCell].s.fill = { fgColor: { rgb: "7030A0" } };
              ws[totalCell].s.font = {
                bold: true,
                color: { rgb: "FFFFFF" },
                sz: 12,
              };
              ws[totalCell].s.alignment = {
                horizontal: "left",
                vertical: "center",
              };
            } else if (col === 6) {
              // Total Pengeluaran column - style as total value
              ws[totalCell].s.fill = { fgColor: { rgb: "7030A0" } };
              ws[totalCell].s.font = {
                bold: true,
                color: { rgb: "FFFFFF" },
                sz: 12,
              };
              ws[totalCell].s.alignment = {
                horizontal: "right",
                vertical: "center",
              };
              ws[totalCell].z = "#,##0";
            } else {
              // Other columns - same background
              ws[totalCell].s.fill = { fgColor: { rgb: "7030A0" } };
              ws[totalCell].s.font = {
                bold: true,
                color: { rgb: "FFFFFF" },
                sz: 12,
              };
            }
            ws[totalCell].s.border = {
              top: { style: "medium", color: { rgb: "000000" } },
              bottom: { style: "medium", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            };
          }
        }
      }
    }

    // Add number formatting for Rate and Total Pengeluaran columns
    for (let row = 2; row <= styledRange.e.r; row++) {
      // Rate column (column F, index 5)
      const rateCell = XLSX.utils.encode_cell({ r: row, c: 5 });
      if (ws[rateCell] && typeof ws[rateCell].v === "number") {
        ws[rateCell].z = "#,##0";
      }

      // Total Pengeluaran column (column G, index 6)
      const totalCell = XLSX.utils.encode_cell({ r: row, c: 6 });
      if (ws[totalCell] && typeof ws[totalCell].v === "number") {
        ws[totalCell].z = "#,##0";
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, "Transport Analytics");

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Generate filename
    const dateStr =
      dayParam && dayParam !== "all"
        ? `${yearParam}-${monthParam!.padStart(2, "0")}-${dayParam.padStart(2, "0")}`
        : monthParam && monthParam !== "all"
          ? `${yearParam}-${monthParam.padStart(2, "0")}`
          : yearParam || "all";

    const filename = `transport_analytics_${dateStr}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Transport Export API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
