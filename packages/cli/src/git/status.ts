import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { simpleGit, SimpleGit } from 'simple-git';
import { GitHubClient } from '../utils/git/github.js';
import { getConfig } from '../utils/git/config.js';

export default async function statusCommand(repoName?: string): Promise<void> {
  try {
    let owner: string;
    let repo: string;
    let localPath: string = process.cwd();

    if (repoName) {
      // Repository specified as argument
      if (repoName.includes('/')) {
        [owner, repo] = repoName.split('/');
      } else {
        const client = new GitHubClient();
        const user = await client.getUser();
        owner = user.login;
        repo = repoName;
      }
    } else {
      // Try to detect from current directory
      const git: SimpleGit = simpleGit(localPath);
      
      if (!fs.existsSync(path.join(localPath, '.git'))) {
        // Not in a git repository, check for connected repository
        const config = getConfig();
        if (config.connectedRepo) {
          console.log(chalk.blue(`🔗 Using connected repository: ${config.connectedRepo.fullName}`));
          owner = config.connectedRepo.owner;
          repo = config.connectedRepo.name;
        } else {
          console.error(chalk.red('❌ Not in a git repository and no repository specified'));
          console.log(chalk.yellow('💡 Usage: mb git status [owner/repo] or run from within a git repository'));
          console.log(chalk.yellow('💡 Or use "mb git connect owner/repo" to set a default repository'));
          process.exit(1);
        }
      } else {
        // In a git repository, try to get remote info
        try {
          const remotes = await git.getRemotes(true);
          const origin = remotes.find(remote => remote.name === 'origin');
          
          if (!origin || !origin.refs.fetch) {
            throw new Error('No origin remote found');
          }

          const match = origin.refs.fetch.match(/github\.com[:/](.+)\/(.+?)(?:\.git)?$/);
          if (!match) {
            throw new Error('Origin remote is not a GitHub repository');
          }

          [, owner, repo] = match;
        } catch (error) {
          console.error(chalk.red('❌ Could not determine GitHub repository from current directory'));
          console.log(chalk.yellow('💡 Please specify repository: mb git status owner/repo'));
          process.exit(1);
        }
      }
    }

    const fullRepoName = `${owner}/${repo}`;
    console.log(chalk.blue(`📊 Repository Status: ${fullRepoName}`));

    const spinner = ora('Fetching repository information').start();

    // Get GitHub repository information
    const client = new GitHubClient();
    const repository = await client.getRepository(owner, repo);

    spinner.text = 'Checking local git status...';

    // Check local git status if we're in a repository
    let gitStatus = null;
    let localBranch = null;
    let hasLocalRepo = false;

    try {
      const git: SimpleGit = simpleGit(localPath);
      
      if (fs.existsSync(path.join(localPath, '.git'))) {
        hasLocalRepo = true;
        const status = await git.status();
        const branch = await git.branch();
        
        gitStatus = status;
        localBranch = branch.current;
      }
    } catch (error) {
      // Local git operations failed, but we can still show GitHub info
    }

    spinner.succeed();

    console.log();
    console.log(chalk.bold('📋 GitHub Repository Information:'));
    console.log(`${chalk.gray('Full Name:')} ${chalk.bold(repository.full_name)}`);
    console.log(`${chalk.gray('Description:')} ${repository.description || 'No description'}`);
    console.log(`${chalk.gray('Homepage:')} ${repository.html_url}`);
    console.log(`${chalk.gray('Language:')} ${repository.language || 'Not specified'}`);
    console.log(`${chalk.gray('Stars:')} ${chalk.yellow(repository.stargazers_count)}`);
    console.log(`${chalk.gray('Forks:')} ${chalk.cyan(repository.forks_count)}`);
    console.log(`${chalk.gray('Default Branch:')} ${chalk.green(repository.default_branch)}`);
    console.log(`${chalk.gray('Privacy:')} ${repository.private ? chalk.red('Private') : chalk.green('Public')}`);
    console.log(`${chalk.gray('Last Updated:')} ${new Date(repository.updated_at).toLocaleDateString()}`);

    if (hasLocalRepo && gitStatus) {
      console.log();
      console.log(chalk.bold('📂 Local Repository Status:'));
      console.log(`${chalk.gray('Current Branch:')} ${chalk.green(localBranch || 'unknown')}`);
      console.log(`${chalk.gray('Working Directory:')} ${gitStatus.files.length === 0 ? chalk.green('Clean') : chalk.yellow('Modified')}`);
      
      if (gitStatus.ahead > 0) {
        console.log(`${chalk.gray('Ahead:')} ${chalk.blue(`${gitStatus.ahead} commit(s)`)}`);
      }
      
      if (gitStatus.behind > 0) {
        console.log(`${chalk.gray('Behind:')} ${chalk.red(`${gitStatus.behind} commit(s)`)}`);
      }

      if (gitStatus.files.length > 0) {
        console.log();
        console.log(chalk.bold('📝 File Changes:'));
        
        gitStatus.files.forEach(file => {
          let statusIcon = '';
          let statusColor = chalk.gray;
          
          if (file.index === 'M' || file.working_dir === 'M') {
            statusIcon = '📝';
            statusColor = chalk.yellow;
          } else if (file.index === 'A' || file.working_dir === 'A') {
            statusIcon = '➕';
            statusColor = chalk.green;
          } else if (file.index === 'D' || file.working_dir === 'D') {
            statusIcon = '➖';
            statusColor = chalk.red;
          } else if (file.working_dir === '?') {
            statusIcon = '❓';
            statusColor = chalk.blue;
          }
          
          console.log(`   ${statusIcon} ${statusColor(file.path)}`);
        });
      }
    } else if (!hasLocalRepo) {
      console.log();
      console.log(chalk.gray('💡 Not in a local repository. Use "mb git clone" to clone this repository.'));
    }

    console.log();
    console.log(chalk.blue('🔗 Quick Actions:'));
    console.log(chalk.gray(`   Clone: mb git clone ${fullRepoName}`));
    console.log(chalk.gray(`   View on GitHub: ${repository.html_url}`));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('❌ Failed to get repository status:'), errorMessage);
    
    if (errorMessage.includes('Not Found')) {
      console.log(chalk.yellow(`💡 Repository '${repoName}' not found or you don't have access to it.`));
    } else if (errorMessage.includes('GitHub token is required')) {
      console.log(chalk.yellow('💡 Run "mb git auth" to authenticate with GitHub'));
    }
    
    process.exit(1);
  }
} 