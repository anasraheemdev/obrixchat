# ObrixChat 💬

A real-time, multi-user chat application with a single-root directory structure.

## Tech Stack
- **Frontend**: React (Vite)
- **Backend**: Node.js + Express
- **Real-time**: Socket.IO
- **Database/Auth**: Supabase
- **Styling**: Tailwind CSS

## Prerequisites
1. Create a project on [Supabase](https://supabase.com).
2. Run the following SQL in your Supabase SQL Editor to set up the tables:

```sql
-- Users Table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chats Table
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_1_email TEXT NOT NULL,
  user_2_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages Table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Disable RLS for quick testing or configure appropriate policies.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated access (Simple Policies)
CREATE POLICY "Public users can see each other" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can create chats" ON public.chats FOR INSERT WITH CHECK (auth.email() = user_1_email OR auth.email() = user_2_email);
CREATE POLICY "Users can see their own chats" ON public.chats FOR SELECT USING (auth.email() = user_1_email OR auth.email() = user_2_email);
CREATE POLICY "Users can see messages in their chats" ON public.messages FOR SELECT 
USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND (chats.user_1_email = auth.email() OR chats.user_2_email = auth.email())));
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT 
WITH CHECK (sender_email = auth.email());
```

## Setup
1. Fill your Supabase credentials in `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

## Development
- Frontend runs on: `http://localhost:5173` (proxied to backend)
- Backend runs on: `http://localhost:3001`
- Socket.IO port: `3001`
