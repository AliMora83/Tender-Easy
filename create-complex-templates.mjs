import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function createTemplates() {
  // SBD 4
  const sbd4 = await PDFDocument.create();
  const page4 = sbd4.addPage([595.28, 841.89]);
  const form4 = sbd4.getForm();
  
  page4.drawText('SBD 4: DECLARATION OF INTEREST (Mock Template)', { x: 50, y: 800, size: 16 });
  page4.drawText('Name of Bidder:', { x: 50, y: 750, size: 12 });
  form4.createTextField('Name_of_Bidder').addToPage(page4, { x: 200, y: 745, width: 300, height: 20 });

  for (let i = 0; i < 3; i++) {
    const yOffset = 700 - (i * 40);
    page4.drawText(`Director ${i+1}:`, { x: 50, y: yOffset, size: 10 });
    form4.createTextField(`Director_Name_${i+1}`).addToPage(page4, { x: 120, y: yOffset - 5, width: 120, height: 15 });
    form4.createTextField(`Director_ID_${i+1}`).addToPage(page4, { x: 250, y: yOffset - 5, width: 120, height: 15 });
    form4.createTextField(`Director_Role_${i+1}`).addToPage(page4, { x: 380, y: yOffset - 5, width: 120, height: 15 });
  }

  const sbd4Bytes = await sbd4.save();
  fs.writeFileSync('public/templates/sbd4.pdf', sbd4Bytes);
  console.log('Created dummy sbd4.pdf');

  // SBD 6.1
  const sbd61 = await PDFDocument.create();
  const page61 = sbd61.addPage([595.28, 841.89]);
  const form61 = sbd61.getForm();
  
  page61.drawText('SBD 6.1: PREFERENCE POINTS CLAIM (Mock Template)', { x: 50, y: 800, size: 16 });
  
  page61.drawText('B-BBEE Status Level:', { x: 50, y: 750, size: 12 });
  form61.createTextField('BB-BEE_Status_Level').addToPage(page61, { x: 250, y: 745, width: 250, height: 20 });
  
  page61.drawText('Black Ownership %:', { x: 50, y: 710, size: 12 });
  form61.createTextField('Black_Ownership').addToPage(page61, { x: 250, y: 705, width: 250, height: 20 });
  
  page61.drawText('Black Women Ownership %:', { x: 50, y: 670, size: 12 });
  form61.createTextField('Black_Women_Ownership').addToPage(page61, { x: 250, y: 665, width: 250, height: 20 });

  const sbd61Bytes = await sbd61.save();
  fs.writeFileSync('public/templates/sbd61.pdf', sbd61Bytes);
  console.log('Created dummy sbd61.pdf');
}

createTemplates();
