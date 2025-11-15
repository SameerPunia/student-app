
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { commonStyles, colors, spacing, borderRadius, typography } from '../styles/commonStyles';
import Icon from './Icon';
import * as ImagePicker from 'expo-image-picker';

interface TableEditorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (table: TableData) => void;
  initialTable?: TableData;
}

interface TableData {
  rows: number;
  cols: number;
  data: (string | CellContent)[][];
  headers?: string[];
}

interface CellContent {
  type: 'text' | 'image';
  value: string;
}

export default function TableEditor({ visible, onClose, onSave, initialTable }: TableEditorProps) {
  const [rows, setRows] = useState(initialTable?.rows || 3);
  const [cols, setCols] = useState(initialTable?.cols || 3);
  const [tableData, setTableData] = useState<(string | CellContent)[][]>(
    initialTable?.data || Array(3).fill(null).map(() => Array(3).fill(''))
  );
  const [headers, setHeaders] = useState<string[]>(
    initialTable?.headers || Array(3).fill('')
  );
  const [hasHeaders, setHasHeaders] = useState(!!initialTable?.headers);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  const getCellValue = (cell: string | CellContent): string => {
    if (typeof cell === 'string') return cell;
    return cell.value;
  };

  const getCellType = (cell: string | CellContent): 'text' | 'image' => {
    if (typeof cell === 'string') return 'text';
    return cell.type;
  };

  const updateCell = (row: number, col: number, value: string | CellContent) => {
    const newData = [...tableData];
    newData[row][col] = value;
    setTableData(newData);
  };

  const updateHeader = (col: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[col] = value;
    setHeaders(newHeaders);
  };

  const addRow = () => {
    setTableData([...tableData, Array(cols).fill('')]);
    setRows(rows + 1);
  };

  const addColumn = () => {
    setTableData(tableData.map(row => [...row, '']));
    setHeaders([...headers, '']);
    setCols(cols + 1);
  };

  const removeRow = (index: number) => {
    if (rows <= 1) {
      Alert.alert('Error', 'Table must have at least one row');
      return;
    }
    const newData = tableData.filter((_, i) => i !== index);
    setTableData(newData);
    setRows(rows - 1);
  };

  const removeColumn = (index: number) => {
    if (cols <= 1) {
      Alert.alert('Error', 'Table must have at least one column');
      return;
    }
    const newData = tableData.map(row => row.filter((_, i) => i !== index));
    const newHeaders = headers.filter((_, i) => i !== index);
    setTableData(newData);
    setHeaders(newHeaders);
    setCols(cols - 1);
  };

  const addImageToCell = async (row: number, col: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateCell(row, col, {
          type: 'image',
          value: result.assets[0].uri,
        });
      }
    } catch (error) {
      console.error('Error adding image to cell:', error);
      Alert.alert('Error', 'Failed to add image');
    }
  };

  const handleSave = () => {
    onSave({
      rows,
      cols,
      data: tableData,
      headers: hasHeaders ? headers : undefined,
    });
    onClose();
  };

  const renderCell = (cell: string | CellContent, rowIndex: number, colIndex: number) => {
    const cellType = getCellType(cell);
    const cellValue = getCellValue(cell);

    if (cellType === 'image') {
      return (
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: cellValue }}
            style={{
              width: '100%',
              height: 80,
              borderRadius: borderRadius.sm,
            }}
            resizeMode="cover"
          />
          <TouchableOpacity
            onPress={() => updateCell(rowIndex, colIndex, '')}
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: 12,
              padding: 4,
            }}
          >
            <Icon name="close" size={12} color="white" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TextInput
        style={{
          backgroundColor: colors.surface,
          padding: spacing.sm,
          borderRadius: borderRadius.sm,
          borderWidth: 1,
          borderColor: selectedCell?.row === rowIndex && selectedCell?.col === colIndex ? colors.primary : colors.border,
          color: colors.text,
          minHeight: 40,
        }}
        value={cellValue}
        onChangeText={(text) => updateCell(rowIndex, colIndex, text)}
        onFocus={() => setSelectedCell({ row: rowIndex, col: colIndex })}
        onBlur={() => setSelectedCell(null)}
        placeholder={`R${rowIndex + 1}C${colIndex + 1}`}
        placeholderTextColor={colors.textTertiary}
        multiline
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{
          backgroundColor: colors.surface,
          paddingTop: Platform.OS === 'ios' ? 50 : 20,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <View style={[commonStyles.rowBetween, { marginBottom: spacing.md }]}>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={commonStyles.subtitle}>Table Editor</Text>
            <TouchableOpacity onPress={handleSave}>
              <Icon name="checkmark" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Controls */}
          <View style={[commonStyles.row, { gap: spacing.md, flexWrap: 'wrap' }]}>
            <TouchableOpacity
              onPress={addRow}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.md,
                backgroundColor: colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
              }}
            >
              <Icon name="add" size={16} color="white" />
              <Text style={{ color: 'white', fontSize: typography.sm }}>Row</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={addColumn}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.md,
                backgroundColor: colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
              }}
            >
              <Icon name="add" size={16} color="white" />
              <Text style={{ color: 'white', fontSize: typography.sm }}>Column</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHasHeaders(!hasHeaders)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.md,
                backgroundColor: hasHeaders ? colors.primary : colors.background,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
              }}
            >
              <Icon name={hasHeaders ? "checkbox" : "square-outline"} size={16} color={hasHeaders ? "white" : colors.text} />
              <Text style={{ color: hasHeaders ? 'white' : colors.text, fontSize: typography.sm }}>Headers</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Table - Scrollable horizontally and vertically */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {/* Headers */}
              {hasHeaders && (
                <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
                  <View style={{ width: 40 }} />
                  {headers.map((header, colIndex) => (
                    <View key={colIndex} style={{ width: 150, marginRight: spacing.sm }}>
                      <View style={[commonStyles.rowBetween, { marginBottom: spacing.xs }]}>
                        <Text style={[commonStyles.caption, { color: colors.textSecondary }]}>
                          Col {colIndex + 1}
                        </Text>
                        <TouchableOpacity onPress={() => removeColumn(colIndex)}>
                          <Icon name="close-circle" size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={{
                          backgroundColor: colors.primary + '20',
                          padding: spacing.sm,
                          borderRadius: borderRadius.sm,
                          fontWeight: typography.semibold,
                          color: colors.text,
                        }}
                        value={header}
                        onChangeText={(text) => updateHeader(colIndex, text)}
                        placeholder={`Header ${colIndex + 1}`}
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* Rows */}
              {tableData.map((row, rowIndex) => (
                <View key={rowIndex} style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
                  <View style={{ width: 40, justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => removeRow(rowIndex)}>
                      <Icon name="close-circle" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                  {row.map((cell, colIndex) => (
                    <View key={colIndex} style={{ width: 150, marginRight: spacing.sm }}>
                      {renderCell(cell, rowIndex, colIndex)}
                      <TouchableOpacity
                        onPress={() => addImageToCell(rowIndex, colIndex)}
                        style={{
                          marginTop: spacing.xs,
                          padding: spacing.xs,
                          backgroundColor: colors.background,
                          borderRadius: borderRadius.sm,
                          alignItems: 'center',
                        }}
                      >
                        <Icon name="image" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Info */}
          <View style={{
            backgroundColor: colors.surface,
            padding: spacing.md,
            borderRadius: borderRadius.md,
            marginTop: spacing.lg,
          }}>
            <Text style={commonStyles.caption}>
              Table size: {rows} rows × {cols} columns
            </Text>
            <Text style={[commonStyles.caption, { marginTop: spacing.xs, color: colors.textSecondary }]}>
              Tap cells to edit inline. Add images using the image icon below each cell.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
