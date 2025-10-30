import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Custom signout endpoint that forcefully clears all cookies
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // List of all possible NextAuth cookie names to clear
    const cookieNames = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url',
      'next-auth.pkce.code_verifier',
    ];

    console.log('Custom signout - Clearing all cookies');

    // Clear all NextAuth cookies
    cookieNames.forEach(cookieName => {
      cookieStore.delete(cookieName);
      console.log(`Custom signout - Deleted cookie: ${cookieName}`);
    });

    // Get all cookies and clear any that start with next-auth
    const allCookies = cookieStore.getAll();
    allCookies.forEach(cookie => {
      if (cookie.name.includes('next-auth')) {
        cookieStore.delete(cookie.name);
        console.log(`Custom signout - Deleted additional cookie: ${cookie.name}`);
      }
    });

    console.log('Custom signout - All cookies cleared successfully');

    return NextResponse.json({
      success: true,
      message: 'All cookies cleared successfully'
    });
  } catch (error) {
    console.error('Custom signout - Error clearing cookies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear cookies' },
      { status: 500 }
    );
  }
}
