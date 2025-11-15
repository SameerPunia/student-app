
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { clearUserCache } from '../utils/auth';
import { 
  commonStyles, 
  colors, 
  buttonStyles, 
  spacing, 
  borderRadius, 
  shadows, 
  typography,
  isSmallScreen,
  isTablet,
  getResponsiveSpacing,
  getScreenDimensions,
  getResponsiveValue
} from '../styles/commonStyles';
import Icon from './Icon';
import Toast from './Toast';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const validateEmail = useCallback((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validatePassword = useCallback((password: string) => {
    return password.length >= 6;
  }, []);

  const handleAuth = useCallback(async () => {
    console.log('handleAuth called', { isLogin, email: email ? 'provided' : 'empty', password: password ? 'provided' : 'empty' });
    
    if (!email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (!validateEmail(email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    if (!validatePassword(password)) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    if (!isLogin && !name.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }

    setLoading(true);
    console.log('Starting auth process...', isLogin ? 'Login' : 'Sign Up');

    try {
      if (isLogin) {
        console.log('Attempting login...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        console.log('Login response:', { 
          user: data.user ? 'User object received' : 'No user', 
          session: data.session ? 'Session received' : 'No session',
          error: error ? error.message : 'No error' 
        });

        if (error) {
          console.error('Login error:', error);
          
          if (error.message.includes('Invalid login credentials')) {
            showToast('❌ Invalid email or password. Please check your credentials and try again.', 'error');
          } else if (error.message.includes('Email not confirmed')) {
            showToast('Please check your email and verify your account before signing in', 'warning');
          } else if (error.message.includes('Too many requests')) {
            showToast('Too many login attempts. Please wait a moment and try again', 'error');
          } else {
            showToast(`❌ Login failed: ${error.message}`, 'error');
          }
        } else if (data.user) {
          console.log('Login successful for:', data.user.email);
          clearUserCache();
          showToast('✅ Login successful. Welcome back!', 'success');
          
          setTimeout(() => {
            onAuthSuccess();
          }, 1500);
        }
      } else {
        console.log('Attempting sign up...');
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: 'https://natively.dev/email-confirmed',
            data: {
              name: name.trim(),
            },
          },
        });

        console.log('Sign up response:', { 
          user: data.user ? 'User object received' : 'No user', 
          session: data.session ? 'Session received' : 'No session',
          error: error ? error.message : 'No error' 
        });

        if (error) {
          console.error('Sign up error:', error);
          
          if (error.message.includes('User already registered')) {
            showToast('An account with this email already exists. Please sign in instead.', 'error');
            setIsLogin(true);
          } else if (error.message.includes('Password should be at least')) {
            showToast('Password is too weak. Please choose a stronger password.', 'error');
          } else if (error.message.includes('Invalid email')) {
            showToast('Please enter a valid email address', 'error');
          } else {
            showToast(`❌ Registration failed: ${error.message}`, 'error');
          }
        } else if (data.user) {
          console.log('Sign up successful for:', data.user.email);
          
          showToast('✅ Account created successfully. Please check your email to verify your account.', 'success');
          
          setTimeout(() => {
            setIsLogin(true);
            setPassword('');
            setName('');
          }, 2000);
        }
      }
    } catch (error: any) {
      console.error('Unexpected auth error:', error);
      showToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
      console.log('Auth process completed');
    }
  }, [isLogin, email, password, name, showToast, validateEmail, validatePassword, onAuthSuccess]);

  const switchMode = useCallback(() => {
    setIsLogin(!isLogin);
    setPassword('');
    setName('');
    hideToast();
  }, [isLogin, hideToast]);

  const { isSmall, isTablet: isTabletScreen } = getScreenDimensions();
  const horizontalPadding = getResponsiveSpacing(24);
  const logoSize = getResponsiveValue(40, 48, 56, 64);
  const logoContainerSize = getResponsiveValue(80, 96, 112, 128);

  return (
    <>
      <SafeAreaView style={commonStyles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ 
              flexGrow: 1,
              justifyContent: 'center',
              padding: horizontalPadding,
              paddingVertical: getResponsiveSpacing(40),
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ 
              alignItems: 'center', 
              marginBottom: getResponsiveSpacing(48),
            }}>
              <View style={{
                backgroundColor: colors.primary,
                padding: getResponsiveSpacing(24),
                borderRadius: borderRadius.full,
                marginBottom: getResponsiveSpacing(24),
                width: logoContainerSize,
                height: logoContainerSize,
                alignItems: 'center',
                justifyContent: 'center',
                ...shadows.lg,
              }}>
                <Icon name="school" size={logoSize} color="white" />
              </View>
              <Text style={[
                commonStyles.title, 
                { 
                  textAlign: 'center', 
                  marginBottom: spacing.sm,
                  fontSize: isSmall ? typography['2xl'] : typography['3xl'],
                }
              ]}>
                Student Buddy
              </Text>
              <Text style={[
                commonStyles.bodySecondary, 
                { 
                  textAlign: 'center', 
                  fontSize: isSmall ? typography.base : typography.lg,
                  paddingHorizontal: isSmall ? 0 : spacing.xl,
                }
              ]}>
                Your AI-powered study companion
              </Text>
            </View>

            <View style={{ 
              marginBottom: getResponsiveSpacing(32),
              maxWidth: isTabletScreen ? 400 : '100%',
              alignSelf: 'center',
              width: '100%',
            }}>
              <Text style={commonStyles.label}>Email Address</Text>
              <TextInput
                style={[
                  commonStyles.input,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    fontSize: isSmall ? typography.sm : typography.base,
                  }
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                textContentType="emailAddress"
                autoComplete="email"
              />

              {!isLogin && (
                <>
                  <Text style={commonStyles.label}>Full Name</Text>
                  <TextInput
                    style={[
                      commonStyles.input,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                        fontSize: isSmall ? typography.sm : typography.base,
                      }
                    ]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                    editable={!loading}
                    textContentType="name"
                    autoComplete="name"
                  />
                </>
              )}

              <Text style={commonStyles.label}>Password</Text>
              <TextInput
                style={[
                  commonStyles.input,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    fontSize: isSmall ? typography.sm : typography.base,
                  }
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder={isLogin ? "Enter your password" : "Create a password (min 6 characters)"}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
                textContentType={isLogin ? "password" : "newPassword"}
                autoComplete={isLogin ? "password" : "password-new"}
              />
            </View>

            <View style={{
              maxWidth: isTabletScreen ? 400 : '100%',
              alignSelf: 'center',
              width: '100%',
            }}>
              <TouchableOpacity
                style={[
                  buttonStyles.primary, 
                  { 
                    marginBottom: spacing.lg,
                    paddingVertical: getResponsiveSpacing(16),
                  },
                  loading && { opacity: 0.7 }
                ]}
                onPress={handleAuth}
                disabled={loading}
                accessibilityLabel={isLogin ? 'Sign in to your account' : 'Create new account'}
                accessibilityRole="button"
              >
                {loading ? (
                  <View style={commonStyles.rowCenter}>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={[buttonStyles.primaryText, { marginLeft: spacing.sm }]}>
                      {isLogin ? 'Signing In...' : 'Creating Account...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={buttonStyles.primaryText}>
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[buttonStyles.ghost, { alignSelf: 'center' }]}
                onPress={switchMode}
                disabled={loading}
                accessibilityLabel={isLogin ? 'Switch to sign up' : 'Switch to sign in'}
                accessibilityRole="button"
              >
                <Text style={[
                  buttonStyles.ghostText, 
                  { 
                    color: colors.primary,
                    fontSize: isSmall ? typography.sm : typography.base,
                  }
                ]}>
                  {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                </Text>
              </TouchableOpacity>

              {loading && (
                <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
                  <Text style={[
                    commonStyles.caption, 
                    { 
                      color: colors.textSecondary,
                      textAlign: 'center',
                    }
                  ]}>
                    {isLogin 
                      ? 'Verifying credentials...' 
                      : 'Creating your account...'
                    }
                  </Text>
                </View>
              )}

              {!isLogin && (
                <View style={[
                  commonStyles.surface,
                  { 
                    marginTop: spacing.xl, 
                    padding: getResponsiveSpacing(16),
                    borderLeftWidth: 4,
                    borderLeftColor: colors.info,
                  }
                ]}>
                  <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
                    <Icon name="information-circle" size={20} color={colors.info} />
                    <Text style={[
                      commonStyles.label, 
                      { 
                        marginLeft: spacing.sm, 
                        marginBottom: 0,
                        fontSize: isSmall ? typography.sm : typography.base,
                      }
                    ]}>
                      Email Verification Required
                    </Text>
                  </View>
                  <Text style={[
                    commonStyles.caption, 
                    { 
                      lineHeight: typography.sm * 1.4,
                      fontSize: isSmall ? typography.xs : typography.sm,
                    }
                  ]}>
                    After signing up, you&apos;ll receive a verification email. Please check your inbox and click the verification link to activate your account.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
        duration={4000}
      />
    </>
  );
}
