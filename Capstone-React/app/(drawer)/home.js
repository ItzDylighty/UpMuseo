import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Image, TouchableOpacity, Modal, TextInput, TouchableWithoutFeedback, FlatList, ScrollView, Platform, KeyboardAvoidingView, Keyboard, Dimensions, BackHandler, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from '../components/Header';
import { supabase } from "../../supabase/supabaseClient";
import { useRouter, useFocusEffect } from "expo-router";
import { useUser } from '../contexts/UserContext';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HomeScreen = () => {
  // Get user data from UserContext
  const { userData } = useUser();
  const role = userData?.role || null;
  const currentUserId = userData?.id || null;
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]); // Array of images for carousel
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // Current image index
  const [modalVisible, setModalVisible] = useState(false);
  const [postText, setPostText] = useState('');
  const [pickedImages, setPickedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [userLikes, setUserLikes] = useState({});
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisiblePostId, setMenuVisiblePostId] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [imagesToRemove, setImagesToRemove] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Art interests modal
  const [interestsModalVisible, setInterestsModalVisible] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [hasArtPreferences, setHasArtPreferences] = useState(false);


  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [currentPostComments, setCurrentPostComments] = useState([]);
  const [currentPostId, setCurrentPostId] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentMenuForId, setCommentMenuForId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);


  // Profile modal and fields
  const [profileModalVisible, setProfileModalVisible] = useState(false);


  // Android hardware back: close Comments modal if open
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const onBack = () => {
        if (commentModalVisible) {
          setCommentModalVisible(false);
          return true; // consume
        }
        return false; // allow default
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [commentModalVisible])
  );

  // Extra safety: when the comments modal is open, force-close on hardware back
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!commentModalVisible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setCommentModalVisible(false);
      return true;
    });
    return () => sub.remove();
  }, [commentModalVisible]);


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


  // Temporary unsaved edits
  const [tempImage, setTempImage] = useState(null);
  const [tempBackgroundImage, setTempBackgroundImage] = useState(null);


  const formattedDate = birthday.toLocaleDateString("en-US");


  const router = useRouter();
  const API_BASE = "http://192.168.254.114:3000/api";



  // Helper: coerce various shapes into a valid uri string
  const ensureUri = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value || null;
    if (Array.isArray(value)) {
      const first = value.find((v) => typeof v === 'string' && v);
      return first || null;
    }
    if (typeof value === 'object' && value.uri) {
      return typeof value.uri === 'string' ? value.uri : null;
    }
    return null;
  };

  
  // Check if user has art preferences
  const checkArtPreferences = async (at, rt) => {
    try {
      const res = await fetch(`${API_BASE}/gallery/getArtPreference`, {
        method: "GET",
        headers: {
          'Cookie': `access_token=${at}; refresh_token=${rt}`,
        },
      });
      const data = await res.json();
      
      if (data?.artPreference) {
        // Check if user has selected at least one preference
        const prefs = data.artPreference;
        const hasPreferences = Object.keys(prefs).some(key => 
          key !== 'userId' && key !== 'id' && key !== 'created_at' && prefs[key] === true
        );
        setHasArtPreferences(hasPreferences);
        return hasPreferences;
      }
      return false;
    } catch (err) {
      console.log("checkArtPreferences error:", err?.message || err);
      return false;
    }
  };


  // Comment menu handlers
  const onOpenCommentMenu = (comment) => {
    setCommentMenuForId(prev => (prev === comment.id ? null : comment.id));
    // Exit edit mode if switching items
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
      const res = await fetch(`${API_BASE}/homepage/updateComment/${comment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`,
        },
        body: JSON.stringify({ text: newText }),
      });
      if (!res.ok) throw new Error('Failed to update comment');
      // Optimistic local update
      setCurrentPostComments(prev => prev.map(c => (
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

  const deleteComment = async (comment) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`${API_BASE}/homepage/deleteComment/${comment.id}`, {
              method: 'DELETE',
              headers: {
                'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`,
              },
            });
            if (!res.ok) throw new Error('Failed to delete');
            
            // Local remove from comments list
            setCurrentPostComments(prev => prev.filter(c => c.id !== comment.id));
            
            // Update comment count
            setComments(prev => ({
              ...prev,
              [currentPostId]: Math.max(0, (prev[currentPostId] || 1) - 1),
            }));
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

  const reportComment = async (comment) => {
    try {
      const res = await fetch(`${API_BASE}/homepage/reportComment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`,
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

  // Fetch user profile from backend to determine if profile modal should show
  const fetchUserProfile = async (at, rt) => {
    try {
      const res = await fetch(`${API_BASE}/profile/getProfile`, {
        method: "GET",
        headers: {
          'Cookie': `access_token=${at}; refresh_token=${rt}`,
        },
      });
      const data = await res.json();


      if (data?.profile) {
        const p = data.profile;
        setFirstName(p.firstName || "");
        setMiddleName(p.middleName || "");
        setLastName(p.lastName || "");
        setUserNameField(p.username || "");
        setUsername(p.username || "");
        // accept both 'sex' and 'gender' from backend
        setSex(p.sex || p.gender || "");
        setAddress(p.address || "");
        setBio(p.bio || "");
        setAbout(p.about || "");
        // accept both 'birthday' and 'birthdate'
        if (p.birthday || p.birthdate) setBirthday(new Date(p.birthday || p.birthdate));
        // Align with profile.js which resolves URLs and may use profilePicture/coverPicture
        const avatarUrl = p.profilePicture || p.avatar;
        const coverUrl = p.coverPicture || p.cover;
        if (avatarUrl) setImage({ uri: avatarUrl });
        if (coverUrl) setBackgroundImage({ uri: coverUrl });


        // Only show modal if profile is incomplete (you can tweak the fields checked)
        if (!p.username || !p.firstName || !p.lastName) {
          setProfileModalVisible(true);
        } else {
          setProfileModalVisible(false);
          // Check art preferences after profile is complete
          const hasPrefs = await checkArtPreferences(at, rt);
          if (!hasPrefs) {
            // Show interests modal if no preferences set
            setInterestsModalVisible(true);
          }
        }
      } else {
        // No profile data found - require completion
        setProfileModalVisible(true);
      }
    } catch (err) {
      console.log("fetchUserProfile error:", err?.message || err);
      // If error occurs, be conservative and show the modal so user can complete profile
      setProfileModalVisible(true);
    }
  };

  // Fetch user role (concept applied): include credentials and log raw/resolved role
  const fetchRole = async (at, rt) => {
    try {
      const res = await fetch(`${API_BASE}/users/role`, {
        method: "GET",
        credentials: "include",
        headers: {
          // RN fetch doesn't always handle cookies automatically; include Cookie header
          'Cookie': `access_token=${at}; refresh_token=${rt}`,
        },
      });
      if (!res.ok) throw new Error(`Failed to fetch role: ${res.status} ${res.statusText}`);

      // Read as text first for reliable logging, then try JSON
      const bodyText = await res.text();
      console.log("[home.js] Fetched role raw:", bodyText);
      let data = null;
      try {
        data = bodyText ? JSON.parse(bodyText) : null;
      } catch (_) {
        data = bodyText; // sometimes API returns a plain string role
      }

      const resolvedRole = typeof data === 'string'
        ? data
        : (data?.role || data?.user?.role || data?.data?.role || data?.profile?.role || null);

      setRole(resolvedRole);
      console.log("[home.js] Resolved role:", resolvedRole ?? "(null/unknown)");
    } catch (error) {
      console.error("[home.js] Error fetching role:", error?.message || error);
      setRole(null);
    }
  };


  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        const at = data?.session?.access_token || null;
        const rt = data?.session?.refresh_token || null;
        setAccessToken(at);
        setRefreshToken(rt);

        if (at && rt) {
          // Role and user ID now come from UserContext
          await fetchUserProfile(at, rt);
          await fetchPosts(at, rt);
          await fetchEvents(at, rt);
        } else {
          // no session tokens - still fetch posts (may be public) or skip
          await fetchPosts(at, rt);
          await fetchEvents(at, rt);
        }
      } catch (e) {
        setError(e.message || "Failed to initialize session");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Android hardware back: close any open modal in priority order, else pass through
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (selectedImage !== null && selectedImages.length > 0) {
          setSelectedImage(null);
          setSelectedImages([]);
          setCurrentImageIndex(0);
          return true;
        }
        if (commentModalVisible) {
          setCommentModalVisible(false);
          return true;
        }
        if (modalVisible) {
          setModalVisible(false);
          return true;
        }
        if (profileModalVisible) {
          setProfileModalVisible(false);
          return true;
        }
        if (interestsModalVisible) {
          setInterestsModalVisible(false);
          return true;
        }
        return false; // allow default behavior
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [selectedImage, selectedImages.length, commentModalVisible, modalVisible, profileModalVisible, interestsModalVisible])
  );


  const fetchPosts = async (at = accessToken, rt = refreshToken, page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      // Use userId from UserContext instead of fetching from supabase
      const userId = userData?.id || currentUserId;


      const res = await fetch(`${API_BASE}/homepage/getPost?page=${page}&limit=10`, {
        method: 'GET',
        headers: {
          'Cookie': `access_token=${at}; refresh_token=${rt}`,
        },
      });
      const data = await res.json();

      // Combine regular posts and announcements, just like web version
      const allPosts = [...(data.announcements || []), ...(data.posts || [])];
      
      if (append) {
        // Append to existing posts (for load more)
        setPosts(prev => [...prev, ...allPosts]);
      } else {
        // Replace posts (for initial load or refresh)
        setPosts(allPosts);
      }
      
      // Check if there are more posts to load
      setHasMorePosts(allPosts.length >= 10);
      setCurrentPage(page);


      const reactCounts = {};
      data.reacts?.forEach(r => {
        reactCounts[r.postId] = (reactCounts[r.postId] || 0) + 1;
      });
      setLikes(reactCounts);


      const commentCounts = {};
      data.comments?.forEach(c => {
        commentCounts[c.postId] = (commentCounts[c.postId] || 0) + 1;
      });
      setComments(commentCounts);


      const initialLikes = {};
      data.reacts?.forEach(r => {
        if (r.userId === userId) {
          initialLikes[r.postId] = true;
        }
      });
      setUserLikes(initialLikes);


    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMorePosts = async () => {
    if (!hasMorePosts || loadingMore) return;
    await fetchPosts(accessToken, refreshToken, currentPage + 1, true);
  };

  const fetchEvents = async (at = accessToken, rt = refreshToken) => {
    try {
      const res = await fetch(`${API_BASE}/event/getEvents`, {
        method: 'GET',
        headers: {
          'Cookie': `access_token=${at}; refresh_token=${rt}`,
        },
      });
      const data = await res.json();
      const eventList = Array.isArray(data?.data) ? data.data : [];
      setEvents(eventList);
    } catch (err) {
      console.error('Error fetching events:', err.message);
      setEvents([]);
    }
  };


  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      const uris = result.assets.map(asset => asset.uri);
      setPickedImages(prev => [...prev, ...uris]);
    }
  };


  const uploadPost = async () => {
    if (!postText && pickedImages.length === 0 && existingImages.length === 0) return;

    const formData = new FormData();
    // Both create and edit use 'description' field
    formData.append("description", String(postText ?? ""));
    
    // Check if we're editing or creating
    const isEditing = editingPostId !== null;
    
    if (isEditing) {
      // For editing: send existing images, new images, and images to remove
      existingImages.forEach(imageUrl => {
        formData.append('existingImages', imageUrl);
      });
      
      // Add new images with 'images' field name
      pickedImages.forEach((uri) => {
        const filename = uri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('images', { uri, name: filename, type });
      });
      
      // Add images to remove
      imagesToRemove.forEach(imageUrl => {
        formData.append('imagesToRemove', imageUrl);
      });
    } else {
      // For creating: use file, file2, file3, file4 field names
      pickedImages.slice(0, 4).forEach((uri, index) => {
        const filename = uri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        const fieldName = index === 0 ? "file" : `file${index + 1}`;
        formData.append(fieldName, { uri, name: filename, type });
      });
    }

    try {
      setLoading(true);
      
      const url = isEditing 
        ? `${API_BASE}/homepage/posts/${editingPostId}`
        : `${API_BASE}/homepage/createPost`;
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method: method,
        credentials: 'include',
        headers: {
          'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`,
        },
        body: formData,
      });
      
      if (!res.ok) {
        let errMsg = `Failed to ${isEditing ? 'update' : 'upload'} post (${res.status})`;
        try {
          const txt = await res.text();
          try {
            const j = txt ? JSON.parse(txt) : null;
            if (j && (j.message || j.error)) errMsg = String(j.message || j.error);
            else if (txt) errMsg = txt;
          } catch {
            if (txt) errMsg = txt;
          }
        } catch {}
        throw new Error(errMsg);
      }
      
      let data = null;
      try { data = await res.json(); } catch {}
      
      setModalVisible(false);
      setPostText("");
      setPickedImages([]);
      setEditingPostId(null);
      setExistingImages([]);
      setImagesToRemove([]);
      
      Alert.alert('Success', `Post ${isEditing ? 'updated' : 'created'} successfully!`);
      // Refetch posts to get the updated data
      await fetchPosts();
    } catch (err) {
      setError(err?.message || "Failed to upload post");
      Alert.alert('Error', err?.message || "Failed to upload post");
    } finally {
      setLoading(false);
    }
  };


  const handleLike = async (postId) => {
    const alreadyLiked = userLikes[postId] || false;

    // Optimistic update for user like status
    setUserLikes(prev => ({
      ...prev,
      [postId]: !alreadyLiked,
    }));

    // Optimistic update for like count
    setLikes(prev => ({
      ...prev,
      [postId]: alreadyLiked ? (prev[postId] || 1) - 1 : (prev[postId] || 0) + 1,
    }));

    try {
      const res = await fetch(`${API_BASE}/homepage/createReact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`,
        },
        body: JSON.stringify({ postId }),
      });

      if (!res.ok) throw new Error(`Failed to react (${res.status})`);
      // Don't refetch all posts, just keep optimistic update
    } catch (e) {
      console.error(e.message);
      // Revert on error
      setUserLikes(prev => ({
        ...prev,
        [postId]: alreadyLiked,
      }));
      setLikes(prev => ({
        ...prev,
        [postId]: alreadyLiked ? (prev[postId] || 0) + 1 : (prev[postId] || 1) - 1,
      }));
    }
  };


  const openCommentsModal = async (postId, page = 1) => {
    try {
      if (page === 1) {
        setLoading(true);
        setCurrentPostComments([]);
        setCommentPage(1);
        setHasMoreComments(true);
      } else {
        setLoadingMoreComments(true);
      }
      
      const res = await fetch(`${API_BASE}/homepage/getComments?postId=${postId}&page=${page}&limit=10`, {
        method: 'GET',
        headers: { 'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}` },
      });
      const data = await res.json();
      const newComments = data.comments || [];
      
      if (page === 1) {
        setCurrentPostComments(newComments);
      } else {
        setCurrentPostComments(prev => [...prev, ...newComments]);
      }
      
      setCurrentPostId(postId);
      setCommentPage(page);
      setHasMoreComments(newComments.length >= 10);
      
      if (page === 1) {
        setCommentModalVisible(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMoreComments(false);
    }
  };
  
  const loadMoreComments = () => {
    if (!loadingMoreComments && hasMoreComments && currentPostId) {
      openCommentsModal(currentPostId, commentPage + 1);
    }
  };
  
  const showLessComments = () => {
    if (currentPostId) {
      openCommentsModal(currentPostId, 1);
    }
  };


  const postComment = async () => {
    if (!newCommentText.trim()) return;

    // Optimistic update for comment count
    setComments(prev => ({
      ...prev,
      [currentPostId]: (prev[currentPostId] || 0) + 1,
    }));

    const commentTextToSend = newCommentText;
    setNewCommentText('');

    try {
      const res = await fetch(`${API_BASE}/homepage/createComment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`,
        },
        body: JSON.stringify({
          postId: currentPostId,
          text: commentTextToSend,
        }),
      });

      if (!res.ok) throw new Error('Failed to post comment');

      // Refresh comments list to show the new comment
      openCommentsModal(currentPostId);
    } catch (err) {
      console.error(err);
      // Revert comment count on error
      setComments(prev => ({
        ...prev,
        [currentPostId]: Math.max(0, (prev[currentPostId] || 1) - 1),
      }));
      setNewCommentText(commentTextToSend); // Restore text
      Alert.alert('Error', 'Failed to post comment');
    }
  };


  const removeImage = (index) => {
    setPickedImages(prev => prev.filter((_, i) => i !== index));
  };


  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });


    if (!result.canceled) {
      setTempImage({ uri: result.assets[0].uri });
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
      setTempBackgroundImage({ uri: result.assets[0].uri });
    }
  };


  const saveProfileToDB = async () => {
    try {
      const formData = new FormData();


      if (tempImage) {
        const filename = tempImage.uri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        formData.append("avatar", {
          uri: tempImage.uri,
          name: filename,
          type,
        });
      }


      if (tempBackgroundImage) {
        const filename = tempBackgroundImage.uri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        formData.append("cover", {
          uri: tempBackgroundImage.uri,
          name: filename,
          type,
        });
      }

      const birthdayStr = birthday ? new Date(birthday).toISOString() : "";
      formData.append("firstName", String(firstName ?? ""));
      formData.append("middleName", String(middleName ?? ""));
      formData.append("lastName", String(lastName ?? ""));
      formData.append("username", String(userNameField || username || ""));
      formData.append("sex", String(sex ?? ""));
      // also send under alternate keys for compatibility
      formData.append("gender", String(sex ?? ""));
      formData.append("birthday", birthdayStr);
      formData.append("birthdate", birthdayStr);
      formData.append("address", String(address ?? ""));
      formData.append("bio", String(bio ?? ""));
      formData.append("about", String(about ?? ""));


      try {
        console.log("[home.js] updateProfile payload:", {
          firstName,
          middleName,
          lastName,
          username: userNameField || username,
          sex,
          gender: sex,
          birthday: birthdayStr,
          birthdate: birthdayStr,
          address,
          bio,
          about,
          hasAvatar: !!tempImage,
          hasCover: !!tempBackgroundImage,
        });
      } catch {}

      const res = await fetch(`${API_BASE}/profile/updateProfile`, {
        method: "POST",
        headers: {
          'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let msg = "Failed to save profile";
        try {
          const errJson = await res.json();
          if (errJson?.message) msg = `${msg}: ${errJson.message}`;
        } catch {}
        throw new Error(msg);
      }


      alert("Profile saved successfully ");
      return true;
    } catch (err) {
      console.error(err);
      alert(`Failed to save profile: ${err?.message || "Unknown error"}`);
      return false;
    }
  };


  const handleProfileSave = async () => {
    const displayName =
      userNameField || [firstName, middleName, lastName].filter(Boolean).join(" ");
    setUsername(displayName);


    setImage(tempImage);
    setBackgroundImage(tempBackgroundImage);


    // Save to DB, then refresh profile from server to ensure completeness flag is accurate
    const saved = await saveProfileToDB();


    if (saved) {
      // refresh local profile state based on backend response
      await fetchUserProfile(accessToken, refreshToken);
      // if profile is complete fetchUserProfile will setProfileModalVisible(false)
      // but ensure it's closed here as well for immediate UX
      setProfileModalVisible(false);
    }
  };


  const onChangeDate = (event, selectedDate) => {
    if (selectedDate) {
      setBirthday(selectedDate);
    }
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
  };


  const handleDeletePost = async (postId) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/homepage/posts/${postId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                  'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`,
                },
              });
              if (res.ok) {
                setPosts(prev => prev.filter(p => p.id !== postId));
                setMenuVisiblePostId(null);
                Alert.alert('Success', 'Post deleted successfully');
              } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('Failed to delete post:', errorData.error);
                Alert.alert('Error', 'Failed to delete post');
              }
            } catch (err) {
              Alert.alert('Error', 'Error deleting post');
              console.error(err);
            }
          }
        }
      ]
    );
  };

  const handleEditPost = (post) => {
    setMenuVisiblePostId(null);
    setEditingPostId(post.id);
    setPostText(post.text || '');
    
    // Load existing images from post
    const postImages = post.image || post.images;
    const imageArray = Array.isArray(postImages) ? postImages : (postImages ? [postImages] : []);
    setExistingImages(imageArray);
    
    // Clear new images and images to remove
    setPickedImages([]);
    setImagesToRemove([]);
    
    setModalVisible(true);
  };

  const handleReportPost = async (postId) => {
    try {
      Alert.alert(
        'Report Post',
        'Are you sure you want to report this post? Our team will review it.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Report',
            style: 'destructive',
            onPress: async () => {
              await submitReport(postId);
            }
          }
        ]
      );
    } catch (err) {
      console.error('Report error:', err);
    }
  };

  const submitReport = async (postId) => {
    try {
      const res = await fetch(`${API_BASE}/homepage/reportPost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`,
        },
        body: JSON.stringify({ postId }),
      });
      
      if (res.ok) {
        Alert.alert('Success', 'Post reported successfully. Our team will review it.');
      } else {
        Alert.alert('Error', 'Failed to report post. Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', 'Error reporting post');
      console.error(err);
    }
  };

  const renderPost = ({ item: post }) => {
    // Check if current user owns this post - match web frontend logic
    // Web checks: currentUser?.id === item.userId
    const postOwnerId = post.userId || post.user?.id || post.user?.userId || post.user_id;
    const isOwnPost = currentUserId && postOwnerId === currentUserId;
    
    return (
    <View key={post.id} style={styles.card}>
      <View style={styles.userInfo}>
        {(() => {
          const avatarUri = ensureUri(post.user?.avatar);
          return avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.placeholderCircle]} />
          );
        })()}
        <Text style={styles.username}>{post.user?.name}</Text>
        
        {/* Three-dot menu for own posts */}
        {isOwnPost && (
          <View style={{ marginLeft: 'auto', position: 'relative' }}>
            <TouchableOpacity 
              onPress={() => setMenuVisiblePostId(menuVisiblePostId === post.id ? null : post.id)}
              style={{ padding: 8 }}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="#555" />
            </TouchableOpacity>
            
            {/* Dropdown menu */}
            {menuVisiblePostId === post.id && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => handleEditPost(post)}
                >
                  <Ionicons name="pencil-outline" size={18} color="#555" />
                  <Text style={styles.menuItemText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#eee' }]}
                  onPress={() => handleDeletePost(post.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#d9534f" />
                  <Text style={[styles.menuItemText, { color: '#d9534f' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Report button for other users' posts */}
        {!isOwnPost && currentUserId && (
          <TouchableOpacity 
            onPress={() => handleReportPost(post.id)}
            style={{ marginLeft: 'auto', padding: 8 }}
          >
            <Ionicons name="flag-outline" size={22} color="#555" />
          </TouchableOpacity>
        )}
      </View>


      {!!post.text && <Text style={styles.description}>{post.text}</Text>}


      {(() => {
        // Handle both single image and array of images
        let imageArray = [];
        if (Array.isArray(post.image)) {
          imageArray = post.image;
        } else if (post.image) {
          imageArray = [post.image];
        } else if (Array.isArray(post.images)) {
          imageArray = post.images;
        } else if (post.images) {
          imageArray = [post.images];
        }
        
        const postImageUri = imageArray.length > 0 ? ensureUri(imageArray[0]) : null;
        
        return postImageUri ? (
          <TouchableOpacity onPress={() => {
            setSelectedImages(imageArray.map(img => ({ uri: ensureUri(img) })));
            setCurrentImageIndex(0);
            setSelectedImage(true); // Just a flag to open modal
          }}>
            <Image source={{ uri: postImageUri }} style={styles.postImage} resizeMode="cover" />
            {imageArray.length > 1 && (
              <View style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(0,0,0,0.7)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
              }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                  1/{imageArray.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : null;
      })()}


      {!!post.timestamp && (
        <Text style={styles.timestamp}>{post.timestamp}</Text>
      )}


      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleLike(post.id)} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons
            name={userLikes[post.id] ? "heart" : "heart-outline"}
            size={20}
            color={userLikes[post.id] ? "red" : "#555"}
          />
          <Text style={styles.likeText}>{likes[post.id] || 0}</Text>
        </TouchableOpacity>


        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }} onPress={() => openCommentsModal(post.id)}>
          <Feather name="message-circle" size={20} color="#555" />
          <Text style={{ marginLeft: 4 }}>{comments[post.id] || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  const renderEvent = ({ item: announcementPost }) => {
    // For announcement posts, look up full event data using eventId
    const fullEvent = announcementPost.eventId 
      ? events.find(e => e.eventId === announcementPost.eventId) 
      : null;
    const displayData = fullEvent || announcementPost;
    
    return (
      <TouchableOpacity 
        key={announcementPost.id} 
        style={[styles.card, styles.eventCard]}
        onPress={() => router.push({ 
          pathname: '/(drawer)/viewEvents', 
          params: { eventId: String(announcementPost.eventId || displayData.eventId || displayData.id) } 
        })}
      >
        <View style={styles.eventBadge}>
          <Ionicons name="calendar" size={14} color="#fff" />
          <Text style={styles.eventBadgeText}>Event</Text>
        </View>

        {displayData.image && (
          <Image source={{ uri: displayData.image }} style={styles.postImage} resizeMode="cover" />
        )}

        <Text style={styles.eventTitle}>{displayData.title || announcementPost.title}</Text>
        
        {!!displayData.details && (
          <Text style={styles.description} numberOfLines={3}>
            {displayData.details}
          </Text>
        )}

        {(displayData.startsAt || displayData.venueName || announcementPost.venueName) && (
          <View style={styles.eventMetaContainer}>
            {!!displayData.startsAt && (
              <View style={styles.eventMeta}>
                <Ionicons name="time-outline" size={16} color="#555" />
                <Text style={styles.eventMetaText}>
                  {new Date(displayData.startsAt).toLocaleDateString()}
                </Text>
              </View>
            )}
            {!!(displayData.venueName || announcementPost.venueName) && (
              <View style={styles.eventMeta}>
                <Ionicons name="location-outline" size={16} color="#555" />
                <Text style={styles.eventMetaText} numberOfLines={1}>
                  {displayData.venueName || announcementPost.venueName}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.eventViewMore}>
          <Text style={styles.eventViewMoreText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color="#000" />
        </View>
      </TouchableOpacity>
    );
  };


  // Chat bubble style comment render
  const renderComment = ({ item }) => (
    <View style={{ flexDirection: 'row', marginBottom: 16, paddingHorizontal: 16 }}>
      {(() => {
        const avatarUri = ensureUri(item.user?.avatar);
        return avatarUri ? (
          <Image 
            source={{ uri: avatarUri }} 
            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} 
          />
        ) : (
          <View style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="person" size={24} color="#999" />
          </View>
        );
      })()}
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
                <TouchableOpacity onPress={() => deleteComment(item)} style={{ paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="trash-outline" size={18} color="#d9534f" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#d9534f' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => reportComment(item)} style={{ paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="flag-outline" size={18} color="#555" style={{ marginRight: 10 }} />
                <Text style={{ color: '#333' }}>Report</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );


  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMorePosts(true);
    try {
      // Fetch both posts and events
      await Promise.all([
        fetchPosts(accessToken, refreshToken, 1, false),
        fetchEvents(accessToken, refreshToken)
      ]);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter posts and events based on search query
  // Matches web React logic: combine posts (including announcement posts) and sort by datePosted
  const getFilteredData = () => {
    if (!searchQuery.trim()) {
      // Unified feed: all posts (regular + announcements) sorted by datePosted desc
      // Same as web: [...(announcements||[]), ...(posts||[])].sort((a,b) => datePosted desc)
      return posts
        .map(p => ({ 
          ...p, 
          itemType: p.isAnnouncement ? 'event' : 'post',
          sortDate: p.datePosted || p.timestamp || new Date(0).toISOString()
        }))
        .sort((a, b) => {
          const da = new Date(a.sortDate).getTime() || 0;
          const db = new Date(b.sortDate).getTime() || 0;
          return db - da; // newest first
        });
    }

    const query = searchQuery.toLowerCase().trim();
    
    // Filter posts by username, post text, or title (for announcements)
    const filteredPosts = posts.filter(p => 
      (p.user?.name && p.user.name.toLowerCase().includes(query)) ||
      (p.text && p.text.toLowerCase().includes(query)) ||
      (p.title && p.title.toLowerCase().includes(query))
    );

    return filteredPosts
      .map(p => ({ 
        ...p, 
        itemType: p.isAnnouncement ? 'event' : 'post',
        sortDate: p.datePosted || p.timestamp || new Date(0).toISOString()
      }))
      .sort((a, b) => {
        const da = new Date(a.sortDate).getTime() || 0;
        const db = new Date(b.sortDate).getTime() || 0;
        return db - da;
      });
  };

  const filteredData = getFilteredData();

  return (
    <SafeAreaView style={styles.container}>
      <Header title="HOME" showSearch={true} onSearch={handleSearch} />


      {error && <Text style={{ color: 'red', margin: 10 }}>{error}</Text>}


      {(role === "artist" || role === "admin") && (
        <TouchableOpacity style={styles.postOverlayBox} onPress={() => {
          setEditingPostId(null);
          setPostText('');
          setPickedImages([]);
          setExistingImages([]);
          setImagesToRemove([]);
          setModalVisible(true);
        }}>
          {/* Show user's profile avatar if available; fallback keeps same size */}
  
          <Ionicons name="create-outline" size={24} color="#555" style={{ marginRight: 8 }} />
          <Text style={{ color: '#555' }}>Share inspiration, artwork or a thought</Text>
        </TouchableOpacity>
      )}


      <FlatList
        data={filteredData}
        keyExtractor={(item) => `${item.itemType}-${item.id || item.eventId}`}
        renderItem={({ item }) => item.itemType === 'event' ? renderEvent({ item }) : renderPost({ item })}
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={() => setMenuVisiblePostId(null)}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#000']} // Android
            tintColor="#000" // iOS
          />
        }
        ListEmptyComponent={
          loading ? (
            <Text style={{ margin: 12 }}>Loading...</Text>
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
              <Ionicons name="albums-outline" size={64} color="#ccc" />
              <Text style={styles.noResultsTitle}>No posts yet</Text>
              <Text style={styles.noResultsText}>
                Be the first to share something!
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          !searchQuery.trim() && filteredData.length > 0 && hasMorePosts ? (
            <TouchableOpacity 
              style={styles.loadMoreButton} 
              onPress={loadMorePosts}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.loadMoreText}>Loading...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.loadMoreText}>Load More Posts</Text>
                  <Ionicons name="chevron-down" size={20} color="#A68C7B" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          ) : !searchQuery.trim() && filteredData.length > 0 && !hasMorePosts ? (
            <View style={styles.endOfFeed}>
              <Ionicons name="checkmark-circle" size={32} color="#A68C7B" />
              <Text style={styles.endOfFeedText}>You've reached the end</Text>
            </View>
          ) : null
        }
      />


      {/* Image fullscreen modal with carousel */}
      <Modal
        visible={selectedImage !== null && selectedImages.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSelectedImage(null);
          setSelectedImages([]);
          setCurrentImageIndex(0);
        }}
      >
        <View style={styles.fullScreenContainer}>
          {/* Close button */}
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: 40,
              right: 20,
              zIndex: 10,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 20,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => {
              setSelectedImage(null);
              setSelectedImages([]);
              setCurrentImageIndex(0);
            }}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {/* Image counter */}
          {selectedImages.length > 1 && (
            <View style={{
              position: 'absolute',
              top: 40,
              left: 20,
              zIndex: 10,
              backgroundColor: 'rgba(0,0,0,0.7)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
            }}>
              <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
                {currentImageIndex + 1}/{selectedImages.length}
              </Text>
            </View>
          )}

          {/* Swipeable image carousel */}
          <FlatList
            data={selectedImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
              setCurrentImageIndex(index);
            }}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, justifyContent: 'center', alignItems: 'center' }}>
                <Image source={item} style={styles.fullScreenImage} resizeMode="contain" />
              </View>
            )}
          />
        </View>
      </Modal>


      {/* Create Post modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => {
        setModalVisible(false);
        setEditingPostId(null);
        setPostText('');
        setPickedImages([]);
        setExistingImages([]);
        setImagesToRemove([]);
      }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.uploadModalOverlay}>
            <View style={styles.uploadModalContent}>
              <View style={styles.uploadModalHeader}>
                <Text style={styles.uploadModalTitle}>{editingPostId ? 'Edit Post' : 'Create Post'}</Text>
                <TouchableOpacity onPress={() => {
                  setModalVisible(false);
                  setEditingPostId(null);
                  setPostText('');
                  setPickedImages([]);
                  setExistingImages([]);
                  setImagesToRemove([]);
                }}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.uploadModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* User Avatar and Text Input */}
                <View style={styles.postInputContainer}>
                  {image ? (
                    <Image source={image} style={styles.postAvatar} />
                  ) : (
                    <View style={[styles.postAvatar, styles.placeholderCircle]}>
                      <Ionicons name="person" size={24} color="#999" />
                    </View>
                  )}
                  <TextInput
                    style={styles.postTextInput}
                    placeholder="What's on your mind?"
                    placeholderTextColor="#999"
                    value={postText}
                    onChangeText={setPostText}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Image Picker Section */}
                <Text style={styles.uploadInputLabel}>Photos (Optional)</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 16 }}
                >
                  {/* Show existing images when editing */}
                  {existingImages.map((imageUrl, index) => (
                    <View key={`existing-${index}`} style={styles.postImageContainer}>
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.postPreviewImage}
                      />
                      <TouchableOpacity 
                        onPress={() => {
                          setExistingImages(prev => prev.filter((_, i) => i !== index));
                          setImagesToRemove(prev => [...prev, imageUrl]);
                        }} 
                        style={styles.postRemoveBtn}
                      >
                        <Ionicons name="close-circle" size={26} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  
                  {/* Show new images */}
                  {pickedImages.map((item, index) => (
                    <View key={`new-${index}`} style={styles.postImageContainer}>
                      <Image
                        source={{ uri: Array.isArray(item) ? item[0] : item }}
                        style={styles.postPreviewImage}
                      />
                      <TouchableOpacity onPress={() => removeImage(index)} style={styles.postRemoveBtn}>
                        <Ionicons name="close-circle" size={26} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  
                  <View style={styles.postImageContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.postAddPhotoBtn}>
                      <Ionicons name="image-outline" size={32} color="#A68C7B" />
                      <Text style={styles.postAddPhotoText}>Add Photo</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                {/* Post Button */}
                <TouchableOpacity style={styles.uploadButton} onPress={uploadPost} disabled={loading}>
                  <Text style={styles.uploadButtonText}>{editingPostId ? 'Update' : 'Post'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>


      {/* Comments Modal */}
      <Modal
        visible={commentModalVisible}
        animationType="slide"
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 10 }}>Comments</Text>
            </View>
            <FlatList
              data={currentPostComments}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderComment}
              ListEmptyComponent={
                <View style={styles.emptyCommentsContainer}>
                  <Ionicons name="chatbubbles-outline" size={64} color="#A68C7B" style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyCommentsText}>No comments yet</Text>
                  <Text style={styles.emptyCommentsSubtext}>Be the first to comment!</Text>
                </View>
              }
              ListFooterComponent={
                currentPostComments.length > 0 ? (
                  <View>
                    {commentPage > 1 && (
                      <TouchableOpacity 
                        style={[styles.loadMoreCommentsButton, { backgroundColor: '#fff' }]} 
                        onPress={showLessComments}
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
                        onPress={loadMoreComments}
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
              contentContainerStyle={currentPostComments.length === 0 ? { flex: 1 } : { paddingVertical: 16 }}
            />
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#999"
                value={newCommentText}
                onChangeText={setNewCommentText}
              />
              <TouchableOpacity onPress={postComment} style={styles.sendButton}>
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>


      {/* Complete Your Profile Modal */}
      <Modal visible={profileModalVisible} animationType="slide" transparent onRequestClose={() => setProfileModalVisible(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.uploadModalOverlay}>
            <View style={styles.uploadModalContent}>
              <View style={styles.uploadModalHeader}>
                <Text style={styles.uploadModalTitle}>Complete Your Profile</Text>
                <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.uploadModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.uploadInputLabel}>Profile Photo</Text>
                <TouchableOpacity onPress={pickProfileImage} style={styles.uploadImagePicker}>
                  {tempImage ? (
                    <Image source={tempImage} style={styles.uploadPickedImage} />
                  ) : (
                    <View style={styles.uploadImagePlaceholder}>
                      <Ionicons name="person-circle-outline" size={48} color="#A68C7B" />
                      <Text style={styles.uploadImageText}>Tap to add profile photo</Text>
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
                      <Text style={styles.uploadImageText}>Tap to add cover photo</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.uploadInputLabel}>First Name</Text>
                <TextInput style={styles.uploadInput} placeholder="First Name" value={firstName} onChangeText={setFirstName} />

                <Text style={styles.uploadInputLabel}>Middle Name</Text>
                <TextInput style={styles.uploadInput} placeholder="Middle Name" value={middleName} onChangeText={setMiddleName} />

                <Text style={styles.uploadInputLabel}>Last Name</Text>
                <TextInput style={styles.uploadInput} placeholder="Last Name" value={lastName} onChangeText={setLastName} />

                <Text style={styles.uploadInputLabel}>Username</Text>
                <TextInput style={styles.uploadInput} placeholder="Username" value={userNameField} onChangeText={setUserNameField} />

                <Text style={styles.uploadInputLabel}>Sex</Text>
                <TouchableOpacity style={styles.uploadInput} onPress={() => setShowSexDropdown(!showSexDropdown)}>
                  <Text style={{ color: sex ? "#000" : "#999" }}>{sex || "Select Sex"}</Text>
                  <Ionicons name={showSexDropdown ? "chevron-up" : "chevron-down"} size={20} color="#555" style={{ position: "absolute", right: 12, top: 12 }} />
                </TouchableOpacity>
                {showSexDropdown && (
                  <View style={styles.categoryDropdown}>
                    {["Male", "Female", "PreferNotToSay"].map((item) => (
                      <TouchableOpacity key={item} style={styles.categoryItem} onPress={() => { setSex(item); setShowSexDropdown(false); }}>
                        <Text style={styles.categoryItemText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.uploadInputLabel}>Birthday</Text>
                <TouchableOpacity style={styles.uploadInput} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: birthday ? "#000" : "#999" }}>
                    {birthday ? formattedDate : "Select your birthday"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker value={birthday} mode="date" display="default" onChange={onChangeDate} />
                )}

                <Text style={styles.uploadInputLabel}>Address</Text>
                <TextInput style={styles.uploadInput} placeholder="Enter your address" value={address} onChangeText={setAddress} />

                <Text style={styles.uploadInputLabel}>Bio</Text>
                <TextInput style={styles.uploadInput} placeholder="Enter your bio" value={bio} onChangeText={setBio} />

                <Text style={styles.uploadInputLabel}>About</Text>
                <TextInput style={[styles.uploadInput, styles.uploadTextArea]} placeholder="Write something about yourself" multiline value={about} onChangeText={setAbout} />

                <TouchableOpacity style={styles.uploadButton} onPress={handleProfileSave}>
                  <Text style={styles.uploadButtonText}>Save Profile</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Art Interests Modal */}
      <Modal visible={interestsModalVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback>
          <View style={styles.modalOverlay}>
            <View style={styles.interestsBox}>
              <Text style={styles.modalTitle}>Choose Your Art Interests</Text>
              <Text style={{ marginBottom: 10, color: '#555', textAlign: 'center' }}>Pick a few to personalize your feed</Text>
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                <View style={styles.interestsGrid}>
                {[
                  { id: 'classical', name: 'Classical Art', color: '#111' },
                  { id: 'contemporary', name: 'Contemporary', color: '#6b21a8' },
                  { id: 'impressionist', name: 'Impressionist', color: '#b45309' },
                  { id: 'abstract', name: 'Abstract', color: '#047857' },
                  { id: 'sculpture', name: 'Sculpture', color: '#1f2937' },
                  { id: 'photography', name: 'Photography', color: '#0ea5e9' },
                  { id: 'digital', name: 'Digital Art', color: '#7c3aed' },
                  { id: 'street', name: 'Street Art', color: '#f59e0b' },
                  { id: 'minimalist', name: 'Minimalist', color: '#4b5563' },
                  { id: 'surrealist', name: 'Surrealist', color: '#ef4444' },
                  { id: 'landscape', name: 'Landscape', color: '#10b981' },
                  { id: 'portrait', name: 'Portrait', color: '#60a5fa' },
                  { id: 'miniature', name: 'Miniature', color: '#f59e0b' },
                  { id: 'expressionist', name: 'Expressionist', color: '#ef4444' },
                  { id: 'realism', name: 'Realism', color: '#10b981' },
                  { id: 'conceptual', name: 'Conceptual', color: '#0ea5e9' },
                ].map((cat) => {
                  const selected = selectedInterests.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedInterests((prev) =>
                          prev.includes(cat.id)
                            ? prev.filter((x) => x !== cat.id)
                            : [...prev, cat.id]
                        );
                      }}
                      style={[styles.categoryCard, selected && { borderColor: cat.color, backgroundColor: '#f9fafb' }]}
                    >
                      <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.categoryText, selected && { color: cat.color }]} numberOfLines={1}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                </View>
                {!!selectedInterests.length && (
                  <Text style={{ marginTop: 6, marginBottom: 10, color: '#111', fontWeight: '600', textAlign: 'center' }}>
                    {selectedInterests.length} selected
                  </Text>
                )}
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, gap: 10 }}>
                <TouchableOpacity
                  style={[styles.cancelButton, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}
                  onPress={() => setInterestsModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Maybe later</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { flex: 1, backgroundColor: '#A68C7B', opacity: selectedInterests.length ? 1 : 0.5, alignItems: 'center', justifyContent: 'center' }]}
                  disabled={!selectedInterests.length}
                  onPress={async () => {
                    const preferences = {
                      classicalArt: selectedInterests.includes('classical'),
                      contemporaryArt: selectedInterests.includes('contemporary'),
                      impressionist: selectedInterests.includes('impressionist'),
                      abstractArt: selectedInterests.includes('abstract'),
                      sculpture: selectedInterests.includes('sculpture'),
                      photography: selectedInterests.includes('photography'),
                      digitalArt: selectedInterests.includes('digital'),
                      streetArt: selectedInterests.includes('street'),
                      minimalist: selectedInterests.includes('minimalist'),
                      surrealist: selectedInterests.includes('surrealist'),
                      landscape: selectedInterests.includes('landscape'),
                      portrait: selectedInterests.includes('portrait'),
                      miniature: selectedInterests.includes('miniature'),
                      expressionist: selectedInterests.includes('expressionist'),
                      realism: selectedInterests.includes('realism'),
                      conceptual: selectedInterests.includes('conceptual'),
                    };
                    try {
                      const res = await fetch(`${API_BASE}/profile/saveArtPreferences`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`,
                        },
                        credentials: 'include',
                        body: JSON.stringify(preferences),
                      });
                      if (!res.ok) {
                        let errMsg = `Failed to save preferences (${res.status})`;
                        try {
                          const txt = await res.text();
                          try {
                            const j = txt ? JSON.parse(txt) : null;
                            if (j && (j.message || j.error)) errMsg = `${errMsg}: ${j.message || j.error}`;
                            else if (txt) errMsg = `${errMsg}: ${txt}`;
                          } catch {
                            if (txt) errMsg = `${errMsg}: ${txt}`;
                          }
                        } catch {}
                        throw new Error(errMsg);
                      }
                      setHasArtPreferences(true);
                      setInterestsModalVisible(false);
                    } catch (e) {
                      console.log('saveArtPreferences error:', e?.message || e);
                      alert(e?.message || 'Failed to save preferences');
                    }
                  }}
                >
                  <Text style={styles.saveButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
   
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  postOverlayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
  },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: 8 
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    shadowColor: 'black',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalInputBox: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 10 
  },
  modalInput: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 120,
    color: '#000',
  },
  previewImage: { 
    width: 90, 
    height: 90, 
    borderRadius: 12 
  },
  removeImageBtn: {
    position: 'absolute',
    top: 1,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    zIndex: 10,
  },
  addMoreBtn: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addPhotoText: { 
    color: 'black', 
    fontSize: 12, 
    marginTop: 4, 
    fontWeight: '600' 
  },
  postButton: { 
    backgroundColor: '#A68C7B', 
    paddingVertical: 12, 
    borderRadius: 25, 
    alignItems: 'center', 
    marginTop: 5 
  },
  postButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    marginHorizontal: 10,
    shadowColor: 'black',
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 5 
  },
  username: { 
    fontWeight: 'bold' 
  },
  description: { 
    marginBottom: 8 
  },
  timestamp: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  postImage: { 
    width: '100%', 
    height: 180, 
    borderRadius: 8, 
    marginBottom: 10 
  },
  actions: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8 
  },
  likeContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginRight: 12 
  },
  likeText: { 
    marginLeft: 4, 
    color: 'red' 
  },
  fullScreenContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.95)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  fullScreenImage: { 
    width: '100%', 
    height: '100%' 
  },
  commentBox: { 
    flexDirection: 'row', 
    padding: 10, 
    borderBottomWidth: 1, 
    borderColor: '#eee' 
  },
  commentTimestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
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
    marginBottom: 15,
  },
  imagePicker: { alignItems: "center", marginVertical: 10 },
  avatarEdit: { width: 90, height: 90, borderRadius: 45 },
  changePhotoText: {
    textAlign: "center",
    color: "#007BFF",
    marginTop: 5,
    marginBottom: 10,
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
    position: "relative",
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
    color: "#000",
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
  saveButtonText: { color: "#fff", fontWeight: "bold" },
  cancelButton: {
    backgroundColor: "#eee",
    paddingVertical: 8,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  cancelButtonText: { color: "black", fontWeight: "bold" },
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
    height: "100%",
  },
  eventCard: {
    shadowColor: 'black',
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 2,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  eventBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  eventMetaContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventMetaText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 6,
    flex: 1,
  },
  eventViewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
  },
  eventViewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginRight: 4,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  interestsBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    width: '48%',
    marginBottom: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
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
  uploadInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  uploadButton: {
    backgroundColor: '#A68C7B',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  postImageContainer: {
    position: 'relative',
    marginRight: 10,
    paddingTop: 10,
    paddingRight: 10,
  },
  postPreviewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  postRemoveBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 13,
  },
  postAddPhotoBtn: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#A68C7B',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  postAddPhotoText: {
    fontSize: 12,
    color: '#A68C7B',
    marginTop: 4,
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
  loadMoreButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A68C7B',
  },
  endOfFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  endOfFeedText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});


export default HomeScreen;