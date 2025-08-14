export interface GitAuthOptions {
  token?: string;
}

export interface GitRepoOptions {
  limit?: string;
}

export interface GitCloneOptions {
  dir?: string;
}
export interface GitConfigOptions {
  token?: string;
  dir?: string;
  show?: boolean;
}

export interface GitStatus {
  current: string;
  tracking: string | null;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
} 

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  clone_url: string;
  ssh_url: string;
  html_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  owner: {
    login: string;
    type: string;
  };
}

export interface GitHubConfig {
  token?: string;
  username?: string;
  reposDir?: string;
  connectedRepo?: ConnectedRepository;
}

export interface ConnectedRepository {
  owner: string;
  name: string;
  fullName: string;
  cloneUrl: string;
  sshUrl: string;
  htmlUrl: string;
  defaultBranch: string;
  connectedAt: string;
}
