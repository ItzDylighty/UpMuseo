import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, TextInput, ScrollView } from "react-native";
import { FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useRouter, useFocusEffect, usePathname } from 'expo-router';
import { supabase } from "../../supabase/supabaseClient";
import { useUser } from '../contexts/UserContext';
import io from 'socket.io-client';

const API_BASE = "http://192.168.254.114:3000/api";
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

const Header = ({ title, showSearch, onSearch }) => {
  const navigation = useNavigation();
  const router = useRouter();
  const pathname = usePathname();
  const { notifVisible, setNotifVisible } = useUser(); // Global notification dropdown state
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  const ensureTokens = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      return { at, rt, uid: data?.session?.user?.id || null };
    } catch (e) {
      return { at: '', rt: '', uid: null };
    }
  }, []);

  const fetchProfilePicture = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      const res = await fetch(`${API_BASE}/profile/getProfile`, {
        method: 'GET',
        credentials: 'include',
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      const bodyText = await res.text();
      let json = null; try { json = bodyText ? JSON.parse(bodyText) : null; } catch { json = null; }
      if (res.ok && json) {
        const p = json?.profile ?? json;
        // normalize possibly array/object values to string
        const pick = (v) => {
          if (!v) return null;
          if (typeof v === 'string') return v;
          if (Array.isArray(v)) return v.length ? pick(v[0]) : null;
          if (typeof v === 'object' && typeof v.uri === 'string') return v.uri;
          return null;
        };
        const resolveUrl = (u) => {
          if (!u) return null;
          const s = String(u);
          if (s.startsWith('http://') || s.startsWith('https://')) return s;
          // ensure leading slash for origin join
          return `${API_ORIGIN}${s.startsWith('/') ? s : `/${s}`}`;
        };

        const rawAvatar = pick(p?.profilePicture) || pick(p?.avatar) || pick(p?.data?.profilePicture) || pick(p?.user?.profilePicture) || null;
        const rawCover = pick(p?.coverPicture) || pick(p?.cover) || pick(p?.data?.coverPicture) || pick(p?.user?.coverPicture) || null;
        const resolvedAvatar = resolveUrl(rawAvatar);
        const resolvedCover = resolveUrl(rawCover);
        setAvatarUrl(resolvedAvatar);
        setCoverUrl(resolvedCover);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchProfilePicture();
  }, [fetchProfilePicture]);

  // Refetch profile picture when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      fetchProfilePicture();
      return () => {};
    }, [fetchProfilePicture])
  );

  const formatTime = (t) => {
    if (!t) return '';
    const d = new Date(t);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      const h = d.getHours() % 12 || 12;
      const m = d.getMinutes().toString().padStart(2, '0');
      const ap = d.getHours() >= 12 ? 'PM' : 'AM';
      return `${h}:${m} ${ap}`;
    }
    return d.toLocaleDateString();
  };

  const timeAgo = (iso) => {
    try {
      const t = new Date(iso).getTime();
      const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
      if (s < 60) return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      const d = Math.floor(h / 24);
      return `${d}d ago`;
    } catch {
      return '';
    }
  };

  const mapRows = (rows) => rows.map((n) => {
    let data = n?.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { data = undefined; }
    }
    const eventId = n?.eventId || data?.eventId || null;
    return {
      id: n.id || n.notificationId || String(n.createdAt || n.created_at || Math.random()),
      notificationId: n.notificationId || n.id || null,
      title: n.title || n.type || 'Notification',
      message: n.message || n.body || n.content || data?.venueName || '',
      createdAt: n.createdAt || n.created_at || null,
      read: !!(n.read || n.isRead),
      type: n.type || null,
      eventId,
    };
  });

  const fetchFrom = async (url, at, rt) => {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Cookie': `access_token=${at}; refresh_token=${rt}`, 'Authorization': at ? `Bearer ${at}` : '' },
    });
    const bodyText = await res.text();
    let json = null; try { json = bodyText ? JSON.parse(bodyText) : null; } catch { json = null; }
    if (!res.ok) {
      console.warn('[Header] notif fetch failed', url, res.status, res.statusText, bodyText?.slice(0, 200));
      return { items: [], ok: false };
    }
    const maybe = (obj) => (Array.isArray(obj) ? obj : (obj && (obj.notifications || obj.data || obj.list || obj.items)) || []);
    return { items: maybe(json), ok: true };
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const { at, rt } = await ensureTokens();
      // Web uses GET /notification returning { notifications }
      const res = await fetch(`${API_BASE}/notification`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Cookie': `access_token=${at}; refresh_token=${rt}`, 'Authorization': at ? `Bearer ${at}` : '' },
      });
      const bodyText = await res.text();
      if (!res.ok) {
        console.warn('[Header] notif fetch failed', `${API_BASE}/notification`, res.status, res.statusText, bodyText?.slice(0, 200));
        return; 
      }
      let json = null; try { json = bodyText ? JSON.parse(bodyText) : null; } catch { json = null; }
      const rows = Array.isArray(json?.notifications) ? json.notifications : [];
      // Filter last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filtered = rows.filter(row => {
        const createdAt = new Date(row.createdAt || row.created_at || 0);
        return createdAt >= thirtyDaysAgo;
      });
      // Map and sort newest first
      const mapped = mapRows(filtered).sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      setNotifications(mapped);
      setUnreadCount(mapped.filter(x => !x.read).length);
    } catch (e) {
      console.warn('[Header] notif list error', e?.message || e);
    }
  }, [ensureTokens]);

  const openNotification = useCallback((item) => {
    try { markSingleRead(item); } catch {}
    if (item?.eventId) {
      router.push(`/(drawer)/viewEvents?eventId=${encodeURIComponent(item.eventId)}`);
      setNotifVisible(false);
      return;
    }
    // Fallbacks for other types can be added here
  }, [markSingleRead, router]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mirror messages screen behavior: refetch when parent screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      fetchNotifications();
      return () => {};
    }, [fetchNotifications])
  );

  // Refresh when user opens the dropdown (ensures latest on mobile)
  useEffect(() => {
    if (notifVisible) {
      fetchNotifications();
    }
  }, [notifVisible, fetchNotifications]);

  // Auto-close notification dropdown when navigating to a different page
  useEffect(() => {
    setNotifVisible(false);
  }, [pathname, setNotifVisible]);

  const markAllRead = useCallback(async () => {
    try {
      const { at, rt } = await ensureTokens();
      await fetch(`${API_BASE}/notification/mark-all-read`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Cookie': `access_token=${at}; refresh_token=${rt}`, 'Authorization': at ? `Bearer ${at}` : '' },
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }, [ensureTokens]);

  const markSingleRead = useCallback(async (item) => {
    try {
      const { at, rt } = await ensureTokens();
      if (item?.notificationId) {
        await fetch(`${API_BASE}/notification/${encodeURIComponent(item.notificationId)}/read`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'Cookie': `access_token=${at}; refresh_token=${rt}`, 'Authorization': at ? `Bearer ${at}` : '' },
        });
      }
      setNotifications(prev => prev.map(p => (p.id === item.id ? { ...p, read: true } : p)));
      setUnreadCount(c => Math.max(0, c - (item.read ? 0 : 1)));
    } catch {}
  }, [ensureTokens]);

  const dismissNotification = useCallback(async (item) => {
    try {
      const { at, rt } = await ensureTokens();
      if (item?.notificationId) {
        await fetch(`${API_BASE}/notification/${encodeURIComponent(item.notificationId)}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'Cookie': `access_token=${at}; refresh_token=${rt}`, 'Authorization': at ? `Bearer ${at}` : '' },
        });
      }
      setNotifications(prev => prev.filter(p => p.id !== item.id));
      if (!item.read) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
    } catch (e) {
      console.warn('[Header] dismiss notif error', e?.message || e);
    }
  }, [ensureTokens]);

  useEffect(() => {
    let socket;
    let mounted = true;
    const setup = async () => {
      try {
        const { at, rt, uid } = await ensureTokens();
        if (!uid) return;
        socket = io(API_ORIGIN, { transports: ['websocket'], withCredentials: true, query: { access_token: at, refresh_token: rt } });
        socket.on('connect', () => { socket.emit('join', uid); });
        const onNew = (payload) => {
          if (!mounted || !payload) return;
          const n = payload.notification || payload;
          let data = n?.data;
          if (typeof data === 'string') { try { data = JSON.parse(data); } catch { data = undefined; } }
          const nid = n.notificationId || n.id || null;
          const evtId = n?.eventId || data?.eventId || null;
          const item = {
            id: n.id || nid || String(Date.now()),
            notificationId: nid,
            title: n.title || n.type || 'Notification',
            message: n.message || n.body || n.content || '',
            createdAt: n.createdAt || n.created_at || new Date().toISOString(),
            read: false,
            type: n.type || null,
            eventId: evtId,
          };
          setNotifications(prev => {
            const exists = prev.some(p => (p.id && p.id === item.id) || (p.notificationId && item.notificationId && p.notificationId === item.notificationId));
            if (exists) return prev;
            return [item, ...prev];
          });
          setUnreadCount(c => c + 1);
        };
        socket.on('notification:new', onNew);
        socket.on('notifications:new', onNew);
        socket.on('notification', onNew);
        socket.on('notification:update', () => fetchNotifications());
      } catch (e) {
        console.warn('[Header] socket setup error', e?.message || e);
      }
    };
    setup();
    return () => {
      mounted = false;
      try { if (socket) { socket.removeAllListeners(); socket.disconnect(); } } catch {}
    };
  }, [ensureTokens]);

  return (
    <View style={styles.wrapper}>
      {/* Top header row */}
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <FontAwesome5 name="bars" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>

        <View style={styles.iconContainer}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/messages")}>
            <Ionicons name="chatbox-ellipses-outline" size={24} color="black" />
          </TouchableOpacity>

          {/* Notification Icon */}
          <View style={{ position: "relative" }}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => setNotifVisible(!notifVisible)}
            >
              <Ionicons name="notifications-outline" size={24} color="black" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
                </View>
              )}
            </TouchableOpacity>

            {notifVisible && (
              <View style={styles.notifDropdown}>
                <View style={styles.notifHeaderRow}>
                  <Text style={styles.notifHeaderTitle}>Notifications</Text>
                  {unreadCount > 0 && (
                    <View style={styles.notifChip}><Text style={styles.notifChipText}>{unreadCount}</Text></View>
                  )}
                  {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllRead} style={styles.notifMarkBtn}>
                      <Text style={styles.notifMarkBtnText}>Mark all read</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView>
                  {notifications.length === 0 ? (
                    <Text style={styles.notifItem}>No notifications</Text>
                  ) : (
                    (showAllNotifications ? notifications : notifications.slice(0, 8)).map((n, idx) => (
                      <View key={n.id}>
                        <View style={[styles.notifCard, !n.read && styles.notifCardUnread]}>
                          <TouchableOpacity 
                            style={styles.notifCardClickable}
                            onPress={() => openNotification(n)}
                          >
                            <View style={styles.notifAvatar}>
                              <Ionicons name="notifications" size={20} color="#A68C7B" />
                            </View>
                            <View style={styles.notifContent}>
                              <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]}>
                                {n.title}
                              </Text>
                              <Text style={styles.notifMessage} numberOfLines={2}>
                                {n.message}
                              </Text>
                              <Text style={styles.notifTime}>
                                {n.createdAt ? timeAgo(n.createdAt) : ''}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.notifDismissBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              dismissNotification(n);
                            }}
                          >
                            <Ionicons name="close" size={18} color="#999" />
                          </TouchableOpacity>
                        </View>
                        {idx < (showAllNotifications ? notifications : notifications.slice(0, 8)).length - 1 && <View style={styles.notifSeparator} />}
                      </View>
                    ))
                  )}
                  {notifications.length > 8 && (
                    <TouchableOpacity 
                      style={styles.loadMoreBtn}
                      onPress={() => setShowAllNotifications(!showAllNotifications)}
                    >
                      <Text style={styles.loadMoreText}>
                        {showAllNotifications ? 'Show Less' : `Load More (${notifications.length - 8} more)`}
                      </Text>
                      <Ionicons name={showAllNotifications ? 'chevron-up' : 'chevron-down'} size={16} color="#A68C7B" />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.profileButton} onPress={() => router.push("/profile")}>
            {avatarUrl || coverUrl ? (
              <Image source={{ uri: avatarUrl || coverUrl }} style={styles.profilePic} />
            ) : (
              <View style={[styles.profilePic, { backgroundColor: '#e9e9e9', borderWidth: 1, borderColor: '#ddd' }]} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider line */}
      <View style={styles.divider} />

      {/* Search bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="gray" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search posts and events..."
            style={styles.searchInput}
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              if (onSearch) onSearch(text);
            }}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchText('');
              if (onSearch) onSearch('');
            }}>
              <Ionicons name="close-circle" size={20} color="gray" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { 
    backgroundColor: "#fff" 
  },
  header: {
    paddingTop: 30,
    paddingHorizontal: 15,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftHeader: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginLeft: 15 
  },
  iconContainer: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  iconButton: { 
    marginLeft: 15 
  },
  profileButton: { 
    marginLeft: 15 
  },
  profilePic: { 
    width: 30, 
    height: 30, 
    borderRadius: 15 
  },
  divider: { 
    height: 1, 
    backgroundColor: "#e0e0e0" 
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    zIndex: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginHorizontal: 15,
    marginVertical: 8,
  },
  searchInput: { 
    flex: 1, 
    height: 35 
  },
  notifDropdown: {
    position: "absolute",
    top: 35,
    right: -20,
    width: 320,
    maxHeight: 400,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  notifHeaderTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginRight: 8 
  },
  notifChip: {
    backgroundColor: '#A68C7B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  notifChipText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  notifMarkBtn: { 
    marginLeft: 'auto' 
  },
  notifMarkBtnText: { 
    color: '#A68C7B', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  notifItem: {
    marginBottom: 10,
    fontSize: 14,
    color: "#333",
  },
  notifItemUnread: {
    fontWeight: '600',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    position: 'relative',
  },
  notifCardClickable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 30,
  },
  notifCardUnread: {
    backgroundColor: '#F5F3F0',
  },
  notifAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
    marginRight: 8,
  },
  notifTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  notifTitleUnread: {
    fontWeight: '700',
  },
  notifMessage: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  notifDismissBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 4,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#A68C7B',
    fontWeight: '600',
  },
  notifSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#000',
    marginVertical: 6,
  },
  bold: { fontWeight: "bold" },
});

export default Header;