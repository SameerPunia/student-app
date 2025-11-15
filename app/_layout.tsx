
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import AuthScreen from '../components/AuthScreen';
import { Session } from '@supabase/supabase-js';
import { setupErrorLogging } from '../utils/errorLogger';
import { colors } from '../styles/commonStyles';
import { supabase } from '../lib/supabase';
import { Stack } from 'expo-router';
import { getCurrentUser, getGuestSession, clearGuestSession, type CurrentUser } from '../utils/auth';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback, useRef } from 'react';
import { quickDependencyCheck } from '../utils/dependencyChecker';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitialized = useRef(false);

  // Memoize the auth success handler
  const handleAuthSuccess = useCallback(async () => {
    console.log('Auth success, fetching user...');
    const user = await getCurrentUser();
    setCurrentUser(user);
    
    if (!user?.isGuest) {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    }
  }, []);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) {
      console.log('RootLayout already initialized, skipping...');
      return;
    }
    
    isInitialized.current = true;
    console.log('RootLayout mounted, setting up...');
    
    // Setup error logging
    setupErrorLogging();

    // Run dependency check in development mode
    if (__DEV__) {
      console.log('🔧 Running development environment check...');
      quickDependencyCheck().then(isReady => {
        if (isReady) {
          console.log('✅ Development environment is ready');
        } else {
          console.warn('⚠️ Development environment has issues - check Setup Wizard in dashboard');
        }
      }).catch(error => {
        console.error('❌ Failed to check development environment:', error);
      });
    }

    // Initialize auth session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        // Check for existing Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Found Supabase session');
          setSession(session);
          const user = await getCurrentUser();
          setCurrentUser(user);
        } else {
          // Check for guest session
          console.log('No Supabase session, checking for guest session');
          const guestSession = await getGuestSession();
          if (guestSession) {
            console.log('Found guest session');
            setCurrentUser(guestSession.user);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        // Clear guest session when signing out
        await clearGuestSession();
        setSession(null);
        setCurrentUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Only update if we have a session
        if (session) {
          setSession(session);
          const user = await getCurrentUser();
          setCurrentUser(user);
        }
      }
      
      // Make sure loading is set to false after auth state change
      setLoading(false);
    });

    return () => {
      console.log('RootLayout unmounting, cleaning up...');
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  // Show auth screen if no user is logged in
  if (!loading && !currentUser) {
    console.log('Rendering AuthScreen');
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  // Show loading state
  if (loading) {
    console.log('Loading auth state...');
    return null; // Or you could return a loading spinner here
  }

  console.log('Rendering main app');
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: Platform.OS === 'ios' ? 'slide_from_right' : 'fade',
          }}
        />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
