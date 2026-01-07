# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LINE Dashboard is a Next.js 15 application for managing LINE messages and customer conversations. Built with TypeScript, React 19, Prisma ORM, PostgreSQL, and NextAuth.js for authentication. The application is in early development (Phase 1) with the database schema and infrastructure fully implemented.

## Essential Commands

### Development
```bash
npm run dev                    # Start Next.js dev server on localhost:3000
npm run build                  # Production build
npm run start                  # Start production server
npm run lint                   # Run ESLint
```

### Database Operations
```bash
npm run db:migrate             # Run Prisma migrations (creates/updates schema)
npm run db:studio              # Launch Prisma Studio (database GUI)
npm run db:seed                # Seed database with test data

# Useful Prisma commands
npx prisma generate            # Regenerate Prisma Client after schema changes
npx prisma migrate reset       # Reset database (dev only - destructive)
npx prisma db push             # Push schema changes without creating migration
```

### Docker Database
```bash
docker-compose up -d           # Start PostgreSQL container
docker-compose down            # Stop container
docker-compose logs -f         # View logs
```

### Testing Database Connection
```bash
psql -U postgres -h localhost -d line_dashboard    # Connect to PostgreSQL
```

## Code Architecture

### Framework & Structure
- **Next.js 15 App Router** (not Pages Router) - All routes in `src/app/`
- **TypeScript Path Alias**: `@/*` maps to `./src/*`
- **Language**: Japanese UI and documentation
- **Styling**: Tailwind CSS v3.4.1

### Key Directories
```
src/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Root layout with Inter font, Japanese lang
│   ├── page.tsx               # Homepage
│   ├── globals.css            # Tailwind + custom CSS variables
│   └── api/                   # API routes (not yet implemented)
├── components/                # React components (empty - Phase 2)
├── lib/
│   └── prisma.ts              # Prisma singleton (ALWAYS use this)
├── types/                     # TypeScript type definitions (empty)
└── hooks/                     # Custom hooks (empty)

prisma/
├── schema.prisma              # Database schema (authoritative source)
├── migrations/                # Auto-generated migration files
├── seed.ts                    # Test data seeding script
└── DATABASE_DESIGN.md         # Detailed schema documentation (Japanese)
```

### Database Connection Pattern

**CRITICAL**: Always import Prisma client from `@/lib/prisma` - never instantiate directly:

```typescript
import { prisma } from '@/lib/prisma'

// Good
const users = await prisma.user.findMany()

// Bad - will cause connection pool issues in dev
const prisma = new PrismaClient()
```

The singleton pattern prevents connection pool exhaustion during development hot-reloading.

## Database Schema Overview

### Core Models & Relationships

1. **User** (Internal Staff)
   - Roles: ADMIN, AGENT, VIEWER
   - Relations: assignedConversations, auditLogs
   - Seeded with 3 test users (see DATABASE_DESIGN.md for passwords)

2. **Contact** (LINE Users/Customers)
   - Unique: lineUserId (LINE's user identifier)
   - Relations: conversations, conversationTags
   - Fields: displayName, pictureUrl, followedAt, isBlocked, memo

3. **Conversation** (Message Threads)
   - Status: NEW, WORKING, PENDING, RESOLVED, CLOSED, NO_ACTION_NEEDED
   - Priority: HIGH, MEDIUM, LOW
   - Urgency: NOW, TODAY, THIS_WEEK, ANYTIME
   - ComplaintType: BILLING, QUALITY, DELAY, ATTITUDE, OTHER
   - **Optimistic Locking**: `version` field prevents concurrent update conflicts
   - Relations: contact, assignedUser, messages, tags, auditLogs
   - Critical fields: lastInboundAt, lastOutboundAt, lastMessagePreview, slaDeadline

4. **Message** (Sent/Received Messages)
   - Direction: INBOUND (customer → system), OUTBOUND (system → customer)
   - Unique: lineMessageId (LINE's message identifier)
   - Fields: text, timestamp, rawPayload (JSONB with full LINE webhook data)
   - Indexed on: conversationId, timestamp, direction

5. **Tag** (Conversation Classifications)
   - Unique: name
   - Seeded with: VIP (#FFD700), 要注意 (#FF0000), 継続中 (#00FF00), 解約候補 (#FFA500)

6. **ConversationTag** (Many-to-Many Junction)
   - Links conversations to tags
   - Unique constraint: (conversationId, tagId)

7. **AuditLog** (System Operation Tracking)
   - Tracks all system actions: who, what, when
   - Fields: action, changes (JSONB), ipAddress, userAgent
   - Relations: conversation (optional), user

### Important Schema Patterns

**Optimistic Locking**:
```typescript
// When updating conversations, use Prisma's version check:
await prisma.conversation.update({
  where: {
    id: conversationId,
    version: currentVersion  // Ensures no concurrent updates
  },
  data: {
    status: 'RESOLVED',
    version: { increment: 1 }  // Increment version
  }
})
```

**JSONB Fields**:
- `Message.rawPayload`: Store complete LINE webhook JSON for future parsing
- `AuditLog.changes`: Store before/after snapshots for audit trail

## LINE Integration Architecture

### Environment Variables
```env
LINE_CHANNEL_ACCESS_TOKEN=...   # For LINE Bot API
LINE_CHANNEL_SECRET=...         # For webhook signature verification
```

### Webhook Flow (To Be Implemented)
1. LINE sends events to `/api/webhook` endpoint
2. Verify webhook signature using LINE_CHANNEL_SECRET
3. Parse event, extract lineUserId and message text
4. Find or create Contact record
5. Find or create Conversation for contact
6. Store Message with direction=INBOUND, rawPayload, lineMessageId
7. Update Conversation.lastInboundAt, lastMessagePreview

### Message Storage
- Always store `lineMessageId` to prevent duplicate processing
- Store full webhook JSON in `rawPayload` for debugging/future features
- Link messages to conversations via `conversationId`

## Authentication (NextAuth.js)

### Configuration
```env
NEXTAUTH_SECRET=...            # Session encryption key (required)
NEXTAUTH_URL=http://localhost:3000   # Auth callback URL
```

### Implementation Status
- Infrastructure configured but handlers not yet implemented
- Intended setup: Credentials provider with email/password
- User passwords hashed with bcryptjs (10 rounds)
- Role-based access control via User.role enum

### Seeded Test Users
- admin@example.com / admin123 (ADMIN)
- agent@example.com / agent123 (AGENT)
- viewer@example.com / viewer123 (VIEWER)

## Development Guidelines

### When Working with Database
1. **Schema Changes**: Edit `prisma/schema.prisma`, then run `npm run db:migrate`
2. **After Schema Changes**: Run `npx prisma generate` to update Prisma Client
3. **Testing**: Use `npm run db:seed` to populate test data
4. **Debugging**: Use `npm run db:studio` for visual database inspection

### TypeScript Conventions
- Import types from `@prisma/client` after schema changes
- Use path alias `@/*` for all internal imports
- Strict mode enabled - all types must be explicit

### Database Query Patterns
```typescript
// Good - uses indexes
const conversations = await prisma.conversation.findMany({
  where: {
    status: 'NEW',              // indexed
    assignedUserId: userId      // indexed
  },
  orderBy: { lastInboundAt: 'desc' },  // indexed
  include: {
    contact: true,
    messages: { take: 10, orderBy: { timestamp: 'desc' } }
  }
})

// Use optimistic locking for updates
await prisma.conversation.update({
  where: { id, version: currentVersion },
  data: { status: 'WORKING', version: { increment: 1 } }
})
```

### Performance Considerations
- Indexed fields: status, assignedUserId, lastInboundAt, (priority, urgency)
- Avoid N+1 queries - use Prisma `include` or `select`
- JSONB fields (rawPayload, changes) support indexing if needed

## Docker Setup

PostgreSQL runs in Docker container via `docker-compose.yml`:
- Image: postgres:16-alpine
- Port: 5432 (mapped to host)
- Database: line_dashboard
- Credentials: postgres/postgres
- Volume: postgres_data (persistent)
- Health check enabled

## Environment Configuration

Copy `.env.example` to `.env` and configure:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/line_dashboard"
LINE_CHANNEL_ACCESS_TOKEN="..."
LINE_CHANNEL_SECRET="..."
NEXTAUTH_SECRET="..."           # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

## Current Development Status

**Phase 1: Infrastructure** (Complete)
- ✅ Database schema designed and migrated
- ✅ Prisma ORM configured with singleton pattern
- ✅ Next.js 15 App Router setup
- ✅ TypeScript strict mode configured
- ✅ Tailwind CSS integrated
- ✅ Docker PostgreSQL environment
- ✅ Seed data script

**Phase 2: Implementation** (Planned)
- ⏳ API routes (/api/webhook, /api/auth/[...nextauth], etc.)
- ⏳ Frontend components (conversations, messages, tags)
- ⏳ Authentication handlers (NextAuth.js)
- ⏳ LINE Bot SDK integration
- ⏳ Business logic (conversation assignment, status updates)

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep line-dashboard-db

# View logs
docker-compose logs -f postgres

# Test connection
psql -U postgres -h localhost -d line_dashboard
```

### Migration Issues
```bash
# If migrations are out of sync
npx prisma migrate reset       # Dev only - destroys data
npx prisma migrate deploy      # Production safe

# If Prisma Client is out of sync
npx prisma generate
```

### Common Errors
- **"PrismaClient is unable to run in this browser environment"**: Ensure you're using `@/lib/prisma` singleton, not direct import
- **"Can't reach database server"**: Check Docker container is running
- **"Migration failed"**: Check DATABASE_URL in .env matches running database

## Additional Resources

- **DATABASE_DESIGN.md**: Comprehensive database documentation (Japanese)
- **WORK_LOG.md**: Development history and progress tracking
- **README.md**: Setup instructions and project overview
- **prisma/schema.prisma**: Authoritative database schema definition
