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

/**
 * Generate multi-mitra BAST with page breaks between each mitra
 */
export async function generateMultiBASTDocument(
  bastDataArray: BASTData[],
): Promise<Document> {
  if (bastDataArray.length === 0) {
    throw new Error("No BAST data provided");
  }

  // Helper to build children for one mitra (copy of bastGenerator content)
  const buildChildrenFor = (data: BASTData) => {
    const FONT_NAME = "Bookman Old Style";
    const FONT_SIZE_TITLE = 32;
    const FONT_SIZE = 24;

    const tanggalText = dateToIndonesianText(data.tanggalPenandatanganan);
    const dateObj =
      typeof data.tanggalPenandatanganan === "string"
        ? new Date(data.tanggalPenandatanganan.split("/").reverse().join("-"))
        : (data.tanggalPenandatanganan as any as Date);
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const yyyy = dateObj.getFullYear();
    const shortDate = `${dd}/${mm}/${yyyy}`;

    let volumeText = "";
    if (data.volumeBySatuan.length === 1) {
      volumeText = `${data.volumeBySatuan[0].total} ${data.volumeBySatuan[0].nama_satuan} ${data.projectName}`;
    } else if (data.volumeBySatuan.length > 1) {
      volumeText =
        data.volumeBySatuan
          .map((v) => `${v.total} ${v.nama_satuan}`)
          .join(", ") + ` ${data.projectName}`;
    } else {
      volumeText = `0 dokumen ${data.projectName}`;
    }

    return [
      // Title
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
        spacing: { line: 240, after: 0 },
      }),
      // Nomor
      new Paragraph({
        children: [
          new TextRun({
            text: "NOMOR: ",
            font: FONT_NAME,
            size: FONT_SIZE_TITLE,
            bold: true,
          }),
          new TextRun({
            text: data.nomorBAST,
            font: FONT_NAME,
            size: FONT_SIZE_TITLE,
            bold: true,
            color: "FF0000",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { line: 240, after: 200 },
      }),
      // Garis bawah nomor (pakai tabel untuk kontrol tebal)
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
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
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
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
                  top: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
              }),
            ],
          }),
        ],
      }),
      // Pada hari ini
      new Paragraph({
        children: [
          new TextRun({
            text: `Pada hari ini ${tanggalText} (${shortDate}), kami yang bertanda tangan dibawah ini:`,
            font: FONT_NAME,
            size: FONT_SIZE,
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: 240, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE })],
        spacing: { line: 240, after: 0 },
      }),
      // I. Pihak Pertama
      new Paragraph({
        children: [
          new TextRun({ text: "I.\t", font: FONT_NAME, size: FONT_SIZE }),
          new TextRun({
            text: data.ketuaTimName,
            font: FONT_NAME,
            size: FONT_SIZE,
            bold: true,
          }),
          new TextRun({
            text: `, selaku Penanggung Jawab Pendataan Lapangan ${data.projectName} Badan Pusat Statistik Kota Batu, berkedudukan di Jalan Melati No.1 Songgokerto Batu, bertindak untuk dan atas nama Badan Pusat Statistik Kota Batu yang selanjutnya dalam hal ini disebut sebagai `,
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
        spacing: { line: 240, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE })],
        spacing: { line: 240, after: 0 },
      }),
      // II. Pihak Kedua
      new Paragraph({
        children: [
          new TextRun({ text: "II.\t", font: FONT_NAME, size: FONT_SIZE }),
          new TextRun({
            text: data.mitraData.nama_mitra,
            font: FONT_NAME,
            size: FONT_SIZE,
            bold: true,
          }),
          new TextRun({
            text: `, selaku Petugas Pendataan Lapangan ${data.projectName}, berkedudukan di ${data.mitraData.alamat}, bertindak untuk dan atas nama diri sendiri yang selanjutnya dalam hal ini disebut `,
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
        spacing: { line: 240, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE })],
        spacing: { line: 240, after: 0 },
      }),
      // Memperhatikan table
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
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
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
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
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
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
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                verticalAlign: VerticalAlign.TOP,
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `Surat Keputusan Kepala BPS Kota Batu tentang SK Tim Pelaksanaan Pendataan Lapangan ${data.projectName} Badan Pusat Statistik Kota Batu, Nomor ${data.nomorSK} tanggal ${data.tanggalSK} dan lampiran alokasi tugas pada SK Nomor ${data.nomorSK} tanggal ${data.tanggalSK}.`,
                        font: FONT_NAME,
                        size: FONT_SIZE,
                      }),
                    ],
                    alignment: AlignmentType.JUSTIFIED,
                  }),
                ],
                width: { size: 78, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                verticalAlign: VerticalAlign.TOP,
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE })],
        spacing: { line: 240, after: 0 },
      }),
      // Menyatakan bahwa
      new Paragraph({
        children: [
          new TextRun({
            text: "Menyatakan bahwa :",
            font: FONT_NAME,
            size: FONT_SIZE,
          }),
        ],
        alignment: AlignmentType.LEFT,
        spacing: { line: 240, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE })],
        spacing: { line: 240, after: 0 },
      }),
      // 1.
      new Paragraph({
        children: [
          new TextRun({
            text: "1.\tPIHAK KEDUA menyerahkan hasil pekerjaan kepada PIHAK PERTAMA berupa  ",
            font: FONT_NAME,
            size: FONT_SIZE,
          }),
          new TextRun({ text: volumeText, font: FONT_NAME, size: FONT_SIZE }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        tabStops: [
          { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
        ],
        indent: {
          left: convertInchesToTwip(0.5),
          hanging: convertInchesToTwip(0.5),
        },
        spacing: { line: 240, after: 120 },
      }),
      // 2.
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
        spacing: { line: 240, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE })],
        spacing: { line: 240, after: 0 },
      }),
      // Penutup
      new Paragraph({
        children: [
          new TextRun({
            text: "Demikian Berita Acara Serah Terima Hasil Pekerjaan ini dibuat dengan rangkap yang cukup untuk dapat digunakan sebagaimana mestinya.",
            font: FONT_NAME,
            size: FONT_SIZE,
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: 240, after: 240 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE })],
        spacing: { line: 240, after: 0 },
      }),
      // Signature table
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
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
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
          new TableRow({
            children: [
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
                        text: data.mitraData.nama_mitra,
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
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
              }),
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
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
              }),
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
                        text: data.ketuaTimName,
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
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
              }),
            ],
          }),
        ],
      }),
    ];
  };

  const FONT_NAME = "Bookman Old Style";
  const sections = bastDataArray.map((data, idx) => ({
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1.18),
          right: convertInchesToTwip(0.79),
        },
      },
    },
    children:
      idx === 0
        ? buildChildrenFor(data)
        : [
            new Paragraph({
              children: [new TextRun({ text: "", font: FONT_NAME, size: 24 })],
              pageBreakBefore: true,
            }),
            ...buildChildrenFor(data),
          ],
  }));

  return new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "Bookman Old Style", size: 24 },
          paragraph: { spacing: { line: 240, before: 0, after: 0 } },
        },
      ],
    },
    sections,
  });
}
