
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getCurrentUser, getCurrentUserId } from '../utils/auth';
import { commonStyles, colors, buttonStyles, spacing, borderRadius, shadows, typography } from '../styles/commonStyles';
import Icon from '../components/Icon';
import Toast from '../components/Toast';
import CollaborationViewer from '../components/CollaborationViewer';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  other_user?: User;
  last_message?: ChatMessage;
  unread_count?: number;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  message_type: 'text' | 'file' | 'annotation' | 'note';
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  metadata?: any;
  is_read: boolean;
  created_at: string;
  sender?: User;
}

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

export default function JoinSection() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [activeSession, setActiveSession] = useState<CollaborationSession | null>(null);
  
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  
  const messagesEndRef = useRef<FlatList>(null);
  const messagesSubscriptionRef = useRef<any>(null);
  const conversationsSubscriptionRef = useRef<any>(null);

  const router = useRouter();

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  useEffect(() => {
    initializeChat();
    return () => {
      cleanup();
    };
  }, []);

  const initializeChat = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        showToast('Please log in to use chat', 'error');
        return;
      }
      setCurrentUserId(userId);
      await fetchConversations(userId);
    } catch (error) {
      console.error('Error initializing chat:', error);
      showToast('Failed to initialize chat', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cleanup = () => {
    console.log('Cleaning up chat subscriptions...');
    if (messagesSubscriptionRef.current) {
      messagesSubscriptionRef.current.unsubscribe();
      messagesSubscriptionRef.current = null;
    }
    if (conversationsSubscriptionRef.current) {
      conversationsSubscriptionRef.current.unsubscribe();
      conversationsSubscriptionRef.current = null;
    }
  };

  const fetchConversations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          user1:users!chat_conversations_user1_id_fkey(id, name, email, avatar_url),
          user2:users!chat_conversations_user2_id_fkey(id, name, email, avatar_url)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conv: any) => {
          const otherUser = conv.user1_id === userId ? conv.user2 : conv.user1;
          
          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', userId);

          return {
            ...conv,
            other_user: otherUser,
            last_message: lastMessage,
            unread_count: unreadCount || 0,
          };
        })
      );

      setConversations(conversationsWithDetails);

      // Set up real-time subscription for conversations
      if (conversationsSubscriptionRef.current) {
        conversationsSubscriptionRef.current.unsubscribe();
      }

      conversationsSubscriptionRef.current = supabase
        .channel('conversations_realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'chat_conversations' },
          (payload) => {
            console.log('Conversation change detected:', payload);
            fetchConversations(userId);
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'chat_messages' },
          (payload) => {
            console.log('Message change detected, refreshing conversations');
            fetchConversations(userId);
          }
        )
        .subscribe((status) => {
          console.log('Conversations subscription status:', status);
        });

    } catch (error) {
      console.error('Error fetching conversations:', error);
      showToast('Failed to load conversations', 'error');
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:users!chat_messages_sender_id_fkey(id, name, email, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark messages as read
      if (currentUserId) {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', currentUserId);
      }

      // Set up real-time subscription for messages
      if (messagesSubscriptionRef.current) {
        messagesSubscriptionRef.current.unsubscribe();
      }

      messagesSubscriptionRef.current = supabase
        .channel(`messages_realtime_${conversationId}`)
        .on('postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'chat_messages', 
            filter: `conversation_id=eq.${conversationId}` 
          },
          async (payload) => {
            console.log('✅ New message received in real-time:', payload.new);
            
            // Fetch sender details
            const { data: senderData } = await supabase
              .from('users')
              .select('id, name, email, avatar_url')
              .eq('id', payload.new.sender_id)
              .single();

            const newMessage = {
              ...payload.new,
              sender: senderData,
            } as ChatMessage;

            // Add message to state immediately
            setMessages(prev => {
              // Prevent duplicates
              if (prev.some(msg => msg.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });

            // Mark as read if not sent by current user
            if (payload.new.sender_id !== currentUserId) {
              await supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('id', payload.new.id);
            }

            // Scroll to bottom
            setTimeout(() => {
              messagesEndRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        )
        .on('postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'chat_messages', 
            filter: `conversation_id=eq.${conversationId}` 
          },
          (payload) => {
            console.log('Message updated in real-time:', payload.new);
            setMessages(prev => prev.map(msg => 
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
            ));
          }
        )
        .on('postgres_changes',
          { 
            event: 'DELETE', 
            schema: 'public', 
            table: 'chat_messages', 
            filter: `conversation_id=eq.${conversationId}` 
          },
          (payload) => {
            console.log('Message deleted in real-time:', payload.old);
            setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
          }
        )
        .subscribe((status) => {
          console.log('Messages subscription status:', status);
        });

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd({ animated: false });
      }, 100);

    } catch (error) {
      console.error('Error fetching messages:', error);
      showToast('Failed to load messages', 'error');
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !currentUserId) return;

    const messageText = messageInput.trim();
    setSending(true);
    setMessageInput(''); // Clear input immediately for better UX
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: currentUserId,
          message: messageText,
          message_type: 'text',
        });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
      setMessageInput(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('id', messageId);

              if (error) throw error;

              showToast('Message deleted', 'success');
            } catch (error) {
              console.error('Error deleting message:', error);
              showToast('Failed to delete message', 'error');
            }
          }
        }
      ]
    );
  };

  const deleteConversation = async () => {
    if (!selectedConversation) return;

    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this entire conversation? All messages will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all messages first
              const { error: messagesError } = await supabase
                .from('chat_messages')
                .delete()
                .eq('conversation_id', selectedConversation.id);

              if (messagesError) throw messagesError;

              // Delete the conversation
              const { error: convError } = await supabase
                .from('chat_conversations')
                .delete()
                .eq('id', selectedConversation.id);

              if (convError) throw convError;

              showToast('Conversation deleted', 'success');
              
              // Go back to conversation list
              setSelectedConversation(null);
              setMessages([]);
              cleanup();
              
              // Refresh conversations
              if (currentUserId) {
                await fetchConversations(currentUserId);
              }
            } catch (error) {
              console.error('Error deleting conversation:', error);
              showToast('Failed to delete conversation', 'error');
            }
          }
        }
      ]
    );
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || !currentUserId) return;

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        .neq('id', currentUserId)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      showToast('Failed to search users', 'error');
    } finally {
      setSearching(false);
    }
  };

  const startConversation = async (user: User) => {
    if (!currentUserId) return;

    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('*')
        .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${user.id}),and(user1_id.eq.${user.id},user2_id.eq.${currentUserId})`)
        .single();

      if (existing) {
        const conv: Conversation = {
          ...existing,
          other_user: user,
        };
        setSelectedConversation(conv);
        fetchMessages(existing.id);
        setShowUserSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('chat_conversations')
        .insert({
          user1_id: currentUserId,
          user2_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const conv: Conversation = {
        ...newConv,
        other_user: user,
      };

      setConversations(prev => [conv, ...prev]);
      setSelectedConversation(conv);
      fetchMessages(newConv.id);
      setShowUserSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      showToast('Conversation started', 'success');
    } catch (error) {
      console.error('Error starting conversation:', error);
      showToast('Failed to start conversation', 'error');
    }
  };

  const startCollaboration = () => {
    if (!selectedConversation) return;
    
    Alert.alert(
      'Start Collaboration',
      'Choose what to collaborate on:',
      [
        {
          text: 'Text Document',
          onPress: () => createCollaborationSession('text', 'Shared Document'),
        },
        {
          text: 'Note',
          onPress: () => createCollaborationSession('note', 'Shared Note'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const createCollaborationSession = async (
    documentType: 'text' | 'pdf' | 'note' | 'whiteboard',
    title: string
  ) => {
    if (!selectedConversation || !currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('collaboration_sessions')
        .insert({
          conversation_id: selectedConversation.id,
          document_type: documentType,
          document_title: title,
          document_content: '',
          created_by: currentUserId,
        })
        .select()
        .single();

      if (error) throw error;

      setActiveSession(data);
      setShowCollaboration(true);
      showToast('Collaboration session started', 'success');
    } catch (error) {
      console.error('Error creating collaboration session:', error);
      showToast('Failed to start collaboration', 'error');
    }
  };

  const formatTime = (date: string) => {
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

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.sender_id === currentUserId;
    
    return (
      <TouchableOpacity
        onLongPress={() => {
          if (isOwnMessage) {
            Alert.alert(
              'Message Options',
              'What would you like to do?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Message',
                  style: 'destructive',
                  onPress: () => deleteMessage(item.id)
                }
              ]
            );
          }
        }}
        activeOpacity={isOwnMessage ? 0.7 : 1}
        style={{
          flexDirection: 'row',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          marginBottom: spacing.md,
          paddingHorizontal: spacing.lg,
        }}
      >
        <View
          style={{
            maxWidth: '75%',
            backgroundColor: isOwnMessage ? colors.primary : colors.surface,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            ...shadows.sm,
          }}
        >
          {!isOwnMessage && (
            <Text style={{
              color: colors.textSecondary,
              fontSize: typography.xs,
              marginBottom: spacing.xs,
              fontWeight: typography.semibold,
            }}>
              {item.sender?.name || 'Unknown'}
            </Text>
          )}
          <Text style={{
            color: isOwnMessage ? 'white' : colors.text,
            fontSize: typography.base,
          }}>
            {item.message}
          </Text>
          <Text style={{
            color: isOwnMessage ? 'rgba(255,255,255,0.7)' : colors.textTertiary,
            fontSize: typography.xs,
            marginTop: spacing.xs,
            textAlign: 'right',
          }}>
            {formatTime(item.created_at)}
          </Text>
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
            Loading chat...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedConversation) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
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
          <Text style={commonStyles.headerTitle}>Messages</Text>
          <TouchableOpacity 
            onPress={() => setShowUserSearch(true)}
            style={{
              padding: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: colors.primary,
            }}
          >
            <Icon name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
          {conversations.length > 0 ? (
            conversations.map((conv) => (
              <TouchableOpacity
                key={conv.id}
                onPress={() => selectConversation(conv)}
                style={[
                  commonStyles.card,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                  }
                ]}
              >
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.md,
                }}>
                  <Text style={{
                    color: 'white',
                    fontSize: typography.lg,
                    fontWeight: typography.bold,
                  }}>
                    {conv.other_user?.name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={[commonStyles.rowBetween, { marginBottom: spacing.xs }]}>
                    <Text style={[commonStyles.subtitle, { flex: 1 }]} numberOfLines={1}>
                      {conv.other_user?.name || 'Unknown User'}
                    </Text>
                    {conv.last_message && (
                      <Text style={[commonStyles.caption, { color: colors.textTertiary }]}>
                        {formatTime(conv.last_message.created_at)}
                      </Text>
                    )}
                  </View>
                  
                  <View style={commonStyles.rowBetween}>
                    <Text 
                      style={[
                        commonStyles.bodySecondary, 
                        { flex: 1, color: conv.unread_count && conv.unread_count > 0 ? colors.text : colors.textSecondary }
                      ]} 
                      numberOfLines={1}
                    >
                      {conv.last_message?.message || 'No messages yet'}
                    </Text>
                    {conv.unread_count && conv.unread_count > 0 && (
                      <View style={{
                        backgroundColor: colors.primary,
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: spacing.xs,
                        marginLeft: spacing.sm,
                      }}>
                        <Text style={{
                          color: 'white',
                          fontSize: typography.xs,
                          fontWeight: typography.bold,
                        }}>
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={[commonStyles.center, { padding: spacing['4xl'] }]}>
              <Icon name="chatbubbles-outline" size={64} color={colors.textTertiary} />
              <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, textAlign: 'center' }]}>
                No conversations yet
              </Text>
              <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: spacing.sm }]}>
                Start a new conversation to connect with others
              </Text>
            </View>
          )}
        </ScrollView>

        <Modal
          visible={showUserSearch}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowUserSearch(false)}
        >
          <SafeAreaView style={commonStyles.safeArea}>
            <View style={[commonStyles.headerElevated, commonStyles.rowBetween]}>
              <TouchableOpacity 
                onPress={() => {
                  setShowUserSearch(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                style={{
                  padding: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                }}
              >
                <Icon name="close" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={commonStyles.headerTitle}>New Conversation</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={{ padding: spacing.lg }}>
              <View style={[commonStyles.row, commonStyles.input]}>
                <Icon name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[commonStyles.body, { flex: 1, marginLeft: spacing.sm, padding: 0 }]}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    searchUsers(text);
                  }}
                  placeholder="Search by name or email..."
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                />
              </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
              {searching ? (
                <View style={[commonStyles.center, { padding: spacing.xl }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    onPress={() => startConversation(user)}
                    style={[
                      commonStyles.card,
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                      }
                    ]}
                  >
                    <View style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: spacing.md,
                    }}>
                      <Text style={{
                        color: 'white',
                        fontSize: typography.lg,
                        fontWeight: typography.bold,
                      }}>
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={commonStyles.subtitle}>{user.name || 'Unknown'}</Text>
                      <Text style={commonStyles.caption}>{user.email}</Text>
                    </View>

                    <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))
              ) : searchQuery.trim() ? (
                <View style={[commonStyles.center, { padding: spacing.xl }]}>
                  <Icon name="search-outline" size={48} color={colors.textTertiary} />
                  <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, textAlign: 'center' }]}>
                    No users found
                  </Text>
                  <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: spacing.sm }]}>
                    Try a different search term
                  </Text>
                </View>
              ) : (
                <View style={[commonStyles.center, { padding: spacing.xl }]}>
                  <Icon name="people-outline" size={48} color={colors.textTertiary} />
                  <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, textAlign: 'center' }]}>
                    Search for users
                  </Text>
                  <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: spacing.sm }]}>
                    Enter a name or email to find people
                  </Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={hideToast} />

      <View style={[commonStyles.headerElevated, commonStyles.rowBetween]}>
        <TouchableOpacity 
          onPress={() => {
            setSelectedConversation(null);
            setMessages([]);
            cleanup();
          }}
          style={{
            padding: spacing.sm,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
          }}
        >
          <Icon name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        
        <View style={{ flex: 1, marginHorizontal: spacing.md }}>
          <Text style={[commonStyles.subtitle, { textAlign: 'center' }]} numberOfLines={1}>
            {selectedConversation.other_user?.name || 'Unknown User'}
          </Text>
          <Text style={[commonStyles.caption, { textAlign: 'center', color: colors.textSecondary }]}>
            {selectedConversation.other_user?.email}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              'Options',
              'Choose an action',
              [
                {
                  text: 'Start Collaboration',
                  onPress: startCollaboration
                },
                {
                  text: 'Delete Conversation',
                  style: 'destructive',
                  onPress: deleteConversation
                },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }}
          style={{
            padding: spacing.sm,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
          }}
        >
          <Icon name="ellipsis-vertical" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={messagesEndRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: spacing.lg }}
          ListEmptyComponent={
            <View style={[commonStyles.center, { padding: spacing['4xl'] }]}>
              <Icon name="chatbubble-outline" size={64} color={colors.textTertiary} />
              <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, textAlign: 'center' }]}>
                No messages yet
              </Text>
              <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: spacing.sm }]}>
                Start the conversation!
              </Text>
              <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: spacing.sm, color: colors.success }]}>
                💬 Messages appear instantly in real-time
              </Text>
            </View>
          }
        />

        <View style={{
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          padding: spacing.md,
          flexDirection: 'row',
          alignItems: 'flex-end',
        }}>
          <TextInput
            style={[
              commonStyles.input,
              {
                flex: 1,
                marginRight: spacing.md,
                marginBottom: 0,
                maxHeight: 100,
              }
            ]}
            value={messageInput}
            onChangeText={setMessageInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!messageInput.trim() || sending}
            style={{
              backgroundColor: messageInput.trim() && !sending ? colors.primary : colors.textSecondary,
              padding: spacing.md,
              borderRadius: borderRadius.full,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Icon name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {showCollaboration && activeSession && (
        <CollaborationViewer
          visible={showCollaboration}
          session={activeSession}
          conversationId={selectedConversation.id}
          onClose={() => {
            setShowCollaboration(false);
            setActiveSession(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}
