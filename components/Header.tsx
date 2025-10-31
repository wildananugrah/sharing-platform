'use client';

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { CreateRoomModal } from './CreateRoomModal';

interface HeaderProps {
  onRoomCreated?: () => void;
}

export function Header({ onRoomCreated }: HeaderProps) {
  const { data: session, status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRoomCreated = () => {
    setIsModalOpen(false);
    if (onRoomCreated) {
      onRoomCreated();
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Video Meet</h1>
            </Link>

            {/* Auth Section */}
            <div className="flex items-center gap-4">
              {status === 'loading' ? (
                <div className="animate-pulse flex items-center gap-2">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
              ) : session ? (
                <div className="flex items-center gap-3">
                  {/* Create Room Button */}
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    <span className="hidden sm:inline">Create Room</span>
                  </button>

                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    {session.user?.image && (
                      <img
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        className="w-9 h-9 rounded-full ring-2 ring-gray-200"
                      />
                    )}
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-semibold text-gray-800">
                        {session.user?.name}
                      </p>
                      <p className="text-xs text-gray-600">{session.user?.email}</p>
                    </div>
                  </div>

                  {/* Sign Out Button */}
                  <button
                    onClick={() => signOut()}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Gmail
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRoomCreated={handleRoomCreated}
      />
    </>
  );
}
