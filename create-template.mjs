import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function createDummyTemplate() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  
  const form = pdfDoc.getForm();
  
  page.drawText('SBD 1: INVITATION TO BID (Mock Template)', { x: 50, y: 800, size: 20 });

  page.drawText('Name of Bidder:', { x: 50, y: 750, size: 12 });
  const nameField = form.createTextField('Name_of_Bidder');
  nameField.addToPage(page, { x: 200, y: 745, width: 300, height: 20 });

  page.drawText('CSD Number:', { x: 50, y: 710, size: 12 });
  const csdField = form.createTextField('CSD_No');
  csdField.addToPage(page, { x: 200, y: 705, width: 300, height: 20 });

  page.drawText('Tax Reference Number:', { x: 50, y: 670, size: 12 });
  const taxField = form.createTextField('Tax_Reference_No');
  taxField.addToPage(page, { x: 200, y: 665, width: 300, height: 20 });

  page.drawText('TCS PIN:', { x: 50, y: 630, size: 12 });
  const pinField = form.createTextField('TCS_Pin');
  pinField.addToPage(page, { x: 200, y: 625, width: 300, height: 20 });

  page.drawText('B-BBEE Status Level:', { x: 50, y: 590, size: 12 });
  const bbbeeField = form.createTextField('BB-BEE_Status_Level');
  bbbeeField.addToPage(page, { x: 200, y: 585, width: 300, height: 20 });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('public/templates/sbd1.pdf', pdfBytes);
  console.log('Created dummy sbd1.pdf');
}

createDummyTemplate();
