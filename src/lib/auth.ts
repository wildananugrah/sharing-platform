import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' })
})

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

export function generateJWT(payload: { userId: string, email: string }): string {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not configured')
  }

  return jwt.sign(
    payload,
    jwtSecret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'user-auth-app',
      audience: 'user-auth-app-users'
    } as jwt.SignOptions
  )
}

export function verifyJWT(token: string): { userId: string, email: string } | null {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not configured')
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: 'user-auth-app',
      audience: 'user-auth-app-users'
    }) as { userId: string, email: string }
    
    return decoded
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}