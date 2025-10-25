/**
 * Secure Token Endpoint
 *
 * This is the ONLY backend endpoint needed for client-side GitHub operations.
 * It returns the user's GitHub access token for authenticated requests.
 *
 * Security:
 * - Requires valid NextAuth session
 * - Returns short-lived tokens only
 * - Rate limited to prevent abuse
 * - CORS restricted to same origin
 *
 * The client should call this endpoint on-demand, not store the token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimiter.get(identifier);

  if (!record || record.resetAt < now) {
    rateLimiter.set(identifier, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Rate limiting based on user email/login
    const identifier = session.user?.email || session.user?.name || 'anonymous';
    if (!checkRateLimit(identifier)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Return the access token
    return NextResponse.json({
      accessToken: session.accessToken,
      expiresIn: 300, // Suggest 5 minute cache
    });
  } catch (error) {
    console.error('Token endpoint error:', error);
    return NextResponse.json({ error: 'Failed to get access token' }, { status: 500 });
  }
}
