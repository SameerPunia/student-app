
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import Icon from '../components/Icon';
import Toast from '../components/Toast';
import { commonStyles, colors, buttonStyles, spacing, borderRadius, shadows, typography } from '../styles/commonStyles';
import { getCurrentUser, signOut, type CurrentUser } from '../utils/auth';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  
  // Change password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const fetchUserProfile = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      if (!user) {
        router.replace('/');
        return;
      }

      if (user.isGuest) {
        setUser({
          id: user.id,
          email: user.email || 'guest@example.com',
          name: user.name || 'Guest User',
          avatar_url: null,
          created_at: user.created_at || new Date().toISOString(),
        });
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.replace('/');
          return;
        }

        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (error && error.code === 'PGRST116') {
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email,
              name: authUser.user_metadata?.name || null,
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating user profile:', insertError);
            showToast('Error loading profile', 'error');
          } else {
            setUser(newUser);
          }
        } else if (error) {
          console.error('Error fetching user profile:', error);
          showToast('Error loading profile', 'error');
        } else {
          setUser(userProfile);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      showToast('Error loading profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleSignOut = async () => {
  try {
    setSigningOut(true);
    showToast('Signing out...', 'info');

    // 🔹 Call your existing signOut() function from utils/auth
    await signOut();

    // 🔹 Redirect user back to login/home screen
    if (Platform.OS === 'web') {
      // Web: clear everything and reload
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/');
    } else {
      // Mobile: navigate back to login screen
      router.replace('/');
    }

    setSigningOut(false);
    console.log('✅ User signed out successfully');
  } catch (error) {
    console.error('Sign-out error:', error);
    showToast('❌ Failed to sign out. Please try again.', 'error');
    setSigningOut(false);
  }
};


  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast('Please fill in all password fields', 'error');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      showToast('New password must be different from current password', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) {
        throw updateError;
      }

      showToast('✅ Password changed successfully!', 'success');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowChangePasswordModal(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      showToast(`❌ Failed to change password: ${error.message}`, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const pickImage = async () => {
    if (currentUser?.isGuest) {
      showToast('Profile picture upload is not available for guest users', 'info');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission to access camera roll is required!', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast('Error selecting image', 'error');
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;

    setUploading(true);
    
    try {
      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { 
          upsert: true,
          contentType: `image/${fileExt}` 
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('Generated public URL:', publicUrl);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      setUser(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      showToast('✅ Profile picture updated successfully!', 'success');

    } catch (error: any) {
      console.error('Error uploading image:', error);
      showToast(`❌ Error uploading image: ${error.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async () => {
    if (!user || !editName.trim()) {
      showToast('Please enter a valid name', 'error');
      return;
    }

    if (currentUser?.isGuest) {
      setUser(prev => prev ? { ...prev, name: editName.trim() } : null);
      setShowEditModal(false);
      showToast('✅ Profile updated locally! (Guest mode - changes won&apos;t be saved)', 'success');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ name: editName.trim() })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setUser(prev => prev ? { ...prev, name: editName.trim() } : null);
      setShowEditModal(false);
      showToast('✅ Profile updated successfully!', 'success');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showToast(`❌ Error updating profile: ${error.message}`, 'error');
    }
  };

  const openEditModal = () => {
    setEditName(user?.name || '');
    setShowEditModal(true);
  };

  const openChangePasswordModal = () => {
    if (currentUser?.isGuest) {
      showToast('Password change is not available for guest users', 'info');
      return;
    }

    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowChangePasswordModal(true);
  };

  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getInitialColor = (name: string | null): string => {
    if (!name) return colors.primary;
    const colors_list = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    const index = name.charCodeAt(0) % colors_list.length;
    return colors_list[index];
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={[commonStyles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, color: colors.textSecondary }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={[commonStyles.headerElevated, commonStyles.rowBetween]}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{
              padding: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface,
            }}
            disabled={signingOut}
          >
            <Icon name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={commonStyles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing['4xl'] }}
          scrollEnabled={!signingOut}
        >
          <View style={[commonStyles.cardElevated, { margin: spacing.lg, alignItems: 'center' }]}>
            <TouchableOpacity 
              onPress={pickImage}
              disabled={uploading || signingOut}
              style={{
                position: 'relative',
                marginBottom: spacing.lg,
              }}
            >
              {user?.avatar_url ? (
                <Image 
                  source={{ uri: user.avatar_url }} 
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: colors.surface,
                  }}
                />
              ) : currentUser?.isGuest ? (
                <View style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: colors.warning + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.warning,
                }}>
                  <Icon name="person-outline" size={48} color={colors.warning} />
                </View>
              ) : (
                <View style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: getInitialColor(user?.name),
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: colors.background,
                  ...shadows.lg,
                }}>
                  <Text style={{
                    fontSize: 48,
                    fontWeight: 'bold',
                    color: 'white',
                  }}>
                    {getInitials(user?.name)}
                  </Text>
                </View>
              )}
              
              {uploading && (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 60,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ActivityIndicator color="white" />
                </View>
              )}
              
              {!currentUser?.isGuest && (
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: colors.primary,
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: colors.background,
                }}>
                  <Icon name="camera" size={16} color="white" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={[commonStyles.heading, { textAlign: 'center', marginBottom: spacing.xs }]}>
              {user?.name || 'No name set'}
            </Text>
            <Text style={[commonStyles.bodySecondary, { textAlign: 'center', marginBottom: currentUser?.isGuest ? spacing.sm : spacing.lg }]}>
              {user?.email}
            </Text>
            
            {currentUser?.isGuest && (
              <View style={{
                backgroundColor: colors.warning + '20',
                borderColor: colors.warning,
                borderWidth: 1,
                borderRadius: borderRadius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                marginBottom: spacing.lg,
                alignSelf: 'center',
              }}>
                <View style={[commonStyles.rowCenter]}>
                  <Icon name="person-outline" size={16} color={colors.warning} />
                  <Text style={[
                    commonStyles.caption, 
                    { 
                      marginLeft: spacing.xs, 
                      color: colors.warning,
                      fontWeight: '600',
                    }
                  ]}>
                    Guest Mode
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[buttonStyles.secondary, { paddingHorizontal: spacing.xl }]}
              onPress={openEditModal}
              disabled={signingOut}
            >
              <Icon name="create" size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />
              <Text style={buttonStyles.secondaryText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: spacing.lg }}>
            <Text style={[commonStyles.heading, { marginBottom: spacing.lg }]}>Account Settings</Text>
            
            <View style={commonStyles.cardElevated}>
              <TouchableOpacity 
                style={[commonStyles.rowBetween, { paddingVertical: spacing.md }]}
                onPress={openChangePasswordModal}
                disabled={signingOut}
              >
                <View style={commonStyles.row}>
                  <Icon name="key" size={20} color={colors.textSecondary} />
                  <Text style={[commonStyles.subtitle, { marginLeft: spacing.md }]}>
                    Change Password
                  </Text>
                </View>
                <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>

              <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.sm }} />

              <TouchableOpacity 
                style={[commonStyles.rowBetween, { paddingVertical: spacing.md }]}
                onPress={openEditModal}
                disabled={signingOut}
              >
                <View style={commonStyles.row}>
                  <Icon name="person" size={20} color={colors.textSecondary} />
                  <Text style={[commonStyles.subtitle, { marginLeft: spacing.md }]}>
                    Update Profile
                  </Text>
                </View>
                <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing['3xl'] }}>
            <TouchableOpacity
              style={[
                buttonStyles.outline,
                { 
                  borderColor: colors.error,
                  paddingVertical: spacing.lg,
                },
                signingOut && { opacity: 0.7 }
              ]}
              onPress={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? (
                <View style={commonStyles.rowCenter}>
                  <ActivityIndicator color={colors.error} size="small" />
                  <Text style={[buttonStyles.outlineText, { color: colors.error, marginLeft: spacing.sm }]}>
                    Signing Out...
                  </Text>
                </View>
              ) : (
                <>
                  <Icon name="log-out" size={20} color={colors.error} style={{ marginRight: spacing.sm }} />
                  <Text style={[buttonStyles.outlineText, { color: colors.error }]}>
                    Sign Out
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            padding: spacing.xl,
            paddingBottom: spacing['2xl'],
          }}>
            <View style={[commonStyles.rowBetween, { marginBottom: spacing.xl }]}>
              <Text style={commonStyles.heading}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={commonStyles.label}>Full Name</Text>
            <TextInput
              style={[commonStyles.input, { backgroundColor: colors.surface }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />

            <View style={[commonStyles.row, { gap: spacing.md, marginTop: spacing.lg }]}>
              <TouchableOpacity
                style={[buttonStyles.secondary, { flex: 1 }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={buttonStyles.secondaryText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[buttonStyles.primary, { flex: 1 }]}
                onPress={updateProfile}
              >
                <Text style={buttonStyles.primaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showChangePasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            padding: spacing.xl,
            paddingBottom: spacing['2xl'],
          }}>
            <View style={[commonStyles.rowBetween, { marginBottom: spacing.xl }]}>
              <Text style={commonStyles.heading}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePasswordModal(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={commonStyles.label}>Current Password</Text>
            <TextInput
              style={[commonStyles.input, { backgroundColor: colors.surface }]}
              value={passwordForm.currentPassword}
              onChangeText={(text) => setPasswordForm(prev => ({ ...prev, currentPassword: text }))}
              placeholder="Enter your current password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={commonStyles.label}>New Password</Text>
            <TextInput
              style={[commonStyles.input, { backgroundColor: colors.surface }]}
              value={passwordForm.newPassword}
              onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))}
              placeholder="Enter new password (min 6 characters)"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={commonStyles.label}>Confirm New Password</Text>
            <TextInput
              style={[commonStyles.input, { backgroundColor: colors.surface }]}
              value={passwordForm.confirmPassword}
              onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={[commonStyles.row, { gap: spacing.md, marginTop: spacing.lg }]}>
              <TouchableOpacity
                style={[buttonStyles.secondary, { flex: 1 }]}
                onPress={() => setShowChangePasswordModal(false)}
                disabled={changingPassword}
              >
                <Text style={buttonStyles.secondaryText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[buttonStyles.primary, { flex: 1 }, changingPassword && { opacity: 0.7 }]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <View style={commonStyles.rowCenter}>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={[buttonStyles.primaryText, { marginLeft: spacing.sm }]}>
                      Changing...
                    </Text>
                  </View>
                ) : (
                  <Text style={buttonStyles.primaryText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
        duration={3000}
      />
    </>
  );
}
