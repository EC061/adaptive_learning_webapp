import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required and must be an array' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const serviceTier = process.env.OPENAI_SERVICE_TIER || 'default';

    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json({ error: 'OpenAI integration is currently unavailable' }, { status: 503 });
    }

    const payload: any = {
      model,
      messages,
      temperature: 0.7,
    };
    
    // According to OpenAI documentation, service_tier can be 'auto' or 'default'
    if (serviceTier && serviceTier !== 'default') {
      payload.service_tier = serviceTier;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI Error:', errorData);
      return NextResponse.json({ error: 'Failed to communicate with OpenAI' }, { status: response.status });
    }

    const data = await response.json();
    const botMessage = data.choices[0]?.message;

    return NextResponse.json({ message: botMessage });
  } catch (error) {
    console.error('Error handling chat request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
