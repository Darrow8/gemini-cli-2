/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, SlashCommand } from './types.js';
import { SettingScope } from '../../config/settings.js';

function parseScope(args: string): 'user' | 'project' {
  const scopeEq = /--scope=(user|project)/i.exec(args);
  if (scopeEq && (scopeEq[1] === 'user' || scopeEq[1] === 'project')) {
    return scopeEq[1];
  }
  const scopeSpaced = /--scope\s+(user|project)/i.exec(args);
  if (scopeSpaced && (scopeSpaced[1] === 'user' || scopeSpaced[1] === 'project')) {
    return scopeSpaced[1];
  }
  return 'project';
}

function parseModelName(args: string): string | null {
  // Split by whitespace and take the first token that is not an option flag
  const tokens = args.split(/\s+/).filter((t) => t.trim().length > 0);
  for (const token of tokens) {
    if (!token.startsWith('-')) {
      return token;
    }
  }
  return null;
}

const setSubcommand: SlashCommand = {
  name: 'set',
  description: 'Set the default model for the CLI. Usage: /model set <modelName> [--scope user|project]',
  kind: CommandKind.BUILT_IN,
  action: async (context, args) => {
    const modelName = parseModelName(args);
    if (!modelName) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Usage: /model set <modelName> [--scope user|project]',
      } as const;
    }

    const scopeStr = parseScope(args);
    const scope = scopeStr === 'user' ? SettingScope.User : SettingScope.Workspace;

    // Persist to settings and apply immediately to the current session
    context.services.settings.setValue(scope, 'model', modelName);
    context.services.config?.setModel(modelName);

    context.ui.addItem(
      {
        type: 'info',
        text: `Model set to "${modelName}" in ${scopeStr} settings.`,
      },
      Date.now(),
    );

    return {
      type: 'message',
      messageType: 'info',
      content: `Using model: ${modelName}`,
    } as const;
  },
};

export const modelCommand: SlashCommand = {
  name: 'model',
  description: 'configure model used by the CLI',
  kind: CommandKind.BUILT_IN,
  subCommands: [setSubcommand],
  action: () => ({
    type: 'dialog',
    dialog: 'model',
  }),
};


