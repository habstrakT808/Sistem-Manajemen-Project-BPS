import {
  Document,
  Paragraph,
  TextRun,
  Footer,
  AlignmentType,
  PageNumber,
  convertInchesToTwip,
} from "docx";
import { generateSPKDocument } from "./spkGenerator";

const FONT_NAME = "Bookman Old Style";
const FONT_SIZE = 18;

interface SPKTaskData {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  honor_amount: number;
  satuan_id?: string;
  rate_per_satuan?: number;
  volume?: number;
  satuan?: { nama_satuan: string };
  project_id: string;
  project_name?: string;
}

interface SPKMitraData {
  id: string;
  nama_mitra: string;
  alamat: string;
  pekerjaan: string;
}

interface MultiSPKData {
  nomorSPK: string; // Base nomor SPK
  month: string;
  year: string;
  tanggalPenandatanganan: string;
  namaPejabat: string;
  mitraTasks: Array<{
    mitra: SPKMitraData;
    tasks: SPKTaskData[];
  }>;
}

/**
 * Generate multi-SPK document (1 SPK per mitra per bulan) with page breaks
 * Each SPK contains all tasks for that mitra in the selected month
 */
export async function generateMultiSPKDocument(
  data: MultiSPKData,
): Promise<Document> {
  if (data.mitraTasks.length === 0) {
    throw new Error("No mitra tasks provided");
  }

  // Build sections data first (before creating Documents)
  // This approach is similar to BAST generator multi
  const allSections: any[] = [];
  let mitraIndex = 0;
  let firstDocStyles: any = null;

  for (const mitraTask of data.mitraTasks) {
    const { mitra, tasks } = mitraTask;
    mitraIndex++;

    // Generate nomor SPK dengan suffix per mitra (jika lebih dari 1 mitra)
    const nomorSPK =
      mitraIndex > 1
        ? `${data.nomorSPK}-${String(mitraIndex).padStart(3, "0")}`
        : data.nomorSPK;

    // Use projectId from first task (all tasks should be from same project for same mitra in same month)
    // If tasks have different project_id, we'll use the first one
    const projectId = tasks[0]?.project_id;
    if (!projectId) {
      throw new Error(`No project ID found for mitra ${mitra.nama_mitra}`);
    }

    // Prepare SPK data with all tasks for this mitra
    const spkData = {
      nomorSPK,
      projectId,
      month: data.month,
      year: data.year,
      mitraId: mitra.id,
      tanggalPenandatanganan: data.tanggalPenandatanganan,
      namaPejabat: data.namaPejabat,
      mitraData: {
        nama_mitra: mitra.nama_mitra,
        alamat: mitra.alamat,
        pekerjaan: mitra.pekerjaan,
      },
      tasks: tasks.map((task) => ({
        title: task.title,
        start_date: task.start_date,
        end_date: task.end_date,
        honor_amount: task.honor_amount || 0,
        volume: task.volume,
        rate_per_satuan: task.rate_per_satuan,
        satuan: task.satuan,
      })),
    };

    // Generate SPK document with all tasks for this mitra
    try {
      const spkDoc = await generateSPKDocument(spkData);

      // Save styles from first document
      if (mitraIndex === 1) {
        firstDocStyles = (spkDoc as any).styles;
      }

      // Access the section from the document's internal structure
      // The docx library stores sections in documentWrapper.document.root[1] (Body)
      const docAny = spkDoc as any;
      const documentRoot = docAny.documentWrapper?.document?.root;

      // Find the Body element in the root array
      let bodyElement: any = null;
      if (Array.isArray(documentRoot)) {
        bodyElement = documentRoot.find(
          (item: any) => item && item.rootKey === "w:body",
        );
      }

      // Access sections from body.sections (internal array)
      // The sections array contains section objects, but children are in body.root
      let bodySections = bodyElement?.sections;
      const bodyRoot = bodyElement?.root;

      // If sections is not accessible, we need to rebuild from the original data
      if (!bodySections) {
        throw new Error(
          "Cannot extract sections from document. Need to refactor generateSPKDocument to return section data.",
        );
      }

      // Get the first section (SPK documents have 1 section)
      const section = Array.isArray(bodySections)
        ? bodySections[0]
        : bodySections;

      if (!section) {
        throw new Error("No section found in SPK document");
      }

      // Children are stored in body.root array, not section.children
      // Extract children from body.root
      let children: any[] = [];
      if (Array.isArray(bodyRoot)) {
        // body.root contains the actual children (Paragraphs, Tables, etc.)
        // Try to get children - they should be Paragraph or Table instances
        // or objects with rootKey "w:p" or "w:tbl"
        children = bodyRoot.filter((item: any) => {
          if (!item) return false;

          // Check if it's a Paragraph or Table instance
          const isInstance =
            item.constructor?.name === "Paragraph" ||
            item.constructor?.name === "Table";

          // Check if it has rootKey (internal structure)
          const hasRootKey = item.rootKey === "w:p" || item.rootKey === "w:tbl";

          // Check if it has children property (might be a paragraph/table)
          const hasChildren = Array.isArray(item.children);

          // Check if it's a valid content element
          return (
            isInstance ||
            hasRootKey ||
            (hasChildren && item.children.length > 0)
          );
        });

        // If no children found, try taking all items except the first one (which might be metadata)
        if (children.length === 0 && bodyRoot.length > 1) {
          children = bodyRoot.slice(1);
        }
      } else {
        // Fallback: try section.children if available
        children = section.children || [];
      }

      // Get section properties and footers from the original section
      const sectionProperties = section.properties || {
        page: {
          margin: {
            top: convertInchesToTwip(0.3937),
            right: convertInchesToTwip(0.7874),
            bottom: convertInchesToTwip(0.9843),
            left: convertInchesToTwip(0.7874),
          },
          size: {
            width: convertInchesToTwip(8.27),
            height: convertInchesToTwip(11.69),
          },
        },
      };

      const sectionFooters = section.footers || {
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
      };

      // Create section object with properties and children
      // Add page break before each SPK except the first one
      const sectionData = {
        footers: sectionFooters,
        properties: sectionProperties,
        children:
          mitraIndex > 1
            ? [
                new Paragraph({
                  children: [
                    new TextRun({ text: "", font: FONT_NAME, size: FONT_SIZE }),
                  ],
                  pageBreakBefore: true,
                }),
                ...children,
              ]
            : children,
      };

      allSections.push(sectionData);
    } catch (error) {
      throw error;
    }
  }

  // Combine all sections into one document
  if (allSections.length === 0) {
    throw new Error("No sections generated");
  }

  // Create combined document with first document's styles
  const combinedDoc = new Document({
    styles: firstDocStyles || {},
    sections: allSections,
  });

  return combinedDoc;
}
