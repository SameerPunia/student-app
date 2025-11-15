
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { commonStyles, colors, buttonStyles, spacing, borderRadius, typography } from '../styles/commonStyles';
import Icon from './Icon';

interface PromptDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}

export default function PromptDialog({
  visible,
  title,
  message,
  placeholder,
  defaultValue = '',
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [inputValue, setInputValue] = useState(defaultValue);

  const handleConfirm = () => {
    onConfirm(inputValue);
    setInputValue('');
  };

  const handleCancel = () => {
    onCancel();
    setInputValue('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
      }}>
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: borderRadius.xl,
          padding: spacing.xl,
          width: '100%',
          maxWidth: 400,
        }}>
          <View style={[commonStyles.rowBetween, { marginBottom: spacing.lg }]}>
            <Text style={[commonStyles.heading, { flex: 1 }]}>{title}</Text>
            <TouchableOpacity onPress={handleCancel}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {message && (
            <Text style={[commonStyles.body, { marginBottom: spacing.lg, color: colors.textSecondary }]}>
              {message}
            </Text>
          )}

          <TextInput
            style={[commonStyles.input, { marginBottom: spacing.lg }]}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            autoFocus
            onSubmitEditing={handleConfirm}
          />

          <View style={[commonStyles.row, { gap: spacing.md }]}>
            <TouchableOpacity
              style={[buttonStyles.secondary, { flex: 1 }]}
              onPress={handleCancel}
            >
              <Text style={buttonStyles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[buttonStyles.primary, { flex: 1 }]}
              onPress={handleConfirm}
              disabled={!inputValue.trim()}
            >
              <Text style={buttonStyles.primaryText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
