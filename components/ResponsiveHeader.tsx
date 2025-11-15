
import React from 'react';
import { View, Text, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from './Icon';
import { 
  commonStyles, 
  colors, 
  spacing, 
  borderRadius, 
  typography,
  isSmallScreen,
  getResponsiveSpacing 
} from '../styles/commonStyles';

interface ResponsiveHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightComponent?: React.ReactNode;
  onRightPress?: () => void;
  rightIcon?: string;
  backgroundColor?: string;
  elevated?: boolean;
}

export default function ResponsiveHeader({
  title,
  showBackButton = true,
  rightComponent,
  onRightPress,
  rightIcon,
  backgroundColor = colors.background,
  elevated = true,
}: ResponsiveHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Calculate responsive header height
  const headerHeight = isSmallScreen ? 56 : 64;
  const buttonSize = isSmallScreen ? 36 : 40;
  const iconSize = isSmallScreen ? 18 : 20;

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <>
      {/* Status bar configuration */}
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={backgroundColor}
        translucent={false}
      />
      
      <SafeAreaView 
        edges={['top']} 
        style={{ 
          backgroundColor,
          ...(elevated && commonStyles.headerElevated.shadowColor ? {
            shadowColor: commonStyles.headerElevated.shadowColor,
            shadowOffset: commonStyles.headerElevated.shadowOffset,
            shadowOpacity: commonStyles.headerElevated.shadowOpacity,
            shadowRadius: commonStyles.headerElevated.shadowRadius,
            elevation: commonStyles.headerElevated.elevation,
          } : {}),
        }}
      >
        <View style={[
          commonStyles.rowBetween,
          {
            paddingHorizontal: getResponsiveSpacing(16),
            paddingVertical: getResponsiveSpacing(12),
            minHeight: headerHeight,
            backgroundColor,
          }
        ]}>
          {/* Left side - Back button or spacer */}
          <View style={{ width: buttonSize, height: buttonSize }}>
            {showBackButton && (
              <TouchableOpacity 
                onPress={handleBackPress}
                style={{
                  width: buttonSize,
                  height: buttonSize,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Icon name="arrow-back" size={iconSize} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          {/* Center - Title */}
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: spacing.md }}>
            <Text 
              style={[
                commonStyles.headerTitle,
                {
                  fontSize: isSmallScreen ? typography.lg : typography.xl,
                  textAlign: 'center',
                }
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          </View>

          {/* Right side - Custom component or button */}
          <View style={{ width: buttonSize, height: buttonSize, alignItems: 'flex-end' }}>
            {rightComponent || (
              rightIcon && onRightPress && (
                <TouchableOpacity 
                  onPress={onRightPress}
                  style={{
                    width: buttonSize,
                    height: buttonSize,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`${rightIcon} button`}
                  accessibilityRole="button"
                >
                  <Icon name={rightIcon} size={iconSize} color="white" />
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}
