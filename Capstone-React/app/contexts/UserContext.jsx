// app/contexts/UserContext.jsx
// Central user state management for the React Native application
// Eliminates duplicate API calls and provides real-time user data updates via Socket.IO

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { socket } from '../../lib/socketClient';
import { supabase } from '../../supabase/supabaseClient';

// API configuration - matches your backend
const API_BASE = "http://192.168.254.114:3000/api"; // Update this to match your backend
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

// Create the context
const UserContext = createContext();

/**
 * Custom hook to access UserContext
 * Must be used within a UserProvider
 */
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

/**
 * UserProvider Component
 * Wraps the app and provides user data to all child components
 */
export const UserProvider = ({ children }) => {
  // State
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);

  /**
   * Clear all user data (used on logout or before login)
   */
  const clearUserData = useCallback(() => {
    setUserData(null);
    setIsAuthenticated(false);
  }, []);

  /**
   * Fetch user data from backend
   * Called on app startup and after login
   * 
   * Endpoints used:
   * - GET /api/users/me - Get basic user auth data (id, username, email)
   * - GET /api/profile/getProfile - Get full profile data (avatar, bio, names, etc.)
   */
  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get Supabase session tokens for authentication
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token || '';
      const refreshToken = data?.session?.refresh_token || '';
      
      // Step 1: Check authentication with /api/users/me
      const userRes = await fetch(`${API_BASE}/users/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`
        }
      });
      
      // If not authenticated, clear data and exit
      if (!userRes.ok) {
        clearUserData();
        return;
      }

      // Step 2: Get basic user data (id, username, email)
      const userDataResponse = await userRes.json();
      
      // Step 3: Fetch full profile data from /api/profile/getProfile
      const profileRes = await fetch(`${API_BASE}/profile/getProfile`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`
        }
      });
      
      let profile = {};
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        // Backend returns { profile: {...} }
        profile = profileData.profile || profileData || {};
      }

      // Step 4: Check seller status (for marketplace features)
      let isSeller = false;
      try {
        const sellerRes = await fetch(`${API_BASE}/marketplace/seller/status`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`
          }
        });
        
        if (sellerRes.ok) {
          const sellerData = await sellerRes.json();
          isSeller = sellerData.isSeller || false;
        }
      } catch (err) {
        console.warn('[UserContext] Failed to fetch seller status:', err);
        // Continue without seller status if API fails
      }

      // Step 5: Combine user data, profile data, and seller status
      const combinedData = {
        id: userDataResponse.id || null,
        userId: userDataResponse.id || null, // Duplicate for backward compatibility
        username: profile.username || userDataResponse.username || null,
        fullName: `${profile.firstName || ''} ${profile.middleName || ''} ${profile.lastName || ''}`.trim() || null,
        firstName: profile.firstName || null,
        middleName: profile.middleName || null,
        lastName: profile.lastName || null,
        avatar: profile.profilePicture ? 
          (profile.profilePicture.startsWith('http') ? profile.profilePicture : `${API_ORIGIN}${profile.profilePicture}`) 
          : null,
        profilePicture: profile.profilePicture || null,
        coverPicture: profile.coverPicture || null,
        bio: profile.bio || null,
        email: userDataResponse.email || null,
        role: profile.role || userDataResponse.role || null,
        isSeller: isSeller, // Add seller status
        ...userDataResponse, // Include any other fields from user data
        ...profile // Include any other fields from profile
      };

      setUserData(combinedData);
      setIsAuthenticated(true);
      
      console.log('[UserContext] User data fetched successfully:', combinedData.username);
      
    } catch (error) {
      console.error('[UserContext] Failed to fetch user data:', error);
      clearUserData();
    } finally {
      setIsLoading(false);
    }
  }, [clearUserData]);

  /**
   * Update user data (used for optimistic updates)
   * Merges new data with existing data without fetching
   * 
   * @param {Object} newData - New user data to merge
   */
  const updateUserData = useCallback((newData) => {
    setUserData(prev => {
      if (!prev) return null;
      return { ...prev, ...newData };
    });
  }, []);

  /**
   * Refresh user data (re-fetch from backend)
   * Used after:
   * - Login/OAuth callback
   * - Profile updates (to get fresh data from server)
   * - Any operation that changes user data
   */
  const refreshUserData = useCallback(async () => {
    await fetchUserData();
  }, [fetchUserData]);

  // ⚡ REAL-TIME UPDATES: Listen for role changes via Socket.IO
  useEffect(() => {
    // Only listen if user is authenticated and has data
    if (!isAuthenticated || !userData) return;

    // Join user-specific room for targeted events
    socket.emit('join', userData.id);
    console.log('[UserContext] Joined socket room for user:', userData.id);

    // Listen for role change events from backend
    const handleRoleChanged = (payload) => {
      console.log('[UserContext] Role changed event received:', payload);
      
      // Verify this event is for the current user
      if (payload.userId !== userData.id && payload.userId !== userData.userId) {
        return;
      }
      
      const oldRole = userData.role;
      // Extract role from payload - handle both direct value and object format
      let newRole = payload.newRole || payload.role;
      
      // If newRole is an object (like {new: 'admin'}), extract the value
      if (typeof newRole === 'object' && newRole !== null) {
        newRole = newRole.new || newRole;
      }
      
      // Update role immediately
      setUserData(prev => ({ ...prev, role: newRole }));
      
      // Show alert notification
      let message = '';
      let title = 'Permissions Changed';
      
      if (newRole === 'artist' && oldRole !== 'artist') {
        message = '🎨 Congratulations! You now have artist permissions.';
      } else if (newRole === 'admin' && oldRole !== 'admin') {
        message = '👑 You have been granted administrator privileges.';
      } else if (oldRole === 'artist' && newRole !== 'artist') {
        message = '⚠️ Your artist permissions have been removed.';
      } else if (oldRole === 'admin' && newRole !== 'admin') {
        message = '⚠️ Your administrator privileges have been revoked.';
      } else {
        message = `Your role has been changed to ${newRole}.`;
      }
      
      Alert.alert(title, message);
    };

    // Listen for profile update events
    const handleProfileUpdated = (payload) => {
      console.log('[UserContext] Profile updated event received:', payload);
      
      if (payload.userId !== userData.id && payload.userId !== userData.userId) {
        return;
      }
      
      if (payload.updates) {
        // Extract the actual values from the updates object
        // Backend sends {field: {old: value, new: value}} format
        const cleanedUpdates = {};
        for (const key in payload.updates) {
          const update = payload.updates[key];
          // If the update is an object with 'new' property, extract it
          if (typeof update === 'object' && update !== null && 'new' in update) {
            cleanedUpdates[key] = update.new;
          } else {
            cleanedUpdates[key] = update;
          }
        }
        
        updateUserData(cleanedUpdates);
      }
    };

    // Listen for email change events
    const handleEmailChanged = (payload) => {
      console.log('[UserContext] Email changed event received:', payload);
      
      if (payload.userId !== userData.id && payload.userId !== userData.userId) {
        return;
      }
      
      updateUserData({ email: payload.newEmail });
      
      Alert.alert('Email Updated', 'Your email address has been changed.');
    };

    // Listen for seller status change events
    const handleSellerStatusChanged = (payload) => {
      console.log('[UserContext] Seller status changed event received:', payload);
      
      if (payload.userId !== userData.id && payload.userId !== userData.userId) {
        return;
      }
      
      updateUserData({ isSeller: payload.isSeller });
      
      if (payload.isSeller) {
        Alert.alert(
          '🎉 Congratulations!', 
          'Your seller application has been approved! You can now sell your artwork on Museo Marketplace.',
          [{ text: 'OK', onPress: () => console.log('Seller approved notification shown') }]
        );
      }
    };

    // Register all event listeners
    socket.on('user:role_changed', handleRoleChanged);
    socket.on('user:profile_updated', handleProfileUpdated);
    socket.on('user:email_changed', handleEmailChanged);
    socket.on('user:seller_status_changed', handleSellerStatusChanged);

    // Cleanup on unmount or when dependencies change
    return () => {
      socket.off('user:role_changed', handleRoleChanged);
      socket.off('user:profile_updated', handleProfileUpdated);
      socket.off('user:email_changed', handleEmailChanged);
      socket.off('user:seller_status_changed', handleSellerStatusChanged);
    };
  }, [isAuthenticated, userData?.id, userData?.userId, userData?.role, updateUserData]);

  // Provide context value to all children
  return (
    <UserContext.Provider value={{
      userData,
      isLoading,
      isAuthenticated,
      updateUserData,
      refreshUserData,
      clearUserData,
      fetchUserData,
      notifVisible,
      setNotifVisible
    }}>
      {children}
    </UserContext.Provider>
  );
};
