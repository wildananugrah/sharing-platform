import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './nextauth';
import { logApiRequest } from './logger';
import { prisma } from './prisma';

// Paths to exclude from logging
const EXCLUDED_PATHS = [
  /^\/_next\//,
  /^\/static\//,
  /^\/favicon\.ico$/,
  /^\/api\/auth\//,  // NextAuth internal endpoints
];

// Check if path should be excluded
function shouldExcludePath(pathname: string): boolean {
  return EXCLUDED_PATHS.some(pattern => pattern.test(pathname));
}

// Extract request body safely
async function extractRequestBody(request: NextRequest): Promise<any> {
  try {
    // Clone request to avoid consuming body
    const clonedRequest = request.clone();
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return await clonedRequest.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await clonedRequest.text();
      return Object.fromEntries(new URLSearchParams(text));
    }

    // For multipart/form-data or other types, don't log body
    return undefined;
  } catch (error) {
    return undefined;
  }
}

// Extract response body safely
async function extractResponseBody(response: NextResponse): Promise<any> {
  try {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Clone response to read body without consuming it
      const clonedResponse = response.clone();
      return await clonedResponse.json();
    }

    return undefined;
  } catch (error) {
    return undefined;
  }
}

// Get user ID from session or API key
async function getUserId(request: NextRequest): Promise<string | undefined> {
  try {
    // First, check for API key authentication
    const apiKey = request.headers.get('x-api-key') ||
                   request.headers.get('authorization')?.replace('Bearer ', '');

    if (apiKey) {
      // Look up the user from the API key
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKey },
        include: { user: true }
      });

      if (apiKeyRecord && apiKeyRecord.isActive) {
        // Update last used timestamp (fire and forget)
        prisma.apiKey.update({
          where: { id: apiKeyRecord.id },
          data: { lastUsed: new Date() }
        }).catch(() => {}); // Ignore errors on update

        return apiKeyRecord.userId;
      }

      // If API key is invalid, return a marker
      return `invalid-api-key`;
    }

    // Otherwise, check session authentication
    const session = await getServerSession(authOptions);
    return session?.user?.id;
  } catch (error) {
    return undefined;
  }
}

// Main wrapper function
export function withLogging<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const pathname = new URL(request.url).pathname;

    // Skip logging for excluded paths
    if (shouldExcludePath(pathname)) {
      return handler(request, ...args);
    }

    const method = request.method;
    const uri = pathname;
    let userId: string | undefined;
    let requestBody: any;
    let response: NextResponse;
    let status: number = 200; // Initialize with default status
    let responseBody: any;
    let error: Error | undefined;

    try {
      // Get user ID from session (async operation)
      userId = await getUserId(request);

      // Extract request body (only if needed for error logging)
      requestBody = await extractRequestBody(request);

      // Execute the actual handler
      response = await handler(request, ...args);
      status = response.status;

      // Extract response body if status is error (4xx/5xx)
      if (status >= 400) {
        responseBody = await extractResponseBody(response);
      }

      return response;
    } catch (err: any) {
      // Handle unexpected errors
      error = err;
      status = 500;
      responseBody = { error: 'Internal Server Error', message: err.message };

      // Create error response
      response = NextResponse.json(responseBody, { status });

      return response;
    } finally {
      const elapsedMs = Date.now() - startTime;

      // Log the request
      logApiRequest({
        userId,
        method,
        uri,
        status,
        elapsedMs,
        message: `${method} ${uri} - ${status}`,
        requestBody: status >= 400 ? requestBody : undefined,
        responseBody: status >= 400 ? responseBody : undefined,
        error,
      });
    }
  };
}

// Example usage:
// export const GET = withLogging(async (request: NextRequest) => {
//   // Your handler logic here
//   return NextResponse.json({ success: true });
// });
