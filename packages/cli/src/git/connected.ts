import chalk from 'chalk';
import inquirer from 'inquirer';
import { getConfig, updateConfig } from '../utils/git/config.js';
import { GitHubClient } from '../utils/git/github.js';

export default async function connectedCommand(): Promise<void> {
  try {
    const config = getConfig();
    
    if (!config.connectedRepo) {
      console.log(chalk.yellow('📭 No repository currently connected'));
      console.log(chalk.gray('💡 Use "mb git connect owner/repo" to connect to a repository'));
      return;
    }

    const repo = config.connectedRepo;
    console.log(chalk.blue('🔗 Currently Connected Repository'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.bold('Repository:')} ${repo.fullName}`);
    console.log(`${chalk.bold('Owner:')} ${repo.owner}`);
    console.log(`${chalk.bold('Name:')} ${repo.name}`);
    console.log(`${chalk.bold('Default Branch:')} ${repo.defaultBranch}`);
    console.log(`${chalk.bold('Connected:')} ${new Date(repo.connectedAt).toLocaleString()}`);
    console.log(`${chalk.bold('URL:')} ${chalk.blue(repo.htmlUrl)}`);

    console.log();
    console.log(chalk.bold.blue('🚀 Quick Actions:'));
    console.log(chalk.gray('• Clone:'), chalk.white(`mb git clone ${repo.fullName}`));
    console.log(chalk.gray('• Status:'), chalk.white(`mb git status ${repo.fullName}`));
    console.log(chalk.gray('• View online:'), chalk.blue(repo.htmlUrl));

    // Check if the repository is still accessible
    try {
      console.log();
      const client = new GitHubClient();
      await client.getRepository(repo.owner, repo.name);
      console.log(chalk.green('✅ Repository is still accessible'));
    } catch (error) {
      console.log(chalk.red('⚠️  Repository may no longer be accessible'));
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Not Found')) {
        console.log(chalk.yellow('   Repository may have been deleted or access removed'));
      }
    }

    // Ask what to do
    console.log();
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Keep current connection', value: 'keep' },
          { name: 'Connect to a different repository', value: 'change' },
          { name: 'Disconnect from this repository', value: 'disconnect' },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);

    switch (answers.action) {
      case 'disconnect':
        const confirmAnswers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to disconnect?',
            default: false
          }
        ]);

        if (confirmAnswers.confirm) {
          const { connectedRepo, ...configWithoutRepo } = config;
          updateConfig(configWithoutRepo);
          console.log(chalk.green('✅ Disconnected from repository'));
        }
        break;

      case 'change':
        console.log(chalk.blue('🔄 Use "mb git connect owner/repo" to connect to a different repository'));
        break;

      case 'keep':
      case 'exit':
      default:
        console.log(chalk.gray('Connection maintained'));
        break;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('❌ Failed to check connected repository:'), errorMessage);
    
    if (errorMessage.includes('GitHub token is required')) {
      console.log(chalk.yellow('💡 Run "mb git auth" to authenticate with GitHub'));
    }
    
    process.exit(1);
  }
} 