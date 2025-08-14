import chalk from 'chalk';
import ora from 'ora';
import { GitHubClient } from '../utils/git/github.js';
import { GitRepoOptions } from './types.js';

export default async function repoCommand(options: GitRepoOptions): Promise<void> {
  try {
    const limitNum = parseInt(options.limit || '10', 10);

    console.log(chalk.blue('📚 Fetching your repositories...'));
    
    const spinner = ora('Loading repositories').start();
    const client = new GitHubClient();
    
    const repositories = await client.getUserRepositories(limitNum);
    const user = await client.getUser();
    const title = `${user.login}'s Repositories`;

    spinner.stop();

    if (repositories.length === 0) {
      console.log(chalk.yellow('📭 No repositories found.'));
      return;
    }

    console.log();
    console.log(chalk.bold.blue(`📋 ${title} (${repositories.length})`));
    console.log(chalk.gray('─'.repeat(60)));

    repositories.forEach((repo, index) => {
      const number = chalk.gray(`${index + 1}.`.padStart(3));
      console.log(`${number} ${GitHubClient.formatRepository(repo)}`);
    });

    console.log();
    console.log(chalk.gray(`💡 Use 'mb git clone <repo>' to clone a repository`));
    console.log(chalk.gray(`💡 Use 'mb git status <repo>' to get repository information`));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('❌ Failed to fetch repositories:'), errorMessage);
    
    if (errorMessage.includes('GitHub token is required')) {
      console.log(chalk.yellow('💡 Run "mb git auth" to authenticate with GitHub'));
    }
    
    process.exit(1);
  }
} 