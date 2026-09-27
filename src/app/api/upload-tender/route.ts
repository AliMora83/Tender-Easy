import { NextResponse } from 'next/server';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tenderId = formData.get('tenderId') as string;

    if (!file || !tenderId) {
      return NextResponse.json({ error: 'Missing file or tenderId' }, { status: 400 });
    }

    // Reference to Firebase Storage using the default app instance
    const storageRef = ref(storage, `tenders/${tenderId}/rft.pdf`);
    
    // Upload directly from the server to bypass client CORS issues
    // Using the File object directly avoids Node.js Buffer hangs with the Firebase Client SDK
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'application/pdf',
    });

    // Get the public download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return NextResponse.json({ success: true, downloadUrl });
  } catch (error: any) {
    console.error("Upload error details:", error);
    return NextResponse.json({ error: error.message || 'Failed to upload to Firebase Storage.' }, { status: 500 });
  }
}
