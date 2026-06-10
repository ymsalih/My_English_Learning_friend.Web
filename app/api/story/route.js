import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { words } = await req.json();

    if (!words || words.length === 0) {
      return NextResponse.json({ error: 'Kelimeler eksik.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: "You are a creative English teacher. Write a very short, engaging, and easy-to-understand story (A2/B1 level) using ALL of the provided words. The story should be maximum 3 paragraphs. Make it fun. ONLY output the story in English, do not add any conversational filler."
    });

    const prompt = `Please write a story using these exact words: ${words.join(', ')}`;
    // Create streaming response
    const result = await model.generateContentStream(prompt);
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            controller.enqueue(new TextEncoder().encode(chunkText));
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error("Story API Error:", error);
    
    if (error.message?.includes('503') || error.status === 503) {
      return new Response('Google Yapay Zeka sunucuları şu an çok yoğun. Lütfen 10-15 saniye bekleyip tekrar deneyin.', { status: 503 });
    }
    if (error.message?.includes('429') || error.status === 429) {
      return new Response('Sistemin günlük yapay zeka kapasitesi doldu. Lütfen daha sonra tekrar deneyin.', { status: 429 });
    }
    
    return new Response('Hikaye üretilirken bir hata oluştu.', { status: 500 });
  }
}
