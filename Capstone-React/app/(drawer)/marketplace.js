import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Image, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../supabase/supabaseClient';
import Header from '../components/Header';
import ProductDetailModal from '../components/ProductDetailModal';
import { useUser } from '../contexts/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE = "http://192.168.254.114:3000/api";

const MarketplaceScreen = () => {
  // Get user data from UserContext
  const { userData } = useUser();
  const insets = useSafeAreaInsets();

  const navigation = useNavigation();
  const router = useRouter();
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [listingType, setListingType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [artworkType, setArtworkType] = useState({
    original: false,
    limited: false,
    open: false,
  });
  const [sortBy, setSortBy] = useState('newest');
  
  // Dropdown states
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Cart & Product states
  const [showCart, setShowCart] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [allItems, setAllItems] = useState([]); // Store all items for pagination
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Master collapse for entire Quick Actions section
  const [showQuickActions, setShowQuickActions] = useState(true);
  
  // Toggle entire Quick Actions section
  const toggleQuickActions = () => {
    setShowQuickActions(!showQuickActions);
  };

  // Update cart quantity
  const updateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      await removeItem(cartItemId);
      return;
    }
    
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      
      const response = await fetch(`${API_BASE}/marketplace/cart/${cartItemId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
        body: JSON.stringify({ quantity: newQuantity })
      });

      if (response.ok) {
        await fetchCart();
      } else {
        Alert.alert('Error', 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity');
    }
  };

  // Remove item from cart
  const removeItem = async (cartItemId) => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      
      const response = await fetch(`${API_BASE}/marketplace/cart/${cartItemId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      if (response.ok) {
        await fetchCart();
        Alert.alert('Success', 'Item removed from cart');
      } else {
        Alert.alert('Error', 'Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      Alert.alert('Error', 'Failed to remove item');
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Fetch marketplace items from API
  const fetchMarketplaceItems = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      
      const response = await fetch(`${API_BASE}/marketplace/items`, {
        method: 'GET',
        credentials: 'include',
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
      });

      if (response.ok) {
        const result = await response.json();
        let items = result.data || [];
        
        // Apply filters and sorting
        if (selectedCategory !== 'all') {
          items = items.filter(item => item.medium?.toLowerCase() === selectedCategory.toLowerCase());
        }
        if (listingType !== 'all') {
          items = items.filter(item => item.listingType === listingType);
        }
        
        // Filter by price range (matching web behavior)
        items = items.filter(item => 
          item.price >= 0 && item.price <= 10000
        );
        
        // Sort
        switch (sortBy) {
          case 'price-low':
            items.sort((a, b) => a.price - b.price);
            break;
          case 'price-high':
            break;
          case 'newest':
            items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            break;
          case 'popular':
            items.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
          default:
            break;
        }
        
        setAllItems(items);
        setCurrentPage(1); // Reset to first page
        // Set initial page items
        setMarketplaceItems(items.slice(0, itemsPerPage));
      } else {
        console.error('Failed to fetch marketplace items');
      }
    } catch (error) {
      console.error('Error fetching marketplace items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, listingType, sortBy]);
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    fetchMarketplaceItems(true);
    fetchCart();
  }, [fetchMarketplaceItems]);
  
  // Calculate total pages
  const totalPages = Math.ceil(allItems.length / itemsPerPage);
  
  // Handle page change
  const goToPage = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    
    setCurrentPage(pageNumber);
    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setMarketplaceItems(allItems.slice(startIndex, endIndex));
  };
  
  // Update items when page changes
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setMarketplaceItems(allItems.slice(startIndex, endIndex));
  }, [currentPage, allItems]);

  // Fetch cart
  const fetchCart = useCallback(async () => {
    if (!userData) return; // Don't fetch if no user logged in
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      const userId = data?.session?.user?.id;
      
      if (!userId) {
        console.log('No user ID, skipping cart fetch');
        return;
      }
      
      const response = await fetch(`${API_BASE}/marketplace/cart`, {
        method: 'GET',
        credentials: 'include',
        headers: { 
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        
        // Ensure we only get items for the current user
        if (result.data && result.data.items) {
          const transformedCart = result.data.items.map(item => ({
            cartItemId: item.cartItemId,
            quantity: item.quantity,
            marketItemId: item.marketplace_items?.marketItemId,
            title: item.marketplace_items?.title || 'Unknown Item',
            price: item.marketplace_items?.price || 0,
            primary_image: item.marketplace_items?.images?.[0] || null,
            sellerName: item.marketplace_items?.sellerProfiles?.shopName || 'Unknown',
            stock: item.marketplace_items?.quantity || 0,
          }));
          setCartItems(transformedCart);
        } else {
          setCartItems([]);
        }
      } else {
        console.error('Cart fetch failed:', response.status);
        setCartItems([]);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCartItems([]);
    }
  }, [userData]);

  // Add to cart
  const handleAddToCart = async (item, quantityToAdd = 1) => {
    if (!userData) {
      Alert.alert('Login Required', 'Please login to add items to cart');
      return;
    }
    
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      const userId = data?.session?.user?.id;
      
      if (!userId) {
        Alert.alert('Error', 'User session expired. Please login again.');
        return;
      }
      
      const response = await fetch(`${API_BASE}/marketplace/cart/add`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
        body: JSON.stringify({
          marketplace_item_id: item.marketItemId || item.id,
          quantity: quantityToAdd
        })
      });

      const result = await response.json();

      if (response.ok) {
        await fetchCart();
        setShowCart(true);
        Alert.alert('Success', 'Item added to cart!');
      } else {
        Alert.alert('Error', result.error || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
    }
  };

  // Handle place bid
  const handlePlaceBid = (item, bidAmount) => {
    Alert.alert(
      'Bid Placed',
      `Your sealed bid of $${bidAmount} has been placed successfully!\n\nYou will be notified when the auction ends.`,
      [{ text: 'OK' }]
    );
  };

  // Handle buy now
  const handleBuyNow = async (item, quantityToAdd = 1) => {
    if (!userData) {
      Alert.alert('Login Required', 'Please login to continue');
      return;
    }
    
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';
      const userId = data?.session?.user?.id;
      
      if (!userId) {
        Alert.alert('Error', 'User session expired. Please login again.');
        return;
      }
      
      // Add to cart first
      const response = await fetch(`${API_BASE}/marketplace/cart/add`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
        body: JSON.stringify({
          marketplace_item_id: item.marketItemId || item.id,
          quantity: quantityToAdd
        })
      });

      const result = await response.json();

      if (response.ok) {
        await fetchCart();
        setShowCart(true);
        Alert.alert('Success', 'Item added to cart!', [
          {
            text: 'OK'
          }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error with buy now:', error);
      Alert.alert('Error', 'Failed to process request. Please try again.');
    }
  };

  useEffect(() => {
    fetchMarketplaceItems();
    if (userData) {
      fetchCart();
    }
  }, [fetchMarketplaceItems, fetchCart, userData]);

  useFocusEffect(
    useCallback(() => {
      fetchMarketplaceItems();
      if (userData) {
        fetchCart();
      }
    }, [fetchMarketplaceItems, fetchCart, userData])
  );

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'painting', name: 'Paintings' },
    { id: 'sculpture', name: 'Sculptures' },
    { id: 'photography', name: 'Photography' },
    { id: 'digital', name: 'Digital Art' },
    { id: 'prints', name: 'Prints & Posters' },
    { id: 'mixed', name: 'Mixed Media' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Reusable Header */}
      <Header title="Marketplace" showSearch={false} />

      {/* Search Bar + Filter Button + Seller Dashboard */}
      <View style={styles.searchToolbar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artworks, artists..."
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={22} color="#A68C7B" />
        </TouchableOpacity>
      </View>

      {/* Quick Action Buttons - Collapsible */}
      <View style={styles.quickActionsWrapper}>
        {/* Master Collapse Header */}
        <TouchableOpacity 
          style={styles.masterCollapseHeader}
          onPress={toggleQuickActions}
        >
          <View style={styles.masterHeaderContent}>
            <Ionicons name="flash-outline" size={18} color="#A68C7B" />
            <Text style={styles.masterHeaderText}>Quick Actions</Text>
          </View>
          <Ionicons 
            name={showQuickActions ? "chevron-up" : "chevron-down"} 
            size={18} 
            color="#A68C7B" 
          />
        </TouchableOpacity>

        {/* Collapsible Content */}
        {showQuickActions && (
          <View style={styles.quickActionsContainer}>
            {/* My Orders Button */}
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push('/(drawer)/myOrders')}
            >
              <Ionicons name="receipt-outline" size={20} color="#A68C7B" />
              <Text style={styles.quickActionText}>My Orders</Text>
              <Ionicons name="chevron-forward" size={20} color="#A68C7B" />
            </TouchableOpacity>

            {/* Seller Dashboard Button - For sellers only */}
            {userData?.isSeller && (
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => router.push('/(drawer)/sellerDashboard')}
              >
                <Ionicons name="storefront-outline" size={20} color="#A68C7B" />
                <Text style={styles.quickActionText}>Seller Dashboard</Text>
                <Ionicons name="chevron-forward" size={20} color="#A68C7B" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Scrollable Content - Dynamic Marketplace Grid */}
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A68C7B" />
            <Text style={styles.loadingText}>Loading artworks...</Text>
          </View>
        ) : marketplaceItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Artworks Found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters or check back later</Text>
          </View>
        ) : (
          <>
            <View style={styles.cardGrid}>
              {marketplaceItems.map((item) => (
                <MarketplaceCard
                  key={item.marketItemId || item.id}
                  item={item}
                  onPress={() => {
                    setSelectedProduct(item);
                    setShowProductModal(true);
                  }}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </View>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                {/* Previous Button */}
                <TouchableOpacity
                  style={[styles.paginationBtn, currentPage === 1 && styles.paginationBtnDisabled]}
                  onPress={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#ccc' : '#A68C7B'} />
                </TouchableOpacity>

                {/* Page Numbers */}
                <View style={styles.pageNumbers}>
                  {/* First page */}
                  {currentPage > 2 && (
                    <>
                      <TouchableOpacity style={styles.pageBtn} onPress={() => goToPage(1)}>
                        <Text style={styles.pageText}>1</Text>
                      </TouchableOpacity>
                      {currentPage > 3 && <Text style={styles.pageDots}>...</Text>}
                    </>
                  )}

                  {/* Previous page */}
                  {currentPage > 1 && (
                    <TouchableOpacity style={styles.pageBtn} onPress={() => goToPage(currentPage - 1)}>
                      <Text style={styles.pageText}>{currentPage - 1}</Text>
                    </TouchableOpacity>
                  )}

                  {/* Current page */}
                  <View style={[styles.pageBtn, styles.pageBtnActive]}>
                    <Text style={styles.pageTextActive}>{currentPage}</Text>
                  </View>

                  {/* Next page */}
                  {currentPage < totalPages && (
                    <TouchableOpacity style={styles.pageBtn} onPress={() => goToPage(currentPage + 1)}>
                      <Text style={styles.pageText}>{currentPage + 1}</Text>
                    </TouchableOpacity>
                  )}

                  {/* Last page */}
                  {currentPage < totalPages - 1 && (
                    <>
                      {currentPage < totalPages - 2 && <Text style={styles.pageDots}>...</Text>}
                      <TouchableOpacity style={styles.pageBtn} onPress={() => goToPage(totalPages)}>
                        <Text style={styles.pageText}>{totalPages}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Next Button */}
                <TouchableOpacity
                  style={[styles.paginationBtn, currentPage === totalPages && styles.paginationBtnDisabled]}
                  onPress={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#ccc' : '#A68C7B'} />
                </TouchableOpacity>
              </View>
            )}

            {/* Page Info */}
            {allItems.length > 0 && (
              <View style={styles.pageInfo}>
                <Text style={styles.pageInfoText}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, allItems.length)} of {allItems.length} items
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterScrollView} showsVerticalScrollIndicator={false}>
              {/* Sort By - Dropdown */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Sort By</Text>
                <TouchableOpacity 
                  style={styles.dropdown}
                  onPress={() => setShowSortDropdown(!showSortDropdown)}
                >
                  <Text style={styles.dropdownText}>
                    {sortBy === 'newest' && 'Newest First'}
                    {sortBy === 'price-low' && 'Price: Low to High'}
                    {sortBy === 'price-high' && 'Price: High to Low'}
                    {sortBy === 'popular' && 'Most Popular'}
                  </Text>
                  <Ionicons 
                    name={showSortDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
                
                {/* Sort Options List */}
                {showSortDropdown && (
                  <View style={styles.dropdownOptions}>
                    <TouchableOpacity 
                      style={[styles.dropdownOption, sortBy === 'newest' && styles.dropdownOptionActive]}
                      onPress={() => { setSortBy('newest'); setShowSortDropdown(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, sortBy === 'newest' && styles.dropdownOptionTextActive]}>
                        Newest First
                      </Text>
                      {sortBy === 'newest' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.dropdownOption, sortBy === 'price-low' && styles.dropdownOptionActive]}
                      onPress={() => { setSortBy('price-low'); setShowSortDropdown(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, sortBy === 'price-low' && styles.dropdownOptionTextActive]}>
                        Price: Low to High
                      </Text>
                      {sortBy === 'price-low' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.dropdownOption, sortBy === 'price-high' && styles.dropdownOptionActive]}
                      onPress={() => { setSortBy('price-high'); setShowSortDropdown(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, sortBy === 'price-high' && styles.dropdownOptionTextActive]}>
                        Price: High to Low
                      </Text>
                      {sortBy === 'price-high' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.dropdownOption, sortBy === 'popular' && styles.dropdownOptionActive]}
                      onPress={() => { setSortBy('popular'); setShowSortDropdown(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, sortBy === 'popular' && styles.dropdownOptionTextActive]}>
                        Most Popular
                      </Text>
                      {sortBy === 'popular' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Listing Type */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Listing Type</Text>
                <View style={styles.listingTypes}>
                  <TouchableOpacity
                    style={[styles.listingTypeBtn, listingType === 'all' && styles.listingTypeBtnActive]}
                    onPress={() => setListingType('all')}
                  >
                    <Ionicons name="grid-outline" size={20} color={listingType === 'all' ? '#fff' : '#666'} />
                    <Text style={[styles.listingTypeText, listingType === 'all' && styles.listingTypeTextActive]}>
                      All Listings
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.listingTypeBtn, listingType === 'buy-now' && styles.listingTypeBtnActive]}
                    onPress={() => setListingType('buy-now')}
                  >
                    <Ionicons name="pricetag-outline" size={20} color={listingType === 'buy-now' ? '#fff' : '#666'} />
                    <Text style={[styles.listingTypeText, listingType === 'buy-now' && styles.listingTypeTextActive]}>
                      Buy Now
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.listingTypeBtn, listingType === 'auction' && styles.listingTypeBtnActive]}
                    onPress={() => setListingType('auction')}
                  >
                    <Ionicons name="trophy-outline" size={20} color={listingType === 'auction' ? '#fff' : '#666'} />
                    <Text style={[styles.listingTypeText, listingType === 'auction' && styles.listingTypeTextActive]}>
                      Auctions
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Categories - Dropdown */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Categories</Text>
                <TouchableOpacity 
                  style={styles.dropdown}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <Text style={styles.dropdownText}>
                    {categories.find(cat => cat.id === selectedCategory)?.name || 'Select Category'}
                  </Text>
                  <Ionicons 
                    name={showCategoryDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
                
                {/* Category Options List */}
                {showCategoryDropdown && (
                  <View style={styles.dropdownOptions}>
                    {categories.map(cat => (
                      <TouchableOpacity 
                        key={cat.id}
                        style={[styles.dropdownOption, selectedCategory === cat.id && styles.dropdownOptionActive]}
                        onPress={() => { setSelectedCategory(cat.id); setShowCategoryDropdown(false); }}
                      >
                        <Text style={[styles.dropdownOptionText, selectedCategory === cat.id && styles.dropdownOptionTextActive]}>
                          {cat.name}
                        </Text>
                        {selectedCategory === cat.id && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Price Range */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Price Range</Text>
                <View style={styles.priceInputs}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={priceRange.min}
                    onChangeText={(text) => setPriceRange({ ...priceRange, min: text })}
                  />
                  <Text style={styles.priceSeparator}>-</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="10000"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={priceRange.max}
                    onChangeText={(text) => setPriceRange({ ...priceRange, max: text })}
                  />
                </View>
              </View>

              {/* Artwork Type */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Artwork Type</Text>
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setArtworkType({ ...artworkType, original: !artworkType.original })}
                >
                  <Ionicons 
                    name={artworkType.original ? 'checkbox' : 'square-outline'} 
                    size={24} 
                    color="#A68C7B" 
                  />
                  <Text style={styles.checkboxLabel}>Original Artworks</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setArtworkType({ ...artworkType, limited: !artworkType.limited })}
                >
                  <Ionicons 
                    name={artworkType.limited ? 'checkbox' : 'square-outline'} 
                    size={24} 
                    color="#A68C7B" 
                  />
                  <Text style={styles.checkboxLabel}>Limited Editions</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setArtworkType({ ...artworkType, open: !artworkType.open })}
                >
                  <Ionicons 
                    name={artworkType.open ? 'checkbox' : 'square-outline'} 
                    size={24} 
                    color="#A68C7B" 
                  />
                  <Text style={styles.checkboxLabel}>Open Editions</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Apply Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cart Modal */}
      <Modal
        visible={showCart}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCart(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cartModalContent}>
            {/* Cart Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Shopping Cart ({getCartCount()})</Text>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Cart Items */}
            <ScrollView style={styles.cartScrollView} showsVerticalScrollIndicator={false}>
              {cartItems.length === 0 ? (
                <View style={styles.emptyCart}>
                  <Ionicons name="cart-outline" size={80} color="#ccc" />
                  <Text style={styles.emptyCartText}>Your cart is empty</Text>
                  <Text style={styles.emptyCartSubtext}>Add some artworks to get started</Text>
                </View>
              ) : (
                cartItems.map((item) => (
                  <View key={item.cartItemId} style={styles.cartItem}>
                    <Image 
                      source={
                        item.primary_image 
                          ? { uri: item.primary_image }
                          : require('../../assets/pic1.jpg')
                      } 
                      style={styles.cartItemImage} 
                    />
                    <View style={styles.cartItemDetails}>
                      <Text style={styles.cartItemTitle}>{item.title}</Text>
                      <Text style={styles.cartItemArtist}>by {item.sellerName}</Text>
                      <Text style={styles.cartItemPrice}>${item.price.toFixed(2)}</Text>
                      
                      {/* Quantity Controls */}
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.cartItemId, -1)}
                        >
                          <Ionicons name="remove" size={18} color="#A68C7B" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                        >
                          <Ionicons name="add" size={18} color="#A68C7B" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {/* Remove Button */}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeItem(item.cartItemId)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Cart Footer */}
            {cartItems.length > 0 && (
              <View style={styles.cartFooter}>
                <View style={styles.cartSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal:</Text>
                    <Text style={styles.summaryValue}>${getCartTotal().toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Shipping:</Text>
                    <Text style={styles.summaryValue}>$0.00</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>${getCartTotal().toFixed(2)}</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.checkoutButton}
                  onPress={() => {
                    setShowCart(false);
                    router.push('/orderSummary');
                  }}
                >
                  <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.continueShoppingButton}
                  onPress={() => setShowCart(false)}
                >
                  <Text style={styles.continueShoppingText}>Continue Shopping</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Floating Cart Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 30 }]}
        onPress={() => setShowCart(true)}
      >
        <Ionicons name="cart-outline" size={28} color="#fff" />
        {getCartCount() > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{getCartCount()}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Product Detail Modal */}
      <ProductDetailModal
        visible={showProductModal}
        onClose={() => setShowProductModal(false)}
        item={selectedProduct}
        onAddToCart={handleAddToCart}
        onPlaceBid={handlePlaceBid}
        onBuyNow={handleBuyNow}
      />
    </SafeAreaView>
  );
};

// Marketplace Card Component
const MarketplaceCard = ({ item, onPress, onAddToCart }) => {
  const getTimeRemaining = (endTime) => {
    if (!endTime) return '';
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const isAuction = item.listingType === 'auction';
  const salePercentage = item.originalPrice ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image Container */}
      <View style={styles.cardImageContainer}>
        <Image
          source={
            item.primary_image
              ? { uri: item.primary_image }
              : item.images?.[0]
              ? { uri: item.images[0] }
              : require('../../assets/pic1.jpg')
          }
          style={styles.cardImage}
        />
        
        {/* Badges */}
        <View style={styles.badgeRow}>
          {item.is_featured && (
            <View style={[styles.cardBadge, styles.featuredBadge]}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          )}
          {salePercentage > 0 && !isAuction && (
            <View style={[styles.cardBadge, styles.saleBadge]}>
              <Text style={styles.badgeText}>{salePercentage}% OFF</Text>
            </View>
          )}
          {isAuction && (
            <View style={[styles.cardBadge, styles.auctionBadge]}>
              <Ionicons name="trophy" size={12} color="#fff" />
              <Text style={[styles.badgeText, { color: '#fff' }]}>Auction</Text>
            </View>
          )}
        </View>
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        <View style={styles.cardMeta}>
          <Text style={styles.cardCategory}>{item.medium || 'Art'}</Text>
          <Text style={styles.cardYear}>{item.year_created || new Date().getFullYear()}</Text>
        </View>
        
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardAuthor} numberOfLines={1}>
          by {item.seller?.shopName || 'Unknown Artist'}
        </Text>
        
        <View style={styles.cardDetails}>
          <Text style={styles.cardSize} numberOfLines={1}>
            {item.dimensions || 'Size not specified'}
          </Text>
          {item.is_original && (
            <View style={styles.originalTag}>
              <Text style={styles.originalTagText}>Original</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          {isAuction ? (
            <View style={styles.auctionInfo}>
              <Text style={styles.bidLabel}>Current Bid</Text>
              <Text style={styles.cardPrice}>${item.currentBid || item.startingPrice || item.price}</Text>
              <Text style={styles.timeLeft}>{getTimeRemaining(item.endTime)}</Text>
            </View>
          ) : (
            <View style={styles.priceInfo}>
              {item.originalPrice && (
                <Text style={styles.originalPrice}>${item.originalPrice}</Text>
              )}
              <Text style={styles.cardPrice}>${item.price}</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.addToCartBtn, isAuction && styles.bidBtn]}
            onPress={(e) => {
              e.stopPropagation();
              isAuction ? onPress() : onAddToCart(item);
            }}
          >
            <Ionicons 
              name={isAuction ? 'trophy' : 'cart'} 
              size={16} 
              color="#fff" 
            />
            <Text style={styles.addToCartText}>
              {isAuction ? 'Bid' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  searchToolbar: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#A68C7B',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 5,
  },
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Card Grid
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  cardImage: { 
    width: '100%', 
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  badgeRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featuredBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  saleBadge: {
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
  },
  auctionBadge: {
    backgroundColor: 'rgba(166, 140, 123, 0.95)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  cardContent: {
    padding: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardCategory: {
    fontSize: 11,
    color: '#A68C7B',
    fontWeight: '600',
  },
  cardYear: {
    fontSize: 11,
    color: '#999',
  },
  cardTitle: { 
    fontSize: 14, 
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardAuthor: { 
    fontSize: 12, 
    color: '#666',
    marginBottom: 6,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardSize: {
    fontSize: 11,
    color: '#999',
    flex: 1,
  },
  originalTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  originalTagText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  auctionInfo: {
    flex: 1,
  },
  bidLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  cardPrice: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#A68C7B',
  },
  timeLeft: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 2,
  },
  priceInfo: {
    flex: 1,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A68C7B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  bidBtn: {
    backgroundColor: '#8B7355',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
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
  filterScrollView: {
    padding: 20,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  
  // Sort Options (in filter modal)
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sortOptionActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  
  // Listing Types
  listingTypes: {
    gap: 10,
  },
  listingTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  listingTypeBtnActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  listingTypeText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  listingTypeTextActive: {
    color: '#fff',
  },
  
  // Categories
  categoryList: {
    gap: 8,
  },
  categoryBtn: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryBtnActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  categoryBtnText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  
  // Price Range
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 14,
  },
  priceSeparator: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  
  // Checkboxes
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  
  // Modal Footer
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  applyButton: {
    backgroundColor: '#A68C7B',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Floating Action Button (Cart)
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
  fabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  fabBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Cart Modal Styles
  cartModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    height: '90%',
  },
  cartScrollView: {
    flex: 1,
    padding: 20,
  },
  emptyCart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cartItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  cartItemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  cartItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cartItemArtist: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  cartItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#A68C7B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 15,
    minWidth: 25,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
    justifyContent: 'flex-start',
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 20,
    backgroundColor: '#fff',
  },
  cartSummary: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  checkoutButton: {
    flexDirection: 'row',
    backgroundColor: '#A68C7B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A68C7B',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  continueShoppingButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#A68C7B',
  },
  continueShoppingText: {
    color: '#A68C7B',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Dropdown Styles
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  dropdownOptions: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownOptionActive: {
    backgroundColor: '#F5F0EB',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  dropdownOptionTextActive: {
    fontSize: 14,
    color: '#A68C7B',
    fontWeight: '600',
  },
  // Quick Actions
  quickActionsWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  masterCollapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  masterHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  masterHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A68C7B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActionsContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    gap: 8,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#A68C7B',
    gap: 8,
  },
  quickActionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A68C7B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  quickActionText: {
    flex: 1,
    color: '#A68C7B',
    fontSize: 15,
    fontWeight: '600',
  },
  quickActionTextWhite: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Dropdown Styles
  dropdownContent: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginTop: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  
  // Pagination Styles
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
    gap: 10,
  },
  paginationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#A68C7B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationBtnDisabled: {
    borderColor: '#e0e0e0',
    opacity: 0.5,
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  pageText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  pageTextActive: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  pageDots: {
    fontSize: 16,
    color: '#999',
    paddingHorizontal: 4,
  },
  pageInfo: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  pageInfoText: {
    fontSize: 13,
    color: '#999',
  },
});

export default MarketplaceScreen;