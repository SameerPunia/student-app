
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { getCurrentUser, getCurrentUserId } from '../utils/auth';
import { commonStyles, colors, buttonStyles, spacing, borderRadius, shadows, typography } from '../styles/commonStyles';
import Icon from '../components/Icon';
import Toast from '../components/Toast';
import FolderManager from '../components/FolderManager';

interface Note {
  id: string;
  title: string | null;
  content: string | null;
  subject: string | null;
  tags: string[] | null;
  note_type: 'text' | 'checklist' | 'drawing' | 'upload' | null;
  file_url: string | null;
  file_size: number | null;
  file_type: string | null;
  is_favorite: boolean | null;
  is_pinned: boolean | null;
  is_locked: boolean | null;
  folder_id: string | null;
  color: string | null;
  attachments: any[] | null;
  user_id: string | null;
  created_at: string | null;
  last_edited: string | null;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_smart: boolean;
  smart_filter: any;
  parent_folder_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  note_count?: number;
}

type ViewMode = 'list' | 'gallery' | 'folders';
type SortBy = 'date_edited' | 'date_created' | 'title';
type GroupBy = 'none' | 'date' | 'folder';

export default function NotesHub() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortBy>('date_edited');
  const [groupBy, setGroupBy] = useState<GroupBy>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [noteToMove, setNoteToMove] = useState<string | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  // Simple note editor state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState('#FFFFFF');

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const router = useRouter();
  const screenHeight = Dimensions.get('window').height;

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const fetchFolders = useCallback(async () => {
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
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      let query = supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId);

      if (selectedFolder) {
        query = query.eq('folder_id', selectedFolder);
      }

      switch (sortBy) {
        case 'date_edited':
          query = query.order('last_edited', { ascending: false });
          break;
        case 'date_created':
          query = query.order('created_at', { ascending: false });
          break;
        case 'title':
          query = query.order('title', { ascending: true });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const sortedData = (data || []).sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return 0;
      });

      setNotes(sortedData);
    } catch (error) {
      console.error('Error fetching notes:', error);
      showToast('Failed to load notes', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedFolder, sortBy]);

  useEffect(() => {
    fetchFolders();
    fetchNotes();

    // Real-time subscriptions for instant updates
    const notesSubscription = supabase
      .channel('notes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
        console.log('Notes updated in real-time');
        fetchNotes();
      })
      .subscribe();

    const foldersSubscription = supabase
      .channel('folders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'note_folders' }, () => {
        console.log('Folders updated in real-time');
        fetchFolders();
      })
      .subscribe();

    return () => {
      notesSubscription.unsubscribe();
      foldersSubscription.unsubscribe();
    };
  }, [fetchNotes, fetchFolders]);

  const createNewNote = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteColor('#FFFFFF');
    setShowNoteEditor(true);
  };

  const editNote = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title || '');
    setNoteContent(note.content || '');
    setNoteColor(note.color || '#FFFFFF');
    setShowNoteEditor(true);
  };

  const saveNote = async () => {
    if (!noteTitle.trim() && !noteContent.trim()) {
      showToast('Please add some content', 'error');
      return;
    }

    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('User not found');

      const noteData = {
        title: noteTitle.trim() || null,
        content: noteContent.trim() || null,
        folder_id: selectedFolder,
        color: noteColor,
        note_type: 'text' as const,
        user_id: userId,
        last_edited: new Date().toISOString(),
      };

      if (editingNote) {
        const { error } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', editingNote.id);

        if (error) throw error;
        showToast('Note updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('notes')
          .insert(noteData);

        if (error) throw error;
        showToast('Note created successfully', 'success');
      }

      setShowNoteEditor(false);
      setEditingNote(null);
      setNoteTitle('');
      setNoteContent('');
      setNoteColor('#FFFFFF');
    } catch (error) {
      console.error('Error saving note:', error);
      showToast('Failed to save note', 'error');
    }
  };

  const togglePin = async (note: Note) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_pinned: !note.is_pinned })
        .eq('id', note.id);

      if (error) throw error;
      showToast(note.is_pinned ? 'Unpinned note' : 'Pinned note', 'success');
    } catch (error) {
      console.error('Error toggling pin:', error);
      showToast('Failed to update note', 'error');
    }
  };

  const toggleFavorite = async (note: Note) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_favorite: !note.is_favorite })
        .eq('id', note.id);

      if (error) throw error;
      showToast(note.is_favorite ? 'Removed from favorites' : 'Added to favorites', 'success');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showToast('Failed to update note', 'error');
    }
  };

  const deleteNote = async (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', noteId);

              if (error) throw error;
              showToast('Note deleted', 'success');
            } catch (error) {
              console.error('Error deleting note:', error);
              showToast('Failed to delete note', 'error');
            }
          }
        }
      ]
    );
  };

  const moveToFolder = async (noteId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ folder_id: folderId })
        .eq('id', noteId);

      if (error) throw error;
      fetchFolders();
      showToast('Note moved', 'success');
      setShowMoveMenu(false);
      setNoteToMove(null);
    } catch (error) {
      console.error('Error moving note:', error);
      showToast('Failed to move note', 'error');
    }
  };

  const shareNote = async (note: Note) => {
    try {
      const shareText = `${note.title || 'Note'}\n\n${note.content || ''}`;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareText);
      }
    } catch (error) {
      console.error('Error sharing note:', error);
      showToast('Failed to share note', 'error');
    }
  };

  const getFilteredNotes = () => {
    return notes.filter(note => {
      const matchesSearch = 
        (note.title && note.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
      
      return matchesSearch;
    });
  };

  const getGroupedNotes = () => {
    const filtered = getFilteredNotes();
    
    if (groupBy === 'none') {
      return [{ title: 'All Notes', data: filtered }];
    }

    if (groupBy === 'date') {
      const today: Note[] = [];
      const yesterday: Note[] = [];
      const thisWeek: Note[] = [];
      const thisMonth: Note[] = [];
      const older: Note[] = [];

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered.forEach(note => {
        const noteDate = new Date(note.last_edited || note.created_at || '');
        if (noteDate >= todayStart) {
          today.push(note);
        } else if (noteDate >= yesterdayStart) {
          yesterday.push(note);
        } else if (noteDate >= weekStart) {
          thisWeek.push(note);
        } else if (noteDate >= monthStart) {
          thisMonth.push(note);
        } else {
          older.push(note);
        }
      });

      const groups = [];
      if (today.length > 0) groups.push({ title: 'Today', data: today });
      if (yesterday.length > 0) groups.push({ title: 'Yesterday', data: yesterday });
      if (thisWeek.length > 0) groups.push({ title: 'This Week', data: thisWeek });
      if (thisMonth.length > 0) groups.push({ title: 'This Month', data: thisMonth });
      if (older.length > 0) groups.push({ title: 'Older', data: older });

      return groups;
    }

    return [{ title: 'All Notes', data: filtered }];
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

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

  const renderNoteCard = (note: Note) => {
    const isSelected = selectedNotes.includes(note.id);

    return (
      <TouchableOpacity
        key={note.id}
        onPress={() => {
          if (selectionMode) {
            if (isSelected) {
              setSelectedNotes(prev => prev.filter(id => id !== note.id));
            } else {
              setSelectedNotes(prev => [...prev, note.id]);
            }
          } else {
            editNote(note);
          }
        }}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            setSelectedNotes([note.id]);
          }
        }}
        style={[
          commonStyles.card,
          {
            marginHorizontal: spacing.lg,
            backgroundColor: note.color || colors.surface,
            borderLeftWidth: 4,
            borderLeftColor: note.is_pinned ? colors.warning : colors.primary,
            opacity: isSelected ? 0.7 : 1,
          }
        ]}
      >
        <View style={commonStyles.rowBetween}>
          <View style={{ flex: 1 }}>
            {note.is_pinned && (
              <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                <Icon name="pin" size={14} color={colors.warning} />
                <Text style={[commonStyles.caption, { color: colors.warning, marginLeft: spacing.xs }]}>
                  Pinned
                </Text>
              </View>
            )}

            <Text style={[commonStyles.subtitle, { marginBottom: spacing.xs }]} numberOfLines={1}>
              {note.title || 'Untitled Note'}
            </Text>

            {note.content && (
              <Text style={[commonStyles.bodySecondary, { marginBottom: spacing.sm }]} numberOfLines={3}>
                {note.content}
              </Text>
            )}

            <View style={[commonStyles.row, { justifyContent: 'space-between' }]}>
              <Text style={[commonStyles.caption, { color: colors.textTertiary }]}>
                {formatDate(note.last_edited || note.created_at)}
              </Text>
              
              {note.is_favorite && (
                <Icon name="star" size={14} color={colors.warning} />
              )}
            </View>
          </View>

          {!selectionMode && (
            <View style={{ marginLeft: spacing.sm }}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  togglePin(note);
                }}
                style={{ 
                  padding: spacing.xs,
                  borderRadius: borderRadius.sm,
                }}
              >
                <Icon 
                  name={note.is_pinned ? "pin" : "pin-outline"} 
                  size={16} 
                  color={note.is_pinned ? colors.warning : colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={[commonStyles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, color: colors.textSecondary }]}>
            Loading notes...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (viewMode === 'folders') {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
        <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={hideToast} />
        
        <View style={[commonStyles.headerElevated, commonStyles.rowBetween]}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{
              padding: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface,
            }}
          >
            <Icon name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={commonStyles.headerTitle}>Folders</Text>
          <TouchableOpacity 
            onPress={() => setShowFolderManager(true)}
            style={{
              padding: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: colors.primary,
            }}
          >
            <Icon name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}
        >
          <TouchableOpacity
            onPress={() => {
              setSelectedFolder(null);
              setViewMode('list');
            }}
            style={[
              commonStyles.card,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }
            ]}
          >
            <View style={[commonStyles.row, { flex: 1 }]}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.md,
                backgroundColor: colors.primary + '20',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon name="document-text" size={20} color={colors.primary} />
              </View>
              <View style={{ marginLeft: spacing.md, flex: 1 }}>
                <Text style={commonStyles.subtitle}>All Notes</Text>
                <Text style={commonStyles.caption}>{notes.length} notes</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {folders.map(folder => (
            <TouchableOpacity
              key={folder.id}
              onPress={() => {
                setSelectedFolder(folder.id);
                setViewMode('list');
              }}
              style={[
                commonStyles.card,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }
              ]}
            >
              <View style={[commonStyles.row, { flex: 1 }]}>
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
              <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}

          {folders.length === 0 && (
            <View style={[commonStyles.center, { padding: spacing['4xl'] }]}>
              <Icon name="folder-outline" size={64} color={colors.textTertiary} />
              <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, textAlign: 'center' }]}>
                No folders yet
              </Text>
              <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: spacing.sm }]}>
                Create folders to organize your notes
              </Text>
            </View>
          )}
        </ScrollView>

        <FolderManager
          visible={showFolderManager}
          onClose={() => setShowFolderManager(false)}
          onFolderCreated={fetchFolders}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={hideToast} />

      <View style={[commonStyles.headerElevated, commonStyles.rowBetween]}>
        <TouchableOpacity 
          onPress={() => {
            if (selectionMode) {
              setSelectionMode(false);
              setSelectedNotes([]);
            } else if (selectedFolder) {
              setSelectedFolder(null);
            } else {
              router.back();
            }
          }}
          style={{
            padding: spacing.sm,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
          }}
        >
          <Icon name={selectionMode ? "close" : "arrow-back"} size={20} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={commonStyles.headerTitle}>
          {selectedFolder 
            ? folders.find(f => f.id === selectedFolder)?.name || 'Notes'
            : 'Notes'}
        </Text>
        
        <View style={[commonStyles.row, { gap: spacing.sm }]}>
          <TouchableOpacity 
            onPress={() => setShowOptionsMenu(true)}
            style={{
              padding: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface,
            }}
          >
            <Icon name="ellipsis-horizontal" size={20} color={colors.text} />
          </TouchableOpacity>
          
          {!selectionMode && (
            <TouchableOpacity 
              onPress={() => createNewNote()}
              style={{
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                backgroundColor: colors.primary,
              }}
            >
              <Icon name="add" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ padding: spacing.lg, paddingBottom: spacing.md }}>
        <View style={[commonStyles.row, commonStyles.input, { paddingHorizontal: spacing.md }]}>
          <Icon name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[commonStyles.body, { flex: 1, marginLeft: spacing.sm, padding: 0 }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notes..."
            placeholderTextColor={colors.textTertiary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {selectionMode && selectedNotes.length > 0 && (
        <View style={{
          backgroundColor: colors.surface,
          padding: spacing.md,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.md,
          borderRadius: borderRadius.lg,
          ...shadows.sm,
        }}>
          <View style={[commonStyles.row, { justifyContent: 'space-around' }]}>
            <TouchableOpacity
              onPress={() => {
                if (selectedNotes.length === 1) {
                  setNoteToMove(selectedNotes[0]);
                  setShowMoveMenu(true);
                } else {
                  Alert.alert('Move Notes', 'Please select only one note to move');
                }
              }}
              style={{ alignItems: 'center' }}
            >
              <Icon name="folder" size={24} color={colors.primary} />
              <Text style={[commonStyles.caption, { marginTop: spacing.xs }]}>Move</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Delete Notes',
                  `Delete ${selectedNotes.length} note${selectedNotes.length > 1 ? 's' : ''}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await Promise.all(
                            selectedNotes.map(id =>
                              supabase.from('notes').delete().eq('id', id)
                            )
                          );
                          setSelectionMode(false);
                          setSelectedNotes([]);
                          showToast('Notes deleted', 'success');
                        } catch (error) {
                          showToast('Failed to delete notes', 'error');
                        }
                      }
                    }
                  ]
                );
              }}
              style={{ alignItems: 'center' }}
            >
              <Icon name="trash" size={24} color={colors.error} />
              <Text style={[commonStyles.caption, { marginTop: spacing.xs }]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSelectionMode(false);
                setSelectedNotes([]);
              }}
              style={{ alignItems: 'center' }}
            >
              <Icon name="close-circle" size={24} color={colors.textSecondary} />
              <Text style={[commonStyles.caption, { marginTop: spacing.xs }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing['4xl'] }}
      >
        {getGroupedNotes().map((group, index) => (
          <View key={index}>
            <Text style={[
              commonStyles.subtitle,
              {
                marginHorizontal: spacing.lg,
                marginTop: spacing.lg,
                marginBottom: spacing.md,
                color: colors.textSecondary,
                fontSize: typography.sm,
                fontWeight: typography.semibold,
              }
            ]}>
              {group.title}
            </Text>
            {group.data.map(note => renderNoteCard(note))}
          </View>
        ))}

        {getFilteredNotes().length === 0 && (
          <View style={[commonStyles.center, { padding: spacing['4xl'] }]}>
            <Icon name="document-outline" size={64} color={colors.textTertiary} />
            <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, textAlign: 'center' }]}>
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </Text>
            <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: spacing.sm }]}>
              {searchQuery ? 'Try a different search term' : 'Tap + to create your first note'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            padding: spacing.xl,
            paddingBottom: spacing['2xl'],
            maxHeight: screenHeight * 0.8,
          }}>
            <View style={[commonStyles.rowBetween, { marginBottom: spacing.xl }]}>
              <Text style={commonStyles.heading}>Options</Text>
              <TouchableOpacity onPress={() => setShowOptionsMenu(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[commonStyles.label, { marginBottom: spacing.md }]}>View Mode</Text>
              <View style={[commonStyles.row, { gap: spacing.sm, marginBottom: spacing.xl }]}>
                {(['list', 'folders'] as ViewMode[]).map(mode => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => {
                      setViewMode(mode);
                      setShowOptionsMenu(false);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: viewMode === mode ? colors.primary : colors.surface,
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      alignItems: 'center',
                    }}
                  >
                    <Icon
                      name={mode === 'list' ? 'list' : 'folder'}
                      size={20}
                      color={viewMode === mode ? 'white' : colors.text}
                    />
                    <Text style={{
                      color: viewMode === mode ? 'white' : colors.text,
                      marginTop: spacing.xs,
                      fontSize: typography.xs,
                      textTransform: 'capitalize',
                    }}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[commonStyles.label, { marginBottom: spacing.md }]}>Sort By</Text>
              <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
                {[
                  { value: 'date_edited', label: 'Date Edited' },
                  { value: 'date_created', label: 'Date Created' },
                  { value: 'title', label: 'Title' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      setSortBy(option.value as SortBy);
                    }}
                    style={[
                      commonStyles.row,
                      {
                        backgroundColor: colors.surface,
                        padding: spacing.md,
                        borderRadius: borderRadius.md,
                        justifyContent: 'space-between',
                      }
                    ]}
                  >
                    <Text style={commonStyles.body}>{option.label}</Text>
                    {sortBy === option.value && (
                      <Icon name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[commonStyles.label, { marginBottom: spacing.md }]}>Group By</Text>
              <View style={{ gap: spacing.sm }}>
                {[
                  { value: 'date', label: 'Date' },
                  { value: 'none', label: 'None' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setGroupBy(option.value as GroupBy)}
                    style={[
                      commonStyles.row,
                      {
                        backgroundColor: colors.surface,
                        padding: spacing.md,
                        borderRadius: borderRadius.md,
                        justifyContent: 'space-between',
                      }
                    ]}
                  >
                    <Text style={commonStyles.body}>{option.label}</Text>
                    {groupBy === option.value && (
                      <Icon name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Move Menu Modal */}
      <Modal
        visible={showMoveMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoveMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowMoveMenu(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            padding: spacing.xl,
            paddingBottom: spacing['2xl'],
            maxHeight: screenHeight * 0.6,
          }}>
            <View style={[commonStyles.rowBetween, { marginBottom: spacing.xl }]}>
              <Text style={commonStyles.heading}>Move to Folder</Text>
              <TouchableOpacity onPress={() => setShowMoveMenu(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                onPress={() => noteToMove && moveToFolder(noteToMove, null)}
                style={[
                  commonStyles.row,
                  {
                    backgroundColor: colors.surface,
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.sm,
                  }
                ]}
              >
                <Icon name="document-text" size={20} color={colors.primary} />
                <Text style={[commonStyles.body, { marginLeft: spacing.md }]}>All Notes</Text>
              </TouchableOpacity>

              {folders.map(folder => (
                <TouchableOpacity
                  key={folder.id}
                  onPress={() => noteToMove && moveToFolder(noteToMove, folder.id)}
                  style={[
                    commonStyles.row,
                    {
                      backgroundColor: colors.surface,
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      marginBottom: spacing.sm,
                    }
                  ]}
                >
                  <Icon name={folder.icon} size={20} color={folder.color} />
                  <Text style={[commonStyles.body, { marginLeft: spacing.md }]}>{folder.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Simple Note Editor Modal */}
      <Modal
        visible={showNoteEditor}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNoteEditor(false)}
      >
        <SafeAreaView style={[commonStyles.safeArea, { backgroundColor: noteColor }]}>
          <View style={[commonStyles.headerElevated, commonStyles.rowBetween, { backgroundColor: noteColor }]}>
            <TouchableOpacity 
              onPress={() => setShowNoteEditor(false)}
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
                onPress={saveNote}
                style={[buttonStyles.primary, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}
              >
                <Text style={[buttonStyles.primaryText, { fontSize: typography.sm }]}>
                  {editingNote ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1, padding: spacing.lg }}>
            <Text style={commonStyles.label}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
              <View style={[commonStyles.row, { gap: spacing.sm }]}>
                {colors_palette.map(color => (
                  <TouchableOpacity
                    key={color.value}
                    onPress={() => setNoteColor(color.value)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: color.value,
                      borderWidth: 2,
                      borderColor: noteColor === color.value ? colors.primary : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {noteColor === color.value && (
                      <Icon name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={commonStyles.label}>Title</Text>
            <TextInput
              style={[commonStyles.input, { fontSize: typography.lg, fontWeight: typography.semibold }]}
              value={noteTitle}
              onChangeText={setNoteTitle}
              placeholder="Note title"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={commonStyles.label}>Content</Text>
            <TextInput
              style={[commonStyles.input, { height: 300, textAlignVertical: 'top' }]}
              value={noteContent}
              onChangeText={setNoteContent}
              placeholder="Start typing..."
              placeholderTextColor={colors.textTertiary}
              multiline
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
