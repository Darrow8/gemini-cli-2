/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { GitHubAuthCredentials } from './types.js';

const CREDENTIALS_DIR = path.join(os.homedir(), '.config', 'mainbase-cli');
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, 'credentials.json');

export function saveCredentials(credentials: GitHubAuthCredentials): void {
  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
  fs.writeFileSync(
    CREDENTIALS_FILE,
    JSON.stringify(credentials, null, 2),
    { mode: 0o600 }
  );
}

export function loadCredentials(): GitHubAuthCredentials | null {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      return null;
    }
    const data = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      fs.unlinkSync(CREDENTIALS_FILE);
    }
  } catch {
    // Ignore errors when clearing credentials
  }
}

export function hasCredentials(): boolean {
  return loadCredentials() !== null;
}