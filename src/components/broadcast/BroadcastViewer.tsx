'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
} from 'livekit-client';

interface BroadcastViewerProps {
  token: string;
  roomName: string;
  broadcastInfo: {
    id: string;
    title: string;
    description?: string;
    broadcaster: {
      name?: string;
      image?: string;
    };
  };
}

export default function BroadcastViewer({
  token,
  roomName,
  broadcastInfo,
}: BroadcastViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [broadcaster, setBroadcaster] = useState<RemoteParticipant | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let roomInstance: Room | null = null;

    const setupRoom = async () => {
      try {
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        // Set up event handlers
        newRoom.on(RoomEvent.Connected, () => {
          if (mounted) {
            setIsConnected(true);
            setIsLoading(false);
            console.log('Connected to room as viewer');

            // Count participants
            setViewerCount(newRoom.remoteParticipants.size);
          }
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          if (mounted) {
            setIsConnected(false);
            setBroadcaster(null);
          }
        });

        newRoom.on(RoomEvent.TrackPublished, (
          publication: RemoteTrackPublication,
          participant: RemoteParticipant
        ) => {
          console.log('Track published:', publication.kind, participant.identity);

          // Set broadcaster if not already set
          if (participant.permissions?.canPublish && mounted) {
            setBroadcaster(participant);
          }
        });

        newRoom.on(RoomEvent.TrackSubscribed, (
          track: RemoteTrack,
          publication: RemoteTrackPublication,
          participant: RemoteParticipant
        ) => {
          console.log('Track subscribed:', track.kind, participant.identity);

          if (track.kind === 'video' && videoRef.current) {
            track.attach(videoRef.current);
          } else if (track.kind === 'audio' && audioRef.current) {
            track.attach(audioRef.current);
          }

          // Set broadcaster if not already set
          if (participant.permissions?.canPublish && mounted) {
            setBroadcaster(participant);
          }
        });

        newRoom.on(RoomEvent.TrackUnsubscribed, (
          track: RemoteTrack
        ) => {
          if (track.kind === 'video' && videoRef.current) {
            track.detach(videoRef.current);
          } else if (track.kind === 'audio' && audioRef.current) {
            track.detach(audioRef.current);
          }
        });

        newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          if (mounted) {
            setViewerCount((prev) => prev + 1);

            // Check if this is the broadcaster (publisher)
            if (participant.permissions?.canPublish) {
              setBroadcaster(participant);
            }
          }
        });

        newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          if (mounted) {
            setViewerCount((prev) => Math.max(0, prev - 1));

            // If broadcaster disconnected, show error
            if (participant === broadcaster) {
              setError('The broadcaster has ended the stream');
              setBroadcaster(null);
            }
          }
        });

        // Connect to LiveKit room
        await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);

        if (mounted) {
          setRoom(newRoom);
          roomInstance = newRoom;

          // Check for existing broadcaster and subscribe to their tracks
          newRoom.remoteParticipants.forEach((participant) => {
            console.log('Found existing participant:', participant.identity, participant.trackPublications);

            if (participant.permissions?.canPublish) {
              setBroadcaster(participant);
            }

            // Subscribe to already published tracks
            participant.trackPublications.forEach((publication) => {
              if (publication.track) {
                console.log('Attaching existing track:', publication.track.kind);
                if (publication.track.kind === 'video' && videoRef.current) {
                  publication.track.attach(videoRef.current);
                } else if (publication.track.kind === 'audio' && audioRef.current) {
                  publication.track.attach(audioRef.current);
                }
              }
            });
          });
        }
      } catch (err) {
        console.error('Error connecting to room:', err);
        if (mounted) {
          setError('Failed to connect to broadcast. Please try again later.');
          setIsLoading(false);
        }
      }
    };

    setupRoom();

    return () => {
      mounted = false;
      if (roomInstance) {
        roomInstance.disconnect();
      }
    };
  }, [token, roomName]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-white">Connecting to stream...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
          </svg>
          <p className="text-white text-lg mb-2">Stream Unavailable</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-black">
      {/* Video Player */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
      <audio
        ref={audioRef}
        autoPlay
      />

      {/* Overlay with broadcast info */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-white text-xl font-semibold">{broadcastInfo.title}</h2>
            {broadcastInfo.broadcaster.name && (
              <p className="text-gray-300 text-sm mt-1">
                by {broadcastInfo.broadcaster.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {isConnected && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-500 text-sm font-medium">LIVE</span>
              </div>
            )}
            <div className="text-white text-sm">
              {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}
            </div>
          </div>
        </div>
      </div>

      {/* Waiting for broadcaster message */}
      {isConnected && !broadcaster && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="animate-pulse mb-4">
              <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-white text-lg">Waiting for broadcaster to start...</p>
          </div>
        </div>
      )}
    </div>
  );
}