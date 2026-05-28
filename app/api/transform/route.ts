import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const { userContent, systemPrompt, stream: useStream, useThinking } = await req.json();

    if (!userContent || !systemPrompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Extended thinking uses claude-3-7-sonnet; standard uses claude-sonnet-4-5
    const model     = useThinking ? 'claude-3-7-sonnet-20250219' : 'claude-sonnet-4-5';
    const maxTokens = useThinking ? 16000 : 4096;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const thinkingParam: any = useThinking
      ? { type: 'enabled', budget_tokens: 10000 }
      : undefined;

    // ── STREAMING MODE ──────────────────────────────────────────
    if (useStream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const streamParams: any = {
              model,
              max_tokens: maxTokens,
              system: systemPrompt,
              messages: [{ role: 'user', content: userContent }],
            };
            if (thinkingParam) streamParams.thinking = thinkingParam;

            const stream = client.messages.stream(streamParams);

            for await (const event of stream) {
              // Only forward text deltas — thinking deltas stay server-side
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

    // ── NON-STREAMING (used for refine / critique) ──────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    };
    if (thinkingParam) params.thinking = thinkingParam;

    const message = await client.messages.create(params);

    // Find the first text block — skip any thinking blocks
    const textBlock = message.content.find((b) => b.type === 'text');
    const text = textBlock?.type === 'text' ? textBlock.text : '';
    return NextResponse.json({ text });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Transform error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
