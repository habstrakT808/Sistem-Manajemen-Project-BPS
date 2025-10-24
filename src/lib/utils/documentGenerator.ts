import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  TabStopType,
  ImageRun,
} from "docx";

interface TeamMember {
  id: string;
  personName: string;
  nipOrSobat: string;
  taskTitle: string;
}

interface SKData {
  nomorSK: string;
  projectName: string;
  projectYear: number;
  kotaKabupaten: string;
  tanggalPenetapan: string;
  masaKerjaAkhir: string;
  namaKetua: string;
  teamMembers: TeamMember[];
}

// Function to get logo as base64
async function getLogoBase64(): Promise<string> {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const logoPath = path.join(
      process.cwd(),
      "public",
      "assets",
      "logo-bps.png",
    );
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return logoBuffer.toString("base64");
    }
  } catch (error) {
    console.error("Error reading logo:", error);
  }

  // Return a placeholder base64 if logo not found
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
}

export async function generateSKDocument(data: SKData): Promise<Document> {
  const {
    nomorSK,
    projectName,
    projectYear,
    kotaKabupaten,
    tanggalPenetapan,
    masaKerjaAkhir,
    namaKetua,
    teamMembers,
  } = data;

  const tanggalPenetapanFormatted = new Date(
    tanggalPenetapan,
  ).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const masaKerjaAkhirFormatted = new Date(masaKerjaAkhir).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  // Create table rows for team members
  const teamMemberRows = teamMembers.map((member, index) => {
    return new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${index + 1}`,
                  font: "Calibri",
                  size: 22,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 120 },
            }),
          ],
          width: {
            size: 5,
            type: WidthType.PERCENTAGE,
          },
          verticalAlign: "center",
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: member.personName,
                  font: "Calibri",
                  size: 22,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 120 },
            }),
          ],
          width: {
            size: 25,
            type: WidthType.PERCENTAGE,
          },
          verticalAlign: "center",
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: member.nipOrSobat,
                  font: "Calibri",
                  size: 22,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 120 },
            }),
          ],
          width: {
            size: 20,
            type: WidthType.PERCENTAGE,
          },
          verticalAlign: "center",
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: member.taskTitle,
                  font: "Calibri",
                  size: 22,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 120 },
            }),
          ],
          width: {
            size: 50,
            type: WidthType.PERCENTAGE,
          },
          verticalAlign: "center",
        }),
      ],
    });
  });

  // Main document section
  const mainSection = {
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          right: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1),
        },
      },
    },
    children: [
      // Logo BPS - Actual image
      new Paragraph({
        children: [
          new ImageRun({
            data: await getLogoBase64(),
            type: "png",
            transformation: {
              width: 60,
              height: 60,
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),

      // KEPUTUSAN
      new Paragraph({
        children: [
          new TextRun({
            text: "KEPUTUSAN",
            font: "Calibri",
            bold: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `KEPALA BADAN PUSAT STATISTIK ${kotaKabupaten.toUpperCase()}`,
            font: "Calibri",
            bold: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),

      // NOMOR
      new Paragraph({
        children: [
          new TextRun({
            text: `NOMOR : ${nomorSK}`,
            font: "Calibri",
            bold: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),

      // TENTANG
      new Paragraph({
        children: [
          new TextRun({
            text: "TENTANG",
            font: "Calibri",
            bold: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `TIM PELAKSANA PENDATAAN ${projectName.toUpperCase()}`,
            font: "Calibri",
            bold: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `BADAN PUSAT STATISTIK ${kotaKabupaten.toUpperCase()}`,
            font: "Calibri",
            bold: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `TAHUN ANGGARAN ${projectYear}`,
            font: "Calibri",
            bold: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
      }),

      // KEPALA BADAN PUSAT STATISTIK
      new Paragraph({
        children: [
          new TextRun({
            text: `KEPALA BADAN PUSAT STATISTIK ${kotaKabupaten.toUpperCase()}`,
            font: "Calibri",
            bold: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),

      // Menimbang - Tab di posisi yang benar dengan hanging indent
      new Paragraph({
        children: [
          new TextRun({
            text: "Menimbang",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: "\t:\t",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: `Bahwa untuk kelancaran kegiatan Pendataan ${projectName} pada Badan Pusat Statistik ${kotaKabupaten}, perlu menetapkan Tim pelaksana Pendataan Pendataan ${projectName} Tahun ${projectYear} dengan Keputusan Kepala Badan Pusat Statistik ${kotaKabupaten};`,
            font: "Calibri",
            size: 22,
          }),
        ],
        tabStops: [
          {
            type: TabStopType.LEFT,
            position: 1440,
          },
          {
            type: TabStopType.LEFT,
            position: 1620,
          },
        ],
        indent: {
          left: 1620,
          hanging: 1620,
        },
        spacing: { after: 240, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),

      // Mengingat
      new Paragraph({
        children: [
          new TextRun({
            text: "Mengingat",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: "\t:\t",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: "1. Undang-undang Nomor 16 Tahun 1997 tentang Statistik;",
            font: "Calibri",
            size: 22,
          }),
        ],
        tabStops: [
          {
            type: TabStopType.LEFT,
            position: 1440,
          },
          {
            type: TabStopType.LEFT,
            position: 1620,
          },
        ],
        indent: {
          left: 1620,
          hanging: 1620,
        },
        spacing: { after: 120, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "2. Peraturan Pemerintah Nomor 51 Tahun 1999 tentang Penyelenggaraan Statistik;",
            font: "Calibri",
            size: 22,
          }),
        ],
        indent: {
          left: 1800,
          hanging: 200,
        },
        spacing: { after: 120, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "3. Peraturan Presiden Nomor 86 Tahun 2007 tentang Badan Pusat Statistik;",
            font: "Calibri",
            size: 22,
          }),
        ],
        indent: {
          left: 1800,
          hanging: 200,
        },
        spacing: { after: 120, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "4. Peraturan Badan Pusat Statistik Nomor 5 Tahun 2019 tentang Tata Naskah Dinas di Lingkungan Badan Pusat Statistik;",
            font: "Calibri",
            size: 22,
          }),
        ],
        indent: {
          left: 1800,
          hanging: 200,
        },
        spacing: { after: 120, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "5. Peraturan Badan Pusat Statistik Nomor 5 Tahun 2023 tentang Organisasi dan Tata Kerja Badan Pusat Statistik Provinsi dan Badan Pusat Statistik Kabupaten/Kota;",
            font: "Calibri",
            size: 22,
          }),
        ],
        indent: {
          left: 1800,
          hanging: 200,
        },
        spacing: { after: 480, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),

      // Empty paragraphs untuk spacing
      new Paragraph({
        text: "",
        spacing: { after: 240 },
      }),

      // MEMUTUSKAN
      new Paragraph({
        children: [
          new TextRun({
            text: "MEMUTUSKAN :",
            font: "Calibri",
            bold: true,
            size: 22,
          }),
        ],
        spacing: { after: 240 },
        alignment: AlignmentType.CENTER,
      }),

      // Menetapkan
      new Paragraph({
        children: [
          new TextRun({
            text: "Menetapkan",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: "\t:\t",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: `KEPUTUSAN KEPALA BADAN PUSAT STATISTIK ${kotaKabupaten.toUpperCase()} TENTANG TIM PELAKSANA KEGIATAN PENDATAAN ${projectName.toUpperCase()} TAHUN ${projectYear} PADA BADAN PUSAT STATISTIK ${kotaKabupaten.toUpperCase()}`,
            font: "Calibri",
            size: 22,
          }),
        ],
        tabStops: [
          {
            type: TabStopType.LEFT,
            position: 1440,
          },
          {
            type: TabStopType.LEFT,
            position: 1620,
          },
        ],
        indent: {
          left: 1620,
          hanging: 1620,
        },
        spacing: { after: 240, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),

      // KESATU
      new Paragraph({
        children: [
          new TextRun({
            text: "KESATU",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: "\t:\t",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: `Membentuk Tim Pelaksana kegiatan Pendataan ${projectName} Tahun ${projectYear} pada Badan Pusat Statistik ${kotaKabupaten} Tahun ${projectYear} dengan susunan sebagaimana tersebut pada lampiran keputusan ini;`,
            font: "Calibri",
            size: 22,
          }),
        ],
        tabStops: [
          {
            type: TabStopType.LEFT,
            position: 1440,
          },
          {
            type: TabStopType.LEFT,
            position: 1620,
          },
        ],
        indent: {
          left: 1620,
          hanging: 1620,
        },
        spacing: { after: 240, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),

      // KEDUA
      new Paragraph({
        children: [
          new TextRun({
            text: "KEDUA",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: "\t:\t",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: `Tim Pelaksana kegiatan Pendataan ${projectName} Tahun ${projectYear} pada Badan Pusat Statistik ${kotaKabupaten} mempunyai tugas antara lain:`,
            font: "Calibri",
            size: 22,
          }),
        ],
        tabStops: [
          {
            type: TabStopType.LEFT,
            position: 1440,
          },
          {
            type: TabStopType.LEFT,
            position: 1620,
          },
        ],
        indent: {
          left: 1620,
          hanging: 1620,
        },
        spacing: { after: 120, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),

      // a. task
      new Paragraph({
        children: [
          new TextRun({
            text: `a.\t Mengikuti briefing/pelatihan Pendataan ${projectName} tahun ${projectYear};`,
            font: "Calibri",
            size: 22,
          }),
        ],
        tabStops: [
          {
            type: TabStopType.LEFT,
            position: 2000,
          },
        ],
        indent: {
          left: 1980,
          hanging: 180,
        },
        spacing: { after: 120, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),

      // b. task
      new Paragraph({
        children: [
          new TextRun({
            text: `b.\t Melakukan pengumpulan data Pendataan ${projectName} tahun ${projectYear};`,
            font: "Calibri",
            size: 22,
          }),
        ],
        tabStops: [
          {
            type: TabStopType.LEFT,
            position: 2000,
          },
        ],
        indent: {
          left: 1980,
          hanging: 180,
        },
        spacing: { after: 120, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),

      // c. task
      new Paragraph({
        children: [
          new TextRun({
            text: "c.\t Melakukan pengawasan dan pemeriksaan terhadap hasil pengumpulan data;",
            font: "Calibri",
            size: 22,
          }),
        ],
        tabStops: [
          {
            type: TabStopType.LEFT,
            position: 2000,
          },
        ],
        indent: {
          left: 1980,
          hanging: 180,
        },
        spacing: { after: 120, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),

      // d. task
      new Paragraph({
        children: [
          new TextRun({
            text: `d.\t Melakukan editing coding, entry dan validasi dokumen kuesioner hasil pengumpulan data Pendataan ${projectName} tahun ${projectYear}.`,
            font: "Calibri",
            size: 22,
          }),
        ],
        tabStops: [
          {
            type: TabStopType.LEFT,
            position: 2000,
          },
        ],
        indent: {
          left: 1980,
          hanging: 180,
        },
        spacing: { after: 240, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),

      // KETIGA
      new Paragraph({
        children: [
          new TextRun({
            text: "KETIGA",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: "\t:\t",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: `Masa kerja berakhir pada tanggal ${masaKerjaAkhirFormatted}`,
            font: "Calibri",
            size: 22,
          }),
        ],
        tabStops: [
          {
            type: TabStopType.LEFT,
            position: 1440,
          },
          {
            type: TabStopType.LEFT,
            position: 1620,
          },
        ],
        indent: {
          left: 1620,
          hanging: 1620,
        },
        spacing: { after: 240, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),

      // KEEMPAT
      new Paragraph({
        children: [
          new TextRun({
            text: "KEEMPAT",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: "\t:\t",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: "Keputusan ini berlaku sejak tanggal di tetapkan",
            font: "Calibri",
            size: 22,
          }),
        ],
        tabStops: [
          {
            type: TabStopType.LEFT,
            position: 1440,
          },
          {
            type: TabStopType.LEFT,
            position: 1620,
          },
        ],
        indent: {
          left: 1620,
          hanging: 1620,
        },
        spacing: { after: 480, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
      }),

      // Ditetapkan di - RATA KANAN
      new Paragraph({
        text: "",
        spacing: { after: 240 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Ditetapkan di ${kotaKabupaten}`,
            font: "Calibri",
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        indent: {
          left: 5160, // 18.3 cm = 5160 twips (sedikit lebih ke kiri lagi)
        },
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Pada tanggal ${tanggalPenetapanFormatted}`,
            font: "Calibri",
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        indent: {
          left: 5160, // 18.3 cm = 5160 twips (sedikit lebih ke kiri lagi)
        },
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "KEPALA BADAN PUSAT STATISTIK",
            font: "Calibri",
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        indent: {
          left: 5160, // 18.3 cm = 5160 twips (sedikit lebih ke kiri lagi)
        },
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: kotaKabupaten.toUpperCase(),
            font: "Calibri",
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        indent: {
          left: 5160, // 18.3 cm = 5160 twips (sedikit lebih ke kiri lagi)
        },
        spacing: { after: 1200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: namaKetua,
            font: "Calibri",
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        indent: {
          left: 5160, // 18.3 cm = 5160 twips (sedikit lebih ke kiri lagi)
        },
        spacing: { after: 480 },
      }),
    ],
  };

  // Lampiran section
  const lampiranSection = {
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          right: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1),
        },
      },
    },
    children: [
      new Paragraph({
        text: "",
        pageBreakBefore: true,
      }),

      // LAMPIRAN - RATA KIRI
      new Paragraph({
        children: [
          new TextRun({
            text: "LAMPIRAN",
            font: "Calibri",
            size: 22,
          }),
        ],
        alignment: AlignmentType.LEFT,
        indent: {
          left: 5160, // 18.3 cm = 5160 twips (sama dengan bagian signature)
        },
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "KEPUTUSAN KEPALA",
            font: "Calibri",
            size: 22,
          }),
        ],
        alignment: AlignmentType.LEFT,
        indent: {
          left: 5160, // 18.3 cm = 5160 twips (sama dengan bagian signature)
        },
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `BADAN PUSAT STATISTIK ${kotaKabupaten.toUpperCase()}`,
            font: "Calibri",
            size: 22,
          }),
        ],
        alignment: AlignmentType.LEFT,
        indent: {
          left: 5160, // 18.3 cm = 5160 twips (sama dengan bagian signature)
        },
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "NOMOR\t:\t",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: nomorSK,
            font: "Calibri",
            size: 22,
          }),
        ],
        tabStops: [
          {
            type: TabStopType.LEFT,
            position: 6500, // Posisi yang sama untuk ":" agar sejajar
          },
          {
            type: TabStopType.LEFT,
            position: 6800, // Posisi untuk value
          },
        ],
        alignment: AlignmentType.LEFT,
        indent: {
          left: 5160, // 18.3 cm = 5160 twips (sama dengan bagian signature)
        },
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "TANGGAL\t:\t",
            font: "Calibri",
            size: 22,
          }),
          new TextRun({
            text: tanggalPenetapanFormatted,
            font: "Calibri",
            size: 22,
          }),
        ],
        tabStops: [
          {
            type: TabStopType.LEFT,
            position: 6500, // Posisi yang sama untuk ":" agar sejajar
          },
          {
            type: TabStopType.LEFT,
            position: 6800, // Posisi untuk value
          },
        ],
        alignment: AlignmentType.LEFT,
        indent: {
          left: 5160, // 18.3 cm = 5160 twips (sama dengan bagian signature)
        },
        spacing: { after: 360 },
      }),

      // Judul table - CENTER
      new Paragraph({
        children: [
          new TextRun({
            text: `DAFTAR TIM PELAKSANA PENDATAAN ${projectName.toUpperCase()}`,
            font: "Calibri",
            bold: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `TAHUN ${projectYear}`,
            font: "Calibri",
            bold: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `BADAN PUSAT STATISTIK ${kotaKabupaten.toUpperCase()}`,
            font: "Calibri",
            bold: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
      }),

      // Table
      new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        },
        rows: [
          // Header row
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "NO.",
                        font: "Calibri",
                        bold: true,
                        size: 22,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120, after: 120 },
                  }),
                ],
                width: {
                  size: 5,
                  type: WidthType.PERCENTAGE,
                },
                verticalAlign: "center",
                shading: {
                  fill: "D9D9D9",
                },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "NAMA PETUGAS",
                        font: "Calibri",
                        bold: true,
                        size: 22,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120, after: 120 },
                  }),
                ],
                width: {
                  size: 25,
                  type: WidthType.PERCENTAGE,
                },
                verticalAlign: "center",
                shading: {
                  fill: "D9D9D9",
                },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "NIP/NMS",
                        font: "Calibri",
                        bold: true,
                        size: 22,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120, after: 120 },
                  }),
                ],
                width: {
                  size: 20,
                  type: WidthType.PERCENTAGE,
                },
                verticalAlign: "center",
                shading: {
                  fill: "D9D9D9",
                },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "BERTUGAS SEBAGAI",
                        font: "Calibri",
                        bold: true,
                        size: 22,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120, after: 120 },
                  }),
                ],
                width: {
                  size: 50,
                  type: WidthType.PERCENTAGE,
                },
                verticalAlign: "center",
                shading: {
                  fill: "D9D9D9",
                },
              }),
            ],
          }),
          // Data rows
          ...teamMemberRows,
        ],
      }),

      // Signature for lampiran - RATA KANAN
      new Paragraph({
        text: "",
        spacing: { after: 480 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "KEPALA BADAN PUSAT STATISTIK",
            font: "Calibri",
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        indent: {
          left: 5160, // 18.3 cm = 5160 twips (sama dengan bagian atas)
        },
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: kotaKabupaten.toUpperCase(),
            font: "Calibri",
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        indent: {
          left: 5160, // 18.3 cm = 5160 twips (sedikit lebih ke kiri lagi)
        },
        spacing: { after: 1200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: namaKetua,
            font: "Calibri",
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        indent: {
          left: 5160, // 18.3 cm = 5160 twips (sama dengan bagian atas)
        },
        spacing: { after: 120 },
      }),
    ],
  };

  return new Document({
    sections: [mainSection, lampiranSection],
  });
}
