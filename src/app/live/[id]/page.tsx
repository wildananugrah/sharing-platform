'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BroadcastViewer from '@/components/broadcast/BroadcastViewer';
import LiveChat from '@/components/broadcast/LiveChat';
import PublicLayout from '@/components/PublicLayout';
import DashboardLayout from '@/components/DashboardLayout';

interface Broadcast {
  id: string;
  title: string;
  description?: string;
  status: string;
  viewerCount: number;
  broadcaster: {
    id: string;
    name?: string;
    image?: string;
  };
}

export default function WatchBroadcastPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const broadcastId = params.id as string;

  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [isPublisher, setIsPublisher] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBroadcast = async () => {
      try {
        // Get broadcast details
        const broadcastRes = await fetch(`/api/broadcast/${broadcastId}`);
        if (!broadcastRes.ok) {
          if (broadcastRes.status === 404) {
            setError('Broadcast not found');
          } else {
            setError('Failed to load broadcast');
          }
          setIsLoading(false);
          return;
        }

        const broadcastData = await broadcastRes.json();
        setBroadcast(broadcastData);

        // Check if broadcast is live or ended recently (within last hour for replay)
        if (broadcastData.status === 'preparing') {
          setError('This broadcast has not started yet');
          setIsLoading(false);
          return;
        }

        // Get LiveKit token
        const tokenRes = await fetch(`/api/broadcast/${broadcastId}/token`);
        if (!tokenRes.ok) {
          setError('Failed to join broadcast');
          setIsLoading(false);
          return;
        }

        const tokenData = await tokenRes.json();
        setToken(tokenData.token);
        setRoomName(tokenData.roomName);
        setIsPublisher(tokenData.isPublisher);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading broadcast:', err);
        setError('Failed to load broadcast');
        setIsLoading(false);
      }
    };

    loadBroadcast();
  }, [broadcastId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
          <button
            onClick={() => router.push('/live')}
            className="mt-4 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Browse Broadcasts
          </button>
        </div>
      </div>
    );
  }

  if (!broadcast || !token || !roomName) {
    return null;
  }

  const content = (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      {/* Video Player - Takes up most of the space */}
      <div className="flex-1 bg-black">
        <BroadcastViewer
          token={token}
          roomName={roomName}
          broadcastInfo={{
            id: broadcast.id,
            title: broadcast.title,
            description: broadcast.description,
            broadcaster: broadcast.broadcaster,
          }}
        />
      </div>

      {/* Chat Sidebar */}
      <div className="w-full lg:w-96 h-96 lg:h-full border-l border-gray-200">
        <LiveChat broadcastId={broadcastId} isPublisher={isPublisher} />
      </div>
    </div>
  );

  // Wrap in appropriate layout based on auth status
  if (session) {
    return (
      <DashboardLayout title={broadcast.title}>
        {content}
      </DashboardLayout>
    );
  } else {
    return <PublicLayout>{content}</PublicLayout>;
  }
}