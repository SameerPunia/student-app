
import Icon from './Icon';
import React, { useEffect, useRef, useCallback } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { 
  colors, 
  typography, 
  spacing, 
  borderRadius, 
  shadows,
  isSmallScreen,
  getResponsiveSpacing,
  getScreenDimensions
} from '../styles/commonStyles';

interface ToastProps {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onHide: () => void;
  duration?: number;
}

export default function Toast({ 
  visible, 
  message, 
  type, 
  onHide, 
  duration = 3000 
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get('window');
  const { isSmall } = getScreenDimensions();

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  }, [translateY, opacity, onHide]);

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible, duration, hideToast, translateY, opacity]);

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: colors.success,
          icon: 'checkmark-circle',
          iconColor: 'white',
        };
      case 'error':
        return {
          backgroundColor: colors.error,
          icon: 'close-circle',
          iconColor: 'white',
        };
      case 'warning':
        return {
          backgroundColor: colors.warning,
          icon: 'warning',
          iconColor: 'white',
        };
      case 'info':
      default:
        return {
          backgroundColor: colors.info,
          icon: 'information-circle',
          iconColor: 'white',
        };
    }
  };

  if (!visible && opacity._value === 0) {
    return null;
  }

  const config = getToastConfig();
  const horizontalMargin = getResponsiveSpacing(16);
  const verticalPadding = getResponsiveSpacing(12);
  const horizontalPadding = getResponsiveSpacing(16);

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <Animated.View
          style={{
            transform: [{ translateY }],
            opacity,
            marginHorizontal: horizontalMargin,
            marginTop: getResponsiveSpacing(8),
          }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={hideToast}
            style={{
              backgroundColor: config.backgroundColor,
              borderRadius: borderRadius.lg,
              paddingVertical: verticalPadding,
              paddingHorizontal: horizontalPadding,
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: isSmall ? 48 : 56,
              ...shadows.lg,
              // Ensure proper contrast on different backgrounds
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <Icon
              name={config.icon}
              size={isSmall ? 20 : 24}
              color={config.iconColor}
              style={{ marginRight: spacing.md }}
            />
            
            <Text
              style={{
                flex: 1,
                color: 'white',
                fontSize: isSmall ? typography.sm : typography.base,
                fontWeight: typography.medium,
                lineHeight: isSmall ? typography.sm * 1.4 : typography.base * 1.4,
              }}
              numberOfLines={3}
            >
              {message}
            </Text>

            <TouchableOpacity
              onPress={hideToast}
              style={{
                marginLeft: spacing.md,
                padding: spacing.xs,
                borderRadius: borderRadius.sm,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                minWidth: 28,
                minHeight: 28,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name="close"
                size={isSmall ? 14 : 16}
                color="white"
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
