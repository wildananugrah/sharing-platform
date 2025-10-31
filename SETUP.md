# Setup Instructions

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Google OAuth credentials
- LiveKit server credentials

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set up PostgreSQL Database

1. Create a PostgreSQL database:
```sql
CREATE DATABASE videomeet;
```

2. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Update `DATABASE_URL` in `.env` with your PostgreSQL connection string:
```
DATABASE_URL=postgresql://user:password@localhost:5432/videomeet
```

## Step 3: Generate NextAuth Secret

Generate a secret for NextAuth:
```bash
openssl rand -base64 32
```

Add it to `.env`:
```
NEXTAUTH_SECRET=your-generated-secret
```

## Step 4: Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret to `.env`:

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Step 5: Set up LiveKit

1. Sign up at [LiveKit Cloud](https://livekit.io/) or set up your own LiveKit server
2. Get your API Key, API Secret, and WebSocket URL
3. Add them to `.env`:

```
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_URL=wss://your-livekit-server.com
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
```

## Step 6: Run Prisma Migrations

Generate Prisma client and create database tables:

```bash
npx prisma generate
npx prisma db push
```

## Step 7: Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your app!

## Production Deployment

1. Update `NEXTAUTH_URL` in `.env` to your production URL
2. Add production Google OAuth redirect URI in Google Cloud Console
3. Run production build:

```bash
npm run build
npm start
```

## Troubleshooting

### "Cannot find module '@prisma/client'"
Run: `npx prisma generate`

### "Authentication not working"
- Check that all environment variables are set correctly
- Verify Google OAuth redirect URI matches exactly
- Ensure NEXTAUTH_SECRET is set

### "Database connection error"
- Verify PostgreSQL is running
- Check DATABASE_URL format is correct
- Ensure database exists
