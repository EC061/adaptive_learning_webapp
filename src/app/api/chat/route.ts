import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required and must be an array' }, { status: 400 });
    }

    const rawApiKey = process.env.OPENAI_API_KEY || '';
    const apiKey = rawApiKey.replace(/^["']|["']$/g, '').trim();

    const rawModel = process.env.OPENAI_MODEL || 'gpt-5.4';
    const model = rawModel.replace(/^["']|["']$/g, '').trim();

    const rawServiceTier = process.env.OPENAI_SERVICE_TIER || 'flex';
    const serviceTier = rawServiceTier.replace(/^["']|["']$/g, '').trim();

    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json({ error: 'OpenAI integration is currently unavailable' }, { status: 503 });
    }

    console.log(`[DEBUG] Using OpenAI API Key starting with: ${apiKey.substring(0, 15)}... length=${apiKey.length}`);
    console.log(`[DEBUG] Model: ${model}, ServiceTier: ${serviceTier}`);

    const payload: any = {
      model,
      messages,
      temperature: 0.7,
      stream: true,
      stream_options: { include_usage: true },
    };

    // Pass service_tier if it is explicitly 'auto', 'default', or 'flex'
    if (serviceTier === 'auto' || serviceTier === 'default' || serviceTier === 'flex') {
      payload.service_tier = serviceTier;
    }

    let response: Response | null = null;
    let attempt = 0;
    const maxRetries = serviceTier === 'flex' ? 3 : 0;
    let baseDelay = 1000;
    let lastErrorData = null;

    while (attempt <= maxRetries) {
      try {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          break; // Success
        }

        lastErrorData = await response.json();

        // Only retry on 429 rate limit or 5xx server errors
        if (response.status !== 429 && response.status < 500) {
          break; // Do not retry mostly deterministic errors
        }
      } catch (e) {
        lastErrorData = { error: { message: 'Network or Fetch error' } };
      }

      attempt++;
      if (attempt <= maxRetries) {
        console.warn(`OpenAI Request failed, retrying in ${baseDelay}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, baseDelay));
        baseDelay *= 2; // Exponential backoff
      }
    }

    if (!response || !response.ok) {
      console.error('OpenAI Error:', lastErrorData);
      return NextResponse.json(
        { error: 'Failed to communicate with OpenAI' },
        { status: response ? response.status : 500 }
      );
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error handling chat request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
