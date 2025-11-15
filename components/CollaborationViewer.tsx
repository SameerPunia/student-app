
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../utils/auth';
import { commonStyles, colors, buttonStyles, spacing, borderRadius, shadows, typography } from '../styles/commonStyles';
import Icon from './Icon';
import Toast from './Toast';

interface CollaborationSession {
  id: string;
  conversation_id: string;
  document_type: 'text' | 'pdf' | 'note' | 'whiteboard';
  document_title: string;
  document_content?: string | null;
  document_url?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Annotation {
  id: string;
  session_id: string;
  user_id: string;
  annotation_type: 'highlight' | 'comment' | 'marker' | 'note';
  color: string;
  position_data: any;
  content?: string | null;
  created_at: string;
  user_name?: string;
}

interface CollaborationViewerProps {
  visible: boolean;
  session: CollaborationSession;
  conversationId: string;
  onClose: () => void;
}

export default function CollaborationViewer({ visible, session, conversationId, onClose }: CollaborationViewerProps) {
  const [content, setContent] = useState('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<'highlight' | 'comment' | 'marker' | 'note'>('highlight');
  const [selectedColor, setSelectedColor] = useState('#FFFF00');
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [annotationText, setAnnotationText] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<any>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const contentSubscriptionRef = useRef<any>(null);
  const annotationsSubscriptionRef = useRef<any>(null);

  const highlightColors = [
    { name: 'Yellow', value: '#FFFF00' },
    { name: 'Green', value: '#00FF00' },
    { name: 'Blue', value: '#00BFFF' },
    { name: 'Pink', value: '#FF69B4' },
    { name: 'Orange', value: '#FFA500' },
  ];

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  useEffect(() => {
    if (visible) {
      initializeCollaboration();
    }
    return () => {
      cleanup();
    };
  }, [visible, session.id]);

  const initializeCollaboration = async () => {
    try {
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);

      setContent(session.document_content || '');

      await fetchAnnotations();

      // Real-time subscription for instant content updates
      contentSubscriptionRef.current = supabase
        .channel(`session_content_${session.id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'collaboration_sessions', filter: `id=eq.${session.id}` },
          (payload) => {
            console.log('Collaboration content updated in real-time');
            setContent(payload.new.document_content || '');
          }
        )
        .subscribe();

      // Real-time subscription for instant annotation updates
      annotationsSubscriptionRef.current = supabase
        .channel(`session_annotations_${session.id}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'collaboration_annotations', filter: `session_id=eq.${session.id}` },
          () => {
            console.log('Annotations updated in real-time');
            fetchAnnotations();
          }
        )
        .subscribe();

    } catch (error) {
      console.error('Error initializing collaboration:', error);
      showToast('Failed to initialize collaboration', 'error');
    }
  };

  const cleanup = () => {
    if (contentSubscriptionRef.current) {
      contentSubscriptionRef.current.unsubscribe();
      contentSubscriptionRef.current = null;
    }
    if (annotationsSubscriptionRef.current) {
      annotationsSubscriptionRef.current.unsubscribe();
      annotationsSubscriptionRef.current = null;
    }
  };

  const fetchAnnotations = async () => {
    try {
      const { data, error } = await supabase
        .from('collaboration_annotations')
        .select(`
          *,
          users!collaboration_annotations_user_id_fkey(name)
        `)
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const annotationsWithNames = (data || []).map(ann => ({
        ...ann,
        user_name: ann.users?.name || 'Unknown',
      }));

      setAnnotations(annotationsWithNames);
    } catch (error) {
      console.error('Error fetching annotations:', error);
    }
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('collaboration_sessions')
        .update({
          document_content: content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      if (error) throw error;
      showToast('Content saved', 'success');
    } catch (error) {
      console.error('Error saving content:', error);
      showToast('Failed to save content', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addAnnotation = async () => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('collaboration_annotations')
        .insert({
          session_id: session.id,
          user_id: currentUserId,
          annotation_type: selectedTool,
          color: selectedColor,
          position_data: selectedPosition || { line: 0, char: 0 },
          content: annotationText.trim() || null,
        });

      if (error) throw error;

      setAnnotationText('');
      setShowAnnotationInput(false);
      setSelectedPosition(null);
      showToast('Annotation added', 'success');
    } catch (error) {
      console.error('Error adding annotation:', error);
      showToast('Failed to add annotation', 'error');
    }
  };

  const deleteAnnotation = async (annotationId: string) => {
    try {
      const { error } = await supabase
        .from('collaboration_annotations')
        .delete()
        .eq('id', annotationId);

      if (error) throw error;
      showToast('Annotation removed', 'success');
    } catch (error) {
      console.error('Error deleting annotation:', error);
      showToast('Failed to remove annotation', 'error');
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={commonStyles.safeArea}>
        <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={hideToast} />

        <View style={[commonStyles.headerElevated, commonStyles.rowBetween]}>
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

          <View style={{ flex: 1, marginHorizontal: spacing.md }}>
            <Text style={[commonStyles.subtitle, { textAlign: 'center' }]} numberOfLines={1}>
              {session.document_title}
            </Text>
            <Text style={[commonStyles.caption, { textAlign: 'center', color: colors.textSecondary }]}>
              Collaborative {session.document_type}
            </Text>
          </View>

          <TouchableOpacity 
            onPress={saveContent}
            disabled={saving}
            style={[
              buttonStyles.primary,
              { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={[buttonStyles.primaryText, { fontSize: typography.sm }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{
          backgroundColor: colors.surface,
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[commonStyles.row, { gap: spacing.sm }]}>
              {(['highlight', 'comment', 'marker', 'note'] as const).map(tool => (
                <TouchableOpacity
                  key={tool}
                  onPress={() => setSelectedTool(tool)}
                  style={{
                    backgroundColor: selectedTool === tool ? colors.primary : colors.background,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: borderRadius.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Icon
                    name={
                      tool === 'highlight' ? 'color-fill' :
                      tool === 'comment' ? 'chatbubble' :
                      tool === 'marker' ? 'brush' :
                      'document-text'
                    }
                    size={16}
                    color={selectedTool === tool ? 'white' : colors.text}
                  />
                  <Text style={{
                    color: selectedTool === tool ? 'white' : colors.text,
                    marginLeft: spacing.xs,
                    fontSize: typography.sm,
                    textTransform: 'capitalize',
                  }}>
                    {tool}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={{ width: 1, height: 30, backgroundColor: colors.border, marginHorizontal: spacing.sm }} />

              {highlightColors.map(color => (
                <TouchableOpacity
                  key={color.value}
                  onPress={() => setSelectedColor(color.value)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: color.value,
                    borderWidth: 2,
                    borderColor: selectedColor === color.value ? colors.primary : colors.border,
                  }}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.7, padding: spacing.lg }}>
            <ScrollView style={{ flex: 1 }}>
              <TextInput
                style={[
                  commonStyles.body,
                  {
                    minHeight: 400,
                    textAlignVertical: 'top',
                    padding: spacing.md,
                    backgroundColor: colors.surface,
                    borderRadius: borderRadius.lg,
                  }
                ]}
                value={content}
                onChangeText={setContent}
                placeholder="Start typing or paste content here..."
                placeholderTextColor={colors.textTertiary}
                multiline
                onBlur={saveContent}
              />

              <TouchableOpacity
                onPress={() => {
                  setSelectedPosition({ line: 0, char: 0 });
                  setShowAnnotationInput(true);
                }}
                style={[
                  buttonStyles.secondary,
                  { marginTop: spacing.lg }
                ]}
              >
                <Icon name="add" size={16} color={colors.primary} style={{ marginRight: spacing.xs }} />
                <Text style={buttonStyles.secondaryText}>Add Annotation</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={{
            flex: 0.3,
            backgroundColor: colors.surface,
            borderLeftWidth: 1,
            borderLeftColor: colors.border,
            padding: spacing.md,
          }}>
            <Text style={[commonStyles.subtitle, { marginBottom: spacing.lg }]}>
              Annotations ({annotations.length})
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {annotations.length > 0 ? (
                annotations.map((annotation) => (
                  <View
                    key={annotation.id}
                    style={{
                      backgroundColor: colors.background,
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      marginBottom: spacing.md,
                      borderLeftWidth: 4,
                      borderLeftColor: annotation.color,
                    }}
                  >
                    <View style={[commonStyles.rowBetween, { marginBottom: spacing.xs }]}>
                      <View style={[commonStyles.row, { flex: 1 }]}>
                        <Icon
                          name={
                            annotation.annotation_type === 'highlight' ? 'color-fill' :
                            annotation.annotation_type === 'comment' ? 'chatbubble' :
                            annotation.annotation_type === 'marker' ? 'brush' :
                            'document-text'
                          }
                          size={14}
                          color={colors.textSecondary}
                        />
                        <Text style={[commonStyles.caption, { marginLeft: spacing.xs, textTransform: 'capitalize' }]}>
                          {annotation.annotation_type}
                        </Text>
                      </View>

                      {annotation.user_id === currentUserId && (
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              'Delete Annotation',
                              'Are you sure you want to delete this annotation?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => deleteAnnotation(annotation.id),
                                },
                              ]
                            );
                          }}
                        >
                          <Icon name="trash" size={14} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {annotation.content && (
                      <Text style={[commonStyles.bodySecondary, { marginBottom: spacing.xs }]}>
                        {annotation.content}
                      </Text>
                    )}

                    <Text style={[commonStyles.caption, { color: colors.textTertiary }]}>
                      By {annotation.user_name}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={[commonStyles.center, { padding: spacing.xl }]}>
                  <Icon name="bookmark-outline" size={32} color={colors.textTertiary} />
                  <Text style={[commonStyles.caption, { marginTop: spacing.md, textAlign: 'center' }]}>
                    No annotations yet
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        <Modal
          visible={showAnnotationInput}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAnnotationInput(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing.xl,
          }}>
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
              width: '100%',
              maxWidth: 400,
            }}>
              <Text style={[commonStyles.subtitle, { marginBottom: spacing.lg }]}>
                Add {selectedTool}
              </Text>

              <TextInput
                style={[
                  commonStyles.input,
                  { height: 100, textAlignVertical: 'top', marginBottom: spacing.lg }
                ]}
                value={annotationText}
                onChangeText={setAnnotationText}
                placeholder={`Enter ${selectedTool} text...`}
                placeholderTextColor={colors.textTertiary}
                multiline
                autoFocus
              />

              <View style={[commonStyles.row, { justifyContent: 'space-between' }]}>
                <TouchableOpacity
                  onPress={() => {
                    setShowAnnotationInput(false);
                    setAnnotationText('');
                    setSelectedPosition(null);
                  }}
                  style={[buttonStyles.secondary, { flex: 0.45 }]}
                >
                  <Text style={buttonStyles.secondaryText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={addAnnotation}
                  disabled={!annotationText.trim()}
                  style={[buttonStyles.primary, { flex: 0.45 }]}
                >
                  <Text style={buttonStyles.primaryText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}
