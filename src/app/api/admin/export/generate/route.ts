import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Packer } from "docx";
import { generateSKDocument } from "@/lib/utils/documentGenerator";
import { generateSKDocumentWithTemplate } from "@/lib/utils/docxtemplaterGenerator";

interface ProjectData {
  nama_project: string;
  created_at: string;
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

    if (type !== "sk-tim") {
      return NextResponse.json(
        { error: "Document type not supported yet" },
        { status: 400 },
      );
    }

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
