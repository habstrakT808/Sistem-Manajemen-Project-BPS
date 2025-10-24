// Unused imports removed - fs and path not needed in this generator

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

export async function generateSKDocumentWithTemplate(
  skData: SKData,
): Promise<Buffer> {
  try {
    // For now, use a simpler approach - generate DOCX with logo using original docx library
    // but with a different method that doesn't cause document corruption
    console.log("Using simplified docxtemplater approach...");

    // Import the original document generator
    const { generateSKDocument } = await import("./documentGenerator");

    // Generate the document using the original approach
    const doc = await generateSKDocument(skData);

    // Convert to buffer
    const { Packer } = await import("docx");
    const buffer = Packer.toBuffer(doc);

    return buffer;
  } catch (error) {
    console.error("Error generating document with template:", error);
    throw new Error("Failed to generate document with template");
  }
}
