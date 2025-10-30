import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loginSchema, verifyPassword, generateJWT } from '@/lib/auth'
import { z } from 'zod'
import { auditLogin } from '@/lib/audit-middleware'

import { withLogging } from '@/lib/withLogging';
export const POST = withLogging(async (request: NextRequest) => {
  try {
    const body = await request.json()

    const validatedData = loginSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        image: true,
        createdAt: true
      }
    })

    if (!user) {
      await auditLogin(validatedData.email, false, request)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.password) {
      await auditLogin(user.id, false, request)
      return NextResponse.json(
        { error: 'This account was created using OAuth. Please use Google Sign-In.' },
        { status: 400 }
      )
    }

    const isPasswordValid = await verifyPassword(validatedData.password, user.password)

    if (!isPasswordValid) {
      await auditLogin(user.id, false, request)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const token = generateJWT({
      userId: user.id,
      email: user.email
    })

    // Log successful login
    await auditLogin(user.id, true, request)

    return NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          createdAt: user.createdAt
        },
        token
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Login error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
});