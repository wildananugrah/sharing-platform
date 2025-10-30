'use client';

import DashboardLayout from "@/components/DashboardLayout";
import PublicLayout from "@/components/PublicLayout";
import BroadcastCard from "@/components/broadcast/BroadcastCard";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'live' | 'ended'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBroadcasts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = filter !== 'all' ? `?status=${filter}` : '';
        const response = await fetch(`/api/broadcast${params}`);

        if (!response.ok) {
          throw new Error('Failed to load broadcasts');
        }

        const data = await response.json();
        setBroadcasts(data.broadcasts);
      } catch (err) {
        console.error('Error loading broadcasts:', err);
        setError('Failed to load broadcasts');
      } finally {
        setIsLoading(false);
      }
    };

    loadBroadcasts();

    // Refresh every 10 seconds to update live status
    const interval = setInterval(loadBroadcasts, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  // Show loading state for session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const broadcastContent = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Live Broadcasts</h1>

          {session && (
            <button
              onClick={() => router.push('/live/studio')}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Go Live
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setFilter('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                filter === 'all'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('live')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                filter === 'live'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                Live Now
              </div>
            </button>
            <button
              onClick={() => setFilter('ended')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                filter === 'ended'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Past Broadcasts
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600">{error}</p>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No broadcasts found</h3>
          <p className="text-gray-600 mb-4">
            {filter === 'live'
              ? "No one is broadcasting right now"
              : filter === 'ended'
              ? "No past broadcasts available"
              : "Be the first to start broadcasting!"
            }
          </p>
          {session && filter !== 'ended' && (
            <button
              onClick={() => router.push('/live/studio')}
              className="inline-flex items-center px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Start Broadcasting
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {broadcasts.map((broadcast) => (
            <BroadcastCard key={broadcast.id} broadcast={broadcast} />
          ))}
        </div>
      )}
    </div>
  );

  // If user is logged in, show dashboard layout with broadcasts
  if (session) {
    return (
      <DashboardLayout>
        {broadcastContent}
      </DashboardLayout>
    );
  }

  // If user is not logged in, show public layout with broadcasts
  return (
    <PublicLayout>
      {broadcastContent}
    </PublicLayout>
  );
}