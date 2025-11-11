import React, { useState, useEffect, useCallback } from 'react';
import {  StyleSheet,View,Text,SafeAreaView,TouchableOpacity,ScrollView,ActivityIndicator,RefreshControl,Modal,TextInput,Image,Alert,StatusBar,KeyboardAvoidingView,Platform} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '../contexts/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../supabase/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

const API_BASE = "http://192.168.254.114:3000/api";

export default function SellerDashboardScreen() {
  const router = useRouter();
  const { userData } = useUser();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const [overviewStatsCollapsed, setOverviewStatsCollapsed] = useState(false);

  // Products state
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState('all');
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    toShip: 0,
    shipping: 0,
    completed: 0
  });

  // Stats state
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    activeProducts: 0,
    earnings: {
      gross: 0,
      net: 0,
      platformFee: 0
    },
    pendingOrders: 0,
    pendingShipments: 0
  });

  // Modal states
  const [shippingModal, setShippingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  
  // Payout balance data
  const [payoutBalance, setPayoutBalance] = useState({
    available: 0,
    pending: 0,
    totalPaidOut: 0,
    canWithdraw: false,
    minimumPayout: 100
  });
  
  // Payment method data
  const [paymentMethod, setPaymentMethod] = useState({
    method: null,
    gcashNumber: null,
    bankAccountName: null,
    bankAccountNumber: null,
    bankName: null
  });
  
  // Add Product Modal states
  const [addProductModal, setAddProductModal] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addQuantity, setAddQuantity] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addCategories, setAddCategories] = useState('');
  const [addTags, setAddTags] = useState('');
  const [addStatus, setAddStatus] = useState('active');
  const [addIsAvailable, setAddIsAvailable] = useState(true);
  const [addMedium, setAddMedium] = useState('');
  const [addDimensions, setAddDimensions] = useState('');
  const [addYearCreated, setAddYearCreated] = useState('');
  const [addWeightKg, setAddWeightKg] = useState('');
  const [addCondition, setAddCondition] = useState('excellent');
  const [addIsOriginal, setAddIsOriginal] = useState(true);
  const [addIsFramed, setAddIsFramed] = useState(false);
  const [addIsFeatured, setAddIsFeatured] = useState(false);
  const [addImages, setAddImages] = useState([]);
  const [showAddConditionDropdown, setShowAddConditionDropdown] = useState(false);
  const [showAddStatusDropdown, setShowAddStatusDropdown] = useState(false);
  
  // Edit Product Modal states
  const [editModal, setEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategories, setEditCategories] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editIsAvailable, setEditIsAvailable] = useState(true);
  const [editMedium, setEditMedium] = useState('');
  const [editDimensions, setEditDimensions] = useState('');
  const [editYearCreated, setEditYearCreated] = useState('');
  const [editWeightKg, setEditWeightKg] = useState('');
  const [editCondition, setEditCondition] = useState('excellent');
  const [editIsOriginal, setEditIsOriginal] = useState(true);
  const [editIsFramed, setEditIsFramed] = useState(false);
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [editImages, setEditImages] = useState([]);
  const [showConditionDropdown, setShowConditionDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Fetch payout balance
  const fetchPayoutBalance = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/payouts/balance`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPayoutBalance({
          available: parseFloat(result.data.available || 0),
          pending: parseFloat(result.data.pending || 0),
          totalPaidOut: parseFloat(result.data.totalPaidOut || 0),
          canWithdraw: result.data.canWithdraw || false,
          minimumPayout: result.data.minimumPayout || 100
        });
      }
    } catch (error) {
      console.error('Error fetching payout balance:', error);
    }
  };

  // Fetch payment method
  const fetchPaymentMethod = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/payouts/payment-info`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success && result.data) {
        setPaymentMethod({
          method: result.data.paymentMethod,
          gcashNumber: result.data.gcashNumber,
          bankAccountName: result.data.bankAccountName,
          bankAccountNumber: result.data.bankAccountNumber,
          bankName: result.data.bankName
        });
      }
    } catch (error) {
      console.error('Error fetching payment method:', error);
    }
  };

  // Handle withdraw funds
  const handleWithdraw = async () => {
    const paymentMethodName = paymentMethod.method === 'gcash' ? 
      `GCash (${paymentMethod.gcashNumber})` : 
      paymentMethod.method === 'bank' ?
      `${paymentMethod.bankName} (${paymentMethod.bankAccountNumber})` :
      paymentMethod.method;
      
    Alert.alert(
      'Withdraw Funds',
      `Withdraw ₱${payoutBalance.available.toLocaleString()} to your ${paymentMethodName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const { data } = await supabase.auth.getSession();
              const at = data?.session?.access_token || '';
              const rt = data?.session?.refresh_token || '';

              const response = await fetch(`${API_BASE}/payouts/withdraw`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  Cookie: `access_token=${at}; refresh_token=${rt}`,
                  'Authorization': `Bearer ${at}`,
                },
              });

              const result = await response.json();

              if (response.ok && result.success) {
                Alert.alert(
                  'Success',
                  `${result.message}\n\nAmount: ₱${result.data.amount}\nReference: ${result.data.reference}\nMethod: ${result.data.paymentMethod}`
                );
                // Refresh balances
                fetchPayoutBalance();
                fetchStats(selectedPeriod);
              } else {
                Alert.alert('Error', result.error || 'Failed to process withdrawal');
              }
            } catch (error) {
              console.error('Error processing withdrawal:', error);
              Alert.alert('Error', 'Failed to process withdrawal');
            }
          }
        }
      ]
    );
  };

  // Fetch stats
  const fetchStats = async (period = 'weekly') => {
    try {
      setStatsLoading(true);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/marketplace/seller/stats?period=${period}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStats(result.stats || stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/marketplace/seller/my-items`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setProducts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  // Fetch order stats (always get full stats regardless of filter)
  const fetchOrderStats = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/marketplace/orders/seller`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success && result.stats) {
        setOrderStats(result.stats);
      }
    } catch (error) {
      console.error('Error fetching order stats:', error);
    }
  };

  // Fetch orders
  const fetchOrders = async (status = null) => {
    try {
      setOrdersLoading(true);
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const url = status && status !== 'all'
        ? `${API_BASE}/marketplace/orders/seller?status=${status}`
        : `${API_BASE}/marketplace/orders/seller`;

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setOrders(result.data || []);
        // Always fetch full stats separately to keep counts accurate
        await fetchOrderStats();
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Mark as processing
  const handleMarkAsProcessing = async (order) => {
    Alert.alert(
      'Mark as Processing',
      'Mark this order as processing? This means you are preparing the items for shipment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Processing',
          onPress: async () => {
            try {
              const { data } = await supabase.auth.getSession();
              const at = data?.session?.access_token || '';
              const rt = data?.session?.refresh_token || '';

              const response = await fetch(`${API_BASE}/marketplace/orders/${order.orderId}/process`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                  Cookie: `access_token=${at}; refresh_token=${rt}`,
                  'Authorization': `Bearer ${at}`,
                },
              });

              const result = await response.json();

              if (response.ok && result.success) {
                Alert.alert('Success', 'Order marked as processing!');
                fetchOrders(orderFilter === 'all' ? null : orderFilter);
                fetchStats(selectedPeriod);
              } else {
                Alert.alert('Error', result.error || 'Failed to update order');
              }
            } catch (error) {
              console.error('Error updating order:', error);
              Alert.alert('Error', 'Failed to update order');
            }
          }
        }
      ]
    );
  };

  // Mark as shipped
  const handleMarkAsShipped = (order) => {
    setSelectedOrder(order);
    setShippingModal(true);
    setTrackingNumber('');
  };

  // Submit tracking
  const submitTracking = async () => {
    if (!trackingNumber.trim()) {
      Alert.alert('Error', 'Please enter a tracking number');
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/marketplace/orders/${selectedOrder.orderId}/ship`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
        body: JSON.stringify({
          tracking_number: trackingNumber
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert('Success', 'Order marked as shipped!');
        setShippingModal(false);
        setSelectedOrder(null);
        setTrackingNumber('');
        fetchOrders(orderFilter === 'all' ? null : orderFilter);
        fetchStats(selectedPeriod);
      } else {
        Alert.alert('Error', result.error || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      Alert.alert('Error', 'Failed to update order');
    }
  };

  // Delete product
  const handleDeleteProduct = (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data } = await supabase.auth.getSession();
              const at = data?.session?.access_token || '';
              const rt = data?.session?.refresh_token || '';

              const response = await fetch(`${API_BASE}/marketplace/items/${product.marketItemId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                  Cookie: `access_token=${at}; refresh_token=${rt}`,
                  'Authorization': `Bearer ${at}`,
                },
              });

              const result = await response.json();

              if (response.ok && result.success) {
                Alert.alert('Success', 'Product deleted successfully!');
                fetchProducts();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete product');
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  // Edit product
  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setEditTitle(product.title || '');
    setEditPrice(product.price?.toString() || '');
    setEditQuantity(product.quantity?.toString() || '');
    setEditDescription(product.description || '');
    
    // Categories - handle array
    const cats = product.categories || [];
    setEditCategories(Array.isArray(cats) ? cats.join(', ') : cats);
    
    // Tags - handle array
    const tgs = product.tags || [];
    setEditTags(Array.isArray(tgs) ? tgs.join(', ') : tgs);
    
    setEditStatus(product.status || 'active');
    setEditIsAvailable(product.is_available !== false);
    setEditMedium(product.medium || '');
    setEditDimensions(product.dimensions || '');
    setEditYearCreated(product.year_created?.toString() || '');
    setEditWeightKg(product.weight_kg?.toString() || '');
    setEditCondition(product.condition || 'excellent');
    setEditIsOriginal(product.is_original !== false);
    setEditIsFramed(product.is_framed || false);
    setEditIsFeatured(product.is_featured || false);
    
    // Load existing images
    const existingImgs = [];
    if (product.images && Array.isArray(product.images)) {
      existingImgs.push(...product.images.map((url, idx) => ({
        id: `existing-${idx}`,
        uri: url,
        url: url,
        isExisting: true
      })));
    } else if (product.primary_image) {
      existingImgs.push({
        id: 'existing-0',
        uri: product.primary_image,
        url: product.primary_image,
        isExisting: true
      });
    }
    
    setEditImages(existingImgs);
    setEditModal(true);
  };

  // Pick images for edit
  const pickEditImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      aspect: [4, 3],
      quality: 1,
    });
    
    if (!result.canceled) {
      setEditImages(result.assets);
    }
  };

  // Remove edit image
  const removeEditImage = (index) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
  };

  // Submit edit product
  const submitEditProduct = async () => {
    try {
      // Validate required fields
      if (!editTitle.trim()) {
        Alert.alert('Error', 'Product title is required');
        return;
      }
      if (!editPrice || parseFloat(editPrice) <= 0) {
        Alert.alert('Error', 'Valid price is required');
        return;
      }
      if (!editMedium.trim()) {
        Alert.alert('Error', 'Medium is required');
        return;
      }
      if (!editDimensions.trim()) {
        Alert.alert('Error', 'Dimensions are required');
        return;
      }
      if (!editQuantity || parseInt(editQuantity) < 0) {
        Alert.alert('Error', 'Valid quantity is required');
        return;
      }
      
      // Parse categories and tags
      const categories = editCategories.split(',').map(c => c.trim()).filter(c => c);
      if (categories.length === 0) {
        Alert.alert('Error', 'At least one category is required');
        return;
      }
      
      const tags = editTags.split(',').map(t => t.trim()).filter(t => t);
      
      if (editImages.length === 0) {
        Alert.alert('Error', 'Please upload at least one product image');
        return;
      }

      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const formData = new FormData();
      formData.append('title', editTitle.trim());
      formData.append('price', parseFloat(editPrice));
      formData.append('quantity', parseInt(editQuantity));
      formData.append('description', editDescription.trim());
      formData.append('medium', editMedium.trim());
      formData.append('dimensions', editDimensions.trim());
      formData.append('year_created', editYearCreated || '');
      formData.append('weight_kg', editWeightKg || '');
      formData.append('is_original', editIsOriginal.toString());
      formData.append('is_framed', editIsFramed.toString());
      formData.append('condition', editCondition);
      formData.append('categories', JSON.stringify(categories));
      formData.append('tags', JSON.stringify(tags));
      formData.append('is_available', editIsAvailable.toString());
      formData.append('is_featured', editIsFeatured.toString());
      formData.append('status', editStatus);
      
      // Handle images - separate existing from new
      const existingImages = editImages.filter(img => img.isExisting && !img.file);
      const newImages = editImages.filter(img => !img.isExisting && img.uri);
      
      // Send existing images to keep (URLs)
      if (existingImages.length > 0) {
        const existingUrls = existingImages.map(img => img.url || img.uri);
        formData.append('existing_images_to_keep', JSON.stringify(existingUrls));
      }
      
      // Add new image files
      if (newImages.length > 0) {
        newImages.forEach((image) => {
          const filename = image.uri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image';
          formData.append('images', {
            uri: image.uri,
            name: filename,
            type: type
          });
        });
      }
      
      // If no images at all, mark for removal
      if (editImages.length === 0) {
        formData.append('remove_all_images', 'true');
      }

      const response = await fetch(`${API_BASE}/marketplace/items/${selectedProduct.marketItemId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert('Success', 'Product updated successfully!');
        setEditModal(false);
        setSelectedProduct(null);
        fetchProducts();
      } else {
        Alert.alert('Error', result.error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product');
    }
  };

  // Pick images for add product
  const pickAddImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      aspect: [4, 3],
      quality: 1,
    });
    
    if (!result.canceled) {
      setAddImages(result.assets);
    }
  };

  // Remove add image
  const removeAddImage = (index) => {
    setAddImages(prev => prev.filter((_, i) => i !== index));
  };

  // Submit add product
  const submitAddProduct = async () => {
    try {
      // Validate required fields
      if (!addTitle.trim()) {
        Alert.alert('Error', 'Product title is required');
        return;
      }
      if (!addPrice || parseFloat(addPrice) <= 0) {
        Alert.alert('Error', 'Valid price is required');
        return;
      }
      if (!addMedium.trim()) {
        Alert.alert('Error', 'Medium is required');
        return;
      }
      if (!addDimensions.trim()) {
        Alert.alert('Error', 'Dimensions are required');
        return;
      }
      if (!addQuantity || parseInt(addQuantity) < 0) {
        Alert.alert('Error', 'Valid quantity is required');
        return;
      }
      
      // Parse categories and tags
      const categories = addCategories.split(',').map(c => c.trim()).filter(c => c);
      if (categories.length === 0) {
        Alert.alert('Error', 'At least one category is required');
        return;
      }
      
      const tags = addTags.split(',').map(t => t.trim()).filter(t => t);
      
      if (addImages.length === 0) {
        Alert.alert('Error', 'Please upload at least one product image');
        return;
      }

      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const formData = new FormData();
      formData.append('title', addTitle.trim());
      formData.append('price', parseFloat(addPrice));
      formData.append('quantity', parseInt(addQuantity));
      formData.append('description', addDescription.trim());
      formData.append('medium', addMedium.trim());
      formData.append('dimensions', addDimensions.trim());
      formData.append('year_created', addYearCreated || '');
      formData.append('weight_kg', addWeightKg || '');
      formData.append('is_original', addIsOriginal.toString());
      formData.append('is_framed', addIsFramed.toString());
      formData.append('condition', addCondition);
      formData.append('categories', JSON.stringify(categories));
      formData.append('tags', JSON.stringify(tags));
      formData.append('is_available', addIsAvailable.toString());
      formData.append('is_featured', addIsFeatured.toString());
      formData.append('status', addStatus);
      
      // Add image files
      addImages.forEach((image) => {
        const filename = image.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image';
        formData.append('images', {
          uri: image.uri,
          name: filename,
          type: type
        });
      });

      const response = await fetch(`${API_BASE}/marketplace/items`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert('Success', 'Product added successfully!');
        setAddProductModal(false);
        // Reset form
        setAddTitle('');
        setAddPrice('');
        setAddQuantity('');
        setAddDescription('');
        setAddCategories('');
        setAddTags('');
        setAddStatus('active');
        setAddIsAvailable(true);
        setAddMedium('');
        setAddDimensions('');
        setAddYearCreated('');
        setAddWeightKg('');
        setAddCondition('excellent');
        setAddIsOriginal(true);
        setAddIsFramed(false);
        setAddIsFeatured(false);
        setAddImages([]);
        fetchProducts();
        fetchStats(selectedPeriod);
      } else {
        Alert.alert('Error', result.error || 'Failed to add product');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Error', 'Failed to add product');
    }
  };

  // Initial load
  useEffect(() => {
    if (userData?.isSeller) {
      setLoading(true);
      Promise.all([
        fetchStats(selectedPeriod),
        fetchProducts(),
        fetchPayoutBalance(),
        fetchPaymentMethod(),
        activeTab === 'orders' ? fetchOrders(orderFilter === 'all' ? null : orderFilter) : Promise.resolve()
      ]).finally(() => setLoading(false));
    }
  }, [userData, selectedPeriod, activeTab, orderFilter]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (userData?.isSeller) {
        fetchStats(selectedPeriod);
        fetchProducts();
        fetchPayoutBalance();
        fetchPaymentMethod();
        if (activeTab === 'orders') {
          fetchOrders(orderFilter === 'all' ? null : orderFilter);
        }
      }
    }, [userData, selectedPeriod, activeTab, orderFilter])
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchStats(selectedPeriod),
      fetchProducts(),
      fetchPayoutBalance(),
      fetchPaymentMethod(),
      activeTab === 'orders' ? fetchOrders(orderFilter === 'all' ? null : orderFilter) : Promise.resolve()
    ]).finally(() => setRefreshing(false));
  }, [selectedPeriod, activeTab, orderFilter]);

  // Check if user is seller
  if (!userData?.isSeller) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.push('/(drawer)/marketplace')}
            >
              <Ionicons name="arrow-back" size={26} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Seller Dashboard</Text>
          </View>
        </View>
        <View style={styles.notSellerContainer}>
          <Ionicons name="storefront-outline" size={80} color="#ccc" />
          <Text style={styles.notSellerTitle}>Not a Seller Yet</Text>
          <Text style={styles.notSellerText}>
            You need to be a verified seller to access this feature.
          </Text>
          <TouchableOpacity 
            style={styles.applyButton}
            onPress={() => router.push('/(drawer)/settings')}
          >
            <Text style={styles.applyButtonText}>Apply as Seller</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push('/(drawer)/marketplace')}
          >
            <Ionicons name="arrow-back" size={26} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seller Dashboard</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A68C7B" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#A68C7B']}
              tintColor="#A68C7B"
            />
          }
        >
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
              onPress={() => setActiveTab('overview')}
            >
              <Ionicons name="grid-outline" size={20} color={activeTab === 'overview' ? '#A68C7B' : '#666'} />
              <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
                Overview
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'products' && styles.tabActive]}
              onPress={() => setActiveTab('products')}
            >
              <Ionicons name="pricetags-outline" size={20} color={activeTab === 'products' ? '#A68C7B' : '#666'} />
              <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
                Products
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
              onPress={() => setActiveTab('orders')}
            >
              <Ionicons name="list-outline" size={20} color={activeTab === 'orders' ? '#A68C7B' : '#666'} />
              <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
                Orders
              </Text>
              {orderStats.toShip > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{orderStats.toShip}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'payouts' && styles.tabActive]}
              onPress={() => setActiveTab('payouts')}
            >
              <Ionicons name="wallet-outline" size={20} color={activeTab === 'payouts' ? '#A68C7B' : '#666'} />
              <Text style={[styles.tabText, activeTab === 'payouts' && styles.tabTextActive]}>
                Payouts
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <OverviewTab 
              stats={stats} 
              router={router} 
              setActiveTab={setActiveTab}
              statsCollapsed={overviewStatsCollapsed}
              setStatsCollapsed={setOverviewStatsCollapsed}
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
            />
          )}
          {activeTab === 'payouts' && (
            <PayoutsTab 
              payoutBalance={payoutBalance}
              paymentMethod={paymentMethod}
              stats={stats}
              onWithdraw={handleWithdraw}
              router={router}
            />
          )}
          {activeTab === 'products' && (
            <ProductsTab 
              products={products} 
              loading={productsLoading}
              router={router}
              onDelete={handleDeleteProduct}
              onEdit={handleEditProduct}
              showAllProducts={showAllProducts}
              setShowAllProducts={setShowAllProducts}
              onAddProduct={() => setAddProductModal(true)}
            />
          )}
          {activeTab === 'orders' && (
            <OrdersTab 
              orders={orders} 
              loading={ordersLoading}
              orderFilter={orderFilter}
              setOrderFilter={setOrderFilter}
              orderStats={orderStats}
              onMarkAsProcessing={handleMarkAsProcessing}
              onMarkAsShipped={handleMarkAsShipped}
              showAllOrders={showAllOrders}
              setShowAllOrders={setShowAllOrders}
            />
          )}
        </ScrollView>
      )}

      {/* Shipping Modal */}
      {shippingModal && selectedOrder && (
        <Modal
          visible={shippingModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShippingModal(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableOpacity 
              style={styles.modalOverlayTouchable}
              activeOpacity={1}
              onPress={() => setShippingModal(false)}
            >
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={(e) => e.stopPropagation()}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Tracking Number</Text>
                  <TouchableOpacity onPress={() => setShippingModal(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.modalBody}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Order Summary */}
                  <View style={styles.orderSummaryBox}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Order ID:</Text>
                      <Text style={styles.summaryValue}>#{selectedOrder.orderId.slice(0, 8)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Total:</Text>
                      <Text style={styles.summaryValue}>₱{selectedOrder.totalAmount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Items:</Text>
                      <Text style={styles.summaryValue}>{selectedOrder.items?.length || 0}</Text>
                    </View>
                  </View>

                  {/* Tracking Input Section */}
                  <Text style={styles.inputLabel}>Tracking Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter tracking number (e.g., 420612345678)"
                    value={trackingNumber}
                    onChangeText={setTrackingNumber}
                    autoCapitalize="characters"
                    returnKeyType="done"
                  />
                  <Text style={styles.inputHint}>
                    Enter the tracking number provided by your courier service
                  </Text>

                  {/* Shipping Tips */}
                  <View style={styles.trackingTips}>
                    <Text style={styles.tipsHeader}>Shipping Tips:</Text>
                    <Text style={styles.tipText}>• Pack items securely to prevent damage</Text>
                    <Text style={styles.tipText}>• Include invoice and packing slip</Text>
                    <Text style={styles.tipText}>• Use tracking service for valuable items</Text>
                    <Text style={styles.tipText}>• Update buyer with tracking information</Text>
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity 
                    style={[styles.submitBtn, !trackingNumber.trim() && styles.submitBtnDisabled]}
                    onPress={submitTracking}
                    disabled={!trackingNumber.trim()}
                  >
                    <Text style={styles.submitBtnText}>Confirm Shipment</Text>
                  </TouchableOpacity>
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Edit Product Modal */}
      {editModal && selectedProduct && (
        <Modal
          visible={editModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditModal(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableOpacity 
              style={styles.modalOverlayTouchable}
              activeOpacity={1}
              onPress={() => setEditModal(false)}
            >
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={(e) => e.stopPropagation()}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Product</Text>
                  <TouchableOpacity onPress={() => setEditModal(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.modalBody}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.sectionHeader}>Product Images</Text>
                  <Text style={styles.hintText}>Support: JPG, PNG up to 10MB • Maximum 10 images • First image will be primary</Text>
                  
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.imagePickerScrollView}
                  >
                    {editImages.map((image, index) => (
                      <View key={index} style={styles.imagePreviewItem}>
                        <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                        <TouchableOpacity 
                          style={styles.removeImageBtn}
                          onPress={() => removeEditImage(index)}
                        >
                          <Ionicons name="close-circle" size={26} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    
                    <View style={styles.imagePreviewItem}>
                      <TouchableOpacity 
                        style={styles.addPhotoBtn}
                        onPress={pickEditImages}
                      >
                        <Ionicons name="image-outline" size={32} color="#A68C7B" />
                        <Text style={styles.addPhotoText}>Add Photo</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>

                  <Text style={styles.sectionHeader}>Basic Information</Text>

                  <Text style={styles.inputLabel}>Product Title *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter product title"
                    value={editTitle}
                    onChangeText={setEditTitle}
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Price *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter price"
                    value={editPrice}
                    onChangeText={setEditPrice}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter product description"
                    value={editDescription}
                    onChangeText={setEditDescription}
                    multiline
                    numberOfLines={4}
                    returnKeyType="done"
                  />

                  <Text style={styles.sectionHeader}>Product Details</Text>

                  <Text style={styles.inputLabel}>Medium *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Oil on Canvas, Watercolor, Digital"
                    value={editMedium}
                    onChangeText={setEditMedium}
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Dimensions *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 24x36 inches"
                    value={editDimensions}
                    onChangeText={setEditDimensions}
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Year Created</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 2024"
                    value={editYearCreated}
                    onChangeText={setEditYearCreated}
                    keyboardType="number-pad"
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 2.5"
                    value={editWeightKg}
                    onChangeText={setEditWeightKg}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Condition *</Text>
                  <TouchableOpacity 
                    style={styles.dropdownBtn}
                    onPress={() => setShowConditionDropdown(!showConditionDropdown)}
                  >
                    <Text style={editCondition ? styles.dropdownBtnTextSelected : styles.dropdownBtnText}>
                      {editCondition.charAt(0).toUpperCase() + editCondition.slice(1)}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                  {showConditionDropdown && (
                    <View style={styles.dropdownMenu}>
                      {[
                        { value: 'excellent', label: 'Excellent' },
                        { value: 'good', label: 'Good' },
                        { value: 'fair', label: 'Fair' },
                        { value: 'poor', label: 'Poor' }
                      ].map((item) => (
                        <TouchableOpacity 
                          key={item.value}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setEditCondition(item.value);
                            setShowConditionDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item.label}</Text>
                          {editCondition === item.value && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={styles.sectionHeader}>Features</Text>

                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={() => setEditIsOriginal(!editIsOriginal)}
                  >
                    <View style={[styles.checkbox, editIsOriginal && styles.checkboxChecked]}>
                      {editIsOriginal && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Original Artwork</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={() => setEditIsFramed(!editIsFramed)}
                  >
                    <View style={[styles.checkbox, editIsFramed && styles.checkboxChecked]}>
                      {editIsFramed && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Framed</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={() => setEditIsFeatured(!editIsFeatured)}
                  >
                    <View style={[styles.checkbox, editIsFeatured && styles.checkboxChecked]}>
                      {editIsFeatured && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Featured Item</Text>
                  </TouchableOpacity>

                  <Text style={styles.sectionHeader}>Categories & Tags</Text>

                  <Text style={styles.inputLabel}>Categories (comma-separated) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., landscape, nature, contemporary"
                    value={editCategories}
                    onChangeText={setEditCategories}
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Tags (comma-separated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., sunset, mountains, oil painting, framed"
                    value={editTags}
                    onChangeText={setEditTags}
                    returnKeyType="next"
                  />

                  <Text style={styles.sectionHeader}>Inventory & Status</Text>

                  <Text style={styles.inputLabel}>Quantity Available *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter quantity"
                    value={editQuantity}
                    onChangeText={setEditQuantity}
                    keyboardType="number-pad"
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Item Status</Text>
                  <TouchableOpacity 
                    style={styles.dropdownBtn}
                    onPress={() => setShowStatusDropdown(!showStatusDropdown)}
                  >
                    <Text style={editStatus ? styles.dropdownBtnTextSelected : styles.dropdownBtnText}>
                      {editStatus === 'active' ? 'Active' : editStatus === 'pending' ? 'Pending Approval' : 'Inactive'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                  {showStatusDropdown && (
                    <View style={styles.dropdownMenu}>
                      {[
                        { value: 'active', label: 'Active' },
                        { value: 'pending', label: 'Pending Approval' },
                        { value: 'inactive', label: 'Inactive' }
                      ].map((item) => (
                        <TouchableOpacity 
                          key={item.value}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setEditStatus(item.value);
                            setShowStatusDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item.label}</Text>
                          {editStatus === item.value && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={() => setEditIsAvailable(!editIsAvailable)}
                  >
                    <View style={[styles.checkbox, editIsAvailable && styles.checkboxChecked]}>
                      {editIsAvailable && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Available for Purchase</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.submitBtn}
                    onPress={submitEditProduct}
                  >
                    <Text style={styles.submitBtnText}>Update Product</Text>
                  </TouchableOpacity>
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Add Product Modal */}
      {addProductModal && (
        <Modal
          visible={addProductModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setAddProductModal(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableOpacity 
              style={styles.modalOverlayTouchable}
              activeOpacity={1}
              onPress={() => setAddProductModal(false)}
            >
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={(e) => e.stopPropagation()}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Product</Text>
                  <TouchableOpacity onPress={() => setAddProductModal(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.modalBody}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.sectionHeader}>Product Images</Text>
                  <Text style={styles.hintText}>Support: JPG, PNG up to 10MB • Maximum 10 images • First image will be primary</Text>
                  
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.imagePickerScrollView}
                  >
                    {addImages.map((image, index) => (
                      <View key={index} style={styles.imagePreviewItem}>
                        <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                        <TouchableOpacity 
                          style={styles.removeImageBtn}
                          onPress={() => removeAddImage(index)}
                        >
                          <Ionicons name="close-circle" size={26} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    
                    <View style={styles.imagePreviewItem}>
                      <TouchableOpacity 
                        style={styles.addPhotoBtn}
                        onPress={pickAddImages}
                      >
                        <Ionicons name="image-outline" size={32} color="#A68C7B" />
                        <Text style={styles.addPhotoText}>Add Photo</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>

                  <Text style={styles.sectionHeader}>Basic Information</Text>

                  <Text style={styles.inputLabel}>Product Title *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Sunset Over Mountains"
                    value={addTitle}
                    onChangeText={setAddTitle}
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Price (₱) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={addPrice}
                    onChangeText={setAddPrice}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe your product in detail..."
                    value={addDescription}
                    onChangeText={setAddDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  <Text style={styles.sectionHeader}>Product Details</Text>

                  <Text style={styles.inputLabel}>Medium *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Oil on Canvas, Watercolor"
                    value={addMedium}
                    onChangeText={setAddMedium}
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Dimensions *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 24x36 inches"
                    value={addDimensions}
                    onChangeText={setAddDimensions}
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Year Created</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 2024"
                    value={addYearCreated}
                    onChangeText={setAddYearCreated}
                    keyboardType="number-pad"
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 2.5"
                    value={addWeightKg}
                    onChangeText={setAddWeightKg}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Condition *</Text>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => setShowAddConditionDropdown(!showAddConditionDropdown)}
                  >
                    <Text style={styles.dropdownButtonText}>
                      {addCondition.charAt(0).toUpperCase() + addCondition.slice(1)}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                  
                  {showAddConditionDropdown && (
                    <View style={styles.dropdownMenu}>
                      {[
                        { label: 'Excellent', value: 'excellent' },
                        { label: 'Good', value: 'good' },
                        { label: 'Fair', value: 'fair' },
                        { label: 'Poor', value: 'poor' }
                      ].map(item => (
                        <TouchableOpacity
                          key={item.value}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setAddCondition(item.value);
                            setShowAddConditionDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item.label}</Text>
                          {addCondition === item.value && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={() => setAddIsOriginal(!addIsOriginal)}
                  >
                    <View style={[styles.checkbox, addIsOriginal && styles.checkboxChecked]}>
                      {addIsOriginal && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Original Artwork</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={() => setAddIsFramed(!addIsFramed)}
                  >
                    <View style={[styles.checkbox, addIsFramed && styles.checkboxChecked]}>
                      {addIsFramed && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Framed</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={() => setAddIsFeatured(!addIsFeatured)}
                  >
                    <View style={[styles.checkbox, addIsFeatured && styles.checkboxChecked]}>
                      {addIsFeatured && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Feature this item</Text>
                  </TouchableOpacity>

                  <Text style={styles.sectionHeader}>Categories & Tags</Text>

                  <Text style={styles.inputLabel}>Categories (comma-separated) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., landscape, nature, contemporary"
                    value={addCategories}
                    onChangeText={setAddCategories}
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Tags (comma-separated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., sunset, mountains, oil painting"
                    value={addTags}
                    onChangeText={setAddTags}
                    returnKeyType="next"
                  />

                  <Text style={styles.sectionHeader}>Inventory & Status</Text>

                  <Text style={styles.inputLabel}>Quantity Available *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    value={addQuantity}
                    onChangeText={setAddQuantity}
                    keyboardType="number-pad"
                    returnKeyType="next"
                  />

                  <Text style={styles.inputLabel}>Item Status</Text>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => setShowAddStatusDropdown(!showAddStatusDropdown)}
                  >
                    <Text style={styles.dropdownButtonText}>
                      {addStatus.charAt(0).toUpperCase() + addStatus.slice(1)}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                  
                  {showAddStatusDropdown && (
                    <View style={styles.dropdownMenu}>
                      {[
                        { label: 'Active', value: 'active' },
                        { label: 'Pending Approval', value: 'pending' },
                        { label: 'Inactive', value: 'inactive' }
                      ].map(item => (
                        <TouchableOpacity
                          key={item.value}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setAddStatus(item.value);
                            setShowAddStatusDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item.label}</Text>
                          {addStatus === item.value && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={() => setAddIsAvailable(!addIsAvailable)}
                  >
                    <View style={[styles.checkbox, addIsAvailable && styles.checkboxChecked]}>
                      {addIsAvailable && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Available for Purchase</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.submitBtn}
                    onPress={submitAddProduct}
                  >
                    <Text style={styles.submitBtnText}>Add Product</Text>
                  </TouchableOpacity>
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// Overview Tab Component
const OverviewTab = ({ stats, router, setActiveTab, statsCollapsed, setStatsCollapsed, selectedPeriod, setSelectedPeriod }) => (
  <View style={styles.overviewContainer}>
    {/* Quick Actions */}
    <Text style={styles.sectionTitle}>Quick Actions</Text>
    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('products')}>
        <Ionicons name="pricetags" size={32} color="#A68C7B" />
        <Text style={styles.actionText}>Manage Products</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('orders')}>
        <Ionicons name="list" size={32} color="#A68C7B" />
        <Text style={styles.actionText}>View Orders</Text>
      </TouchableOpacity>
    </View>

    {/* Period Selector */}
    <View style={styles.overviewPeriodContainer}>
      <TouchableOpacity
        style={[styles.overviewPeriodBtn, selectedPeriod === 'daily' && styles.overviewPeriodBtnActive]}
        onPress={() => setSelectedPeriod('daily')}
      >
        <Text style={[styles.overviewPeriodText, selectedPeriod === 'daily' && styles.overviewPeriodTextActive]}>
          Daily
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.overviewPeriodBtn, selectedPeriod === 'weekly' && styles.overviewPeriodBtnActive]}
        onPress={() => setSelectedPeriod('weekly')}
      >
        <Text style={[styles.overviewPeriodText, selectedPeriod === 'weekly' && styles.overviewPeriodTextActive]}>
          Weekly
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.overviewPeriodBtn, selectedPeriod === 'monthly' && styles.overviewPeriodBtnActive]}
        onPress={() => setSelectedPeriod('monthly')}
      >
        <Text style={[styles.overviewPeriodText, selectedPeriod === 'monthly' && styles.overviewPeriodTextActive]}>
          Monthly
        </Text>
      </TouchableOpacity>
    </View>

    {/* Sales Statistics - Moved from above tabs */}
    <View style={styles.statsContainer}>
      {/* Stats Header with Collapse Toggle */}
      <TouchableOpacity 
        style={styles.statsHeader}
        onPress={() => setStatsCollapsed(!statsCollapsed)}
        activeOpacity={0.7}
      >
        <Text style={styles.statsHeaderTitle}>Sales Statistics</Text>
        <Ionicons 
          name={statsCollapsed ? "chevron-down" : "chevron-up"} 
          size={24} 
          color="#A68C7B" 
        />
      </TouchableOpacity>

      {/* Stats Content */}
      {!statsCollapsed && (
        <>
          {/* Top Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="cash-outline" size={28} color="#A68C7B" />
              <Text style={styles.statValue}>₱{stats.totalSales.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Sales</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statCard}>
              <Ionicons name="receipt-outline" size={28} color="#A68C7B" />
              <Text style={styles.statValue}>{stats.totalOrders}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
              {stats.pendingOrders > 0 && (
                <Text style={styles.statBadge}>{stats.pendingOrders} pending</Text>
              )}
            </View>
          </View>

          {/* Horizontal Divider */}
          <View style={styles.horizontalDivider} />

          {/* Bottom Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="cube-outline" size={28} color="#A68C7B" />
              <Text style={styles.statValue}>{stats.totalProducts}</Text>
              <Text style={styles.statLabel}>Product Listed</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statCard}>
              <Ionicons name="wallet-outline" size={28} color="#A68C7B" />
              <Text style={styles.statValue}>₱{stats.earnings.net.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Net Earnings</Text>
              <Text style={styles.statSubLabel}>
                After {((stats.earnings.platformFee / stats.earnings.gross) * 100 || 0).toFixed(0)}% fees
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  </View>
);

// Payouts Tab Component
const PayoutsTab = ({ payoutBalance, paymentMethod, stats, onWithdraw, router }) => {
  return (
    <View style={styles.payoutsContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet" size={20} color="#A68C7B" style={{marginRight: 8}} />
            <Text style={styles.balanceTitle}>Available Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>₱{payoutBalance.available.toLocaleString()}</Text>
          
          {payoutBalance.pending > 0 && (
            <View style={styles.pendingContainer}>
              <Ionicons name="time-outline" size={16} color="#FF9800" />
              <Text style={styles.pendingText}>
                Pending (Escrow): ₱{payoutBalance.pending.toLocaleString()}
              </Text>
            </View>
          )}
          
          <Text style={styles.minimumText}>
            Minimum withdrawal: ₱{payoutBalance.minimumPayout}
          </Text>
          
          {!paymentMethod.method && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={16} color="#FF9800" />
              <Text style={styles.warningText}>Set up payment method first</Text>
            </View>
          )}
          
          {/* Withdraw Button */}
          <TouchableOpacity
            style={[
              styles.withdrawBtn,
              (!payoutBalance.canWithdraw || !paymentMethod.method) && styles.withdrawBtnDisabled
            ]}
            onPress={onWithdraw}
            disabled={!payoutBalance.canWithdraw || !paymentMethod.method}
          >
            <Ionicons name="cash-outline" size={20} color="#fff" />
            <Text style={styles.withdrawBtnText}>
              {!paymentMethod.method
                ? 'Set Up Payment Method'
                : !payoutBalance.canWithdraw
                ? `Minimum ₱${payoutBalance.minimumPayout} Required`
                : 'Withdraw Funds'}
            </Text>
          </TouchableOpacity>
          
          {!paymentMethod.method && (
            <TouchableOpacity
              style={styles.setupPaymentBtn}
              onPress={() => router.push('/(drawer)/settings')}
            >
              <Text style={styles.setupPaymentBtnText}>Go to Settings</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Earnings Breakdown */}
        <View style={styles.earningsBreakdownCard}>
          <Text style={styles.breakdownTitle}>Earnings Breakdown</Text>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Gross Sales</Text>
            <Text style={styles.breakdownValue}>₱{stats.earnings.gross.toLocaleString()}</Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Fee (4%)</Text>
            <Text style={styles.breakdownValueRed}>-₱{stats.earnings.platformFee.toLocaleString()}</Text>
          </View>
          
          <View style={styles.breakdownDivider} />
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabelBold}>Net Earnings</Text>
            <Text style={styles.breakdownValueBold}>₱{stats.earnings.net.toLocaleString()}</Text>
          </View>
        </View>

        {/* Payout Stats */}
        <View style={styles.payoutStatsCard}>
          <Text style={styles.breakdownTitle}>Payout History</Text>
          
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="wallet" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>₱{payoutBalance.totalPaidOut.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Paid Out</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="time" size={24} color="#FF9800" />
              <Text style={styles.statValue}>₱{payoutBalance.pending.toLocaleString()}</Text>
              <Text style={styles.statLabel}>In Escrow</Text>
            </View>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.infoCard}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
            <Ionicons name="bulb" size={20} color="#A68C7B" style={{marginRight: 8}} />
            <Text style={styles.infoTitle}>How Payouts Work</Text>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="time-outline" size={24} color="#A68C7B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>24-Hour Escrow</Text>
              <Text style={styles.infoItemText}>
                Funds are held for 24 hours after delivery for buyer protection
              </Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="card-outline" size={24} color="#A68C7B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>GCash Payout</Text>
              <Text style={styles.infoItemText}>
                Receive money directly to your GCash account
              </Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="stats-chart-outline" size={24} color="#A68C7B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>4% Platform Fee</Text>
              <Text style={styles.infoItemText}>
                Low fees to help artists earn more
              </Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="flash-outline" size={24} color="#A68C7B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>Fast Processing</Text>
              <Text style={styles.infoItemText}>
                Withdrawals processed within minutes
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Products Tab Component
const ProductsTab = ({ products, loading, router, onDelete, onEdit, showAllProducts, setShowAllProducts, onAddProduct }) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A68C7B" />
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="pricetags-outline" size={80} color="#ccc" />
        <Text style={styles.emptyTitle}>No Products Yet</Text>
        <Text style={styles.emptyText}>Add your first product to start selling</Text>
      </View>
    );
  }

  const displayedProducts = showAllProducts ? products : products.slice(0, 6);

  return (
    <View style={styles.productsContainer}>
      {/* Add Product Button */}
      <TouchableOpacity 
        style={styles.addProductBtn}
        onPress={onAddProduct}
      >
        <Ionicons name="add-circle-outline" size={24} color="#fff" />
        <Text style={styles.addProductBtnText}>Add Product</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.sectionDivider} />

      {/* Products List */}
      <Text style={styles.productsListTitle}>Product Inventory</Text>

      {displayedProducts.map(product => (
        <View key={product.marketItemId} style={styles.productCard}>
          <Image 
            source={{ uri: product.primary_image || 'https://via.placeholder.com/100' }}
            style={styles.productImage}
          />
          <View style={styles.productInfo}>
            <View style={styles.productTitleRow}>
              <Text style={styles.productTitle} numberOfLines={1}>{product.title}</Text>
            </View>
            
            {/* Badges Row */}
            <View style={styles.productBadges}>
              {/* Condition Badge */}
              <View style={[styles.conditionBadge, styles[`condition${(product.condition || 'excellent').charAt(0).toUpperCase() + (product.condition || 'excellent').slice(1)}`]]}>
                <Text style={styles.conditionBadgeText}>
                  {(product.condition || 'excellent').charAt(0).toUpperCase() + (product.condition || 'excellent').slice(1)}
                </Text>
              </View>
              
              {/* Status Badge */}
              <View style={[styles.productStatusBadge, styles[`productStatus${(product.status || 'active').charAt(0).toUpperCase() + (product.status || 'active').slice(1)}`]]}>
                <Text style={styles.productStatusBadgeText}>
                  {(product.status || 'active').charAt(0).toUpperCase() + (product.status || 'active').slice(1)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.productPrice}>₱{product.price?.toLocaleString() || '0'}</Text>
            
            {/* Stock with Low Stock Warning */}
            <View style={styles.stockContainer}>
              <Text style={[styles.productStock, (product.quantity || 0) < 3 && styles.lowStock]}>
                Stock: {product.quantity || 0}
              </Text>
              {(product.quantity || 0) < 3 && (
                <View style={styles.lowStockBadge}>
                  <Ionicons name="warning" size={12} color="#FF9800" />
                  <Text style={styles.lowStockText}>Low</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.productActions}>
            <TouchableOpacity 
              style={styles.actionIconBtn}
              onPress={() => router.push(`/marketplace/item/${product.marketItemId}`)}
            >
              <Ionicons name="eye-outline" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionIconBtn}
              onPress={() => onEdit(product)}
            >
              <Ionicons name="create-outline" size={20} color="#A68C7B" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionIconBtn}
              onPress={() => onDelete(product)}
            >
              <Ionicons name="trash-outline" size={20} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Load More/Less Button */}
      {products.length > 6 && (
        <TouchableOpacity 
          style={styles.loadMoreBtn}
          onPress={() => setShowAllProducts(!showAllProducts)}
        >
          <Text style={styles.loadMoreText}>
            {showAllProducts ? 'Show Less' : `Load More (${products.length - 6} more)`}
          </Text>
          <Ionicons 
            name={showAllProducts ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#A68C7B" 
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Orders Tab Component
const OrdersTab = ({ orders, loading, orderFilter, setOrderFilter, orderStats, onMarkAsProcessing, onMarkAsShipped, showAllOrders, setShowAllOrders }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.ordersContainer}>
      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterBtn, orderFilter === 'all' && styles.filterBtnActive]}
          onPress={() => setOrderFilter('all')}
        >
          <Text style={[styles.filterText, orderFilter === 'all' && styles.filterTextActive]}>
            All ({orderStats.totalOrders})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, orderFilter === 'paid' && styles.filterBtnActive]}
          onPress={() => setOrderFilter('paid')}
        >
          <Text style={[styles.filterText, orderFilter === 'paid' && styles.filterTextActive]}>
            To Ship ({orderStats.toShip})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, orderFilter === 'shipped' && styles.filterBtnActive]}
          onPress={() => setOrderFilter('shipped')}
        >
          <Text style={[styles.filterText, orderFilter === 'shipped' && styles.filterTextActive]}>
            Shipping ({orderStats.shipping})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, orderFilter === 'delivered' && styles.filterBtnActive]}
          onPress={() => setOrderFilter('delivered')}
        >
          <Text style={[styles.filterText, orderFilter === 'delivered' && styles.filterTextActive]}>
            Completed ({orderStats.completed})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Orders List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A68C7B" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Orders Found</Text>
        </View>
      ) : (
        <>
        {(showAllOrders ? orders : orders.slice(0, 6)).map(order => (
          <View key={order.orderId} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <View style={styles.orderHeaderLeft}>
                <Text style={styles.orderId}>Order #{order.orderId.slice(0, 8)}</Text>
                <View style={[styles.statusBadge, styles[`status${
                  (order.status === 'pending' && order.paymentStatus === 'paid') ? 'ToShip' :
                  order.status === 'processing' ? 'Processing' :
                  order.status === 'shipped' ? 'Shipping' : 
                  order.status === 'delivered' ? 'Completed' : 
                  'Pending'
                }`]]}>
                  <Text style={styles.statusText}>
                    {(order.status === 'pending' && order.paymentStatus === 'paid') ? 'To Ship' :
                     order.status === 'processing' ? 'Processing' :
                     order.status === 'shipped' ? 'Shipping' : 
                     order.status === 'delivered' ? 'Completed' : 
                     order.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderTotal}>₱{order.totalAmount.toLocaleString()}</Text>
            </View>
            <Text style={styles.orderDate}>{formatDate(order.paidAt || order.createdAt)}</Text>
            
            {/* Order Items */}
            {order.items && order.items.length > 0 && (
              <View style={styles.orderItemsContainer}>
                {order.items.map((item, idx) => (
                  <View key={idx} style={styles.orderItem}>
                    <Image 
                      source={{ uri: item.image || 'https://via.placeholder.com/60' }}
                      style={styles.orderItemImage}
                      resizeMode="cover"
                    />
                    <View style={styles.orderItemDetails}>
                      <Text style={styles.orderItemTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.orderItemQty}>
                        Qty: {item.quantity} × ₱{item.priceAtPurchase?.toLocaleString() || '0'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {order.trackingNumber && (
              <View style={styles.trackingContainer}>
                <Ionicons name="cube-outline" size={16} color="#666" />
                <Text style={styles.trackingText}>Tracking: {order.trackingNumber}</Text>
              </View>
            )}

            {/* Show both buttons for paid orders */}
            {(order.status === 'pending' && order.paymentStatus === 'paid') && (
              <View style={styles.orderButtonsContainer}>
                <TouchableOpacity 
                  style={styles.processingBtn}
                  onPress={() => onMarkAsProcessing(order)}
                >
                  <Text style={styles.processingBtnText}>Mark as Processing</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.shipBtn}
                  onPress={() => onMarkAsShipped(order)}
                >
                  <Text style={styles.shipBtnText}>Mark as Shipped</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Show only ship button for processing orders */}
            {order.status === 'processing' && (
              <TouchableOpacity 
                style={[styles.shipBtn, styles.shipBtnFull]}
                onPress={() => onMarkAsShipped(order)}
              >
                <Text style={styles.shipBtnText}>Mark as Shipped</Text>
              </TouchableOpacity>
            )}

            {/* Show waiting status for shipped orders */}
            {order.status === 'shipped' && (
              <View style={styles.waitingContainer}>
                <Text style={styles.waitingText}>Waiting for Delivery</Text>
              </View>
            )}

            {/* Show completed status */}
            {order.status === 'delivered' && (
              <View style={styles.completedContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.completedText}>Completed</Text>
              </View>
            )}
          </View>
        ))}

        {/* Load More/Less Button */}
        {orders.length > 6 && (
          <TouchableOpacity 
            style={styles.loadMoreBtn}
            onPress={() => setShowAllOrders(!showAllOrders)}
          >
            <Text style={styles.loadMoreText}>
              {showAllOrders ? 'Show Less' : `Load More (${orders.length - 6} more)`}
            </Text>
            <Ionicons 
              name={showAllOrders ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#A68C7B" 
            />
          </TouchableOpacity>
        )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 14,
    backgroundColor: '#fff',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 12,
    minWidth: 56,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  notSellerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notSellerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  notSellerText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  applyButton: {
    backgroundColor: '#A68C7B',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Period Selector
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    padding: 4,
    borderRadius: 12,
    gap: 8,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: '#A68C7B',
  },
  periodText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  // Stats Cards
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    marginTop: 20,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  statsHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#e8e8e8',
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#e8e8e8',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statSubLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
  statBadge: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FFF5EB',
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#A68C7B',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Overview Tab
  overviewContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    fontSize: 13,
    color: '#A68C7B',
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  earningsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  earningsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#666',
  },
  earningsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  earningsFee: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
  },
  earningsTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    paddingTop: 12,
    marginTop: 8,
  },
  earningsTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  earningsTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  // Overview Period Selector
  overviewPeriodContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 4,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  overviewPeriodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  overviewPeriodBtnActive: {
    backgroundColor: '#A68C7B',
  },
  overviewPeriodText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  overviewPeriodTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  // Products Tab
  productsContainer: {
    padding: 16,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A68C7B',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  addProductBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e8e8e8',
    marginVertical: 16,
  },
  productsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A68C7B',
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#A68C7B',
    fontWeight: '600',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  productBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  conditionExcellent: {
    backgroundColor: '#E8F5E9',
  },
  conditionGood: {
    backgroundColor: '#FFF9C4',
  },
  conditionFair: {
    backgroundColor: '#FFE0B2',
  },
  conditionPoor: {
    backgroundColor: '#FFCDD2',
  },
  conditionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  productStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  productStatusActive: {
    backgroundColor: '#E3F2FD',
  },
  productStatusPending: {
    backgroundColor: '#FFF3E0',
  },
  productStatusInactive: {
    backgroundColor: '#F5F5F5',
  },
  productStatusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginBottom: 4,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productStock: {
    fontSize: 13,
    color: '#666',
  },
  lowStock: {
    color: '#F44336',
    fontWeight: '600',
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lowStockText: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '600',
  },
  productActions: {
    justifyContent: 'center',
    gap: 10,
  },
  actionIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  // Orders Tab
  ordersContainer: {
    padding: 16,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  filterBtnActive: {
    backgroundColor: '#A68C7B',
    borderColor: '#A68C7B',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusToShip: {
    backgroundColor: '#FFF3E0',
  },
  statusProcessing: {
    backgroundColor: '#E3F2FD',
  },
  statusShipping: {
    backgroundColor: '#E8F5E9',
  },
  statusCompleted: {
    backgroundColor: '#F1F8E9',
  },
  statusPending: {
    backgroundColor: '#F5F5F5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  orderDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  orderItemsContainer: {
    marginTop: 12,
    marginBottom: 12,
    gap: 10,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    gap: 12,
  },
  orderItemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#e8e8e8',
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderItemQty: {
    fontSize: 13,
    color: '#666',
  },
  trackingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EB',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  trackingText: {
    fontSize: 13,
    color: '#666',
  },
  orderButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  processingBtn: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  processingBtnText: {
    color: '#A68C7B',
    fontSize: 14,
    fontWeight: '600',
  },
  shipBtn: {
    flex: 1,
    backgroundColor: '#A68C7B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shipBtnFull: {
    flex: 0,
    marginTop: 12,
  },
  shipBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  waitingContainer: {
    backgroundColor: '#FFF5EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  waitingText: {
    color: '#A68C7B',
    fontSize: 14,
    fontWeight: '600',
  },
  completedContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  orderInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    marginTop: -8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginTop: 24,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#A68C7B',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#A68C7B',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#A68C7B',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
  },
  imagePickerScrollView: {
    marginBottom: 16,
    paddingTop: 10,
  },
  imagePreviewItem: {
    marginRight: 10,
    position: 'relative',
    paddingTop: 10,
    paddingRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 13,
  },
  addPhotoBtn: {
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
  addPhotoText: {
    fontSize: 12,
    color: '#A68C7B',
    marginTop: 4,
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dropdownBtnText: {
    fontSize: 15,
    color: '#999',
  },
  dropdownBtnTextSelected: {
    fontSize: 15,
    color: '#333',
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
  },
  submitBtn: {
    backgroundColor: '#A68C7B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Order Summary Box
  orderSummaryBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  // Input Hint
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: -8,
    marginBottom: 12,
  },
  // Tracking Tips
  trackingTips: {
    backgroundColor: '#FFF5EB',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  tipsHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  // Payouts Tab
  payoutsContainer: {
    flex: 1,
    padding: 16,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginBottom: 12,
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
  },
  pendingText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  minimumText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  warningText: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '500',
  },
  withdrawBtn: {
    flexDirection: 'row',
    backgroundColor: '#A68C7B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  withdrawBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  withdrawBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  setupPaymentBtn: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  setupPaymentBtnText: {
    color: '#A68C7B',
    fontSize: 14,
    fontWeight: '600',
  },
  earningsBreakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  breakdownValueRed: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#e8e8e8',
    marginVertical: 8,
  },
  breakdownLabelBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  breakdownValueBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  payoutStatsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e8e8e8',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoItemText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
