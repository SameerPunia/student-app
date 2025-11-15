
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
import Icon from '../components/Icon';
import ProgressCircle from '../components/ProgressCircle';
import SetupWizard from '../components/SetupWizard';
import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  commonStyles, 
  colors, 
  buttonStyles, 
  spacing, 
  borderRadius, 
  shadows, 
  typography,
  isSmallScreen,
  isTablet,
  getResponsiveSpacing,
  getScreenDimensions,
  getResponsiveValue
} from '../styles/commonStyles';
import { useRouter } from 'expo-router';
import { getCurrentUser, getCurrentUserId, type CurrentUser } from '../utils/auth';
import { quickDependencyCheck } from '../utils/dependencyChecker';

interface Task {
  id: string;
  title: string;
  subject: string | null;
  due_date: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low' | null;
  is_completed: boolean | null;
  description: string | null;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_time: string | null;
  type: 'class' | 'exam' | 'meeting' | 'task' | 'other' | null;
  description: string | null;
  related_task?: string | null;
}

interface StudyProgress {
  totalTasks: number;
  completedTasks: number;
  percentage: number;
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

interface UpcomingItem {
  id: string;
  title: string;
  type: 'task' | 'event';
  due_date?: string | null;
  start_time?: string | null;
  priority?: 'urgent' | 'high' | 'medium' | 'low' | null;
  event_type?: 'class' | 'exam' | 'meeting' | 'task' | 'other' | null;
  subject?: string | null;
  description?: string | null;
  is_completed?: boolean | null;
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);
  const [studyProgress, setStudyProgress] = useState<StudyProgress>({ totalTasks: 0, completedTasks: 0, percentage: 0 });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [setupIssuesDetected, setSetupIssuesDetected] = useState(false);

  const motivationalQuotes = [
    "The expert in anything was once a beginner.",
    "Success is the sum of small efforts repeated day in and day out.",
    "Don't watch the clock; do what it does. Keep going.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "Education is the most powerful weapon which you can use to change the world.",
    "Learning never exhausts the mind.",
    "The only way to do great work is to love what you do.",
    "Believe you can and you're halfway there.",
  ];

  const router = useRouter();

  const fetchCurrentUser = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      if (!user) return;

      if (user.isGuest) {
        setUserProfile({
          id: user.id,
          email: user.email || 'guest@example.com',
          name: user.name || 'Guest User',
          avatar_url: null,
        });
      } else {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const user = await getCurrentUser();
      if (user?.isGuest) {
        setTasks([]);
        return;
      }

      const nextTwoWeeks = new Date();
      nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${userId},assigned_to.eq.${userId}`)
        .not('due_date', 'is', null)
        .gte('due_date', new Date().toISOString())
        .lte('due_date', nextTwoWeeks.toISOString())
        .eq('is_completed', false)
        .order('due_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      console.log('Fetched upcoming tasks:', data?.length || 0);
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, []);

  const fetchAllTasks = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const user = await getCurrentUser();
      if (user?.isGuest) {
        setStudyProgress({ totalTasks: 8, completedTasks: 3, percentage: 38 });
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('id, is_completed')
        .or(`user_id.eq.${userId},assigned_to.eq.${userId}`);

      if (error) throw error;

      const totalTasks = data?.length || 0;
      const completedTasks = data?.filter(task => task.is_completed).length || 0;
      
      const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      setStudyProgress({ totalTasks, completedTasks, percentage });
      console.log('Study progress updated:', { totalTasks, completedTasks, percentage });
    } catch (error) {
      console.error('Error fetching all tasks:', error);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const user = await getCurrentUser();
      if (user?.isGuest) {
        setUpcomingEvents([]);
        return;
      }

      const nextTwoWeeks = new Date();
      nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', nextTwoWeeks.toISOString())
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) throw error;
      console.log('Fetched upcoming events:', data?.length || 0);
      setUpcomingEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, []);

  const combineUpcomingItems = useCallback(() => {
    const combined: UpcomingItem[] = [];

    tasks.forEach(task => {
      combined.push({
        id: task.id,
        title: task.title,
        type: 'task',
        due_date: task.due_date,
        priority: task.priority,
        subject: task.subject,
        description: task.description,
        is_completed: task.is_completed,
      });
    });

    upcomingEvents.forEach(event => {
      combined.push({
        id: event.id,
        title: event.title,
        type: 'event',
        start_time: event.start_time,
        event_type: event.type,
        description: event.description,
      });
    });

    combined.sort((a, b) => {
      const dateA = new Date(a.due_date || a.start_time || '');
      const dateB = new Date(b.due_date || b.start_time || '');
      return dateA.getTime() - dateB.getTime();
    });

    setUpcomingItems(combined.slice(0, 8));
  }, [tasks, upcomingEvents]);
  useFocusEffect(
  useCallback(() => {
    // When user returns to dashboard (from tasks or calendar)
    fetchTasks();
    fetchAllTasks();
    fetchEvents();
  }, [])
);

  useEffect(() => {
    const initializeDashboard = async () => {
      await fetchCurrentUser();
      await Promise.all([
        fetchTasks(),
        fetchEvents(),
        fetchAllTasks()
      ]);
      setLoading(false);
    };

    initializeDashboard();

    if (__DEV__) {
      quickDependencyCheck().then(isReady => {
        setSetupIssuesDetected(!isReady);
      });
    }

    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    let tasksSubscription: any = null;
    let eventsSubscription: any = null;

    const setupSubscriptions = async () => {
      const user = await getCurrentUser();
      
      if (user && !user.isGuest) {
        tasksSubscription = supabase
          .channel('dashboard_tasks')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'tasks' 
          }, (payload) => {
            console.log('Real-time task change on dashboard:', payload);
            fetchTasks();
            fetchAllTasks();
          })
          .subscribe();

        eventsSubscription = supabase
          .channel('dashboard_events')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'events' 
          }, (payload) => {
            console.log('Real-time event change on dashboard:', payload);
            fetchEvents();
          })
          .subscribe();
      }
    };

    setupSubscriptions();

    return () => {
      tasksSubscription?.unsubscribe();
      eventsSubscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % motivationalQuotes.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [motivationalQuotes.length]);

  useEffect(() => {
    combineUpcomingItems();
  }, [combineUpcomingItems]);

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent': return colors.urgent;
      case 'high': return colors.high;
      case 'medium': return colors.medium;
      case 'low': return colors.low;
      default: return colors.textSecondary;
    }
  };

  const getTypeIcon = (type: string | null, itemType: 'task' | 'event' = 'task') => {
    if (itemType === 'task') {
      switch (type) {
        case 'urgent': return 'alert-circle';
        case 'high': return 'arrow-up-circle';
        case 'medium': return 'remove-circle';
        case 'low': return 'arrow-down-circle';
        default: return 'checkmark-circle';
      }
    } else {
      switch (type) {
        case 'class': return 'school';
        case 'exam': return 'document-text';
        case 'meeting': return 'people';
        case 'task': return 'checkmark-circle';
        default: return 'calendar';
      }
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    const dateObj = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (dateObj.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (dateObj.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const formatTime = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleProgressCirclePress = () => {
    router.push('/todos');
  };

  const getDaysUntilDue = (date: string | null) => {
    if (!date) return null;
    const dueDate = new Date(date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const { isSmall, isTablet: isTabletScreen } = getScreenDimensions();
  const cardMargin = getResponsiveSpacing(16);
  const avatarSize = getResponsiveValue(36, 40, 44, 48);
  const iconSize = getResponsiveValue(28, 32, 36, 40);

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={[commonStyles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.subtitle, { marginTop: spacing.lg, color: colors.textSecondary }]}>
            Loading dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={[
        commonStyles.headerElevated, 
        commonStyles.rowBetween,
        { 
          paddingHorizontal: cardMargin,
          minHeight: isSmall ? 64 : 72,
        }
      ]}>
        <View style={{ flex: 1 }}>
          <Text style={[
            commonStyles.caption, 
            { 
              color: colors.textSecondary,
              fontSize: isSmall ? typography.xs : typography.sm,
            }
          ]}>
            {getGreeting()}
          </Text>
          <View style={commonStyles.row}>
            <Text style={[
              commonStyles.headerTitle,
              {
                fontSize: isSmall ? typography.lg : typography.xl,
              }
            ]}>
              {userProfile?.name || 'Student'}
            </Text>
            {currentUser?.isGuest && (
              <View style={{
                backgroundColor: colors.warning + '20',
                borderColor: colors.warning,
                borderWidth: 1,
                borderRadius: borderRadius.sm,
                paddingHorizontal: spacing.xs,
                paddingVertical: 2,
                marginLeft: spacing.sm,
              }}>
                <Text style={{
                  color: colors.warning,
                  fontSize: typography.xs,
                  fontWeight: typography.semibold,
                }}>
                  GUEST
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={[commonStyles.row, { gap: spacing.sm }]}>
          {__DEV__ && setupIssuesDetected && (
            <TouchableOpacity
              onPress={() => setShowSetupWizard(true)}
              style={{
                backgroundColor: colors.warning + '20',
                borderColor: colors.warning,
                borderWidth: 1,
                borderRadius: borderRadius.md,
                padding: spacing.xs,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="construct" size={20} color={colors.warning} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            onPress={() => router.push('/profile')}
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {userProfile?.avatar_url ? (
              <Image 
                source={{ uri: userProfile.avatar_url }} 
                style={{ 
                  width: avatarSize, 
                  height: avatarSize, 
                  borderRadius: avatarSize / 2 
                }}
              />
            ) : (
              <Icon name="person" size={avatarSize * 0.5} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['4xl'] }}
      >
        {__DEV__ && setupIssuesDetected && (
          <View style={[
            commonStyles.card,
            {
              margin: cardMargin,
              backgroundColor: colors.warning + '10',
              borderColor: colors.warning,
              borderWidth: 1,
            }
          ]}>
            <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
              <Icon name="warning" size={20} color={colors.warning} />
              <Text style={[
                commonStyles.subtitle,
                { marginLeft: spacing.sm, color: colors.warning }
              ]}>
                Setup Issues Detected
              </Text>
            </View>
            <Text style={[
              commonStyles.bodySecondary,
              { marginBottom: spacing.md, fontSize: typography.sm }
            ]}>
              Some dependencies or configuration issues were found that might affect development.
            </Text>
            <TouchableOpacity
              style={[buttonStyles.outline, { borderColor: colors.warning }]}
              onPress={() => setShowSetupWizard(true)}
            >
              <Icon name="construct" size={16} color={colors.warning} style={{ marginRight: spacing.xs }} />
              <Text style={[buttonStyles.outlineText, { color: colors.warning }]}>
                Open Setup Wizard
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[
          commonStyles.card, 
          { 
            margin: cardMargin, 
            backgroundColor: colors.primary,
            padding: getResponsiveSpacing(20),
          }
        ]}>
          <Text style={[
            commonStyles.subtitle, 
            { 
              color: 'white', 
              textAlign: 'center',
              fontSize: isSmall ? typography.base : typography.lg,
              lineHeight: isSmall ? typography.base * 1.4 : typography.lg * 1.4,
            }
          ]}>
            "{motivationalQuotes[currentQuote]}"
          </Text>
        </View>

        <View style={[commonStyles.card, { margin: cardMargin }]}>
          <View style={[
            isSmall ? { alignItems: 'center' } : commonStyles.rowBetween, 
            { marginBottom: spacing.lg }
          ]}>
            <View style={isSmall ? { alignItems: 'center', marginBottom: spacing.lg } : {}}>
              <Text style={[
                commonStyles.heading,
                { fontSize: isSmall ? typography.lg : typography.xl }
              ]}>
                Study Progress
              </Text>
              <Text style={[
                commonStyles.caption, 
                { 
                  color: colors.textSecondary,
                  textAlign: isSmall ? 'center' : 'left',
                  marginTop: spacing.xs,
                }
              ]}>
                {studyProgress.completedTasks} of {studyProgress.totalTasks} tasks completed
              </Text>
            </View>
            
            <ProgressCircle
              percentage={studyProgress.percentage}
              completedTasks={studyProgress.completedTasks}
              totalTasks={studyProgress.totalTasks}
              size={getResponsiveValue(80, 90, 100, 120)}
              animated={true}
              onPress={handleProgressCirclePress}
              showTooltip={true}
            />
          </View>
          
          <View style={{ 
            flexDirection: isSmall ? 'column' : 'row', 
            gap: spacing.md 
          }}>
            <TouchableOpacity 
              style={[
                buttonStyles.primary, 
                { 
                  flex: isSmall ? undefined : 1,
                  marginBottom: isSmall ? spacing.md : 0,
                }
              ]}
              onPress={() => router.push('/todos')}
            >
              <Icon name="add" size={16} color="white" style={{ marginRight: spacing.xs }} />
              <Text style={buttonStyles.primaryText}>Add Task</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[buttonStyles.secondary, { flex: isSmall ? undefined : 1 }]}
              onPress={() => router.push('/calendar')}
            >
              <Icon name="calendar" size={16} color={colors.primary} style={{ marginRight: spacing.xs }} />
              <Text style={buttonStyles.secondaryText}>View Calendar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: cardMargin, marginBottom: spacing.lg }}>
          <Text style={[
            commonStyles.heading, 
            { 
              marginBottom: spacing.lg,
              fontSize: isSmall ? typography.lg : typography.xl,
            }
          ]}>
            Quick Actions
          </Text>
          
          <View style={[
            commonStyles.gridContainer,
            { marginHorizontal: -spacing.sm }
          ]}>
            <View style={[
              commonStyles.gridItem,
              { width: isSmall ? '100%' : '50%' }
            ]}>
              <TouchableOpacity 
                style={[
                  commonStyles.card, 
                  { 
                    alignItems: 'center', 
                    padding: getResponsiveSpacing(20),
                    marginBottom: spacing.md,
                  }
                ]}
                onPress={() => router.push('/ai-tutor')}
              >
                <Icon name="school" size={iconSize} color={colors.primary} />
                <Text style={[
                  commonStyles.subtitle, 
                  { 
                    marginTop: spacing.sm, 
                    textAlign: 'center',
                    fontSize: isSmall ? typography.base : typography.lg,
                  }
                ]}>
                  AI Tutor
                </Text>
                <Text style={[
                  commonStyles.caption, 
                  { 
                    textAlign: 'center', 
                    color: colors.textSecondary,
                    marginTop: spacing.xs,
                  }
                ]}>
                  Get help with questions
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={[
              commonStyles.gridItem,
              { width: isSmall ? '100%' : '50%' }
            ]}>
              <TouchableOpacity 
                style={[
                  commonStyles.card, 
                  { 
                    alignItems: 'center', 
                    padding: getResponsiveSpacing(20),
                    marginBottom: spacing.md,
                  }
                ]}
                onPress={() => router.push('/notes')}
              >
                <Icon name="document-text" size={iconSize} color={colors.info} />
                <Text style={[
                  commonStyles.subtitle, 
                  { 
                    marginTop: spacing.sm, 
                    textAlign: 'center',
                    fontSize: isSmall ? typography.base : typography.lg,
                  }
                ]}>
                  Notes
                </Text>
                <Text style={[
                  commonStyles.caption, 
                  { 
                    textAlign: 'center', 
                    color: colors.textSecondary,
                    marginTop: spacing.xs,
                  }
                ]}>
                  Manage your notes
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[
              commonStyles.gridItem,
              { width: isSmall ? '100%' : '50%' }
            ]}>
              <TouchableOpacity 
                style={[
                  commonStyles.card, 
                  { 
                    alignItems: 'center', 
                    padding: getResponsiveSpacing(20),
                    marginBottom: spacing.md,
                  }
                ]}
                onPress={() => router.push('/join')}
              >
                <Icon name="people" size={iconSize} color={colors.success} />
                <Text style={[
                  commonStyles.subtitle, 
                  { 
                    marginTop: spacing.sm, 
                    textAlign: 'center',
                    fontSize: isSmall ? typography.base : typography.lg,
                  }
                ]}>
                  Chat & Collaborate
                </Text>
                <Text style={[
                  commonStyles.caption, 
                  { 
                    textAlign: 'center', 
                    color: colors.textSecondary,
                    marginTop: spacing.xs,
                  }
                ]}>
                  Connect with others
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={[
              commonStyles.gridItem,
              { width: isSmall ? '100%' : '50%' }
            ]}>
              <TouchableOpacity 
                style={[
                  commonStyles.card, 
                  { 
                    alignItems: 'center', 
                    padding: getResponsiveSpacing(20),
                    marginBottom: spacing.md,
                  }
                ]}
                onPress={() => router.push('/calendar')}
              >
                <Icon name="calendar" size={iconSize} color={colors.warning} />
                <Text style={[
                  commonStyles.subtitle, 
                  { 
                    marginTop: spacing.sm, 
                    textAlign: 'center',
                    fontSize: isSmall ? typography.base : typography.lg,
                  }
                ]}>
                  Calendar
                </Text>
                <Text style={[
                  commonStyles.caption, 
                  { 
                    textAlign: 'center', 
                    color: colors.textSecondary,
                    marginTop: spacing.xs,
                  }
                ]}>
                  View your schedule
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: cardMargin, marginBottom: spacing.lg }}>
          <View style={[commonStyles.rowBetween, { marginBottom: spacing.lg }]}>
            <Text style={[
              commonStyles.heading,
              { fontSize: isSmall ? typography.lg : typography.xl }
            ]}>
              Upcoming
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity onPress={() => router.push('/todos')}>
                <Text style={[commonStyles.caption, { color: colors.primary }]}>Tasks</Text>
              </TouchableOpacity>
              <Text style={[commonStyles.caption, { color: colors.textSecondary }]}>•</Text>
              <TouchableOpacity onPress={() => router.push('/calendar')}>
                <Text style={[commonStyles.caption, { color: colors.primary }]}>Calendar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {upcomingItems.length > 0 ? (
            upcomingItems.map((item) => {
              const itemDate = item.due_date || item.start_time;
              const daysUntil = getDaysUntilDue(itemDate);
              const overdue = isOverdue(itemDate);
              
              return (
                <View
                  key={`${item.type}-${item.id}`}
                  style={[
                    commonStyles.card,
                    {
                      marginBottom: spacing.md,
                      borderLeftWidth: 4,
                      borderLeftColor: item.type === 'task' 
                        ? getPriorityColor(item.priority) 
                        : colors.info,
                    }
                  ]}
                >
                  <View style={[
                    isSmall ? { flexDirection: 'column' } : commonStyles.rowBetween, 
                    { marginBottom: spacing.sm }
                  ]}>
                    <View style={[commonStyles.row, { flex: 1 }]}>
                      <Icon
                        name={getTypeIcon(
                          item.type === 'task' ? item.priority : item.event_type, 
                          item.type
                        )}
                        size={20}
                        color={item.type === 'task' 
                          ? getPriorityColor(item.priority) 
                          : colors.info}
                      />
                      <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                        <Text style={[
                          commonStyles.subtitle, 
                          { 
                            flex: 1,
                            fontSize: isSmall ? typography.base : typography.lg,
                          }
                        ]}>
                          {item.title}
                        </Text>
                        {item.subject && (
                          <Text style={[commonStyles.caption, { color: colors.textSecondary }]}>
                            {item.subject}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={{ 
                      alignItems: isSmall ? 'flex-start' : 'flex-end',
                      marginTop: isSmall ? spacing.sm : 0,
                    }}>
                      <View style={{
                        backgroundColor: item.type === 'task' 
                          ? getPriorityColor(item.priority) 
                          : colors.info,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xs,
                        borderRadius: borderRadius.md,
                        marginBottom: spacing.xs,
                      }}>
                        <Text style={{
                          color: 'white',
                          fontSize: typography.xs,
                          fontWeight: typography.semibold,
                          textTransform: 'uppercase',
                        }}>
                          {item.type === 'task' ? item.priority : item.event_type}
                        </Text>
                      </View>
                      
                      {overdue && (
                        <View style={{
                          backgroundColor: colors.error,
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 2,
                          borderRadius: borderRadius.sm,
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
                  </View>
                  
                  {item.description && (
                    <Text style={[commonStyles.bodySecondary, { marginBottom: spacing.sm }]}>
                      {item.description}
                    </Text>
                  )}
                  
                  <View style={[
                    isSmall ? { flexDirection: 'column', alignItems: 'flex-start' } : commonStyles.row, 
                    { justifyContent: 'space-between' }
                  ]}>
                    <View style={[commonStyles.row, { marginBottom: isSmall ? spacing.xs : 0 }]}>
                      <Icon name="time" size={16} color={colors.textSecondary} />
                      <Text style={[commonStyles.caption, { marginLeft: spacing.xs }]}>
                        {formatDate(itemDate)} at {formatTime(itemDate)}
                      </Text>
                    </View>
                    
                    {daysUntil !== null && daysUntil >= 0 && !overdue && (
                      <Text style={[
                        commonStyles.caption, 
                        { 
                          color: daysUntil <= 1 ? colors.warning : colors.textSecondary,
                          fontWeight: daysUntil <= 1 ? typography.semibold : typography.normal,
                        }
                      ]}>
                        {daysUntil === 0 ? 'Today' : 
                         daysUntil === 1 ? 'Tomorrow' : 
                         `${daysUntil} days`}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={[commonStyles.center, { padding: spacing.xl }]}>
              <Icon name="calendar-outline" size={isSmall ? 40 : 48} color={colors.textTertiary} />
              <Text style={[
                commonStyles.subtitle, 
                { 
                  marginTop: spacing.md, 
                  textAlign: 'center',
                  fontSize: isSmall ? typography.base : typography.lg,
                }
              ]}>
                All caught up!
              </Text>
              <Text style={[commonStyles.caption, { textAlign: 'center', color: colors.textSecondary }]}>
                No upcoming tasks or events for the next two weeks
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SetupWizard
        visible={showSetupWizard}
        onClose={() => setShowSetupWizard(false)}
      />
    </SafeAreaView>
  );
}
