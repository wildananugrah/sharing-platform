'use client';

import Link from 'next/link';
import Image from 'next/image';

interface BroadcastCardProps {
  broadcast: {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    status: string;
    viewerCount: number;
    duration?: number;
    createdAt: string;
    broadcaster: {
      id: string;
      name?: string;
      image?: string;
    };
    _count?: {
      viewers: number;
      chats: number;
    };
  };
}

export default function BroadcastCard({ broadcast }: BroadcastCardProps) {
  const isLive = broadcast.status === 'live';

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:00`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Link href={`/live/${broadcast.id}`}>
      <div className="group cursor-pointer">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden mb-3">
          {broadcast.thumbnailUrl ? (
            <Image
              src={broadcast.thumbnailUrl}
              alt={broadcast.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Live badge or duration */}
          <div className="absolute top-2 right-2">
            {isLive ? (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs font-medium rounded">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                LIVE
              </div>
            ) : broadcast.duration ? (
              <div className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                {formatDuration(broadcast.duration)}
              </div>
            ) : null}
          </div>

          {/* Viewer count for live streams */}
          {isLive && broadcast.viewerCount > 0 && (
            <div className="absolute bottom-2 left-2">
              <div className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                {broadcast.viewerCount}
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {broadcast.broadcaster.image ? (
              <Image
                src={broadcast.broadcaster.image}
                alt={broadcast.broadcaster.name || 'Broadcaster'}
                width={36}
                height={36}
                className="rounded-full"
              />
            ) : (
              <div className="w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                {broadcast.broadcaster.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>

          {/* Title and metadata */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-black">
              {broadcast.title}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {broadcast.broadcaster.name || 'Anonymous'}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
              {!isLive && broadcast._count && (
                <>
                  <span>{broadcast._count.viewers} views</span>
                  <span>•</span>
                </>
              )}
              <span>{formatDate(broadcast.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}