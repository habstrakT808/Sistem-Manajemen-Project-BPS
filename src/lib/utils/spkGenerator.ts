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
} from "docx";
import { TabStopType } from "docx";
import { VerticalMergeType } from "docx";
import { HeightRule } from "docx";
import { Footer, PageNumber } from "docx";
import {
  dateToIndonesianText,
  formatRupiah,
  rupiahToWords,
  getMonthRange,
} from "./documentUtils";

interface SPKTask {
  title: string;
  start_date: string;
  end_date: string;
  honor_amount: number;
}

interface SPKData {
  nomorSPK: string;
  projectId: string;
  month: string;
  year: string;
  mitraId: string;
  tanggalPenandatanganan: string;
  namaPejabat: string;
  mitraData: {
    nama_mitra: string;
    alamat: string;
    pekerjaan: string;
  };
  tasks: SPKTask[];
}

const FONT_NAME = "Bookman Old Style";
const FONT_SIZE = 18; // 9pt = 18 half-points

/**
 * Generate SPK Document sesuai format template
 */
export async function generateSPKDocument(data: SPKData): Promise<Document> {
  const {
    nomorSPK,
    month,
    year,
    tanggalPenandatanganan,
    namaPejabat,
    mitraData,
    tasks,
  } = data;

  const monthNum = parseInt(month);
  const yearNum = parseInt(year);
  const monthRange = getMonthRange(yearNum, monthNum);

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const monthName = months[monthNum - 1];

  // Calculate total honor
  const totalHonor = tasks.reduce(
    (sum, task) => sum + parseFloat(task.honor_amount.toString()),
    0,
  );
  const totalHonorText = rupiahToWords(totalHonor);

  // Convert tanggal penandatanganan to text
  const tanggalText = dateToIndonesianText(tanggalPenandatanganan);

  // Margins: Top 1cm, Bottom 2.5cm, Left 2cm, Right 2cm
  // 1cm = 0.3937 inch
  let doc: Document;
  try {
    doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            paragraph: {
              spacing: { line: 300, lineRule: "auto" },
            },
          },
        ],
      },
      sections: [
        {
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: "[" }),
                    new TextRun({ children: [PageNumber.CURRENT] }),
                    new TextRun({ text: "]" }),
                  ],
                }),
              ],
            }),
          },
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.3937), // 1cm
                right: convertInchesToTwip(0.7874), // 2cm
                bottom: convertInchesToTwip(0.9843), // 2.5cm
                left: convertInchesToTwip(0.7874), // 2cm
              },
              size: {
                width: convertInchesToTwip(8.27), // A4 width: 21cm
                height: convertInchesToTwip(11.69), // A4 height: 29.7cm
              },
            },
          },
          children: [
            // HEADER - PERJANJIAN KERJA
            new Paragraph({
              children: [
                new TextRun({
                  text: "PERJANJIAN KERJA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            // PETUGAS KEGIATAN SURVEI / SENSUS BULAN ... TAHUN ...
            new Paragraph({
              children: [
                new TextRun({
                  text: `PETUGAS KEGIATAN SURVEI / SENSUS BULAN ${monthName.toUpperCase()} TAHUN ${year}`,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            // PADA BADAN PUSAT STATISTIK KOTA BATU
            new Paragraph({
              children: [
                new TextRun({
                  text: "PADA BADAN PUSAT STATISTIK KOTA BATU",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            // NOMOR
            new Paragraph({
              children: [
                new TextRun({
                  text: "NOMOR: ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: nomorSPK,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                  color: "FF0000",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            // extra blank line after NOMOR
            new Paragraph({ children: [], spacing: { after: 0 } }),

            // Tanggal penandatanganan
            new Paragraph({
              children: [
                new TextRun({
                  text: `Pada hari ini ${tanggalText}, bertempat di Kota Batu, yang bertanda tangan di bawah ini:`,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 0 },
            }),

            // extra blank line after opening sentence
            new Paragraph({ children: [], spacing: { after: 0 } }),

            // Para Pihak Table
            createParaPihakTable(namaPejabat, mitraData),

            // Spacer line before opening paragraph so it doesn't stick to the table above
            new Paragraph({
              children: [],
              spacing: { after: 0 },
            }),

            // Paragraf pembuka perjanjian
            new Paragraph({
              children: [
                new TextRun({
                  text: "bahwa ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " dan ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " yang secara bersama-sama disebut ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PARA PIHAK",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: `, sepakat untuk mengikatkan diri dalam Perjanjian Kerja Petugas Kegiatan Survei/Sensus Bulan ${monthName} Tahun ${year} di Badan Pusat Statistik Kota Batu, yang selanjutnya disebut Perjanjian, dengan ketentuan-ketentuan sebagai berikut:`,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 0 },
            }),

            // PASAL 1
            new Paragraph({ children: [], spacing: { after: 0 } }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Pasal 1",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " memberikan pekerjaan kepada ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " dan ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " menerima pekerjaan dari ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: ` sebagai Petugas Kegiatan Survei / Sensus Bulan ${monthName} Tahun ${year}, dengan lingkup pekerjaan yang ditetapkan oleh `,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: ".",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 0 },
            }),

            // PASAL 2
            new Paragraph({ children: [], spacing: { after: 0 } }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Pasal 2",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Ruang lingkup pekerjaan dalam Perjanjian ini mengacu pada wilayah kerja dan beban kerja sebagaimana tertuang dalam lampiran Perjanjian serta pedoman Petugas Kegiatan Survei / Sensus Bulan ${monthName} Tahun ${year} pada Badan Pusat Statistik Kota Batu, dan ketentuan-ketentuan yang ditetapkan oleh `,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: ".",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 0 },
            }),

            // PASAL 3
            new Paragraph({ children: [], spacing: { after: 0 } }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Pasal 3",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Jangka Waktu Perjanjian terhitung sejak tanggal ${monthRange.startText} sampai dengan tanggal ${monthRange.endText}.`,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 0 },
            }),

            // PASAL 4
            new Paragraph({ children: [], spacing: { after: 0 } }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Pasal 4",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " berkewajiban melaksanakan seluruh pekerjaan yang diberikan oleh ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " sampai selesai, sesuai ruang lingkup pekerjaan sebagaimana dimaksud dalam Pasal 2.",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 0 },
            }),

            // PASAL 5
            new Paragraph({ children: [], spacing: { after: 0 } }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Pasal 5",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "(1)\t",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: ` berhak untuk mendapatkan honorarium Petugas Kegiatan Survei / Sensus Bulan ${monthName} Tahun ${year} dari `,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " sebesar (",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "terlampir",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  italics: true,
                }),
                new TextRun({
                  text: ") untuk pekerjaan sebagaimana dimaksud dalam Pasal 2, sudah termasuk biaya pajak, bea materai, transport, dan jasa pelayanan keuangan.",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              indent: {
                left: convertInchesToTwip(0.5),
                hanging: convertInchesToTwip(0.5),
              },
              tabStops: [
                { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
              ],
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "(2)\t",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " tidak diberikan honorarium tambahan apabila melakukan kunjungan di luar jadwal pelaksanaan pekerjaan lapangan.",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              indent: {
                left: convertInchesToTwip(0.5),
                hanging: convertInchesToTwip(0.5),
              },
              tabStops: [
                { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
              ],
              spacing: { after: 0 },
            }),

            // Continue with remaining Pasal sections...
            // PASAL 6
            new Paragraph({ children: [], spacing: { after: 0 } }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Pasal 6",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "(1)\tPembayaran honorarium sebagaimana dimaksud dalam Pasal 5 dilakukan setelah ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " menyelesaikan dan menyerahkan seluruh hasil pekerjaan sebagaimana dimaksud dalam Pasal 2 kepada ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: ".",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              indent: {
                left: convertInchesToTwip(0.5),
                hanging: convertInchesToTwip(0.5),
              },
              tabStops: [
                { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
              ],
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "(2)\tPembayaran sebagaimana dimaksud pada ayat (1) dilakukan oleh ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " kepada ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " sesuai dengan ketentuan peraturan perundang-undangan.",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              indent: {
                left: convertInchesToTwip(0.5),
                hanging: convertInchesToTwip(0.5),
              },
              tabStops: [
                { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
              ],
              spacing: { after: 0 },
            }),

            // PASAL 7
            new Paragraph({ children: [], spacing: { after: 0 } }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Pasal 7",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Penyerahan hasil pekerjaan lapangan sebagaimana dimaksud dalam Pasal 2 dilakukan secara bertahap dan selambat-lambatnya seluruh hasil pekerjaan lapangan diserahkan pada tanggal ${monthRange.endText} yang dinyatakan dalam Berita Acara Serah Terima Hasil Pekerjaan yang ditandatangani oleh `,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PARA PIHAK",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: ".",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 240 },
            }),

            // PASAL 8
            new Paragraph({ children: [], spacing: { after: 0 } }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Pasal 8",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " dapat memutuskan Perjanjian ini secara sepihak sewaktu-waktu dalam hal ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " tidak dapat melaksanakan kewajibannya sebagaimana dimaksud dalam Pasal 4, dengan menerbitkan Surat Pemutusan Perjanjian Kerja.",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 240 },
            }),

            // PASAL 9
            new Paragraph({ children: [], spacing: { after: 0 } }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Pasal 9",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "(1)\tApabila ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " mengundurkan diri pada saat/setelah pelaksanaan pekerjaan lapangan dengan tidak menyelesaikan pekerjaan yang menjadi tanggung jawabnya, maka wajib membayar ganti rugi kepada ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " sebesar nilai perjanjian yang menjadi beban kerjanya",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              indent: {
                left: convertInchesToTwip(0.5),
                hanging: convertInchesToTwip(0.5),
              },
              tabStops: [
                { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
              ],
              spacing: { after: 120 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "(2)\tDikecualikan tidak membayar ganti rugi sebagaimana dimaksud pada ayat (1) kepada ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: ", apabila ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " meninggal dunia, mengundurkan diri karena sakit dengan keterangan rawat inap, kecelakaan dengan keterangan kepolisian, dan/atau telah diberikan Surat Pemutusan Perjanjian Kerja dari ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: ".",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              indent: {
                left: convertInchesToTwip(0.5),
                hanging: convertInchesToTwip(0.5),
              },
              tabStops: [
                { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
              ],
              spacing: { after: 120 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "(3)\tDalam hal terjadi peristiwa sebagaimana dimaksud pada ayat (2), ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " membayarkan honorarium kepada ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " secara proporsional sesuai pekerjaan yang telah dilaksanakan.",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              indent: {
                left: convertInchesToTwip(0.5),
                hanging: convertInchesToTwip(0.5),
              },
              tabStops: [
                { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
              ],
              spacing: { after: 0 },
            }),

            // PASAL 10
            new Paragraph({ children: [], spacing: { after: 0 } }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Pasal 10",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "(1)\tApabila terjadi Keadaan Kahar, yang meliputi bencana alam dan bencana sosial, ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " memberitahukan kepada ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK PERTAMA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " dalam waktu paling lambat 7 (tujuh) hari sejak mengetahui atas kejadian Keadaan Kahar dengan menyertakan bukti.",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              indent: {
                left: convertInchesToTwip(0.5),
                hanging: convertInchesToTwip(0.5),
              },
              tabStops: [
                { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
              ],
              spacing: { after: 120 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "(2)\tPada saat terjadi Keadaan Kahar, pelaksanaan pekerjaan oleh ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " dihentikan sementara dan dilanjutkan kembali setelah Keadaan Kahar berakhir, namun apabila akibat Keadaan Kahar tidak memungkinkan dilanjutkan/diselesaikannya pelaksanaan pekerjaan, ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK KEDUA",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " berhak menerima honorarium secara proporsional sesuai pekerjaan yang telah dilaksanakan.",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              indent: {
                left: convertInchesToTwip(0.5),
                hanging: convertInchesToTwip(0.5),
              },
              tabStops: [
                { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
              ],
              spacing: { after: 0 },
            }),

            // PASAL 11
            new Paragraph({ children: [], spacing: { after: 0 } }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Pasal 11",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "Segala sesuatu yang belum atau tidak cukup diatur dalam Perjanjian ini, dituangkan dalam perjanjian tambahan/",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "addendum",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  italics: true,
                }),
                new TextRun({
                  text: " dan merupakan bagian tidak terpisahkan dari perjanjian ini.",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 0 },
            }),

            // PASAL 12
            new Paragraph({ children: [], spacing: { after: 0 } }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Pasal 12",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "(1)\tSegala perselisihan atau perbedaan pendapat yang timbul sebagai akibat adanya Perjanjian ini akan diselesaikan secara musyawarah untuk mufakat.",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              indent: {
                left: convertInchesToTwip(0.5),
                hanging: convertInchesToTwip(0.5),
              },
              tabStops: [
                { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
              ],
              spacing: { after: 120 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "(2)\tApabila perselisihan tidak dapat diselesaikan sebagaimana dimaksud pada ayat (1), ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PARA PIHAK",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " sepakat menyelesaikan perselisihan dengan memilih kedudukan/domisili hukum di Panitera Pengadilan Negeri Kota Malang.",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              indent: {
                left: convertInchesToTwip(0.5),
                hanging: convertInchesToTwip(0.5),
              },
              tabStops: [
                { type: TabStopType.LEFT, position: convertInchesToTwip(0.5) },
              ],
              spacing: { after: 240 },
            }),

            // Penutup
            new Paragraph({
              children: [
                new TextRun({
                  text: "Demikian Perjanjian ini dibuat dan ditandatangani oleh ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PARA PIHAK",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " dalam 2 (dua) rangkap asli bermeterai cukup, tanpa paksaan dari ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PIHAK",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: " manapun dan untuk dilaksanakan oleh ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: "PARA PIHAK",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
                new TextRun({
                  text: ".",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 480 },
            }),

            // Signature Table
            createSignatureTable(mitraData.nama_mitra, namaPejabat),

            // Page Break before Lampiran
            new Paragraph({
              children: [],
              pageBreakBefore: true,
            }),

            // LAMPIRAN
            new Paragraph({
              children: [
                new TextRun({
                  text: "LAMPIRAN",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: false,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "PERJANJIAN KERJA PETUGAS KEGIATAN SURVEI / SENSUS",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: false,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `BULAN ${monthName.toUpperCase()} PADA BADAN PUSAT STATISTIK KOTA BATU`,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: false,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "NOMOR: ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: false,
                }),
                new TextRun({
                  text: nomorSPK,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: false,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            // extra blank line after NOMOR in Lampiran
            new Paragraph({ children: [], spacing: { after: 0 } }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "DAFTAR URAIAN TUGAS, JANGKA WAKTU, TARGET PEKERJAAN DAN NILAI PERJANJIAN",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: false,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),

            // extra blank line after section title in Lampiran
            new Paragraph({ children: [], spacing: { after: 0 } }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "Nama Petugas : ",
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
                new TextRun({
                  text: mitraData.nama_mitra,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.LEFT,
              spacing: { after: 0 },
            }),

            // Task Table
            createTaskTable(tasks, totalHonor, totalHonorText),
          ],
        },
      ],
    });
  } catch (error) {
    throw error;
  }

  return doc;
}

/**
 * Create Para Pihak Table
 */
function createParaPihakTable(
  namaPejabat: string,
  mitraData: { nama_mitra: string; alamat: string; pekerjaan: string },
): Table {
  return new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "1.",
                    font: FONT_NAME,
                    size: FONT_SIZE,
                  }),
                ],
              }),
            ],
            width: { size: 5, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: namaPejabat,
                    font: FONT_NAME,
                    size: FONT_SIZE,
                  }),
                ],
              }),
            ],
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
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
              }),
            ],
            width: { size: 2, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Pejabat Pembuat Komitmen Badan Pusat Statistik Kota Batu, berkedudukan di Jalan Melati No 1 Songgokerto Kota Batu, bertindak untuk dan atas nama Badan Pusat Statistik Kota Batu, selanjutnya disebut sebagai ",
                    font: FONT_NAME,
                    size: FONT_SIZE,
                  }),
                  new TextRun({
                    text: "PIHAK PERTAMA",
                    font: FONT_NAME,
                    size: FONT_SIZE,
                    bold: true,
                  }),
                ],
                alignment: AlignmentType.JUSTIFIED,
              }),
            ],
            width: { size: 68, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "2.",
                    font: FONT_NAME,
                    size: FONT_SIZE,
                  }),
                ],
              }),
            ],
            width: { size: 5, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: mitraData.nama_mitra,
                    font: FONT_NAME,
                    size: FONT_SIZE,
                  }),
                ],
              }),
            ],
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
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
              }),
            ],
            width: { size: 2, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${mitraData.pekerjaan}, berkedudukan di ${mitraData.alamat} bertindak untuk dan atas nama diri sendiri, selanjutnya disebut `,
                    font: FONT_NAME,
                    size: FONT_SIZE,
                  }),
                  new TextRun({
                    text: "PIHAK KEDUA",
                    font: FONT_NAME,
                    size: FONT_SIZE,
                    bold: true,
                  }),
                  new TextRun({
                    text: ".",
                    font: FONT_NAME,
                    size: FONT_SIZE,
                  }),
                ],
                alignment: AlignmentType.JUSTIFIED,
              }),
            ],
            width: { size: 68, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
  });
}

/**
 * Create Signature Table
 */
function createSignatureTable(namaMitra: string, namaPejabat: string): Table {
  return new Table({
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
                spacing: { after: 0 },
              }),
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: namaMitra,
                    font: FONT_NAME,
                    size: FONT_SIZE,
                    bold: true,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
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
                spacing: { after: 0 },
              }),
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: namaPejabat,
                    font: FONT_NAME,
                    size: FONT_SIZE,
                    bold: true,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
  });
}

/**
 * Create Task Table (Lampiran)
 */
function createTaskTable(
  tasks: SPKTask[],
  totalHonor: number,
  totalHonorText: string,
): Table {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  // Header row with vertical merge for columns 1,2,6 and colSpan(3) for middle block
  const headerRow = new TableRow({
    height: { value: 360, rule: HeightRule.ATLEAST },
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Uraian Tugas",
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        verticalAlign: VerticalAlign.CENTER,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
        verticalMerge: VerticalMergeType.RESTART,
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Jangka Waktu",
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        verticalAlign: VerticalAlign.CENTER,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
        verticalMerge: VerticalMergeType.RESTART,
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Target Pekerjaan",
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        columnSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Nilai Perjanjian",
                font: FONT_NAME,
                size: FONT_SIZE,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        verticalAlign: VerticalAlign.CENTER,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
        verticalMerge: VerticalMergeType.RESTART,
      }),
    ],
  });

  // Sub-header row for Target Pekerjaan with continued vertical merge
  const subHeaderRow = new TableRow({
    height: { value: 360, rule: HeightRule.ATLEAST },
    children: [
      new TableCell({
        children: [
          new Paragraph({ children: [], alignment: AlignmentType.CENTER }),
        ],
        verticalMerge: VerticalMergeType.CONTINUE,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
      }),
      new TableCell({
        children: [
          new Paragraph({ children: [], alignment: AlignmentType.CENTER }),
        ],
        verticalMerge: VerticalMergeType.CONTINUE,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
      }),
      createTableHeaderCell("Volume"),
      createTableHeaderCell("Satuan"),
      createTableHeaderCell("Harga Satuan"),
      new TableCell({
        children: [
          new Paragraph({ children: [], alignment: AlignmentType.CENTER }),
        ],
        verticalMerge: VerticalMergeType.CONTINUE,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
      }),
    ],
  });

  // Column number row
  const columnNumberRow = new TableRow({
    children: [
      createTableHeaderCell("(1)"),
      createTableHeaderCell("(2)"),
      createTableHeaderCell("(3)"),
      createTableHeaderCell("(4)"),
      createTableHeaderCell("(4)"),
      createTableHeaderCell("(5)"),
    ],
  });

  // Task rows
  const taskRows = tasks.map((task) => {
    const startDate = new Date(task.start_date);
    const endDate = new Date(task.end_date);
    const jangkaWaktu = `${startDate.getDate()} - ${endDate.getDate()} ${months[endDate.getMonth()]} ${endDate.getFullYear()}`;
    const volume = (task as any).volume || 0;
    const rate = (task as any).rate_per_satuan || 0;
    const satuanName = (task as any).satuan?.nama_satuan || "-";
    const nilai =
      rate && volume ? rate * volume : (task as any).honor_amount || 0;

    return new TableRow({
      height: { value: 380, rule: HeightRule.ATLEAST },
      children: [
        createTableDataCell(task.title, AlignmentType.CENTER),
        createTableDataCell(jangkaWaktu, AlignmentType.CENTER),
        createTableDataCell(
          volume ? String(volume) : "-",
          AlignmentType.CENTER,
        ),
        createTableDataCell(satuanName, AlignmentType.CENTER),
        createTableDataCell(formatRupiah(rate || 0), AlignmentType.CENTER),
        createTableDataCell(formatRupiah(nilai), AlignmentType.CENTER),
      ],
    });
  });

  // Empty rows (for template consistency)
  const emptyRows = [
    new TableRow({
      height: { value: 320, rule: HeightRule.ATLEAST },
      children: [
        createTableDataCell("-", AlignmentType.CENTER),
        createTableDataCell("-", AlignmentType.CENTER),
        createTableDataCell("", AlignmentType.CENTER),
        createTableDataCell("", AlignmentType.CENTER),
        createTableDataCell("Rp -", AlignmentType.CENTER),
        createTableDataCell("Rp -", AlignmentType.CENTER),
      ],
    }),
    new TableRow({
      height: { value: 320, rule: HeightRule.ATLEAST },
      children: [
        createTableDataCell("-", AlignmentType.CENTER),
        createTableDataCell("-", AlignmentType.CENTER),
        createTableDataCell("", AlignmentType.CENTER),
        createTableDataCell("", AlignmentType.CENTER),
        createTableDataCell("Rp -", AlignmentType.CENTER),
        createTableDataCell("Rp -", AlignmentType.CENTER),
      ],
    }),
  ];

  // Total row
  const totalRow = new TableRow({
    height: { value: 360, rule: HeightRule.ATLEAST },
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Terbilang: ",
                font: FONT_NAME,
                size: FONT_SIZE,
                italics: true,
              }),
              new TextRun({
                text: totalHonorText,
                font: FONT_NAME,
                size: FONT_SIZE,
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        columnSpan: 5,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
      }),
      createTableDataCell(formatRupiah(totalHonor), AlignmentType.CENTER),
    ],
  });

  return new Table({
    rows: [
      headerRow,
      subHeaderRow,
      columnNumberRow,
      ...taskRows,
      ...emptyRows,
      totalRow,
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function createTableHeaderCell(
  text: string,
  columnSpan: number = 1,
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: FONT_NAME,
            size: FONT_SIZE,
            bold: false,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
    columnSpan,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 120, bottom: 120, left: 120, right: 120 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
  });
}

function createTableDataCell(
  text: string,
  alignment: any = AlignmentType.CENTER,
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: FONT_NAME,
            size: FONT_SIZE,
          }),
        ],
        alignment,
      }),
    ],
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 120, bottom: 120, left: 120, right: 120 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
  });
}
