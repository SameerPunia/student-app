
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

const GUEST_SESSION_KEY = 'guest_session';
const GUEST_USER_ID_KEY = 'guest_user_id';

export interface GuestUser {
  id: string;
  email: string | null;
  name: string;
  isGuest: boolean;
  created_at: string;
}

export interface GuestSession {
  user: GuestUser;
  session: {
    access_token: string;
    refresh_token: string | null;
    expires_at: string | null;
    user: GuestUser;
  };
  isGuest: boolean;
  created_at: string;
}

const generateGuestId = (): string => {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createGuestSession = async (): Promise<GuestSession> => {
  try {
    console.log('createGuestSession: Creating new guest session');
    
    const guestId = generateGuestId();
    const now = new Date().toISOString();
    
    const guestUser: GuestUser = {
      id: guestId,
      email: null,
      name: 'Guest User',
      isGuest: true,
      created_at: now,
    };

    const guestSession: GuestSession = {
      user: guestUser,
      session: {
        access_token: `guest_token_${guestId}`,
        refresh_token: null,
        expires_at: null,
        user: guestUser,
      },
      isGuest: true,
      created_at: now,
    };

    await AsyncStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guestSession));
    await AsyncStorage.setItem(GUEST_USER_ID_KEY, guestId);

    console.log('createGuestSession: Guest session created successfully', guestId);
    return guestSession;
  } catch (error) {
    console.error('createGuestSession: Error creating guest session:', error);
    throw error;
  }
};

export const getGuestSession = async (): Promise<GuestSession | null> => {
  try {
    const guestSessionData = await AsyncStorage.getItem(GUEST_SESSION_KEY);
    
    if (guestSessionData) {
      const guestSession: GuestSession = JSON.parse(guestSessionData);
      return guestSession;
    }

    return null;
  } catch (error) {
    console.error('getGuestSession: Error getting guest session:', error);
    await AsyncStorage.multiRemove([GUEST_SESSION_KEY, GUEST_USER_ID_KEY]);
    return null;
  }
};

export const clearGuestSession = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([GUEST_SESSION_KEY, GUEST_USER_ID_KEY]);
    console.log('clearGuestSession: Guest session cleared');
  } catch (error) {
    console.error('clearGuestSession: Error clearing guest session:', error);
  }
};

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  isGuest: boolean;
  avatar_url?: string | null;
  created_at?: string | null;
}

let userCache: CurrentUser | null | undefined = undefined;
let lastFetchTime = 0;
const CACHE_DURATION = 1000;

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  try {
    const now = Date.now();
    if (userCache !== undefined && (now - lastFetchTime) < CACHE_DURATION) {
      return userCache;
    }

    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
    
    if (!error && supabaseUser) {
      const user: CurrentUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || null,
        name: supabaseUser.user_metadata?.name || null,
        isGuest: false,
        avatar_url: supabaseUser.user_metadata?.avatar_url || null,
        created_at: supabaseUser.created_at,
      };
      
      userCache = user;
      lastFetchTime = now;
      return user;
    }

    const guestSessionData = await AsyncStorage.getItem(GUEST_SESSION_KEY);
    
    if (guestSessionData) {
      try {
        const guestSession: GuestSession = JSON.parse(guestSessionData);
        const user: CurrentUser = {
          id: guestSession.user.id,
          email: guestSession.user.email,
          name: guestSession.user.name,
          isGuest: true,
          created_at: guestSession.user.created_at,
        };
        
        userCache = user;
        lastFetchTime = now;
        return user;
      } catch (parseError) {
        console.error('getCurrentUser: Error parsing guest session:', parseError);
        await AsyncStorage.multiRemove([GUEST_SESSION_KEY, GUEST_USER_ID_KEY]);
      }
    }

    userCache = null;
    lastFetchTime = now;
    return null;
  } catch (error) {
    console.error('getCurrentUser: Error getting current user:', error);
    return null;
  }
};

export const clearUserCache = (): void => {
  userCache = undefined;
  lastFetchTime = 0;
};

export const isGuestUser = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user?.isGuest || false;
};

export const getCurrentUserId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  return user?.id || null;
};

/**
 * Enhanced sign-out function with comprehensive cleanup for web and mobile
 * This ensures complete session termination and proper redirect
 */
export const signOut = async (): Promise<void> => {
  try {
    console.log('signOut: Starting comprehensive sign out process');
    
    // Step 1: Clear user cache immediately
    clearUserCache();
    console.log('signOut: User cache cleared');
    
    // Step 2: Sign out from Supabase (this clears auth tokens)
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      console.error('signOut: Supabase sign out error:', error);
    } else {
      console.log('signOut: Supabase session terminated');
    }
    
    // Step 3: Clear guest session
    await clearGuestSession();
    console.log('signOut: Guest session cleared');
    
    // Step 4: Clear AsyncStorage completely
    try {
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys);
      console.log('signOut: AsyncStorage cleared');
    } catch (storageError) {
      console.error('signOut: Error clearing AsyncStorage:', storageError);
    }
    
    // Step 5: Web-specific comprehensive cleanup
    if (Platform.OS === 'web') {
      try {
        // Clear localStorage
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
          console.log('signOut: localStorage cleared');
        }
        
        // Clear sessionStorage
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
          console.log('signOut: sessionStorage cleared');
        }
        
        // Clear all cookies
        if (typeof document !== 'undefined') {
          const cookies = document.cookie.split(';');
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            // Clear cookie for all possible paths and domains
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
          }
          console.log('signOut: All cookies cleared');
        }
        
        // Clear IndexedDB (used by Supabase for persistence)
        if (typeof indexedDB !== 'undefined') {
          try {
            const databases = await indexedDB.databases();
            for (const db of databases) {
              if (db.name) {
                indexedDB.deleteDatabase(db.name);
                console.log(`signOut: Deleted IndexedDB database: ${db.name}`);
              }
            }
          } catch (idbError) {
            console.log('signOut: Could not clear IndexedDB:', idbError);
          }
        }
        
        // Clear any Supabase-specific storage
        try {
          const supabaseKeys = ['supabase.auth.token', 'sb-telrerkizvtzbxjdlyoj-auth-token'];
          supabaseKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          });
          console.log('signOut: Supabase-specific storage cleared');
        } catch (e) {
          console.log('signOut: Error clearing Supabase storage:', e);
        }
        
      } catch (webError) {
        console.error('signOut: Error during web cleanup:', webError);
      }
    }
    
    console.log('signOut: Sign out process completed successfully');
  } catch (error) {
    console.error('signOut: Critical error during sign out:', error);
    // Even if there's an error, try to clear what we can
    clearUserCache();
    throw error;
  }
};

export const hasValidSession = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user !== null;
};
