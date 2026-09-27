import { PDFDocument } from 'pdf-lib';

export async function generateSbd1Pdf(profileData: any): Promise<Uint8Array> {
  // 1. Fetch the blank template
  // In a real browser environment, we can fetch from the public folder
  const url = '/templates/sbd1.pdf';
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

  // 2. Load a PDFDocument from the existing PDF bytes
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // 3. Get the form containing all the fields
  const form = pdfDoc.getForm();

  // 4. Map the profile data to the form fields
  // Note: These field names must exactly match the names in your actual SBD 1 PDF.
  try {
    if (profileData.legalName) form.getTextField('Name_of_Bidder').setText(profileData.legalName);
    if (profileData.csdNumber) form.getTextField('CSD_No').setText(profileData.csdNumber);
    if (profileData.sarsTaxNumber) form.getTextField('Tax_Reference_No').setText(profileData.sarsTaxNumber);
    if (profileData.tcsPin) form.getTextField('TCS_Pin').setText(profileData.tcsPin);
    if (profileData.bbbeeLevel) form.getTextField('BB-BEE_Status_Level').setText(profileData.bbbeeLevel);
  } catch (err) {
    console.warn("Some fields were not found in the PDF template:", err);
  }

  // Optional: Flatten the form to prevent further editing
  // form.flatten();

  // 5. Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
