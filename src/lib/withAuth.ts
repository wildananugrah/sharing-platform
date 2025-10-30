import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from './auth'

export interface AuthenticatedRequest extends NextRequest {
  user: {
    userId: string
    email: string
  }
}

export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    try {
      const authHeader = request.headers.get('Authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      const decoded = verifyJWT(token)

      if (!decoded) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        )
      }

      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = {
        userId: decoded.userId,
        email: decoded.email
      }

      return handler(authenticatedRequest)
    } catch (error) {
      console.error('Authentication error:', error)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }
  }
}