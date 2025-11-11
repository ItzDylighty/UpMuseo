import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Image, TouchableOpacity, Platform, BackHandler, KeyboardAvoidingView, RefreshControl, } from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from "../../supabase/supabaseClient";
import io from 'socket.io-client';

const API_BASE = "http://192.168.254.114:3000/api";
const API_ORIGIN = API_BASE.replace(/\/api$/, "");
const INPUT_BAR_BASE_HEIGHT = 56; // approximate input bar height

const ViewMessageScreen = () => {
  const { conversationId, name: initialName, userId: initialUserId } = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [partnerName, setPartnerName] = useState(initialName || '');
  const [partnerAvatar, setPartnerAvatar] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [hasMarkedRead, setHasMarkedRead] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const formatTitle = (name) => {
    if (!name) return 'Message';
    const tokens = String(name).trim().split(/\s+/);
    if (tokens.length <= 2) return name;
    return `${tokens.slice(0, 2).join(' ')}...`;
  };

  // Ensure Android hardware back goes to messages list
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.replace('/(drawer)/messages');
        return true; // consume the event
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [router])
  );

  const renderItem = useCallback(({ item }) => {
    const isMe = item.sender === 'me';
    const avatarUri = !isMe ? partnerAvatar : null;
    const avatarSource = typeof avatarUri === 'string' ? { uri: avatarUri } : avatarUri;
    const timeLabel = item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.rightAlign : styles.leftAlign,
        ]}
      >
        {!isMe && !!avatarSource && <Image source={avatarSource} style={styles.avatar} />}
        <View
          style={[
            styles.bubble,
            isMe ? styles.myBubble : styles.otherBubble,
          ]}
        >
          <Text style={isMe ? styles.myMessageText : styles.messageText}>
            {item.text}
          </Text>
          {!!timeLabel && (
            <Text style={isMe ? styles.myTimestamp : styles.timestamp}>{timeLabel}</Text>
          )}
        </View>
      </View>
    );
  }, [partnerAvatar]);

  const resolveUrl = (u) => (!u ? null : (String(u).startsWith('http') ? String(u) : `${API_ORIGIN}${u}`));

  const loadSession = async () => {
    const { data } = await supabase.auth.getSession();
    const at = data?.session?.access_token || null;
    const rt = data?.session?.refresh_token || null;
    const uid = data?.session?.user?.id || null;
    setAccessToken(at);
    setRefreshToken(rt);
    setMeId(uid);
    return { at, rt, uid };
  };

  const fetchConversationMeta = async (at, rt) => {
    try {
      const res = await fetch(`${API_BASE}/message/getConversation`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Cookie': `access_token=${at || ''}; refresh_token=${rt || ''}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const list = Array.isArray(json?.conversations) ? json.conversations : [];
      const found = list.find(c => String(c.conversationId) === String(conversationId));
      if (found) {
        const other = found.otherUser || {};
        const nameParts = [other.firstName, other.middleName, other.lastName].filter(Boolean);
        const displayName = (nameParts.join(' ') || other.username || 'User').trim();
        setPartnerId(other.id || null);
        setPartnerName(displayName);
        setPartnerAvatar(resolveUrl(other.profilePicture));
      }
    } catch {}
  };

  const fetchMessages = async (at, rt, uid) => {
    // Skip fetching for new conversations (no conversationId yet)
    if (!conversationId || conversationId === 'new') {
      setMessages([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/message/getConversation/${encodeURIComponent(conversationId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Cookie': `access_token=${at || ''}; refresh_token=${rt || ''}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const rows = Array.isArray(json?.messages) ? json.messages : [];
      const effectiveUid = uid || meId;
      const mapped = rows
        .map((m) => {
          const isMe = m.senderId === effectiveUid;
          return {
            id: m.id || m.messageId || String(m.created_at || Math.random()),
            text: m.content || '',
            sender: isMe ? 'me' : 'other',
            avatar: null,
            createdAt: m.created_at || null,
            createdAtTime: m.created_at ? new Date(m.created_at).getTime() : 0,
          };
        })
        .sort((a, b) => b.createdAtTime - a.createdAtTime); // Sort newest to oldest for inverted list
      setMessages(mapped);
    } catch (e) {
      setMessages([]);
    }
  };

  const markRead = async (at, rt, force = false) => {
    // Skip for new conversations
    if (!conversationId || conversationId === 'new') return;
    // Prevent duplicate mark read calls unless forced
    if (hasMarkedRead && !force) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/message/markRead/${encodeURIComponent(conversationId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': `access_token=${at || ''}; refresh_token=${rt || ''}` },
      });
      if (res.ok) {
        setHasMarkedRead(true);
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      const { at, rt, uid } = await loadSession();
      await Promise.all([
        fetchConversationMeta(at, rt),
        fetchMessages(at, rt, uid),
      ]);
      // Mark as read immediately after loading messages
      await markRead(at, rt, true);
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const { at, rt, uid } = await loadSession();
      await Promise.all([
        fetchConversationMeta(at, rt),
        fetchMessages(at, rt, uid),
      ]);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Clear previous conversation immediately to avoid showing old messages
    setMessages([]);
    setHasMarkedRead(false); // Reset mark read flag for new conversation
    
    // For new conversations, set partnerId from URL params
    if (conversationId === 'new' && initialUserId) {
      setPartnerId(initialUserId);
    } else {
      setPartnerId(null);
    }
    setPartnerName(initialName || '');
    setPartnerAvatar(null);
    refreshAll();
    
    // Cleanup: Mark as read when leaving the conversation
    return () => {
      if (conversationId && conversationId !== 'new') {
        loadSession().then(({ at, rt }) => {
          if (at && rt) markRead(at, rt, true);
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, initialUserId]);

  // Mark as read when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (conversationId && conversationId !== 'new') {
        loadSession().then(({ at, rt }) => {
          if (at && rt) markRead(at, rt, true);
        }).catch(() => {});
      }
    }, [conversationId])
  );

  // Realtime via Socket.IO: join user room and listen for new messages
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
        // When a new message arrives
        socket.on('message:new', (payload) => {
          try {
            if (!mounted) return;
            if (!payload) return;
            const cid = String(payload.conversationId || '');
            if (String(conversationId) !== cid) return;
            const m = payload.message || payload;
            const isMe = m.senderId === (meId || uid);
            const newMsg = {
              id: m.id || String(Date.now()),
              text: m.content || '',
              sender: isMe ? 'me' : 'other',
              avatar: null,
              createdAt: m.createdAt || m.created_at || new Date().toISOString(),
              createdAtTime: new Date(m.createdAt || m.created_at || Date.now()).getTime(),
            };
            setMessages(prev => [newMsg, ...prev]); // Prepend to start (newest first for inverted list)
          } catch {}
        });
        // If a remote update indicates we should refetch
        socket.on('conversation:updated', (payload) => {
          try {
            if (!mounted) return;
            const cid = String(payload?.conversationId || '');
            if (String(conversationId) !== cid) return;
            // Soft refresh to ensure ordering/read status
            (async () => {
              const { at, rt, uid: u } = await loadSession();
              await fetchMessages(at, rt, u);
            })();
          } catch {}
        });
      } catch {}
    };
    setup();
    return () => {
      mounted = false;
      try { if (socket) { socket.removeAllListeners(); socket.disconnect(); } } catch {}
    };
  }, [API_ORIGIN, conversationId, meId]);

  // Inverted FlatList automatically shows latest at bottom

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setInputHeight(40);
    const now = new Date().toISOString();
    const optimistic = { 
      id: `tmp-${Date.now()}`, 
      text, 
      sender: 'me', 
      createdAt: now,
      createdAtTime: new Date(now).getTime(),
    };
    setMessages(prev => [optimistic, ...prev]); // Prepend to start (newest first for inverted list)

    try {
      const { at, rt } = await loadSession();
      // Need partnerId for sending; if missing, try ensure meta
      let rid = partnerId;
      if (!rid) {
        await fetchConversationMeta(at, rt);
        rid = partnerId;
      }
      if (!rid) return;
      const res = await fetch(`${API_BASE}/message/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${at || ''}; refresh_token=${rt || ''}`,
        },
        body: JSON.stringify({ receiverId: rid, content: text }),
      });
      if (!res.ok) return;
      
      const result = await res.json();
      const newConvId = result?.conversationId;
      
      // If this was a new conversation, navigate to the real conversationId
      if (conversationId === 'new' && newConvId) {
        router.replace({
          pathname: '/(drawer)/viewMessage',
          params: {
            conversationId: String(newConvId),
            name: partnerName,
          },
        });
      } else {
        // Refresh messages to replace optimistic
        await fetchMessages(at, rt);
      }
    } catch {}
  };

  const InputBar = (
    <View style={styles.inputContainerWrapper}>
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.mediaButton}>
          <Ionicons name="images-outline" size={20} color="#888" />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { height: Math.max(40, inputHeight) }]}
          placeholder="Write a message..."
          placeholderTextColor="#888"
          value={inputText}
          onChangeText={setInputText}
          multiline
          onContentSizeChange={(e) =>
            setInputHeight(e.nativeEvent.contentSize.height)
          }
        />

        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header Container */}
      <View style={styles.profileHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={async () => {
            // Ensure messages are marked as read before going back
            if (conversationId && conversationId !== 'new' && !hasMarkedRead) {
              const { at, rt } = await loadSession();
              await markRead(at, rt, true);
            }
            router.push('/(drawer)/messages');
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        {partnerAvatar ? (
          <Image source={{ uri: partnerAvatar }} style={styles.profileHeaderAvatar} />
        ) : (
          <View style={[styles.profileHeaderAvatar, styles.profileHeaderAvatarPlaceholder]} />
        )}
        <Text style={styles.profileHeaderName}>{partnerName || 'User'}</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          key={String(conversationId)}
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          inverted
          contentContainerStyle={[styles.chatContainer, { paddingTop: 8 }]}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator
          scrollEnabled={true}
          nestedScrollEnabled={true}
          decelerationRate="normal"
          scrollEventThrottle={8}
          bounces={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#A68C7B']}
              tintColor="#A68C7B"
            />
          }
        />
        {InputBar}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  chatContainer: { 
    padding: 10 
  },
  messageRow: { 
    flexDirection: 'row', 
    marginBottom: 8, 
    alignItems: 'flex-end' 
  },
  leftAlign: { 
    justifyContent: 'flex-start' 
  },
  rightAlign: { 
    justifyContent: 'flex-end' 
  },
  avatar: { 
    width: 35, 
    height: 35, 
    borderRadius: 17.5, 
    marginRight: 8 
  },
  bubble: {
    maxWidth: '75%',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  otherBubble: { 
    backgroundColor: '#f5f5f5' 
  },
  myBubble: { 
    backgroundColor: '#E8DECC' 
  },
  messageText: { 
    fontSize: 15, 
    color: '#000' 
  },
  myMessageText: { 
    color: '#000' 
  },
  timestamp: { 
    fontSize: 10, 
    color: '#888', 
    marginTop: 4, 
    alignSelf: 'flex-start' 
  },
  myTimestamp: { 
    fontSize: 10, 
    color: '#A68C7B', 
    marginTop: 4, 
    alignSelf: 'flex-end' 
  },
  inputContainerWrapper: { 
    backgroundColor: '#fff' 
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 15,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 6,
    maxHeight: 100,
    textAlignVertical: 'center',
  },
  sendButton: {
    backgroundColor: '#A68C7B',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaButton: { padding: 5 },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
  },
  profileHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  profileHeaderAvatarPlaceholder: {
    backgroundColor: '#e9e9e9',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  profileHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default ViewMessageScreen;