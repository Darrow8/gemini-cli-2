/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GitHubAuth } from './github-auth.js';
import { saveCredentials, loadCredentials, clearCredentials, hasCredentials } from './credentials.js';
import { GitHubAuthCredentials } from './types.js';
import { MessageType } from '../ui/types.js';

export class AuthManager {
  private github = new GitHubAuth();
  private pendingDeviceAuth: any = null;

  async login(): Promise<void> {
    try {
      const result = await this.github.login();
      
      const credentials: GitHubAuthCredentials = {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      };

      saveCredentials(credentials);
      
      console.log(`👋 Welcome, ${result.user.name || result.user.login}!`);
      if (result.user.email) {
        console.log(`📧 Email: ${result.user.email}`);
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async loginWithUI(ui: any): Promise<void> {
    try {
      const result = await this.github.loginWithUI(ui);
      
      const credentials: GitHubAuthCredentials = {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      };

      saveCredentials(credentials);
      
      // Clear pending item once successful
      ui.setPendingItem(null);
      
      ui.addItem(
        {
          type: MessageType.INFO,
          text: `👋 Welcome, ${result.user.name || result.user.login}!${result.user.email ? `\n📧 Email: ${result.user.email}` : ''}`,
        },
        Date.now(),
      );
    } catch (error) {
      ui.setPendingItem(null);
      throw error;
    }
  }

  async logout(): Promise<void> {
    const credentials = loadCredentials();
    
    if (credentials) {
      try {
        await this.github.logout(credentials.access_token);
      } catch {
        // Ignore errors during logout
      }
    }
    
    clearCredentials();
    console.log('👋 Logged out successfully');
  }

  async getValidAccessToken(): Promise<string | null> {
    const credentials = loadCredentials();
    
    if (!credentials) {
      return null;
    }

    // Try to refresh the token if needed
    try {
      const refreshed = await this.github.refreshToken(credentials.refresh_token);
      
      const newCredentials: GitHubAuthCredentials = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
      };

      saveCredentials(newCredentials);
      return refreshed.access_token;
    } catch {
      // Refresh failed, clear invalid credentials
      clearCredentials();
      return null;
    }
  }

  isLoggedIn(): boolean {
    return hasCredentials();
  }

  async getDeviceCode(): Promise<any> {
    const deviceInfo = await this.github.getDeviceCode();
    return deviceInfo;
  }

  storeDeviceInfo(deviceInfo: any): void {
    this.pendingDeviceAuth = deviceInfo;
  }

  async completeLogin(): Promise<boolean> {
    if (!this.pendingDeviceAuth) {
      return false;
    }

    try {
      const result = await this.github.completeDeviceAuth(this.pendingDeviceAuth);
      
      const credentials: GitHubAuthCredentials = {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      };

      saveCredentials(credentials);
      this.pendingDeviceAuth = null;
      return true;
    } catch (error) {
      this.pendingDeviceAuth = null;
      return false;
    }
  }
}