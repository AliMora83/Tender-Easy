import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60; // Allow more time for Gemini processing

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Server configuration error: GEMINI_API_KEY is not set' }, { status: 500 });
    }

    // Convert the File object directly to base64 for Gemini
    const arrayBuffer = await file.arrayBuffer();
    const base64Pdf = Buffer.from(arrayBuffer).toString('base64');

    // In the future, we can swap this model with Hermes/OpenClaw local LLM!
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
          mimeType: file.type || 'application/pdf'
        }
      }
    ]);

    const text = result.response.text();
    const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Error in public analyzer:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
