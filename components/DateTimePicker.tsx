
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, TextInput } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { commonStyles, colors, spacing, borderRadius, typography } from '../styles/commonStyles';
import Icon from './Icon';

interface DateTimePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  onClear?: () => void;
  label?: string;
  placeholder?: string;
  minimumDate?: Date;
  showClearButton?: boolean;
}

export default function DateTimePicker({
  value,
  onChange,
  onClear,
  label,
  placeholder = 'Select date and time',
  minimumDate,
  showClearButton = true,
}: DateTimePickerProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value || new Date());

  const formatDateTime = (date: Date | null) => {
    if (!date) return placeholder;
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    return `${dateStr} at ${timeStr}`;
  };

  const handleDateConfirm = (date: Date) => {
    setTempDate(date);
    setShowDatePicker(false);
    setTimeout(() => {
      setShowTimePicker(true);
    }, 300);
  };

  const handleTimeConfirm = (time: Date) => {
    const combinedDateTime = new Date(tempDate);
    combinedDateTime.setHours(time.getHours());
    combinedDateTime.setMinutes(time.getMinutes());
    combinedDateTime.setSeconds(0);
    combinedDateTime.setMilliseconds(0);
    
    onChange(combinedDateTime);
    setShowTimePicker(false);
  };

  const handleWebDateTimeChange = (dateTimeString: string) => {
    if (!dateTimeString) return;
    const date = new Date(dateTimeString);
    if (!isNaN(date.getTime())) {
      onChange(date);
    }
  };

  const getWebDateTimeValue = () => {
    if (!value) return '';
    // Format: YYYY-MM-DDTHH:mm
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getWebMinDateTime = () => {
    if (!minimumDate) return '';
    const year = minimumDate.getFullYear();
    const month = String(minimumDate.getMonth() + 1).padStart(2, '0');
    const day = String(minimumDate.getDate()).padStart(2, '0');
    const hours = String(minimumDate.getHours()).padStart(2, '0');
    const minutes = String(minimumDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: spacing.lg }}>
        {label && <Text style={commonStyles.label}>{label}</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, position: 'relative' }}>
            <input
              type="datetime-local"
              value={getWebDateTimeValue()}
              onChange={(e) => handleWebDateTimeChange(e.target.value)}
              min={getWebMinDateTime()}
              style={{
                width: '100%',
                backgroundColor: value ? colors.surface : colors.surface,
                borderRadius: borderRadius.lg,
                paddingLeft: spacing.lg,
                paddingRight: spacing.lg,
                paddingTop: spacing.md,
                paddingBottom: spacing.md,
                fontSize: typography.base,
                color: value ? colors.text : colors.textTertiary,
                borderWidth: 2,
                borderStyle: 'solid',
                borderColor: value ? colors.primary : colors.border,
                fontFamily: 'inherit',
                outline: 'none',
                minHeight: 48,
                cursor: 'pointer',
              }}
            />
          </View>
          {showClearButton && value && onClear && (
            <TouchableOpacity
              onPress={onClear}
              style={{
                marginLeft: spacing.sm,
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                backgroundColor: colors.error,
                minWidth: 40,
                minHeight: 40,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={18} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Mobile version with modal pickers
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label && <Text style={commonStyles.label}>{label}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          style={[
            commonStyles.input, 
            { 
              flex: 1, 
              justifyContent: 'center', 
              marginBottom: 0, 
              marginRight: showClearButton && value ? spacing.sm : 0,
              backgroundColor: value ? colors.surface : colors.surface,
              borderColor: value ? colors.primary : colors.border,
              borderWidth: 2,
            }
          ]}
          onPress={() => {
            setTempDate(value || new Date());
            setShowDatePicker(true);
          }}
        >
          <Text style={{ 
            color: value ? colors.text : colors.textTertiary,
            fontWeight: value ? typography.medium : typography.normal,
          }}>
            {formatDateTime(value)}
          </Text>
        </TouchableOpacity>
        {showClearButton && value && onClear && (
          <TouchableOpacity
            onPress={onClear}
            style={{
              padding: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: colors.error,
              minWidth: 40,
              minHeight: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="close" size={18} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={tempDate}
        minimumDate={minimumDate}
        onConfirm={handleDateConfirm}
        onCancel={() => setShowDatePicker(false)}
      />

      <DateTimePickerModal
        isVisible={showTimePicker}
        mode="time"
        date={tempDate}
        onConfirm={handleTimeConfirm}
        onCancel={() => setShowTimePicker(false)}
        is24Hour={false}
      />
    </View>
  );
}
