import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerSchema, hashPassword, generateJWT } from '@/lib/auth'
import { z } from 'zod'
import { withAudit, AuditAction, AuditEntity } from '@/lib/audit'

import { withLogging } from '@/lib/withLogging';
export const POST = withLogging(async (request: NextRequest) => {
  try {
    const body = await request.json()

    const validatedData = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(validatedData.password)

    // Create user with audit logging
    const result = await withAudit(
      {
        userId: null, // No user ID yet since we're creating
        action: AuditAction.USER_REGISTER,
        entity: AuditEntity.USER,
        metadata: {
          email: validatedData.email
        }
      },
      async () => {
        const user = await prisma.user.create({
          data: {
            email: validatedData.email,
            password: hashedPassword
          },
          select: {
            id: true,
            email: true,
            createdAt: true
          }
        })

        const token = generateJWT({
          userId: user.id,
          email: user.email
        })

        return { user, token }
      },
      request
    )

    return NextResponse.json(
      {
        message: 'User registered successfully',
        user: {
          id: result.user.id,
          email: result.user.email,
          createdAt: result.user.createdAt
        },
        token: result.token
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
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
