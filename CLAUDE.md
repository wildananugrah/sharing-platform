# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 full-stack sharing/collaboration platform with PostgreSQL database, NextAuth authentication, role-based access control, audit logging, and notification system. The application uses TypeScript throughout and follows modern React patterns with the App Router.

## Common Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database (Prisma)
```bash
npx prisma migrate dev           # Create and apply migration
npx prisma migrate dev --name <name>  # Create named migration
npx prisma db push               # Push schema changes without migration
npx prisma generate              # Generate Prisma Client
npx prisma studio                # Open Prisma Studio GUI
npx prisma db seed               # Run seed script (if configured)
```

### Testing Database Queries
```bash
npx prisma db execute --file <sql-file>  # Execute raw SQL
```

## Architecture Overview

### Tech Stack
- **Framework:** Next.js 15.5.4 with App Router
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js with JWT sessions + custom JWT for API keys
- **Styling:** TailwindCSS 4
- **Email:** Nodemailer (SMTP)
- **Storage:** AWS S3
- **Logging:** Winston with daily rotation + PostgreSQL for Grafana

### Key Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── profile/       # User profile management
│   │   └── notifications/ # Notification endpoints
│   ├── page.tsx           # Home page (conditional: logged in = dashboard, logged out = landing)
│   ├── login/             # Login page
│   ├── profile/           # Profile page
│   └── layout.tsx         # Root layout with providers
├── components/            # React components
│   ├── DashboardLayout.tsx   # Main app shell with sidebar, header, notifications
│   ├── Providers.tsx         # NextAuth SessionProvider wrapper
│   ├── LoginForm.tsx
│   └── RegisterForm.tsx
├── lib/                   # Core utilities
│   ├── auth.ts           # Password hashing, JWT, Zod schemas
│   ├── nextauth.ts       # NextAuth configuration
│   ├── prisma.ts         # Prisma client singleton
│   ├── permissions.ts    # Role-based access control (RBAC)
│   ├── withAuth.ts       # JWT middleware
│   ├── withLogging.ts    # Request/response logging middleware
│   ├── audit.ts          # Audit trail system with batch queue
│   ├── email.ts          # Email templates and sending
│   ├── aws.ts            # S3 file operations
│   └── logger.ts         # Winston logger configuration
└── types/                 # TypeScript type definitions

prisma/
├── schema.prisma         # Database schema
└── migrations/           # Database migrations
```

## Authentication System

### Dual Authentication Architecture

The application uses **two authentication methods**:

1. **NextAuth.js** (primary, for web app)
   - Google OAuth provider
   - Credentials provider (email/password)
   - JWT session strategy
   - Configuration: `src/lib/nextauth.ts`

2. **Custom JWT** (for API keys and custom integrations)
   - Functions in `src/lib/auth.ts`
   - Middleware: `src/lib/withAuth.ts`

### Key Authentication Files
- `src/lib/nextauth.ts` - NextAuth configuration with callbacks
- `src/lib/auth.ts` - Password hashing, JWT generation/verification, Zod schemas
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth handler
- `src/app/api/auth/register/route.ts` - User registration
- `src/app/api/auth/login/route.ts` - Custom login endpoint

### Authentication Flow
When a new user registers (via Google OAuth or credentials):
1. User record created in `User` table
2. `UserExtension` automatically created via NextAuth `events.createUser` callback
3. Default role: `"client"`
4. Default notification settings: disabled

### Protected Routes Pattern
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  // ... rest of handler
}
```

## Database Schema

### Core Models

**User** - NextAuth user table
- Standard NextAuth fields (id, email, name, image)
- Linked to: Account (OAuth), Session, UserExtension, Notification, AuditLog

**UserExtension** - Application-specific user metadata
- `role`: "superadmin" | "admin" | "lead" | "member" | "client"
- Notification preferences (emailNotificationsEnabled, dueDateRemindersEnabled)
- One-to-one relationship with User

**Account** - NextAuth OAuth accounts (Google)

**Session** - NextAuth sessions

**Notification** - User notifications
- Types: task_assigned, comment_mention, task_status_updated, etc.
- Links to User and optional Task/Comment

**AuditLog** - Comprehensive audit trail
- Records all actions: LOGIN, TASK_CREATE, PROFILE_UPDATE, etc.
- Captures: userId, action, entity, metadata, ipAddress, userAgent, duration
- Indexed for performance (userId, entity/entityId, action, createdAt, sessionId)

### Important: User vs UserExtension
- **User**: NextAuth managed table, contains authentication data
- **UserExtension**: App-specific data (role, preferences, etc.)
- Always query UserExtension when you need role information
- Automatically created on user registration via NextAuth callback

## Role-Based Access Control (RBAC)

### Roles (in order of privilege)
1. `superadmin` - Full system access
2. `admin` - Administrative access
3. `lead` - Team lead capabilities
4. `member` - Regular team member
5. `client` - External client (read-only in most areas)

### Permission Checks
Use the centralized `src/lib/permissions.ts` module:

```typescript
import { permissions } from '@/lib/permissions';

// Check permissions
if (!permissions.canCreateTaskGroup(userRole)) {
  return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
}

// Available permission checks:
// - canCreateTaskGroup(role)
// - canDeleteTaskGroup(role)
// - canCreateTask(role)
// - canDeleteTask(role)
// - canAssignUsers(role)
// - canComment(role)
// - canAccessAdminPages(role)
// - canManageUserRoles(role)
```

### Menu Filtering
The `DashboardLayout` component automatically filters menu items based on user role. Menu items have an optional `roles` property to restrict access.

## Logging & Audit System

### Winston Logger (`src/lib/logger.ts`)
- Daily rotating log files (30-day retention)
- JSON structured output for Grafana/Kibana
- Two transports: general logs + errors only
- Automatic sensitive data redaction (passwords, tokens)

```typescript
import logger from '@/lib/logger';

logger.info('User logged in', { userId, email });
logger.error('Database connection failed', { error });
logger.warn('Rate limit exceeded', { ip, endpoint });
```

### Request/Response Logging (`src/lib/withLogging.ts`)
Wrap all API route handlers with `withLogging` middleware:

```typescript
import { withLogging } from '@/lib/withLogging';

export const GET = withLogging(async (request: NextRequest) => {
  // Your handler logic
  return NextResponse.json({ data });
});
```

This automatically logs:
- Request method, path, status code, duration
- User ID (from session or API key)
- IP address and user agent
- Request/response body (only on errors 4xx/5xx)

### Audit Trail System (`src/lib/audit.ts`)
Use `withAudit` for tracking important actions:

```typescript
import { withAudit, AuditAction, AuditEntity } from '@/lib/audit';

// Wrap operations that need audit logging
const result = await withAudit(
  {
    userId: session.user.id,
    action: AuditAction.PROFILE_UPDATE,
    entity: AuditEntity.USER,
    entityId: userId,
    metadata: { changedFields: ['name', 'email'] }
  },
  async () => {
    // Your operation here
    const updated = await prisma.user.update({...});
    return updated;
  },
  request  // Optional: for IP address and user-agent
);
```

**Important:** Audit logs use a batch queue system (10 logs/batch, 5s flush) for performance. They're written asynchronously and don't block API responses.

## Email System

### Configuration
Email is handled by `src/lib/email.ts` using Nodemailer with SMTP.

Required environment variables:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password
EMAIL_FROM="App Name" <noreply@domain.com>
```

### Available Email Templates
```typescript
import { sendEmail, emailTemplates } from '@/lib/email';

// Task assignment
await sendEmail(
  userEmail,
  'Task Assigned',
  emailTemplates.taskAssigned(userName, taskTitle, assignerName)
);

// Available templates:
// - taskAssigned(userName, taskTitle, assignerName)
// - taskReassigned(userName, taskTitle, oldAssignee, newAssignee)
// - taskUnassigned(userName, taskTitle, unassignerName)
// - commentMention(userName, commenterName, taskTitle, commentPreview)
// - dueDateReminder(userName, taskTitle, dueDate)
// - taskStatusUpdated(userName, taskTitle, oldStatus, newStatus, updaterName)
// - taskDateChanged(userName, taskTitle, changeType, oldDate, newDate, updaterName)
// - taskOverdue(userName, taskTitle, dueDate)
// - designComment(userName, commenterName, designTitle, commentPreview)
```

### Email Preferences
Check user preferences before sending:
```typescript
const userExt = await prisma.userExtension.findUnique({
  where: { userId }
});

if (userExt?.emailNotificationsEnabled) {
  await sendEmail(...);
}
```

## File Upload (AWS S3)

### S3 Operations
```typescript
import { uploadToS3, deleteFromS3, getSignedUrlForVideo } from '@/lib/aws';

// Upload file
const fileUrl = await uploadToS3(
  fileBuffer,
  'uploads/avatar-123.jpg',
  'image/jpeg'
);

// Delete file
await deleteFromS3('uploads/avatar-123.jpg');

// Get signed URL for video (1-hour expiry)
const videoUrl = await getSignedUrlForVideo('videos/demo.mp4');
```

Required environment variables:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET_NAME=your-bucket
```

## Notification System

### Creating Notifications
```typescript
await prisma.notification.create({
  data: {
    userId: recipientId,
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: `You have been assigned to "${taskTitle}"`,
    relatedTaskId: taskId,
    isRead: false
  }
});
```

### Notification Types
- `task_assigned` - User assigned to task
- `task_unassigned` - User unassigned from task
- `task_reassigned` - Task reassigned to different user
- `comment_mention` - User mentioned in comment (@mention)
- `task_status_updated` - Task status changed
- `due_date_reminder` - Task due date approaching
- `task_overdue` - Task is overdue

### Real-time Updates
The `DashboardLayout` component polls `/api/notifications` every 30 seconds to fetch new notifications and display unread count badge.

## Component Patterns

### DashboardLayout
Main application shell that wraps authenticated pages. Provides:
- Responsive sidebar with role-based menu filtering
- Header with search, notifications bell, user dropdown
- Automatic redirect to `/login` if not authenticated

Usage:
```tsx
import DashboardLayout from '@/components/DashboardLayout';

export default function MyPage() {
  return (
    <DashboardLayout>
      <div>Your page content</div>
    </DashboardLayout>
  );
}
```

### Conditional Rendering Based on Auth
The home page (`src/app/page.tsx`) demonstrates the pattern:
- Not logged in: Show landing page with login link
- Logged in: Show dashboard with DashboardLayout

```tsx
const { data: session, status } = useSession();

if (status === 'loading') return <LoadingSpinner />;
if (!session) return <LandingPage />;
return <DashboardLayout>...</DashboardLayout>;
```

## Environment Variables

### Required Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# NextAuth
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Custom JWT
JWT_SECRET=<random-secret>
JWT_EXPIRES_IN=7d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password
EMAIL_FROM="App Name" <noreply@domain.com>

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET_NAME=your-bucket

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Optional: PostgreSQL monitoring for Grafana
MONITORING_DB_URL=postgresql://...

# Environment
NODE_ENV=development
```

### Local Development
Create `.env.local` file in root directory with the above variables.

## Key Patterns & Conventions

### API Route Handler Pattern
All API routes should use this pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { withLogging } from '@/lib/withLogging';
import { withAudit, AuditAction, AuditEntity } from '@/lib/audit';
import prisma from '@/lib/prisma';

export const GET = withLogging(async (request: NextRequest) => {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Authorization (if needed)
    const userRole = session.user.role;
    if (!permissions.canAccessResource(userRole)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // 3. Business logic with audit logging
    const result = await withAudit(
      {
        userId: session.user.id,
        action: AuditAction.RESOURCE_READ,
        entity: AuditEntity.RESOURCE
      },
      async () => {
        return await prisma.resource.findMany({...});
      },
      request
    );

    // 4. Return response
    return NextResponse.json({ data: result });

  } catch (error) {
    console.error('Error in GET /api/resource:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
```

### Password Handling
Always use the auth utilities for password operations:

```typescript
import { hashPassword, verifyPassword } from '@/lib/auth';

// Registration
const hashedPassword = await hashPassword(plainPassword);

// Login
const isValid = await verifyPassword(plainPassword, hashedPassword);
```

**Never** store plain passwords or log password values.

### Client-Side Session Access
```tsx
'use client';
import { useSession } from 'next-auth/react';

export default function MyComponent() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;

  return <div>Welcome {session.user.name}</div>;
}
```

### Prisma Client Usage
Always import from the singleton:

```typescript
import prisma from '@/lib/prisma';

// Use prisma client
const users = await prisma.user.findMany();
```

**Never** create new `PrismaClient()` instances in your code.

## Common Tasks

### Adding a New API Endpoint
1. Create route file: `src/app/api/[your-route]/route.ts`
2. Use `withLogging` wrapper
3. Add authentication check with `getServerSession`
4. Add authorization check with `permissions`
5. Wrap operations with `withAudit` if needed
6. Handle errors gracefully

### Adding a New Database Model
1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <descriptive-name>`
3. Run `npx prisma generate`
4. Update TypeScript types if needed
5. Add audit logging for CRUD operations

### Adding a New Role Permission
1. Update `src/lib/permissions.ts`
2. Add new permission check function
3. Use in API route handlers
4. Update menu items in `DashboardLayout` if needed

### Adding a New Email Template
1. Add template function to `src/lib/email.ts` in `emailTemplates` object
2. Follow existing pattern with HTML styling
3. Use the template with `sendEmail()` function

### Adding a New Page
1. Create page file: `src/app/[route]/page.tsx`
2. Wrap with `DashboardLayout` if authenticated page
3. Use `useSession()` for client-side auth checks
4. Add to menu items in `DashboardLayout.tsx` if needed

## Security Considerations

### Authentication & Authorization
- Always check authentication with `getServerSession` in API routes
- Check authorization with `permissions` module before sensitive operations
- Use role hierarchy: superadmin > admin > lead > member > client

### Data Validation
- Use Zod schemas for input validation (see `src/lib/auth.ts` for examples)
- Validate on both client and server side

### Sensitive Data
- Never log passwords, tokens, or API keys
- Winston logger automatically redacts sensitive fields
- Use environment variables for secrets

### Database Access
- Use Prisma's parameterized queries (automatic SQL injection prevention)
- Add indexes for commonly queried fields
- Use transactions for multi-step operations

### Audit Trail
- Log all sensitive operations (user management, data changes)
- Include metadata for forensic analysis
- Use `withAudit` wrapper for automatic tracking

## Troubleshooting

### Database Connection Issues
Check `DATABASE_URL` in environment variables and ensure PostgreSQL is running.

### NextAuth Session Issues
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Clear browser cookies and retry

### Email Not Sending
- Verify SMTP credentials
- Check user's `emailNotificationsEnabled` setting
- Review Winston logs for errors

### Missing User Role
Check that `UserExtension` was created for the user. If not, create manually:
```typescript
await prisma.userExtension.create({
  data: {
    userId: user.id,
    role: 'client',
    emailNotificationsEnabled: false,
    dueDateRemindersEnabled: false
  }
});
```

### Audit Logs Not Appearing
Audit logs use a batch queue (10 logs/batch, 5s flush). Wait 5+ seconds and query again.

## Performance Considerations

### Database Queries
- Use `select` to limit returned fields
- Use `include` strategically to avoid N+1 queries
- Add database indexes for frequently queried fields
- Use pagination for large result sets

### Audit Logging
- Batch queue prevents database overload
- Logs are written asynchronously
- Archive old logs (90+ days) periodically

### File Uploads
- Use S3 for file storage (not database)
- Generate signed URLs for private files
- Set appropriate expiry times

### Logging
- Daily log rotation prevents disk space issues
- Structured JSON logs for easy parsing
- Separate error logs for quick debugging
