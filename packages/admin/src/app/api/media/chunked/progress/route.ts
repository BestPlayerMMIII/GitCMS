import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { uploadSessionManager } from '@/lib/upload-session-manager';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return new NextResponse('Upload ID is required', { status: 400 });
    }

    // Set up Server-Sent Events
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const sendUpdate = () => {
          const tracker = uploadSessionManager.getProgress(uploadId);

          if (!tracker) {
            // If no tracker found, send error and close
            const errorData = JSON.stringify({
              type: 'error',
              error: 'Upload session not found',
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
            return;
          }

          if (tracker.error) {
            // Send error and close
            const errorData = JSON.stringify({
              type: 'error',
              error: tracker.error,
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
            uploadSessionManager.updateProgress(uploadId, { ...tracker, completed: true });
            return;
          }

          if (tracker.completed) {
            // Send completion and close
            const completeData = JSON.stringify({
              type: 'complete',
              media: tracker.result,
            });
            controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
            controller.close();
            // Clean up completed upload
            uploadSessionManager.updateProgress(uploadId, { ...tracker, completed: true });
            return;
          }

          // Send progress update
          const progressData = JSON.stringify({
            type: 'progress',
            progress: tracker.progress,
            phase: tracker.phase,
          });
          controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));

          // Schedule next update
          setTimeout(sendUpdate, 500); // Update every 500ms
        };

        // Send initial update
        sendUpdate();
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Progress SSE error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
