/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import fetch from 'node-fetch';
import { ServerAuthResponse } from './types.js';
import dotenv from 'dotenv';
dotenv.config({ path: process.cwd() + '/.env', quiet: true });
import open from 'open';

const CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'your-github-client-id';
const SERVER_URL = process.env.MAINBASE_SERVER_URL || 'https://api.mainbase.com';

export class GitHubAuth {
  private pendingAuth: any = null;

  async getDeviceCode(): Promise<any> {
    const { createOAuthDeviceAuth } = await import('@octokit/auth-oauth-device');
    
    return new Promise((resolve) => {
      let authPromise: Promise<any>;
      
      // Create auth instance but don't complete it yet
      const auth = createOAuthDeviceAuth({
        clientType: 'oauth-app',
        clientId: CLIENT_ID,
        scopes: ['read:user', 'user:email'],
        onVerification: (verification) => {
          // Store everything for later completion
          this.pendingAuth = { 
            auth, 
            verification,
            authPromise
          };
          // Resolve with the verification info immediately
          resolve(verification);
        },
      });

      // Start the auth flow to trigger onVerification
      authPromise = auth({ type: 'oauth' });
      
      // Store the promise so we can await it later in completeDeviceAuth
      authPromise.catch(() => {
        // Ignore errors here - user may not complete auth
      });
    });
  }

  async completeDeviceAuth(deviceInfo: any): Promise<ServerAuthResponse> {
    if (!this.pendingAuth?.authPromise) {
      throw new Error('No pending authentication');
    }

    // Wait for the user to complete OAuth
    const { token: ghToken } = await this.pendingAuth.authPromise;

    // Exchange GitHub token with backend
    const response = await fetch(`${SERVER_URL}/v1/auth/github/exchange`, {
      method: 'POST',
      headers: { 
        'content-type': 'application/json',
        'user-agent': 'mainbase-cli'
      },
      body: JSON.stringify({ access_token: ghToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server exchange failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as ServerAuthResponse;
    this.pendingAuth = null;
    
    return result;
  }

  async login(): Promise<ServerAuthResponse> {
    console.log('🔐 Starting GitHub authentication...');
    const auth = createOAuthDeviceAuth({
      clientType: 'oauth-app',
      clientId: CLIENT_ID,
      scopes: ['read:user', 'user:email'],
      async onVerification(verification) {
        console.log(`\n🔐 GitHub Device Authorization`);
        console.log(`═══════════════════════════════`);
        console.log(`Steps:`);
        console.log(`1. Go to: ${verification.verification_uri}`);
        console.log(`2. Enter this code: ${verification.user_code}`);
        console.log(`3. Authorize the application\n`);
        console.log(`Opening browser...`);
        try {
          await open(verification.verification_uri);
        } catch {
          console.log(`⚠️  Could not auto-open browser. Please manually open the URL above.`);
        }
      },
    });

    console.log('⏳ Waiting for authorization...');
    const { token: ghToken } = await auth({ type: 'oauth' });

    console.log('🔄 Exchanging GitHub token with server...');
    
    // Exchange GitHub token with backend
    const response = await fetch(`${SERVER_URL}/v1/auth/github/exchange`, {
      method: 'POST',
      headers: { 
        'content-type': 'application/json',
        'user-agent': 'mainbase-cli'
      },
      body: JSON.stringify({ access_token: ghToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server exchange failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as ServerAuthResponse;
    console.log('✅ Authentication successful!');

    return result;
  }

  async loginWithUI(ui: any): Promise<ServerAuthResponse> {
    console.log('🔐 Starting GitHub authentication...');

    const auth = createOAuthDeviceAuth({
      clientType: 'oauth-app',
      clientId: CLIENT_ID,
      scopes: ['read:user', 'user:email'],
      async onVerification(verification) {
        // Import MessageType at top of file
        const MessageType = { INFO: 'info' };
        
        // Set pending item with device code info
        ui.setPendingItem({
          type: MessageType.INFO,
          text: `🔐 GitHub Device Authorization\n\n📱 DEVICE CODE: ${verification.user_code}\n🌐 URL: ${verification.verification_uri}\n⏰ Expires in ${Math.floor(verification.expires_in / 60)} minutes\n\nSteps:\n1. Go to: ${verification.verification_uri}\n2. Enter this code: ${verification.user_code}\n3. Authorize the application`,
        });

        // Don't open browser automatically - let user do it manually
        // This prevents UI issues
      },
    });

    console.log('⏳ Waiting for authorization...');
    const { token: ghToken } = await auth({ type: 'oauth' });

    console.log('🔄 Exchanging GitHub token with server...');
    
    // Exchange GitHub token with backend
    const response = await fetch(`${SERVER_URL}/v1/auth/github/exchange`, {
      method: 'POST',
      headers: { 
        'content-type': 'application/json',
        'user-agent': 'mainbase-cli'
      },
      body: JSON.stringify({ access_token: ghToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server exchange failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as ServerAuthResponse;
    console.log('✅ Authentication successful!');

    return result;
  }

  async refreshToken(refreshToken: string): Promise<ServerAuthResponse> {
    const response = await fetch(`${SERVER_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 
        'content-type': 'application/json',
        'user-agent': 'mainbase-cli'
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    return await response.json() as ServerAuthResponse;
  }

  async logout(accessToken: string): Promise<void> {
    try {
      await fetch(`${SERVER_URL}/v1/auth/logout`, {
        method: 'POST',
        headers: { 
          'authorization': `Bearer ${accessToken}`,
          'user-agent': 'mainbase-cli'
        },
      });
    } catch {
      // Ignore errors during logout
    }
  }
}