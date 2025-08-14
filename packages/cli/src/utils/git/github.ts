import { Octokit } from 'octokit';
import chalk from 'chalk';
import { Repository, GitHubConfig } from '../../git/types.js';
import { getConfig } from './config.js';

interface DeviceFlowResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface DeviceTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export class GitHubClient {
  private octokit: Octokit;
  private config: GitHubConfig;
  private clientId: string;
  private currentToken?: string;

  constructor(token?: string) {
    this.config = getConfig();
    this.clientId = process.env.GITHUB_CLIENT_ID || '';
    if (this.clientId === '') {
      throw new Error('GITHUB_CLIENT_ID is not set');
    }
    const authToken = token || this.config.token;
    this.currentToken = authToken;

    if (authToken) {
      this.octokit = new Octokit({
        auth: authToken,
      });
    } else {
      // Initialize without auth for device flow operations
      this.octokit = new Octokit();
    }
  }

  async initiateDeviceFlow(): Promise<DeviceFlowResponse> {
    try {
      const response = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `client_id=${this.clientId}&scope=repo,read:user,user:email`,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json() as DeviceFlowResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initiate device flow: ${errorMessage}`);
    }
  }

  async pollForToken(deviceCode: string, interval: number): Promise<string> {
    const pollInterval = 3000; //Math.max(interval, 5) * 1000; // Convert to milliseconds, minimum 5 seconds
    
    while (true) {
      try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `client_id=${this.clientId}&device_code=${deviceCode}&grant_type=urn:ietf:params:oauth:grant-type:device_code`,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as DeviceTokenResponse;
        
        // Debug: log the response for troubleshooting
        if (process.env.DEBUG) {
          console.log('Token poll response:', data);
        }

        if (data.access_token) {
          return data.access_token;
        }

        if (data.error === 'authorization_pending') {
          // User hasn't completed authorization yet, continue polling
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }

        if (data.error === 'slow_down') {
          // GitHub is asking us to slow down, increase interval
          await new Promise(resolve => setTimeout(resolve, pollInterval + 5000));
          continue;
        }

        if (data.error === 'expired_token') {
          throw new Error('Device code expired. Please try again.');
        }

        if (data.error === 'access_denied') {
          throw new Error('User denied access.');
        }

        throw new Error(`Unexpected error: ${data.error_description || data.error || JSON.stringify(data)}`);
      } catch (error) {
        if (error instanceof Error) {
          // Re-throw our custom errors directly
          if (error.message.includes('Device code expired') || 
              error.message.includes('User denied access') ||
              error.message.includes('Unexpected error')) {
            throw error;
          }
        }
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to poll for token: ${errorMessage}`);
      }
    }
  }

  async getUser() {
    try {
      this.ensureAuthenticated();
      const { data } = await this.octokit.rest.users.getAuthenticated();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get user information: ${errorMessage}`);
    }
  }

  private ensureAuthenticated() {
    if (!this.currentToken) {
      throw new Error('GitHub token is required. Please authenticate first using: mb git auth');
    }
  }

  async getUserRepositories(limit = 10): Promise<Repository[]> {
    try {
      this.ensureAuthenticated();
      const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: limit,
      });
      return data as Repository[];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch repositories: ${errorMessage}`);
    }
  }


  async getRepository(owner: string, repo: string): Promise<Repository> {
    try {
      this.ensureAuthenticated();
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });
      return data as Repository;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch repository: ${errorMessage}`);
    }
  }

  async searchRepositories(query: string, limit = 10): Promise<Repository[]> {
    try {
      this.ensureAuthenticated();
      const { data } = await this.octokit.rest.search.repos({
        q: query,
        sort: 'updated',
        per_page: limit,
      });
      return data.items as Repository[];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to search repositories: ${errorMessage}`);
    }
  }

  async createRepository(name: string, description?: string, isPrivate = false) {
    try {
      this.ensureAuthenticated();
      const params: any = {
        name,
        private: isPrivate,
      };
      
      if (description) {
        params.description = description;
      }
      
      const { data } = await this.octokit.rest.repos.createForAuthenticatedUser(params);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create repository: ${errorMessage}`);
    }
  }

  static formatRepository(repo: Repository): string {
    const privacy = repo.private ? chalk.red('private') : chalk.green('public');
    const language = repo.language ? chalk.blue(`[${repo.language}]`) : '';
    const stars = repo.stargazers_count > 0 ? chalk.yellow(`⭐ ${repo.stargazers_count}`) : '';
    const forks = repo.forks_count > 0 ? chalk.cyan(`🍴 ${repo.forks_count}`) : '';
    
    return [
      chalk.bold(repo.full_name),
      privacy,
      language,
      stars,
      forks,
      repo.description ? chalk.gray(repo.description) : '',
    ].filter(Boolean).join(' ');
  }
} 