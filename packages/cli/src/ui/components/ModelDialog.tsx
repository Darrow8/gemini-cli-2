/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { RadioButtonSelect } from './shared/RadioButtonSelect.js';
import { LoadedSettings, SettingScope } from '../../config/settings.js';

interface ModelDialogProps {
  settings: LoadedSettings;
  currentModel: string;
  onSelect: (modelName: string | undefined, scope: SettingScope) => void;
  onCancel: () => void;
}

const DEFAULT_MODEL_OPTIONS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-pro',
  'gemini-2.0-flash',
];

export const ModelDialog = ({
  settings,
  currentModel,
  onSelect,
  onCancel,
}: ModelDialogProps): React.JSX.Element => {
  const [selectedScope] = useState<SettingScope>(SettingScope.Workspace);

  const items = useMemo(
    () => DEFAULT_MODEL_OPTIONS.map((m) => ({ label: m, value: m })),
    [],
  );

  const initialIndex = Math.max(
    0,
    items.findIndex((i) => i.value === currentModel),
  );

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Gray}
      flexDirection="column"
      paddingX={1}
      paddingY={1}
      width="100%"
    >
      <Text>
        Select Model <Text color={Colors.Gray}>(Use Up/Down, Enter to select)</Text>
      </Text>
      <Box height={1} />
      <RadioButtonSelect
        items={items}
        initialIndex={initialIndex}
        onSelect={(model) => onSelect(model, selectedScope)}
        isFocused={true}
        maxItemsToShow={5}
        showScrollArrows={true}
      />
      <Box height={1} />
      <Text>
        Apply To: <Text color={Colors.Gray}>project (default). Use /model set ... --scope user for user settings.</Text>
      </Text>
      <Box height={1} />
      <Text color={Colors.Gray}>Press Esc to cancel.</Text>
    </Box>
  );
};


