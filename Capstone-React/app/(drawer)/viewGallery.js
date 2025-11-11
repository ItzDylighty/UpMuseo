import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Image, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, RefreshControl, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from "../../supabase/supabaseClient";
import Header from '../components/Header';
import { useUser } from '../contexts/UserContext';

const API_BASE = "http://192.168.254.114:3000/api";
const API_ORIGIN = API_BASE.replace(/\/api$/, "");
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ViewGalleryScreen = () => {
  // Get user data from UserContext
  const { userData } = useUser();
  const role = userData?.role || null;
  const currentUserId = userData?.id || null;
  
  const { artworkId } = useLocalSearchParams();
  const router = useRouter();
  const [artwork, setArtwork] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [zoomImage, setZoomImage] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [artMenuVisible, setArtMenuVisible] = useState(false);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [totalCommentCount, setTotalCommentCount] = useState(0);
  
  // Comment menu state
  const [commentMenuForId, setCommentMenuForId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  
  // Edit modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMedium, setEditMedium] = useState('');
  const [editCategories, setEditCategories] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagesToRemove, setImagesToRemove] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  
  const categories = [
    'Classical Art', 'Abstract Art', 'Impressionist', 'Contemporary Art',
    'Digital Art', 'Photography', 'Sculpture', 'Street Art', 'Landscape',
    'Portrait', 'Surrealist', 'Minimalist', 'Expressionist', 'Realism', 'Conceptual'
  ];

  const loadSession = async () => {
    const { data } = await supabase.auth.getSession();
    // currentUserId now comes from UserContext - no need to set it
    return {
      at: data?.session?.access_token || null,
      rt: data?.session?.refresh_token || null,
    };
  };

  // Role now comes from UserContext - no need to fetch separately

  const handleEditArtwork = () => {
    setArtMenuVisible(false);
    if (!artwork) return;
    
    // Prepare existing images
    const artworkImages = artwork.image || [];
    const imageArray = Array.isArray(artworkImages) ? artworkImages : (artworkImages ? [artworkImages] : []);
    const resolvedImages = imageArray.map(img => resolveImageUrl(img));
    
    // Initialize edit form
    setEditTitle(artwork.title || '');
    setEditDescription(artwork.description || '');
    setEditMedium(artwork.medium || '');
    setEditCategories(artwork.categories || []);
    setExistingImages(resolvedImages);
    setNewImages([]);
    setImagesToRemove([]);
    setEditModalVisible(true);
  };
  
  const handleCategoryToggle = (category) => {
    setEditCategories(prev => 
      prev.includes(category)
        ? prev.filter(cat => cat !== category)
        : [...prev, category]
    );
  };
  
  const pickNewImages = async () => {
    const totalImages = existingImages.length + newImages.length;
    if (totalImages >= 5) {
      Alert.alert('Limit Reached', 'Maximum 5 images allowed');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });
    
    if (!result.canceled) {
      const remainingSlots = 5 - totalImages;
      const selectedImages = result.assets.slice(0, remainingSlots);
      setNewImages(prev => [...prev, ...selectedImages.map(asset => ({
        uri: asset.uri,
        id: Date.now() + Math.random()
      }))]);
    }
  };
  
  const removeExistingImage = (imageUrl) => {
    setExistingImages(prev => prev.filter(img => img !== imageUrl));
    setImagesToRemove(prev => [...prev, imageUrl]);
  };
  
  const removeNewImage = (imageId) => {
    setNewImages(prev => prev.filter(img => img.id !== imageId));
  };
  
  const submitEditArtwork = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!editDescription.trim()) {
      Alert.alert('Error', 'Description is required');
      return;
    }
    if (!editMedium.trim()) {
      Alert.alert('Error', 'Medium is required');
      return;
    }
    if (editCategories.length === 0) {
      Alert.alert('Error', 'Please select at least one category');
      return;
    }
    if (existingImages.length === 0 && newImages.length === 0) {
      Alert.alert('Error', 'Please keep at least one image or upload new ones');
      return;
    }
    
    setEditSubmitting(true);
    try {
      const { at, rt } = await loadSession();
      const formData = new FormData();
      
      formData.append('title', editTitle);
      formData.append('description', editDescription);
      formData.append('medium', editMedium);
      formData.append('categories', JSON.stringify(editCategories));
      
      // Add existing images
      existingImages.forEach(imageUrl => {
        formData.append('existingImages', imageUrl);
      });
      
      // Add new images
      newImages.forEach(imageObj => {
        formData.append('images', {
          uri: imageObj.uri,
          name: 'artwork.jpg',
          type: 'image/jpeg',
        });
      });
      
      // Add images to remove
      imagesToRemove.forEach(imageUrl => {
        formData.append('imagesToRemove', imageUrl);
      });
      
      const res = await fetch(`${API_BASE}/gallery/artwork/${artwork.id}`, {
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
      await fetchArtworkDetails();
    } catch (err) {
      console.error('Edit artwork error:', err);
      Alert.alert('Error', err.message || 'Failed to update artwork');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteArtwork = () => {
    setArtMenuVisible(false);
    Alert.alert(
      'Delete Artwork',
      'Are you sure you want to delete this artwork?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { at, rt } = await loadSession();
              const res = await fetch(`${API_BASE}/gallery/artwork/${artwork.id}`, {
                method: 'DELETE',
                headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
              });
              if (!res.ok) throw new Error('Delete failed');
              Alert.alert('Success', 'Artwork deleted successfully');
              router.back();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete artwork');
            }
          },
        },
      ]
    );
  };

  const handleReportArtwork = () => {
    Alert.alert(
      'Report Artwork',
      'Are you sure you want to report this artwork? Our team will review it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              const { at, rt } = await loadSession();
              const res = await fetch(`${API_BASE}/gallery/reportArtwork`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Cookie: `access_token=${at}; refresh_token=${rt}`,
                },
                body: JSON.stringify({ artworkId: artwork.id, reason: 'Inappropriate' }),
              });
              
              if (res.ok) {
                Alert.alert('Success', 'Artwork reported successfully. Our team will review it.');
              } else {
                Alert.alert('Error', 'Failed to report artwork. Please try again.');
              }
            } catch (err) {
              console.error('Report error:', err);
              Alert.alert('Error', 'Unable to send report right now.');
            }
          }
        }
      ]
    );
  };

  const fetchArtworkDetails = async () => {
    try {
      const { at, rt } = await loadSession();
      const res = await fetch(`${API_BASE}/gallery/artworks?page=1&limit=100`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      const data = await res.json();
      
      if (data.success && data.artworks) {
        // Try both string and number comparison
        const foundArtwork = data.artworks.find(art => 
          art.id === parseInt(artworkId) || art.id === artworkId || String(art.id) === String(artworkId)
        );
        
        if (foundArtwork) {
          setArtwork(foundArtwork);
          // Fetch stats for this artwork (don't await to avoid blocking)
          fetchLikes(foundArtwork.id);
          fetchViews(foundArtwork.id);
          trackView(foundArtwork.id);
        }
      }
    } catch (error) {
      console.error('Error fetching artwork:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikes = async (galleryArtId) => {
    try {
      const { at, rt } = await loadSession();
      const url = `${API_BASE}/gallery/react?galleryArtId=${galleryArtId}`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      
      if (!res.ok) {
        const text = await res.text();
        console.error('Likes API failed:', res.status, text);
        setLikeCount(0);
        setLiked(false);
        return;
      }
      
      const data = await res.json();
      
      // Backend returns { reactions: [...] }
      if (data.reactions) {
        const reactionCount = data.reactions.length;
        // Check if current user has reacted
        const currentUser = await supabase.auth.getUser();
        const currentUserId = currentUser.data?.user?.id;
        const userReacted = data.reactions.some(r => r.userId === currentUserId);
        setLikeCount(reactionCount);
        setLiked(userReacted);
      } else {
        setLikeCount(0);
        setLiked(false);
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
      setLikeCount(0);
      setLiked(false);
    }
  };

  const fetchViews = async (galleryArtId) => {
    try {
      const { at, rt } = await loadSession();
      const url = `${API_BASE}/gallery/views?galleryArtId=${galleryArtId}`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      
      if (!res.ok) {
        const text = await res.text();
        console.error('Views API failed:', res.status, text);
        setViewCount(0);
        return;
      }
      
      const data = await res.json();
      
      // Backend returns { viewCount: number }
      if (data.viewCount !== undefined) {
        setViewCount(data.viewCount);
      } else {
        setViewCount(0);
      }
    } catch (error) {
      console.error('Error fetching views:', error);
      setViewCount(0);
    }
  };

  const trackView = async (galleryArtId) => {
    try {
      const { at, rt } = await loadSession();
      await fetch(`${API_BASE}/gallery/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: `access_token=${at}; refresh_token=${rt}` },
        body: JSON.stringify({ galleryArtId }),
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const fetchComments = async (page = 1, append = false) => {
    try {
      if (!artworkId) return;
      
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMoreComments(true);
      }
      
      const { at, rt } = await loadSession();
      const url = `${API_BASE}/gallery/comments?galleryArtId=${artworkId}&page=${page}&limit=10`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      
      if (!res.ok) {
        const text = await res.text();
        console.error('Comments API failed:', res.status, text);
        if (!append) setComments([]);
        return;
      }
      
      const data = await res.json();
      
      // Backend returns { comments: [...], totalCount: number } or array directly
      const commentsArray = data.comments || (Array.isArray(data) ? data : []);
      const total = data.totalCount || data.total || data.count;
      
      if (append) {
        setComments(prev => [...prev, ...commentsArray]);
      } else {
        setComments(commentsArray);
        // Set total count only on first load
        if (total !== undefined) {
          setTotalCommentCount(total);
        } else {
          setTotalCommentCount(commentsArray.length);
        }
      }
      
      setCommentPage(page);
      setHasMoreComments(commentsArray.length >= 10);
    } catch (error) {
      console.error('Error fetching comments:', error);
      if (!append) setComments([]);
    } finally {
      setLoading(false);
      setLoadingMoreComments(false);
    }
  };
  
  const loadMoreComments = () => {
    if (!loadingMoreComments && hasMoreComments) {
      fetchComments(commentPage + 1, true);
    }
  };
  
  const showLessComments = () => {
    fetchComments(1, false);
  };

  useEffect(() => {
    if (artworkId) {
      fetchArtworkDetails();
      fetchComments();
      // Role now comes from UserContext automatically
    } else {
      setLoading(false);
      Alert.alert('Error', 'No artwork ID provided');
    }
  }, [artworkId]);

  const handleLike = async () => {
    if (!artwork) return;
    // Optimistic update
    const wasLiked = liked;
    const previousCount = likeCount;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    
    try {
      const { at, rt } = await loadSession();
      const res = await fetch(`${API_BASE}/gallery/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: `access_token=${at}; refresh_token=${rt}` },
        body: JSON.stringify({ galleryArtId: artwork.id }),
      });
      const data = await res.json();
      // Backend returns reaction object or removal confirmation
      if (res.ok) {
        // Refetch to get accurate count
        await fetchLikes(artwork.id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setLiked(wasLiked);
      setLikeCount(previousCount);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !artwork) return;
    setSubmittingComment(true);
    try {
      const { at, rt } = await loadSession();
      const res = await fetch(`${API_BASE}/gallery/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: `access_token=${at}; refresh_token=${rt}` },
        body: JSON.stringify({ 
          galleryArtId: artwork.id,
          content: newComment.trim()
        }),
      });
      const data = await res.json();
      // Check if response is successful (may return comment object directly)
      if (res.ok) {
        setNewComment('');
        // Refresh comments to show the new one
        await fetchComments();
      } else {
        Alert.alert('Error', data.error || data.message || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
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
    setEditCommentText(comment.comment || comment.text || '');
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
      const { at, rt } = await loadSession();
      const res = await fetch(`${API_BASE}/gallery/updateComment/${comment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
        },
        body: JSON.stringify({ text: newText }),
      });
      if (!res.ok) throw new Error('Failed to update comment');
      setComments(prev => prev.map(c => (
        c.id === comment.id ? { ...c, comment: newText, text: newText, updatedAt: new Date().toISOString() } : c
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

  const deleteGalleryComment = async (comment) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const { at, rt } = await loadSession();
            const res = await fetch(`${API_BASE}/gallery/deleteComment/${comment.id}`, {
              method: 'DELETE',
              headers: {
                Cookie: `access_token=${at}; refresh_token=${rt}`,
              },
            });
            if (!res.ok) throw new Error('Failed to delete');
            setComments(prev => prev.filter(c => c.id !== comment.id));
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

  const reportGalleryComment = async (comment) => {
    try {
      const { at, rt } = await loadSession();
      const res = await fetch(`${API_BASE}/gallery/reportComment`, {
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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchArtworkDetails(),
        fetchComments()
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const resolveImageUrl = (imageData) => {
    if (!imageData) return null;
    const imageUrl = Array.isArray(imageData) ? imageData[0] : imageData;
    if (!imageUrl) return null;
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${API_ORIGIN}${imageUrl}`;
    // Add cache busting parameter to force reload of watermarked images
    const separator = fullUrl.includes('?') ? '&' : '?';
    return `${fullUrl}${separator}_=${Date.now()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renderComment = (item) => {
    // Backend returns: { id, user: "Name", comment: "text", timestamp: "date", avatar: "url", userId }
    const userName = item.user || 'Anonymous';
    const commentText = item.comment || item.text || '';
    const commentDate = item.timestamp || item.datePosted || item.createdAt;
    const commentOwnerId = item.userId || item.user_id;
    const isOwnComment = currentUserId && commentOwnerId === currentUserId;
    
    return (
      <View style={styles.commentContainer} key={item.id}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.commentAvatar} />
        ) : (
          <View style={styles.commentAvatar} />
        )}
        <View style={{ flex: 1, position: 'relative' }}>
          <View style={styles.commentContent}>
            {/* Username and three-dot menu on same line */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.commentName}>{userName}</Text>
              <TouchableOpacity onPress={() => onOpenCommentMenu(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="ellipsis-horizontal" size={18} color="#777" />
              </TouchableOpacity>
            </View>

            {/* Date on next line */}
            <Text style={styles.commentDate}>{commentDate || 'N/A'}</Text>

            {/* Comment text or edit mode */}
            {editingCommentId === item.id ? (
              <View>
                <TextInput
                  style={{ marginTop: 8, fontSize: 14, color: '#333', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd' }}
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
              <Text style={[styles.commentText, { marginTop: 8 }]}>{commentText}</Text>
            )}
          </View>

          {/* Three-dot dropdown menu */}
          {commentMenuForId === item.id && (
            <View style={{ position: 'absolute', top: 30, right: 6, backgroundColor: '#fff', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5, overflow: 'hidden', width: 160, zIndex: 10 }}>
              {isOwnComment ? (
                <View>
                  <TouchableOpacity onPress={() => startEditComment(item)} style={{ paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="create-outline" size={18} color="#555" style={{ marginRight: 10 }} />
                    <Text style={{ color: '#333' }}>Edit</Text>
                  </TouchableOpacity>
                  <View style={{ height: 1, backgroundColor: '#eee' }} />
                  <TouchableOpacity onPress={() => deleteGalleryComment(item)} style={{ paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="trash-outline" size={18} color="#d9534f" style={{ marginRight: 10 }} />
                    <Text style={{ color: '#d9534f' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => reportGalleryComment(item)} style={{ paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="flag-outline" size={18} color="#555" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#333' }}>Report</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Gallery" showSearch={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A68C7B" />
        </View>
      </SafeAreaView>
    );
  }

  if (!artwork) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Gallery" showSearch={false} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#A68C7B" />
          <Text style={styles.errorText}>Artwork not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Gallery" showSearch={false} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
        enabled
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#A68C7B']}
              tintColor="#A68C7B"
            />
          }
        >
          {/* Artwork Image */}
          {(() => {
            // Handle both single image and array of images
            let imageArray = [];
            if (Array.isArray(artwork.image)) {
              imageArray = artwork.image;
            } else if (artwork.image) {
              imageArray = [artwork.image];
            } else if (Array.isArray(artwork.images)) {
              imageArray = artwork.images;
            } else if (artwork.images) {
              imageArray = [artwork.images];
            }
            
            const firstImageUrl = imageArray.length > 0 ? resolveImageUrl(imageArray[0]) : null;
            
            return firstImageUrl ? (
              <TouchableOpacity 
                style={styles.imageContainer} 
                onPress={() => {
                  setSelectedImages(imageArray.map(img => ({ uri: resolveImageUrl(img) })));
                  setCurrentImageIndex(0);
                  setZoomImage(true); // Just a flag to open modal
                }}
              >
                <Image
                  source={{ uri: firstImageUrl }}
                  style={styles.artworkImage}
                  defaultSource={require('../../assets/icon.png')}
                />
                {imageArray.length > 1 && (
                  <View style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                  }}>
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
                      1/{imageArray.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.imageContainer}>
                <View style={[styles.artworkImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="image-outline" size={64} color="#ccc" />
                  <Text style={{ color: '#999', marginTop: 8 }}>No image available</Text>
                </View>
              </View>
            );
          })()}

          {/* Title, Artist, and Menu */}
          <View style={styles.section}>
            {/* Row 1: Title and Menu */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.artworkTitle}>{artwork.title || 'Untitled'}</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {(() => {
                  // Get artwork owner ID - same logic as comments
                  const artworkOwnerId = artwork.userId || artwork.user_id;
                  const isOwnArtwork = currentUserId && artworkOwnerId && String(currentUserId) === String(artworkOwnerId);
                  const isAdmin = role === 'admin';
                  
                  return (
                    <>
                      {/* Three-dot Menu - show only for artwork owner or admin */}
                      {(isOwnArtwork || isAdmin) && (
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
                          onPress={handleEditArtwork}
                        >
                          <Ionicons name="pencil-outline" size={18} color="#555" />
                          <Text style={styles.menuItemText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#eee' }]}
                          onPress={handleDeleteArtwork}
                        >
                          <Ionicons name="trash-outline" size={18} color="#d9534f" />
                          <Text style={[styles.menuItemText, { color: '#d9534f' }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                      )}
                      
                      {/* Report button for other users' artwork */}
                      {!isOwnArtwork && !isAdmin && currentUserId && (
                        <TouchableOpacity 
                          onPress={handleReportArtwork}
                          style={{ padding: 8 }}
                        >
                          <Ionicons name="flag-outline" size={22} color="#555" />
                        </TouchableOpacity>
                      )}
                    </>
                  );
                })()}
              </View>
            </View>
            
            {/* Row 2: By Artist */}
            <Text style={styles.artistName}>by {artwork.artist || 'Unknown Artist'}</Text>
          </View>

          <View style={styles.separator} />

          {/* Details: Medium, Categories, Date */}
          <View style={styles.section}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Medium:</Text>
              <Text style={styles.detailValue}>{artwork.medium || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Categories:</Text>
              <Text style={styles.detailValue}>
                {Array.isArray(artwork.categories) ? artwork.categories.join(', ') : 'N/A'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date Added:</Text>
              <Text style={styles.detailValue}>{formatDate(artwork.datePosted)}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.descriptionText}>
              {artwork.description || 'No description available.'}
            </Text>
          </View>

          <View style={styles.separator} />

          {/* Stats: Heart, Views, Comments */}
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem} onPress={handleLike}>
              <Ionicons 
                name={liked ? 'heart' : 'heart-outline'} 
                size={24} 
                color={liked ? '#A68C7B' : '#666'} 
              />
              <Text style={styles.statText}>{likeCount}</Text>
            </TouchableOpacity>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={24} color="#666" />
              <Text style={styles.statText}>{viewCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={24} color="#666" />
              <Text style={styles.statText}>{(() => {
                const count = totalCommentCount > 0 ? totalCommentCount : comments.length;
                return count >= 10 ? '10+' : count;
              })()}</Text>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Comments Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comments {totalCommentCount > 0 ? `(${totalCommentCount >= 10 ? '10+' : totalCommentCount})` : ''}</Text>
            {comments.length === 0 ? (
              <View style={styles.emptyCommentsContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color="#A68C7B" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSubtext}>Be the first to comment!</Text>
              </View>
            ) : (
              <>
                {comments.map(renderComment)}
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
              </>
            )}
          </View>

          {/* Comment Input */}
          <View style={styles.commentInputSection}>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your thoughts about this artwork..."
              multiline
              value={newComment}
              onChangeText={setNewComment}
            />
            <TouchableOpacity 
              style={[styles.postCommentButton, submittingComment && styles.disabledButton]} 
              onPress={handlePostComment}
              disabled={submittingComment || !newComment.trim()}
            >
              <Text style={styles.postCommentButtonText}>
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Full-screen image modal with carousel */}
      <Modal
        visible={zoomImage !== null && selectedImages.length > 0}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setZoomImage(null);
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
              setZoomImage(null);
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
          <View style={styles.editModalOverlay}>
            <View style={styles.editModalContent}>
              {/* Header */}
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>Edit Artwork</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.editModalBody} showsVerticalScrollIndicator={false}>
                {/* Images Section */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.editLabel}>Images (Max 5)</Text>
                  
                  {/* Image Grid */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {/* Existing Images */}
                    {existingImages.map((imageUrl, index) => (
                      <View key={`existing-${index}`} style={styles.editImagePreview}>
                        <Image source={{ uri: imageUrl }} style={styles.editImagePreviewImage} />
                        <TouchableOpacity 
                          onPress={() => removeExistingImage(imageUrl)}
                          style={styles.editImageRemoveBtn}
                        >
                          <Ionicons name="close-circle" size={26} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    
                    {/* New Images */}
                    {newImages.map((imageObj) => (
                      <View key={imageObj.id} style={styles.editImagePreview}>
                        <Image source={{ uri: imageObj.uri }} style={styles.editImagePreviewImage} />
                        <TouchableOpacity 
                          onPress={() => removeNewImage(imageObj.id)}
                          style={styles.editImageRemoveBtn}
                        >
                          <Ionicons name="close-circle" size={26} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.editImageNewBadge}>
                          <Text style={{ color: '#fff', fontSize: 10 }}>NEW</Text>
                        </View>
                      </View>
                    ))}
                    
                    {/* Add Image Button */}
                    {(existingImages.length + newImages.length) < 5 && (
                      <TouchableOpacity onPress={pickNewImages} style={styles.editAddImageBtn}>
                        <Ionicons name="add" size={32} color="#A68C7B" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Title Input */}
                <Text style={styles.editLabel}>Title *</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="Enter artwork title"
                  value={editTitle}
                  onChangeText={setEditTitle}
                />

                {/* Medium Input */}
                <Text style={styles.editLabel}>Medium *</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="e.g., Oil on Canvas, Digital Art"
                  value={editMedium}
                  onChangeText={setEditMedium}
                />

                {/* Description Input */}
                <Text style={styles.editLabel}>Description *</Text>
                <TextInput
                  style={[styles.editInput, styles.editTextArea]}
                  placeholder="Describe your artwork..."
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={4}
                />

                {/* Categories */}
                <Text style={styles.editLabel}>Categories *</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category}
                      onPress={() => handleCategoryToggle(category)}
                      style={[
                        styles.editCategoryBtn,
                        editCategories.includes(category) && styles.editCategoryBtnActive
                      ]}
                    >
                      <Text style={[
                        styles.editCategoryBtnText,
                        editCategories.includes(category) && styles.editCategoryBtnTextActive
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Update Button */}
                <TouchableOpacity
                  style={[styles.editSubmitBtn, editSubmitting && { opacity: 0.6 }]}
                  onPress={submitEditArtwork}
                  disabled={editSubmitting}
                >
                  <Text style={styles.editSubmitBtnText}>
                    {editSubmitting ? 'Updating...' : 'Update Artwork'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 20 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#A68C7B',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#A68C7B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#f0f0f0',
  },
  artworkImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  artworkTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 16,
    color: '#A68C7B',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  descriptionText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
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
    marginTop: 16,
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
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  commentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
    flexShrink: 0,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  commentInputSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  commentInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  postCommentButton: {
    backgroundColor: '#A68C7B',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  postCommentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
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
  // Edit Modal Styles
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  editModalBody: {
    padding: 20,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  editInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 16,
  },
  editTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  editImagePreview: {
    width: 90,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
    paddingTop: 8,
    paddingRight: 8,
  },
  editImagePreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  editImageRemoveBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 13,
  },
  editImageNewBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#A68C7B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  editAddImageBtn: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#A68C7B',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  editCategoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A68C7B',
    backgroundColor: '#fff',
  },
  editCategoryBtnActive: {
    backgroundColor: '#A68C7B',
  },
  editCategoryBtnText: {
    fontSize: 13,
    color: '#A68C7B',
    fontWeight: '500',
  },
  editCategoryBtnTextActive: {
    color: '#fff',
  },
  editSubmitBtn: {
    backgroundColor: '#A68C7B',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  editSubmitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ViewGalleryScreen;
