// app/_layout.js
// Root layout that wraps the entire app with UserProvider
// This enables global user state management and real-time updates

import React from 'react';
import { Stack } from 'expo-router';
import { UserProvider } from './contexts/UserContext';

export default function RootLayout() {
  return (
    <UserProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="auth/callback" />
      </Stack>
    </UserProvider>
  );
}
