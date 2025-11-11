import React, { useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { useUser } from '../contexts/UserContext';

// Custom drawer content
const CustomDrawerContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { userData, refreshUserData, isAuthenticated } = useUser();

  const menuItems = [
    { label: "Home", icon: <MaterialCommunityIcons name="view-grid-outline" size={30} color="#A68C7B" />, route: '/(drawer)/home' },
    { label: "Artists", icon: <MaterialCommunityIcons name="palette-outline" size={30} color="#A68C7B" />, route: '/(drawer)/artists' },
    { label: "Gallery", icon: <MaterialCommunityIcons name="image-outline" size={30} color="#A68C7B" />, route: '/(drawer)/gallery' },
    { label: "Marketplace", icon: <MaterialCommunityIcons name="cart-outline" size={30} color="#A68C7B" />, route: '/(drawer)/marketplace' },
    { label: "Events", icon: <MaterialCommunityIcons name="calendar-outline" size={30} color="#A68C7B" />, route: '/(drawer)/events' },
    { label: "Wallet", icon: <MaterialCommunityIcons name="wallet-outline" size={30} color="#A68C7B" />, route: '/(drawer)/transaction' },
    { label: "Settings", icon: <MaterialCommunityIcons name="cog-outline" size={30} color="#A68C7B" />, route: '/(drawer)/settings' },
  ];

  // Fetch user data when drawer mounts
  useEffect(() => {
    if (!isAuthenticated || !userData) {
      refreshUserData();
    }
  }, []);

  // Debug pathname changes
  useEffect(() => {
    console.log('[Drawer] Current pathname:', pathname);
  }, [pathname]);

  return (
    <SafeAreaView style={styles.drawerContainer}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        <Image
          source={userData?.avatar ? { uri: userData.avatar } : require('../../assets/icon.png')}
          style={styles.profilePic}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userData?.username || 'User'}</Text>
          {userData?.fullName && <Text style={styles.profileEmail}>{userData.fullName}</Text>}
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuItemsContainer}>
        {menuItems.map((item, index) => {
          // Match both exact route and pathname without (drawer) prefix
          const routePath = item.route.replace('/(drawer)', '');
          const isActive = pathname === item.route || pathname === routePath || pathname.endsWith(routePath);
          
          // Debug log for first render
          if (index === 0) {
            console.log('[Drawer] Checking active state:', {
              pathname,
              itemRoute: item.route,
              routePath,
              isActive
            });
          }
          
          return (
            <MenuItem 
              key={index} 
              icon={item.icon} 
              label={item.label} 
              onPress={() => router.push(item.route)}
              isActive={isActive}
            />
          );
        })}
      </View> 

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={() => router.push('/')}>
        <Ionicons name="log-out-outline" size={30} color="#A68C7B" />
        <Text style={styles.logoutButtonText}>Log out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};


// Menu item component
const MenuItem = ({ icon, label, onPress, isActive }) => {
  // Log when component renders with active state
  if (isActive) {
    console.log('[MenuItem] Active item:', label);
  }
  
  return (
    <TouchableOpacity 
      style={[
        styles.menuItem, 
        isActive && styles.menuItemActive
      ]} 
      onPress={onPress}
    >
      {icon}
      <Text style={[
        styles.menuItemText,
        isActive && styles.menuItemTextActive
      ]}>{label}</Text>
      {isActive && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );
};

// Drawer layout
export default function Layout() {
  return (
    <Drawer
      screenOptions={{ headerShown: false }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="home" options={{ drawerLabel: "Home", title: "Home" }} />
      <Drawer.Screen name="artists" options={{ drawerLabel: "Artists", title: "Artists" }} />
      <Drawer.Screen name="gallery" options={{ drawerLabel: "Gallery", title: "Gallery" }} />
      <Drawer.Screen name="marketplace" options={{ drawerLabel: "Marketplace", title: "Marketplace" }} />
      <Drawer.Screen name="events" options={{ drawerLabel: "Events", title: "Events" }} />
      <Drawer.Screen name="transaction" options={{ drawerLabel: "Wallet", title: "Wallet" }} />
      <Drawer.Screen name="settings" options={{ drawerLabel: "Settings", title: "Settings" }} />
      <Drawer.Screen name="profile" options={{ drawerLabel: "Profile", title: "Profile" }} />

      {/* Hidden screens for navigation */}
      <Drawer.Screen
        name="viewMessage"
        options={{ drawerLabel: () => null, title: "View Message", swipeEnabled: false }}
      />
      <Drawer.Screen
        name="viewGallery"
        options={{ drawerLabel: () => null, title: "View Gallery", swipeEnabled: false }}
      />
      <Drawer.Screen
        name="viewArtist"
        options={{ drawerLabel: () => null, title: "View Artist", swipeEnabled: false }}
      />
      <Drawer.Screen
        name="viewEvents"
        options={{ drawerLabel: () => null, title: "View Event", swipeEnabled: false }}
      />
      <Drawer.Screen
        name="viewNormalMarket"
        options={{ drawerLabel: () => null, title: "View Item", swipeEnabled: false }}
      />
      <Drawer.Screen
        name="viewTransaction"
        options={{ drawerLabel: () => null, title: "Transaction Details", swipeEnabled: false }}
      />
      <Drawer.Screen
        name="auction"
        options={{ drawerLabel: () => null, title: "Auction", swipeEnabled: false }}
      />
      <Drawer.Screen
        name="messages"
        options={{ drawerLabel: () => null, title: "Messages", swipeEnabled: false }}
      />
    </Drawer>
  );
}


const styles = StyleSheet.create({
  drawerContainer: { 
    flex: 1, 
    backgroundColor: '#fff', 
    justifyContent: 'space-between' 
  },
  drawerHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E6E6E6' 
  },
  profilePic: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    borderWidth: 2, 
    borderColor: '#A68C7B' 
  },
  profileInfo: { 
    marginLeft: 15 
  },
  profileName: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#000' 
  },
  profileEmail: { 
    fontSize: 13, 
    color: '#555', 
    marginTop: 4 
  },
  menuItemsContainer: { 
    flex: 1, 
    marginTop: 10 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    position: 'relative' 
  },
  menuItemActive: {
    backgroundColor: '#F5F0EB',
    borderLeftWidth: 4,
    borderLeftColor: '#A68C7B',
  },
  menuItemText: { 
    marginLeft: 15, 
    fontSize: 20, 
    color: '#A68C7B', 
    flex: 1 
  },
  menuItemTextActive: {
    fontWeight: '700',
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A68C7B',
    marginLeft: 8,
  },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    marginBottom: 60 },
  logoutButtonText: { 
    marginLeft: 15, 
    fontSize: 20, 
    color: "#A68C7B" 
  },
});