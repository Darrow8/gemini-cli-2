Perfect—since it’s a CLI, use GitHub’s OAuth 2.0 Device Flow (built for headless apps) and then mint your own app tokens tied to a user row in your DB.

What you’ll build

CLI flow (device code): CLI asks GitHub for a device code → user opens a URL and enters the short code → CLI polls until authorized → gets a GitHub access token. 
GitHub Docs

Server exchange: CLI sends that GH token to your backend. Your server verifies it with GET /user (+ GET /user/emails for a primary verified email), upserts your users row (keyed by GitHub’s numeric id), then issues your own access/refresh tokens, which the CLI stores locally. 
GitHub Docs
+1

1) GitHub setup (one-time)

Create an OAuth App (or a GitHub App if you want expiring+refreshable user tokens).

Enable Device Flow in the app settings.

For sign-in only, request scopes read:user user:email (minimal). 
GitHub Docs
+1

Device Flow endpoints & behavior:

Get codes: POST https://github.com/login/device/code

Poll for token: POST https://github.com/login/oauth/access_token (grant_type=urn:ietf:params:oauth:grant-type:device_code)

Respect interval, handle authorization_pending, slow_down, expired_token, etc. 
GitHub Docs

2) CLI: start Device Flow, then call your backend

Here’s a minimal TypeScript example using Octokit’s device-auth (works great in Node CLIs):

// cli/auth-login.ts
import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";
import fetch from "node-fetch";
import open from "open";
import fs from "fs";
import os from "os";
import path from "path";

const CLIENT_ID = process.env.GITHUB_CLIENT_ID!; // public in CLI is fine for device flow

export async function login() {
  const auth = createOAuthDeviceAuth({
    clientType: "oauth-app",
    clientId: CLIENT_ID,
    scopes: ["read:user", "user:email"],
    async onVerification(v) {
      console.log(`Open: ${v.verification_uri}`);
      console.log(`Enter code: ${v.user_code}`);
      try { await open(v.verification_uri); } catch {}
    },
  });

  const { token: ghToken } = await auth({ type: "oauth" }); // waits, handles polling
  // Send GitHub token to your backend to create/link a user + mint your tokens
  const r = await fetch("https://api.yourapp.com/v1/auth/github/exchange", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ access_token: ghToken }),
  });
  if (!r.ok) throw new Error(`Exchange failed: ${r.status}`);
  const { access_token, refresh_token } = await r.json();

  // store locally with strict perms
  const dir = path.join(os.homedir(), ".config", "yourapp");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "credentials.json"),
    JSON.stringify({ access_token, refresh_token }, null, 2),
    { mode: 0o600 }
  );
  console.log("Logged in.");
}

login().catch((e) => { console.error(e); process.exit(1); });


Octokit device auth lib: @octokit/auth-oauth-device / @octokit/oauth-methods. 
GitHub
+1

Device Flow details & errors/intervals: GitHub docs. 
GitHub Docs

3) Server: verify GH token, upsert user, mint your tokens

Example (Express + Octokit + Prisma-ish pseudocode):

// server/routes/auth.ts
import { Octokit } from "octokit";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../db";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function exchangeGithubToken(req, res) {
  const ghAccessToken = req.body?.access_token;
  if (!ghAccessToken) return res.status(400).json({ error: "missing_access_token" });

  // Verify with GitHub
  const gh = new Octokit({ auth: ghAccessToken });
  const { data: ghUser } = await gh.request("GET /user"); // has numeric id, login, avatar_url, etc.
  let email = ghUser.email ?? null;
  if (!email) {
    // requires user:email scope; pick primary+verified
    const { data: emails } = await gh.request("GET /user/emails");
    email = emails.find((e: any) => e.primary && e.verified)?.email ?? null;
  }

  // Upsert your user & account link (prefer GitHub numeric id)
  const user = await prisma.user.upsert({
    where: { githubId: String(ghUser.id) },
    update: { name: ghUser.name ?? ghUser.login, avatarUrl: ghUser.avatar_url, email },
    create: { githubId: String(ghUser.id), name: ghUser.name ?? ghUser.login, avatarUrl: ghUser.avatar_url, email },
  });

  // Mint your app tokens
  const access_token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "15m" });
  const refresh_raw = crypto.randomBytes(32).toString("hex");
  const refresh_hash = crypto.createHash("sha256").update(refresh_raw).digest("hex");

  await prisma.session.create({
    data: { userId: user.id, refreshTokenHash: refresh_hash, expiresAt: new Date(Date.now() + 1000*60*60*24*30) },
  });

  res.json({ access_token, refresh_token: refresh_raw });
}


GET /user & GET /user/emails requirements: user:email scope for the latter; public user.email is often null. 
GitHub Docs
+1

Store GitHub’s numeric id as the provider UID (stable; login can change). 
GitHub Docs

4) Minimal DB shape

users(id, github_id, email, name, avatar_url, …)

sessions(id, user_id, refresh_token_hash, expires_at)

(Optional) accounts(user_id, provider='github', provider_account_id, access_token_encrypted, refresh_token_encrypted, …) if you plan to call GitHub later.

5) Security checklist (CLI specifics)

Device Flow only needs client_id in the CLI (no secret). Respect interval and handle authorization_pending/slow_down/expired_token. 
GitHub Docs

Scopes: start with read:user user:email. Don’t ask for more unless needed. 
GitHub Docs

Local storage: write creds with 0600. Consider OS keychain (keytar) later.

Short-lived app access tokens + refresh tokens on your side; store refresh token hashed in DB.

If you build a GitHub App: you can get expiring user tokens (8h) + refresh tokens (6mo); store those server-side (encrypted). 
GitHub Docs
+1

Logout/revoke: optionally call GitHub’s revoke endpoints from your backend to invalidate the user’s GH token(s) (DELETE /applications/{client_id}/token or revoke the whole grant). 
GitHub Docs
+1

Optional alternative (browser pop-up instead of device code)

Run a local loopback server (127.0.0.1) and use the web OAuth flow with PKCE; GitHub supports loopback redirect URIs for native apps. Device Flow is simpler for CLIs, but loopback gives a smoother “auto-open & callback” UX. 
GitHub Docs

If you want this in Go or Python, or want me to slot this into your existing stack/DB, say the word and I’ll drop a tailored version.