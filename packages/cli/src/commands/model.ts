/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'gemini model' command
import type { CommandModule, Argv } from 'yargs';
import { setCommand } from './model/set.js';

export const modelCommand: CommandModule = {
  command: 'model',
  describe: 'Manage model configuration',
  builder: (yargs: Argv) =>
    yargs
      .command(setCommand)
      .demandCommand(1, 'You need at least one command before continuing.')
      .version(false),
  handler: () => {
    // yargs will automatically show help if no subcommand is provided
  },
};


