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
  const [canPlayAudio, setCanPlayAudio] = useState(true);

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

        newRoom.on(RoomEvent.AudioPlaybackStatusChanged, () => {
          if (mounted) {
            setCanPlayAudio(newRoom.canPlaybackAudio);
            console.log('Audio playback status:', newRoom.canPlaybackAudio);
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
          console.log('Track details:', {
            sid: track.sid,
            kind: track.kind,
            muted: track.isMuted,
            enabled: track.mediaStreamTrack?.enabled,
            readyState: track.mediaStreamTrack?.readyState,
          });

          if (mounted) {
            if (track.kind === 'video' && videoRef.current) {
              console.log('Attaching video track to element');

              // Correct way: attach track directly to existing element
              track.attach(videoRef.current);

              console.log('Video element after attach:', {
                srcObject: videoRef.current.srcObject,
                readyState: videoRef.current.readyState,
                videoWidth: videoRef.current.videoWidth,
                videoHeight: videoRef.current.videoHeight,
                paused: videoRef.current.paused,
                muted: videoRef.current.muted,
              });
            } else if (track.kind === 'audio' && audioRef.current) {
              console.log('Attaching audio track to element');

              // Correct way: attach track directly to existing element
              track.attach(audioRef.current);

              console.log('Audio element after attach:', {
                srcObject: audioRef.current.srcObject,
                paused: audioRef.current.paused,
                muted: audioRef.current.muted,
              });
            }

            // Set broadcaster if not already set
            if (participant.permissions?.canPublish) {
              setBroadcaster(participant);
            }
          }
        });

        newRoom.on(RoomEvent.TrackUnsubscribed, (
          track: RemoteTrack
        ) => {
          console.log('Track unsubscribed:', track.kind);
          // Detach from all elements
          track.detach();
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

          // Check for existing broadcaster
          newRoom.remoteParticipants.forEach((participant) => {
            console.log('Found existing participant:', participant.identity);

            if (participant.permissions?.canPublish) {
              setBroadcaster(participant);
            }
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
        muted={true}
        controls
        className="w-full h-full object-contain"
      />
      <audio
        ref={audioRef}
        autoPlay
        muted={false}
      />

      {/* Overlay with broadcast info */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-linear-to-b from-black/70 to-transparent">
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

      {/* Audio playback permission button */}
      {!canPlayAudio && room && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="text-center">
            <svg className="w-16 h-16 text-white mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <p className="text-white text-lg mb-4">Audio is muted</p>
            <button
              onClick={async () => {
                try {
                  await room.startAudio();
                  setCanPlayAudio(true);
                } catch (err) {
                  console.error('Failed to start audio:', err);
                }
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enable Audio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}