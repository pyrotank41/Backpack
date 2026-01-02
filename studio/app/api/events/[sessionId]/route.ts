import { NextRequest } from 'next/server';
import { getEventStreamer } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const streamer = getEventStreamer(sessionId);

  const stream = new ReadableStream({
    start(controller) {
      const handler = (event: any) => {
        const data = JSON.stringify(event);
        controller.enqueue(`data: ${data}\n\n`);
      };

      // Subscribe to all events
      streamer.on('*', handler);

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        controller.enqueue(': heartbeat\n\n');
      }, 15000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        streamer.off('*', handler);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
