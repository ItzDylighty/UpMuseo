import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Alert, BackHandler, RefreshControl, SafeAreaView, FlatList, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import Header from "../components/Header";
import Icon from "react-native-vector-icons/FontAwesome";
import { Ionicons } from '@expo/vector-icons';
import { supabase } from "../../supabase/supabaseClient";
import { useUser } from "../contexts/UserContext";

const API_BASE = "http://192.168.254.114:3000/api";
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

export default function ProfileScreen() {
  // Get user data from UserContext
  const { userData } = useUser();
  const role = userData?.role || null;
  const currentUserId = userData?.id || null;
  
  const router = useRouter();
  // Params when navigated from artists.js
  const { id: paramId, username: paramUsername, name: paramName } = useLocalSearchParams();
  const viewedId = paramId ? String(paramId) : (paramUsername ? String(paramUsername) : null);
  const isViewingOther = !!viewedId;
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userNameField, setUserNameField] = useState("");
  const [username, setUsername] = useState("");
  const [sex, setSex] = useState("");
  const [birthday, setBirthday] = useState(new Date());
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [about, setAbout] = useState("");
  const [image, setImage] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [selectedArt, setSelectedArt] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);

  // Artwork upload modal state
  const [artModalVisible, setArtModalVisible] = useState(false);
  const [artImage, setArtImage] = useState(null); // { uri }
  const [artTitle, setArtTitle] = useState("");
  const [artDescription, setArtDescription] = useState("");
  const [artMedium, setArtMedium] = useState("");
  const [artUploading, setArtUploading] = useState(false);

  // Artwork interactions (likes/comments)
  const [artComments, setArtComments] = useState([]);
  const [artLikesCount, setArtLikesCount] = useState(0);
  const [artUserLiked, setArtUserLiked] = useState(false);
  const [artNewComment, setArtNewComment] = useState("");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // currentUserId now comes from UserContext (removed duplicate state)
  const [viewedUserId, setViewedUserId] = useState(null);

  // Edit artwork modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingArt, setEditingArt] = useState(null);
  const [editArtImage, setEditArtImage] = useState(null);
  const [editArtTitle, setEditArtTitle] = useState("");
  const [editArtDescription, setEditArtDescription] = useState("");
  const [editArtMedium, setEditArtMedium] = useState("");
  const [editArtUploading, setEditArtUploading] = useState(false);

  // Comments modal state
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [commentingArt, setCommentingArt] = useState(null); // Store which art we're commenting on
  const [artMenuVisible, setArtMenuVisible] = useState(false); // For artwork edit/delete menu
  const [visibleArtworkCount, setVisibleArtworkCount] = useState(6); // Number of visible artworks
  
  // Comment menu state
  const [commentMenuForId, setCommentMenuForId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [skipCommentFetch, setSkipCommentFetch] = useState(false);
  const [totalCommentCount, setTotalCommentCount] = useState(0);
  
  // Open comments modal - close artwork modal first
  const openCommentsModal = async () => {
    setCommentingArt(selectedArt); // Save the artwork
    setSkipCommentFetch(true); // Don't refetch when reopening artwork modal
    setSelectedArt(null); // Close artwork modal
    setCommentsModalVisible(true); // Open comments modal
    if (selectedArt?.id) {
      await fetchArtComments(selectedArt.id);
    }
  };
  
  // Close comments modal and go back to artwork
  const closeCommentsModal = () => {
    setCommentsModalVisible(false);
    setSelectedArt(commentingArt); // Reopen artwork modal
    setCommentingArt(null);
  };

  // Android hardware back: always go back to artists.js
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/(drawer)/artists');
      return true;
    });
    return () => sub.remove();
  }, [router]);

  // View-only fetch helpers (by artist id)
  const fetchViewedProfile = async (at, rt) => {
    try {
      if (!viewedId) {
        return;
      }
      const endpoint = `${API_BASE}/artist/getArtistById/${encodeURIComponent(viewedId)}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Cookie: `access_token=${at || ''}; refresh_token=${rt || ''}` },
      });
      if (!res.ok) {
        return;
      }
      const responseData = await res.json();
      const { profile } = responseData;
      const resolveUrl = (u) => (!u ? null : (u.startsWith('http') ? u : `${API_ORIGIN}${u}`));
      const avatarUrl = resolveUrl(profile?.profilePicture);
      const coverUrl = resolveUrl(profile?.coverPicture);
      setFirstName(profile?.firstName || "");
      setMiddleName(profile?.middleName || "");
      setLastName(profile?.lastName || "");
      setUsername(profile?.username || paramName || "");
      setSex(profile?.sex || profile?.gender || "");
      setAddress(profile?.address || "");
      setBio(profile?.bio || "");
      setAbout(profile?.about || "");
      const bday = profile?.birthday || profile?.birthdate;
      if (bday) setBirthday(new Date(bday));
      setImage(avatarUrl ? { uri: avatarUrl } : null);
      setBackgroundImage(coverUrl ? { uri: coverUrl } : null);
      // Store viewed user's ID for comparison - try multiple field names
      const vUserId = profile?.userId || profile?.user_id || profile?.id || profile?.artistId || null;
      setViewedUserId(vUserId);
    } catch (err) {
      console.error('[viewArtist] fetchViewedProfile error:', err);
    }
  };

  const fetchViewedGallery = async (at, rt) => {
    try {
      if (!viewedId) {
        setGalleryImages([]);
        return;
      }
      const res = await fetch(`${API_BASE}/artist/getArts/${encodeURIComponent(viewedId)}`, {
        method: 'GET',
        headers: { Cookie: `access_token=${at || ''}; refresh_token=${rt || ''}` },
      });
      if (!res.ok) {
        setGalleryImages([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.arts || data || []);
      const items = list.map((a) => {
        // Image is stored as JSONB array, extract first URL
        let imageUrl = null;
        if (Array.isArray(a?.image) && a.image.length > 0) {
          imageUrl = a.image[0];
          
          // Handle double-encoded JSON strings (e.g., "[\"url\"]" instead of "url")
          if (typeof imageUrl === 'string' && imageUrl.startsWith('[')) {
            try {
              const parsed = JSON.parse(imageUrl);
              if (Array.isArray(parsed) && parsed.length > 0) {
                imageUrl = parsed[0];
              }
            } catch (e) {
              // Failed to parse double-encoded image
            }
          }
        } else if (typeof a?.image === 'string') {
          imageUrl = a.image;
        }
        
        // Make URL absolute if needed and validate
        let abs = null;
        if (imageUrl) {
          imageUrl = String(imageUrl).trim().replace(/^"+|"+$/g, '');
          
          if (imageUrl.startsWith('http')) {
            abs = imageUrl;
          } else if (imageUrl.startsWith('/')) {
            abs = `${API_ORIGIN}${imageUrl}`;
          } else {
            abs = `${API_ORIGIN}/${imageUrl}`;
          }
        }
        
        return {
          id: a?.artId || a?.id || null,
          image: abs,
          title: a?.title || null,
          description: a?.description || null,
          medium: a?.medium || null,
          timestamp: a?.timestamp || a?.datePosted || null,
        };
      }).filter(x => !!x.image);
      setGalleryImages(items);
    } catch (err) {
      setGalleryImages([]);
    }
  };

  // Function to upload artwork image to the backend and refresh gallery
  const uploadArtwork = async (imageUri, meta = {}) => {
    try {
      let at = accessToken;
      let rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
        if (at) setAccessToken(at);
        if (rt) setRefreshToken(rt);
      }
      const fd = new FormData();
      fd.append("images", { uri: imageUri, name: "artwork.jpg", type: "image/jpeg" });
      if (meta.title != null) fd.append("title", String(meta.title));
      if (meta.description != null) fd.append("description", String(meta.description));
      if (meta.medium != null) fd.append("medium", String(meta.medium));
      const res = await fetch(`${API_BASE}/profile/uploadArt`, {
        method: "POST",
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
        body: fd,
      });
      if (!res.ok) {
        let msg = res.statusText;
        try {
          const bodyText = await res.text();
          try {
            const bodyJson = bodyText ? JSON.parse(bodyText) : null;
            msg = bodyJson?.error || bodyJson?.message || bodyText || msg;
          } catch (_) { msg = bodyText || msg; }
        } catch (_) {}
        throw new Error(`Upload failed (${res.status}): ${msg}`);
      }
      await fetchGallery(at, rt);
    } catch (err) {
      alert("Failed to upload artwork");
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!selectedArt?.id) return;
      setDescriptionExpanded(false); // Reset description state
      
      // Skip comment fetch if returning from comments modal
      if (skipCommentFetch) {
        setSkipCommentFetch(false);
        await fetchArtReacts(selectedArt.id);
      } else {
        await Promise.all([fetchArtReacts(selectedArt.id), fetchArtComments(selectedArt.id)]);
      }
    };
    load();
  }, [selectedArt]);

  const fetchArtReacts = async (artId) => {
    try {
      let at = accessToken, rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
      }
      const res = await fetch(`${API_BASE}/profile/getReact?artId=${artId}`, {
        method: "GET",
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      if (!res.ok) return;
      const bodyText = await res.text();
      let data = null;
      try { data = bodyText ? JSON.parse(bodyText) : null; } catch { data = null; }
      const reactions = data?.reactions || [];
      setArtLikesCount(reactions.length || 0);
      const session = await supabase.auth.getSession();
      const uid = session?.data?.session?.user?.id;
      setArtUserLiked(!!reactions.find(r => r.userId === uid));
    } catch {}
  };

  const fetchArtComments = async (artId, page = 1, append = false) => {
    try {
      if (append) {
        setLoadingMoreComments(true);
      }
      
      let at = accessToken, rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
      }
      const res = await fetch(`${API_BASE}/profile/getComments?artId=${artId}&page=${page}&limit=10`, {
        method: "GET",
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const newComments = json?.comments || [];
      const total = json?.totalCount || json?.total || json?.count;
      
      if (append) {
        setArtComments(prev => [...prev, ...newComments]);
      } else {
        setArtComments(newComments);
        // Set total count only on first load
        if (total !== undefined) {
          setTotalCommentCount(total);
        } else {
          setTotalCommentCount(newComments.length);
        }
      }
      
      setCommentPage(page);
      setHasMoreComments(newComments.length >= 10);
    } catch {}
    finally {
      setLoadingMoreComments(false);
    }
  };
  
  const loadMoreArtComments = () => {
    const artwork = commentingArt || selectedArt;
    if (!loadingMoreComments && hasMoreComments && artwork?.id) {
      fetchArtComments(artwork.id, commentPage + 1, true);
    }
  };
  
  const showLessArtComments = () => {
    const artwork = commentingArt || selectedArt;
    if (artwork?.id) {
      fetchArtComments(artwork.id, 1, false);
    }
  };

  const fetchArtViewCount = async (artId) => {
    try {
      let at = accessToken, rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
      }
      const res = await fetch(`${API_BASE}/gallery/views?galleryArtId=${artId}`, {
        method: "GET",
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      if (!res.ok) {
        const errorText = await res.text();
        setArtViewCount(0);
        return;
      }
      const data = await res.json();
      setArtViewCount(data?.viewCount || 0);
    } catch (err) {
      console.error('[viewArtist] fetchArtViewCount error:', err);
      setArtViewCount(0);
    }
  };

  const handleToggleArtLike = async () => {
    if (!selectedArt?.id) return;
    const prevLiked = artUserLiked;
    const prevCount = artLikesCount;
    setArtUserLiked(!prevLiked);
    setArtLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      let at = accessToken, rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
      }
      const res = await fetch(`${API_BASE}/profile/createReact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
        body: JSON.stringify({ artId: selectedArt.id }),
      });
      if (!res.ok) throw new Error('react failed');
      await fetchArtReacts(selectedArt.id);
    } catch {
      setArtUserLiked(prevLiked);
      setArtLikesCount(prevCount);
    }
  };

  // Render function for comment items
  const renderArtComment = useCallback(({ item }) => (
    <View style={{ flexDirection: 'row', marginBottom: 16, paddingHorizontal: 16 }}>
      {item.user?.avatar ? (
        <Image 
          source={{ uri: item.user?.avatar }} 
          style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} 
        />
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="person" size={24} color="#999" />
        </View>
      )}
      <View style={{ flex: 1, position: 'relative' }}>
        <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 14, marginRight: 8 }} numberOfLines={1}>{item.user?.name}</Text>
            <TouchableOpacity onPress={() => onOpenCommentMenu(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#777" />
            </TouchableOpacity>
          </View>

          {editingCommentId === item.id ? (
            <View>
              <TextInput
                style={{ marginTop: 6, fontSize: 14, color: '#333', backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}
                value={editCommentText}
                onChangeText={setEditCommentText}
                multiline
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <TouchableOpacity onPress={cancelEditComment} style={{ paddingVertical: 6, paddingHorizontal: 10, marginRight: 8 }}>
                  <Text style={{ color: '#777' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => saveEditComment(item)} style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#A68C7B', borderRadius: 6 }}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 14, color: '#333', marginTop: 6 }}>{item.text}</Text>
              {!!item.timestamp && (
                <Text style={{ fontSize: 12, color: '#888', marginTop: 6 }}>{item.timestamp}</Text>
              )}
            </>
          )}
        </View>

        {commentMenuForId === item.id && (
          <View style={{ position: 'absolute', top: 30, right: 6, backgroundColor: '#fff', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5, overflow: 'hidden', width: 160, zIndex: 10 }}>
            {item.user?.id === currentUserId ? (
              <View>
                <TouchableOpacity onPress={() => startEditComment(item)} style={{ paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="create-outline" size={18} color="#555" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#333' }}>Edit</Text>
                </TouchableOpacity>
                <View style={{ height: 1, backgroundColor: '#eee' }} />
                <TouchableOpacity onPress={() => deleteArtComment(item)} style={{ paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="trash-outline" size={18} color="#d9534f" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#d9534f' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => reportArtComment(item)} style={{ paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="flag-outline" size={18} color="#555" style={{ marginRight: 10 }} />
                <Text style={{ color: '#333' }}>Report</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  ), [commentMenuForId, editingCommentId, editCommentText, currentUserId]);

  const postArtComment = async () => {
    // Use commentingArt if in comments modal, otherwise use selectedArt
    const artwork = commentingArt || selectedArt;
    if (!artwork?.id || !artNewComment.trim()) return;
    const text = artNewComment.trim();
    setArtNewComment("");
    try {
      let at = accessToken, rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
      }
      const res = await fetch(`${API_BASE}/profile/createComment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
        body: JSON.stringify({ artId: artwork.id, text }),
      });
      if (!res.ok) throw new Error('comment failed');
      await fetchArtComments(artwork.id);
    } catch {}
  };

  // Comment menu handlers
  const onOpenCommentMenu = (comment) => {
    setCommentMenuForId(prev => (prev === comment.id ? null : comment.id));
    if (editingCommentId && editingCommentId !== comment.id) {
      setEditingCommentId(null);
      setEditCommentText('');
    }
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.text || '');
    setCommentMenuForId(null);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentText('');
    setCommentMenuForId(null);
  };

  const saveEditComment = async (comment) => {
    const newText = (editCommentText || '').trim();
    if (!newText) {
      Alert.alert('Edit Comment', 'Comment cannot be empty.');
      return;
    }
    try {
      let at = accessToken, rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
      }
      const res = await fetch(`${API_BASE}/profile/updateComment/${comment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
        body: JSON.stringify({ text: newText }),
      });
      if (!res.ok) throw new Error('Failed to update comment');
      setArtComments(prev => prev.map(c => (
        c.id === comment.id ? { ...c, text: newText, updatedAt: new Date().toISOString() } : c
      )));
    } catch (err) {
      console.error(err);
      Alert.alert('Edit Comment', 'Unable to update comment.');
    } finally {
      setEditingCommentId(null);
      setEditCommentText('');
      setCommentMenuForId(null);
    }
  };

  const deleteArtComment = async (comment) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            let at = accessToken, rt = refreshToken;
            if (!at || !rt) {
              const { data } = await supabase.auth.getSession();
              at = data?.session?.access_token || at;
              rt = data?.session?.refresh_token || rt;
            }
            const res = await fetch(`${API_BASE}/profile/deleteComment/${comment.id}`, {
              method: 'DELETE',
              headers: {
                Cookie: `access_token=${at}; refresh_token=${rt}`,
              },
            });
            if (!res.ok) throw new Error('Failed to delete');
            setArtComments(prev => prev.filter(c => c.id !== comment.id));
          } catch (e) {
            console.error(e);
            Alert.alert('Delete Comment', 'Unable to delete comment.');
          } finally {
            setCommentMenuForId(null);
          }
        }
      }
    ]);
  };

  const reportArtComment = async (comment) => {
    try {
      let at = accessToken, rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
      }
      const res = await fetch(`${API_BASE}/profile/reportComment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
        body: JSON.stringify({ commentId: comment.id, reason: 'Inappropriate' }),
      });
      if (!res.ok) throw new Error('Failed to report');
      Alert.alert('Report', 'Thanks for your report. Our team will review it.');
    } catch (e) {
      console.error(e);
      Alert.alert('Report', 'Unable to send report right now.');
    } finally {
      setCommentMenuForId(null);
    }
  };

  const formattedDate = birthday ? birthday.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";

  // Only artists/admin can upload artwork
  const handleAddImage = async () => {
    if (isViewingOther) return;
    const r = String(role || '').toLowerCase();
    if (!(r === 'artist' || r === 'admin')) {
      Alert.alert('Not allowed', 'Only artists can upload artworks.');
      return;
    }
    setArtImage(null);
    setArtTitle("");
    setArtDescription("");
    setArtMedium("");
    setArtModalVisible(true);
  };

  const pickArtworkImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setArtImage({ uri: result.assets[0].uri });
    }
  };

  const submitArtwork = async () => {
    try {
      if (!artImage?.uri) {
        alert("Please select an artwork image.");
        return;
      }
      setArtUploading(true);
      await uploadArtwork(artImage.uri, { title: artTitle, description: artDescription, medium: artMedium });
      setArtModalVisible(false);
    } finally {
      setArtUploading(false);
    }
  };

  // Open edit modal with artwork data
  const handleEditArtwork = (art) => {
    setEditingArt(art);
    setEditArtTitle(art.title || '');
    setEditArtDescription(art.description || '');
    setEditArtMedium(art.medium || '');
    setEditArtImage(null); // Don't pre-populate, let user choose new image
    setSelectedArt(null); // Close detail modal
    setEditModalVisible(true);
  };

  // Pick new image for edit
  const pickEditArtworkImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setEditArtImage({ uri: result.assets[0].uri });
    }
  };

  // Submit edited artwork
  const submitEditArtwork = async () => {
    try {
      if (!editArtTitle.trim()) {
        Alert.alert('Error', 'Please enter a title');
        return;
      }
      if (!editingArt?.id) {
        Alert.alert('Error', 'Invalid artwork');
        return;
      }

      setEditArtUploading(true);

      let at = accessToken;
      let rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
      }

      const formData = new FormData();
      
      // Add text fields
      formData.append('title', editArtTitle);
      formData.append('description', editArtDescription);
      formData.append('medium', editArtMedium);

      // Handle images based on whether user selected a new one
      if (editArtImage?.uri) {
        // New image selected - upload it
        formData.append('images', {
          uri: editArtImage.uri,
          name: 'artwork.jpg',
          type: 'image/jpeg',
        });
        // Mark old image for removal (append individually, not as JSON string)
        if (editingArt.image) {
          formData.append('imagesToRemove', editingArt.image);
        }
      } else {
        // No new image selected - keep existing image (append individually)
        if (editingArt.image) {
          formData.append('existingImages', editingArt.image);
        }
      }

      const res = await fetch(`${API_BASE}/profile/art/${editingArt.id}`, {
        method: 'PUT',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Update failed');
      }

      Alert.alert('Success', 'Artwork updated successfully!');
      setEditModalVisible(false);
      setEditingArt(null);
      // Refresh appropriate gallery
      if (isViewingOther) {
        await fetchViewedGallery(at, rt);
      } else {
        await fetchGallery(at, rt);
      }
    } catch (err) {
      console.error('Edit artwork error:', err);
      Alert.alert('Error', err.message || 'Failed to update artwork');
    } finally {
      setEditArtUploading(false);
    }
  };

  // Delete artwork
  const handleDeleteArtwork = (art) => {
    Alert.alert(
      'Delete Artwork',
      'Are you sure you want to delete this artwork? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              let at = accessToken;
              let rt = refreshToken;
              if (!at || !rt) {
                const { data } = await supabase.auth.getSession();
                at = data?.session?.access_token || at;
                rt = data?.session?.refresh_token || rt;
              }

              const res = await fetch(`${API_BASE}/profile/art/${art.id}`, {
                method: 'DELETE',
                headers: {
                  Cookie: `access_token=${at}; refresh_token=${rt}`,
                },
              });

              if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || 'Delete failed');
              }

              Alert.alert('Success', 'Artwork deleted successfully!');
              setSelectedArt(null); // Close modal
              // Refresh appropriate gallery
              if (isViewingOther) {
                await fetchViewedGallery(at, rt);
              } else {
                await fetchGallery(at, rt);
              }
            } catch (err) {
              console.error('Delete artwork error:', err);
              Alert.alert('Error', err.message || 'Failed to delete artwork');
            }
          },
        },
      ]
    );
  };

  // Role now comes from UserContext - no need to fetch separately

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const at = data?.session?.access_token || null;
        const rt = data?.session?.refresh_token || null;
        setAccessToken(at);
        setRefreshToken(rt);
        
        // currentUserId and role now come from UserContext
        if (isViewingOther && at && rt) {
          // Load selected artist by id
          await fetchViewedProfile(at, rt);
          await fetchViewedGallery(at, rt);
        } else if (at && rt) {
          await fetchProfile(at, rt);
          const r = String(role || '').toLowerCase();
          if (r === 'artist' || r === 'admin') {
            await fetchGallery(at, rt);
          } else {
            setGalleryImages([]);
          }
        } else {
          await fetchSupabaseProfile();
        }
      } catch {}
    };
    init();
  }, [isViewingOther, viewedId]);


  const fetchSupabaseProfile = async () => {
    try {
      // Note: This app uses backend API for profile data, not Supabase tables
      // Supabase is only used for authentication
      // If we reach here, it means no session exists - profile data will load after login
    } catch (err) {
      console.warn("Profile initialization warning:", err.message);
    }
  };

  const getInitials = () => {
    const parts = [firstName, middleName, lastName].filter(Boolean);
    let base = parts.join(" ");
    if (!base && username) base = username;
    if (!base) return "";
    const tokens = base.trim().split(/\s+/);
    return tokens.slice(0, 2).map((t) => t[0]?.toUpperCase()).join("");
  };

  const fetchProfile = async (at = accessToken, rt = refreshToken) => {
    try {
      const res = await fetch(`${API_BASE}/profile/getProfile`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch profile (${res.status})`);
      const data = await res.json();
      const p = data?.profile ?? data;
      setFirstName(p.firstName || "");
      setMiddleName(p.middleName || "");
      setLastName(p.lastName || "");
      setUserNameField(p.username || "");
      setUsername(p.username || "");
      setSex(p.sex || "");
      setAddress(p.address || "");
      setBio(p.bio || "");
      setAbout(p.about || "");
      const fetchedBday = p.birthday || p.birthdate;
      if (fetchedBday) {
        const parsedDate = new Date(fetchedBday);
        setBirthday(parsedDate);
        await AsyncStorage.setItem("userBirthday", parsedDate.toISOString());
      }
      const resolveUrl = (u) => {
        if (!u) return null;
        return u.startsWith("http") ? u : `${API_ORIGIN}${u}`;
      };
      const avatarUrl = resolveUrl(p.profilePicture);
      const coverUrl = resolveUrl(p.coverPicture);
      setImage(avatarUrl ? { uri: avatarUrl } : null);
      setBackgroundImage(coverUrl ? { uri: coverUrl } : null);
      // Store own userId for comparison
      setViewedUserId(p.userId || currentUserId);
    } catch (err) {
      console.warn("Profile fetch failed:", err.message);
      await fetchSupabaseProfile();
    }
  };

  const fetchGallery = async (at = accessToken, rt = refreshToken) => {
    // Gallery fetching logic remains unchanged
    try {
      const res = await fetch(`${API_BASE}/profile/getArts`, {
        method: "GET",
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
      });
      if (!res.ok) throw new Error(`Failed to fetch gallery (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.arts || data || []);
      const items = list.map((a) => {
        let imageUrl = null;
        if (Array.isArray(a?.image) && a.image.length > 0) {
          imageUrl = a.image[0];
        } else if (typeof a?.image === 'string') {
          imageUrl = a.image;
        }
        
        let abs = null;
        if (imageUrl) {
          imageUrl = String(imageUrl).trim();
          if (imageUrl.startsWith("http")) {
            abs = imageUrl;
          } else if (imageUrl.startsWith("/")) {
            abs = `${API_ORIGIN}${imageUrl}`;
          } else {
            abs = `${API_ORIGIN}/${imageUrl}`;
          }
        }
        
        return {
          id: a?.artId || a?.id || null,
          image: abs,
          title: a?.title || null,
          description: a?.description || null,
          medium: a?.medium || null,
          timestamp: a?.timestamp || a?.datePosted || null,
        };
      }).filter(x => !!x.image);
      setGalleryImages(items);
    } catch (err) {
      setGalleryImages([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isViewingOther) return; // when viewing another artist, avoid overwriting their data
      fetchProfile();
      const r = String(role || '').toLowerCase();
      if (accessToken && refreshToken && (r === 'artist' || r === 'admin')) {
        fetchGallery(accessToken, refreshToken);
      } else if (accessToken && refreshToken) {
        setGalleryImages([]);
      }
    }, [isViewingOther, role, accessToken, refreshToken])
  );

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (isViewingOther) {
        // Refresh viewed artist's profile and gallery
        await Promise.all([
          fetchViewedProfile(accessToken, refreshToken),
          fetchViewedGallery(accessToken, refreshToken)
        ]);
      } else {
        // Refresh own profile and gallery
        const r = String(role || '').toLowerCase();
        if (r === 'artist' || r === 'admin') {
          await Promise.all([
            fetchProfile(accessToken, refreshToken),
            fetchGallery(accessToken, refreshToken)
          ]);
        } else {
          await fetchProfile(accessToken, refreshToken);
        }
      }
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Artists" showSearch={false} />
      <ScrollView 
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#000']} // Android
            tintColor="#000" // iOS
          />
        }
      >

      <View style={styles.profileSection}>
        {backgroundImage ? (
          <Image source={backgroundImage} style={styles.backgroundImage} />
        ) : (
          <Image source={require("../../assets/pic1.jpg")} style={styles.backgroundImage} />
        )}

        <View style={styles.avatarContainer}>
          {image ? (
            <Image source={image} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: "#dfe3e8", justifyContent: 'center', alignItems: 'center' }]}>
              {getInitials() ? (
                <Text style={{ fontSize: 32, fontWeight: "bold", color: "#555" }}> {getInitials()} </Text>
              ) : (
                <Icon name="user" size={50} color="#999" />
              )}
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -30 }}>
          <Text style={[styles.name, { marginTop: 0 }]}>{username || "Username"}</Text>
          <Ionicons name="checkmark-circle" size={20} color="#D2AE7E" style={{ marginLeft: 6 }} />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.detail}><Text style={styles.detailLabel}>Name:</Text> {[firstName, middleName, lastName].filter(Boolean).join(' ') || "Not set"}</Text>
          <Text style={styles.detail}><Text style={styles.detailLabel}>Gender:</Text> {sex || "Not set"}</Text>
          <Text style={styles.detail}><Text style={styles.detailLabel}>Birthdate:</Text> {formattedDate || "Not set"}</Text>
          <Text style={styles.detail}><Text style={styles.detailLabel}>Address:</Text> {address}</Text>
          <Text style={styles.detail}><Text style={styles.detailLabel}>Bio:</Text> {bio}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.detail}><Text style={styles.detailLabel}>About:</Text> {about}</Text>
        </View>
      </View>

      {/* Artwork Galleries - horizontal, view-only (no add button) - only show if artworks exist */}
      {galleryImages.length > 0 && (
        <>
          <View style={styles.artworkHeaderContainer}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0, marginHorizontal: 0 }]}>Artist's Portfolio</Text>
            <View style={styles.artworkBadge}>
              <Text style={styles.artworkBadgeText}>
                {galleryImages.length} {galleryImages.length === 1 ? 'piece' : 'pieces'}
              </Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryRow}>
            {galleryImages.slice(0, visibleArtworkCount).map((art, index) => (
              <TouchableOpacity key={index} onPress={() => setSelectedArt(art)} style={{ marginRight: 10 }}>
                <Image source={{ uri: art.image }} style={styles.galleryItem} />
              </TouchableOpacity>
            ))}
            
            {/* View More/Less Button - Inline with images */}
            {galleryImages.length > visibleArtworkCount && (
              <TouchableOpacity 
                style={styles.viewMoreCard}
                onPress={() => setVisibleArtworkCount(prev => prev + 6)}
              >
                <Ionicons 
                  name="chevron-forward" 
                  size={32} 
                  color="#A68C7B" 
                />
                <Text style={styles.viewMoreCardText}>
                  View More
                </Text>
                <Text style={styles.viewMoreCountText}>
                  +{Math.min(6, galleryImages.length - visibleArtworkCount)}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          
          {/* Reset Button - Show when viewing more than 6 */}
          {visibleArtworkCount > 6 && galleryImages.length >= visibleArtworkCount && (
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={() => setVisibleArtworkCount(6)}
            >
              <Ionicons name="refresh" size={16} color="#A68C7B" />
              <Text style={styles.resetButtonText}>Show Less</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Artwork Details Modal */}
      <Modal visible={selectedArt !== null} transparent animationType="fade" onRequestClose={() => setSelectedArt(null)}>
        <View style={styles.fullScreenContainer}>
          <View style={{ width: '90%', maxHeight: '85%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            {/* Explicit close button */}
            <TouchableOpacity onPress={() => setSelectedArt(null)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            {/* Fixed Image at top */}
            {selectedArt?.image && (
              <Image source={{ uri: selectedArt.image }} style={styles.artModalImage} />
            )}
            
            {/* Scrollable content below image */}
            <ScrollView
              contentContainerStyle={{ paddingBottom: 16 }}
              decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.98}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              <View style={{ padding: 12 }}>
                
                {/* Row 1: Username, Heart, and Menu */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{username || 'Artist'}</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Heart/Like Button */}
                    <TouchableOpacity onPress={handleToggleArtLike} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#f5f5f5', borderRadius: 20 }}>
                      <Icon name={artUserLiked ? 'heart' : 'heart-o'} size={22} color={artUserLiked ? 'red' : '#555'} />
                      <Text style={{ marginLeft: 8, fontWeight: '600' }}>{artLikesCount}</Text>
                    </TouchableOpacity>
                    
                    {/* Three-dot Menu for Edit/Delete - only show if current user is the artist owner or admin */}
                    {currentUserId && ((isViewingOther && currentUserId === viewedUserId) || (!isViewingOther)) && (role === 'artist' || role === 'admin') && (
                      <View style={{ position: 'relative' }}>
                        <TouchableOpacity 
                          onPress={() => setArtMenuVisible(!artMenuVisible)}
                          style={{ padding: 8 }}
                        >
                          <Ionicons name="ellipsis-horizontal" size={24} color="#555" />
                        </TouchableOpacity>
                        
                        {/* Dropdown menu */}
                        {artMenuVisible && (
                          <View style={styles.dropdownMenu}>
                            <TouchableOpacity 
                              style={styles.menuItem}
                              onPress={() => {
                                setArtMenuVisible(false);
                                handleEditArtwork(selectedArt);
                              }}
                            >
                              <Ionicons name="pencil-outline" size={18} color="#555" />
                              <Text style={styles.menuItemText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#eee' }]}
                              onPress={() => {
                                setArtMenuVisible(false);
                                handleDeleteArtwork(selectedArt);
                              }}
                            >
                              <Ionicons name="trash-outline" size={18} color="#d9534f" />
                              <Text style={[styles.menuItemText, { color: '#d9534f' }]}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Report button - show for users viewing other people's artwork */}
                    {currentUserId && !(currentUserId && ((isViewingOther && currentUserId === viewedUserId) || (!isViewingOther)) && (role === 'artist' || role === 'admin')) && (
                      <TouchableOpacity 
                        onPress={() => Alert.alert('Report', 'Report functionality coming soon')} 
                        style={{ padding: 8 }}
                      >
                        <Ionicons name="flag-outline" size={22} color="#555" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Row 2: By: Fullname */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    by: {[firstName, middleName, lastName].filter(Boolean).join(' ') || username || 'Unknown'}
                  </Text>
                </View>

                {/* Medium */}
                {!!selectedArt?.medium && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 4 }}>Medium:</Text>
                    <Text style={{ fontSize: 14, color: '#222' }}>{selectedArt.medium}</Text>
                  </View>
                )}

                {/* Description */}
                {!!selectedArt?.description && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 4 }}>Description:</Text>
                    <Text style={{ fontSize: 14, color: '#222' }}>
                      {descriptionExpanded || selectedArt.description.length <= 150
                        ? selectedArt.description
                        : `${selectedArt.description.substring(0, 150)}...`}
                    </Text>
                    {selectedArt.description.length > 150 && (
                      <TouchableOpacity onPress={() => setDescriptionExpanded(!descriptionExpanded)} style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, color: '#A68C7B', fontWeight: '600', marginTop: 4 }}>
                          {descriptionExpanded ? 'View Less' : 'View More'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Date and time */}
                {!!selectedArt?.timestamp && (
                  <Text style={{ fontSize: 12, color: '#888', marginTop: 8 }}>{selectedArt.timestamp}</Text>
                )}

                <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 10 }} />
                
                {/* Comments Button */}
                <TouchableOpacity 
                  onPress={openCommentsModal}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: '#f5f5f5', 
                    padding: 12, 
                    borderRadius: 8,
                    marginTop: 10
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#A68C7B" />
                  <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#333' }}>
                    View Comments ({(() => {
                      const count = totalCommentCount > 0 ? totalCommentCount : (artComments?.length || 0);
                      return count >= 10 ? '10+' : count;
                    })()})
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Artwork Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.uploadModalOverlay}>
            <View style={styles.uploadModalContent}>
              <View style={styles.uploadModalHeader}>
                <Text style={styles.uploadModalTitle}>Edit Artwork</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.uploadModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Image Picker */}
                <TouchableOpacity style={styles.uploadImagePicker} onPress={pickEditArtworkImage}>
                  {editArtImage ? (
                    <Image source={editArtImage} style={styles.uploadPickedImage} />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons name="image-outline" size={48} color="#A68C7B" />
                      <Text style={styles.uploadImageText}>{editingArt ? 'Tap to change image (keep current or select new)' : 'Tap to select image'}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Title Input */}
                <Text style={styles.uploadInputLabel}>Title *</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="Enter artwork title"
                  value={editArtTitle}
                  onChangeText={setEditArtTitle}
                />

                {/* Medium Input */}
                <Text style={styles.uploadInputLabel}>Medium</Text>
                <TextInput
                  style={styles.uploadInput}
                  placeholder="e.g., Oil, Digital, Watercolor"
                  value={editArtMedium}
                  onChangeText={setEditArtMedium}
                />

                {/* Description Input */}
                <Text style={styles.uploadInputLabel}>Description</Text>
                <TextInput
                  style={[styles.uploadInput, styles.uploadTextArea]}
                  placeholder="Enter description"
                  value={editArtDescription}
                  onChangeText={setEditArtDescription}
                  multiline
                  numberOfLines={4}
                />

                {/* Update Button */}
                <TouchableOpacity
                  style={[styles.uploadButton, editArtUploading && styles.uploadButtonDisabled]}
                  onPress={submitEditArtwork}
                  disabled={editArtUploading}
                >
                  <Text style={styles.uploadButtonText}>
                    {editArtUploading ? 'Updating...' : 'Update Artwork'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={artModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setArtModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
              <ScrollView contentContainerStyle={styles.modalBox} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Upload Artwork</Text>
                <TouchableOpacity onPress={pickArtworkImage} style={styles.imagePicker}>
                  {artImage ? (
                    <Image source={artImage} style={styles.artworkPreview} />
                  ) : (
                    <View style={[styles.artworkPreview, styles.placeholderCircle]}>
                      <Icon name="image" size={40} color="#999" />
                    </View>
                  )}
                  <Text style={styles.changePhotoText}>Choose Artwork Image</Text>
                </TouchableOpacity>
                <TextInput style={styles.input} placeholder="Title (optional)" placeholderTextColor="#999" value={artTitle} onChangeText={setArtTitle} />
                <TextInput style={[styles.input, { height: 80 }]} placeholder="Description (optional)" placeholderTextColor="#999" value={artDescription} onChangeText={setArtDescription} multiline />
                <TextInput style={styles.input} placeholder="Medium (e.g., Oil, Digital)" placeholderTextColor="#999" value={artMedium} onChangeText={setArtMedium} />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setArtModalVisible(false)} disabled={artUploading}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={submitArtwork} disabled={artUploading}>
                    <Text style={styles.saveButtonText}>{artUploading ? "Uploading..." : "Upload"}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Comments Modal - Home.js Style */}
      <Modal visible={commentsModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
              <TouchableOpacity onPress={closeCommentsModal}>
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 10 }}>Comments</Text>
            </View>
            <FlatList
              data={artComments || []}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderArtComment}
              ListEmptyComponent={
                <View style={styles.emptyCommentsContainer}>
                  <Ionicons name="chatbubbles-outline" size={64} color="#A68C7B" style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyCommentsText}>No comments yet</Text>
                  <Text style={styles.emptyCommentsSubtext}>Be the first to comment!</Text>
                </View>
              }
              ListFooterComponent={
                (artComments || []).length > 0 ? (
                  <View>
                    {commentPage > 1 && (
                      <TouchableOpacity 
                        style={[styles.loadMoreCommentsButton, { backgroundColor: '#fff' }]} 
                        onPress={showLessArtComments}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.loadMoreCommentsText}>Show Less</Text>
                          <Ionicons name="chevron-up" size={16} color="#A68C7B" style={{ marginLeft: 4 }} />
                        </View>
                      </TouchableOpacity>
                    )}
                    {hasMoreComments && (
                      <TouchableOpacity 
                        style={styles.loadMoreCommentsButton} 
                        onPress={loadMoreArtComments}
                        disabled={loadingMoreComments}
                      >
                        {loadingMoreComments ? (
                          <ActivityIndicator size="small" color="#A68C7B" />
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.loadMoreCommentsText}>Load More Comments</Text>
                            <Ionicons name="chevron-down" size={16} color="#A68C7B" style={{ marginLeft: 4 }} />
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null
              }
              contentContainerStyle={(artComments || []).length === 0 ? { flex: 1 } : { paddingVertical: 16 }}
            />
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#999"
                value={artNewComment}
                onChangeText={setArtNewComment}
              />
              <TouchableOpacity onPress={postArtComment} style={styles.sendButton}>
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

// All needed style (removed styles for profile/apply modals and buttons for them)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { flex: 1 },
  profileSection: { alignItems: "center", marginTop: 10, padding: 0 },
  backgroundImage: { width: "100%", height: 150, borderTopLeftRadius: 15, borderTopRightRadius: 15, resizeMode: "cover", marginBottom: -50 },
  avatarContainer: { position: "relative", top: -50, alignItems: "center" },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: "#fff" },
  name: { fontSize: 20, fontWeight: "bold", marginTop: -30 },
  detail: { fontSize: 14, color: "#000", textAlign: "center", marginVertical: 2 },
  detailLabel: { color: "#A68C7B", fontWeight: "600" },
  infoContainer: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#D2AE7E",
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
    marginHorizontal: 10,
    width: "90%",
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginHorizontal: 15, marginTop: 25, marginBottom: 10 },
  artworkHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 15,
    marginTop: 25,
    marginBottom: 10,
  },
  artworkBadge: {
    backgroundColor: '#A68C7B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  artworkBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  galleryRow: { flexDirection: "row", paddingHorizontal: 10 },
  galleryItem: { width: 180, height: 150, borderRadius: 10 },
  viewMoreCard: {
    width: 180,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#F5F0EB',
    borderWidth: 2,
    borderColor: '#A68C7B',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  viewMoreCardText: {
    color: '#A68C7B',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  viewMoreCountText: {
    color: '#A68C7B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#F5F0EB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A68C7B',
  },
  resetButtonText: {
    color: '#A68C7B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  artworkPreview: { width: 150, height: 150, borderRadius: 12, backgroundColor: '#f0f0f0' },
  addImageText: { fontSize: 32, color: "#999" },
  fullScreenContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  artModalImage: { width: '100%', height: 260, resizeMode: 'cover', borderWidth: 3, borderColor: '#fff', borderRadius: 10 },
  // Artwork upload modal (only for artworks, retain styles modalOverlay etc.)
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  keyboardView: { flex: 1, width: "100%" },
  modalBox: { backgroundColor: "#fff", padding: 20, borderRadius: 15, elevation: 5, alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginTop: 30, marginBottom: 15 },
  imagePicker: { alignItems: "center", marginVertical: 10 },
  placeholderCircle: { backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#ddd" },
  changePhotoText: { textAlign: "center", color: "#007BFF", marginTop: 5, marginBottom: 10 },
  input: { backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 10, marginVertical: 5, width: "100%" },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 15, width: "100%" },
  saveButton: { backgroundColor: "#A68C7B", paddingVertical: 8, paddingHorizontal: 25, borderRadius: 20 },
  saveButtonText: { color: "#fff", fontWeight: "bold" },
  cancelButton: { backgroundColor: "#eee", paddingVertical: 8, paddingHorizontal: 25, borderRadius: 20 },
  cancelButtonText: { color: "black", fontWeight: "bold" },
  modalCloseButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  // Edit modal styles
  uploadModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  uploadModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  uploadModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  uploadModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  uploadModalBody: {
    padding: 20,
  },
  uploadImagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#A68C7B',
    borderStyle: 'dashed',
    marginBottom: 20,
    overflow: 'hidden',
  },
  uploadImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  uploadImageText: {
    marginTop: 10,
    fontSize: 14,
    color: '#A68C7B',
  },
  uploadPickedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  uploadInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  uploadTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: '#A68C7B',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  commentInputContainer: { 
    flexDirection: 'row', 
    padding: 10, 
    borderTopWidth: 1, 
    borderColor: '#eee' 
  },
  commentInput: { 
    flex: 1, 
    backgroundColor: '#f0f2f5', 
    borderRadius: 20, 
    paddingHorizontal: 12 
  },
  sendButton: { 
    backgroundColor: '#A68C7B', 
    borderRadius: 20, 
    padding: 10, 
    marginLeft: 8 
  },
  emptyCommentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A68C7B',
    marginBottom: 4,
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: '#999',
  },
  loadMoreCommentsButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 16,
    marginHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loadMoreCommentsText: {
    fontSize: 14,
    color: '#A68C7B',
    fontWeight: '600',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 120,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
});