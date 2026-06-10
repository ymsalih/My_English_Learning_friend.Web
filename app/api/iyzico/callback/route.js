import { NextResponse } from 'next/server';
import Iyzipay from 'iyzipay';
import { adminDb } from '../../../../lib/firebase-admin';

const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY,
  secretKey: process.env.IYZICO_SECRET_KEY,
  uri: 'https://sandbox-api.iyzipay.com'
});

export async function POST(req) {
  try {
    // Iyzico POST isteğini Form Data (application/x-www-form-urlencoded) olarak gönderir
    const formData = await req.formData();
    const token = formData.get('token');
    
    // URL parametresi yerine conversationId'yi bekliyoruz
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    if (!token) {
      console.error("Eksik token", { token });
      return NextResponse.redirect(`${baseUrl}/pricing?error=missing_data`, 302);
    }

    // Token ile İyzico'dan ödemenin gerçekten başarılı olup olmadığını sorguluyoruz
    return new Promise((resolve, reject) => {
      iyzipay.checkoutForm.retrieve({ token: token }, async function (err, result) {
        if (err) {
          console.error("Iyzico Retrieve Error:", err);
          resolve(NextResponse.redirect(`${baseUrl}/pricing?error=verification_failed`, 302));
        } else if (result.paymentStatus === 'SUCCESS') {
          // Ödeme Başarılı!
          try {
            // conversationId'ye sakladığımız veriyi çözüyoruz (conv_uid_planType)
            const conversationId = result.conversationId || '';
            const parts = conversationId.split('_');
            
            // parts[0] = 'conv', parts[1] = uid, parts[2] = planType
            const uid = parts[1];
            const planType = parts[2] || 'monthly';

            if (!uid) {
              console.error("No UID found in conversationId!");
              resolve(NextResponse.redirect(`${baseUrl}/pricing?error=missing_uid`, 302));
              return;
            }

            const now = new Date();
            const expiryDays = planType === 'yearly' ? 365 : 30;
            const expiryDate = new Date(now.getTime() + (expiryDays * 24 * 60 * 60 * 1000));

            await adminDb.collection('users').doc(uid).update({
              plan: `pro_${planType}`,
              isPro: true,
              paymentDate: now.toISOString(),
              expiryDate: expiryDate.toISOString(),
              iyzicoToken: token,
              paymentId: result.paymentId
            });
            
            console.log(`User ${uid} successfully upgraded to PRO (${planType}) until ${expiryDate.toISOString()}`);
            // Başarılı sayfasına yönlendir
            resolve(NextResponse.redirect(`${baseUrl}/payment-success`, 302));
          } catch (dbError) {
            console.error("Firebase update error:", dbError);
            resolve(NextResponse.redirect(`${baseUrl}/pricing?error=database_error`, 302));
          }
        } else {
          // Ödeme Reddedildi (Bakiye yetersiz, kart hatalı vs.)
          console.error("Payment not successful:", result);
          resolve(NextResponse.redirect(`${baseUrl}/pricing?error=${result.errorMessage || 'payment_declined'}`, 302));
        }
      });
    });

  } catch (error) {
    console.error("Callback route error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/pricing?error=server_error`, 302);
  }
}
