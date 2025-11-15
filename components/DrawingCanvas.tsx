
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { commonStyles, colors, spacing, borderRadius, typography } from '../styles/commonStyles';
import Icon from './Icon';

interface DrawingCanvasProps {
  visible: boolean;
  onClose: () => void;
  onSave: (drawing: any) => void;
  initialDrawing?: any;
}

interface Stroke {
  id: string;
  tool: 'pen' | 'marker' | 'highlighter' | 'eraser';
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export default function DrawingCanvas({ visible, onClose, onSave, initialDrawing }: DrawingCanvasProps) {
  const [strokes, setStrokes] = useState<Stroke[]>(initialDrawing?.strokes || []);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [selectedTool, setSelectedTool] = useState<'pen' | 'marker' | 'highlighter' | 'eraser'>('pen');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: Dimensions.get('window').width, height: Dimensions.get('window').height - 200 });

  const drawingColors = [
    '#000000', // Black
    '#FF3B30', // Red
    '#FF9500', // Orange
    '#FFCC00', // Yellow
    '#34C759', // Green
    '#007AFF', // Blue
    '#5856D6', // Purple
    '#FF2D55', // Pink
    '#8E8E93', // Gray
  ];

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newStroke: Stroke = {
          id: Date.now().toString(),
          tool: selectedTool,
          color: selectedColor,
          width: strokeWidth,
          points: [{ x: locationX, y: locationY }],
        };
        setCurrentStroke(newStroke);
      },
      onPanResponderMove: (evt) => {
        if (!currentStroke) return;
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentStroke({
          ...currentStroke,
          points: [...currentStroke.points, { x: locationX, y: locationY }],
        });
      },
      onPanResponderRelease: () => {
        if (currentStroke) {
          if (selectedTool === 'eraser') {
            // Remove strokes that intersect with eraser path
            const eraserPoints = currentStroke.points;
            setStrokes(prev => prev.filter(stroke => {
              return !stroke.points.some(point => 
                eraserPoints.some(ep => 
                  Math.abs(ep.x - point.x) < 20 && Math.abs(ep.y - point.y) < 20
                )
              );
            }));
          } else {
            setStrokes(prev => [...prev, currentStroke]);
          }
          setCurrentStroke(null);
        }
      },
    })
  ).current;

  const getToolWidth = (tool: string) => {
    switch (tool) {
      case 'pen': return 2;
      case 'marker': return 4;
      case 'highlighter': return 8;
      case 'eraser': return 20;
      default: return 2;
    }
  };

  const selectTool = (tool: 'pen' | 'marker' | 'highlighter' | 'eraser') => {
    setSelectedTool(tool);
    setStrokeWidth(getToolWidth(tool));
  };

  const clearCanvas = () => {
    setStrokes([]);
    setCurrentStroke(null);
  };

  const undoLastStroke = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  const handleSave = () => {
    onSave({
      strokes,
      canvasSize,
      timestamp: new Date().toISOString(),
    });
    onClose();
  };

  const renderPath = (stroke: Stroke) => {
    if (stroke.points.length < 2) return null;

    const pathData = stroke.points.reduce((acc, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `${acc} L ${point.x} ${point.y}`;
    }, '');

    return (
      <Path
        key={stroke.id}
        d={pathData}
        stroke={stroke.color}
        strokeWidth={stroke.width}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={stroke.tool === 'highlighter' ? 0.5 : 1}
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
            <Text style={commonStyles.subtitle}>Drawing</Text>
            <TouchableOpacity onPress={handleSave}>
              <Icon name="checkmark" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Tools */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[commonStyles.row, { gap: spacing.sm }]}>
              {/* Drawing Tools */}
              {(['pen', 'marker', 'highlighter', 'eraser'] as const).map(tool => (
                <TouchableOpacity
                  key={tool}
                  onPress={() => selectTool(tool)}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: borderRadius.md,
                    backgroundColor: selectedTool === tool ? colors.primary : colors.background,
                  }}
                >
                  <Text style={{
                    color: selectedTool === tool ? 'white' : colors.text,
                    fontSize: typography.sm,
                    textTransform: 'capitalize',
                  }}>
                    {tool}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Color Picker */}
              {selectedTool !== 'eraser' && (
                <TouchableOpacity
                  onPress={() => setShowColorPicker(!showColorPicker)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: borderRadius.md,
                    backgroundColor: selectedColor,
                    borderWidth: 2,
                    borderColor: colors.border,
                  }}
                />
              )}

              {/* Undo */}
              <TouchableOpacity
                onPress={undoLastStroke}
                disabled={strokes.length === 0}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.background,
                  opacity: strokes.length === 0 ? 0.5 : 1,
                }}
              >
                <Icon name="arrow-undo" size={20} color={colors.text} />
              </TouchableOpacity>

              {/* Clear */}
              <TouchableOpacity
                onPress={clearCanvas}
                disabled={strokes.length === 0}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.background,
                  opacity: strokes.length === 0 ? 0.5 : 1,
                }}
              >
                <Icon name="trash" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Color Picker */}
          {showColorPicker && (
            <View style={{ marginTop: spacing.md }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[commonStyles.row, { gap: spacing.sm }]}>
                  {drawingColors.map(color => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => {
                        setSelectedColor(color);
                        setShowColorPicker(false);
                      }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: color,
                        borderWidth: 3,
                        borderColor: selectedColor === color ? colors.primary : 'transparent',
                      }}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Canvas */}
        <View
          style={{ flex: 1, backgroundColor: 'white' }}
          {...panResponder.panHandlers}
          onLayout={(e) => {
            setCanvasSize({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            });
          }}
        >
          <Svg width={canvasSize.width} height={canvasSize.height}>
            {strokes.map(stroke => renderPath(stroke))}
            {currentStroke && renderPath(currentStroke)}
          </Svg>
        </View>
      </View>
    </Modal>
  );
}
