import { NextResponse } from 'next/server';
import { checkoutFormInitialize } from '../../../../lib/iyzico-client';
import { adminDb } from '../../../../lib/firebase-admin';

export async function POST(req) {
  try {
    const body = await req.json();
    const { uid, email, displayName, planType = 'monthly' } = body;

    // 1. API anahtarlarını kontrol et
    const apiKey = process.env.IYZICO_API_KEY;
    const secretKey = process.env.IYZICO_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json({ 
        error: 'İyzico API şifreleri eksik! Lütfen Vercel panelindeki Environment Variables kısmında IYZICO_API_KEY ve IYZICO_SECRET_KEY anahtarlarının doğru kaydedildiğinden emin olun.' 
      }, { status: 400 });
    }

    if (!uid) {
      return NextResponse.json({ error: 'User UID is required' }, { status: 400 });
    }

    const isYearly = planType === 'yearly';
    const price = isYearly ? '925.00' : '100.00';
    const itemName = isYearly ? 'English Learning Premium Pro Yıllık' : 'English Learning Premium Pro Aylık';
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/iyzico/callback`;

    const request = {
      locale: 'tr',
      conversationId: `conv_${uid}_${planType}`,
      price: price,
      paidPrice: price,
      currency: 'TRY',
      basketId: `BASKET_${Date.now()}`,
      paymentGroup: 'PRODUCT',
      callbackUrl: callbackUrl,
      buyer: {
        id: uid,
        name: 'John',
        surname: 'Doe',
        gsmNumber: '+905555555555',
        email: email || 'user@example.com',
        identityNumber: '11111111111',
        lastLoginDate: '2023-10-01 12:00:00',
        registrationDate: '2023-10-01 12:00:00',
        registrationAddress: 'Nidakule Göztepe, Merdivenköy Mah.',
        ip: '85.34.78.112',
        city: 'Istanbul',
        country: 'Turkey',
        zipCode: '34732'
      },
      shippingAddress: {
        contactName: 'John Doe',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Nidakule Göztepe, Merdivenköy Mah.',
        zipCode: '34732'
      },
      billingAddress: {
        contactName: 'John Doe',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Nidakule Göztepe, Merdivenköy Mah.',
        zipCode: '34732'
      },
      basketItems: [
        {
          id: `ITEM_PREMIUM_${planType.toUpperCase()}`,
          name: itemName,
          category1: 'Education',
          category2: 'Digital Service',
          itemType: 'VIRTUAL',
          price: price
        }
      ]
    };

    const result = await checkoutFormInitialize(apiKey, secretKey, request);

    if (result && result.status === 'success') {
      // Token'ı Firebase'e kaydet — callback'te uid'yi buradan çekeceğiz
      // Bu sayede conversationId'ye bağımlı olmayız
      await adminDb.collection('pending_payments').doc(result.token).set({
        uid: uid,
        planType: planType,
        email: email || '',
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        checkoutFormContent: result.checkoutFormContent,
        paymentPageUrl: result.paymentPageUrl,
        token: result.token
      });
    } else {
      console.error("Iyzico Fail:", result);
      return NextResponse.json({ 
        error: result?.errorMessage || 'Ödeme başlatılamadı' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Checkout route error:", error);
    return NextResponse.json({ error: 'Sunucu hatası: ' + error.message }, { status: 500 });
  }
}
