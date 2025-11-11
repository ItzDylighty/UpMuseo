import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from "../../supabase/supabaseClient";
import { useRouter } from 'expo-router';
import Header from '../components/Header'; 
import { useUser } from '../contexts/UserContext';
import useCustomFonts from '../hooks/useFonts';
import { Typography, Colors } from '../config/fonts';

const API_BASE = "http://192.168.254.114:3000/api";

// Reusable component for each event card
const EventCard = ({ event, onPress }) => {
  const getEventStatus = () => {
    try {
      const now = new Date();
      const startDate = new Date(event?.startsAt || event?.start);
      const endDate = new Date(event?.endsAt || event?.end || event?.startsAt || event?.start);
      
      if (now < startDate) return 'upcoming';
      if (now >= startDate && now <= endDate) return 'live';
      return 'ended';
    } catch { 
      return 'ended'; 
    }
  };

  const status = getEventStatus();

  return (
    <TouchableOpacity style={styles.eventCard} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: event.image }} style={styles.eventImage} />
        {status === 'ended' ? (
          <View style={[styles.badge, styles.endedBadge]}>
            <Text style={[styles.badgeText, styles.endedBadgeText]}>Ended</Text>
          </View>
        ) : status === 'live' ? (
          <View style={[styles.badge, styles.liveBadge]}>
            <Text style={[styles.badgeText, styles.liveBadgeText]}>Live</Text>
          </View>
        ) : (
          <View style={[styles.badge, styles.upcomingBadge]}>
            <Text style={[styles.badgeText, styles.upcomingBadgeText]}>Upcoming</Text>
          </View>
        )}
      </View>
      <Text style={styles.eventTitle}>{event.title}</Text>
    </TouchableOpacity>
  );
};

const EventsScreen = () => {
  // Load custom fonts
  const fontsLoaded = useCustomFonts();
  
  // Get user data from UserContext
  const { userData } = useUser();
  const role = userData?.role || null;
  
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Fetch events from backend
  const fetchEvents = async () => {
    try {
      const headers = { Accept: 'application/json' };
      // Get tokens from supabase session, like home.js
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || null;
      const rt = data?.session?.refresh_token || null;
      if (!at || !rt) {
        Alert.alert('Authentication required', 'Please login to view events.');
        setLoading(false);
        return;
      }
      headers['Cookie'] = `access_token=${at}; refresh_token=${rt}`;
      const response = await fetch(`${API_BASE}/event/getEvents`, { headers, method: 'GET' });
      const result = await response.json();

      if (response.ok) {
        const list = Array.isArray(result) ? result : (result?.data || result?.events || []);
        setEvents(list);
      } else {
        const message = result?.error || `Failed to fetch events (${response.status})`;
        console.error('Error fetching events:', message, '| Body:', result);
        Alert.alert('Error', message);
      }
    } catch (error) {
      console.error('Network error:', error);
      Alert.alert('Network Error', 'Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter options
  const filterOptions = [
    { id: 'all', name: 'All' },
    { id: 'thisWeek', name: 'This Week' },
    { id: 'nextWeek', name: 'Next Week' },
    { id: 'nextMonth', name: 'Next Month' },
    { id: 'ended', name: 'Done' },
  ];

  // Helper function to get date ranges
  const getDateRanges = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // This week (current week)
    const currentDay = today.getDay();
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - currentDay);
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 7);
    
    // Next week
    const nextWeekStart = new Date(thisWeekEnd);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 7);
    
    // Next month
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    
    return {
      now,
      thisWeek: { start: thisWeekStart, end: thisWeekEnd },
      nextWeek: { start: nextWeekStart, end: nextWeekEnd },
      nextMonth: { start: nextMonthStart, end: nextMonthEnd },
    };
  };

  // Filter events by selected time filter
  const filterEventsByTime = (eventsList) => {
    if (selectedFilter === 'all') return eventsList;
    
    const ranges = getDateRanges();
    
    return eventsList.filter(event => {
      const startDate = new Date(event.startsAt || event.start || event.createdAt);
      const endDate = new Date(event.endsAt || event.end || event.startsAt);
      
      switch (selectedFilter) {
        case 'thisWeek':
          return startDate >= ranges.thisWeek.start && startDate < ranges.thisWeek.end;
        case 'nextWeek':
          return startDate >= ranges.nextWeek.start && startDate < ranges.nextWeek.end;
        case 'nextMonth':
          return startDate >= ranges.nextMonth.start && startDate <= ranges.nextMonth.end;
        case 'ended':
          return endDate < ranges.now;
        default:
          return true;
      }
    });
  };

  // Sort events based on upload time - newest first, oldest last
  const sortedEvents = [...events].sort((a, b) => {
    // Try multiple date field variations from backend
    const getEventDate = (event) => {
      const dateValue = event.createdAt || event.created_at || event.dateCreated || 
                        event.date_created || event.createdTime || event.startsAt || 
                        event.starts_at || event.eventDate || event.uploadedAt;
      return dateValue ? new Date(dateValue).getTime() : 0;
    };
    
    const dateA = getEventDate(a);
    const dateB = getEventDate(b);
    
    // If dates are equal or both invalid, use eventId as tiebreaker
    if (dateA === dateB) {
      const idA = parseInt(a.eventId || a.id || 0);
      const idB = parseInt(b.eventId || b.id || 0);
      return idB - idA;
    }
    
    return dateB - dateA; // Newest first
  });

  // Apply time filter first, then search filter
  const timeFilteredEvents = filterEventsByTime(sortedEvents);
  
  // Filter events based on search query
  const filteredEvents = timeFilteredEvents.filter(event => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const title = (event.title || '').toLowerCase();
    const description = (event.description || '').toLowerCase();
    const venue = (event.venueName || event.venue || '').toLowerCase();
    const location = (event.location || '').toLowerCase();
    return title.includes(query) || description.includes(query) || venue.includes(query) || location.includes(query);
  });

  // Get count for each filter
  const getFilterCount = (filterId) => {
    if (filterId === 'all') return events.length;
    const tempFilter = selectedFilter;
    return filterEventsByTime(events).length;
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchEvents();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePressEvent = (eventId) => {
    if (!eventId) return;
   
    router.push({ pathname: '/(drawer)/viewEvents', params: { eventId: String(eventId) } });
  };

  // Show loading while fonts are loading
  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Events" showSearch={true} onSearch={handleSearch} />

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <Text style={styles.sectionTitle}>Filter Events</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && styles.filterChipActive
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Text style={[
                styles.filterChipText,
                selectedFilter === filter.id && styles.filterChipTextActive
              ]}>
                {filter.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <ScrollView 
          style={styles.eventGrid}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#000']} // Android
              tintColor="#000" // iOS
            />
          }
        >
          <View style={styles.row}>
            {filteredEvents.length > 0 ? (
              filteredEvents.map(event => (
                <EventCard
                  key={event.eventId || event.id}
                  event={event}
                  onPress={() => handlePressEvent(event.eventId || event.id)}
                />
              ))
            ) : searchQuery.trim() ? (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={64} color="#ccc" />
                <Text style={styles.noResultsTitle}>No results found</Text>
                <Text style={styles.noResultsText}>
                  Try searching for different keywords
                </Text>
              </View>
            ) : (
              <View style={styles.noResults}>
                <Ionicons name="calendar-outline" size={64} color="#ccc" />
                <Text style={styles.noResultsTitle}>No events available</Text>
                <Text style={styles.noResultsText}>
                  {selectedFilter === 'all' 
                    ? 'Check back later for upcoming events'
                    : `No events found for "${filterOptions.find(f => f.id === selectedFilter)?.name}"`
                  }
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  filterSection: {
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    ...Typography.heading2,
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 8,
    color: Colors.textAccent,
  },
  filterScroll: {
    marginHorizontal: 15,
    paddingBottom: 5,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  filterChipText: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    ...Typography.label,
    color: Colors.white,
  },
  eventGrid: { padding: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  eventCard: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 10,
  },
  eventImage: { width: '100%', height: 120, borderRadius: 10 },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#d4b48a',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    ...Typography.badge,
    color: Colors.textPrimary,
  },
  liveBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderColor: '#4CAF50',
  },
  liveBadgeText: {
    color: '#fff',
  },
  endedBadge: {
    backgroundColor: 'rgba(158, 158, 158, 0.9)',
    borderColor: '#9e9e9e',
  },
  endedBadgeText: {
    color: '#fff',
  },
  upcomingBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    borderColor: '#2196F3',
  },
  upcomingBadgeText: {
    color: '#fff',
  },
  eventTitle: { 
    ...Typography.heading4,
    textAlign: 'center', 
    marginBottom: 4,
    color: Colors.textPrimary,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noResultsTitle: {
    ...Typography.heading2,
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    ...Typography.bodyMedium,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

export default EventsScreen;
