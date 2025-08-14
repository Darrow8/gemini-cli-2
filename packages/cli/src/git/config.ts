import chalk from 'chalk';
import inquirer from 'inquirer';
import { getConfig, updateConfig, getConfigPath } from '../utils/git/config.js';
import { GitConfigOptions } from './types.js';

export default async function configCommand(options: GitConfigOptions): Promise<void> {
  try {
    const { token, dir, show } = options;

    if (show) {
      const config = getConfig();
      console.log(chalk.blue('⚙️  Current Configuration:'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(`${chalk.gray('Config File:')} ${getConfigPath()}`);
      console.log(`${chalk.gray('GitHub Token:')} ${config.token ? chalk.green('Set (hidden)') : chalk.red('Not set')}`);
      console.log(`${chalk.gray('Username:')} ${config.username || chalk.gray('Not set')}`);
      console.log(`${chalk.gray('Repos Directory:')} ${config.reposDir || chalk.gray('Not set (using ./repos)')}`);
      
      if (!config.token) {
        console.log();
        console.log(chalk.yellow('💡 Run "mb git auth" to set up GitHub authentication'));
      }
      return;
    }

    // If no options provided, show interactive configuration
    if (!token && !dir) {
      console.log(chalk.blue('⚙️  Interactive Configuration'));
      console.log(chalk.gray('Press Enter to keep current values\n'));

      const currentConfig = getConfig();
      
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'reposDir',
          message: 'Default directory for cloned repositories:',
          default: currentConfig.reposDir || './repos',
        },
        {
          type: 'confirm',
          name: 'updateToken',
          message: 'Do you want to update your GitHub token?',
          default: false,
        }
      ]);

      const newConfig: any = {};
      
      if (answers.reposDir) {
        newConfig.reposDir = answers.reposDir;
      }

      if (answers.updateToken) {
        const tokenAnswer = await inquirer.prompt([
          {
            type: 'password',
            name: 'token',
            message: 'Enter your GitHub personal access token:',
            validate: (input: string) => {
              if (!input.trim()) {
                return 'Token cannot be empty';
              }
              return true;
            }
          }
        ]);
        newConfig.token = tokenAnswer.token;
      }

      updateConfig(newConfig);
      console.log(chalk.green('✅ Configuration updated successfully!'));
      return;
    }

    // Update individual settings
    const updates: any = {};
    
    if (token) {
      updates.token = token;
      console.log(chalk.green('✅ GitHub token updated'));
    }
    
    if (dir) {
      updates.reposDir = dir;
      console.log(chalk.green(`✅ Repos directory set to: ${dir}`));
    }

    updateConfig(updates);
    console.log(chalk.blue('💡 Use --show to view current configuration'));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('❌ Failed to update configuration:'), errorMessage);
    process.exit(1);
  }
} 