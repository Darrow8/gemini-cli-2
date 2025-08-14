/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, SlashCommand, SlashCommandActionReturn } from './types.js';
import { AuthManager } from '../../auth/auth-manager.js';

export const authCommand: SlashCommand = {
  name: 'auth',
  description: 'authenticate with GitHub',
  kind: CommandKind.BUILT_IN,
  action: async (context, args): Promise<SlashCommandActionReturn> => {
    const authManager = new AuthManager();
    const argsParts = args.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const subcommand = argsParts[0];

    try {
      if (subcommand === 'login') {
        if (authManager.isLoggedIn()) {
          return { type: 'message', messageType: 'info', content: 'Already logged in. Use /auth logout first to re-authenticate.' };
        }
        
        // Temporarily restore console.log for auth flow
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleInfo = console.info;
        
        // Restore original console methods with proper formatting
        console.log = (...args: any[]) => {
          const output = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' ') + '\n';
          process.stdout.write(output);
        };
        console.error = (...args: any[]) => {
          const output = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' ') + '\n';
          process.stderr.write(output);
        };
        console.info = console.log;
        
        try {
          await authManager.login();
          
          // Restore patched console
          console.log = originalConsoleLog;
          console.error = originalConsoleError;
          console.info = originalConsoleInfo;
          
          return { type: 'message', messageType: 'info', content: 'Login successful!' };
        } catch (error) {
          // Restore patched console on error too
          console.log = originalConsoleLog;
          console.error = originalConsoleError;
          console.info = originalConsoleInfo;
          throw error;
        }
      }
      
      if (subcommand === 'logout') {
        if (!authManager.isLoggedIn()) {
          return { type: 'message', messageType: 'info', content: 'Not currently logged in.' };
        }

        await authManager.logout();
        return { type: 'message', messageType: 'info', content: 'Logout successful!' };
      }

      if (subcommand === 'status') {
        if (authManager.isLoggedIn()) {
          const token = await authManager.getValidAccessToken();
          if (token) {
            return { type: 'message', messageType: 'info', content: '✅ Logged in and token is valid' };
          } else {
            return { type: 'message', messageType: 'error', content: '❌ Logged in but token is invalid. Please login again.' };
          }
        } else {
          return { type: 'message', messageType: 'info', content: '❌ Not logged in' };
        }
      }

      // Default action - show usage
      const usage = 'GitHub Authentication Commands:\n' +
                   '  /auth login  - Log in with GitHub\n' +
                   '  /auth logout - Log out\n' +
                   '  /auth status - Check authentication status';
      
      return { type: 'message', messageType: 'info', content: usage };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { type: 'message', messageType: 'error', content: `Authentication command failed: ${errorMessage}` };
    }
  },
};
