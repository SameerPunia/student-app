
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../utils/auth';
import { commonStyles, colors, buttonStyles, spacing, borderRadius, typography } from '../styles/commonStyles';
import Icon from './Icon';
import Toast from './Toast';

interface Note {
  id: string;
  title: string | null;
  content: string | null;
  folder_id: string | null;
  color: string | null;
  attachments: any[] | null;
  tags: string[] | null;
}

interface NoteEditorProps {
  visible: boolean;
  note: Note | null;
  folderId: string | null;
  onClose: () => void;
  onSave: () => void;
}

export default function NoteEditor({ visible, note, folderId, onClose, onSave }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const colors_palette = [
    { name: 'White', value: '#FFFFFF' },
    { name: 'Yellow', value: '#FFF9C4' },
    { name: 'Orange', value: '#FFE0B2' },
    { name: 'Pink', value: '#F8BBD0' },
    { name: 'Purple', value: '#E1BEE7' },
    { name: 'Blue', value: '#BBDEFB' },
    { name: 'Cyan', value: '#B2EBF2' },
    { name: 'Green', value: '#C8E6C9' },
    { name: 'Gray', value: '#E0E0E0' },
  ];

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setSelectedColor(note.color || '#FFFFFF');
      setAttachments(note.attachments || []);
      setTags(note.tags || []);
    } else {
      setTitle('');
      setContent('');
      setSelectedColor('#FFFFFF');
      setAttachments([]);
      setTags([]);
    }
  }, [note]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      showToast('Please add a title or content', 'error');
      return;
    }

    setSaving(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('User not found');

      const noteData = {
        title: title.trim() || null,
        content: content.trim() || null,
        folder_id: folderId,
        color: selectedColor,
        attachments: attachments.length > 0 ? attachments : null,
        tags: tags.length > 0 ? tags : null,
        user_id: userId,
      };

      if (note) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', note.id);

        if (error) throw error;
        showToast('Note updated', 'success');
      } else {
        // Create new note
        const { error } = await supabase
          .from('notes')
          .insert(noteData);

        if (error) throw error;
        showToast('Note created', 'success');
      }

      setTimeout(() => {
        onSave();
      }, 500);
    } catch (error) {
      console.error('Error saving note:', error);
      showToast('Failed to save note', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const image = result.assets[0];
        
        // Upload to Supabase Storage
        const userId = await getCurrentUserId();
        if (!userId) return;

        const fileExt = image.uri.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('notes')
          .upload(fileName, {
            uri: image.uri,
            type: 'image/' + fileExt,
            name: fileName,
          } as any);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('notes')
          .getPublicUrl(fileName);

        setAttachments(prev => [...prev, {
          type: 'image',
          url: publicUrl,
          name: fileName,
        }]);

        showToast('Image added', 'success');
      }
    } catch (error) {
      console.error('Error adding image:', error);
      showToast('Failed to add image', 'error');
    }
  };

  const handleAddDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Check file size (limit to 50MB)
        if (file.size && file.size > 50 * 1024 * 1024) {
          showToast('File size must be less than 50MB', 'error');
          return;
        }

        // Upload to Supabase Storage
        const userId = await getCurrentUserId();
        if (!userId) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('notes')
          .upload(fileName, {
            uri: file.uri,
            type: file.mimeType || 'application/octet-stream',
            name: file.name,
          } as any);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('notes')
          .getPublicUrl(fileName);

        setAttachments(prev => [...prev, {
          type: 'document',
          url: publicUrl,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
        }]);

        showToast('Document added', 'success');
      }
    } catch (error) {
      console.error('Error adding document:', error);
      showToast('Failed to add document', 'error');
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const insertFormatting = (format: string) => {
    // Simple formatting insertion
    const formats: { [key: string]: { prefix: string; suffix: string } } = {
      bold: { prefix: '**', suffix: '**' },
      italic: { prefix: '_', suffix: '_' },
      heading: { prefix: '# ', suffix: '' },
      bullet: { prefix: '- ', suffix: '' },
      number: { prefix: '1. ', suffix: '' },
      checkbox: { prefix: '[ ] ', suffix: '' },
    };

    const { prefix, suffix } = formats[format] || { prefix: '', suffix: '' };
    setContent(prev => prev + prefix + suffix);
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={[commonStyles.safeArea, { backgroundColor: selectedColor }]}>
        <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={hideToast} />

        {/* Header */}
        <View style={[commonStyles.headerElevated, commonStyles.rowBetween, { backgroundColor: selectedColor }]}>
          <TouchableOpacity 
            onPress={onClose}
            style={{
              padding: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface,
            }}
          >
            <Icon name="close" size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={[commonStyles.row, { gap: spacing.sm }]}>
            <TouchableOpacity 
              onPress={() => setShowColorPicker(!showColorPicker)}
              style={{
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                backgroundColor: colors.surface,
              }}
            >
              <Icon name="color-palette" size={20} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleSave}
              disabled={saving}
              style={[
                buttonStyles.primary,
                { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={[buttonStyles.primaryText, { fontSize: typography.sm }]}>
                  {note ? 'Update' : 'Save'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Color Picker */}
        {showColorPicker && (
          <View style={{
            backgroundColor: colors.surface,
            padding: spacing.md,
            marginHorizontal: spacing.lg,
            marginTop: spacing.md,
            borderRadius: borderRadius.lg,
          }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[commonStyles.row, { gap: spacing.sm }]}>
                {colors_palette.map(color => (
                  <TouchableOpacity
                    key={color.value}
                    onPress={() => {
                      setSelectedColor(color.value);
                      setShowColorPicker(false);
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: color.value,
                      borderWidth: 2,
                      borderColor: selectedColor === color.value ? colors.primary : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selectedColor === color.value && (
                      <Icon name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.lg }}
          >
            {/* Title */}
            <TextInput
              style={[
                commonStyles.heading,
                {
                  marginBottom: spacing.md,
                  padding: 0,
                  color: colors.text,
                }
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor={colors.textTertiary}
              multiline
            />

            {/* Content */}
            <TextInput
              style={[
                commonStyles.body,
                {
                  minHeight: 200,
                  textAlignVertical: 'top',
                  padding: 0,
                  color: colors.text,
                  lineHeight: typography.base * 1.5,
                }
              ]}
              value={content}
              onChangeText={setContent}
              placeholder="Start typing..."
              placeholderTextColor={colors.textTertiary}
              multiline
            />

            {/* Attachments */}
            {attachments.length > 0 && (
              <View style={{ marginTop: spacing.lg }}>
                <Text style={[commonStyles.label, { marginBottom: spacing.md }]}>Attachments</Text>
                {attachments.map((attachment, index) => (
                  <View
                    key={index}
                    style={[
                      commonStyles.row,
                      {
                        backgroundColor: colors.surface,
                        padding: spacing.md,
                        borderRadius: borderRadius.md,
                        marginBottom: spacing.sm,
                        justifyContent: 'space-between',
                      }
                    ]}
                  >
                    <View style={[commonStyles.row, { flex: 1 }]}>
                      <Icon
                        name={attachment.type === 'image' ? 'image' : 'document'}
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={[commonStyles.body, { marginLeft: spacing.sm, flex: 1 }]} numberOfLines={1}>
                        {attachment.name}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeAttachment(index)}>
                      <Icon name="close-circle" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <View style={{ marginTop: spacing.lg }}>
                <Text style={[commonStyles.label, { marginBottom: spacing.md }]}>Tags</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {tags.map((tag, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => removeTag(tag)}
                      style={{
                        backgroundColor: colors.primary,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: borderRadius.full,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: 'white', marginRight: spacing.xs }}>#{tag}</Text>
                      <Icon name="close" size={14} color="white" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Toolbar */}
          <View style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            padding: spacing.md,
          }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[commonStyles.row, { gap: spacing.md }]}>
                <TouchableOpacity
                  onPress={() => setShowFormatting(!showFormatting)}
                  style={{
                    padding: spacing.sm,
                    borderRadius: borderRadius.md,
                    backgroundColor: showFormatting ? colors.primary : colors.background,
                  }}
                >
                  <Icon name="text" size={20} color={showFormatting ? 'white' : colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAddImage}
                  style={{
                    padding: spacing.sm,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.background,
                  }}
                >
                  <Icon name="image" size={20} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAddDocument}
                  style={{
                    padding: spacing.sm,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.background,
                  }}
                >
                  <Icon name="attach" size={20} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    // Show tag input
                    Alert.prompt(
                      'Add Tag',
                      'Enter a tag name',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Add',
                          onPress: (text) => {
                            if (text && text.trim() && !tags.includes(text.trim())) {
                              setTags(prev => [...prev, text.trim()]);
                            }
                          }
                        }
                      ]
                    );
                  }}
                  style={{
                    padding: spacing.sm,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.background,
                  }}
                >
                  <Icon name="pricetag" size={20} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => insertFormatting('checkbox')}
                  style={{
                    padding: spacing.sm,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.background,
                  }}
                >
                  <Icon name="checkbox" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Formatting Options */}
            {showFormatting && (
              <View style={{ marginTop: spacing.md }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[commonStyles.row, { gap: spacing.sm }]}>
                    {[
                      { icon: 'text', label: 'Bold', action: 'bold' },
                      { icon: 'text', label: 'Italic', action: 'italic' },
                      { icon: 'text', label: 'Heading', action: 'heading' },
                      { icon: 'list', label: 'Bullet', action: 'bullet' },
                      { icon: 'list', label: 'Number', action: 'number' },
                    ].map(format => (
                      <TouchableOpacity
                        key={format.action}
                        onPress={() => insertFormatting(format.action)}
                        style={{
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          borderRadius: borderRadius.md,
                          backgroundColor: colors.background,
                        }}
                      >
                        <Text style={[commonStyles.caption, { color: colors.text }]}>
                          {format.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
