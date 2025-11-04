import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  VerticalAlign,
  convertInchesToTwip,
  TabStopType,
} from "docx";
import { dateToIndonesianText } from "./documentUtils";

interface BASTData {
  nomorBAST: string;
  projectId: string;
  projectName: string;
  month: string;
  year: string;
  mitraId: string;
  mitraData: {
    nama_mitra: string;
    alamat: string;
  };
  ketuaTimName: string;
  tanggalPenandatanganan: string;
  nomorSK: string;
  tanggalSK: string;
  volumeBySatuan: Array<{ nama_satuan: string; total: number }>;
}

const FONT_NAME = "Bookman Old Style";
const FONT_SIZE_TITLE = 32; // 16pt = 32 half-points
const FONT_SIZE = 24; // 12pt = 24 half-points

/**
 * Generate BAST Document sesuai format template
 */
export async function generateBASTDocument(data: BASTData): Promise<Document> {
  const {
    nomorBAST,
    projectName,
    mitraData,
    ketuaTimName,
    tanggalPenandatanganan,
    nomorSK,
    tanggalSK,
    volumeBySatuan,
  } = data;

  // Convert tanggal penandatanganan to text
  const tanggalText = dateToIndonesianText(tanggalPenandatanganan);

  // Format tanggal dalam tanda kurung (dd/mm/yyyy)
  const dateObj =
    typeof tanggalPenandatanganan === "string"
      ? new Date(tanggalPenandatanganan.split("/").reverse().join("-"))
      : tanggalPenandatanganan;
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = dateObj.getFullYear();
  const shortDate = `${dd}/${mm}/${yyyy}`;

  // Build volume text: "32 dokumen Updating Direktori..." or "10 dokumen..., 10 O-K..."
  let volumeText = "";
  if (volumeBySatuan.length === 1) {
    volumeText = `${volumeBySatuan[0].total} ${volumeBySatuan[0].nama_satuan} ${projectName}`;
  } else if (volumeBySatuan.length > 1) {
    volumeText =
      volumeBySatuan.map((v) => `${v.total} ${v.nama_satuan}`).join(", ") +
      ` ${projectName}`;
  } else {
    volumeText = `0 dokumen ${projectName}`;
  }

  // Margins: Default margins
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: {
            font: FONT_NAME,
            size: FONT_SIZE,
          },
          paragraph: {
            spacing: {
              line: 240, // Single spacing
              before: 0,
              after: 0,
            },
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.18), // ~3cm
              right: convertInchesToTwip(0.79), // ~2cm
            },
          },
        },
        children: [
          // Title: BERITA ACARA SERAH TERIMA HASIL PEKERJAAN
          new Paragraph({
            children: [
              new TextRun({
                text: "BERITA ACARA SERAH TERIMA HASIL PEKERJAAN",
                font: FONT_NAME,
                size: FONT_SIZE_TITLE,
                bold: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              line: 240,
              after: 0,
            },
          }),

          // NOMOR
          new Paragraph({
            children: [
              new TextRun({
                text: "NOMOR: ",
                font: FONT_NAME,
                size: FONT_SIZE_TITLE,
                bold: true,
              }),
              new TextRun({
                text: nomorBAST,
                font: FONT_NAME,
                size: FONT_SIZE_TITLE,
                bold: true,
                color: "FF0000",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              line: 240,
              after: 200,
            },
          }),

          // Garis horizontal di bawah NOMOR
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideHorizontal: {
                style: BorderStyle.NONE,
                size: 0,
                color: "FFFFFF",
              },
              insideVertical: {
                style: BorderStyle.NONE,
                size: 0,
                color: "FFFFFF",
              },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                          }),
                        ],
                        spacing: { after: 100 },
                      }),
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                      top: {
                        style: BorderStyle.SINGLE,
                        size: 12,
                        color: "000000",
                      },
                      bottom: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      left: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      right: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                    },
                  }),
                ],
              }),
            ],
          }),

          // Pada hari ini...
          new Paragraph({
            children: [
              new TextRun({
                text: `Pada hari ini ${tanggalText} (${shortDate}), kami yang bertanda tangan dibawah ini:`,
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
              line: 240,
              after: 120,
            },
          }),

          // Empty line
          new Paragraph({
            children: [
              new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE }),
            ],
            spacing: { line: 240, after: 0 },
          }),

          // I. PIHAK PERTAMA (Ketua Tim)
          new Paragraph({
            children: [
              new TextRun({
                text: "I.\t",
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
              new TextRun({
                text: ketuaTimName,
                font: FONT_NAME,
                size: FONT_SIZE,
                bold: true,
              }),
              new TextRun({
                text: `, selaku Penanggung Jawab Pendataan Lapangan ${projectName} Badan Pusat Statistik Kota Batu, berkedudukan di Jalan Melati No.1 Songgokerto Batu, bertindak untuk dan atas nama Badan Pusat Statistik Kota Batu yang selanjutnya dalam hal ini disebut sebagai `,
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
              new TextRun({
                text: "PIHAK PERTAMA.",
                font: FONT_NAME,
                size: FONT_SIZE,
                bold: true,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            tabStops: [
              { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
            ],
            indent: {
              left: convertInchesToTwip(0.5),
              hanging: convertInchesToTwip(0.5),
            },
            spacing: {
              line: 240,
              after: 120,
            },
          }),

          // Empty line
          new Paragraph({
            children: [
              new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE }),
            ],
            spacing: { line: 240, after: 0 },
          }),

          // II. PIHAK KEDUA (Mitra)
          new Paragraph({
            children: [
              new TextRun({
                text: "II.\t",
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
              new TextRun({
                text: mitraData.nama_mitra,
                font: FONT_NAME,
                size: FONT_SIZE,
                bold: true,
              }),
              new TextRun({
                text: `, selaku Petugas Pendataan Lapangan ${projectName}, berkedudukan di ${mitraData.alamat}, bertindak untuk dan atas nama diri sendiri yang selanjutnya dalam hal ini disebut `,
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
              new TextRun({
                text: "PIHAK KEDUA.",
                font: FONT_NAME,
                size: FONT_SIZE,
                bold: true,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            tabStops: [
              { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
            ],
            indent: {
              left: convertInchesToTwip(0.5),
              hanging: convertInchesToTwip(0.5),
            },
            spacing: {
              line: 240,
              after: 120,
            },
          }),

          // Empty line
          new Paragraph({
            children: [
              new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE }),
            ],
            spacing: { line: 240, after: 0 },
          }),

          // Memperhatikan Table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideHorizontal: {
                style: BorderStyle.NONE,
                size: 0,
                color: "FFFFFF",
              },
              insideVertical: {
                style: BorderStyle.NONE,
                size: 0,
                color: "FFFFFF",
              },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Memperhatikan",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                          }),
                        ],
                        alignment: AlignmentType.LEFT,
                      }),
                    ],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    borders: {
                      top: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      bottom: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      left: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      right: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                    },
                    verticalAlign: VerticalAlign.TOP,
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: ":",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 2, type: WidthType.PERCENTAGE },
                    borders: {
                      top: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      bottom: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      left: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      right: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                    },
                    verticalAlign: VerticalAlign.TOP,
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Surat Keputusan Kepala BPS Kota Batu tentang SK Tim Pelaksanaan Pendataan Lapangan ${projectName} Badan Pusat Statistik Kota Batu, Nomor ${nomorSK} tanggal ${tanggalSK} dan lampiran alokasi tugas pada SK Nomor ${nomorSK} tanggal ${tanggalSK}.`,
                            font: FONT_NAME,
                            size: FONT_SIZE,
                          }),
                        ],
                        alignment: AlignmentType.JUSTIFIED,
                      }),
                    ],
                    width: { size: 78, type: WidthType.PERCENTAGE },
                    borders: {
                      top: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      bottom: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      left: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      right: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                    },
                    verticalAlign: VerticalAlign.TOP,
                  }),
                ],
              }),
            ],
          }),

          // Empty line
          new Paragraph({
            children: [
              new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE }),
            ],
            spacing: { line: 240, after: 0 },
          }),

          // Menyatakan bahwa :
          new Paragraph({
            children: [
              new TextRun({
                text: "Menyatakan bahwa :",
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: {
              line: 240,
              after: 120,
            },
          }),

          // Empty line
          new Paragraph({
            children: [
              new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE }),
            ],
            spacing: { line: 240, after: 0 },
          }),

          // 1. PIHAK KEDUA menyerahkan hasil pekerjaan...
          new Paragraph({
            children: [
              new TextRun({
                text: "1.\tPIHAK KEDUA menyerahkan hasil pekerjaan kepada PIHAK PERTAMA berupa  ",
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
              new TextRun({
                text: volumeText,
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            tabStops: [
              { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
            ],
            indent: {
              left: convertInchesToTwip(0.5),
              hanging: convertInchesToTwip(0.5),
            },
            spacing: {
              line: 240,
              after: 120,
            },
          }),

          // 2. PIHAK PERTAMA menyatakan...
          new Paragraph({
            children: [
              new TextRun({
                text: "2.\tPIHAK PERTAMA menyatakan telah menerima dengan baik dan lengkap pekerjaan tersebut diatas dari PIHAK KEDUA.",
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            tabStops: [
              { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
            ],
            indent: {
              left: convertInchesToTwip(0.5),
              hanging: convertInchesToTwip(0.5),
            },
            spacing: {
              line: 240,
              after: 120,
            },
          }),

          // Empty line
          new Paragraph({
            children: [
              new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE }),
            ],
            spacing: { line: 240, after: 0 },
          }),

          // Demikian Berita Acara...
          new Paragraph({
            children: [
              new TextRun({
                text: "Demikian Berita Acara Serah Terima Hasil Pekerjaan ini dibuat dengan rangkap yang cukup untuk dapat digunakan sebagaimana mestinya.",
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
              line: 240,
              after: 240,
            },
          }),

          // Empty line
          new Paragraph({
            children: [
              new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE }),
            ],
            spacing: { line: 240, after: 0 },
          }),

          // Signature Table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideHorizontal: {
                style: BorderStyle.NONE,
                size: 0,
                color: "FFFFFF",
              },
              insideVertical: {
                style: BorderStyle.NONE,
                size: 0,
                color: "FFFFFF",
              },
            },
            rows: [
              new TableRow({
                children: [
                  // PIHAK KEDUA
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "PIHAK KEDUA,",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                            bold: true,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { line: 240, after: 0 },
                      }),
                      // Empty space for signature
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                          }),
                        ],
                        spacing: { line: 240, after: 0 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                          }),
                        ],
                        spacing: { line: 240, after: 0 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                          }),
                        ],
                        spacing: { line: 240, after: 0 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                          }),
                        ],
                        spacing: { line: 240, after: 0 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: mitraData.nama_mitra,
                            font: FONT_NAME,
                            size: FONT_SIZE,
                            bold: true,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { line: 240, after: 0 },
                      }),
                    ],
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    borders: {
                      top: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      bottom: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      left: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      right: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                    },
                  }),
                  // Empty space
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    borders: {
                      top: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      bottom: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      left: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      right: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                    },
                  }),
                  // PIHAK PERTAMA
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "PIHAK PERTAMA,",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                            bold: true,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { line: 240, after: 0 },
                      }),
                      // Empty space for signature
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                          }),
                        ],
                        spacing: { line: 240, after: 0 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                          }),
                        ],
                        spacing: { line: 240, after: 0 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                          }),
                        ],
                        spacing: { line: 240, after: 0 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "",
                            font: FONT_NAME,
                            size: FONT_SIZE,
                          }),
                        ],
                        spacing: { line: 240, after: 0 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: ketuaTimName,
                            font: FONT_NAME,
                            size: FONT_SIZE,
                            bold: true,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { line: 240, after: 0 },
                      }),
                    ],
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    borders: {
                      top: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      bottom: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      left: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                      right: {
                        style: BorderStyle.NONE,
                        size: 0,
                        color: "FFFFFF",
                      },
                    },
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return doc;
}
