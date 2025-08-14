import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { GitHubClient } from '../utils/git/github.js';
import { updateConfig, getConfig } from '../utils/git/config.js';
import { Repository } from './types.js';

export interface GitConnectOptions {
  repo?: string;
  save?: boolean;
}

export default async function connectCommand(repo?: string, options: GitConnectOptions = {}): Promise<void> {
  try {
    let targetRepo = repo || options.repo;

    // If no repo provided, ask user to input one
    if (!targetRepo) {
      console.log(chalk.blue('🔗 Connect to a GitHub Repository'));
      console.log(chalk.gray('Specify the repository in owner/repo format (e.g., microsoft/vscode)'));
      console.log();

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'repository',
          message: 'Enter repository (owner/repo):',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Repository cannot be empty';
            }
            if (!input.includes('/')) {
              return 'Repository must be in owner/repo format';
            }
            const parts = input.split('/');
            if (parts.length !== 2 || !parts[0] || !parts[1]) {
              return 'Repository must be in owner/repo format';
            }
            return true;
          }
        }
      ]);
      targetRepo = answers.repository;
    }

    // Parse repository owner and name
    if (!targetRepo) {
      console.error(chalk.red('❌ No repository specified'));
      process.exit(1);
    }
    
    const [owner, repoName] = targetRepo.split('/');
    if (!owner || !repoName) {
      console.error(chalk.red('❌ Invalid repository format. Use owner/repo format (e.g., microsoft/vscode)'));
      process.exit(1);
    }

    console.log(chalk.blue(`🔍 Connecting to ${chalk.bold(targetRepo)}...`));
    
    const spinner = ora('Checking repository access').start();
    const client = new GitHubClient();
    
    let repository: Repository;
    let hasAccess = false;

    try {
      // Try to get repository information
      repository = await client.getRepository(owner, repoName);
      hasAccess = true;
      spinner.succeed('Repository access verified');
    } catch (error) {
      spinner.fail('Failed to access repository');
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Not Found')) {
        console.error(chalk.red('❌ Repository not found or you don\'t have access'));
        console.log(chalk.yellow('💡 Make sure:'));
        console.log(chalk.yellow('   • The repository exists'));
        console.log(chalk.yellow('   • You have access to it (public repo or you\'re a collaborator)'));
        console.log(chalk.yellow('   • Your GitHub token has the necessary permissions'));
      } else {
        console.error(chalk.red('❌ Failed to connect to repository:'), errorMessage);
      }
      process.exit(1);
    }

    if (hasAccess && repository) {
      console.log();
      console.log(chalk.green('✅ Successfully connected to repository!'));
      console.log();
      
      // Display repository information
      console.log(chalk.bold.blue('📋 Repository Information'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.bold('Name:')} ${repository.full_name}`);
      console.log(`${chalk.bold('Description:')} ${repository.description || 'No description'}`);
      console.log(`${chalk.bold('Visibility:')} ${repository.private ? chalk.red('Private') : chalk.green('Public')}`);
      console.log(`${chalk.bold('Language:')} ${repository.language || 'Not specified'}`);
      console.log(`${chalk.bold('Stars:')} ${chalk.yellow(repository.stargazers_count.toString())}`);
      console.log(`${chalk.bold('Forks:')} ${chalk.cyan(repository.forks_count.toString())}`);
      console.log(`${chalk.bold('Default Branch:')} ${repository.default_branch}`);
      console.log(`${chalk.bold('Last Updated:')} ${new Date(repository.updated_at).toLocaleDateString()}`);
      console.log(`${chalk.bold('URL:')} ${chalk.blue(repository.html_url)}`);

      // Ask if user wants to save this as their connected repository
      const shouldSave = options.save !== false; // Default to true unless explicitly set to false
      
      if (shouldSave) {
        const saveAnswers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'save',
            message: 'Save this as your connected repository?',
            default: true
          }
        ]);

        if (saveAnswers.save) {
          // Save to config
          const config = getConfig();
          updateConfig({
            ...config,
            connectedRepo: {
              owner,
              name: repoName,
              fullName: repository.full_name,
              cloneUrl: repository.clone_url,
              sshUrl: repository.ssh_url,
              htmlUrl: repository.html_url,
              defaultBranch: repository.default_branch,
              connectedAt: new Date().toISOString()
            }
          });

          console.log(chalk.green('💾 Repository connection saved!'));
        }
      }

      console.log();
      console.log(chalk.bold.blue('🚀 Available Actions:'));
      console.log(chalk.gray('• Clone repository:'), chalk.white(`mb git clone ${repository.full_name}`));
      console.log(chalk.gray('• Get status:'), chalk.white(`mb git status ${repository.full_name}`));
      console.log(chalk.gray('• View in browser:'), chalk.blue(repository.html_url));
      
      // Check if user has write access by trying to get collaborator permissions
      try {
        const user = await client.getUser();
        console.log(chalk.gray('• Connected as:'), chalk.white(user.login));
        
        if (repository.owner.login === user.login) {
          console.log(chalk.green('• You are the owner of this repository'));
        }
      } catch (error) {
        // Ignore permission check errors
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('❌ Failed to connect to repository:'), errorMessage);
    
    if (errorMessage.includes('GitHub token is required')) {
      console.log(chalk.yellow('💡 Run "mb git auth" to authenticate with GitHub'));
    }
    
    process.exit(1);
  }
} 