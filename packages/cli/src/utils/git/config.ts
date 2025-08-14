import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { GitHubConfig } from '../../git/types.js';

const CONFIG_DIR = path.join(os.homedir(), '.mainbase');
const CONFIG_FILE = path.join(CONFIG_DIR, 'git-agent.json');

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function getConfig(): GitHubConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return {};
    }
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Could not read config file: ${errorMessage}`);
    return {};
  }
}

export function saveConfig(config: GitHubConfig): void {
  try {
    // Ensure config directory exists
    fs.ensureDirSync(CONFIG_DIR);
    
    // Read existing config and merge
    const existingConfig = getConfig();
    const mergedConfig = { ...existingConfig, ...config };
    
    // Save merged config
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(mergedConfig, null, 2));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save config: ${errorMessage}`);
  }
}

export function updateConfig(updates: Partial<GitHubConfig>): void {
  const config = getConfig();
  const updatedConfig = { ...config, ...updates };
  saveConfig(updatedConfig);
}

export function clearConfig(): void {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.removeSync(CONFIG_FILE);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clear config: ${errorMessage}`);
  }
} 