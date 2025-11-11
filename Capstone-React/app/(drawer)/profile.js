import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Alert, RefreshControl, SafeAreaView, FlatList } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
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
  const { userData, refreshUserData } = useUser();
  const role = userData?.role || null;
  const router = useRouter();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userNameField, setUserNameField] = useState("");
  const [username, setUsername] = useState("");
  const [sex, setSex] = useState("");
  const [birthday, setBirthday] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSexDropdown, setShowSexDropdown] = useState(false);
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [about, setAbout] = useState("");
  const [image, setImage] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [selectedArt, setSelectedArt] = useState(null);
  const [tempImage, setTempImage] = useState(null);
  const [tempBackgroundImage, setTempBackgroundImage] = useState(null);
  const [tempFirstName, setTempFirstName] = useState("");
  const [tempMiddleName, setTempMiddleName] = useState("");
  const [tempLastName, setTempLastName] = useState("");
  const [tempUserNameField, setTempUserNameField] = useState("");
  const [tempSex, setTempSex] = useState("");
  const [tempBirthday, setTempBirthday] = useState(new Date());
  const [tempAddress, setTempAddress] = useState("");
  const [tempBio, setTempBio] = useState("");
  const [tempAbout, setTempAbout] = useState("");
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
  const [artApplyWatermark, setArtApplyWatermark] = useState(true);
  const [artWatermarkText, setArtWatermarkText] = useState("");
  // Artwork interactions
  const [artComments, setArtComments] = useState([]);
  const [artLikesCount, setArtLikesCount] = useState(0);
  const [artUserLiked, setArtUserLiked] = useState(false);
  const [artNewComment, setArtNewComment] = useState("");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
  const [commentMenuForId, setCommentMenuForId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [totalCommentCount, setTotalCommentCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // Open comments modal - close artwork modal first
  const openCommentsModal = async () => {
    console.log('[profile] Opening comments modal, selectedArt:', selectedArt?.id);
    setCommentingArt(selectedArt); // Save the artwork
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

  // Apply as Artist modal state
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [appFirstName, setAppFirstName] = useState("");
  const [appMiddleInitial, setAppMiddleInitial] = useState("");
  const [appLastName, setAppLastName] = useState("");
  const [appPhone, setAppPhone] = useState("");
  const [appAge, setAppAge] = useState("");
  const [appSex, setAppSex] = useState("");
  const [appBirthdate, setAppBirthdate] = useState(new Date());
  const [appShowSexDropdown, setAppShowSexDropdown] = useState(false);
  const [appShowDatePicker, setAppShowDatePicker] = useState(false);
  const [appAddress, setAppAddress] = useState("");
  const [appValidIdImage, setAppValidIdImage] = useState(null); // { uri }
  const [appSelfieImage, setAppSelfieImage] = useState(null);   // { uri }
  const [appSubmitting, setAppSubmitting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);


  // Function to upload artwork image to the backend and refresh gallery
  const uploadArtwork = async (imageUri, meta = {}) => {
    try {
      // Ensure we have tokens; if not, try to fetch current session
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
      // Backend expects file under field name 'images'
      fd.append("images", {
        uri: imageUri,
        name: "artwork.jpg",
        type: "image/jpeg",
      });
      // Optional metadata supported by backend: title, description, medium
      if (meta.title != null) fd.append("title", String(meta.title));
      if (meta.description != null) fd.append("description", String(meta.description));
      if (meta.medium != null) fd.append("medium", String(meta.medium));
      
      // Watermark settings
      if (meta.applyWatermark != null) fd.append("applyWatermark", String(meta.applyWatermark));
      if (meta.watermarkText != null && meta.watermarkText.trim()) fd.append("watermarkText", String(meta.watermarkText.trim()));


      const res = await fetch(`${API_BASE}/profile/uploadArt`, {
        method: "POST",
        headers: {
          // Include auth cookies so backend can read req.user
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
        body: fd,
      });


      if (!res.ok) {
        let msg = res.statusText;
        try {
          const bodyText = await res.text();
          try {
            const bodyJson = bodyText ? JSON.parse(bodyText) : null;
            msg = bodyJson?.error || bodyJson?.message || bodyText || msg;
          } catch (_) {
            msg = bodyText || msg;
          }
        } catch (_) {}
        console.log("[uploadArtwork] failed:", res.status, msg);
        throw new Error(`Upload failed (${res.status}): ${msg}`);
      }


      const data = await res.json();
      console.log("Upload response:", data);
      // Refresh gallery after successful upload
      await fetchGallery(at, rt);
    } catch (err) {
      console.error("Error uploading artwork:", err);
      alert("Failed to upload artwork");
    }
  };


  // Load reactions and comments when an artwork is opened
  useEffect(() => {
    const load = async () => {
      if (!selectedArt?.id) return;
      setDescriptionExpanded(false); // Reset description state
      await Promise.all([
        fetchArtReacts(selectedArt.id),
        fetchArtComments(selectedArt.id),
      ]);
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
      let data = null; try { data = bodyText ? JSON.parse(bodyText) : null; } catch { data = null; }
      const reactions = data?.reactions || [];
      setArtLikesCount(reactions.length || 0);
      // Determine if current user liked
      const session = await supabase.auth.getSession();
      const uid = session?.data?.session?.user?.id;
      setArtUserLiked(!!reactions.find(r => r.userId === uid));
    } catch {}
  };


  const fetchArtComments = async (artId, page = 1, append = false) => {
    try {
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
      // revert on failure
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
            setTotalCommentCount(prev => Math.max(0, prev - 1));
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
      await fetchGallery(at, rt);
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
              await fetchGallery(at, rt);
            } catch (err) {
              console.error('Delete artwork error:', err);
              Alert.alert('Error', err.message || 'Failed to delete artwork');
            }
          },
        },
      ]
    );
  };
  

  const formattedDate = birthday
    ? birthday.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";
  const formattedTempDate = tempBirthday
    ? tempBirthday.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";


  const handleAddImage = async () => {
    // Only artists/admin can upload
    const r = String(role || '').toLowerCase();
    if (!(r === 'artist' || r === 'admin')) {
      console.log('[profile.js] Upload blocked due to role:', role);
      Alert.alert('Not allowed', 'Only artists can upload artworks.');
      return;
    }
    // Open modal to collect artwork metadata and image
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
      if (!artTitle.trim()) {
        Alert.alert('Error', 'Please enter a title');
        return;
      }
      if (!artImage?.uri) {
        Alert.alert('Error', 'Please select an artwork image');
        return;
      }
      setArtUploading(true);
      await uploadArtwork(artImage.uri, {
        title: artTitle,
        description: artDescription,
        medium: artMedium,
        applyWatermark: artApplyWatermark,
        watermarkText: artWatermarkText,
      });
      Alert.alert('Success', 'Artwork uploaded successfully!');
      setArtModalVisible(false);
      setArtImage(null);
      setArtTitle('');
      setArtDescription('');
      setArtMedium('');
    } catch (e) {
      // uploadArtwork already alerts on failure
    } finally {
      setArtUploading(false);
    }
  };


  const handleApplyAsArtist = () => {
    console.log('[profile.js] Apply as Artist clicked. Current role =', role);
    // Prefill from existing profile data if available
    setAppFirstName(firstName || "");
    setAppMiddleInitial((middleName || "").slice(0,1).toUpperCase());
    setAppLastName(lastName || "");
    setAppSex(sex || "");
    setAppBirthdate(birthday || new Date());
    setAppAddress(address || "");
    setAppPhone("");
    setAppAge("");
    setAppValidIdImage(null);
    setAppSelfieImage(null);
    setApplyModalVisible(true);
  };

  const pickValidIdImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setAppValidIdImage({ uri: result.assets[0].uri });
    }
  };

  const pickSelfieImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setAppSelfieImage({ uri: result.assets[0].uri });
    }
  };

  const onChangeAppDate = (event, selectedDate) => {
    if (selectedDate) setAppBirthdate(selectedDate);
    if (Platform.OS === 'android') setAppShowDatePicker(false);
  };

  const submitArtistApplication = async () => {
    try {
      if (!appFirstName || !appLastName || !appPhone || !appAge || !appSex || !appBirthdate || !appAddress || !appValidIdImage || !appSelfieImage) {
        Alert.alert('Incomplete', 'Please fill in all fields and attach both images.');
        return;
      }
      setAppSubmitting(true);

      // Ensure tokens
      let at = accessToken, rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
      }

      // Build multipart form data to mirror the web submission to admin
      const fd = new FormData();
      fd.append('requestType', 'artist_verification');
      fd.append('firstName', String(appFirstName));
      fd.append('midInit', String(appMiddleInitial || ''));
      fd.append('lastName', String(appLastName));
      fd.append('phone', String(appPhone));
      fd.append('age', String(appAge));
      fd.append('sex', String(appSex));
      fd.append('birthdate', new Date(appBirthdate).toISOString());
      fd.append('address', String(appAddress));
      fd.append('portfolio', '');
      fd.append('bio', '');
      // Consent required by web flow; RN UI has no toggle, so set true to match web behavior
      fd.append('consent', 'true');
      // Files must be under field names 'file' and 'file2' as in the web app
      fd.append('file', { uri: appValidIdImage.uri, name: 'valid_id.jpg', type: 'image/jpeg' });
      fd.append('file2', { uri: appSelfieImage.uri, name: 'selfie.jpg', type: 'image/jpeg' });

      const endpoint = `${API_BASE}/request/registerAsArtist`;
      console.log('[profile.js] Submitting artist application to (admin/web route):', endpoint);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
        body: fd,
      });
      const bodyText = await res.text();
      console.log('[profile.js] Application response:', res.status, bodyText);
      if (!res.ok) throw new Error(bodyText || 'Application failed');

      // Trigger existing refresh logic to update profile/gallery state
      try { await onRefresh(); } catch (_) {}
      Alert.alert('Submitted', 'Your application has been submitted.');
      setApplyModalVisible(false);
    } catch (e) {
      console.error('[profile.js] submitArtistApplication error:', e?.message || e);
      Alert.alert('Failed', e?.message || 'Could not submit application');
    } finally {
      setAppSubmitting(false);
    }
  };

  // Role now comes from UserContext - no need to fetch separately

  // Check if user has a pending artist verification request
  const checkPendingRequest = async (at, rt) => {
    try {
      const res = await fetch(`${API_BASE}/request/getRequest`, {
        method: "GET",
        credentials: "include",
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
      });
      if (!res.ok) {
        setHasPendingRequest(false);
        return false;
      }
      const data = await res.json();
      
      // Check if there's a pending artist_verification request
      if (data?.requests && Array.isArray(data.requests)) {
        const pendingArtistRequest = data.requests.find(
          req => req.requestType === 'artist_verification' && req.status === 'pending'
        );
        const hasPending = !!pendingArtistRequest;
        setHasPendingRequest(hasPending);
        console.log("[profile.js] Pending artist request:", hasPending);
        return hasPending;
      }
      setHasPendingRequest(false);
      return false;
    } catch (error) {
      console.error("[profile.js] Error checking pending request:", error?.message || error);
      setHasPendingRequest(false);
      return false;
    }
  };


  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const at = data?.session?.access_token || null;
        const rt = data?.session?.refresh_token || null;
        setAccessToken(at);
        setRefreshToken(rt);

        if (at && rt) {
          // Refresh user data from UserContext to get latest role
          await refreshUserData();
          await fetchProfile(at, rt);
          await checkPendingRequest(at, rt);
          // Use role from UserContext
          const userRole = userData?.role || role;
          if (String(userRole || '').toLowerCase() === 'artist' || String(userRole || '').toLowerCase() === 'admin') {
            await fetchGallery(at, rt);
          } else {
            console.log('[profile.js] Role not permitted to view gallery. Skipping fetchGallery. role =', userRole);
            setGalleryImages([]);
          }
        } else {
          await fetchSupabaseProfile();
        }
      } catch (e) {
        console.warn("Init session failed:", e?.message || e);
      }
    };
    init();
  }, []);

  // Debug: log role changes to verify UI conditions
  useEffect(() => {
    console.log('[profile.js] role state now:', role);
  }, [role]);

  
  const fetchSupabaseProfile = async () => {
    try {
      // Note: This app uses backend API for profile data, not Supabase tables
      // Supabase is only used for authentication
      // If we reach here, it means no session exists - profile data will load after login
      console.log('[profile.js] No active session - profile will load after authentication');
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
    return tokens
      .slice(0, 2)
      .map((t) => t[0]?.toUpperCase())
      .join("");
  };


  const fetchProfile = async (at = accessToken, rt = refreshToken) => {
    try {
      const res = await fetch(`${API_BASE}/profile/getProfile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
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
    } catch (err) {
      console.warn("Profile fetch failed:", err.message);
      await fetchSupabaseProfile();
    }
  };


  // Fetch user's artworks and populate galleryImages
  const fetchGallery = async (at = accessToken, rt = refreshToken) => {
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
        console.log('[profile.js] Raw artwork data:', JSON.stringify(a));
        
        // Image is stored as JSONB array, extract first URL
        let imageUrl = null;
        if (Array.isArray(a?.image) && a.image.length > 0) {
          imageUrl = a.image[0];
          console.log('[profile.js] Initial imageUrl from array:', imageUrl);
          
          // Handle double-encoded JSON strings (e.g., "[\"url\"]" instead of "url")
          if (typeof imageUrl === 'string' && imageUrl.startsWith('[')) {
            console.log('[profile.js] Detected double-encoded JSON, attempting to parse...');
            try {
              const parsed = JSON.parse(imageUrl);
              console.log('[profile.js] Parsed result:', parsed);
              if (Array.isArray(parsed) && parsed.length > 0) {
                imageUrl = parsed[0];
                console.log('[profile.js] Extracted URL from parsed array:', imageUrl);
              }
            } catch (e) {
              console.error('[profile.js] Failed to parse double-encoded image:', imageUrl, e);
            }
          }
        } else if (typeof a?.image === 'string') {
          imageUrl = a.image;
          console.log('[profile.js] imageUrl from string:', imageUrl);
        }
        
        // Make URL absolute if needed and validate
        let abs = null;
        if (imageUrl) {
          // Remove any extra quotes or whitespace
          imageUrl = String(imageUrl).trim().replace(/^"+|"+$/g, '');
          console.log('[profile.js] Cleaned imageUrl:', imageUrl);
          
          if (imageUrl.startsWith("http")) {
            abs = imageUrl;
          } else if (imageUrl.startsWith("/")) {
            abs = `${API_ORIGIN}${imageUrl}`;
          } else {
            abs = `${API_ORIGIN}/${imageUrl}`;
          }
          
          // Add cache busting parameter to force reload of watermarked images
          if (abs) {
            const separator = abs.includes('?') ? '&' : '?';
            abs = `${abs}${separator}_=${Date.now()}`;
          }
        }
        
        console.log('[profile.js] Final processed URL:', abs);
        console.log('[profile.js] =============================');
        
        return {
          id: a?.artId || a?.id || null,
          image: abs,
          title: a?.title || null,
          description: a?.description || null,
          medium: a?.medium || null,
          timestamp: a?.timestamp || a?.datePosted || null,
        };
      }).filter(x => {
        const hasImage = !!x.image;
        if (!hasImage) {
          console.log('[profile.js] Filtered out item with no image:', x.title);
        }
        return hasImage;
      });
      setGalleryImages(items);
    } catch (e) {
      console.warn("Gallery fetch failed:", e?.message || e);
    }
  };


  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id;
        if (uid) setCurrentUserId(uid);
      };
      init();
      fetchProfile();
      const r = String(role || '').toLowerCase();
      if (accessToken && refreshToken && (r === 'artist' || r === 'admin')) {
        fetchGallery(accessToken, refreshToken);
      } else if (accessToken && refreshToken) {
        console.log('[profile.js] Focus effect: role not permitted to view gallery. role =', role);
        setGalleryImages([]);
      }
    }, [role, accessToken, refreshToken])
  );

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Role now comes from UserContext automatically
      const r = String(role || '').toLowerCase();
      
      if (r === 'artist' || r === 'admin') {
        await Promise.all([
          fetchProfile(accessToken, refreshToken),
          fetchGallery(accessToken, refreshToken),
          checkPendingRequest(accessToken, refreshToken)
        ]);
      } else {
        await Promise.all([
          fetchProfile(accessToken, refreshToken),
          checkPendingRequest(accessToken, refreshToken)
        ]);
      }
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };


  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const imgObj = { uri };
      setTempImage(imgObj);
      setImage(imgObj);
    }
  };


  const pickBackgroundImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const bgObj = { uri };
      setTempBackgroundImage(bgObj);
      setBackgroundImage(bgObj);
    }
  };


  const handleSave = async () => {
    try {
      const formData = new FormData();
      if (tempImage) {
        const filename = tempImage.uri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image";
        formData.append("avatar", { uri: tempImage.uri, name: filename, type });
      }
      if (tempBackgroundImage) {
        const filename = tempBackgroundImage.uri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image";
        formData.append("cover", { uri: tempBackgroundImage.uri, name: filename, type });
      }


      formData.append("firstName", String(tempFirstName ?? ""));
      formData.append("middleName", String(tempMiddleName ?? ""));
      formData.append("lastName", String(tempLastName ?? ""));
      formData.append("username", String(tempUserNameField || username || ""));
      formData.append("sex", String(tempSex ?? ""));
      const birthdayISO = tempBirthday ? new Date(tempBirthday).toISOString() : "";
      formData.append("birthday", birthdayISO);
      formData.append("birthdate", birthdayISO);
      formData.append("address", String(tempAddress ?? ""));
      formData.append("bio", String(tempBio ?? ""));
      formData.append("about", String(tempAbout ?? ""));


      if (tempBirthday) {
        await AsyncStorage.setItem("userBirthday", new Date(tempBirthday).toISOString());
      }


      const res = await fetch(`${API_BASE}/profile/updateProfile`, {
        method: "POST",
        headers: {
          Cookie: `access_token=${accessToken}; refresh_token=${refreshToken}`,
        },
        body: formData,
      });


      if (!res.ok) {
        let errorMsg = "Failed to update profile";
        try {
          const errorData = await res.json();
          errorMsg = errorData?.message || errorData?.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }


      setModalVisible(false);
      setTempImage(null);
      setTempBackgroundImage(null);
      await fetchProfile();


      Alert.alert("Success", "Profile updated successfully!");
    } catch (err) {
      console.error("Profile update error:", err);
      Alert.alert("Update Failed", err?.message || "Failed to save profile information");
    }
  };


  const onChangeTempDate = (event, selectedDate) => {
    if (selectedDate) setTempBirthday(selectedDate);
    if (Platform.OS === "android") setShowDatePicker(false);
  };


  return (
    <SafeAreaView style={styles.container}>
      <Header title="Profile" showSearch={false} />
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


      {/* Profile Section */}
      <View style={styles.profileSection}>
        {backgroundImage ? (
          <Image source={backgroundImage} style={styles.backgroundImage} />
        ) : (
          <Image source={require("../../assets/pic1.jpg")} style={styles.backgroundImage} />
        )}


      {/* Apply as Artist Modal */}
      <Modal
        visible={applyModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setApplyModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.uploadModalOverlay}>
            <View style={styles.uploadModalContent}>
              <View style={styles.uploadModalHeader}>
                <Text style={styles.uploadModalTitle}>Apply as Artist</Text>
                <TouchableOpacity onPress={() => setApplyModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.uploadModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                <Text style={styles.uploadInputLabel}>First Name *</Text>
                <TextInput style={styles.uploadInput} placeholder="First Name" value={appFirstName} onChangeText={setAppFirstName} />
                
                <Text style={styles.uploadInputLabel}>Middle Initial</Text>
                <TextInput style={styles.uploadInput} placeholder="Middle Initial" value={appMiddleInitial} onChangeText={setAppMiddleInitial} maxLength={1} />
                
                <Text style={styles.uploadInputLabel}>Last Name *</Text>
                <TextInput style={styles.uploadInput} placeholder="Last Name" value={appLastName} onChangeText={setAppLastName} />
                
                <Text style={styles.uploadInputLabel}>Phone Number *</Text>
                <TextInput style={styles.uploadInput} placeholder="Phone Number" keyboardType="phone-pad" value={appPhone} onChangeText={setAppPhone} />
                
                <Text style={styles.uploadInputLabel}>Age *</Text>
                <TextInput style={styles.uploadInput} placeholder="Age" keyboardType="numeric" value={appAge} onChangeText={setAppAge} />

                <Text style={styles.uploadInputLabel}>Sex *</Text>
                <TouchableOpacity style={styles.uploadInput} onPress={() => setAppShowSexDropdown(!appShowSexDropdown)}>
                  <Text style={{ color: appSex ? '#000' : '#999' }}>{appSex || 'Select Sex'}</Text>
                  <Ionicons name={appShowSexDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#555" style={{ position: 'absolute', right: 12, top: 12 }} />
                </TouchableOpacity>
                {appShowSexDropdown && (
                  <View style={styles.categoryDropdown}>
                    {['Male', 'Female', 'PreferNotToSay'].map(item => (
                      <TouchableOpacity key={item} style={styles.categoryItem} onPress={() => { setAppSex(item); setAppShowSexDropdown(false); }}>
                        <Text style={styles.categoryItemText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.uploadInputLabel}>Birthdate *</Text>
                <TouchableOpacity style={styles.uploadInput} onPress={() => setAppShowDatePicker(true)}>
                  <Text style={{ color: appBirthdate ? '#000' : '#999' }}>
                    {appBirthdate ? appBirthdate.toLocaleDateString('en-US') : 'Select your birthdate'}
                  </Text>
                </TouchableOpacity>
                {appShowDatePicker && (
                  <DateTimePicker value={appBirthdate} mode="date" display="default" onChange={onChangeAppDate} />
                )}

                <Text style={styles.uploadInputLabel}>Address *</Text>
                <TextInput style={styles.uploadInput} placeholder="Address" value={appAddress} onChangeText={setAppAddress} />

                <Text style={styles.uploadInputLabel}>Valid ID *</Text>
                <TouchableOpacity onPress={pickValidIdImage} style={styles.uploadImagePicker}>
                  {appValidIdImage ? (
                    <Image source={appValidIdImage} style={styles.uploadPickedImage} />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons name="card-outline" size={48} color="#A68C7B" />
                      <Text style={styles.uploadImageText}>Tap to upload Valid ID</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.uploadInputLabel}>Selfie *</Text>
                <TouchableOpacity onPress={pickSelfieImage} style={styles.uploadImagePicker}>
                  {appSelfieImage ? (
                    <Image source={appSelfieImage} style={styles.uploadPickedImage} />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons name="person-outline" size={48} color="#A68C7B" />
                      <Text style={styles.uploadImageText}>Tap to upload Selfie</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.uploadButton, appSubmitting && styles.uploadButtonDisabled]}
                  onPress={submitArtistApplication}
                  disabled={appSubmitting}
                >
                  <Text style={styles.uploadButtonText}>
                    {appSubmitting ? 'Submitting...' : 'Submit Application'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
        <View style={styles.avatarContainer}>
          {image ? (
            <Image source={image} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.placeholderCircle, { backgroundColor: "#dfe3e8" }]}>
              {getInitials() ? (
                <Text style={{ fontSize: 32, fontWeight: "bold", color: "#555" }}>
                  {getInitials()}
                </Text>
              ) : (
                <Icon name="user" size={50} color="#999" />
              )}
            </View>
          )}
        </View>


        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -30 }}>
          <Text style={[styles.name, { marginTop: 0 }]}>{username || "Username"}</Text>
          {(String(role || '').toLowerCase() === 'artist' || String(role || '').toLowerCase() === 'admin') && (
            <Ionicons name="checkmark-circle" size={20} color="#D2AE7E" style={{ marginLeft: 6 }} />
          )}
        </View>

        <Text style={[styles.name, { fontSize: 16, color: '#666', marginTop: 5 }]}>
          {[firstName, middleName, lastName].filter(Boolean).join(' ') || "Not set"}
        </Text>

        <View style={styles.infoContainer}>
          <Text style={styles.detail}><Text style={styles.detailLabel}>Gender:</Text> {sex || "Not set"}</Text>
          <Text style={styles.detail}><Text style={styles.detailLabel}>Birthdate:</Text> {formattedDate || "Not set"}</Text>
          <Text style={styles.detail}><Text style={styles.detailLabel}>Address:</Text> {address}</Text>
          <Text style={styles.detail}><Text style={styles.detailLabel}>Bio:</Text> {bio}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.detail}><Text style={styles.detailLabel}>About:</Text> {about}</Text>
        </View>
      </View>


      {/* Artwork Galleries - visible only to artist/admin */}
      {(String(role || '').toLowerCase() === 'artist' || String(role || '').toLowerCase() === 'admin') && (
        <>
          <View style={styles.artworkHeaderContainer}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0, marginHorizontal: 0 }]}>My Artwork</Text>
            <View style={styles.artworkBadge}>
              <Text style={styles.artworkBadgeText}>
                {galleryImages.length} {galleryImages.length === 1 ? 'piece' : 'pieces'}
              </Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.galleryRow}
            decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.98}
            scrollEventThrottle={16}
          >
            {galleryImages.map((art, index) => (
              <TouchableOpacity key={index} onPress={() => setSelectedArt(art)}>
                <Image 
                  source={{ uri: art.image }} 
                  style={styles.galleryItem}
                  onError={(error) => {
                    console.log('[profile.js] Gallery thumbnail error:', error.nativeEvent?.error);
                    console.log('[profile.js] Failed thumbnail URI:', art.image);
                  }}
                />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addImageBox} onPress={handleAddImage}>
              <Text style={styles.addImageText}>+</Text>
            </TouchableOpacity>
          </ScrollView>
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
              <Image 
                source={{ uri: selectedArt.image }} 
                style={styles.artModalImage}
                onError={(error) => {
                  console.log('[profile.js] Image load error:', error.nativeEvent?.error);
                  console.log('[profile.js] Failed image URI:', selectedArt.image);
                }}
              />
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
                    
                    {/* Three-dot Menu for Edit/Delete */}
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

      {/* Artwork Upload Modal */}
      <Modal
        visible={artModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setArtModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.uploadModalOverlay}>
            <View style={styles.uploadModalContent}>
              <View style={styles.uploadModalHeader}>
                <Text style={styles.uploadModalTitle}>Upload Artwork</Text>
                <TouchableOpacity onPress={() => setArtModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.uploadModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Image Picker */}
              <TouchableOpacity style={styles.uploadImagePicker} onPress={pickArtworkImage}>
                {artImage ? (
                  <Image source={artImage} style={styles.uploadPickedImage} />
                ) : (
                  <View style={styles.uploadImagePlaceholder}>
                    <Ionicons name="image-outline" size={48} color="#A68C7B" />
                    <Text style={styles.uploadImageText}>Tap to select image</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Title Input */}
              <Text style={styles.uploadInputLabel}>Title *</Text>
              <TextInput
                style={styles.uploadInput}
                placeholder="Enter artwork title"
                value={artTitle}
                onChangeText={setArtTitle}
              />

              {/* Medium Input */}
              <Text style={styles.uploadInputLabel}>Medium</Text>
              <TextInput
                style={styles.uploadInput}
                placeholder="e.g., Oil, Digital, Watercolor"
                value={artMedium}
                onChangeText={setArtMedium}
              />

              {/* Description Input */}
              <Text style={styles.uploadInputLabel}>Description</Text>
              <TextInput
                style={[styles.uploadInput, styles.uploadTextArea]}
                placeholder="Enter description"
                value={artDescription}
                onChangeText={setArtDescription}
                multiline
                numberOfLines={4}
              />

              {/* Watermark Section */}
              <View style={styles.watermarkSection}>
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setArtApplyWatermark(!artApplyWatermark)}
                >
                  <Ionicons 
                    name={artApplyWatermark ? 'checkbox' : 'square-outline'} 
                    size={24} 
                    color="#A68C7B" 
                  />
                  <View style={styles.checkboxLabel}>
                    <Text style={styles.checkboxTitle}>🔒 Protect with watermark</Text>
                    <Text style={styles.checkboxSubtitle}>
                      Add watermark to protect your artwork from unauthorized use
                    </Text>
                  </View>
                </TouchableOpacity>

                {artApplyWatermark && (
                  <View style={styles.watermarkInputContainer}>
                    <Text style={styles.watermarkInputLabel}>
                      Custom watermark text (optional)
                    </Text>
                    <TextInput
                      style={styles.watermarkInput}
                      placeholder={`© Your Name ${new Date().getFullYear()} • Museo`}
                      value={artWatermarkText}
                      onChangeText={setArtWatermarkText}
                    />
                    <Text style={styles.watermarkHint}>
                      Leave blank to use default watermark
                    </Text>
                  </View>
                )}
              </View>

              {/* Upload Button */}
              <TouchableOpacity
                style={[styles.uploadButton, artUploading && styles.uploadButtonDisabled]}
                onPress={submitArtwork}
                disabled={artUploading}
              >
                <Text style={styles.uploadButtonText}>
                  {artUploading ? 'Uploading...' : 'Upload Artwork'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>


      {/* Edit Profile Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.uploadModalOverlay}>
            <View style={styles.uploadModalContent}>
              <View style={styles.uploadModalHeader}>
                <Text style={styles.uploadModalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.uploadModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.uploadInputLabel}>Profile Photo</Text>
                <TouchableOpacity onPress={pickImage} style={styles.uploadImagePicker}>
                  {tempImage ? (
                    <Image source={tempImage} style={styles.uploadPickedImage} />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons name="person-circle-outline" size={48} color="#A68C7B" />
                      <Text style={styles.uploadImageText}>Tap to change photo</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.uploadInputLabel}>Cover Photo</Text>
                <TouchableOpacity onPress={pickBackgroundImage} style={styles.uploadImagePicker}>
                  {tempBackgroundImage ? (
                    <Image source={{ uri: tempBackgroundImage.uri }} style={styles.uploadPickedImage} />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons name="image-outline" size={48} color="#A68C7B" />
                      <Text style={styles.uploadImageText}>Tap to change cover</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.uploadInputLabel}>First Name</Text>
                <TextInput style={styles.uploadInput} placeholder="First Name" value={tempFirstName} onChangeText={setTempFirstName} />

                <Text style={styles.uploadInputLabel}>Middle Name</Text>
                <TextInput style={styles.uploadInput} placeholder="Middle Name" value={tempMiddleName} onChangeText={setTempMiddleName} />

                <Text style={styles.uploadInputLabel}>Last Name</Text>
                <TextInput style={styles.uploadInput} placeholder="Last Name" value={tempLastName} onChangeText={setTempLastName} />

                <Text style={styles.uploadInputLabel}>Username</Text>
                <TextInput style={styles.uploadInput} placeholder="Username" value={tempUserNameField} onChangeText={setTempUserNameField} />

                <Text style={styles.uploadInputLabel}>Sex</Text>
                <TouchableOpacity style={styles.uploadInput} onPress={() => setShowSexDropdown(!showSexDropdown)}>
                  <Text style={{ color: tempSex ? "#000" : "#999" }}>{tempSex || "Select Sex"}</Text>
                  <Ionicons name={showSexDropdown ? "chevron-up" : "chevron-down"} size={20} color="#555" style={{ position: "absolute", right: 12, top: 12 }} />
                </TouchableOpacity>
                {showSexDropdown && (
                  <View style={styles.categoryDropdown}>
                    {["Male", "Female", "PreferNotToSay"].map((item) => (
                      <TouchableOpacity key={item} style={styles.categoryItem} onPress={() => { setTempSex(item); setShowSexDropdown(false); }}>
                        <Text style={styles.categoryItemText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.uploadInputLabel}>Birthday</Text>
                <TouchableOpacity style={styles.uploadInput} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: tempBirthday ? "#000" : "#999" }}>
                    {tempBirthday ? formattedTempDate : "Select your birthday"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker value={tempBirthday} mode="date" display="default" onChange={onChangeTempDate} />
                )}

                <Text style={styles.uploadInputLabel}>Address</Text>
                <TextInput style={styles.uploadInput} placeholder="Enter your address" value={tempAddress} onChangeText={setTempAddress} />

                <Text style={styles.uploadInputLabel}>Bio</Text>
                <TextInput style={styles.uploadInput} placeholder="Enter your bio" value={tempBio} onChangeText={setTempBio} />

                <Text style={styles.uploadInputLabel}>About</Text>
                <TextInput style={[styles.uploadInput, styles.uploadTextArea]} placeholder="Write something about yourself" multiline value={tempAbout} onChangeText={setTempAbout} />

                <TouchableOpacity style={styles.uploadButton} onPress={handleSave}>
                  <Text style={styles.uploadButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  scrollContent: { 
    flex: 1 
  },
  profileSection: { 
    alignItems: "center", 
    marginTop: 10, 
    padding: 0 
  },
  backgroundImage: {
    width: "100%",
    height: 150,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    resizeMode: "cover",
    marginBottom: -50,
  },
  avatarContainer: { 
    position: "relative", 
    top: -50, 
    alignItems: "center" 
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
  },
  name: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginTop: -30 
  },
  detail: { 
    fontSize: 14, 
    color: "#000", 
    textAlign: "center", 
    marginVertical: 2 
  },
  detailLabel: { 
    color: "#A68C7B", 
    fontWeight: "600" 
  },
  infoContainer: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#D2AE7E",
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
    marginHorizontal: 20,
    width: "90%",
  },
  buttonContainer: { 
    alignItems: "center", 
    marginTop: 10 
  },
  buttonRow: { flexDirection: "row" },
  button: {
    backgroundColor: "#A68C7B",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#fff" 
  },
  fullWidthButton: {
    marginTop: 10,
    alignSelf: "stretch",
    marginHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 15,
    marginTop: 25,
    marginBottom: 10,
  },
  artworkHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  galleryRow: { 
    flexDirection: "row", 
    paddingHorizontal: 10 
  },
  galleryItem: {
    width: 180,
    height: 150,
    borderRadius: 10,
    marginRight: 10,
  },
  artworkPreview: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  addImageBox: {
    width: 150,
    height: 150,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D2AE7E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  addImageText: { 
    fontSize: 32, 
    color: "#D2AE7E" 
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: { width: "90%", height: "80%" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  keyboardView: { flex: 1, width: "100%" },
  modalBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    elevation: 5,
    alignItems: "center",
    
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    marginTop: 30, 
    marginBottom: 15 
  },
  imagePicker: { 
    alignItems: "center", 
    marginVertical: 10 
  },
  avatarEdit: { 
    width: 90, 
    height: 90, 
    borderRadius: 45 
  },
  changePhotoText: { 
    textAlign: "center", 
    color: "#007BFF", 
    marginTop: 5, 
    marginBottom: 10 
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
    width: "100%",
  },
  inputContainer: { 
    width: "100%", 
    position: "relative" 
  },
  dropdownList: {
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginTop: -5,
    elevation: 3,
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownItemText: { 
    fontSize: 16, 
    color: "#000" 
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    width: "100%",
  },
  saveButton: {
    backgroundColor: "#A68C7B",
    paddingVertical: 8,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  saveButtonText: { 
    color: "#fff", 
    fontWeight: "bold" 
  },
  cancelButton: {
    backgroundColor: "#eee",
    paddingVertical: 8,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  cancelButtonText: { 
    color: "black", 
    fontWeight: "bold" 
  },
  placeholderCircle: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  backgroundPreviewContainer: {
    width: 300,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  backgroundPreviewImage: { 
    width: "100%", 
    height: "100%" 
  },
  artModalImage: {
    width: '100%',
    height: 260,
    resizeMode: 'cover',
    borderWidth: 3, 
    borderColor: '#fff', 
    borderRadius: 10, 
  },
  validIdPreview: {
    width: 200,        
    height: 120,       
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
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
  pendingButton: {
    backgroundColor: '#FFC107',
    opacity: 0.8,
  },
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
  watermarkSection: {
    marginVertical: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxLabel: {
    flex: 1,
    marginLeft: 12,
  },
  checkboxTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  checkboxSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  watermarkInputContainer: {
    marginTop: 16,
    paddingLeft: 36,
  },
  watermarkInputLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
    fontWeight: '500',
  },
  watermarkInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#333',
  },
  watermarkHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
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
  categoryDropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryItemText: {
    fontSize: 14,
    color: '#333',
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
  },
  emptyCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  loadMoreCommentsButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  loadMoreCommentsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A68C7B',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
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