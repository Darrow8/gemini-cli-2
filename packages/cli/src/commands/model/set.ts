/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandModule } from 'yargs';
import { loadSettings, SettingScope } from '../../config/settings.js';

async function setModel(
  modelName: string,
  options: {
    scope: 'user' | 'project';
  },
): Promise<void> {
  const settingsScope =
    options.scope === 'user' ? SettingScope.User : SettingScope.Workspace;
  const settings = loadSettings(process.cwd());

  settings.setValue(settingsScope, 'model', modelName);
  console.log(`Model set to "${modelName}" in ${options.scope} settings.`);
}

export const setCommand: CommandModule = {
  command: 'set <modelName>',
  describe: 'Set the default model used by the CLI',
  builder: (yargs) =>
    yargs
      .positional('modelName', {
        describe: 'Model name to use (e.g. gemini-2.0-pro)',
        type: 'string',
        demandOption: true,
      })
      .option('scope', {
        alias: 's',
        describe: 'Configuration scope (user or project)',
        type: 'string',
        default: 'project',
        choices: ['user', 'project'],
      }),
  handler: async (argv) => {
    await setModel(argv.modelName as string, {
      scope: (argv.scope as 'user' | 'project') ?? 'project',
    });
  },
};


