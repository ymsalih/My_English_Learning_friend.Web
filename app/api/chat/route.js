import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req) {
  try {
    const { history, message, systemInstruction } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Mesaj boş olamaz.' }, { status: 400 });
    }

    // Kullanıcı talebi üzerine gemini-2.5-flash kullanılıyor.
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction || "Sen nazik ve yardımcı bir yapay zeka asistanısın. Kullanıcı ile İngilizce pratik yapmak için buradasın. Kısa ve doğal cevaplar ver."
    });

    // Sohbet geçmişini başlat (Böylece önceki konuştuklarınızı hatırlar)
    const chat = model.startChat({
      history: history || [],
    });

    // Yeni mesajı gönder ve cevabı bekle
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

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
