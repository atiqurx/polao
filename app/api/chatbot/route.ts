import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Call Gemini API
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a news analysis assistant for Polao, a platform that provides bias analysis for news articles. 
            
Context: ${context || 'general news analysis'}

User question: ${message}

Please provide a helpful response about news bias analysis, trending topics, or general news questions. Keep responses concise but informative. If asked about specific bias analysis, explain the different types of bias (left-leaning, right-leaning, centrist) and how they might affect news reporting.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json();
    const response = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I could not generate a response at this time.';

    return NextResponse.json({ response });

  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    );
  }
}
