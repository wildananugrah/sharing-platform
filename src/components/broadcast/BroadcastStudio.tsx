'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LocalTrackPublication,
  LocalVideoTrack,
  Room,
  RoomEvent,
  VideoPresets,
  createLocalTracks,
} from 'livekit-client';
import { useRouter } from 'next/navigation';

interface BroadcastStudioProps {
  broadcastId: string;
  token: string;
  onEnd?: () => void;
}

export default function BroadcastStudio({
  broadcastId,
  token,
  onEnd,
}: BroadcastStudioProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let roomInstance: Room | null = null;

    const setupRoom = async () => {
      try {
        // Check if media devices are available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Media devices are not supported in your browser');
        }

        // Check if devices exist before requesting
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some(device => device.kind === 'videoinput');
        const hasAudio = devices.some(device => device.kind === 'audioinput');

        if (!hasVideo && !hasAudio) {
          throw new Error('No camera or microphone found. Please connect media devices.');
        }

        // Request permissions and create local tracks
        const trackOptions: any = {};

        if (hasAudio) {
          trackOptions.audio = {
            echoCancellation: true,
            noiseSuppression: true,
          };
        }

        if (hasVideo) {
          trackOptions.video = {
            resolution: VideoPresets.h720,
            facingMode: 'user',
          };
        }

        const tracks = await createLocalTracks(trackOptions);

        if (!mounted) {
          // Clean up tracks if component unmounted during setup
          tracks.forEach(track => track.stop());
          return;
        }

        // Create and connect to room
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: VideoPresets.h720,
          },
        });

        // Set up event handlers
        newRoom.on(RoomEvent.Connected, () => {
          if (mounted) {
            setIsConnected(true);
            console.log('Connected to room');
          }
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          if (mounted) {
            setIsConnected(false);
            setIsBroadcasting(false);
          }
        });

        newRoom.on(RoomEvent.ParticipantConnected, () => {
          if (mounted) {
            setViewerCount((prev) => prev + 1);
          }
        });

        newRoom.on(RoomEvent.ParticipantDisconnected, () => {
          if (mounted) {
            setViewerCount((prev) => Math.max(0, prev - 1));
          }
        });

        // Connect to LiveKit room
        const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
        if (!wsUrl) {
          throw new Error('LiveKit URL is not configured');
        }
        await newRoom.connect(wsUrl, token);

        // Publish local tracks
        await Promise.all(tracks.map((track) => newRoom.localParticipant.publishTrack(track)));

        // Attach video to preview
        const videoTrack = tracks.find((track) => track.kind === 'video') as LocalVideoTrack;
        if (videoTrack && videoRef.current) {
          videoTrack.attach(videoRef.current);
        }

        if (mounted) {
          setRoom(newRoom);
          roomInstance = newRoom;
        }
      } catch (err: any) {
        console.error('Error setting up room:', err);
        if (mounted) {
          let errorMessage = 'Failed to connect to broadcast room.';

          if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMessage = 'No camera or microphone found. Please connect media devices.';
          } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMessage = 'Camera and microphone permissions denied. Please allow access in your browser settings.';
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMessage = 'Camera or microphone is already in use by another application.';
          } else if (err.message) {
            errorMessage = err.message;
          }

          setError(errorMessage);
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
  }, [token]);

  const startBroadcast = async () => {
    if (!isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/broadcast/${broadcastId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start broadcast');
      }

      setIsBroadcasting(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const endBroadcast = async () => {
    if (!isBroadcasting) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/broadcast/${broadcastId}/end`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to end broadcast');
      }

      setIsBroadcasting(false);

      // Disconnect from room
      if (room) {
        room.disconnect();
      }

      // Call onEnd callback or redirect
      if (onEnd) {
        onEnd();
      } else {
        router.push('/live');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMute = async () => {
    if (!room) return;

    const audioTrack = room.localParticipant.audioTrackPublications.values().next().value as LocalTrackPublication;
    if (audioTrack) {
      if (isMuted) {
        await audioTrack.unmute();
      } else {
        await audioTrack.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (!room) return;

    const videoTrack = room.localParticipant.videoTrackPublications.values().next().value as LocalTrackPublication;
    if (videoTrack) {
      if (isVideoOff) {
        await videoTrack.unmute();
      } else {
        await videoTrack.mute();
      }
      setIsVideoOff(!isVideoOff);
    }
  };

  if (error && !room) {
    return (
      <div className="flex flex-col h-full bg-gray-50 items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Access Media Devices</h3>
              <p className="text-sm text-red-700 mb-4">{error}</p>
              <div className="text-sm text-gray-700 space-y-2">
                <p className="font-medium">Please try the following:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Make sure your camera and microphone are connected</li>
                  <li>Allow camera and microphone permissions in your browser</li>
                  <li>Close other applications that might be using your camera/microphone</li>
                  <li>Refresh the page and try again</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Reload Page
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Status Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isBroadcasting && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-500 font-medium">LIVE</span>
            </div>
          )}
          {isConnected && !isBroadcasting && (
            <span className="text-gray-600">Ready to broadcast</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}
          </span>
        </div>
      </div>

      {/* Video Preview */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }} // Mirror for preview
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <span className="text-white text-lg">Camera is off</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              disabled={!isConnected || !isBroadcasting}
              className={`p-3 rounded-md transition-colors ${
                isMuted
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            <button
              onClick={toggleVideo}
              disabled={!isConnected || !isBroadcasting}
              className={`p-3 rounded-md transition-colors ${
                isVideoOff
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isVideoOff ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isBroadcasting ? (
              <button
                onClick={startBroadcast}
                disabled={!isConnected || isLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? 'Starting...' : 'Start Broadcasting'}
              </button>
            ) : (
              <button
                onClick={endBroadcast}
                disabled={isLoading}
                className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? 'Ending...' : 'End Broadcast'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}