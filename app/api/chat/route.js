import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req) {
  try {
    const { history, message, systemInstruction } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Mesaj boş olamaz.' }, { status: 400 });
    }

    // Kullanıcının gramer hatalarını tespit etmesi için JSON şeması zorunluluğu
    const jsonInstruction = `
${systemInstruction || "Sen nazik ve yardımcı bir yapay zeka asistanısın. Kullanıcı ile İngilizce pratik yapmak için buradasın."}
ÖNEMLİ KURAL: Cevabını HER ZAMAN geçerli bir JSON objesi olarak vermelisin. Format şu şekilde olmalı:
{
  "reply": "Buraya kullanıcıya vereceğin İngilizce cevabı yaz",
  "correction": {
    "hasError": true/false, // Kullanıcının SON mesajında İngilizce gramer/yazım hatası var mı?
    "original": "Kullanıcının hatalı yazdığı orijinal metin (eğer hata yoksa boş bırak)",
    "corrected": "Doğrusunun nasıl olması gerektiği (eğer hata yoksa boş bırak)",
    "explanation": "Neden hatalı olduğuna dair Türkçe, çok kısa ve nazik bir açıklama (eğer hata yoksa boş bırak)"
  }
}`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: jsonInstruction,
      generationConfig: { responseMimeType: "application/json" }
    });

    // Sohbet geçmişini başlat (Böylece önceki konuştuklarınızı hatırlar)
    // Eğer history string ise parse etmemiz gerekmez çünkü JSON stringleri modelin kendisi anlar
    const chat = model.startChat({
      history: history || [],
    });

    // Yeni mesajı gönder ve cevabı bekle
    const result = await chat.sendMessage(message);
    const responseText = result.response.text(); // Bu artık JSON formatında bir string dönecek

    return NextResponse.json({ reply: responseText });
  } catch (error) {
    console.error("AI API Error:", error);
    
    // Google sunucularının yoğun olduğu durum (503)
    if (error.message?.includes('503') || error.status === 503) {
      return NextResponse.json({ error: 'Google Yapay Zeka sunucuları şu an çok yoğun. Lütfen 10-15 saniye bekleyip tekrar deneyin.' }, { status: 503 });
    }

    // Sistemin genel kotasının dolduğu durum (429)
    if (error.message?.includes('429') || error.status === 429) {
      return NextResponse.json({ error: 'Sistemin günlük yapay zeka kapasitesi doldu. Lütfen daha sonra tekrar deneyin.' }, { status: 429 });
    }
    
    return NextResponse.json({ error: 'Yapay zeka sunucusuna bağlanılamadı. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
