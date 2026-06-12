import { NextResponse } from 'next/server';
import Iyzipay from 'iyzipay';

const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY,
  secretKey: process.env.IYZICO_SECRET_KEY,
  uri: 'https://sandbox-api.iyzipay.com'
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { uid, email, displayName, planType = 'monthly' } = body;

    // 1. API ANAHTARLARININ VERİTABANINDAN/VERCEL'DEN GELDİĞİNİ KONTROL ET
    if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY) {
      return NextResponse.json({ 
        error: 'İyzico API şifreleri eksik! Lütfen Vercel panelindeki Environment Variables kısmında IYZICO_API_KEY ve IYZICO_SECRET_KEY anahtarlarının doğru kaydedildiğinden emin olun.' 
      }, { status: 400 });
    }

    if (!uid) {
      return NextResponse.json({ error: 'User UID is required' }, { status: 400 });
    }

    // Gerçek hayatta kullanıcının isim ve soyismini ayırmak gerekir.
    // Şimdilik boşsa "English", "Learner" gibi varsayılan değerler atıyoruz.
    const nameParts = displayName ? displayName.split(' ') : ['English', 'Learner'];
    const name = nameParts[0];
    const surname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Learner';

    const isYearly = planType === 'yearly';
    const price = isYearly ? '925.00' : '100.00';
    const itemName = isYearly ? 'English Learning Premium Pro Yıllık' : 'English Learning Premium Pro Aylık';
    
    // Uygulamanızın base URL'i (Geliştirme ortamında localhost)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const callbackUrl = `${baseUrl}/api/iyzico/callback`;

    const request = {
      locale: Iyzipay.LOCALE.TR,
      // Özel karakterler (| gibi) İyzico sisteminde hataya yol açabilir, alt çizgi kullanıyoruz
      conversationId: `conv_${uid}_${planType}`,
      price: price,
      paidPrice: price,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: `BASKET_${Date.now()}`,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
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
          itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
          price: price
        }
      ]
    };

    return new Promise((resolve) => {
      try {
        iyzipay.checkoutFormInitialize.create(request, function (err, result) {
          if (err) {
            console.error("Iyzico Error:", err);
            resolve(NextResponse.json({ error: 'Ödeme sistemi hatası', details: err }, { status: 500 }));
          } else if (result && result.status === 'success') {
            resolve(NextResponse.json({
              checkoutFormContent: result.checkoutFormContent,
              paymentPageUrl: result.paymentPageUrl,
              token: result.token
            }));
          } else {
            console.error("Iyzico Fail:", result);
            resolve(NextResponse.json({ error: result?.errorMessage || 'Ödeme başlatılamadı' }, { status: 400 }));
          }
        });
      } catch (innerErr) {
        console.error("Iyzico Sync Crash:", innerErr);
        resolve(NextResponse.json({ error: 'İyzico modülü çöktü: ' + innerErr.message }, { status: 500 }));
      }
    });

  } catch (error) {
    console.error("Checkout route error:", error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
