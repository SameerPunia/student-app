
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://telrerkizvtzbxjdlyoj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbHJlcmtpenZ0emJ4amRseW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NTc4ODcsImV4cCI6MjA3MzEzMzg4N30.6-ZneuXwp4YAccZEr-8YynxThfZIVBdZUzuZajqaiNA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string | null;
          assigned_to: string | null;
          title: string;
          subject: string | null;
          description: string | null;
          priority: 'urgent' | 'high' | 'medium' | 'low' | null;
          due_date: string | null;
          notes: string | null;
          is_completed: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          assigned_to?: string | null;
          title: string;
          subject?: string | null;
          description?: string | null;
          priority?: 'urgent' | 'high' | 'medium' | 'low' | null;
          due_date?: string | null;
          notes?: string | null;
          is_completed?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          assigned_to?: string | null;
          title?: string;
          subject?: string | null;
          description?: string | null;
          priority?: 'urgent' | 'high' | 'medium' | 'low' | null;
          due_date?: string | null;
          notes?: string | null;
          is_completed?: boolean | null;
          created_at?: string | null;
        };
      };
      subtasks: {
        Row: {
          id: string;
          task_id: string | null;
          title: string;
          is_done: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          task_id?: string | null;
          title: string;
          is_done?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          task_id?: string | null;
          title?: string;
          is_done?: boolean | null;
          created_at?: string | null;
        };
      };
      events: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          description: string | null;
          start_time: string | null;
          end_time: string | null;
          type: 'class' | 'exam' | 'meeting' | 'task' | 'other' | null;
          related_task: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          type?: 'class' | 'exam' | 'meeting' | 'task' | 'other' | null;
          related_task?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          description?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          type?: 'class' | 'exam' | 'meeting' | 'task' | 'other' | null;
          related_task?: string | null;
          created_at?: string | null;
        };
      };
      notes: {
        Row: {
          id: string;
          user_id: string | null;
          title: string | null;
          content: string | null;
          subject: string | null;
          tags: string[] | null;
          note_type: 'text' | 'checklist' | 'drawing' | 'upload' | null;
          file_url: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title?: string | null;
          content?: string | null;
          subject?: string | null;
          tags?: string[] | null;
          note_type?: 'text' | 'checklist' | 'drawing' | 'upload' | null;
          file_url?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string | null;
          content?: string | null;
          subject?: string | null;
          tags?: string[] | null;
          note_type?: 'text' | 'checklist' | 'drawing' | 'upload' | null;
          file_url?: string | null;
          created_at?: string | null;
        };
      };
      whiteboard_sessions: {
        Row: {
          id: string;
          name: string | null;
          created_by: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          created_by?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          created_by?: string | null;
          created_at?: string | null;
        };
      };
      whiteboard_strokes: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string | null;
          tool: 'pen' | 'highlighter' | 'eraser' | 'text' | 'shape' | null;
          color: string | null;
          x: number | null;
          y: number | null;
          text_content: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          tool?: 'pen' | 'highlighter' | 'eraser' | 'text' | 'shape' | null;
          color?: string | null;
          x?: number | null;
          y?: number | null;
          text_content?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          tool?: 'pen' | 'highlighter' | 'eraser' | 'text' | 'shape' | null;
          color?: string | null;
          x?: number | null;
          y?: number | null;
          text_content?: string | null;
          created_at?: string | null;
        };
      };
      whiteboard_chat: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string | null;
          message: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          message: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          message?: string;
          created_at?: string | null;
        };
      };
      ai_tutor_logs: {
        Row: {
          id: string;
          user_id: string | null;
          file_url: string | null;
          summary: string | null;
          key_points: string[] | null;
          quiz: any | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          file_url?: string | null;
          summary?: string | null;
          key_points?: string[] | null;
          quiz?: any | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          file_url?: string | null;
          summary?: string | null;
          key_points?: string[] | null;
          quiz?: any | null;
          created_at?: string | null;
        };
      };
    };
  };
};
