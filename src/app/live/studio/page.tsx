'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import BroadcastStudio from '@/components/broadcast/BroadcastStudio';
import Modal from '@/components/Modal';

export default function StudioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showSetupModal, setShowSetupModal] = useState(true);
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
    }
  }, [session, status, router]);

  const createBroadcast = async () => {
    if (!title.trim()) {
      setError('Please enter a title for your broadcast');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Create broadcast
      const broadcastRes = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      if (!broadcastRes.ok) {
        const data = await broadcastRes.json();
        throw new Error(data.error || 'Failed to create broadcast');
      }

      const broadcast = await broadcastRes.json();

      // Get LiveKit token
      const tokenRes = await fetch(`/api/broadcast/${broadcast.id}/token`);
      if (!tokenRes.ok) {
        throw new Error('Failed to get broadcast token');
      }

      const tokenData = await tokenRes.json();

      setBroadcastId(broadcast.id);
      setToken(tokenData.token);
      setShowSetupModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleBroadcastEnd = () => {
    // Reset state and show setup modal again
    setBroadcastId(null);
    setToken(null);
    setTitle('');
    setDescription('');
    setShowSetupModal(true);

    // Optionally redirect to the broadcast list
    router.push('/');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout title="Broadcasting Studio">
      {showSetupModal ? (
        <Modal
          isOpen={showSetupModal}
          onClose={() => router.push('/live')}
          title="Set Up Your Broadcast"
          size="md"
        >
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Broadcast Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your broadcast title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will you be broadcasting about?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                maxLength={500}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => router.push('/live')}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={createBroadcast}
                disabled={isCreating || !title.trim()}
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Broadcast'}
              </button>
            </div>
          </div>
        </Modal>
      ) : (
        broadcastId && token && (
          <BroadcastStudio
            broadcastId={broadcastId}
            token={token}
            onEnd={handleBroadcastEnd}
          />
        )
      )}
    </DashboardLayout>
  );
}