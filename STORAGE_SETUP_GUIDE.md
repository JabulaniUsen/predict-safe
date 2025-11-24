# Storage Policy Setup Guide for Logo Bucket

## Step-by-Step Instructions

### 1. Create/Verify the Bucket
1. Go to **Supabase Dashboard** → **Storage**
2. If the `logo` bucket doesn't exist, click **"New bucket"**
   - Name: `logo`
   - Public bucket: **Yes** (toggle ON)
   - Click **"Create bucket"**

### 2. Set Up Policies

Go to **Storage** → **logo** → **Policies** tab

#### Policy 1: INSERT (Upload) - Copy this EXACTLY

**Click "New Policy"**

- **Policy name:** `Allow authenticated admins to upload logos`
- **Allowed operation:** `INSERT`
- **Target roles:** `authenticated`
- **Policy definition:**
  - **WITH CHECK expression** (paste this):
```sql
bucket_id = 'logo' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
```

#### Policy 2: UPDATE - Copy this EXACTLY

**Click "New Policy"**

- **Policy name:** `Allow authenticated admins to update logos`
- **Allowed operation:** `UPDATE`
- **Target roles:** `authenticated`
- **Policy definition:**
  - **USING expression:**
```sql
bucket_id = 'logo' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
```
  - **WITH CHECK expression:**
```sql
bucket_id = 'logo' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
```

#### Policy 3: DELETE - Copy this EXACTLY

**Click "New Policy"**

- **Policy name:** `Allow authenticated admins to delete logos`
- **Allowed operation:** `DELETE`
- **Target roles:** `authenticated`
- **Policy definition:**
  - **USING expression:**
```sql
bucket_id = 'logo' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
```

#### Policy 4: SELECT (Public Read) - Copy this EXACTLY

**Click "New Policy"**

- **Policy name:** `Allow public read access to logos`
- **Allowed operation:** `SELECT`
- **Target roles:** `public`
- **Policy definition:**
  - **USING expression:**
```sql
bucket_id = 'logo'
```

## Alternative: Simpler Policy (If Admin Check Doesn't Work)

If you're still getting errors, try this simpler policy first to test:

**INSERT Policy (Simplified):**
- **Policy name:** `Allow authenticated users to upload logos`
- **Allowed operation:** `INSERT`
- **Target roles:** `authenticated`
- **WITH CHECK expression:**
```sql
bucket_id = 'logo'
```

This allows ANY authenticated user to upload. Once it works, you can add the admin check back.

## Verify Your Admin Status

Run this in **Supabase SQL Editor**:

```sql
SELECT id, email, is_admin FROM users WHERE id = auth.uid();
```

Make sure `is_admin = true` for your user. If not, update it:

```sql
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
```

## Troubleshooting

1. **Still getting errors?** Try the simplified policy (without admin check) first
2. **Bucket not found?** Make sure the bucket name is exactly `logo` (lowercase)
3. **Policies not saving?** Make sure you're using the correct SQL syntax in the policy editor
4. **Admin check failing?** Verify your user has `is_admin = true` in the users table

