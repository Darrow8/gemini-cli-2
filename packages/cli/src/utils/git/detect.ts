import { execSync } from 'child_process';
import path from 'path';

export function isInGitRepository(): boolean {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function getRepositoryInfo(): { origin?: string; owner?: string; repo?: string } | null {
  if (!isInGitRepository()) {
    return null;
  }

  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { 
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    // Parse GitHub URL (both HTTPS and SSH formats)
    const httpsMatch = remoteUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?$/);
    const sshMatch = remoteUrl.match(/git@github\.com:([^\/]+)\/([^\/]+)(?:\.git)?$/);
    
    const match = httpsMatch || sshMatch;
    if (match) {
      const [, owner, repo] = match;
      return {
        origin: remoteUrl,
        owner,
        repo: repo.endsWith('.git') ? repo.slice(0, -4) : repo
      };
    }
  } catch {
    // Failed to get remote URL
  }

  return { origin: 'unknown' };
}

export function getCurrentDirectoryName(): string {
  return path.basename(process.cwd());
}

export function getRepositoryRoot(): string | null {
  if (!isInGitRepository()) {
    return null;
  }

  try {
    const gitDir = execSync('git rev-parse --show-toplevel', { 
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
    return gitDir;
  } catch {
    return null;
  }
}