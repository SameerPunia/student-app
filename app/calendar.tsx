import { useRouter } from 'expo-router';
import SimpleBottomSheet from '../components/BottomSheet';
import DateTimePicker from '../components/DateTimePicker';
import { commonStyles, colors, buttonStyles, spacing, borderRadius, shadows, typography } from '../styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../components/Icon';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';
import { getCurrentUser, getCurrentUserId } from '../utils/auth';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  type: 'class' | 'exam' | 'meeting' | 'task' | 'other' | null;
  related_task: string | null;
  user_id: string | null;
  created_at: string | null;
}

interface Task {
  id: string;
  title: string;
  subject: string | null;
  due_date: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low' | null;
  is_completed: boolean | null;
  description: string | null;
  category: 'assignment' | 'exam' | 'project' | 'personal' | 'other' | null;
  reminder_enabled: boolean | null;
  reminder_time: string | null;
  completed_at: string | null;
}

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    type: 'other' as 'class' | 'exam' | 'meeting' | 'task' | 'other',
    startDate: new Date(),
    endDate: new Date(),
  });

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const router = useRouter();

  // ===================== DATA FETCH =====================

  const fetchEvents = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      console.log('Fetched events:', data?.length || 0);
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      showToast('Failed to load events', 'error');
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${userId},assigned_to.eq.${userId}`)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });

      if (error) throw error;
      console.log('Fetched tasks with due dates:', data?.length || 0);
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showToast('Failed to load tasks', 'error');
    }
  }, []);

  const fetchData = useCallback(async () => {
    await Promise.all([fetchEvents(), fetchTasks()]);
    setLoading(false);
  }, [fetchEvents, fetchTasks]);

  useEffect(() => {
    fetchData();

    // Real-time subscriptions
    const eventsSubscription = supabase
      .channel('calendar_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
        console.log('Real-time event change:', payload);
        fetchEvents();
      })
      .subscribe();

    const tasksSubscription = supabase
      .channel('calendar_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('Real-time task change:', payload);
        fetchTasks();
      })
      .subscribe();

    return () => {
      eventsSubscription.unsubscribe();
      tasksSubscription.unsubscribe();
    };
  }, [fetchData, fetchEvents, fetchTasks]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
      fetchTasks();
    }, [fetchEvents, fetchTasks])
  );

  // ===================== TOAST =====================

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  // ===================== CRUD: EVENTS =====================

  const addEvent = async () => {
    if (!newEvent.title.trim()) {
      showToast('Please enter an event title', 'error');
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) return;

      const userId = await getCurrentUserId();
      if (!userId) return;

      const startTime = new Date(newEvent.startDate);
      const endTime = new Date(newEvent.endDate);

      if (endTime <= startTime) {
        endTime.setTime(startTime.getTime() + 60 * 60 * 1000);
      }

      const { data, error } = await supabase
        .from('events')
        .insert({
          title: newEvent.title,
          description: newEvent.description || null,
          type: newEvent.type,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Event created:', data);
      resetEventForm();
      setShowAddEvent(false);
      showToast('Event added successfully', 'success');
      fetchEvents();
    } catch (error) {
      console.error('Error adding event:', error);
      showToast('Failed to add event', 'error');
    }
  };

  const editEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description || '',
      type: event.type || 'other',
      startDate: event.start_time ? new Date(event.start_time) : new Date(),
      endDate: event.end_time ? new Date(event.end_time) : new Date(),
    });
    setShowEditEvent(true);
  };

  const updateEvent = async () => {
    if (!editingEvent || !newEvent.title.trim()) {
      showToast('Please enter an event title', 'error');
      return;
    }

    try {
      const startTime = new Date(newEvent.startDate);
      const endTime = new Date(newEvent.endDate);

      if (endTime <= startTime) {
        endTime.setTime(startTime.getTime() + 60 * 60 * 1000);
      }

      const { data, error } = await supabase
        .from('events')
        .update({
          title: newEvent.title,
          description: newEvent.description || null,
          type: newEvent.type,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        })
        .eq('id', editingEvent.id)
        .select()
        .single();

      if (error) throw error;

      console.log('Event updated:', data);
      resetEventForm();
      setEditingEvent(null);
      setShowEditEvent(false);
      showToast('Event updated successfully', 'success');
      fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      showToast('Failed to update event', 'error');
    }
  };

  const deleteEvent = async (event: CalendarEvent) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('events').delete().eq('id', event.id);

            if (error) throw error;

            setEvents((prev) => prev.filter((e) => e.id !== event.id));
            fetchEvents();
            showToast('Event deleted successfully', 'success');
          } catch (error) {
            console.error('Error deleting event:', error);
            showToast('Failed to delete event', 'error');
          }
        },
      },
    ]);
  };

  // ===================== CRUD: TASKS =====================

  const deleteTask = async (taskId: string) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('tasks').delete().eq('id', taskId);

            if (error) throw error;

            setTasks((prev) => prev.filter((t) => t.id !== taskId));
            fetchTasks();
            showToast('Task deleted successfully', 'success');
          } catch (err) {
            console.error('Error deleting task:', err);
            showToast('Failed to delete task', 'error');
          }
        },
      },
    ]);
  };

  // ===================== HELPERS =====================

  const resetEventForm = () => {
    setNewEvent({
      title: '',
      description: '',
      type: 'other',
      startDate: new Date(),
      endDate: new Date(),
    });
  };

  const getCurrentWeek = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const getCurrentMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const weeks: Date[][] = [];
    const currentWeek: Date[] = [];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      currentWeek.push(date);

      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek.length = 0;
      }
    }

    return weeks;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      if (!event.start_time) return false;
      const eventDate = new Date(event.start_time);
      return isSameDate(eventDate, date);
    });
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      return isSameDate(taskDate, date);
    });
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getEventTypeColor = (type: string | null) => {
    switch (type) {
      case 'class':
        return colors.primary;
      case 'exam':
        return colors.error;
      case 'meeting':
        return colors.info;
      case 'task':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getEventTypeIcon = (type: string | null) => {
    switch (type) {
      case 'class':
        return 'school';
      case 'exam':
        return 'document-text';
      case 'meeting':
        return 'people';
      case 'task':
        return 'checkmark-circle';
      default:
        return 'calendar';
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
        return colors.urgent;
      case 'high':
        return colors.high;
      case 'medium':
        return colors.medium;
      case 'low':
        return colors.low;
      default:
        return colors.textSecondary;
    }
  };

  const getDueDateColor = (dueDate: string | null, isCompleted: boolean | null) => {
    if (isCompleted) return colors.success;
    if (!dueDate) return colors.textSecondary;

    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return colors.error;
    if (diffHours < 24) return colors.warning;
    if (diffHours < 48) return colors.info;
    return colors.textSecondary;
  };

  const getDueDateLabel = (dueDate: string | null, isCompleted: boolean | null) => {
    if (isCompleted) return 'COMPLETED';
    if (!dueDate) return '';

    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return 'OVERDUE';
    if (diffHours < 24) return 'DUE TODAY';
    if (diffHours < 48) return 'DUE TOMORROW';
    return '';
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return isSameDate(date, today);
  };

  const isSelectedDate = (date: Date) => {
    return isSameDate(date, selectedDate);
  };

  const getUpcomingEvents = () => {
    const now = new Date();

    const upcomingEvents = events
      .filter((event) => event.start_time && new Date(event.start_time) > now)
      .slice(0, 10);

    const upcomingTasks = tasks
      .filter((task) => task.due_date && new Date(task.due_date) > now && !task.is_completed)
      .slice(0, 10)
      .map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        start_time: task.due_date,
        end_time: task.due_date,
        type: 'task' as const,
        related_task: task.id,
        user_id: null,
        created_at: task.due_date,
      }));

    return [...upcomingEvents, ...upcomingTasks].sort(
      (a, b) => new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime()
    );
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const selectDate = (date: Date) => {
    setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
  };

  const selectYear = (year: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year);
    setCurrentDate(newDate);
    setShowYearPicker(false);
  };

  const generateYearRange = () => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  // ===================== LOADING =====================

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={[commonStyles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, color: colors.textSecondary }]}>
            Loading calendar...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ===================== RENDER =====================

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={hideToast} />

      {/* Header */}
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
        <Text style={commonStyles.headerTitle}>Calendar</Text>
        <TouchableOpacity
          onPress={() => setShowAddEvent(true)}
          style={{
            padding: spacing.sm,
            borderRadius: borderRadius.md,
            backgroundColor: colors.primary,
          }}
        >
          <Icon name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* View mode buttons */}
      <View style={{ flexDirection: 'row', padding: spacing.lg, gap: spacing.sm }}>
        {(['list', 'week', 'month'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={{
              backgroundColor: viewMode === mode ? colors.primary : colors.surface,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderRadius: borderRadius.full,
              flex: 1,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: viewMode === mode ? colors.primary : colors.border,
            }}
            onPress={() => setViewMode(mode)}
          >
            <Text
              style={{
                color: viewMode === mode ? 'white' : colors.text,
                textTransform: 'capitalize',
                fontWeight: typography.semibold,
                fontSize: typography.sm,
              }}
            >
              {mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <>
        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing['4xl'] }}
          >
            <View style={{ padding: spacing.lg }}>
              <Text style={[commonStyles.heading, { marginBottom: spacing.lg }]}>Upcoming Events & Tasks</Text>

              {getUpcomingEvents().map((item) => {
                const isTask = item.type === 'task';
                const task = isTask ? tasks.find((t) => t.id === item.id) : null;
                const dueDateColor =
                  isTask && task ? getDueDateColor(task.due_date, task.is_completed) : getEventTypeColor(item.type);
                const dueDateLabel = isTask && task ? getDueDateLabel(task.due_date, task.is_completed) : '';

                return (
                  <View
                    key={`${item.type}-${item.id}`}
                    style={[
                      commonStyles.card,
                      {
                        borderLeftWidth: 4,
                        borderLeftColor: dueDateColor,
                        opacity: isTask && task?.is_completed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View style={[commonStyles.rowBetween, { marginBottom: spacing.sm }]}>
                      <View style={[commonStyles.row, { flex: 1 }]}>
                        <Icon name={getEventTypeIcon(item.type)} size={20} color={dueDateColor} />
                        <Text
                          style={[
                            commonStyles.subtitle,
                            {
                              marginLeft: spacing.sm,
                              flex: 1,
                              textDecorationLine: isTask && task?.is_completed ? 'line-through' : 'none',
                            },
                          ]}
                        >
                          {item.title}
                        </Text>
                      </View>

                      {dueDateLabel && (
                        <View
                          style={{
                            backgroundColor: dueDateColor,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.xs,
                            borderRadius: borderRadius.md,
                          }}
                        >
                          <Text
                            style={{
                              color: 'white',
                              fontSize: typography.xs,
                              fontWeight: typography.semibold,
                            }}
                          >
                            {dueDateLabel}
                          </Text>
                        </View>
                      )}

                      <View style={{ flexDirection: 'row', marginLeft: spacing.sm }}>
                        {isTask && task ? (
                          // DELETE TASK
                          <TouchableOpacity
                            onPress={() => deleteTask(task.id)}
                            style={{
                              padding: spacing.sm,
                              borderRadius: borderRadius.md,
                              backgroundColor: colors.surface,
                            }}
                          >
                            <Icon name="trash" size={16} color={colors.error} />
                          </TouchableOpacity>
                        ) : (
                          <>
                            {/* EDIT EVENT */}
                            <TouchableOpacity
                              onPress={() => editEvent(item as CalendarEvent)}
                              style={{
                                marginRight: spacing.md,
                                padding: spacing.sm,
                                borderRadius: borderRadius.md,
                                backgroundColor: colors.surface,
                              }}
                            >
                              <Icon name="create" size={16} color={colors.info} />
                            </TouchableOpacity>

                            {/* DELETE EVENT */}
                            <TouchableOpacity
                              onPress={() => deleteEvent(item as CalendarEvent)}
                              style={{
                                padding: spacing.sm,
                                borderRadius: borderRadius.md,
                                backgroundColor: colors.surface,
                              }}
                            >
                              <Icon name="trash" size={16} color={colors.error} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>

                    {item.description && (
                      <Text style={[commonStyles.bodySecondary, { marginBottom: spacing.sm }]}>{item.description}</Text>
                    )}

                    {isTask && task?.category && (
                      <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
                        <Icon name="pricetag" size={16} color={colors.textSecondary} />
                        <Text
                          style={[
                            commonStyles.caption,
                            { marginLeft: spacing.xs, textTransform: 'capitalize' },
                          ]}
                        >
                          {task.category}
                        </Text>
                      </View>
                    )}

                    <View style={commonStyles.row}>
                      <Icon name="time" size={16} color={colors.textSecondary} />
                      <Text style={[commonStyles.caption, { marginLeft: spacing.xs }]}>
                        {item.start_time && new Date(item.start_time).toLocaleDateString()}{' '}
                        {formatTime(item.start_time)}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {getUpcomingEvents().length === 0 && (
                <View style={[commonStyles.center, { padding: spacing['4xl'] }]}>
                  <Icon name="calendar-outline" size={64} color={colors.textTertiary} />
                  <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, textAlign: 'center' }]}>
                    No upcoming events
                  </Text>
                  <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: spacing.sm }]}>
                    Your schedule is clear for now
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* WEEK VIEW */}
        {viewMode === 'week' && (
          <View style={{ flex: 1 }}>
            <View style={[commonStyles.rowBetween, { padding: spacing.lg }]}>
              <TouchableOpacity
                onPress={() => navigateWeek('prev')}
                style={{
                  padding: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                }}
              >
                <Icon name="chevron-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={commonStyles.subtitle}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity
                onPress={() => navigateWeek('next')}
                style={{
                  padding: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                }}
              >
                <Icon name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 140 }}>
              <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm }}>
                {getCurrentWeek().map((date, index) => {
                  const dayEvents = getEventsForDate(date);
                  const dayTasks = getTasksForDate(date);
                  const totalItems = dayEvents.length + dayTasks.length;
                  const selected = isSelectedDate(date);

                  return (
                    <TouchableOpacity
                      key={`${date.getTime()}-${index}`}
                      style={{
                        backgroundColor: isToday(date)
                          ? colors.primary
                          : selected
                          ? colors.primaryLight
                          : colors.surface,
                        padding: spacing.lg,
                        borderRadius: borderRadius.lg,
                        alignItems: 'center',
                        minWidth: 90,
                        borderWidth: 2,
                        borderColor: isToday(date)
                          ? colors.primary
                          : selected
                          ? colors.primary
                          : colors.border,
                        ...shadows.sm,
                      }}
                      onPress={() => selectDate(date)}
                    >
                      <Text
                        style={{
                          color: isToday(date) || selected ? 'white' : colors.textSecondary,
                          fontSize: typography.xs,
                          fontWeight: typography.medium,
                          marginBottom: spacing.xs,
                        }}
                      >
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </Text>
                      <Text
                        style={{
                          color: isToday(date) || selected ? 'white' : colors.text,
                          fontSize: typography.lg,
                          fontWeight: typography.bold,
                          marginBottom: spacing.sm,
                        }}
                      >
                        {date.getDate()}
                      </Text>
                      {totalItems > 0 && (
                        <View
                          style={{
                            backgroundColor:
                              isToday(date) || selected ? 'rgba(255,255,255,0.3)' : colors.primary,
                            borderRadius: borderRadius.full,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.xs,
                            minWidth: 24,
                            alignItems: 'center',
                          }}
                        >
                          <Text
                            style={{
                              color: 'white',
                              fontSize: typography.xs,
                              fontWeight: typography.bold,
                            }}
                          >
                            {totalItems}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}
            >
              <Text style={[commonStyles.heading, { marginBottom: spacing.lg }]}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>

              {getEventsForDate(selectedDate).map((event) => (
                <View
                  key={event.id}
                  style={[
                    commonStyles.card,
                    {
                      borderLeftWidth: 4,
                      borderLeftColor: getEventTypeColor(event.type),
                    },
                  ]}
                >
                  <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
                    <Icon
                      name={getEventTypeIcon(event.type)}
                      size={20}
                      color={getEventTypeColor(event.type)}
                    />
                    <Text style={[commonStyles.subtitle, { marginLeft: spacing.sm, flex: 1 }]}>{event.title}</Text>
                  </View>

                  {event.description && (
                    <Text style={[commonStyles.bodySecondary, { marginBottom: spacing.sm }]}>
                      {event.description}
                    </Text>
                  )}

                  <Text style={commonStyles.caption}>
                    {formatTime(event.start_time)} - {formatTime(event.end_time)}
                  </Text>
                </View>
              ))}

              {getTasksForDate(selectedDate).map((task) => (
                <View
                  key={task.id}
                  style={[
                    commonStyles.card,
                    {
                      borderLeftWidth: 4,
                      borderLeftColor: getPriorityColor(task.priority),
                    },
                  ]}
                >
                  <View style={[commonStyles.rowBetween, { marginBottom: spacing.sm }]}>
                    <View style={[commonStyles.row, { flex: 1 }]}>
                      <Icon
                        name="checkmark-circle-outline"
                        size={20}
                        color={getPriorityColor(task.priority)}
                      />
                      <Text style={[commonStyles.subtitle, { marginLeft: spacing.sm, flex: 1 }]}>
                        {task.title}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: getPriorityColor(task.priority),
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xs,
                        borderRadius: borderRadius.md,
                      }}
                    >
                      <Text
                        style={{
                          color: 'white',
                          fontSize: typography.xs,
                          fontWeight: typography.semibold,
                          textTransform: 'uppercase',
                        }}
                      >
                        {task.priority}
                      </Text>
                    </View>
                  </View>

                  {task.subject && (
                    <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                      <Icon name="book" size={16} color={colors.textSecondary} />
                      <Text style={[commonStyles.caption, { marginLeft: spacing.xs }]}>{task.subject}</Text>
                    </View>
                  )}

                  {task.description && (
                    <Text style={[commonStyles.bodySecondary, { marginBottom: spacing.sm }]}>
                      {task.description}
                    </Text>
                  )}

                  <Text style={commonStyles.caption}>Due: {formatTime(task.due_date)}</Text>
                </View>
              ))}

              {getEventsForDate(selectedDate).length === 0 &&
                getTasksForDate(selectedDate).length === 0 && (
                  <View style={[commonStyles.center, { padding: spacing['4xl'] }]}>
                    <Icon name="calendar-outline" size={64} color={colors.textTertiary} />
                    <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, textAlign: 'center' }]}>
                      No events or tasks
                    </Text>
                    <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: spacing.sm }]}>
                      This day is free
                    </Text>
                  </View>
                )}
            </ScrollView>
          </View>
        )}

        {/* MONTH VIEW */}
        {viewMode === 'month' && (
          <View style={{ flex: 1, padding: spacing.lg }}>
            <View style={[commonStyles.rowBetween, { marginBottom: spacing.lg }]}>
              <TouchableOpacity
                onPress={() => navigateMonth('prev')}
                style={{
                  padding: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                }}
              >
                <Icon name="chevron-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowYearPicker(true)}
                style={{
                  padding: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                }}
              >
                <Text style={commonStyles.subtitle}>
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigateMonth('next')}
                style={{
                  padding: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                }}
              >
                <Icon name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[commonStyles.card, { padding: spacing.md }]}>
              <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <View key={day} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[commonStyles.caption, { fontWeight: typography.semibold }]}>{day}</Text>
                  </View>
                ))}
              </View>

              {getCurrentMonth().map((week, weekIndex) => (
                <View key={weekIndex} style={{ flexDirection: 'row', marginBottom: spacing.xs }}>
                  {week.map((date, dayIndex) => {
                    const dayEvents = getEventsForDate(date);
                    const dayTasks = getTasksForDate(date);
                    const totalItems = dayEvents.length + dayTasks.length;
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                    const selected = isSelectedDate(date);

                    return (
                      <TouchableOpacity
                        key={`${date.getTime()}-${dayIndex}`}
                        style={{
                          flex: 1,
                          aspectRatio: 1,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isToday(date)
                            ? colors.primary
                            : selected
                            ? colors.primaryLight
                            : 'transparent',
                          borderRadius: borderRadius.md,
                          margin: 1,
                          borderWidth: selected ? 2 : 0,
                          borderColor: selected ? colors.primary : 'transparent',
                        }}
                        onPress={() => selectDate(date)}
                      >
                        <Text
                          style={{
                            color: isToday(date) || selected
                              ? 'white'
                              : isCurrentMonth
                              ? colors.text
                              : colors.textTertiary,
                            fontSize: typography.sm,
                            fontWeight: isToday(date) ? typography.bold : typography.normal,
                          }}
                        >
                          {date.getDate()}
                        </Text>
                        {totalItems > 0 && (
                          <View
                            style={{
                              position: 'absolute',
                              bottom: 2,
                              right: 2,
                              backgroundColor:
                                isToday(date) || selected ? 'rgba(255,255,255,0.8)' : colors.primary,
                              borderRadius: borderRadius.full,
                              width: 6,
                              height: 6,
                            }}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>

              {getEventsForDate(selectedDate).length > 0 ||
              getTasksForDate(selectedDate).length > 0 ? (
                <View style={[commonStyles.surface, { padding: spacing.md }]}>
                  <Text style={[commonStyles.caption, { marginBottom: spacing.sm }]}>
                    {getEventsForDate(selectedDate).length} events, {getTasksForDate(selectedDate).length} tasks
                  </Text>
                  <TouchableOpacity
                    style={[buttonStyles.secondary, { paddingVertical: spacing.sm }]}
                    onPress={() => setViewMode('week')}
                  >
                    <Text style={buttonStyles.secondaryText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[commonStyles.surface, { padding: spacing.md, alignItems: 'center' }]}>
                  <Text style={[commonStyles.caption, { textAlign: 'center' }]}>
                    No events or tasks on this day
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </>

      {/* YEAR PICKER MODAL */}
      <Modal visible={showYearPicker} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
              width: '80%',
              maxHeight: '60%',
            }}
          >
            <View style={[commonStyles.rowBetween, { marginBottom: spacing.lg }]}>
              <Text style={commonStyles.heading}>Select Year</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {generateYearRange().map((year) => (
                <TouchableOpacity
                  key={year}
                  style={{
                    padding: spacing.lg,
                    borderRadius: borderRadius.md,
                    backgroundColor:
                      year === currentDate.getFullYear() ? colors.primary : colors.surface,
                    marginBottom: spacing.sm,
                  }}
                  onPress={() => selectYear(year)}
                >
                  <Text
                    style={{
                      color: year === currentDate.getFullYear() ? 'white' : colors.text,
                      textAlign: 'center',
                      fontSize: typography.lg,
                      fontWeight: typography.semibold,
                    }}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ADD EVENT MODAL */}
      <Modal visible={showAddEvent} animationType="slide">
        <SafeAreaView style={commonStyles.safeArea}>
          <View style={[commonStyles.headerElevated, commonStyles.rowBetween]}>
            <TouchableOpacity
              onPress={() => setShowAddEvent(false)}
              style={{
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                backgroundColor: colors.surface,
              }}
            >
              <Icon name="close" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={commonStyles.headerTitle}>Add Event</Text>
            <TouchableOpacity
              onPress={addEvent}
              style={[buttonStyles.primary, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}
            >
              <Text style={[buttonStyles.primaryText, { fontSize: typography.sm }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: spacing.lg }}>
            <Text style={commonStyles.label}>Title *</Text>
            <TextInput
              style={commonStyles.input}
              value={newEvent.title}
              onChangeText={(text) => setNewEvent((prev) => ({ ...prev, title: text }))}
              placeholder="Enter event title"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={commonStyles.label}>Description</Text>
            <TextInput
              style={[commonStyles.input, { height: 80 }]}
              value={newEvent.description}
              onChangeText={(text) => setNewEvent((prev) => ({ ...prev, description: text }))}
              placeholder="Event description"
              placeholderTextColor={colors.textTertiary}
              multiline
            />

            <Text style={commonStyles.label}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {(['class', 'exam', 'meeting', 'other'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={{
                      backgroundColor:
                        newEvent.type === type ? getEventTypeColor(type) : colors.surface,
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.md,
                      borderRadius: borderRadius.lg,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor:
                        newEvent.type === type ? getEventTypeColor(type) : colors.border,
                    }}
                    onPress={() => setNewEvent((prev) => ({ ...prev, type }))}
                  >
                    <Icon
                      name={getEventTypeIcon(type)}
                      size={16}
                      color={newEvent.type === type ? 'white' : getEventTypeColor(type)}
                    />
                    <Text
                      style={{
                        color: newEvent.type === type ? 'white' : colors.text,
                        textTransform: 'capitalize',
                        marginLeft: spacing.xs,
                        fontWeight: typography.medium,
                      }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <DateTimePicker
              label="Start Date & Time"
              value={newEvent.startDate}
              onChange={(date) => setNewEvent((prev) => ({ ...prev, startDate: date }))}
              placeholder="Select start date and time"
              minimumDate={new Date()}
              showClearButton={false}
            />

            <DateTimePicker
              label="End Date & Time"
              value={newEvent.endDate}
              onChange={(date) => setNewEvent((prev) => ({ ...prev, endDate: date }))}
              placeholder="Select end date and time"
              minimumDate={newEvent.startDate}
              showClearButton={false}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* EDIT EVENT MODAL */}
      <Modal visible={showEditEvent} animationType="slide">
        <SafeAreaView style={commonStyles.safeArea}>
          <View style={[commonStyles.headerElevated, commonStyles.rowBetween]}>
            <TouchableOpacity
              onPress={() => {
                setShowEditEvent(false);
                setEditingEvent(null);
                resetEventForm();
                fetchEvents();
              }}
              style={{
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                backgroundColor: colors.surface,
              }}
            >
              <Icon name="close" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={commonStyles.headerTitle}>Edit Event</Text>
            <TouchableOpacity
              onPress={updateEvent}
              style={[buttonStyles.primary, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}
            >
              <Text style={[buttonStyles.primaryText, { fontSize: typography.sm }]}>Update</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: spacing.lg }}>
            <Text style={commonStyles.label}>Title *</Text>
            <TextInput
              style={commonStyles.input}
              value={newEvent.title}
              onChangeText={(text) => setNewEvent((prev) => ({ ...prev, title: text }))}
              placeholder="Enter event title"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={commonStyles.label}>Description</Text>
            <TextInput
              style={[commonStyles.input, { height: 80 }]}
              value={newEvent.description}
              onChangeText={(text) => setNewEvent((prev) => ({ ...prev, description: text }))}
              placeholder="Event description"
              placeholderTextColor={colors.textTertiary}
              multiline
            />

            <Text style={commonStyles.label}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {(['class', 'exam', 'meeting', 'other'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={{
                      backgroundColor:
                        newEvent.type === type ? getEventTypeColor(type) : colors.surface,
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.md,
                      borderRadius: borderRadius.lg,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor:
                        newEvent.type === type ? getEventTypeColor(type) : colors.border,
                    }}
                    onPress={() => setNewEvent((prev) => ({ ...prev, type }))}
                  >
                    <Icon
                      name={getEventTypeIcon(type)}
                      size={16}
                      color={newEvent.type === type ? 'white' : getEventTypeColor(type)}
                    />
                    <Text
                      style={{
                        color: newEvent.type === type ? 'white' : colors.text,
                        textTransform: 'capitalize',
                        marginLeft: spacing.xs,
                        fontWeight: typography.medium,
                      }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <DateTimePicker
              label="Start Date & Time"
              value={newEvent.startDate}
              onChange={(date) => setNewEvent((prev) => ({ ...prev, startDate: date }))}
              placeholder="Select start date and time"
              minimumDate={new Date()}
              showClearButton={false}
            />

            <DateTimePicker
              label="End Date & Time"
              value={newEvent.endDate}
              onChange={(date) => setNewEvent((prev) => ({ ...prev, endDate: date }))}
              placeholder="Select end date and time"
              minimumDate={newEvent.startDate}
              showClearButton={false}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
