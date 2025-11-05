import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Packer } from "docx";
import { generateSKDocument } from "@/lib/utils/documentGenerator";
import { generateSKDocumentWithTemplate } from "@/lib/utils/docxtemplaterGenerator";
import { generateSPKDocument } from "@/lib/utils/spkGenerator";
import { generateBASTDocument } from "@/lib/utils/bastGenerator";
import { generateMultiBASTDocument } from "@/lib/utils/bastGeneratorMulti";
import { generateMultiSPKDocument } from "@/lib/utils/spkGeneratorMulti";

interface ProjectData {
  nama_project: string;
  created_at: string;
}

/**
 * Handle BAST document generation (supports multiple mitra)
 */
async function handleBASTGeneration(data: any, format: string) {
  try {
    const svc = await createServiceRoleClient();

    // Support both single mitraId and multiple mitraIds
    const mitraIds = data.mitraIds || (data.mitraId ? [data.mitraId] : []);

    if (mitraIds.length === 0) {
      return NextResponse.json(
        { error: "At least one mitra ID is required" },
        { status: 400 },
      );
    }

    // Fetch project details
    const { data: projectData, error: projectError } = await (svc as any)
      .from("projects")
      .select(
        `
        id,
        nama_project,
        leader_user_id,
        users:leader_user_id (
          nama_lengkap
        )
      `,
      )
      .eq("id", data.projectId)
      .single();

    if (projectError || !projectData) {
      console.error("Project fetch error:", projectError);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Generate BAST for each mitra
    const bastDataArray: any[] = [];

    for (const mitraId of mitraIds) {
      // Fetch mitra details
      const { data: mitraData, error: mitraError } = await (svc as any)
        .from("mitra")
        .select("id, nama_mitra, alamat")
        .eq("id", mitraId)
        .single();

      if (mitraError || !mitraData) {
        console.error("Mitra fetch error for", mitraId, mitraError);
        continue; // Skip this mitra if not found
      }

      // Fetch tasks for volume calculation
      const { data: tasks, error: tasksError } = await (svc as any)
        .from("tasks")
        .select(
          `
          id,
          volume,
          satuan_id,
          satuan:satuan_id ( nama_satuan )
        `,
        )
        .eq("project_id", data.projectId)
        .eq("assignee_mitra_id", mitraId);

      if (tasksError) {
        console.error("Tasks fetch error for mitra", mitraId, tasksError);
        continue; // Skip this mitra if tasks fetch fails
      }

      // Calculate volume by satuan
      const satuanMap = new Map<
        string,
        { nama_satuan: string; total: number }
      >();

      (tasks || []).forEach((task: any) => {
        const vol = parseFloat(task.volume || 0);
        if (vol > 0 && task.satuan) {
          const satuanName = task.satuan.nama_satuan;
          if (satuanMap.has(satuanName)) {
            satuanMap.get(satuanName)!.total += vol;
          } else {
            satuanMap.set(satuanName, { nama_satuan: satuanName, total: vol });
          }
        }
      });

      const volumeBySatuan = Array.from(satuanMap.values());

      // Prepare BAST data for this mitra
      bastDataArray.push({
        nomorBAST: data.nomorBAST,
        projectId: data.projectId,
        projectName: projectData.nama_project,
        month: data.month,
        year: data.year,
        mitraId: mitraId,
        mitraData: {
          nama_mitra: mitraData.nama_mitra,
          alamat: mitraData.alamat || "",
        },
        ketuaTimName: projectData.users?.nama_lengkap || "",
        tanggalPenandatanganan: data.tanggalPenandatanganan,
        nomorSK: data.nomorSK,
        tanggalSK: data.tanggalSK,
        volumeBySatuan,
      });
    }

    if (bastDataArray.length === 0) {
      return NextResponse.json(
        { error: "No valid BAST data could be generated" },
        { status: 404 },
      );
    }

    if (format === "docx") {
      // Generate multi-mitra BAST with page breaks
      const doc = await generateMultiBASTDocument(bastDataArray);
      const buffer = await Packer.toBuffer(doc);

      const filename =
        bastDataArray.length === 1
          ? `BAST-${data.nomorBAST}-${bastDataArray[0].mitraData.nama_mitra}.docx`
          : `BAST-${data.nomorBAST}-${bastDataArray.length}Mitra.docx`;

      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Format tidak didukung. Gunakan format 'docx'." },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error generating BAST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handle SPK document generation (multi-mitra, 1 SPK per tugas)
 */
async function handleSPKGeneration(data: any, format: string) {
  try {
    const svc = await createServiceRoleClient();

    const mitraIds = data.mitraIds || [];
    if (mitraIds.length === 0) {
      return NextResponse.json(
        { error: "At least one mitra must be selected" },
        { status: 400 },
      );
    }

    // Calculate date range for the month
    const monthNum = parseInt(data.month);
    const yearNum = parseInt(data.year);
    // Use manual string format to avoid timezone issues
    const monthStr = monthNum.toString().padStart(2, "0");
    const startDateStr = `${yearNum}-${monthStr}-01`;
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const endDateStr = `${yearNum}-${monthStr}-${lastDay.toString().padStart(2, "0")}`;

    // Fetch all mitra details
    const { data: mitraList, error: mitraError } = await (svc as any)
      .from("mitra")
      .select(
        `
        id,
        nama_mitra,
        alamat,
        kontak,
        pekerjaan_id,
        mitra_occupations:pekerjaan_id (
          name
        )
      `,
      )
      .in("id", mitraIds);

    if (mitraError || !mitraList || mitraList.length === 0) {
      return NextResponse.json({ error: "Mitra not found" }, { status: 404 });
    }

    // Fetch all tasks for selected mitra in the specified month (from all projects)
    // Note: Avoid FK join to avoid schema cache issues, fetch project details separately
    // Use OR query to get tasks matching either start_date OR tanggal_tugas in the month

    // Query 1: Tasks with start_date in the month (fetch all first, then filter)
    // Note: We fetch all tasks in the month first, then filter by mitraIds in JS
    const { data: allTasksByStartDate, error: error1 } = await (svc as any)
      .from("tasks")
      .select(
        `
        id,
        title,
        start_date,
        end_date,
        tanggal_tugas,
        assignee_mitra_id,
        honor_amount,
        satuan_id,
        rate_per_satuan,
        volume,
        project_id,
        satuan:satuan_id ( nama_satuan )
      `,
      )
      .not("assignee_mitra_id", "is", null)
      .gte("start_date", startDateStr)
      .lte("start_date", endDateStr);

    // Filter by mitraIds in JavaScript
    const tasksByStartDate = (allTasksByStartDate || []).filter(
      (task: any) =>
        task.assignee_mitra_id && mitraIds.includes(task.assignee_mitra_id),
    );

    // Query 2: Tasks with tanggal_tugas in the month (for legacy records)
    const { data: allTasksByTanggalTugas, error: error2 } = await (svc as any)
      .from("tasks")
      .select(
        `
        id,
        title,
        start_date,
        end_date,
        tanggal_tugas,
        assignee_mitra_id,
        honor_amount,
        satuan_id,
        rate_per_satuan,
        volume,
        project_id,
        satuan:satuan_id ( nama_satuan )
      `,
      )
      .not("assignee_mitra_id", "is", null)
      .gte("tanggal_tugas", startDateStr)
      .lte("tanggal_tugas", endDateStr);

    // Filter by mitraIds in JavaScript
    const tasksByTanggalTugas = (allTasksByTanggalTugas || []).filter(
      (task: any) =>
        task.assignee_mitra_id && mitraIds.includes(task.assignee_mitra_id),
    );

    // Combine and deduplicate tasks
    const taskMap = new Map<string, any>();

    (tasksByStartDate || []).forEach((task: any) => {
      taskMap.set(task.id, task);
    });

    (tasksByTanggalTugas || []).forEach((task: any) => {
      if (!taskMap.has(task.id)) {
        taskMap.set(task.id, task);
      }
    });

    const allTasks = Array.from(taskMap.values());

    // Sort by start_date or tanggal_tugas
    allTasks.sort((a: any, b: any) => {
      const dateA = a.start_date || a.tanggal_tugas || "";
      const dateB = b.start_date || b.tanggal_tugas || "";
      return dateA.localeCompare(dateB);
    });

    if (error1 || error2) {
      // Don't fail if one query succeeds
      if (allTasks.length === 0) {
        return NextResponse.json(
          { error: "Failed to fetch tasks" },
          { status: 500 },
        );
      }
    }

    if (!allTasks || allTasks.length === 0) {
      return NextResponse.json(
        {
          error: `No tasks found for selected mitra in ${monthStr}/${yearNum}. Please check if tasks exist for these mitra in the selected month.`,
          debug: {
            mitraIds,
            month: monthNum,
            year: yearNum,
            dateRange: { start: startDateStr, end: endDateStr },
          },
        },
        { status: 404 },
      );
    }

    // Fetch project details separately to avoid FK relationship issues
    const projectIds = Array.from(
      new Set((allTasks || []).map((t: any) => t.project_id).filter(Boolean)),
    );

    const projectNameById: Record<string, string> = {};
    if (projectIds.length > 0) {
      const { data: projects } = await (svc as any)
        .from("projects")
        .select("id, nama_project")
        .in("id", projectIds);

      (projects || []).forEach((p: any) => {
        projectNameById[p.id] = p.nama_project;
      });
    }

    // Group tasks by mitra
    const mitraTasksMap = new Map<string, any[]>();
    for (const task of allTasks || []) {
      const mitraId = task.assignee_mitra_id;
      if (mitraId) {
        if (!mitraTasksMap.has(mitraId)) {
          mitraTasksMap.set(mitraId, []);
        }
        mitraTasksMap.get(mitraId)!.push(task);
      }
    }

    // Build mitraTasks array - only include mitra that were selected AND have tasks
    const mitraTasks = mitraList
      .filter((m: any) => {
        return mitraTasksMap.has(m.id);
      })
      .map((mitra: any) => ({
        mitra: {
          id: mitra.id,
          nama_mitra: mitra.nama_mitra,
          alamat: mitra.alamat || "",
          pekerjaan: mitra.mitra_occupations?.name || "",
        },
        tasks: mitraTasksMap.get(mitra.id)!.map((task: any) => ({
          id: task.id,
          title: task.title,
          start_date: task.start_date,
          end_date: task.end_date,
          honor_amount: task.honor_amount,
          satuan_id: task.satuan_id,
          rate_per_satuan: task.rate_per_satuan,
          volume: task.volume,
          satuan: task.satuan,
          project_id: task.project_id,
          project_name: projectNameById[task.project_id] || "",
        })),
      }));

    if (mitraTasks.length === 0) {
      return NextResponse.json(
        {
          error: "No tasks found for selected mitra",
          debug: {
            tasksFound: allTasks.length,
            tasksMitraIds: Array.from(mitraTasksMap.keys()),
            selectedMitraIds: mitraIds,
            mitraListIds: mitraList.map((m: any) => m.id),
          },
        },
        { status: 404 },
      );
    }

    // Prepare multi-SPK data
    const multiSPKData = {
      nomorSPK: data.nomorSPK,
      month: data.month,
      year: data.year,
      tanggalPenandatanganan: data.tanggalPenandatanganan,
      namaPejabat: data.namaPejabat,
      mitraTasks,
    };

    if (format === "docx") {
      // Generate multi-SPK document
      const doc = await generateMultiSPKDocument(multiSPKData);
      const buffer = await Packer.toBuffer(doc);

      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="SPK-${data.nomorSPK}.docx"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Format tidak didukung. Gunakan format 'docx'." },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate SPK document" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userProfile || (userProfile as { role: string }).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, format, data } = body;

    console.log("Export request body:", { type, format, data });

    if (type !== "sk-tim" && type !== "spk" && type !== "bast") {
      return NextResponse.json(
        { error: "Document type not supported yet" },
        { status: 400 },
      );
    }

    // Handle different document types
    if (type === "spk") {
      // SPK specific handling
      return await handleSPKGeneration(data, format);
    }

    if (type === "bast") {
      // BAST specific handling
      return await handleBASTGeneration(data, format);
    }

    // SK-TIM handling (original code)
    // Get project details using service role to bypass RLS
    console.log("Looking for project with ID:", data.projectId);
    const svc = await createServiceRoleClient();
    const { data: projectData, error: projectError } = await (svc as any)
      .from("projects")
      .select("nama_project, created_at")
      .eq("id", data.projectId)
      .single();

    if (projectError || !projectData) {
      console.error("Project fetch error:", projectError);
      return NextResponse.json(
        {
          error: "Project not found",
          details: projectError?.message || "Unknown error",
          projectId: data.projectId,
        },
        { status: 404 },
      );
    }

    const project = projectData as ProjectData;
    const projectYear = new Date(project.created_at).getFullYear();
    const skData = {
      nomorSK: data.nomorSK,
      projectName: project.nama_project,
      projectYear,
      kotaKabupaten: data.kotaKabupaten,
      tanggalPenetapan: data.tanggalPenetapan,
      masaKerjaAkhir: data.masaKerjaAkhir,
      namaKetua: data.namaKetua,
      teamMembers: data.teamMembers,
      mengingat6: data.mengingat6,
    };

    if (format === "docx") {
      // Try multiple approaches for DOCX generation
      try {
        // First try: docxtemplater approach (with logo)
        console.log("Trying docxtemplater approach...");
        const templateBuffer = await generateSKDocumentWithTemplate(skData);

        return new NextResponse(templateBuffer as unknown as BodyInit, {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="SK-Tim-${data.nomorSK}.docx"`,
          },
        });
      } catch (templateError) {
        console.log(
          "Docxtemplater failed, falling back to original approach:",
          templateError,
        );

        // Fallback: original approach (without logo)
        const doc = await generateSKDocument(skData);
        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer as unknown as BodyInit, {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="SK-Tim-${data.nomorSK}.docx"`,
          },
        });
      }
    } else {
      // Format not supported
      return NextResponse.json(
        { error: "Format tidak didukung. Gunakan format 'docx'." },
        { status: 400 },
      );
    }

    /* PDF GENERATION CODE REMOVED - Only DOCX export is supported
    } else if (format === "pdf") {
      // Generate proper PDF using jsPDF with proper formatting
      try {
        console.log(
          "Generating DOCX for PDF request (user will Save As PDF from Word)..."
        );

        // For PDF format, return DOCX file so user can "Save As PDF" from Word
        // This is the ONLY way to get 100% identical formatting
        const doc = await generateSKDocument(skData);
        const buffer = await Packer.toBuffer(doc);

        // Return DOCX file - user will open in Word and "Save As PDF"
        return new NextResponse(buffer as unknown as BodyInit, {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="SK-Tim-${data.nomorSK}.docx"`,
          },
        });
      } catch (docxError) {
        console.log("DOCX generation failed:", docxError);

        // Fallback: jsPDF approach
        const pdf = new jsPDF();
        let y = 20;

        // Header
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(
          `KEPUTUSAN KEPALA BADAN PUSAT STATISTIK ${skData.kotaKabupaten.toUpperCase()}`,
          105,
          y,
          { align: "center" }
        );
        y += 10;
        pdf.text(`NOMOR : ${skData.nomorSK}`, 105, y, { align: "center" });
        y += 10;
        pdf.text("TENTANG", 105, y, { align: "center" });
        y += 10;
        pdf.text(
          `TIM PELAKSANA KEGIATAN PENDATAAN ${skData.projectName.toUpperCase()}`,
          105,
          y,
          { align: "center", maxWidth: 180 }
        );
        y += 10;
        pdf.text(`TAHUN ${skData.projectYear}`, 105, y, { align: "center" });
        y += 20;

        // Body
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.text(
          `KEPALA BADAN PUSAT STATISTIK ${skData.kotaKabupaten.toUpperCase()},`,
          20,
          y
        );
        y += 10;

        pdf.text("Menimbang :", 20, y);
        const menimbangText = `bahwa untuk kelancaran pelaksanaan kegiatan Pendataan ${skData.projectName} Tahun ${skData.projectYear}, perlu dibentuk Tim Pelaksana dengan Keputusan Kepala Badan Pusat Statistik ${skData.kotaKabupaten};`;
        const menimbangLines = pdf.splitTextToSize(menimbangText, 150);
        pdf.text(menimbangLines, 50, y);
        y += menimbangLines.length * 7 + 10;

        pdf.setFont("helvetica", "bold");
        pdf.text("MEMUTUSKAN:", 20, y);
        y += 10;

        pdf.setFont("helvetica", "normal");
        pdf.text("Menetapkan :", 20, y);
        const menetapkanText = `KEPUTUSAN KEPALA BADAN PUSAT STATISTIK ${skData.kotaKabupaten.toUpperCase()} TENTANG TIM PELAKSANA KEGIATAN PENDATAAN ${skData.projectName.toUpperCase()} TAHUN ${skData.projectYear}`;
        const menetapkanLines = pdf.splitTextToSize(menetapkanText, 150);
        pdf.text(menetapkanLines, 50, y);
        y += menetapkanLines.length * 7 + 10;

        // Check if we need a new page
        if (y > 250) {
          pdf.addPage();
          y = 20;
        }

        // KESATU
        pdf.setFont("helvetica", "bold");
        pdf.text("KESATU", 20, y);
        pdf.setFont("helvetica", "normal");
        const kesatuText = `: Membentuk Tim Pelaksana kegiatan Pendataan ${skData.projectName} Tahun ${skData.projectYear} pada Badan Pusat Statistik ${skData.kotaKabupaten} dengan susunan sebagaimana tersebut pada lampiran keputusan ini;`;
        const kesatuLines = pdf.splitTextToSize(kesatuText, 140);
        pdf.text(kesatuLines, 45, y);
        y += kesatuLines.length * 7 + 10;

        // KEDUA
        if (y > 240) {
          pdf.addPage();
          y = 20;
        }
        pdf.setFont("helvetica", "bold");
        pdf.text("KEDUA", 20, y);
        pdf.setFont("helvetica", "normal");
        const keduaText = `: Tim Pelaksana kegiatan Pendataan ${skData.projectName} Tahun ${skData.projectYear} mempunyai tugas:`;
        const keduaLines = pdf.splitTextToSize(keduaText, 140);
        pdf.text(keduaLines, 45, y);
        y += keduaLines.length * 7 + 7;

        pdf.text(
          `a. Mengikuti briefing/pelatihan Pendataan ${skData.projectName} tahun ${skData.projectYear};`,
          30,
          y,
          { maxWidth: 160 }
        );
        y += 7;
        pdf.text(
          `b. Melakukan pengumpulan data Pendataan ${skData.projectName} tahun ${skData.projectYear};`,
          30,
          y,
          { maxWidth: 160 }
        );
        y += 7;
        pdf.text(
          `c. Melakukan editing coding, entry dan validasi dokumen kuesioner hasil pengumpulan data Pendataan ${skData.projectName} tahun ${skData.projectYear}.`,
          30,
          y,
          { maxWidth: 160 }
        );
        y += 14;

        // KETIGA
        if (y > 250) {
          pdf.addPage();
          y = 20;
        }
        pdf.setFont("helvetica", "bold");
        pdf.text("KETIGA", 20, y);
        pdf.setFont("helvetica", "normal");
        const masaKerjaAkhirFormatted = new Date(
          skData.masaKerjaAkhir
        ).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        pdf.text(
          `: Masa kerja berakhir pada tanggal ${masaKerjaAkhirFormatted}`,
          45,
          y
        );
        y += 10;

        // KEEMPAT
        pdf.setFont("helvetica", "bold");
        pdf.text("KEEMPAT", 20, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(": Keputusan ini berlaku sejak tanggal ditetapkan.", 45, y);
        y += 20;

        // Signature
        if (y > 230) {
          pdf.addPage();
          y = 20;
        }
        const tanggalPenetapanFormatted = new Date(
          skData.tanggalPenetapan
        ).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        pdf.text(`Ditetapkan di ${skData.kotaKabupaten}`, 105, y, {
          align: "center",
        });
        y += 7;
        pdf.text(`Pada tanggal ${tanggalPenetapanFormatted}`, 105, y, {
          align: "center",
        });
        y += 7;
        pdf.setFont("helvetica", "bold");
        pdf.text("KEPALA BADAN PUSAT STATISTIK", 105, y, { align: "center" });
        y += 7;
        pdf.text(skData.kotaKabupaten.toUpperCase(), 105, y, {
          align: "center",
        });
        y += 30;
        pdf.text(skData.namaKetua, 105, y, { align: "center" });

        // New page for Lampiran
        pdf.addPage();
        y = 20;

        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("LAMPIRAN", 105, y, { align: "center" });
        y += 7;
        pdf.text("KEPUTUSAN KEPALA", 105, y, { align: "center" });
        y += 7;
        pdf.text(
          `BADAN PUSAT STATISTIK ${skData.kotaKabupaten.toUpperCase()}`,
          105,
          y,
          { align: "center" }
        );
        y += 7;
        pdf.setFont("helvetica", "normal");
        pdf.text(`NOMOR : ${skData.nomorSK}`, 105, y, { align: "center" });
        y += 7;
        pdf.text(`TANGGAL : ${tanggalPenetapanFormatted}`, 105, y, {
          align: "center",
        });
        y += 15;

        pdf.setFont("helvetica", "bold");
        pdf.text(
          `DAFTAR TIM PELAKSANA PENDATAAN ${skData.projectName.toUpperCase()}`,
          105,
          y,
          { align: "center", maxWidth: 180 }
        );
        y += 7;
        pdf.text(`TAHUN ${skData.projectYear}`, 105, y, { align: "center" });
        y += 7;
        pdf.text(
          `BADAN PUSAT STATISTIK ${skData.kotaKabupaten.toUpperCase()}`,
          105,
          y,
          { align: "center" }
        );
        y += 15;

        // Table
        pdf.setFontSize(9);
        const colWidths = [15, 50, 40, 75];
        const tableX = 20;

        // Table header
        pdf.setFont("helvetica", "bold");
        pdf.rect(tableX, y, colWidths[0], 10);
        pdf.text("NO.", tableX + colWidths[0] / 2, y + 7, { align: "center" });
        pdf.rect(tableX + colWidths[0], y, colWidths[1], 10);
        pdf.text(
          "NAMA PETUGAS",
          tableX + colWidths[0] + colWidths[1] / 2,
          y + 7,
          {
            align: "center",
          }
        );
        pdf.rect(tableX + colWidths[0] + colWidths[1], y, colWidths[2], 10);
        pdf.text(
          "NIP/NMS",
          tableX + colWidths[0] + colWidths[1] + colWidths[2] / 2,
          y + 7,
          { align: "center" }
        );
        pdf.rect(
          tableX + colWidths[0] + colWidths[1] + colWidths[2],
          y,
          colWidths[3],
          10
        );
        pdf.text(
          "BERTUGAS SEBAGAI",
          tableX +
            colWidths[0] +
            colWidths[1] +
            colWidths[2] +
            colWidths[3] / 2,
          y + 7,
          { align: "center" }
        );
        y += 10;

        // Table rows
        pdf.setFont("helvetica", "normal");
        skData.teamMembers.forEach(
          (
            member: {
              personName: string;
              nipOrSobat: string;
              taskTitle: string;
            },
            index: number
          ) => {
            const rowHeight = 10;
            pdf.rect(tableX, y, colWidths[0], rowHeight);
            pdf.text(`${index + 1}`, tableX + colWidths[0] / 2, y + 7, {
              align: "center",
            });
            pdf.rect(tableX + colWidths[0], y, colWidths[1], rowHeight);
            pdf.text(member.personName, tableX + colWidths[0] + 2, y + 7);
            pdf.rect(
              tableX + colWidths[0] + colWidths[1],
              y,
              colWidths[2],
              rowHeight
            );
            pdf.text(
              member.nipOrSobat,
              tableX + colWidths[0] + colWidths[1] + colWidths[2] / 2,
              y + 7,
              { align: "center" }
            );
            pdf.rect(
              tableX + colWidths[0] + colWidths[1] + colWidths[2],
              y,
              colWidths[3],
              rowHeight
            );
            pdf.text(
              member.taskTitle,
              tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2,
              y + 7
            );
            y += rowHeight;
          }
        );

        // Signature for lampiran
        y += 20;
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("KEPALA BADAN PUSAT STATISTIK", 105, y, { align: "center" });
        y += 7;
        pdf.text(skData.kotaKabupaten.toUpperCase(), 105, y, {
          align: "center",
        });
        y += 30;
        pdf.text(skData.namaKetua, 105, y, { align: "center" });

        const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

        return new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="SK-Tim-${data.nomorSK}.pdf"`,
          },
        });
      }
    */
  } catch (error) {
    console.error("Error generating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
