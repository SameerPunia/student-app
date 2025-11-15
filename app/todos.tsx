
import { useRouter } from 'expo-router';
import SimpleBottomSheet from '../components/BottomSheet';
import ResponsiveHeader from '../components/ResponsiveHeader';
import React, { useState, useEffect, useCallback } from 'react';
import DateTimePicker from '../components/DateTimePicker';
import { 
  commonStyles, 
  colors, 
  buttonStyles, 
  spacing, 
  borderRadius, 
  shadows, 
  typography,
  isSmallScreen,
  getResponsiveSpacing,
  getScreenDimensions
} from '../styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  Modal,
  Switch,
  ActivityIndicator,
  Platform,
  Dimensions
} from 'react-native';
import Icon from '../components/Icon';
import Toast from '../components/Toast';
import { supabase } from '../lib/supabase';
import { getCurrentUser, getCurrentUserId, type CurrentUser } from '../utils/auth';

interface Task {
  id: string;
  title: string;
  subject: string | null;
  due_date: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low' | null;
  is_completed: boolean | null;
  description: string | null;
  assigned_to: string | null;
  user_id: string | null;
  notes: string | null;
  created_at: string | null;
  subtasks?: SubTask[];
}

interface SubTask {
  id: string;
  task_id: string | null;
  title: string;
  is_done: boolean | null;
  created_at: string | null;
}

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCompleted, setFilterCompleted] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [guestTasks, setGuestTasks] = useState<Task[]>([]);
  
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  
  const [newTask, setNewTask] = useState({
    title: '',
    subject: '',
    description: '',
    priority: 'medium' as 'urgent' | 'high' | 'medium' | 'low',
    dueDate: null as Date | null,
    notes: '',
    assignedTo: null as string | null,
  });

  const router = useRouter();

  const fetchTasks = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      if (user.isGuest) {
        setTasks(guestTasks);
        setLoading(false);
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${userId},assigned_to.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      const tasksWithSubtasks = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: subtasks } = await supabase
            .from('subtasks')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: true });

          return { ...task, subtasks: subtasks || [] };
        })
      );

      setTasks(tasksWithSubtasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [guestTasks]);

  useEffect(() => {
    fetchCurrentUser();
    fetchTasks();
    
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    
    // Real-time subscriptions for instant updates
    let tasksSubscription: any = null;
    
    getCurrentUser().then(user => {
      if (user && !user.isGuest) {
        tasksSubscription = supabase
          .channel('tasks_todo')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
            console.log('Real-time task change:', payload);
            fetchTasks();
          })
          .subscribe();
      }
    });

    return () => {
      subscription?.remove();
      tasksSubscription?.unsubscribe();
    };
  }, [fetchTasks]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
  };

  const fetchCurrentUser = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent': return colors.urgent;
      case 'high': return colors.high;
      case 'medium': return colors.medium;
      case 'low': return colors.low;
      default: return colors.textSecondary;
    }
  };

  const getTypeIcon = (priority: string | null) => {
    switch (priority) {
      case 'urgent': return 'alert-circle';
      case 'high': return 'arrow-up-circle';
      case 'medium': return 'remove-circle';
      case 'low': return 'arrow-down-circle';
      default: return 'ellipse';
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'No due date';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: string | null) => {
    if (!date) return '';
    const dateObj = new Date(date);
    return dateObj.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const toggleTask = async (taskId: string) => {
  try {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = !task.is_completed;

    if (currentUser?.isGuest) {
      const updatedTasks = tasks.map(t =>
        t.id === taskId ? { ...t, is_completed: newStatus } : t
      );
      setTasks(updatedTasks);
      setGuestTasks(updatedTasks);
      return;
    }

    // Update Supabase
    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: newStatus })
      .eq('id', taskId);

    if (error) throw error;

    // 🔥 UPDATE UI INSTANTLY
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, is_completed: newStatus } : t
      )
    );
    
  } catch (error) {
    console.error('Error toggling task:', error);
    showToast('Failed to update task', 'error');
  }
};
 const deleteTask = async (task: Task) => {
  try {
    // Confirmation depending on platform
    const confirmed = Platform.OS === "web"
      ? window.confirm("Are you sure you want to delete this task?")
      : await new Promise(resolve => {
          Alert.alert(
            "Delete Task",
            "Are you sure you want to delete this task?",
            [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Delete", style: "destructive", onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmed) return;

    if (currentUser?.isGuest) {
      // Delete locally for guest
      const updated = tasks.filter(t => t.id !== task.id);
      setTasks(updated);
      setGuestTasks(updated);
      showToast("Task deleted (guest mode)", "success");
      return;
    }

    // Delete subtasks
    await supabase.from("subtasks").delete().eq("task_id", task.id);

    // Delete task itself
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) throw error;

    // 🔥 Update UI instantly
    setTasks(prev => prev.filter(t => t.id !== task.id));

    showToast("Task deleted successfully", "success");

  } catch (error) {
    console.error("Error deleting task:", error);
    showToast("Failed to delete task", "error");
  }
};


  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const subtask = task?.subtasks?.find(s => s.id === subtaskId);
      if (!subtask) return;

      const { error } = await supabase
        .from('subtasks')
        .update({ is_done: !subtask.is_done })
        .eq('id', subtaskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling subtask:', error);
      showToast('Failed to update subtask', 'error');
    }
  };

  

  const addTask = async () => {
  if (!newTask.title.trim()) {
    showToast('Please enter a task title', 'error');
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) return;

    if (user.isGuest) {
      const guestTask: Task = {
        id: `guest_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: newTask.title,
        subject: newTask.subject || null,
        description: newTask.description || null,
        priority: newTask.priority,
        due_date: newTask.dueDate?.toISOString() || null,
        notes: newTask.notes || null,
        user_id: user.id,
        assigned_to: user.id,
        is_completed: false,
        created_at: new Date().toISOString(),
        subtasks: [],
      };

      const updatedTasks = [guestTask, ...tasks];
      setTasks(updatedTasks);
      setGuestTasks(updatedTasks);
      resetForm();
      setShowAddTask(false);
      showToast('✅ Task created locally (Guest mode)', 'success');
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) return;

    console.log('Creating task with priority:', newTask.priority);
    console.log('Creating task with due date:', newTask.dueDate);

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: newTask.title,
        subject: newTask.subject || null,
        description: newTask.description || null,
        priority: newTask.priority,
        due_date: newTask.dueDate?.toISOString() || null,
        notes: newTask.notes || null,
        user_id: userId,
        assigned_to: newTask.assignedTo || userId,
        is_completed: false,
      })
      .select()
      .single();

    if (error) throw error;

    // ✅ Update UI instantly
    setTasks((prev) => [{ ...data, subtasks: [] }, ...prev]);

    if (newTask.dueDate) {
      await supabase.from('events').insert({
        user_id: userId,
        title: `Task: ${newTask.title}`,
        description: newTask.description || null,
        start_time: newTask.dueDate.toISOString(),
        end_time: newTask.dueDate.toISOString(),
        type: 'task',
        related_task: data.id,
      });
    }

    resetForm();
    setShowAddTask(false);
    showToast('✅ Task created successfully', 'success');
  } catch (error) {
    console.error('Error adding task:', error);
    showToast('❌ Failed to add task', 'error');
  }
};


  const editTask = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      subject: task.subject || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      dueDate: task.due_date ? new Date(task.due_date) : null,
      notes: task.notes || '',
      assignedTo: task.assigned_to,
    });
    setShowEditTask(true);
  };

  const updateTask = async () => {
    if (!editingTask || !newTask.title.trim()) {
      showToast('Please enter a task title', 'error');
      return;
    }

    try {
      console.log('Updating task with priority:', newTask.priority);
      console.log('Updating task with due date:', newTask.dueDate);

      const { data, error } = await supabase
        .from('tasks')
        .update({
          title: newTask.title,
          subject: newTask.subject || null,
          description: newTask.description || null,
          priority: newTask.priority,
          due_date: newTask.dueDate?.toISOString() || null,
          notes: newTask.notes || null,
          assigned_to: newTask.assignedTo || editingTask.user_id,
        })
        .eq('id', editingTask.id)
        .select()
        .single();

      if (error) throw error;

      console.log('Task updated with priority:', data.priority);
      console.log('Task updated with due date:', data.due_date);

      if (newTask.dueDate) {
        const { data: existingEvent } = await supabase
          .from('events')
          .select('id')
          .eq('related_task', editingTask.id)
          .single();

        if (existingEvent) {
          await supabase
            .from('events')
            .update({
              title: `Task: ${newTask.title}`,
              description: newTask.description || null,
              start_time: newTask.dueDate.toISOString(),
              end_time: newTask.dueDate.toISOString(),
            })
            .eq('id', existingEvent.id);
        } else {
          await supabase.from('events').insert({
            user_id: editingTask.user_id,
            title: `Task: ${newTask.title}`,
            description: newTask.description || null,
            start_time: newTask.dueDate.toISOString(),
            end_time: newTask.dueDate.toISOString(),
            type: 'task',
            related_task: editingTask.id,
          });
        }
      } else {
        await supabase
          .from('events')
          .delete()
          .eq('related_task', editingTask.id);
      }
      
      // ✅ Update local task instantly
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? { ...t, ...data } : t))
  );

resetForm();
setEditingTask(null);
setShowEditTask(false);
showToast('✅ Task updated successfully', 'success');

    } catch (error) {
      console.error('Error updating task:', error);
      showToast('Failed to update task', 'error');
    }
  };

  const resetForm = () => {
    setNewTask({
      title: '',
      subject: '',
      description: '',
      priority: 'medium',
      dueDate: null,
      notes: '',
      assignedTo: null,
    });
  };

  const getFilteredTasks = () => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (task.subject && task.subject.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      
      const matchesCompleted = filterCompleted === 'all' || 
                              (filterCompleted === 'completed' && task.is_completed) ||
                              (filterCompleted === 'pending' && !task.is_completed);
      
      return matchesSearch && matchesPriority && matchesCompleted;
    });
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date() && !task.is_completed;
  };

  const { isSmall, isTablet } = getScreenDimensions();
  const cardMargin = getResponsiveSpacing(16);
  const buttonSize = isSmall ? 36 : 40;

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={[commonStyles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, color: colors.textSecondary }]}>
            Loading tasks...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={hideToast}
      />

      <ResponsiveHeader
        title={currentUser?.isGuest ? "Tasks (Guest Mode)" : "Tasks"}
        showBackButton={true}
        rightIcon="add"
        onRightPress={() => setShowAddTask(true)}
      />

      {currentUser?.isGuest && (
        <View style={{
          backgroundColor: colors.warning + '20',
          borderColor: colors.warning,
          borderWidth: 1,
          borderRadius: borderRadius.md,
          margin: cardMargin,
          padding: getResponsiveSpacing(12),
        }}>
          <View style={[commonStyles.rowCenter, { marginBottom: spacing.xs }]}>
            <Icon name="information-circle" size={16} color={colors.warning} />
            <Text style={[
              commonStyles.label, 
              { 
                marginLeft: spacing.xs, 
                marginBottom: 0,
                color: colors.warning,
                fontWeight: typography.semibold,
              }
            ]}>
              Guest Mode
            </Text>
          </View>
          <Text style={[
            commonStyles.caption, 
            { 
              color: colors.textSecondary,
              lineHeight: typography.sm * 1.3,
            }
          ]}>
            Tasks created in guest mode are stored locally and will be lost when you close the app.
          </Text>
        </View>
      )}

      <View style={{ padding: cardMargin }}>
        <TextInput
          style={[commonStyles.input, { marginBottom: spacing.lg }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search tasks..."
          placeholderTextColor={colors.textTertiary}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {['all', 'urgent', 'high', 'medium', 'low'].map(priority => (
              <TouchableOpacity
                key={priority}
                style={{
                  backgroundColor: filterPriority === priority ? colors.primary : colors.surface,
                  paddingHorizontal: getResponsiveSpacing(16),
                  paddingVertical: getResponsiveSpacing(8),
                  borderRadius: borderRadius.full,
                  borderWidth: 1,
                  borderColor: filterPriority === priority ? colors.primary : colors.border,
                  minHeight: 36,
                  justifyContent: 'center',
                }}
                onPress={() => setFilterPriority(priority)}
              >
                <Text style={{
                  color: filterPriority === priority ? 'white' : colors.text,
                  textTransform: 'capitalize',
                  fontSize: typography.sm,
                  fontWeight: typography.medium,
                }}>
                  {priority}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {['all', 'pending', 'completed'].map(status => (
              <TouchableOpacity
                key={status}
                style={{
                  backgroundColor: filterCompleted === status ? colors.primary : colors.surface,
                  paddingHorizontal: getResponsiveSpacing(16),
                  paddingVertical: getResponsiveSpacing(8),
                  borderRadius: borderRadius.full,
                  borderWidth: 1,
                  borderColor: filterCompleted === status ? colors.primary : colors.border,
                  minHeight: 36,
                  justifyContent: 'center',
                }}
                onPress={() => setFilterCompleted(status)}
              >
                <Text style={{
                  color: filterCompleted === status ? 'white' : colors.text,
                  textTransform: 'capitalize',
                  fontSize: typography.sm,
                  fontWeight: typography.medium,
                }}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['4xl'] }}
      >
        {getFilteredTasks().map((task) => (
          <View
            key={task.id}
            style={[
              commonStyles.card,
              {
                marginHorizontal: cardMargin,
                borderLeftWidth: 4,
                borderLeftColor: getPriorityColor(task.priority),
                opacity: task.is_completed ? 0.7 : 1,
              }
            ]}
          >
            <View style={commonStyles.rowBetween}>
              <View style={{ flex: 1 }}>
                <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
                  <TouchableOpacity 
                    onPress={() => toggleTask(task.id)}
                    style={commonStyles.touchTarget}
                  >
                    <Icon
                      name={task.is_completed ? 'checkmark-circle' : 'ellipse-outline'}
                      size={isSmall ? 20 : 24}
                      color={task.is_completed ? colors.success : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <Text
                    style={[
                      commonStyles.subtitle,
                      {
                        marginLeft: spacing.md,
                        flex: 1,
                        textDecorationLine: task.is_completed ? 'line-through' : 'none',
                        fontSize: isSmall ? typography.base : typography.lg,
                      },
                    ]}
                  >
                    {task.title}
                  </Text>
                  <View style={{
                    backgroundColor: getPriorityColor(task.priority),
                    paddingHorizontal: getResponsiveSpacing(8),
                    paddingVertical: getResponsiveSpacing(4),
                    borderRadius: borderRadius.md,
                  }}>
                    <Text style={{ 
                      color: 'white', 
                      fontSize: typography.xs, 
                      fontWeight: typography.semibold,
                      textTransform: 'uppercase' 
                    }}>
                      {task.priority}
                    </Text>
                  </View>
                </View>

                {task.subject && (
                  <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
                    <Icon name="book" size={16} color={colors.textSecondary} />
                    <Text style={[commonStyles.caption, { marginLeft: spacing.xs }]}>
                      {task.subject}
                    </Text>
                  </View>
                )}

                {task.description && (
                  <Text style={[commonStyles.bodySecondary, { marginBottom: spacing.sm }]}>
                    {task.description}
                  </Text>
                )}

                <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
                  <Icon name="calendar" size={16} color={colors.textSecondary} />
                  <Text
                    style={[
                      commonStyles.caption,
                      {
                        color: isOverdue(task) ? colors.error : colors.textSecondary,
                        marginLeft: spacing.xs,
                      }
                    ]}
                  >
                    {formatDate(task.due_date)}
                    {task.due_date && ` ${formatTime(task.due_date)}`}
                  </Text>
                  {isOverdue(task) && (
                    <View style={{
                      backgroundColor: colors.error,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 2,
                      borderRadius: borderRadius.sm,
                      marginLeft: spacing.sm,
                    }}>
                      <Text style={{ 
                        color: 'white', 
                        fontSize: typography.xs,
                        fontWeight: typography.semibold,
                      }}>
                        OVERDUE
                      </Text>
                    </View>
                  )}
                </View>

                {task.subtasks && task.subtasks.length > 0 && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text style={[commonStyles.label, { marginBottom: spacing.sm }]}>
                      Subtasks ({task.subtasks.filter(s => s.is_done).length}/{task.subtasks.length})
                    </Text>
                    {task.subtasks.map((subtask) => (
                      <TouchableOpacity
                        key={subtask.id}
                        style={[
                          commonStyles.row,
                          {
                            marginBottom: spacing.xs,
                            paddingLeft: spacing.lg,
                            minHeight: 32,
                          }
                        ]}
                        onPress={() => toggleSubtask(task.id, subtask.id)}
                      >
                        <Icon
                          name={subtask.is_done ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={subtask.is_done ? colors.success : colors.textSecondary}
                        />
                        <Text
                          style={[
                            commonStyles.caption,
                            {
                              marginLeft: spacing.sm,
                              textDecorationLine: subtask.is_done ? 'line-through' : 'none',
                              flex: 1,
                            }
                          ]}
                        >
                          {subtask.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', marginLeft: spacing.sm }}>
                <TouchableOpacity
                  onPress={() => editTask(task)}
                  style={{ 
                    marginRight: spacing.md,
                    padding: getResponsiveSpacing(8),
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.surface,
                    minWidth: buttonSize,
                    minHeight: buttonSize,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="create" size={isSmall ? 16 : 18} color={colors.info} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => deleteTask(task)}
                  style={{ 
                    padding: getResponsiveSpacing(8),
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.surface,
                    minWidth: buttonSize,
                    minHeight: buttonSize,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="trash" size={isSmall ? 16 : 18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {getFilteredTasks().length === 0 && (
          <View style={[commonStyles.center, { padding: spacing['4xl'] }]}>
            <Icon name="clipboard-outline" size={isSmall ? 48 : 64} color={colors.textTertiary} />
            <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, textAlign: 'center' }]}>
              No tasks found
            </Text>
            <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: spacing.sm }]}>
              {searchQuery ? 'Try adjusting your search or filters' : 'Add your first task to get started'}
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showAddTask} animationType="slide">
        <SafeAreaView style={commonStyles.safeArea}>
          <ResponsiveHeader
            title="Add Task"
            showBackButton={false}
            rightComponent={
              <TouchableOpacity 
                onPress={addTask}
                style={[buttonStyles.primary, { 
                  paddingHorizontal: getResponsiveSpacing(16), 
                  paddingVertical: getResponsiveSpacing(8),
                  minHeight: buttonSize,
                }]}
              >
                <Text style={[buttonStyles.primaryText, { fontSize: typography.sm }]}>Save</Text>
              </TouchableOpacity>
            }
          />

          <TouchableOpacity 
            onPress={() => {
              setShowAddTask(false);
              resetForm();
            }}
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 50 : 20,
              left: cardMargin,
              zIndex: 1000,
              padding: getResponsiveSpacing(8),
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface,
              minWidth: buttonSize,
              minHeight: buttonSize,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="close" size={isSmall ? 18 : 20} color={colors.text} />
          </TouchableOpacity>

          <ScrollView style={{ flex: 1, padding: cardMargin }}>
            <Text style={commonStyles.label}>Title *</Text>
            <TextInput
              style={commonStyles.input}
              value={newTask.title}
              onChangeText={(text) => setNewTask(prev => ({ ...prev, title: text }))}
              placeholder="Enter task title"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={commonStyles.label}>Subject</Text>
            <TextInput
              style={commonStyles.input}
              value={newTask.subject}
              onChangeText={(text) => setNewTask(prev => ({ ...prev, subject: text }))}
              placeholder="e.g., Mathematics, Physics"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={commonStyles.label}>Description</Text>
            <TextInput
              style={[commonStyles.input, { height: isSmall ? 60 : 80 }]}
              value={newTask.description}
              onChangeText={(text) => setNewTask(prev => ({ ...prev, description: text }))}
              placeholder="Task description"
              placeholderTextColor={colors.textTertiary}
              multiline
            />

            <Text style={commonStyles.label}>Priority</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {(['urgent', 'high', 'medium', 'low'] as const).map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={{
                      backgroundColor: newTask.priority === priority ? getPriorityColor(priority) : colors.surface,
                      paddingHorizontal: getResponsiveSpacing(16),
                      paddingVertical: getResponsiveSpacing(12),
                      borderRadius: borderRadius.lg,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: newTask.priority === priority ? getPriorityColor(priority) : colors.border,
                      minHeight: 44,
                    }}
                    onPress={() => setNewTask(prev => ({ ...prev, priority }))}
                  >
                    <Icon
                      name={getTypeIcon(priority)}
                      size={16}
                      color={newTask.priority === priority ? 'white' : getPriorityColor(priority)}
                    />
                    <Text style={{
                      color: newTask.priority === priority ? 'white' : colors.text,
                      textTransform: 'capitalize',
                      marginLeft: spacing.xs,
                      fontWeight: typography.medium,
                    }}>
                      {priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <DateTimePicker
              label="Due Date & Time"
              value={newTask.dueDate}
              onChange={(date) => setNewTask(prev => ({ ...prev, dueDate: date }))}
              onClear={() => setNewTask(prev => ({ ...prev, dueDate: null }))}
              placeholder="Select due date and time"
              minimumDate={new Date()}
              showClearButton={true}
            />

            <Text style={commonStyles.label}>Notes</Text>
            <TextInput
              style={[commonStyles.input, { height: isSmall ? 60 : 80, marginBottom: spacing['4xl'] }]}
              value={newTask.notes}
              onChangeText={(text) => setNewTask(prev => ({ ...prev, notes: text }))}
              placeholder="Additional notes"
              placeholderTextColor={colors.textTertiary}
              multiline
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showEditTask} animationType="slide">
        <SafeAreaView style={commonStyles.safeArea}>
          <ResponsiveHeader
            title="Edit Task"
            showBackButton={false}
            rightComponent={
              <TouchableOpacity 
                onPress={updateTask}
                style={[buttonStyles.primary, { 
                  paddingHorizontal: getResponsiveSpacing(16), 
                  paddingVertical: getResponsiveSpacing(8),
                  minHeight: buttonSize,
                }]}
              >
                <Text style={[buttonStyles.primaryText, { fontSize: typography.sm }]}>Update</Text>
              </TouchableOpacity>
            }
          />

          <TouchableOpacity 
            onPress={() => {
              setShowEditTask(false);
              setEditingTask(null);
              resetForm();
            }}
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 50 : 20,
              left: cardMargin,
              zIndex: 1000,
              padding: getResponsiveSpacing(8),
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface,
              minWidth: buttonSize,
              minHeight: buttonSize,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="close" size={isSmall ? 18 : 20} color={colors.text} />
          </TouchableOpacity>

          <ScrollView style={{ flex: 1, padding: cardMargin }}>
            <Text style={commonStyles.label}>Title *</Text>
            <TextInput
              style={commonStyles.input}
              value={newTask.title}
              onChangeText={(text) => setNewTask(prev => ({ ...prev, title: text }))}
              placeholder="Enter task title"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={commonStyles.label}>Subject</Text>
            <TextInput
              style={commonStyles.input}
              value={newTask.subject}
              onChangeText={(text) => setNewTask(prev => ({ ...prev, subject: text }))}
              placeholder="e.g., Mathematics, Physics"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={commonStyles.label}>Description</Text>
            <TextInput
              style={[commonStyles.input, { height: isSmall ? 60 : 80 }]}
              value={newTask.description}
              onChangeText={(text) => setNewTask(prev => ({ ...prev, description: text }))}
              placeholder="Task description"
              placeholderTextColor={colors.textTertiary}
              multiline
            />

            <Text style={commonStyles.label}>Priority</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {(['urgent', 'high', 'medium', 'low'] as const).map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={{
                      backgroundColor: newTask.priority === priority ? getPriorityColor(priority) : colors.surface,
                      paddingHorizontal: getResponsiveSpacing(16),
                      paddingVertical: getResponsiveSpacing(12),
                      borderRadius: borderRadius.lg,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: newTask.priority === priority ? getPriorityColor(priority) : colors.border,
                      minHeight: 44,
                    }}
                    onPress={() => setNewTask(prev => ({ ...prev, priority }))}
                  >
                    <Icon
                      name={getTypeIcon(priority)}
                      size={16}
                      color={newTask.priority === priority ? 'white' : getPriorityColor(priority)}
                    />
                    <Text style={{
                      color: newTask.priority === priority ? 'white' : colors.text,
                      textTransform: 'capitalize',
                      marginLeft: spacing.xs,
                      fontWeight: typography.medium,
                    }}>
                      {priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <DateTimePicker
              label="Due Date & Time"
              value={newTask.dueDate}
              onChange={(date) => setNewTask(prev => ({ ...prev, dueDate: date }))}
              onClear={() => setNewTask(prev => ({ ...prev, dueDate: null }))}
              placeholder="Select due date and time"
              minimumDate={new Date()}
              showClearButton={true}
            />

            <Text style={commonStyles.label}>Notes</Text>
            <TextInput
              style={[commonStyles.input, { height: isSmall ? 60 : 80, marginBottom: spacing['4xl'] }]}
              value={newTask.notes}
              onChangeText={(text) => setNewTask(prev => ({ ...prev, notes: text }))}
              placeholder="Additional notes"
              placeholderTextColor={colors.textTertiary}
              multiline
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
