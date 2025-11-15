
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, TouchableOpacity, Easing } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, typography, spacing, getResponsiveValue, isSmallScreen } from '../styles/commonStyles';

interface ProgressCircleProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
  completedTasks?: number;
  totalTasks?: number;
  animated?: boolean;
  onPress?: () => void;
  showTooltip?: boolean;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({
  percentage,
  size = getResponsiveValue(80, 90, 100, 120),
  strokeWidth = getResponsiveValue(6, 7, 8, 10),
  showText = true,
  completedTasks = 0,
  totalTasks = 0,
  animated = true,
  onPress,
  showTooltip = false,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const [showDetails, setShowDetails] = useState(false);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate the progress color based on percentage
  const getProgressColor = (progress: number) => {
    if (progress === 0) return colors.border;
    if (progress < 30) return colors.error;
    if (progress < 80) return colors.warning;
    return colors.success;
  };

  const progressColor = getProgressColor(percentage);
  
  // Ensure percentage is between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  // Calculate stroke dash offset for the progress
  const strokeDashoffset = clampedPercentage === 0 
    ? circumference 
    : circumference - (circumference * clampedPercentage) / 100;

  useEffect(() => {
    if (animated) {
      // Animate the progress circle with a smooth easing
      Animated.timing(animatedValue, {
        toValue: clampedPercentage,
        duration: 1500,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(clampedPercentage);
    }
  }, [clampedPercentage, animated]);

  const handlePress = () => {
    if (onPress) {
      // Add a subtle scale animation on press
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      onPress();
    }
    
    if (showTooltip) {
      setShowDetails(!showDetails);
    }
  };

  const getProgressMessage = () => {
    if (totalTasks === 0) return "No tasks yet";
    if (clampedPercentage === 0) return "Get started!";
    if (clampedPercentage < 30) return "Keep going!";
    if (clampedPercentage < 80) return "Great progress!";
    if (clampedPercentage === 100) return "All done! 🎉";
    return "Almost there!";
  };

  const CircleComponent = (
    <Animated.View 
      style={{ 
        width: size, 
        height: size, 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative',
        transform: [{ scale: scaleValue }],
      }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation="-90" origin={`${size/2}, ${size/2}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.borderLight}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle - only show if percentage > 0 */}
          {clampedPercentage > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={progressColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          )}
        </G>
      </Svg>
      
      {showText && (
        <View style={{ 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'absolute',
        }}>
          <Text style={{
            fontSize: isSmallScreen ? typography.lg : typography.xl,
            fontWeight: typography.bold,
            color: clampedPercentage === 0 ? colors.textTertiary : progressColor,
            textAlign: 'center',
          }}>
            {Math.round(clampedPercentage)}%
          </Text>
          {totalTasks > 0 && (
            <Text style={{
              fontSize: isSmallScreen ? typography.xs : typography.sm,
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: 2,
            }}>
              {completedTasks}/{totalTasks}
            </Text>
          )}
        </View>
      )}
      
      {/* Tooltip/Details */}
      {showDetails && showTooltip && (
        <View style={{
          position: 'absolute',
          top: size + spacing.sm,
          left: -spacing.lg,
          right: -spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: spacing.sm,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          zIndex: 1000,
        }}>
          <Text style={{
            fontSize: typography.sm,
            fontWeight: typography.semibold,
            color: progressColor,
            textAlign: 'center',
            marginBottom: spacing.xs,
          }}>
            {getProgressMessage()}
          </Text>
          <Text style={{
            fontSize: typography.xs,
            color: colors.textSecondary,
            textAlign: 'center',
          }}>
            {totalTasks === 0 
              ? "Add some tasks to track your progress"
              : `${completedTasks} completed • ${totalTasks - completedTasks} remaining`
            }
          </Text>
        </View>
      )}
    </Animated.View>
  );

  if (onPress || showTooltip) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        {CircleComponent}
      </TouchableOpacity>
    );
  }

  return CircleComponent;
};

export default ProgressCircle;
