
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../utils/auth';
import { commonStyles, colors, buttonStyles, spacing, borderRadius, typography } from '../styles/commonStyles';
import Icon from './Icon';
import Toast from './Toast';
import PromptDialog from './PromptDialog';

interface FolderManagerProps {
  visible: boolean;
  onClose: () => void;
  onFolderCreated: () => void;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  note_count?: number;
}

export default function FolderManager({ visible, onClose, onFolderCreated }: FolderManagerProps) {
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#007AFF');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [creating, setCreating] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const folderColors = [
    '#007AFF', // Blue
    '#FF9500', // Orange
    '#FF3B30', // Red
    '#34C759', // Green
    '#5856D6', // Purple
    '#FF2D55', // Pink
    '#5AC8FA', // Cyan
    '#FFCC00', // Yellow
    '#8E8E93', // Gray
  ];

  const folderIcons = [
    'folder',
    'folder-open',
    'briefcase',
    'book',
    'school',
    'home',
    'heart',
    'star',
    'bookmark',
  ];

  useEffect(() => {
    if (visible) {
      fetchFolders();
    }
  }, [visible]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('note_folders')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;

      const foldersWithCount = await Promise.all(
        (data || []).map(async (folder) => {
          const { count } = await supabase
            .from('notes')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', folder.id);
          return { ...folder, note_count: count || 0 };
        })
      );

      setFolders(foldersWithCount);
    } catch (error) {
      console.error('Error fetching folders:', error);
      showToast('Failed to load folders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      showToast('Please enter a folder name', 'error');
      return;
    }

    setCreating(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('User not found');

      const { error } = await supabase
        .from('note_folders')
        .insert({
          name: folderName.trim(),
          color: selectedColor,
          icon: selectedIcon,
          user_id: userId,
        });

      if (error) throw error;

      showToast('Folder created', 'success');
      setFolderName('');
      setSelectedColor('#007AFF');
      setSelectedIcon('folder');
      
      await fetchFolders();
      
      setTimeout(() => {
        onFolderCreated();
      }, 500);
    } catch (error) {
      console.error('Error creating folder:', error);
      showToast('Failed to create folder', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRenameFolder = (folder: Folder) => {
    setRenamingFolder(folder);
    setShowRenameDialog(true);
  };

  const renameFolder = async (newName: string) => {
    if (!renamingFolder || !newName.trim()) return;

    try {
      const { error } = await supabase
        .from('note_folders')
        .update({ name: newName.trim() })
        .eq('id', renamingFolder.id);

      if (error) throw error;

      showToast('Folder renamed', 'success');
      await fetchFolders();
      setShowRenameDialog(false);
      setRenamingFolder(null);
    } catch (error) {
      console.error('Error renaming folder:', error);
      showToast('Failed to rename folder', 'error');
    }
  };

  const deleteFolder = async (folderId: string) => {
    Alert.alert(
      'Delete Folder',
      'Are you sure you want to delete this folder? Notes in this folder will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Move notes to root (no folder)
              await supabase
                .from('notes')
                .update({ folder_id: null })
                .eq('folder_id', folderId);

              // Delete folder
              const { error } = await supabase
                .from('note_folders')
                .delete()
                .eq('id', folderId);

              if (error) throw error;

              showToast('Folder deleted', 'success');
              await fetchFolders();
              onFolderCreated();
            } catch (error) {
              console.error('Error deleting folder:', error);
              showToast('Failed to delete folder', 'error');
            }
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
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
          maxHeight: '90%',
        }}>
          <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={hideToast} />

          <View style={[commonStyles.rowBetween, { marginBottom: spacing.xl }]}>
            <Text style={commonStyles.heading}>Manage Folders</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Create New Folder Section */}
            <View style={{
              backgroundColor: colors.surface,
              padding: spacing.lg,
              borderRadius: borderRadius.lg,
              marginBottom: spacing.xl,
            }}>
              <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>Create New Folder</Text>

              {/* Folder Name */}
              <Text style={commonStyles.label}>Folder Name</Text>
              <TextInput
                style={[commonStyles.input, { backgroundColor: colors.background }]}
                value={folderName}
                onChangeText={setFolderName}
                placeholder="Enter folder name"
                placeholderTextColor={colors.textTertiary}
              />

              {/* Color Selection */}
              <Text style={[commonStyles.label, { marginTop: spacing.lg }]}>Color</Text>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.md,
                marginBottom: spacing.lg,
              }}>
                {folderColors.map(color => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setSelectedColor(color)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: color,
                      borderWidth: 3,
                      borderColor: selectedColor === color ? colors.text : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selectedColor === color && (
                      <Icon name="checkmark" size={20} color="white" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Icon Selection */}
              <Text style={commonStyles.label}>Icon</Text>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.md,
                marginBottom: spacing.lg,
              }}>
                {folderIcons.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    onPress={() => setSelectedIcon(icon)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: borderRadius.md,
                      backgroundColor: selectedIcon === icon ? selectedColor : colors.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: selectedIcon === icon ? selectedColor : colors.border,
                    }}
                  >
                    <Icon
                      name={icon}
                      size={20}
                      color={selectedIcon === icon ? 'white' : colors.text}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Preview */}
              <View style={{
                backgroundColor: colors.background,
                padding: spacing.md,
                borderRadius: borderRadius.lg,
                marginBottom: spacing.lg,
              }}>
                <Text style={[commonStyles.caption, { marginBottom: spacing.sm, color: colors.textSecondary }]}>
                  Preview
                </Text>
                <View style={[commonStyles.row, { alignItems: 'center' }]}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: borderRadius.md,
                    backgroundColor: selectedColor + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon name={selectedIcon} size={20} color={selectedColor} />
                  </View>
                  <View style={{ marginLeft: spacing.md, flex: 1 }}>
                    <Text style={commonStyles.subtitle}>
                      {folderName.trim() || 'Folder Name'}
                    </Text>
                    <Text style={commonStyles.caption}>0 notes</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[buttonStyles.primary, { width: '100%' }]}
                onPress={handleCreateFolder}
                disabled={creating || !folderName.trim()}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={buttonStyles.primaryText}>Create Folder</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Existing Folders */}
            <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>Your Folders</Text>
            
            {loading ? (
              <View style={[commonStyles.center, { padding: spacing.xl }]}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : folders.length > 0 ? (
              folders.map((folder) => (
                <View
                  key={folder.id}
                  style={[
                    commonStyles.card,
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }
                  ]}
                >
                  <View style={[commonStyles.row, { flex: 1, alignItems: 'center' }]}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: borderRadius.md,
                      backgroundColor: folder.color + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon name={folder.icon} size={20} color={folder.color} />
                    </View>
                    <View style={{ marginLeft: spacing.md, flex: 1 }}>
                      <Text style={commonStyles.subtitle}>{folder.name}</Text>
                      <Text style={commonStyles.caption}>{folder.note_count || 0} notes</Text>
                    </View>
                  </View>

                  <View style={[commonStyles.row, { gap: spacing.sm }]}>
                    <TouchableOpacity
                      onPress={() => handleRenameFolder(folder)}
                      style={{
                        padding: spacing.sm,
                        borderRadius: borderRadius.md,
                        backgroundColor: colors.surface,
                      }}
                    >
                      <Icon name="create" size={16} color={colors.info} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => deleteFolder(folder.id)}
                      style={{
                        padding: spacing.sm,
                        borderRadius: borderRadius.md,
                        backgroundColor: colors.surface,
                      }}
                    >
                      <Icon name="trash" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={[commonStyles.center, { padding: spacing.xl }]}>
                <Icon name="folder-outline" size={48} color={colors.textTertiary} />
                <Text style={[commonStyles.caption, { marginTop: spacing.md, textAlign: 'center' }]}>
                  No folders yet. Create one above!
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      <PromptDialog
        visible={showRenameDialog}
        title="Rename Folder"
        message="Enter a new name for this folder"
        placeholder="Folder name"
        defaultValue={renamingFolder?.name || ''}
        onConfirm={renameFolder}
        onCancel={() => {
          setShowRenameDialog(false);
          setRenamingFolder(null);
        }}
      />
    </Modal>
  );
}
