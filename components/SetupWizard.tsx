
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Import clipboard with fallback for Expo Go compatibility
import * as Clipboard from 'expo-clipboard';
import Icon from './Icon';
import Toast from './Toast';
import { dependencyChecker, type DependencyCheckResult } from '../utils/dependencyChecker';
import { 
  commonStyles, 
  colors, 
  buttonStyles, 
  spacing, 
  borderRadius, 
  typography,
  isSmallScreen,
  getResponsiveSpacing 
} from '../styles/commonStyles';

interface SetupWizardProps {
  visible: boolean;
  onClose: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<DependencyCheckResult | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const displayToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const runDependencyCheck = useCallback(async () => {
    setLoading(true);
    try {
      const result = await dependencyChecker.checkProjectSetup();
      setCheckResult(result);
      
      if (result.isReady) {
        displayToast('✅ Project setup looks good!', 'success');
      } else {
        displayToast(`⚠️ Found ${result.missingDependencies.length} setup issues`, 'warning');
      }
    } catch (error) {
      console.error('Setup check failed:', error);
      displayToast('❌ Failed to check project setup', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      runDependencyCheck();
    }
  }, [visible, runDependencyCheck]);

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      displayToast('Command copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback to showing the command in an alert
      Alert.alert(
        'Setup Command',
        text,
        [
          { text: 'Close', style: 'cancel' },
        ]
      );
    }
  };

  const openDocumentation = () => {
    const url = 'https://docs.expo.dev/get-started/installation/';
    Linking.openURL(url).catch(() => {
      displayToast('Could not open documentation', 'error');
    });
  };

  const getStatusIcon = (isReady: boolean) => {
    return isReady ? 'checkmark-circle' : 'alert-circle';
  };

  const getStatusColor = (isReady: boolean) => {
    return isReady ? colors.success : colors.warning;
  };

  const renderSetupCommand = (command: string, index: number) => (
    <TouchableOpacity
      key={index}
      style={{
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
      }}
      onPress={() => copyToClipboard(command)}
    >
      <View style={[commonStyles.rowBetween, { alignItems: 'flex-start' }]}>
        <Text style={{
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          fontSize: typography.sm,
          color: colors.text,
          flex: 1,
          marginRight: spacing.sm,
        }}>
          {command}
        </Text>
        <Icon name="copy" size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const renderDependencyItem = (dependency: string, index: number) => (
    <View
      key={index}
      style={[
        commonStyles.row,
        {
          backgroundColor: colors.error + '10',
          borderRadius: borderRadius.sm,
          padding: spacing.sm,
          marginBottom: spacing.xs,
          borderLeftWidth: 3,
          borderLeftColor: colors.error,
        }
      ]}
    >
      <Icon name="close-circle" size={16} color={colors.error} />
      <Text style={[
        commonStyles.body,
        { 
          marginLeft: spacing.sm,
          color: colors.error,
          fontSize: typography.sm,
        }
      ]}>
        {dependency}
      </Text>
    </View>
  );

  const renderWarningItem = (warning: string, index: number) => (
    <View
      key={index}
      style={[
        commonStyles.row,
        {
          backgroundColor: colors.warning + '10',
          borderRadius: borderRadius.sm,
          padding: spacing.sm,
          marginBottom: spacing.xs,
          borderLeftWidth: 3,
          borderLeftColor: colors.warning,
        }
      ]}
    >
      <Icon name="warning" size={16} color={colors.warning} />
      <Text style={[
        commonStyles.body,
        { 
          marginLeft: spacing.sm,
          color: colors.warning,
          fontSize: typography.sm,
        }
      ]}>
        {warning}
      </Text>
    </View>
  );

  const renderRecommendationItem = (recommendation: string, index: number) => (
    <View
      key={index}
      style={[
        commonStyles.row,
        {
          backgroundColor: colors.info + '10',
          borderRadius: borderRadius.sm,
          padding: spacing.sm,
          marginBottom: spacing.xs,
          borderLeftWidth: 3,
          borderLeftColor: colors.info,
        }
      ]}
    >
      <Icon name="information-circle" size={16} color={colors.info} />
      <Text style={[
        commonStyles.body,
        { 
          marginLeft: spacing.sm,
          color: colors.info,
          fontSize: typography.sm,
        }
      ]}>
        {recommendation}
      </Text>
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={commonStyles.safeArea}>
          {/* Header */}
          <View style={[
            commonStyles.headerElevated,
            commonStyles.rowBetween,
            { paddingHorizontal: getResponsiveSpacing(16) }
          ]}>
            <View>
              <Text style={[
                commonStyles.headerTitle,
                { fontSize: isSmallScreen ? typography.lg : typography.xl }
              ]}>
                Setup Wizard
              </Text>
              <Text style={[
                commonStyles.caption,
                { color: colors.textSecondary, marginTop: 2 }
              ]}>
                Project configuration checker
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[commonStyles.touchTarget, { marginRight: -spacing.sm }]}
            >
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ 
              padding: getResponsiveSpacing(16),
              paddingBottom: spacing['4xl'],
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Status Overview */}
            <View style={[commonStyles.card, { marginBottom: spacing.lg }]}>
              <View style={[commonStyles.rowBetween, { marginBottom: spacing.md }]}>
                <Text style={commonStyles.heading}>Project Status</Text>
                <TouchableOpacity
                  onPress={runDependencyCheck}
                  disabled={loading}
                  style={[
                    buttonStyles.ghost,
                    { paddingHorizontal: spacing.sm }
                  ]}
                >
                  <Icon 
                    name="refresh" 
                    size={16} 
                    color={colors.primary}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Text style={buttonStyles.ghostText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={[commonStyles.center, { padding: spacing.xl }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[
                    commonStyles.caption,
                    { marginTop: spacing.md, color: colors.textSecondary }
                  ]}>
                    Scanning project configuration...
                  </Text>
                </View>
              ) : checkResult ? (
                <View style={[commonStyles.row, { alignItems: 'flex-start' }]}>
                  <Icon
                    name={getStatusIcon(checkResult.isReady)}
                    size={24}
                    color={getStatusColor(checkResult.isReady)}
                  />
                  <View style={{ marginLeft: spacing.md, flex: 1 }}>
                    <Text style={[
                      commonStyles.subtitle,
                      { 
                        color: getStatusColor(checkResult.isReady),
                        marginBottom: spacing.xs,
                      }
                    ]}>
                      {checkResult.isReady ? 'Ready for Development' : 'Setup Required'}
                    </Text>
                    <Text style={[commonStyles.bodySecondary, { fontSize: typography.sm }]}>
                      {checkResult.isReady
                        ? 'Your project configuration looks good!'
                        : `Found ${checkResult.missingDependencies.length} missing dependencies and ${checkResult.warnings.length} warnings.`
                      }
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {checkResult && !checkResult.isReady && (
              <>
                {/* Missing Dependencies */}
                {checkResult.missingDependencies.length > 0 && (
                  <View style={[commonStyles.card, { marginBottom: spacing.lg }]}>
                    <View style={[commonStyles.row, { marginBottom: spacing.md }]}>
                      <Icon name="close-circle" size={20} color={colors.error} />
                      <Text style={[
                        commonStyles.heading,
                        { marginLeft: spacing.sm, color: colors.error }
                      ]}>
                        Missing Dependencies ({checkResult.missingDependencies.length})
                      </Text>
                    </View>
                    {checkResult.missingDependencies.map(renderDependencyItem)}
                  </View>
                )}

                {/* Setup Commands */}
                {checkResult.setupCommands.length > 0 && (
                  <View style={[commonStyles.card, { marginBottom: spacing.lg }]}>
                    <View style={[commonStyles.row, { marginBottom: spacing.md }]}>
                      <Icon name="terminal" size={20} color={colors.primary} />
                      <Text style={[
                        commonStyles.heading,
                        { marginLeft: spacing.sm }
                      ]}>
                        Required Commands ({checkResult.setupCommands.length})
                      </Text>
                    </View>
                    <Text style={[
                      commonStyles.caption,
                      { marginBottom: spacing.md, color: colors.textSecondary }
                    ]}>
                      Tap any command to copy it to your clipboard
                    </Text>
                    {checkResult.setupCommands.map(renderSetupCommand)}
                  </View>
                )}
              </>
            )}

            {/* Warnings */}
            {checkResult && checkResult.warnings.length > 0 && (
              <View style={[commonStyles.card, { marginBottom: spacing.lg }]}>
                <View style={[commonStyles.row, { marginBottom: spacing.md }]}>
                  <Icon name="warning" size={20} color={colors.warning} />
                  <Text style={[
                    commonStyles.heading,
                    { marginLeft: spacing.sm, color: colors.warning }
                  ]}>
                    Warnings ({checkResult.warnings.length})
                  </Text>
                </View>
                {checkResult.warnings.map(renderWarningItem)}
              </View>
            )}

            {/* Recommendations */}
            {checkResult && checkResult.recommendations.length > 0 && (
              <View style={[commonStyles.card, { marginBottom: spacing.lg }]}>
                <View style={[commonStyles.row, { marginBottom: spacing.md }]}>
                  <Icon name="bulb" size={20} color={colors.info} />
                  <Text style={[
                    commonStyles.heading,
                    { marginLeft: spacing.sm, color: colors.info }
                  ]}>
                    Recommendations ({checkResult.recommendations.length})
                  </Text>
                </View>
                {checkResult.recommendations.map(renderRecommendationItem)}
              </View>
            )}

            {/* Help Section */}
            <View style={commonStyles.card}>
              <Text style={[commonStyles.heading, { marginBottom: spacing.md }]}>
                Need Help?
              </Text>
              <Text style={[
                commonStyles.bodySecondary,
                { marginBottom: spacing.lg, fontSize: typography.sm }
              ]}>
                If you're having trouble with the setup, check out the official documentation or contact support.
              </Text>
              
              <View style={{ gap: spacing.md }}>
                <TouchableOpacity
                  style={buttonStyles.outline}
                  onPress={openDocumentation}
                >
                  <Icon name="book" size={16} color={colors.primary} style={{ marginRight: spacing.xs }} />
                  <Text style={buttonStyles.outlineText}>View Documentation</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={buttonStyles.secondary}
                  onPress={() => displayToast('Setup wizard completed', 'info')}
                >
                  <Icon name="checkmark" size={16} color={colors.text} style={{ marginRight: spacing.xs }} />
                  <Text style={buttonStyles.secondaryText}>Mark as Complete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
    </>
  );
};

export default SetupWizard;
