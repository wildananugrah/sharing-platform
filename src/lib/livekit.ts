import { AccessToken, RoomServiceClient, EgressClient } from 'livekit-server-sdk';

// Environment variables
const livekitHost = process.env.LIVEKIT_URL!.replace('wss://', 'https://');
const apiKey = process.env.LIVEKIT_API_KEY!;
const apiSecret = process.env.LIVEKIT_API_SECRET!;

// Initialize clients
const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);
const egressClient = new EgressClient(livekitHost, apiKey, apiSecret);

/**
 * Generate a token for a participant to join a room
 */
export async function generateToken(
  roomName: string,
  participantIdentity: string,
  participantName: string,
  isPublisher: boolean = false
): Promise<string> {
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: isPublisher,
    canSubscribe: true,
    canPublishData: true, // For chat messages
  });

  // Set token expiration (24 hours)
  at.ttl = '24h';

  return at.toJwt();
}

/**
 * Create a new room for broadcasting
 */
export async function createRoom(roomName: string) {
  try {
    const room = await roomService.createRoom({
      name: roomName,
      emptyTimeout: 600, // 10 minutes
      maxParticipants: 1000, // Maximum viewers
    });
    return room;
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}

/**
 * Delete a room after broadcast ends
 */
export async function deleteRoom(roomName: string) {
  try {
    await roomService.deleteRoom(roomName);
  } catch (error) {
    console.error('Error deleting room:', error);
    // Continue even if room deletion fails
  }
}

/**
 * Get list of participants in a room
 */
export async function getParticipants(roomName: string) {
  try {
    const participants = await roomService.listParticipants(roomName);
    return participants;
  } catch (error) {
    console.error('Error getting participants:', error);
    return [];
  }
}

/**
 * Start recording a room
 */
export async function startRecording(
  roomName: string,
  broadcastId: string,
  s3Bucket: string
): Promise<string | null> {
  try {
    const fileOutput = {
      filepath: `broadcasts/${broadcastId}/recording-{time}.mp4`,
      s3: {
        accessKey: process.env.AWS_ACCESS_KEY_ID!,
        secret: process.env.AWS_SECRET_ACCESS_KEY!,
        region: process.env.AWS_REGION!,
        bucket: s3Bucket,
      },
    };

    const egress = await egressClient.startRoomCompositeEgress(
      roomName,
      {
        file: fileOutput,
      }
    );

    return egress.egressId;
  } catch (error) {
    console.error('Error starting recording:', error);
    return null;
  }
}

/**
 * Stop recording
 */
export async function stopRecording(egressId: string) {
  try {
    await egressClient.stopEgress(egressId);
  } catch (error) {
    console.error('Error stopping recording:', error);
  }
}

/**
 * Get room information
 */
export async function getRoomInfo(roomName: string) {
  try {
    const rooms = await roomService.listRooms([roomName]);
    return rooms.length > 0 ? rooms[0] : null;
  } catch (error) {
    console.error('Error getting room info:', error);
    return null;
  }
}

/**
 * Remove a participant (for moderation)
 */
export async function removeParticipant(roomName: string, participantIdentity: string) {
  try {
    await roomService.removeParticipant(roomName, participantIdentity);
  } catch (error) {
    console.error('Error removing participant:', error);
    throw error;
  }
}

/**
 * Update participant metadata (for displaying user info)
 */
export async function updateParticipantMetadata(
  roomName: string,
  participantIdentity: string,
  metadata: string
) {
  try {
    await roomService.updateParticipant(roomName, participantIdentity, {
      metadata,
    });
  } catch (error) {
    console.error('Error updating participant metadata:', error);
  }
}