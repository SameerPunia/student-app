
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Centralized real-time subscription manager
 * Optimized for web performance with instant updates
 */
class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Subscribe to chat messages for a conversation with instant updates
   */
  subscribeToChatMessages(
    conversationId: string,
    onMessage: (message: any) => void,
    onError?: (error: any) => void
  ): () => void {
    const channelName = `chat_messages_${conversationId}`;
    
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: conversationId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Real-time message received:', payload);
          onMessage(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Real-time message updated:', payload);
          onMessage(payload.new);
        }
      )
      .subscribe((status) => {
        console.log(`Chat subscription status for ${conversationId}:`, status);
        if (status === 'SUBSCRIPTION_ERROR' && onError) {
          onError(new Error('Failed to subscribe to chat messages'));
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to conversation updates with instant refresh
   */
  subscribeToConversations(
    userId: string,
    onUpdate: () => void,
    onError?: (error: any) => void
  ): () => void {
    const channelName = `conversations_${userId}`;
    
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
        },
        () => {
          console.log('Conversation updated');
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          console.log('Message updated, refreshing conversations');
          onUpdate();
        }
      )
      .subscribe((status) => {
        console.log(`Conversations subscription status:`, status);
        if (status === 'SUBSCRIPTION_ERROR' && onError) {
          onError(new Error('Failed to subscribe to conversations'));
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to notes updates with instant refresh
   */
  subscribeToNotes(
    userId: string,
    onUpdate: () => void,
    onError?: (error: any) => void
  ): () => void {
    const channelName = `notes_${userId}`;
    
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('Note updated');
          onUpdate();
        }
      )
      .subscribe((status) => {
        console.log(`Notes subscription status:`, status);
        if (status === 'SUBSCRIPTION_ERROR' && onError) {
          onError(new Error('Failed to subscribe to notes'));
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to collaboration session updates with instant sync
   */
  subscribeToCollaboration(
    sessionId: string,
    onContentUpdate: (content: string) => void,
    onAnnotationUpdate: () => void,
    onError?: (error: any) => void
  ): () => void {
    const channelName = `collaboration_${sessionId}`;
    
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collaboration_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Collaboration content updated');
          onContentUpdate(payload.new.document_content || '');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_annotations',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          console.log('Annotation updated');
          onAnnotationUpdate();
        }
      )
      .subscribe((status) => {
        console.log(`Collaboration subscription status:`, status);
        if (status === 'SUBSCRIPTION_ERROR' && onError) {
          onError(new Error('Failed to subscribe to collaboration'));
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to tasks updates with instant refresh
   */
  subscribeToTasks(
    userId: string,
    onUpdate: () => void,
    onError?: (error: any) => void
  ): () => void {
    const channelName = `tasks_${userId}`;
    
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('Task updated');
          onUpdate();
        }
      )
      .subscribe((status) => {
        console.log(`Tasks subscription status:`, status);
        if (status === 'SUBSCRIPTION_ERROR' && onError) {
          onError(new Error('Failed to subscribe to tasks'));
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to events updates with instant refresh
   */
  subscribeToEvents(
    userId: string,
    onUpdate: () => void,
    onError?: (error: any) => void
  ): () => void {
    const channelName = `events_${userId}`;
    
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('Event updated');
          onUpdate();
        }
      )
      .subscribe((status) => {
        console.log(`Events subscription status:`, status);
        if (status === 'SUBSCRIPTION_ERROR' && onError) {
          onError(new Error('Failed to subscribe to events'));
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Unsubscribe from a specific channel
   */
  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      console.log(`Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    console.log('Unsubscribing from all channels');
    this.channels.forEach((channel, name) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }

  /**
   * Get active channel count
   */
  getActiveChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Check if a channel is active
   */
  isChannelActive(channelName: string): boolean {
    return this.channels.has(channelName);
  }
}

export const realtimeManager = new RealtimeManager();
