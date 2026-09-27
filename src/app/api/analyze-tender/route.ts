import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60; // Allow more time for Gemini processing

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { downloadUrl } = await request.json();

    if (!downloadUrl) {
      return NextResponse.json({ error: 'Missing downloadUrl' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing from environment variables!");
      return NextResponse.json({ error: 'Server configuration error: GEMINI_API_KEY is not set in .env.local' }, { status: 500 });
    }
    
    console.log("GEMINI_API_KEY is configured correctly. Proceeding with analysis...");

    // Download the PDF from the provided Firebase Storage URL
    const pdfResponse = await fetch(downloadUrl);
    if (!pdfResponse.ok) {
      throw new Error('Failed to download the PDF from Firebase Storage.');
    }
    
    const arrayBuffer = await pdfResponse.arrayBuffer();
    const base64Pdf = Buffer.from(arrayBuffer).toString('base64');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are an expert South African tender analyst.
Carefully read the provided Request for Tender (RFT) PDF document and extract the following information.

Output EXACTLY in the following JSON format, with no markdown code blocks and no surrounding text:
{
  "metadata": {
    "tenderNumber": "Extracted tender number or null",
    "issuingEntity": "Extracted issuing entity/department or null",
    "closingDate": "Extracted closing date/time or null",
    "evaluationBasis": "Extracted evaluation basis (e.g., 80/20, 90/10) or null"
  },
  "mandatoryReturnables": [
    {
      "item": "e.g., SBD 1, SBD 4, CSD Report, Tax Clearance Certificate, B-BBEE Certificate",
      "description": "Brief description of the requirement based on the document"
    }
  ]
}
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Pdf,
          mimeType: 'application/pdf'
        }
      }
    ]);

    const text = result.response.text();
    // Clean up potential markdown formatting from the response
    const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Error analyzing tender:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
