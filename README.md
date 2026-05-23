# Complify

A web app that lets you sign in with Google, import files from Google Drive, and generate AI-powered summaries using OpenAI.

## Features

- Google OAuth sign-in
- Browse and import files from Google Drive using the Google Picker
- Caches file snapshots via Vercel Blob
- AI summaries powered by GPT-4o-mini
- File table with Drive links, sync status, cached copies, and actions (Refresh from Drive, Regenerate Summary)

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **NextAuth v4** — Google OAuth, JWT sessions, Prisma adapter
- **Prisma + PostgreSQL** — local or Neon (cloud)
- **Vercel Blob** — cached file storage
- **OpenAI SDK** — GPT-4o-mini summaries
- **Tailwind CSS**

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a Neon connection string)
- A Google Cloud project with OAuth 2.0 credentials
- An OpenAI API key
- A Vercel account (free) with a Blob store created

---

### 1. Clone the repo

```bash
git clone <repo-url>
cd complify
npm install
```

### 2. Set up Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Drive API** and **Google Picker API**
4. Go to **APIs & Services → Credentials**
5. Create an **OAuth 2.0 Client ID** (Web application):
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Create an **API Key** (restrict it to the Google Picker API)
7. Go to **OAuth consent screen** and add yourself as a test user

### 3. Set up Vercel Blob

1. Go to your [Vercel dashboard](https://vercel.com/) → **Storage → Create Database → Blob**
2. Copy the `BLOB_READ_WRITE_TOKEN` from the store settings

### 4. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
# PostgreSQL — local example:
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/complify"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=""   # generate with: openssl rand -base64 32

# Google OAuth (from step 2)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Google API Key for Picker (from step 2)
NEXT_PUBLIC_GOOGLE_API_KEY=""

# OpenAI
OPENAI_API_KEY=""

# Vercel Blob (from step 3)
BLOB_READ_WRITE_TOKEN=""
```

### 5. Set up the database

```bash
npm run db:push
```

This creates all tables in your PostgreSQL database using the Prisma schema.

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

1. Sign in with your Google account
2. Click **Import from Google Drive** to open the file picker
3. Select one or more files (Docs, Sheets, PDFs, Word files, etc.)
4. The app downloads and caches each file, then generates an AI summary
5. Use **Refresh** to pull the latest version from Drive
6. Use **Regenerate Summary** to re-run the AI summary on the cached copy

## Database Management

```bash
npm run db:studio   # Open Prisma Studio (visual DB browser)
npm run db:push     # Push schema changes to the database
npm run db:generate # Regenerate Prisma client after schema changes
```
