import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Image, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Header from '../components/Header'; // Reusable header
import { supabase } from "../../supabase/supabaseClient";
import io from 'socket.io-client';
import { useUser } from '../contexts/UserContext';

// Chat item component
const ChatItem = ({ name, lastMessage, imageSource, lastMessageTime, onPress, unread, unreadCount }) => {
  const resolvedSource = typeof imageSource === 'string' ? { uri: imageSource } : imageSource;
  return (
    <TouchableOpacity style={styles.chatItem} onPress={onPress}>
      {resolvedSource ? (
        <Image source={resolvedSource} style={styles.chatImage} />
      ) : (
        <View style={[styles.chatImage, styles.placeholderCircle]} />
      )}
      <View style={styles.chatTextContainer}>
        <View style={styles.chatHeaderRow}>
          <Text style={[styles.chatName, unread && styles.chatNameUnread]}>
            {name}
            {unread && unreadCount > 0 && (
              <Text style={styles.unreadCountInline}> ({unreadCount > 99 ? '99+' : unreadCount})</Text>
            )}
          </Text>
          <Text style={styles.chatTime}>{lastMessageTime}</Text>
        </View>
        <Text style={[styles.chatLastMessage, unread && styles.chatLastMessageUnread]} numberOfLines={1}>
          {lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const MessagesScreen = () => {
  // Get user data from UserContext
  const { userData } = useUser();
  const currentUserId = userData?.id || null;
  
  const router = useRouter();
  const API_BASE = "http://192.168.254.114:3000/api";
  const API_ORIGIN = API_BASE.replace(/\/api$/, "");

  const [conversations, setConversations] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchUsers, setSearchUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Filter state
  const [selectedFilter, setSelectedFilter] = useState('all');

  const resolveUrl = (u) => {
    if (!u) return null;
    return u.startsWith('http') ? u : `${API_ORIGIN}${u}`;
  };

  const normalizeTimestamp = (t) => {
    if (!t) return null;
    if (t instanceof Date) return t.getTime();
    if (typeof t === 'number') {
      return t < 1e12 ? t * 1000 : t;
    }
    if (typeof t === 'string') {
      const num = Number(t);
      if (!Number.isNaN(num) && t.trim().match(/^\d+$/)) {
        return num < 1e12 ? num * 1000 : num;
      }
      const d = new Date(t);
      const ms = d.getTime();
      return Number.isNaN(ms) ? null : ms;
    }
    return null;
  };

  const formatMessageTime = (t) => {
    if (!t) return '';
    const d = new Date(t);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const isSameDay = d.toDateString() === now.toDateString();
    if (isSameDay) {
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    }
    const diffMs = now.setHours(0,0,0,0) - new Date(d.toDateString()).setHours(0,0,0,0);
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    }
    return d.toLocaleDateString();
  };

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || null;
      const rt = data?.session?.refresh_token || null;
      // currentUserId now comes from UserContext
      setAccessToken(at);
      setRefreshToken(rt);

      setLoading(true);
      // Add cache-busting timestamp to force fresh data
      const timestamp = Date.now();
      const res = await fetch(`${API_BASE}/message/getConversation?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${at || ''}`,
          'Cookie': `access_token=${at || ''}; refresh_token=${rt || ''}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        credentials: 'include',
      });
      if (!res.ok) {
        console.error('[messages.js] Fetch failed:', res.status, res.statusText);
        const errorText = await res.text();
        console.error('[messages.js] Error response:', errorText);
        setConversations([]);
        return;
      }
      const json = await res.json();
      const list = Array.isArray(json?.conversations) ? json.conversations : [];
      const mapped = list.map((c) => {
        const other = c.otherUser || {};
        const nameParts = [other.firstName, other.middleName, other.lastName].filter(Boolean);
        const displayName = (nameParts.join(' ') || other.username || 'User').trim();
        const tsRaw = (
          (c.lastMessageTimestamp) ||
          (c.lastMessageTime) ||
          (c.lastMessage && (c.lastMessage.createdAt || c.lastMessage.created_at)) ||
          c.updatedAt || c.updated_at || null
        );
        const ts = normalizeTimestamp(tsRaw);
        const unreadStatus = c.unread || c.hasUnread || c.unreadCount > 0 || false;
        const unreadNum = c.unreadCount || 0;
        return {
          id: c.conversationId,
          otherUserId: other.id,
          name: displayName,
          lastMessage: (c.lastMessage && (c.lastMessage.content || c.lastMessage.text)) || c.lastMessageContent || '',
          avatar: resolveUrl(other.profilePicture),
          lastMessageTime: ts,
          unread: unreadStatus,
          unreadCount: unreadNum,
        };
      });
      // Sort by most recent message first
      const sorted = mapped.sort((a, b) => {
        const timeA = typeof a.lastMessageTime === 'number' ? a.lastMessageTime : normalizeTimestamp(a.lastMessageTime) || 0;
        const timeB = typeof b.lastMessageTime === 'number' ? b.lastMessageTime : normalizeTimestamp(b.lastMessageTime) || 0;
        return timeB - timeA;
      });
      setConversations(sorted);

      // Fallback enrichment: fetch latest message for items missing timestamp
      const missing = sorted.filter(it => !it.lastMessageTime && it.id);
      if (missing.length > 0) {
        try {
          const enriched = await Promise.all(missing.map(async (it) => {
            try {
              const r = await fetch(`${API_BASE}/message/getConversation/${encodeURIComponent(String(it.id))}` , {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${at || ''}`,
                  'Cookie': `access_token=${at || ''}; refresh_token=${rt || ''}`,
                },
                credentials: 'include',
              });
              if (!r.ok) return it;
              const j = await r.json();
              const rows = Array.isArray(j?.messages) ? j.messages : [];
              const last = rows[rows.length - 1];
              if (!last) return it;
              const ts2 = normalizeTimestamp(last.createdAt || last.created_at);
              return {
                ...it,
                lastMessage: (last.content || last.text || it.lastMessage || ''),
                lastMessageTime: ts2 || it.lastMessageTime,
              };
            } catch {
              return it;
            }
          }));
          const merged = sorted.map(s => enriched.find(e => e.id === s.id) || s)
            .sort((a, b) => {
              const timeA = typeof a.lastMessageTime === 'number' ? a.lastMessageTime : normalizeTimestamp(a.lastMessageTime) || 0;
              const timeB = typeof b.lastMessageTime === 'number' ? b.lastMessageTime : normalizeTimestamp(b.lastMessageTime) || 0;
              return timeB - timeA;
            });
          setConversations(merged);
        } catch {}
      }
    } catch (e) {
      console.warn('[messages.js] Error fetching conversations:', e?.message || e);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Refresh conversation list when screen comes into focus (e.g., after reading a message)
  useFocusEffect(
    useCallback(() => {
      // Force immediate refresh when returning to screen
      fetchConversations();
      
      // Also refresh after a short delay to catch any delayed updates
      const timer = setTimeout(() => {
        fetchConversations();
      }, 500);
      
      return () => clearTimeout(timer);
    }, [fetchConversations])
  );

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchConversations();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Realtime updates for conversation list
  useEffect(() => {
    let socket;
    let mounted = true;
    const setup = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id;
        if (!uid) return;
        socket = io(API_ORIGIN, { transports: ['websocket'], withCredentials: true });
        socket.on('connect', () => {
          socket.emit('join', uid);
        });
        const refresh = () => { if (mounted) fetchConversations(); };
        socket.on('message:new', refresh);
        socket.on('conversation:updated', refresh);
        socket.on('message:read', refresh); // Listen for read status updates
        socket.on('messages:read', refresh); // Listen for bulk read updates
      } catch {}
    };
    setup();
    return () => {
      mounted = false;
      try { if (socket) { socket.removeAllListeners(); socket.disconnect(); } } catch {}
    };
  }, [API_ORIGIN, fetchConversations]);

  // Debounced search for users (when typing 2+ chars)
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchUsers([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase.auth.getSession();
        const at = data?.session?.access_token || '';
        const rt = data?.session?.refresh_token || '';
        
        const res = await fetch(`${API_BASE}/users/getall`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `access_token=${at}; refresh_token=${rt}`,
          },
          credentials: 'include',
        });

        if (!res.ok) {
          setSearchUsers([]);
          return;
        }

        const data2 = await res.json();
        const lower = query.toLowerCase();
        
        // Map and filter users
        const mapped = (Array.isArray(data2) ? data2 : [])
          .map(p => ({
            id: p.userId || p.profileId || p.id,
            username: p.username || '',
            firstName: p.firstName || '',
            middleName: p.middleName || '',
            lastName: p.lastName || '',
            profilePicture: p.profilePicture || null,
            bio: p.bio || '',
          }))
          .filter(u => {
            if (!u.id || u.id === currentUserId) return false;
            const fullName = [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ');
            return (
              (fullName && fullName.toLowerCase().includes(lower)) ||
              (u.username && u.username.toLowerCase().includes(lower)) ||
              (u.bio && u.bio.toLowerCase().includes(lower))
            );
          })
          .slice(0, 20); // Limit results

        setSearchUsers(mapped);
      } catch (err) {
        console.error('[messages.js] Search error:', err);
        setSearchUsers([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, API_BASE, currentUserId]);

  // Filter options
  const filterOptions = [
    { id: 'all', name: 'All' },
    { id: 'unread', name: 'Unread' },
  ];

  // Filter conversations and merge with search results
  const displayItems = React.useMemo(() => {
    // Filter existing conversations by search query
    const query = searchQuery.trim().toLowerCase();
    let filteredConvs = conversations;

    // Apply filter (all/unread)
    if (selectedFilter === 'unread') {
      // Filter for unread conversations (when backend supports it)
      // For now, checking if conversation has unread flag
      filteredConvs = filteredConvs.filter(c => c.unread === true || c.hasUnread === true);
    }

    // Apply search query filter
    if (query.length >= 1) {
      filteredConvs = filteredConvs.filter(c => {
        return (
          c.name.toLowerCase().includes(query) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(query))
        );
      });
    }

    // If search is too short, just return filtered conversations
    if (query.length < 2) {
      return filteredConvs.map(c => ({ ...c, isNewUser: false }));
    }

    // Get IDs of users we already have conversations with
    const existingUserIds = new Set(
      conversations.map(c => c.otherUserId).filter(id => id != null)
    );

    // Add new users from search (not in existing conversations)
    const newUsers = searchUsers
      .filter(u => !existingUserIds.has(u.id))
      .map(u => {
        const displayName = [u.firstName, u.middleName, u.lastName]
          .filter(Boolean)
          .join(' ') || u.username || 'User';
        return {
          id: `new-${u.id}`,
          userId: u.id,
          name: displayName,
          lastMessage: 'Start conversation',
          avatar: u.profilePicture ? resolveUrl(u.profilePicture) : null,
          lastMessageTime: null,
          isNewUser: true,
          userData: u,
        };
      })
      .slice(0, 10);

    return [
      ...filteredConvs.map(c => ({ ...c, isNewUser: false })),
      ...newUsers,
    ];
  }, [conversations, searchQuery, searchUsers, selectedFilter]);

  // Handle starting a new conversation
  const handleChatPress = useCallback((item) => {
    if (item.isNewUser) {
      // Navigate to viewMessage with new user info
      router.push({
        pathname: '/(drawer)/viewMessage',
        params: {
          conversationId: 'new',
          userId: String(item.userId),
          name: item.name,
        },
      });
    } else {
      // Existing conversation
      router.push({
        pathname: '/(drawer)/viewMessage',
        params: {
          conversationId: String(item.id || ''),
          name: item.name,
        },
      });
    }
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Messages" 
        showSearch={true} 
        onSearch={(text) => setSearchQuery(text)}
      />

      {/* Filter Section */}
      <View style={styles.filterSection}>
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

      <ScrollView 
        style={styles.chatList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#000']} // Android
            tintColor="#000" // iOS
          />
        }
      >
        {loading && conversations.length === 0 ? (
          <Text style={{ margin: 12 }}>Loading...</Text>
        ) : displayItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery.trim().length < 2 
                ? 'No Unread Message' 
                : (searching ? 'Searching...' : 'No results found')}
            </Text>
          </View>
        ) : (
          displayItems.map((item) => (
            <View key={item.id} style={{ position: 'relative' }}>
              <ChatItem
                name={item.name}
                lastMessage={item.lastMessage}
                imageSource={item.avatar}
                lastMessageTime={item.isNewUser ? '' : formatMessageTime(item.lastMessageTime)}
                onPress={() => handleChatPress(item)}
                unread={item.unread}
                unreadCount={item.unreadCount || 0}
              />
              {item.isNewUser && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>New</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  filterSection: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterScroll: {
    flexDirection: 'row',
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
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  chatList: { flex: 1, paddingHorizontal: 15 },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chatImage: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  chatTextContainer: { flex: 1 },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chatName: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  chatNameUnread: { fontWeight: '800', color: '#000' },
  chatTime: { fontSize: 12, color: '#888', marginLeft: 8 },
  chatLastMessage: { fontSize: 14, color: '#888' },
  chatLastMessageUnread: { fontWeight: '600', color: '#333' },
  unreadCountInline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A68C7B',
  },
  placeholderCircle: { backgroundColor: '#e9e9e9', borderWidth: 1, borderColor: '#ddd' },
  newBadge: {
    position: 'absolute',
    top: 10,
    right: 15,
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#888',
    textAlign: 'center',
  },
});

export default MessagesScreen;