import { NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const uid = url.searchParams.get('uid');
    const planType = url.searchParams.get('type') || 'monthly';

    if (!uid) {
      return NextResponse.json({ error: 'Missing UID' }, { status: 400 });
    }

    const now = new Date();
    const expiryDays = planType === 'yearly' ? 365 : 30;
    const expiryDate = new Date(now.getTime() + (expiryDays * 24 * 60 * 60 * 1000));

    await adminDb.collection('users').doc(uid).update({
      plan: `pro_${planType}`,
      isPro: true,
      paymentDate: now.toISOString(),
      expiryDate: expiryDate.toISOString(),
      iyzicoToken: 'DEBUG_BYPASS_TOKEN',
      paymentId: 'DEBUG_PAYMENT_ID'
    });

    return NextResponse.json({ success: true, message: `Kullanıcı (${uid}) başarıyla ${planType} Premium yapıldı!` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
