import { NextResponse } from 'next/server';
import { checkoutFormRetrieve } from '../../../../lib/iyzico-client';
import { adminDb } from '../../../../lib/firebase-admin';

export async function POST(req) {
  try {
    // Iyzico POST isteğini Form Data (application/x-www-form-urlencoded) olarak gönderir
    const formData = await req.formData();
    const token = formData.get('token');
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const apiKey = process.env.IYZICO_API_KEY;
    const secretKey = process.env.IYZICO_SECRET_KEY;

    if (!token) {
      console.error("Eksik token");
      return NextResponse.redirect(`${baseUrl}/pricing?error=missing_token`, 302);
    }

    if (!apiKey || !secretKey) {
      console.error("Missing Iyzico credentials in callback");
      return NextResponse.redirect(`${baseUrl}/pricing?error=config_error`, 302);
    }

    // 1. Firebase'den bu token'a ait bekleyen ödeme bilgisini çek
    const pendingDoc = await adminDb.collection('pending_payments').doc(token).get();
    
    if (!pendingDoc.exists) {
      console.error("No pending payment found for token:", token);
      return NextResponse.redirect(`${baseUrl}/pricing?error=invalid_token`, 302);
    }

    const pendingData = pendingDoc.data();
    const uid = pendingData.uid;
    const planType = pendingData.planType || 'monthly';

    if (!uid) {
      console.error("No UID in pending payment record");
      return NextResponse.redirect(`${baseUrl}/pricing?error=missing_uid`, 302);
    }

    // 2. Token ile İyzico'dan ödemenin gerçekten başarılı olup olmadığını sorgula
    const result = await checkoutFormRetrieve(apiKey, secretKey, token);

    if (result.paymentStatus === 'SUCCESS') {
      // Ödeme Başarılı!
      try {
        const now = new Date();
        const expiryDays = planType === 'yearly' ? 365 : 30;
        const expiryDate = new Date(now.getTime() + (expiryDays * 24 * 60 * 60 * 1000));

        await adminDb.collection('users').doc(uid).update({
          plan: `pro_${planType}`,
          isPro: true,
          paymentDate: now.toISOString(),
          expiryDate: expiryDate.toISOString(),
          iyzicoToken: token,
          paymentId: result.paymentId || ''
        });
        
        // Bekleyen ödeme kaydını sil (temizlik)
        await adminDb.collection('pending_payments').doc(token).delete();
        
        console.log(`User ${uid} successfully upgraded to PRO (${planType}) until ${expiryDate.toISOString()}`);
        // Başarılı sayfasına yönlendir
        return NextResponse.redirect(`${baseUrl}/payment-success`, 302);
      } catch (dbError) {
        console.error("Firebase update error:", dbError);
        return NextResponse.redirect(`${baseUrl}/pricing?error=database_error`, 302);
      }
    } else {
      // Ödeme Reddedildi
      console.error("Payment not successful:", result);
      // Bekleyen ödeme kaydını sil
      await adminDb.collection('pending_payments').doc(token).delete();
      return NextResponse.redirect(`${baseUrl}/pricing?error=${result.errorMessage || 'payment_declined'}`, 302);
    }

  } catch (error) {
    console.error("Callback route error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/pricing?error=server_error`, 302);
  }
}
