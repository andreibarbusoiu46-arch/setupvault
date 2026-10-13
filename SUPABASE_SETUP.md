# Supabase setup

Everything you need to get SetupVault talking to your own Supabase project.
Follow it top to bottom; it takes about ten minutes.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Fill in:
   - **Name** — `setupvault` (anything you like)
   - **Database password** — generate a strong one and save it in your password
     manager. You will not need it for this app, but you cannot recover it.
   - **Region** — pick the one closest to your users.
4. Click **Create new project** and wait for provisioning to finish (1–2 minutes).

---

## 2. Collect your keys

In the Supabase dashboard go to **Project Settings → API**. You need three values:

| Dashboard label | Goes into | Safe in the browser? |
| --- | --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `anon` / `publishable` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `service_role` / `secret` key | `SUPABASE_SERVICE_ROLE_KEY` | **No — server only** |

The `anon` key is designed to be public. It is only useful in combination with
Row Level Security, which step 3 switches on.

The `service_role` key **bypasses Row Level Security entirely**. It is used by
exactly one file in this project (`app/api/account/route.ts`, for account
deletion) and must never be prefixed with `NEXT_PUBLIC_`.

---

## 3. Create the database schema

1. In the dashboard, open **SQL Editor → New query**.
2. Open `supabase/migrations/0001_init.sql` from this repository.
3. Copy the whole file, paste it into the editor, and click **Run**.
4. Repeat with `supabase/migrations/0002_storage.sql` — this creates the private
   bucket that holds setup screenshots, and its access policies.

You should see `Success. No rows returned` for both. The scripts are safe to run
more than once.

### What the script creates

- **Enums** for subscription tier, theme, market, direction and result.
- **`profiles`** — one row per user, linked to `auth.users` with
  `on delete cascade`. Holds name, avatar, bio, plan and preferences.
- **`setups`** — the core SetupVault entity, with every field the library needs
  (ticker, market, direction, date/time, entry, stop, target, risk-to-reward,
  result, strategy, notes, tags, screenshot path, favourite flag). The table is
  created now so Phase 2 adds the UI without a schema rewrite.
- **Indexes** matching how the library is read: by owner and recency, then
  narrowed by favourite, market, result, ticker or tag.
- **Triggers** — `updated_at` maintenance, automatic profile creation on signup,
  and profile email sync when a user changes their address.
- **Row Level Security** on both tables, with owner-only policies.
- **Grants**, including `REVOKE UPDATE` on columns a user must not set for
  themselves (`subscription_tier`, `created_at`, `user_id`).

### What `0002_storage.sql` creates

- A **private** bucket `setup-screenshots`, capped at 5 MB per file and limited
  to `image/png`, `image/jpeg` and `image/webp`. Private, not public: images are
  served through signed URLs that expire after an hour, so a leaked path does
  not expose the file.
- **Four storage policies.** Objects are stored at
  `<user_id>/<setup_id>/<filename>`, and each policy compares the first path
  segment against `auth.uid()`. Postgres decides who owns a file; the browser is
  never asked.

---

## 4. Configure authentication

Go to **Authentication → URL Configuration**:

- **Site URL** — `http://localhost:3000` for local development. Change it to
  your real domain before going live.
- **Redirect URLs** — add both of these:
  - `http://localhost:3000/auth/confirm`
  - `http://localhost:3000/auth/callback`

  Add the production equivalents (`https://yourdomain.com/auth/confirm` and
  `.../auth/callback`) when you deploy.

Then go to **Authentication → Providers → Email** and decide one thing:

- **Confirm email ON** (the default, and what you want in production) — new users
  receive a confirmation link before they can sign in. The app shows
  "Check your inbox" after signup.
- **Confirm email OFF** — handy while developing locally. Signup signs the user
  straight in and lands them on the dashboard. The app handles both cases.

> Supabase's built-in email service is heavily rate limited and is for testing
> only. Configure your own SMTP provider under **Project Settings → Auth → SMTP**
> before real users arrive.

---

## 5. Set your environment variables

In the project root:

```bash
cp .env.example .env.local
```

Open `.env.local` and paste in the values from step 2:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://yourprojectref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.local` is gitignored. Never commit it.

If a required variable is missing, the app fails with a message naming the
variable rather than a stack trace.

---

## 6. Run the project

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

---

## 7. Verify it works

Work through this list in order. Each step checks a different layer.

**Signup and profile creation**

1. Go to `/signup` and create an account.
2. If email confirmation is on, open the link in your inbox.
3. In Supabase, open **Table Editor → profiles**. There should be exactly one
   row, with your email and the name you entered.
   - If the table is empty, the `on_auth_user_created` trigger did not fire —
     re-run `0001_init.sql`, which also backfills existing users.

**Row Level Security**

1. In **Table Editor → profiles**, confirm the green **RLS enabled** badge.
2. Open **SQL Editor** and run:

   ```sql
   select tablename, rowsecurity from pg_tables
   where schemaname = 'public' and tablename in ('profiles', 'setups');
   ```

   Both rows must show `rowsecurity = true`.

3. Check the policies are in place:

   ```sql
   select tablename, policyname, cmd from pg_policies
   where schemaname = 'public' order by tablename, policyname;
   ```

   You should see three policies on `profiles` and four on `setups`.

**Protected routes**

1. Sign out.
2. Visit `/dashboard` directly. You should be redirected to
   `/login?redirectTo=%2Fdashboard`.
3. Sign in. You should land back on the dashboard.

**Profile updates**

1. Go to `/profile`, change your name, and click **Save changes**.
2. Confirm the toast appears and the name in the top bar updates.
3. Check the row changed in **Table Editor → profiles** and that `updated_at`
   moved.

**Setups and screenshots**

1. Go to `/setups` and click **New setup**. Fill in the form and save.
2. Check **Table Editor → setups** — the row is there, with your `user_id`.
3. Open the setup, click **Edit**, attach a screenshot, save.
4. Check **Storage → setup-screenshots**. The file sits under
   `<your-user-id>/<setup-id>/`.
   - "Bucket not found" means `0002_storage.sql` has not been run.
5. Star the setup, then open `/favorites` — it should be listed.
6. Delete the setup from its detail page, then confirm both the row and the
   storage folder are gone.

**Password reset**

1. Sign out, go to `/forgot-password`, submit your email.
2. Open the link in the email. It should land you on `/reset-password` with the
   form enabled.
3. Set a new password and confirm you are signed in.

**Account deletion**

1. Go to `/settings`, scroll to **Delete this account**, type `DELETE`, confirm.
2. Check **Authentication → Users**: the user is gone.
3. Check **Table Editor → profiles**: the row is gone too (cascade).
   - A 503 with "Account deletion is not configured" means
     `SUPABASE_SERVICE_ROLE_KEY` is missing from `.env.local`. Restart the dev
     server after adding it.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| "The database is not ready yet" screen | Schema not created | Run `0001_init.sql` |
| Signed in but no profile row | Account predates the schema | Re-run `0001_init.sql`; it backfills |
| "Missing environment variable: …" | Value absent from `.env.local` | Add it and restart the dev server |
| Auth email link says "invalid" | Redirect URL not allow-listed | Add `/auth/confirm` and `/auth/callback` in URL Configuration |
| Email links point at localhost in production | `NEXT_PUBLIC_SITE_URL` unset | Set it to your domain and update Site URL in Supabase |
| Delete account returns 503 | Service role key missing | Add `SUPABASE_SERVICE_ROLE_KEY` and restart |
| "Screenshot storage is not set up yet" | Bucket missing | Run `0002_storage.sql` |
| Screenshot uploads but never displays | Bucket was made public, or policies missing | Re-run `0002_storage.sql` |
| "That image is too large" | Over the 5 MB cap | Export the chart smaller |
| "Too many emails requested" | Supabase's built-in SMTP rate limit | Configure your own SMTP provider |

---

## 9. Regenerating types (optional)

`types/database.ts` is hand-maintained to match the migration. Once you have the
Supabase CLI linked you can generate it instead:

```bash
npx supabase login
npx supabase link --project-ref yourprojectref
npx supabase gen types typescript --linked > types/database.ts
```

The generated shape matches what is there now, so nothing else needs to change.
