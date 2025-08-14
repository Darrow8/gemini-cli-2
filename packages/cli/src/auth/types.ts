/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GitHubAuthCredentials {
  access_token: string;
  refresh_token: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

export interface GitHubDeviceFlowResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface ServerAuthResponse {
  access_token: string;
  refresh_token: string;
  user: GitHubUser;
}