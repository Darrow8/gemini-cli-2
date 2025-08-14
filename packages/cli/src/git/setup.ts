import chalk from 'chalk';
import inquirer from 'inquirer';
import { GitHubClient } from '../utils/git/github.js';
import { getConfig } from '../utils/git/config.js';
import authCommand from './auth.js';

export default async function setupCommand(): Promise<void> {
  try {
    console.log(chalk.blue('🚀 Welcome to Mainbase CLI!'));
    console.log(chalk.gray('Let\'s connect your GitHub account to get started.'));
    console.log();

    // Check if user is already authenticated
    const config = getConfig();
    if (config.token) {
      try {
        const client = new GitHubClient();
        const user = await client.getUser();
        
        console.log(chalk.green(`✅ You're already authenticated as ${user.login}`));
        console.log();
        
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Continue with current account', value: 'continue' },
              { name: 'Set up a different GitHub account', value: 'reauth' },
              { name: 'Show me what I can do next', value: 'help' }
            ]
          }
        ]);

        if (answers.action === 'reauth') {
          console.log(chalk.blue('🔄 Setting up new authentication...'));
          console.log();
          await authCommand({});
          return;
        } else if (answers.action === 'help') {
          showNextSteps(user.login);
          return;
        } else {
          showNextSteps(user.login);
          return;
        }
      } catch (error) {
        console.log(chalk.yellow('⚠️  Your saved token may have expired. Let\'s set up authentication again.'));
        console.log();
      }
    }

    // New user setup
    console.log(chalk.bold('🔐 GitHub Account Setup'));
    console.log(chalk.gray('To use this CLI, you need to connect your personal GitHub account.'));
    console.log(chalk.gray('This is completely secure - your token stays on your computer.'));
    console.log();

    const confirmSetup = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Ready to connect your GitHub account?',
        default: true
      }
    ]);

    if (!confirmSetup.proceed) {
      console.log(chalk.gray('👋 No problem! Run "mb git setup" when you\'re ready.'));
      return;
    }

    console.log();
    console.log(chalk.blue('📋 Quick Overview:'));
    console.log(chalk.gray('1. We\'ll help you create a GitHub Personal Access Token'));
    console.log(chalk.gray('2. You\'ll paste it here (it stays private on your machine)'));
    console.log(chalk.gray('3. You can then connect to repositories you have access to'));
    console.log();

    const readyToProceed = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ready',
        message: 'Continue with authentication setup?',
        default: true
      }
    ]);

    if (readyToProceed.ready) {
      await authCommand({});
    } else {
      console.log(chalk.gray('👋 Run "mb git auth" when you\'re ready to authenticate.'));
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('❌ Setup failed:'), errorMessage);
    console.log(chalk.yellow('💡 Try running "mb git auth" directly for authentication.'));
    process.exit(1);
  }
}

function showNextSteps(username: string): void {
  console.log(chalk.bold.blue('🎉 You\'re all set up!'));
  console.log();
  console.log(chalk.bold('🚀 Here\'s what you can do now:'));
  console.log();
  console.log(chalk.gray('📚 Explore your repositories:'));
  console.log(chalk.white('   mb git repos'));
  console.log();
  console.log(chalk.gray('🔗 Connect to a specific repository:'));
  console.log(chalk.white('   mb git connect owner/repo'));
  console.log(chalk.gray('   Example: mb git connect microsoft/vscode'));
  console.log();
  console.log(chalk.gray('📥 Clone repositories:'));
  console.log(chalk.white('   mb git clone                    # Clone connected repo'));
  console.log(chalk.white('   mb git clone owner/repo         # Clone specific repo'));
  console.log();
  console.log(chalk.gray('📊 Check repository status:'));
  console.log(chalk.white('   mb git status'));
  console.log();
  console.log(chalk.gray('⚙️  Manage your settings:'));
  console.log(chalk.white('   mb git config --show            # View settings'));
  console.log(chalk.white('   mb git connected                # Manage connections'));
  console.log();
  console.log(chalk.blue(`Happy coding, ${username}! 🎉`));
} 