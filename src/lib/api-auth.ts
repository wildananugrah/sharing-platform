import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// export async function authenticateApiKey(request: NextRequest) {
//   const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

//   if (!apiKey) {
//     return { error: 'API key is required', status: 401, user: null, apiKeyId: null };
//   }

//   try {
//     const apiKeyRecord = await prisma.apiKey.findUnique({
//       where: {
//         key: apiKey,
//         isActive: true
//       },
//       include: {
//         user: true
//       }
//     });

//     if (!apiKeyRecord) {
//       return { error: 'Invalid API key', status: 401, user: null, apiKeyId: null };
//     }

//     // Update last used timestamp
//     await prisma.apiKey.update({
//       where: { id: apiKeyRecord.id },
//       data: { lastUsed: new Date() }
//     });

//     return { error: null, status: 200, user: apiKeyRecord.user, apiKeyId: apiKeyRecord.id };
//   } catch (error) {
//     console.error('API key authentication error:', error);
//     return { error: 'Authentication failed', status: 500, user: null, apiKeyId: null };
//   }
// }

// export function generateApiKey(): string {
//   const prefix = 'task_';
//   const randomPart = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
//   return prefix + randomPart;
// }