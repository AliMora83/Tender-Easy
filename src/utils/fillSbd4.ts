import { PDFDocument } from 'pdf-lib';

export async function generateSbd4Pdf(profileData: any): Promise<Uint8Array> {
  const url = '/templates/sbd4.pdf';
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  try {
    if (profileData.legalName) {
      form.getTextField('Name_of_Bidder').setText(profileData.legalName);
    }
    
    // Map directors (limit to first 3 for this standard template)
    if (profileData.directors && Array.isArray(profileData.directors)) {
      profileData.directors.slice(0, 3).forEach((director: any, index: number) => {
        const idx = index + 1;
        if (director.name) form.getTextField(`Director_Name_${idx}`).setText(director.name);
        if (director.idNumber) form.getTextField(`Director_ID_${idx}`).setText(director.idNumber);
        if (director.role) form.getTextField(`Director_Role_${idx}`).setText(director.role);
      });
    }
  } catch (err) {
    console.warn("Some fields were not found in the SBD 4 template:", err);
  }

  return await pdfDoc.save();
}
