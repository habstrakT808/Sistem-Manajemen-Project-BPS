// File: src/app/api/pegawai/earnings/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as SupabaseClient;
    const body = await request.json();
    const { format, period, year, month } = body;

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role, nama_lengkap")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== "pegawai") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get earnings data for export
    const earningsQuery = supabase
      .from("financial_records")
      .select(
        `
        id,
        amount,
        description,
        created_at,
        bulan,
        tahun,
        projects!inner (
          id,
          nama_project,
          tanggal_mulai,
          deadline,
          status,
          users!inner (nama_lengkap)
        )
      `
      )
      .eq("recipient_type", "pegawai")
      .eq("recipient_id", user.id)
      .eq("tahun", year);

    if (period === "monthly") {
      earningsQuery.eq("bulan", month);
    }

    const { data: earnings, error: earningsError } = await earningsQuery.order(
      "created_at",
      { ascending: false }
    );

    if (earningsError) {
      throw earningsError;
    }

    type EarningsExportRecord = {
      id: string;
      amount: number;
      description: string;
      created_at: string;
      bulan: number;
      tahun: number;
      projects: {
        id: string;
        nama_project: string;
        tanggal_mulai: string;
        deadline: string;
        status: string;
        users: { nama_lengkap: string };
      };
    };
    const earningsTyped: EarningsExportRecord[] = (earnings ||
      []) as unknown as EarningsExportRecord[];
    const totalAmount = earningsTyped.reduce(
      (sum: number, record: EarningsExportRecord) => sum + record.amount,
      0
    );

    // Generate export based on format
    if (format === "csv") {
      const csvHeader =
        "Date,Project Name,Description,Amount,Project Status,Team Lead\n";
      const csvRows = earningsTyped
        .map((record: EarningsExportRecord) => {
          const date = new Date(record.created_at).toLocaleDateString("id-ID");
          const projectName = `"${record.projects.nama_project}"`;
          const description = `"${record.description}"`;
          const amount = record.amount;
          const status = record.projects.status;
          const teamLead = `"${record.projects.users.nama_lengkap}"`;

          return `${date},${projectName},${description},${amount},${status},${teamLead}`;
        })
        .join("\n");

      const csvContent =
        csvHeader + csvRows + `\n\nTotal Amount:,,,${totalAmount},,`;

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="earnings-${period}-${year}${period === "monthly" ? `-${month}` : ""}.csv"`,
        },
      });
    }

    if (format === "pdf") {
      // For PDF generation, you would typically use a library like jsPDF or Puppeteer
      // Here's a simplified HTML response that can be converted to PDF
      const periodName =
        period === "monthly"
          ? new Date(year, month - 1).toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            })
          : year.toString();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Earnings Report - ${periodName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; font-size: 18px; margin-top: 20px; }
            .footer { margin-top: 30px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Earnings Report</h1>
            <h2>${periodName}</h2>
          </div>
          
          <div class="info">
            <p><strong>Employee:</strong> ${userProfile.nama_lengkap}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString("id-ID")}</p>
            <p><strong>Total Records:</strong> ${(earnings || []).length}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Project Name</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${earningsTyped
                .map(
                  (record: EarningsExportRecord) => `
                <tr>
                  <td>${new Date(record.created_at).toLocaleDateString("id-ID")}</td>
                  <td>${record.projects.nama_project}</td>
                  <td>${record.description}</td>
                  <td>Rp ${record.amount.toLocaleString("id-ID")}</td>
                  <td>${record.projects.status.toUpperCase()}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="total">
            Total Earnings: Rp ${totalAmount.toLocaleString("id-ID")}
          </div>

          <div class="footer">
            <p>Generated by Project Management System</p>
            <p>© ${new Date().getFullYear()} BPS - Badan Pusat Statistik</p>
          </div>
        </body>
        </html>
      `;

      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="earnings-${period}-${year}${period === "monthly" ? `-${month}` : ""}.html"`,
        },
      });
    }

    if (format === "excel") {
      // For Excel generation, you would typically use a library like exceljs
      // Here's a simplified JSON response that can be processed by the frontend
      const excelData = {
        title: `Earnings Report - ${
          period === "monthly"
            ? new Date(year, month - 1).toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })
            : year.toString()
        }`,
        employee: userProfile.nama_lengkap,
        generated: new Date().toISOString(),
        data: earningsTyped.map((record: EarningsExportRecord) => ({
          Date: new Date(record.created_at).toLocaleDateString("id-ID"),
          "Project Name": record.projects.nama_project,
          Description: record.description,
          Amount: record.amount,
          "Project Status": record.projects.status.toUpperCase(),
          "Team Lead": record.projects.users.nama_lengkap,
        })),
        total: totalAmount,
      };

      return NextResponse.json(excelData, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="earnings-${period}-${year}${period === "monthly" ? `-${month}` : ""}.json"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (error) {
    console.error("Export API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
