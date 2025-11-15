
import { StyleSheet, ViewStyle, TextStyle, Dimensions, Platform } from 'react-native';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Define breakpoints for responsive design
export const breakpoints = {
  small: 320,    // Small phones
  medium: 375,   // Standard phones
  large: 414,    // Large phones
  tablet: 768,   // Tablets
  desktop: 1024, // Desktop/large tablets
};

// Helper functions for responsive design
export const isSmallScreen = screenWidth < breakpoints.medium;
export const isMediumScreen = screenWidth >= breakpoints.medium && screenWidth < breakpoints.large;
export const isLargeScreen = screenWidth >= breakpoints.large && screenWidth < breakpoints.tablet;
export const isTablet = screenWidth >= breakpoints.tablet;

// Responsive spacing function
export const getResponsiveSpacing = (base: number) => {
  if (isSmallScreen) return base * 0.8;
  if (isTablet) return base * 1.2;
  return base;
};

// Responsive font size function
export const getResponsiveFontSize = (base: number) => {
  if (isSmallScreen) return base * 0.9;
  if (isTablet) return base * 1.1;
  return base;
};

// Safe area padding for different devices
export const getSafeAreaPadding = () => {
  const baseTop = Platform.OS === 'ios' ? 44 : 24;
  const baseBottom = Platform.OS === 'ios' ? 34 : 0;
  
  return {
    top: isSmallScreen ? baseTop * 0.8 : baseTop,
    bottom: isSmallScreen ? baseBottom * 0.8 : baseBottom,
  };
};

export const colors = {
  // Primary brand colors
  primary: '#2563EB',        // Professional blue
  primaryLight: '#3B82F6',   // Lighter blue
  primaryDark: '#1D4ED8',    // Darker blue
  
  // Secondary colors
  secondary: '#64748B',      // Slate gray
  accent: '#06B6D4',         // Cyan accent
  
  // Background colors
  background: '#FFFFFF',     // Pure white
  surface: '#F8FAFC',        // Very light gray
  surfaceElevated: '#FFFFFF', // White for elevated cards
  
  // Text colors
  text: '#0F172A',           // Very dark slate
  textSecondary: '#64748B',  // Medium slate
  textTertiary: '#94A3B8',   // Light slate
  
  // Status colors
  success: '#10B981',        // Emerald green
  warning: '#F59E0B',        // Amber
  error: '#EF4444',          // Red
  info: '#3B82F6',           // Blue
  
  // Priority colors (for tasks)
  urgent: '#DC2626',         // Red
  high: '#EA580C',           // Orange
  medium: '#D97706',         // Amber
  low: '#059669',            // Emerald
  
  // Border and shadow
  border: '#E2E8F0',         // Light slate
  borderLight: '#F1F5F9',    // Very light slate
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowDark: 'rgba(15, 23, 42, 0.15)',
};

export const typography = {
  // Responsive font sizes
  xs: getResponsiveFontSize(12),
  sm: getResponsiveFontSize(14),
  base: getResponsiveFontSize(16),
  lg: getResponsiveFontSize(18),
  xl: getResponsiveFontSize(20),
  '2xl': getResponsiveFontSize(24),
  '3xl': getResponsiveFontSize(30),
  '4xl': getResponsiveFontSize(36),
  
  // Font weights
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const spacing = {
  xs: getResponsiveSpacing(4),
  sm: getResponsiveSpacing(8),
  md: getResponsiveSpacing(12),
  lg: getResponsiveSpacing(16),
  xl: getResponsiveSpacing(20),
  '2xl': getResponsiveSpacing(24),
  '3xl': getResponsiveSpacing(32),
  '4xl': getResponsiveSpacing(40),
  '5xl': getResponsiveSpacing(48),
  '6xl': getResponsiveSpacing(64),
};

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: isSmallScreen ? 44 : 48, // Ensure minimum touch target
    ...shadows.sm,
  } as ViewStyle,
  
  secondary: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: isSmallScreen ? 44 : 48,
  } as ViewStyle,
  
  outline: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.primary,
    minHeight: isSmallScreen ? 44 : 48,
  } as ViewStyle,
  
  ghost: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: isSmallScreen ? 40 : 44,
  } as ViewStyle,
  
  fab: {
    backgroundColor: colors.primary,
    width: isSmallScreen ? 52 : 56,
    height: isSmallScreen ? 52 : 56,
    borderRadius: isSmallScreen ? 26 : 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    ...shadows.lg,
  } as ViewStyle,
  
  primaryText: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.background,
  } as TextStyle,
  
  secondaryText: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.text,
  } as TextStyle,
  
  outlineText: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.primary,
  } as TextStyle,
  
  ghostText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  } as TextStyle,
});

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  
  // Headers with responsive padding
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    minHeight: isSmallScreen ? 56 : 64,
  } as ViewStyle,
  
  headerElevated: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    minHeight: isSmallScreen ? 56 : 64,
    ...shadows.sm,
  } as ViewStyle,
  
  headerTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.text,
  } as TextStyle,
  
  // Responsive typography
  title: {
    fontSize: typography['3xl'],
    fontWeight: typography.bold,
    color: colors.text,
    lineHeight: typography['3xl'] * 1.2,
  } as TextStyle,
  
  subtitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.text,
    lineHeight: typography.lg * 1.3,
  } as TextStyle,
  
  heading: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.text,
    lineHeight: typography.xl * 1.2,
  } as TextStyle,
  
  body: {
    fontSize: typography.base,
    fontWeight: typography.normal,
    color: colors.text,
    lineHeight: typography.base * 1.5,
  } as TextStyle,
  
  bodySecondary: {
    fontSize: typography.base,
    fontWeight: typography.normal,
    color: colors.textSecondary,
    lineHeight: typography.base * 1.5,
  } as TextStyle,
  
  caption: {
    fontSize: typography.sm,
    fontWeight: typography.normal,
    color: colors.textTertiary,
    lineHeight: typography.sm * 1.4,
  } as TextStyle,
  
  label: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  } as TextStyle,
  
  // Cards and surfaces with responsive padding
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  } as ViewStyle,
  
  cardElevated: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
  } as ViewStyle,
  
  surface: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  } as ViewStyle,
  
  // Form elements with responsive sizing
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    minHeight: isSmallScreen ? 44 : 48,
  } as ViewStyle & TextStyle,
  
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  } as ViewStyle,
  
  // Layout helpers
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  
  // Responsive spacing
  section: {
    marginBottom: spacing['3xl'],
  } as ViewStyle,
  
  // Priority indicators
  priorityUrgent: {
    backgroundColor: colors.urgent,
  } as ViewStyle,
  
  priorityHigh: {
    backgroundColor: colors.high,
  } as ViewStyle,
  
  priorityMedium: {
    backgroundColor: colors.medium,
  } as ViewStyle,
  
  priorityLow: {
    backgroundColor: colors.low,
  } as ViewStyle,
  
  // Status indicators
  statusSuccess: {
    backgroundColor: colors.success,
  } as ViewStyle,
  
  statusWarning: {
    backgroundColor: colors.warning,
  } as ViewStyle,
  
  statusError: {
    backgroundColor: colors.error,
  } as ViewStyle,
  
  statusInfo: {
    backgroundColor: colors.info,
  } as ViewStyle,
  
  // Responsive grid layouts
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  } as ViewStyle,
  
  gridItem: {
    width: isSmallScreen ? '100%' : isTablet ? '33.333%' : '50%',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  } as ViewStyle,
  
  // Modal styles with responsive sizing
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
    maxHeight: screenHeight * 0.9,
  } as ViewStyle,
  
  // Touch target improvements for small screens
  touchTarget: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  
  // Responsive list item
  listItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    minHeight: isSmallScreen ? 56 : 64,
  } as ViewStyle,
});

// Utility functions for responsive design
export const getScreenDimensions = () => ({
  width: screenWidth,
  height: screenHeight,
  isSmall: isSmallScreen,
  isMedium: isMediumScreen,
  isLarge: isLargeScreen,
  isTablet: isTablet,
});

export const getResponsiveValue = (small: number, medium: number, large: number, tablet: number) => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  if (isLargeScreen) return large;
  if (isTablet) return tablet;
  return medium; // fallback
};

// Safe area utilities
export const useSafeAreaStyle = () => {
  const safeArea = getSafeAreaPadding();
  return {
    paddingTop: safeArea.top,
    paddingBottom: safeArea.bottom,
  };
};
