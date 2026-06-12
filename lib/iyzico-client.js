/**
 * Özel İyzico REST API İstemcisi
 * 
 * iyzipay npm paketinin yerine geçer.
 * Sadece Node.js yerleşik 'crypto' modülünü ve global 'fetch' API'sini kullanır.
 * fs.readdirSync, dinamik require() KULLANMAZ — Vercel serverless'ta %100 çalışır.
 */
import crypto from 'crypto';

const IYZICO_BASE_URI = 'https://sandbox-api.iyzipay.com';

function generateRandomString() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 10);
}

function generateAuthorizationHeader(apiKey, secretKey, uri, body, randomString) {
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(randomString + uri + JSON.stringify(body))
    .digest('hex');

  const authorizationParams = [
    'apiKey:' + apiKey,
    'randomKey:' + randomString,
    'signature:' + signature
  ];

  return 'IYZWSv2 ' + Buffer.from(authorizationParams.join('&')).toString('base64');
}

async function iyzicoRequest(apiKey, secretKey, path, body) {
  const randomString = generateRandomString();
  const authorization = generateAuthorizationHeader(apiKey, secretKey, path, body, randomString);

  const response = await fetch(IYZICO_BASE_URI + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authorization,
      'x-iyzi-rnd': randomString,
      'x-iyzi-client-version': 'iyzipay-node-2.0.67',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return data;
}

/**
 * Checkout Form başlatma (ödeme sayfası oluşturma)
 */
export async function checkoutFormInitialize(apiKey, secretKey, requestBody) {
  const path = '/payment/iyzipos/checkoutform/initialize/auth/ecom';
  return iyzicoRequest(apiKey, secretKey, path, requestBody);
}

/**
 * Checkout Form sonucunu sorgulama (ödeme doğrulama)
 */
export async function checkoutFormRetrieve(apiKey, secretKey, token) {
  const path = '/payment/iyzipos/checkoutform/auth/ecom/detail';
  return iyzicoRequest(apiKey, secretKey, path, { token });
}
