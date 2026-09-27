import { PDFDocument } from 'pdf-lib';

export async function generateSbd61Pdf(profileData: any): Promise<Uint8Array> {
  const url = '/templates/sbd61.pdf';
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  try {
    if (profileData.bbbeeLevel) form.getTextField('BB-BEE_Status_Level').setText(profileData.bbbeeLevel);
    if (profileData.blackOwnership) form.getTextField('Black_Ownership').setText(profileData.blackOwnership.toString());
    if (profileData.blackWomenOwnership) form.getTextField('Black_Women_Ownership').setText(profileData.blackWomenOwnership.toString());
  } catch (err) {
    console.warn("Some fields were not found in the SBD 6.1 template:", err);
  }

  return await pdfDoc.save();
}
