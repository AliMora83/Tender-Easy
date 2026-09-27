import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';

// You will set this in your .env.local and Docker environment
const CRON_SECRET = process.env.CRON_SECRET || 'fallback-secret-for-dev';

export async function POST(request: Request) {
  try {
    // 1. Secure the route
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Setup Nodemailer (Fallback to Ethereal Email for local testing if no SMTP provided)
    let transporter;
    let testAccountUrl = '';
    
    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    } else {
      console.log("No SMTP_HOST found in .env, generating a test Ethereal account...");
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    }

    // 3. Fetch all users from Firestore using Admin SDK
    const usersSnapshot = await adminDb.collection('users').get();
    let emailsSent = 0;
    const now = new Date();
    
    // We run weekly, so we warn if something expires in the next 35 days
    const warningThresholdDays = 35;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      let email = userData.email;
      if (!email) {
        try {
          const userRecord = await adminAuth.getUser(doc.id);
          email = userRecord.email;
        } catch (e) {
          console.error(`Could not fetch auth user for ${doc.id}`);
        }
      }
      
      if (!email) continue;

      const expiringItems: string[] = [];
      const expiredItems: string[] = [];

      const checkExpiry = (dateString: string | undefined, name: string) => {
        if (!dateString) return;
        const expiryDate = new Date(dateString);
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          expiredItems.push(`${name} (Expired ${Math.abs(diffDays)} days ago)`);
        } else if (diffDays <= warningThresholdDays) {
          expiringItems.push(`${name} (Expires in ${diffDays} days)`);
        }
      };

      checkExpiry(userData.pinExpiry, 'SARS Tax Clearance');
      checkExpiry(userData.bbbeeExpiryDate, 'B-BBEE Certificate');
      checkExpiry(userData.coidaExpiryDate, 'COIDA Letter of Good Standing');

      // 4. Send email if there are items needing attention
      if (expiringItems.length > 0 || expiredItems.length > 0) {
        
        let htmlContent = `<h2>Tender Easy Compliance Alert</h2>`;
        htmlContent += `<p>Hello,</p><p>This is your weekly automated compliance scan. Action is required for the following documents:</p>`;
        
        if (expiredItems.length > 0) {
          htmlContent += `<h3>🔴 Expired Documents (Urgent Action Required)</h3><ul>`;
          expiredItems.forEach(item => htmlContent += `<li>${item}</li>`);
          htmlContent += `</ul>`;
        }

        if (expiringItems.length > 0) {
          htmlContent += `<h3>⚠️ Expiring Soon</h3><ul>`;
          expiringItems.forEach(item => htmlContent += `<li>${item}</li>`);
          htmlContent += `</ul>`;
        }

        htmlContent += `<br><p>Please log in to your Tender Easy dashboard to update these files.</p>`;

        try {
          const info = await transporter.sendMail({
            from: process.env.SMTP_USER ? `"Tender Easy Alerts" <${process.env.SMTP_USER}>` : '"Tender Easy Test" <test@ethereal.email>',
            to: email,
            subject: 'Compliance Alert: Action Required for Upcoming Expirations',
            html: htmlContent,
          });
          
          if (!process.env.SMTP_HOST) {
            console.log(`Test email sent to ${email}. Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
          }
          
          emailsSent++;
        } catch (emailErr) {
          console.error(`Failed to send email to ${email}:`, emailErr);
        }
      }
    }

    return NextResponse.json({ success: true, emailsSent, message: `Scan complete. Sent ${emailsSent} alerts.` });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
