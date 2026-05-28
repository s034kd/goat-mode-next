import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const { userContent, systemPrompt, stream: useStream } = await req.json();

    if (!userContent || !systemPrompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ── STREAMING MODE ──────────────────────────────────────────
    if (useStream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const stream = client.messages.stream({
              model: 'claude-sonnet-4-5',
              max_tokens: 4096,
              system: systemPrompt,
              messages: [{ role: 'user', content: userContent }],
            });

            for await (const event of stream) {
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                const chunk = JSON.stringify({ t: event.delta.text });
                controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
              }
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Stream error';
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          } finally {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
          'Connection': 'keep-alive',
        },
      });
    }

    // ── NON-STREAMING (used for refine) ─────────────────────────
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    return NextResponse.json({ text });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Transform error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
