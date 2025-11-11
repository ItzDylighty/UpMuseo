import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Image, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from "../../supabase/supabaseClient";
import Header from '../components/Header';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../contexts/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE = "http://192.168.254.114:3000/api";
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

const GalleryScreen = () => {
  // Get user data from UserContext
  const { userData } = useUser();
  const role = userData?.role || null;
  const insets = useSafeAreaInsets();
  
  const navigation = useNavigation();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [curatedArtworks, setCuratedArtworks] = useState([]);
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalArtworks, setTotalArtworks] = useState(0);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newArtwork, setNewArtwork] = useState({ title: '', medium: '', description: '', category: '', images: [], });
  const [applyWatermark, setApplyWatermark] = useState(true);
  const [watermarkText, setWatermarkText] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [userPreferences, setUserPreferences] = useState([]);
  const [recentlyAddedPage, setRecentlyAddedPage] = useState(0);
  const [curatedPage, setCuratedPage] = useState(0);
  const itemsPerPage = 6;

  const loadSession = async () => {
    const { data } = await supabase.auth.getSession();
    return {
      at: data?.session?.access_token || null,
      rt: data?.session?.refresh_token || null,
    };
  };

  const fetchCategories = async () => {
    try {
      const { at, rt } = await loadSession();
      const res = await fetch(`${API_BASE}/gallery/getCategories`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      const data = await res.json();
      if (data.success && data.categories) {
        const allCategory = { field: 'all', name: 'All', count: data.totalCount || 0 };
        setCategories([allCategory, ...data.categories]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchArtworks = async (categoryFilter = 'all') => {
    try {
      const { at, rt } = await loadSession();
      const queryParams = new URLSearchParams();
      if (categoryFilter !== 'all') {
        queryParams.append('categories', categoryFilter);
      }
      queryParams.append('page', '1');
      queryParams.append('limit', '100');
      
      const res = await fetch(`${API_BASE}/gallery/artworks?${queryParams}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      const data = await res.json();
      
      if (data.success && data.artworks) {
        // Curated Collection: Featured artworks first, then remaining artworks
        const featured = data.artworks.filter(art => art.featured === true);
        const nonFeatured = data.artworks.filter(art => art.featured !== true);
        setCuratedArtworks(featured.length > 0 ? [...featured, ...nonFeatured] : data.artworks);
        
        // Recently Added: Latest artworks (using datePosted from controller)
        const sorted = [...data.artworks].sort((a, b) => 
          new Date(b.datePosted || 0) - new Date(a.datePosted || 0)
        );
        setRecentlyAdded(sorted);
        
        // Store total count
        setTotalArtworks(data.totalCount || data.artworks.length);
      }
    } catch (error) {
      console.error('Error fetching artworks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPreferences = async () => {
    try {
      const { at, rt } = await loadSession();
      const res = await fetch(`${API_BASE}/gallery/getArtPreference`, {
        method: 'GET',
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.preferences && Array.isArray(data.preferences)) {
          setUserPreferences(data.preferences);
        }
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  };

  // Role now comes from UserContext - no need to fetch separately

  useEffect(() => {
    fetchCategories();
    fetchArtworks();
    fetchUserPreferences();
  }, []);

  const handleCategoryChange = (categoryField, categoryName) => {
    setSelectedCategory(categoryField);
    setLoading(true);
    // Reset pagination when changing categories
    setRecentlyAddedPage(0);
    setCuratedPage(0);
    // If "All" is selected, send 'all', otherwise send the category name
    const filterValue = categoryField === 'all' ? 'all' : categoryName;
    fetchArtworks(filterValue);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Reset pagination on refresh
    setRecentlyAddedPage(0);
    setCuratedPage(0);
    try {
      await Promise.all([
        fetchCategories(),
        fetchArtworks(selectedCategory === 'all' ? 'all' : categories.find(c => c.field === selectedCategory)?.name)
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const resolveImageUrl = (imageData) => {
    if (!imageData) return null;
    // Handle array of images (get first image)
    const imageUrl = Array.isArray(imageData) ? imageData[0] : imageData;
    if (!imageUrl) return null;
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${API_ORIGIN}${imageUrl}`;
    // Add cache busting parameter to force reload of watermarked images
    const separator = fullUrl.includes('?') ? '&' : '?';
    return `${fullUrl}${separator}_=${Date.now()}`;
  };

  const pickImages = async () => {
    const currentImageCount = newArtwork.images.length;
    if (currentImageCount >= 5) {
      Alert.alert('Limit Reached', 'Maximum 5 images allowed');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const remainingSlots = 5 - currentImageCount;
      const selectedImages = result.assets.slice(0, remainingSlots);
      setNewArtwork({ ...newArtwork, images: [...newArtwork.images, ...selectedImages] });
    }
  };

  const removeImageFromUpload = (index) => {
    setNewArtwork({
      ...newArtwork,
      images: newArtwork.images.filter((_, i) => i !== index)
    });
  };

  const handleUpload = async () => {
    if (!newArtwork.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!newArtwork.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!newArtwork.medium.trim()) {
      Alert.alert('Error', 'Please enter a medium');
      return;
    }
    if (!newArtwork.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (newArtwork.images.length === 0) {
      Alert.alert('Error', 'Please select at least one image');
      return;
    }

    try {
      setUploading(true);
      const { at, rt } = await loadSession();
      
      // Create FormData for image upload
      const formData = new FormData();
      formData.append('title', newArtwork.title.trim());
      formData.append('medium', newArtwork.medium.trim());
      formData.append('description', newArtwork.description.trim());
      // Backend expects 'categories' as a JSON array string
      formData.append('categories', JSON.stringify([newArtwork.category]));
      
      // Watermark settings
      formData.append('applyWatermark', applyWatermark.toString());
      if (watermarkText.trim()) {
        formData.append('watermarkText', watermarkText.trim());
      }
      // Add multiple image files - backend expects 'images' field
      newArtwork.images.forEach((imageAsset) => {
        const imageUri = Platform.OS === 'android' ? imageAsset.uri : imageAsset.uri.replace('file://', '');
        const filename = imageUri.split('/').pop();
        const match = /\.([\w]+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('images', {
          uri: imageUri,
          name: filename,
          type: type,
        });
      });

      console.log('Uploading to:', `${API_BASE}/gallery/upload`);
      console.log('Form data:', {
        title: newArtwork.title,
        medium: newArtwork.medium,
        description: newArtwork.description,
        category: newArtwork.category,
        imageCount: newArtwork.images.length,
        applyWatermark: applyWatermark,
      });

      const res = await fetch(`${API_BASE}/gallery/upload`, {
        method: 'POST',
        headers: {
          'Cookie': `access_token=${at}; refresh_token=${rt}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      console.log('Response status:', res.status);
      const responseText = await res.text();
      console.log('Response text:', responseText);

      if (res.ok) {
        Alert.alert('Success', 'Artwork uploaded successfully!');
        setUploadModalVisible(false);
        setNewArtwork({ title: '', medium: '', description: '', category: '', images: [] });
        await fetchArtworks(selectedCategory === 'all' ? 'all' : categories.find(c => c.field === selectedCategory)?.name);
        await fetchCategories();
      } else {
        let errorMessage = 'Failed to upload artwork';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.message || error.error || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Upload failed:', errorMessage);
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', `Failed to upload artwork: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const renderArtworkCard = (item) => (
    <TouchableOpacity 
      style={styles.card} 
      key={item.id}
      onPress={() => {
        router.push({ pathname: 'viewGallery', params: { artworkId: item.id } });
      }}
    >
      <Image 
        source={{ uri: resolveImageUrl(item.image), cache: 'reload' }} 
        style={styles.cardImage}
        defaultSource={require('../../assets/icon.png')}
      />
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
      <Text style={styles.cardAuthor} numberOfLines={1}>by {item.artist || 'Unknown Artist'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Gallery" showSearch={false} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#A68C7B']}
            tintColor="#A68C7B"
          />
        }
      >
        {/* Filter Collection (Categories) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Filter Collection</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {categories.map((category) => {
              const isPreferred = userPreferences.includes(category.field) || userPreferences.includes(category.name);
              return (
                <TouchableOpacity
                  key={category.field}
                  style={[
                    styles.filterChip,
                    selectedCategory === category.field && styles.filterChipActive,
                    isPreferred && selectedCategory !== category.field && styles.filterChipPreferred
                  ]}
                  onPress={() => handleCategoryChange(category.field, category.name)}
                >
                  {isPreferred && (
                    <Ionicons name="star" size={14} color="#FFD700" style={{ marginRight: 4 }} />
                  )}
                  <Text style={[
                    styles.filterChipText,
                    selectedCategory === category.field && styles.filterChipTextActive,
                    isPreferred && selectedCategory !== category.field && styles.filterChipTextPreferred
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A68C7B" />
          </View>
        ) : (
          <>
            {/* Empty State */}
            {recentlyAdded.length === 0 && curatedArtworks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="image-outline" size={64} color="#A68C7B" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyTitle}>No Artworks Found</Text>
                <Text style={styles.emptyMessage}>
                  There are no artworks in this category yet.
                </Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => handleCategoryChange('all', 'All')}
                >
                  <Text style={styles.emptyButtonText}>View All Artworks</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Recently Added */}
                {recentlyAdded.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Recently Added</Text>
                      <Text style={styles.sectionCount}>
                        {Math.min((recentlyAddedPage + 1) * itemsPerPage, recentlyAdded.length)} of {recentlyAdded.length}
                      </Text>
                    </View>
                    <View style={styles.cardGrid}>
                      {recentlyAdded
                        .slice(recentlyAddedPage * itemsPerPage, (recentlyAddedPage + 1) * itemsPerPage)
                        .map(renderArtworkCard)}
                    </View>
                    {recentlyAdded.length > itemsPerPage && (
                      <View style={styles.paginationContainer}>
                        <TouchableOpacity
                          style={[styles.paginationButton, recentlyAddedPage === 0 && styles.paginationButtonDisabled]}
                          onPress={() => setRecentlyAddedPage(prev => Math.max(0, prev - 1))}
                          disabled={recentlyAddedPage === 0}
                        >
                          <Ionicons name="chevron-back" size={20} color={recentlyAddedPage === 0 ? '#ccc' : '#A68C7B'} />
                        </TouchableOpacity>
                        <View style={styles.paginationDots}>
                          {Array.from({ length: Math.ceil(recentlyAdded.length / itemsPerPage) }).map((_, index) => (
                            <View
                              key={index}
                              style={[
                                styles.paginationDot,
                                index === recentlyAddedPage && styles.paginationDotActive
                              ]}
                            />
                          ))}
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.paginationButton,
                            recentlyAddedPage >= Math.ceil(recentlyAdded.length / itemsPerPage) - 1 && styles.paginationButtonDisabled
                          ]}
                          onPress={() => setRecentlyAddedPage(prev => 
                            Math.min(Math.ceil(recentlyAdded.length / itemsPerPage) - 1, prev + 1)
                          )}
                          disabled={recentlyAddedPage >= Math.ceil(recentlyAdded.length / itemsPerPage) - 1}
                        >
                          <Ionicons 
                            name="chevron-forward" 
                            size={20} 
                            color={recentlyAddedPage >= Math.ceil(recentlyAdded.length / itemsPerPage) - 1 ? '#ccc' : '#A68C7B'} 
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* Curated Collection */}
                {curatedArtworks.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Curated Collection</Text>
                      <Text style={styles.sectionCount}>
                        {Math.min((curatedPage + 1) * itemsPerPage, curatedArtworks.length)} of {curatedArtworks.length}
                      </Text>
                    </View>
                    <View style={styles.cardGrid}>
                      {curatedArtworks
                        .slice(curatedPage * itemsPerPage, (curatedPage + 1) * itemsPerPage)
                        .map(renderArtworkCard)}
                    </View>
                    {curatedArtworks.length > itemsPerPage && (
                      <View style={styles.paginationContainer}>
                        <TouchableOpacity
                          style={[styles.paginationButton, curatedPage === 0 && styles.paginationButtonDisabled]}
                          onPress={() => setCuratedPage(prev => Math.max(0, prev - 1))}
                          disabled={curatedPage === 0}
                        >
                          <Ionicons name="chevron-back" size={20} color={curatedPage === 0 ? '#ccc' : '#A68C7B'} />
                        </TouchableOpacity>
                        <View style={styles.paginationDots}>
                          {Array.from({ length: Math.ceil(curatedArtworks.length / itemsPerPage) }).map((_, index) => (
                            <View
                              key={index}
                              style={[
                                styles.paginationDot,
                                index === curatedPage && styles.paginationDotActive
                              ]}
                            />
                          ))}
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.paginationButton,
                            curatedPage >= Math.ceil(curatedArtworks.length / itemsPerPage) - 1 && styles.paginationButtonDisabled
                          ]}
                          onPress={() => setCuratedPage(prev => 
                            Math.min(Math.ceil(curatedArtworks.length / itemsPerPage) - 1, prev + 1)
                          )}
                          disabled={curatedPage >= Math.ceil(curatedArtworks.length / itemsPerPage) - 1}
                        >
                          <Ionicons 
                            name="chevron-forward" 
                            size={20} 
                            color={curatedPage >= Math.ceil(curatedArtworks.length / itemsPerPage) - 1 ? '#ccc' : '#A68C7B'} 
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
                
                {/* Gallery Collection Info */}
                <View style={styles.galleryHeader}>
                  <Text style={styles.galleryHeaderTitle}>Gallery Collection</Text>
                  <Text style={styles.galleryHeaderDescription}>
                    Featuring {totalArtworks} carefully curated masterpieces spanning multiple centuries and artistic movements. Each piece represents a significant moment in art history, from classical Renaissance works to modern abstract expressions.
                  </Text>
                </View>

                {/* End of Collection Message */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                </View>
                <View style={styles.endOfCollection}>
                  <Ionicons name="checkmark-circle" size={48} color="#A68C7B" />
                  <Text style={styles.endTitle}>You've reached the end of the collection</Text>
                  <Text style={styles.endMessage}>Showing all {totalArtworks} {totalArtworks === 1 ? 'artwork' : 'artworks'}</Text>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Add Button - Only for Artists & Admins */}
      {(role === 'artist' || role === 'admin') && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 30 }]}
          onPress={() => setUploadModalVisible(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Upload Modal */}
      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload Artwork</Text>
                <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Image Picker */}
              <View style={styles.imagesSection}>
                <Text style={styles.inputLabel}>Images * (Max 5)</Text>
                <TouchableOpacity 
                  style={styles.addImageButton} 
                  onPress={pickImages}
                  disabled={newArtwork.images.length >= 5}
                >
                  <Ionicons name="add-circle-outline" size={24} color={newArtwork.images.length >= 5 ? "#ccc" : "#A68C7B"} />
                  <Text style={[styles.addImageText, newArtwork.images.length >= 5 && { color: '#ccc' }]}>
                    {newArtwork.images.length === 0 ? 'Add Images' : `Add More (${newArtwork.images.length}/5)`}
                  </Text>
                </TouchableOpacity>
                
                {/* Display selected images */}
                {newArtwork.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesPreview}>
                    {newArtwork.images.map((img, idx) => (
                      <View key={idx} style={styles.imagePreviewContainer}>
                        <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                        <TouchableOpacity 
                          style={styles.removeImageButton}
                          onPress={() => removeImageFromUpload(idx)}
                        >
                          <Ionicons name="close-circle" size={26} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Title Input */}
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter artwork title"
                value={newArtwork.title}
                onChangeText={(text) => setNewArtwork({ ...newArtwork, title: text })}
              />

              {/* Medium Input */}
              <Text style={styles.inputLabel}>Medium *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Oil, Digital, Watercolor"
                value={newArtwork.medium}
                onChangeText={(text) => setNewArtwork({ ...newArtwork, medium: text })}
              />

              {/* Description Input */}
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter description"
                value={newArtwork.description}
                onChangeText={(text) => setNewArtwork({ ...newArtwork, description: text })}
                multiline
                numberOfLines={4}
              />

              {/* Watermark Section */}
              <View style={styles.watermarkSection}>
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setApplyWatermark(!applyWatermark)}
                >
                  <Ionicons 
                    name={applyWatermark ? 'checkbox' : 'square-outline'} 
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

                {applyWatermark && (
                  <View style={styles.watermarkInputContainer}>
                    <Text style={styles.watermarkInputLabel}>
                      Custom watermark text (optional)
                    </Text>
                    <TextInput
                      style={styles.watermarkInput}
                      placeholder={`© Your Name ${new Date().getFullYear()} • Museo`}
                      value={watermarkText}
                      onChangeText={setWatermarkText}
                    />
                    <Text style={styles.watermarkHint}>
                      Leave blank to use default watermark
                    </Text>
                  </View>
                )}
              </View>

              {/* Category Selector */}
              <Text style={styles.inputLabel}>Category *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                <Text style={{ color: newArtwork.category ? '#000' : '#999' }}>
                  {newArtwork.category || 'Select category'}
                </Text>
                <Ionicons
                  name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#555"
                  style={{ position: 'absolute', right: 12, top: 12 }}
                />
              </TouchableOpacity>
              {showCategoryDropdown && (
                <View style={styles.categoryDropdown}>
                  <ScrollView style={{ maxHeight: 200 }}>
                    {categories
                      .filter(cat => cat.field !== 'all')
                      .map((cat) => (
                        <TouchableOpacity
                          key={cat.field}
                          style={styles.categoryItem}
                          onPress={() => {
                            setNewArtwork({ ...newArtwork, category: cat.name });
                            setShowCategoryDropdown(false);
                          }}
                        >
                          <Text style={styles.categoryItemText}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}

              {/* Upload Button */}
              <TouchableOpacity
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={handleUpload}
                disabled={uploading}
              >
                <Text style={styles.uploadButtonText}>
                  {uploading ? 'Uploading...' : 'Upload Artwork'}
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
  galleryHeader: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  galleryHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#A68C7B',
    textAlign: 'center',
    marginBottom: 12,
  },
  galleryHeaderDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  filterScroll: {
    paddingHorizontal: 15,
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
  filterChipPreferred: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterChipTextPreferred: {
    color: '#B8860B',
    fontWeight: '700',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 15,
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  cardAuthor: {
    fontSize: 12,
    color: '#A68C7B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#A68C7B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    paddingHorizontal: 30,
    marginTop: 20,
    marginBottom: 10,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  endOfCollection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  endTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  endMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#A68C7B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  modalBody: {
    padding: 20,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#A68C7B',
    borderStyle: 'dashed',
    marginBottom: 20,
    overflow: 'hidden',
  },
  imagePickerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  imagePickerText: {
    marginTop: 10,
    fontSize: 14,
    color: '#A68C7B',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  textArea: {
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
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paginationButtonDisabled: {
    backgroundColor: '#fafafa',
    borderColor: '#f0f0f0',
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#A68C7B',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  imagesSection: {
    marginBottom: 20,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#A68C7B',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
  },
  addImageText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#A68C7B',
    fontWeight: '600',
  },
  imagesPreview: {
    flexDirection: 'row',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
    paddingTop: 10,
    paddingRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 13,
  },
});

export default GalleryScreen;
