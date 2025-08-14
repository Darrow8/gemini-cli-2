import chalk from 'chalk';
import inquirer from 'inquirer';
import { updateConfig, getConfig } from '../utils/git/config.js';

export default async function logoutCommand(): Promise<void> {
  try {
    const config = getConfig();
    
    if (!config.token) {
      console.log(chalk.yellow('⚠️  You are not currently logged in'));
      return;
    }
    
    console.log(chalk.blue('🔐 GitHub Logout'));
    console.log(chalk.gray(`Currently logged in as: ${config.username || 'Unknown'}`));
    
    if (config.connectedRepo) {
      console.log(chalk.gray(`Connected repository: ${config.connectedRepo.fullName}`));
    }
    
    console.log();
    
    const { confirmLogout } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmLogout',
        message: 'Are you sure you want to logout?',
        default: false
      }
    ]);
    
    if (!confirmLogout) {
      console.log(chalk.gray('Logout cancelled'));
      return;
    }
    
    // Clear all authentication data
    updateConfig({ 
      token: undefined, 
      username: undefined, 
      connectedRepo: undefined 
    });
    
    console.log();
    console.log(chalk.green('✅ Successfully logged out!'));
    console.log(chalk.gray('Your authentication token and repository connection have been cleared'));
    console.log();
    console.log(chalk.bold.blue('🚀 To login again:'));
    console.log(chalk.gray('• Run:'), chalk.white('mb git auth'));
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('❌ Logout failed:'), errorMessage);
    process.exit(1);
  }
}