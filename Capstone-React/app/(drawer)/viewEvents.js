import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Image, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert, BackHandler, Share, RefreshControl, } from 'react-native';
import Header from '../components/Header'; // Import the reusable Header
import { supabase } from "../../supabase/supabaseClient";
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import useCustomFonts from '../hooks/useFonts';
import { Typography, Colors } from '../config/fonts';

const API_BASE = "http://192.168.254.114:3000/api";

const ViewEventsScreen = () => {
  // Load custom fonts
  const fontsLoaded = useCustomFonts();
  
  // Get user data from UserContext
  const { userData } = useUser();
  const role = userData?.role || null;
  
  const [zoomImage, setZoomImage] = useState(null); // State for full-screen image
  const { eventId } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [joined, setJoined] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Ensure Android hardware back goes to Events screen
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.replace('/(drawer)/events');
        return true; // consume the event
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      // Ensure when this screen is focused, it starts at the top
      // Delay slightly to allow layout/content to settle
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 0);
      return () => sub.remove();
    }, [router])
  );

  const fetchEvent = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || null;
      const rt = data?.session?.refresh_token || null;
      if (!at || !rt) {
        Alert.alert('Authentication required', 'Please login to view event details.');
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/event/getEvents`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cookie': `access_token=${at}; refresh_token=${rt}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.error || `Failed to load event (${res.status})`;
        throw new Error(msg);
      }
      const list = Array.isArray(json) ? json : (json?.data || json?.events || []);
      const found = list.find(e => String(e.eventId || e.id) === String(eventId));
      setEvent(found || null);
    } catch (e) {
      console.warn('[viewEvents] fetch error:', e?.message || e);
      Alert.alert('Error', e?.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchEvent();
      // Also refresh joined status and attendee count
      if (eventId) {
        const { data } = await supabase.auth.getSession();
        const at = data?.session?.access_token || null;
        const rt = data?.session?.refresh_token || null;
        if (at && rt) {
          const q = `${API_BASE}/event/isJoined?eventId=${encodeURIComponent(String(eventId))}`;
          const res = await fetch(q, { method: 'GET', headers: { 'Cookie': `access_token=${at}; refresh_token=${rt}` } });
          if (res.ok) {
            const j = await res.json();
            setJoined(!!j.joined);
          }
          const res2 = await fetch(`${API_BASE}/event/eventParticipants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': `access_token=${at}; refresh_token=${rt}` },
            body: JSON.stringify({ eventId })
          });
          if (res2.ok) {
            const j2 = await res2.json();
            setAttendeeCount(Array.isArray(j2.participants) ? j2.participants.length : 0);
          }
        }
      }
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let abort = false;
    const run = async () => {
      try {
        if (!eventId) return;
        const { data } = await supabase.auth.getSession();
        const at = data?.session?.access_token || null;
        const rt = data?.session?.refresh_token || null;
        if (!at || !rt) return;
        const q = `${API_BASE}/event/isJoined?eventId=${encodeURIComponent(String(eventId))}`;
        const res = await fetch(q, { method: 'GET', headers: { 'Cookie': `access_token=${at}; refresh_token=${rt}` } });
        if (!res.ok) return;
        const j = await res.json();
        if (!abort) setJoined(!!j.joined);
      } catch {}
    };
    run();
    return () => { abort = true; };
  }, [eventId]);

  // Fetch attendee count
  useEffect(() => {
    let abort = false;
    const run = async () => {
      try {
        if (!eventId) return;
        const { data } = await supabase.auth.getSession();
        const at = data?.session?.access_token || null;
        const rt = data?.session?.refresh_token || null;
        if (!at || !rt) return;
        const res = await fetch(`${API_BASE}/event/eventParticipants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cookie': `access_token=${at}; refresh_token=${rt}` },
          body: JSON.stringify({ eventId })
        });
        if (!res.ok) return;
        const j = await res.json();
        if (!abort) setAttendeeCount(Array.isArray(j.participants) ? j.participants.length : 0);
      } catch {}
    };
    run();
    return () => { abort = true; };
  }, [eventId, joined]);


  useEffect(() => {
    let abort = false;
    const run = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const at = data?.session?.access_token || null;
        const rt = data?.session?.refresh_token || null;
        if (!at || !rt) return;
        const res = await fetch(`${API_BASE}/users/role`, { method: 'GET', headers: { 'Cookie': `access_token=${at}; refresh_token=${rt}` } });
        if (!res.ok) return;
        const j = await res.json();
        if (!abort) setRole(j);
      } catch {}
    };
    run();
    return () => { abort = true; };
  }, []);

  useEffect(() => {
    let abort = false;
    const run = async () => {
      try {
        if (!participantsOpen) return;
        const { data } = await supabase.auth.getSession();
        const at = data?.session?.access_token || null;
        const rt = data?.session?.refresh_token || null;
        if (!at || !rt) return;
        setPLoading(true);
        setPError(null);
        const res = await fetch(`${API_BASE}/event/eventParticipants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cookie': `access_token=${at}; refresh_token=${rt}` },
          body: JSON.stringify({ eventId: event?.eventId || event?.id || eventId })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to fetch participants (${res.status})`);
        }
        const data2 = await res.json();
        if (!abort) setParticipants(Array.isArray(data2.participants) ? data2.participants : []);
      } catch (e) {
        if (!abort) setPError(e?.message || 'Failed to load participants');
      } finally {
        if (!abort) setPLoading(false);
      }
    };
    run();
    return () => { abort = true; };
  }, [participantsOpen, event?.eventId, event?.id, eventId]);

  const removeParticipantReq = async (userId) => {
    try {
      setRemovingId(userId);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || null;
      const rt = data?.session?.refresh_token || null;
      if (!at || !rt) return;
      const res = await fetch(`${API_BASE}/event/removeParticipant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': `access_token=${at}; refresh_token=${rt}` },
        body: JSON.stringify({ eventId: event?.eventId || event?.id || eventId, userId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to remove participant');
      }
      setParticipants(prev => prev.filter(p => (p.userId || p.id) !== userId));
    } catch (e) {
      setPError(e?.message || 'Failed to remove participant');
    } finally {
      setRemovingId(null);
    }
  };

  const pad = (n) => String(n).padStart(2, '0');
  const toICSDate = (dt) => {
    const d = new Date(dt);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };
  const esc = (s) => String(s || '').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
  const buildICS = (e) => [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Museo//Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@museo.app`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(e.startsAt || e.start)}`,
    `DTEND:${toICSDate(e.endsAt || e.end || e.startsAt || e.start)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(`${e.venueName || ''} ${e.venueAddress || ''}`.trim())}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const addToCalendar = async () => {
    try {
      if (!event) return;
      if (isEventPast) return; // do not allow adding ended events
      const ics = buildICS(event);
      await Share.share({ message: ics, title: `${event.title || 'event'}.ics` });
    } catch (e) {}
  };

  const joinEvent = async () => {
    try {
      setIsSubmitting(true);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || null;
      const rt = data?.session?.refresh_token || null;
      if (!at || !rt) return;
      const res = await fetch(`${API_BASE}/event/joinEvent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': `access_token=${at}; refresh_token=${rt}` },
        body: JSON.stringify({ eventId: event?.eventId || event?.id || eventId })
      });
      if (!res.ok) throw new Error('Failed to join event');
      const j = await res.json();
      if (j.removed) setJoined(false);
      if (j.joined) setJoined(true);
    } catch (err) {
    } finally {
      setIsSubmitting(false);
    }
  };


  const fmt = (dt) => new Date(dt).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

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

  const eventStatus = getEventStatus();
  const isEventPast = eventStatus === 'ended';

  // Show loading while fonts are loading
  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Events" showSearch={false} />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <ScrollView 
          ref={scrollRef} 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#000']} // Android
              tintColor="#000" // iOS
            />
          }
        >
          {/* Event Banner */}
          <TouchableOpacity
            style={{ ...styles.bannerContainer, marginTop: 5 }}
            onPress={() => event?.image && setZoomImage({ uri: event.image })}
          >
            {event?.image ? (
              <Image source={{ uri: event.image }} style={styles.bannerImage} />
            ) : (
              <View style={[styles.bannerImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f2f2' }]}>
                <Ionicons name="image-outline" size={64} color="#9e9e9e" />
              </View>
            )}
            {(event?.startsAt || event?.start || event?.venueName || eventStatus) ? (
              <View style={styles.bannerBadges}>
                {eventStatus === 'ended' ? (
                  <View style={[styles.badge, styles.endedBadge]}><Text style={[styles.badgeText, styles.endedBadgeText]}>Ended</Text></View>
                ) : eventStatus === 'live' ? (
                  <View style={[styles.badge, styles.liveBadge]}><Text style={[styles.badgeText, styles.liveBadgeText]}>Live</Text></View>
                ) : (
                  <View style={[styles.badge, styles.upcomingBadge]}><Text style={[styles.badgeText, styles.upcomingBadgeText]}>Upcoming</Text></View>
                )}
                {!!(event?.startsAt || event?.start) && (
                  <View style={styles.badge}><Text style={styles.badgeText}><Ionicons name="calendar-outline" size={12} color="#333" /> {fmt(event.startsAt || event.start)}</Text></View>
                )}
                {!!event?.venueName && (
                  <View style={styles.badge}><Text style={styles.badgeText}><Ionicons name="location-outline" size={12} color="#333" /> {event.venueName}</Text></View>
                )}
              </View>
            ) : null}
          </TouchableOpacity>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={20} color="#A68C7B" />
              <Text style={styles.statText}>{attendeeCount} {attendeeCount === 1 ? 'Attendee' : 'Attendees'}</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {(role === 'admin' || role?.role === 'admin') && (
              <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setParticipantsOpen(true)}>
                <Text style={styles.secondaryButtonText}>View Participants</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.joinButton, (isSubmitting || isEventPast) && styles.disabledBtn]}
              onPress={() => { if (!isEventPast) joinEvent(); }}
              disabled={isSubmitting || isEventPast}
            >
              <Text style={styles.joinButtonText}>{isEventPast ? 'Event Ended' : (isSubmitting ? (joined ? 'Cancelling…' : 'Joining…') : (joined ? 'Cancel' : 'Join Event'))}</Text>
            </TouchableOpacity>
            {!isEventPast && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={addToCalendar}
              >
                <Text style={styles.secondaryButtonText}>Add to Calendar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Description Section */}
          <View style={styles.textSection}>
            {!!event?.details && (
              <Text style={styles.description}>{event.details}</Text>
            )}
          </View>

          {/* Activities Section */}
          <View style={styles.activitiesSection}>
            <Text style={styles.activitiesTitle}>
              <Ionicons name="color-palette-outline" size={20} color="#333" />{' '}Activities Include:
            </Text>
            {(Array.isArray(event?.activities) ? event.activities : [])
              .map((act, idx) => (
                <Text style={styles.activityItem} key={idx}>• {act}</Text>
              ))}
          </View>

          {/* Admission */}
          {(event?.admission || event?.admissionNote) && (
            <View style={styles.textSection}>
              <Text style={styles.activitiesTitle}>
                <Ionicons name="pricetag-outline" size={20} color="#333" />{' '}Admission
              </Text>
              {!!event?.admission && (
                <Text style={styles.description}>{event.admission}</Text>
              )}
              {!!event?.admissionNote && (
                <Text style={styles.description}>{event.admissionNote}</Text>
              )}
            </View>
          )}

          {/* Venue */}
          {(event?.venueName || event?.venueAddress) && (
            <View style={styles.textSection}>
              <Text style={styles.activitiesTitle}>
                <Ionicons name="location-outline" size={20} color="#333" />{' '}Venue
              </Text>
              {!!event?.venueName && (
                <Text style={styles.description}>{event.venueName}</Text>
              )}
              {!!event?.venueAddress && (
                <Text style={styles.description}>{event.venueAddress}</Text>
              )}
            </View>
          )}

          {/* Date & Time */}
          {(event?.startsAt || event?.endsAt || event?.start || event?.end) && (
            <View style={styles.textSection}>
              <Text style={styles.activitiesTitle}>
                <Ionicons name="calendar-outline" size={20} color="#333" />{' '}Date & Time
              </Text>
              {!!(event?.startsAt || event?.start) && (
                <Text style={styles.description}>Start: {new Date(event.startsAt || event.start).toLocaleString()}</Text>
              )}
              {!!(event?.endsAt || event?.end) && (
                <Text style={styles.description}>End: {new Date(event.endsAt || event.end).toLocaleString()}</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Full-screen image modal */}
      <Modal
        visible={zoomImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setZoomImage(null)}
      >
        <TouchableOpacity style={styles.fullScreenContainer} onPress={() => setZoomImage(null)}>
          <Image source={zoomImage} style={styles.fullScreenImage} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!participantsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setParticipantsOpen(false)}
      >
        <View style={styles.participantsOverlay}>
          <View style={styles.participantsCard}>
            <View style={styles.participantsHeader}>
              <Text style={styles.participantsTitle}>Participants ({participants.length})</Text>
              <TouchableOpacity onPress={() => setParticipantsOpen(false)} style={styles.participantsClose}>
                <Text style={styles.participantsCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.participantsBody}>
              {pLoading ? (
                <Text style={styles.participantsMuted}>Loading…</Text>
              ) : pError ? (
                <Text style={styles.participantsMuted}>{pError}</Text>
              ) : participants.length === 0 ? (
                <Text style={styles.participantsMuted}>No participants yet.</Text>
              ) : (
                participants.map((u, i) => {
                  const fullName = [u.firstName, u.lastName, u.middleName].filter(Boolean).join(' ').trim();
                  const username = u.username ? `@${u.username}` : '';
                  const avatar = u.profilePicture;
                  return (
                    <View key={u.userId || u.id || i} style={styles.participantRow}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.participantAvatar} />
                      ) : (
                        <View style={[styles.participantAvatar, { backgroundColor: '#e9e9e9' }]} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.participantName} numberOfLines={1}>{fullName || username || 'Unknown'}</Text>
                        {!!(username && fullName) && (
                          <Text style={styles.participantsMuted}>{username}</Text>
                        )}
                      </View>
                      {(role === 'admin' || role?.role === 'admin') && (
                        <TouchableOpacity
                          style={styles.removeBtn}
                          disabled={removingId === (u.userId || u.id)}
                          onPress={() => {
                            Alert.alert('Remove participant', `Remove ${fullName || username || 'this user'}?`, [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Remove', style: 'destructive', onPress: () => removeParticipantReq(u.userId || u.id) },
                            ]);
                          }}
                        >
                          <Text style={styles.removeBtnText}>{removingId === (u.userId || u.id) ? 'Removing…' : '✕'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerBadges: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#d4b48a',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeText: {
    ...Typography.badge,
    color: Colors.textPrimary,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    ...Typography.button,
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#A68C7B',
  },
  secondaryButtonText: {
    ...Typography.button,
    color: Colors.accent,
  },
  joinButton: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  joinButtonText: {
    ...Typography.button,
    color: '#fff',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    ...Typography.label,
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
  textSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  description: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
    marginBottom: 15,
  },
  activitiesSection: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 50,
  },
  activitiesTitle: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  activityItem: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  // Full-screen image modal
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  participantsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  participantsCard: {
    width: '100%',
    maxWidth: 760,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantsTitle: {
    ...Typography.heading2,
    color: Colors.textPrimary,
  },
  participantsClose: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  participantsCloseText: {
    ...Typography.label,
    color: Colors.textPrimary,
  },
  participantsBody: {
    maxHeight: 520,
  },
  participantsMuted: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  participantName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.textPrimary,
    maxWidth: '70%',
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  removeBtnText: {
    ...Typography.label,
    color: Colors.textPrimary,
  },
});

export default ViewEventsScreen;