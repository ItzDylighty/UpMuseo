import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  RefreshControl,
  Modal,
  Image,
  Alert,
  Linking,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase/supabaseClient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const API_BASE = "http://192.168.254.114:3000/api";

export default function MyOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // Default to "All"
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch orders
  const fetchOrders = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/marketplace/orders/buyer`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const orderData = result.data || [];
        console.log('📦 Orders fetched:', orderData.length);
        if (orderData.length > 0) {
          console.log('📦 First order sample:', {
            orderId: orderData[0].orderId?.slice(0, 8),
            paymentStatus: orderData[0].paymentStatus,
            status: orderData[0].status
          });
        }
        setOrders(orderData);
      } else {
        console.error('Failed to fetch orders:', result.error);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch order details
  const handleViewDetails = async (orderId) => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/marketplace/orders/${orderId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSelectedOrder(result.data);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert('Error', 'Failed to load order details');
    }
  };

  // Handle payment
  const handlePayNow = async (order) => {
    try {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || '';
      const rt = data?.session?.refresh_token || '';

      const response = await fetch(`${API_BASE}/marketplace/orders/${order.orderId}/payment-link`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Cookie: `access_token=${at}; refresh_token=${rt}`,
          'Authorization': `Bearer ${at}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success && result.data.paymentUrl) {
        const supported = await Linking.canOpenURL(result.data.paymentUrl);
        if (supported) {
          await Linking.openURL(result.data.paymentUrl);
          Alert.alert('Payment', 'Payment link opened. Please complete your payment.');
        } else {
          Alert.alert('Error', 'Cannot open payment link');
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to get payment link');
      }
    } catch (error) {
      console.error('Error getting payment link:', error);
      Alert.alert('Error', 'Failed to get payment link');
    }
  };

  // Cancel order
  const handleCancelOrder = async (orderId) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data } = await supabase.auth.getSession();
              const at = data?.session?.access_token || '';
              const rt = data?.session?.refresh_token || '';

              const response = await fetch(`${API_BASE}/marketplace/orders/${orderId}/cancel`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  Cookie: `access_token=${at}; refresh_token=${rt}`,
                  'Authorization': `Bearer ${at}`,
                },
                body: JSON.stringify({ reason: 'Cancelled by buyer' })
              });

              const result = await response.json();

              if (response.ok && result.success) {
                Alert.alert('Success', 'Order cancelled successfully');
                fetchOrders();
                setShowDetailsModal(false);
              } else {
                Alert.alert('Error', result.error || 'Failed to cancel order');
              }
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', 'Failed to cancel order');
            }
          }
        }
      ]
    );
  };

  // Mark as delivered
  const handleMarkAsDelivered = async (orderId) => {
    Alert.alert(
      'Confirm Receipt',
      'Have you received this order?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Received',
          onPress: async () => {
            try {
              const { data } = await supabase.auth.getSession();
              const at = data?.session?.access_token || '';
              const rt = data?.session?.refresh_token || '';

              const response = await fetch(`${API_BASE}/marketplace/orders/${orderId}/deliver`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                  Cookie: `access_token=${at}; refresh_token=${rt}`,
                  'Authorization': `Bearer ${at}`,
                },
              });

              const result = await response.json();

              if (response.ok && result.success) {
                Alert.alert('Success', 'Order marked as delivered!');
                fetchOrders();
                setShowDetailsModal(false);
              } else {
                Alert.alert('Error', result.error || 'Failed to update order');
              }
            } catch (error) {
              console.error('Error marking as delivered:', error);
              Alert.alert('Error', 'Failed to update order');
            }
          }
        }
      ]
    );
  };

  // Calculate order counts
  const getOrderCounts = () => {
    const counts = {
      all: orders.length,
      pending: 0,
      paid: 0,
      shipped: 0,
      delivered: 0
    };

    orders.forEach(order => {
      const paymentStatus = order.paymentStatus?.toLowerCase();
      const orderStatus = order.status?.toLowerCase();

      if (paymentStatus === 'pending' && orderStatus !== 'cancelled') {
        counts.pending++;
      }
      if (paymentStatus === 'paid' && (orderStatus === 'pending' || orderStatus === 'processing')) {
        counts.paid++;
      }
      if (orderStatus === 'shipped') {
        counts.shipped++;
      }
      if (orderStatus === 'delivered') {
        counts.delivered++;
      }
    });

    return counts;
  };

  // Filter orders
  const getFilteredOrders = () => {
    if (activeTab === 'all') return orders;
    
    if (activeTab === 'pending') {
      const filtered = orders.filter(o => {
        const paymentStatus = o.paymentStatus?.toLowerCase();
        const orderStatus = o.status?.toLowerCase();
        return paymentStatus === 'pending' && orderStatus !== 'cancelled';
      });
      console.log(`🔍 Pending Payment filter: ${filtered.length} of ${orders.length} orders`);
      return filtered;
    }
    
    if (activeTab === 'paid') {
      return orders.filter(o => {
        const paymentStatus = o.paymentStatus?.toLowerCase();
        const orderStatus = o.status?.toLowerCase();
        return paymentStatus === 'paid' && (orderStatus === 'pending' || orderStatus === 'processing');
      });
    }
    
    if (activeTab === 'shipped') {
      return orders.filter(o => {
        const orderStatus = o.status?.toLowerCase();
        return orderStatus === 'shipped';
      });
    }
    
    if (activeTab === 'delivered') {
      return orders.filter(o => {
        const orderStatus = o.status?.toLowerCase();
        return orderStatus === 'delivered';
      });
    }
    
    return orders;
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    fetchOrders(true);
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const filteredOrders = getFilteredOrders();
  const orderCounts = getOrderCounts();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push('/(drawer)/marketplace')}
            hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
            activeOpacity={0.6}
          >
            <Ionicons name="arrow-back" size={26} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A68C7B" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <>
          {/* Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabsContainer}
            contentContainerStyle={styles.tabsContent}
          >
            <TouchableOpacity
              style={styles.tab}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                All Orders ({orderCounts.all})
              </Text>
              {activeTab === 'all' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tab}
              onPress={() => setActiveTab('pending')}
            >
              <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                Pending Payment ({orderCounts.pending})
              </Text>
              {activeTab === 'pending' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tab}
              onPress={() => setActiveTab('paid')}
            >
              <Text style={[styles.tabText, activeTab === 'paid' && styles.tabTextActive]}>
                Processing ({orderCounts.paid})
              </Text>
              {activeTab === 'paid' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tab}
              onPress={() => setActiveTab('shipped')}
            >
              <Text style={[styles.tabText, activeTab === 'shipped' && styles.tabTextActive]}>
                Shipping ({orderCounts.shipped})
              </Text>
              {activeTab === 'shipped' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tab}
              onPress={() => setActiveTab('delivered')}
            >
              <Text style={[styles.tabText, activeTab === 'delivered' && styles.tabTextActive]}>
                Completed ({orderCounts.delivered})
              </Text>
              {activeTab === 'delivered' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </ScrollView>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyStateWrapper}>
              <View style={styles.emptyContainer}>
                <Ionicons name="clipboard-outline" size={100} color="#d0d0d0" />
                <Text style={styles.emptyTitle}>No Orders Yet</Text>
              </View>
            </View>
          ) : (
            <ScrollView 
              style={styles.container} 
              contentContainerStyle={styles.contentContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#A68C7B']}
                  tintColor="#A68C7B"
                />
              }
            >
              {filteredOrders.map(order => (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  onViewDetails={handleViewDetails}
                  onPayNow={handlePayNow}
                  onCancel={handleCancelOrder}
                  onMarkDelivered={handleMarkAsDelivered}
                />
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          visible={showDetailsModal}
          order={selectedOrder}
          onClose={() => setShowDetailsModal(false)}
          onCancel={handleCancelOrder}
          onMarkDelivered={handleMarkAsDelivered}
        />
      )}
    </SafeAreaView>
  );
}

// OrderCard Component
const OrderCard = ({ order, onViewDetails, onPayNow, onCancel, onMarkDelivered }) => {
  const getStatusBadge = () => {
    if (order.status === 'cancelled') {
      return { text: 'Cancelled', color: '#F44336' };
    }
    if (order.paymentStatus === 'pending') {
      return { text: 'Awaiting Payment', color: '#FF9800' };
    }
    if (order.paymentStatus === 'paid' && order.status === 'pending') {
      return { text: 'To Ship', color: '#2196F3' };
    }
    if (order.status === 'processing') {
      return { text: 'Processing', color: '#2196F3' };
    }
    if (order.status === 'shipped') {
      return { text: 'Shipping', color: '#A68C7B' };
    }
    if (order.status === 'delivered') {
      return { text: 'Completed', color: '#4CAF50' };
    }
    return { text: order.status?.toUpperCase() || 'PENDING', color: '#999' };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return `₱${parseFloat(price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const statusBadge = getStatusBadge();

  return (
    <View style={styles.orderCard}>
      {/* Header */}
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Order #{order.orderId.slice(0, 8)}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBadge.color }]}>
          <Text style={styles.statusBadgeText}>{statusBadge.text}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.orderBody}>
        <View style={styles.orderRow}>
          <Text style={styles.orderLabel}>Total Amount:</Text>
          <Text style={styles.orderValue}>{formatPrice(order.totalAmount)}</Text>
        </View>
        {order.paymentMethodUsed && (
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Payment:</Text>
            <Text style={styles.orderValue}>{order.paymentMethodUsed}</Text>
          </View>
        )}
        {order.shippingAddress && (
          <View style={styles.shippingInfo}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.shippingText}>
              {order.shippingAddress.street}, {order.shippingAddress.city}
            </Text>
          </View>
        )}
        {order.trackingNumber && (
          <View style={styles.trackingInfo}>
            <Ionicons name="cube-outline" size={16} color="#666" />
            <Text style={styles.trackingText}>
              <Text style={styles.trackingLabel}>Tracking: </Text>
              {order.trackingNumber}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.orderActions}>
        <TouchableOpacity
          style={[styles.actionBtnSecondary, order.status === 'shipped' ? styles.actionBtnSmaller : null]}
          onPress={() => onViewDetails(order.orderId)}
        >
          <Text style={styles.actionBtnSecondaryText}>View Details</Text>
        </TouchableOpacity>

        {order.paymentStatus === 'pending' && order.status !== 'cancelled' && (
          <>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => onPayNow(order)}
            >
              <Ionicons name="card-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnPrimaryText}>Pay Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnDanger}
              onPress={() => onCancel(order.orderId)}
            >
              <Text style={styles.actionBtnDangerText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {order.status === 'shipped' && (
          <TouchableOpacity
            style={styles.actionBtnSuccess}
            onPress={() => onMarkDelivered(order.orderId)}
          >
            <Text style={styles.actionBtnSuccessText}>Mark as Received</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// OrderDetailsModal Component
const OrderDetailsModal = ({ visible, order, onClose, onCancel, onMarkDelivered }) => {
  const getStatusBadge = () => {
    if (order.status === 'cancelled') {
      return { text: 'Cancelled', color: '#F44336' };
    }
    if (order.paymentStatus === 'pending') {
      return { text: 'Awaiting Payment', color: '#FF9800' };
    }
    if (order.paymentStatus === 'paid' && order.status === 'pending') {
      return { text: 'To Ship', color: '#2196F3' };
    }
    if (order.status === 'processing') {
      return { text: 'Processing', color: '#2196F3' };
    }
    if (order.status === 'shipped') {
      return { text: 'Shipping', color: '#A68C7B' };
    }
    if (order.status === 'delivered') {
      return { text: 'Completed', color: '#4CAF50' };
    }
    return { text: order.status?.toUpperCase() || 'PENDING', color: '#999' };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return `₱${parseFloat(price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const statusBadge = getStatusBadge();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Order Info */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Order Information</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Order ID:</Text>
                  <Text style={styles.detailValue}>{order.orderId}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusBadge.color }]}>
                    <Text style={styles.statusBadgeText}>{statusBadge.text}</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Order Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(order.createdAt)}</Text>
                </View>
                {order.paidAt && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Paid At:</Text>
                    <Text style={styles.detailValue}>{formatDate(order.paidAt)}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Items */}
            {order.items && order.items.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Order Items</Text>
                {order.items.map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    <Image
                      source={{ uri: item.itemImage || 'https://via.placeholder.com/80' }}
                      style={styles.orderItemImage}
                    />
                    <View style={styles.orderItemDetails}>
                      <Text style={styles.orderItemTitle}>{item.itemTitle}</Text>
                      <Text style={styles.orderItemQty}>Quantity: {item.quantity}</Text>
                      <Text style={styles.orderItemPrice}>{formatPrice(item.price)} each</Text>
                    </View>
                    <Text style={styles.orderItemTotal}>{formatPrice(item.price * item.quantity)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Shipping Address */}
            {order.shippingAddress && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Shipping Address</Text>
                <View style={styles.addressDetails}>
                  <Text style={styles.addressName}>{order.shippingAddress.fullName}</Text>
                  <Text style={styles.addressText}>{order.shippingAddress.phone}</Text>
                  <Text style={styles.addressText}>{order.shippingAddress.street}</Text>
                  <Text style={styles.addressText}>
                    {order.shippingAddress.barangay}, {order.shippingAddress.city}
                  </Text>
                  <Text style={styles.addressText}>
                    {order.shippingAddress.province} {order.shippingAddress.postalCode}
                  </Text>
                </View>
              </View>
            )}

            {/* Tracking */}
            {order.trackingNumber && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Tracking Information</Text>
                <View style={styles.trackingBox}>
                  <Ionicons name="cube-outline" size={24} color="#A68C7B" />
                  <View style={styles.trackingBoxContent}>
                    <Text style={styles.trackingBoxLabel}>Tracking Number</Text>
                    <Text style={styles.trackingBoxNumber}>{order.trackingNumber}</Text>
                  </View>
                </View>
                {order.shippedAt && (
                  <Text style={styles.trackingDate}>Shipped on: {formatDate(order.shippedAt)}</Text>
                )}
              </View>
            )}

            {/* Payment Summary */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Payment Summary</Text>
              <View style={styles.paymentSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>{formatPrice(order.totalAmount)}</Text>
                </View>
                {order.paymentFee > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Payment Fee:</Text>
                    <Text style={styles.summaryValue}>{formatPrice(order.paymentFee)}</Text>
                  </View>
                )}
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.summaryTotalLabel}>Total:</Text>
                  <Text style={styles.summaryTotalValue}>{formatPrice(order.totalAmount)}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer - Only show if there are actions */}
          {(order.paymentStatus === 'pending' && order.status !== 'cancelled') || order.status === 'shipped' ? (
            <View style={styles.modalFooter}>
              {order.paymentStatus === 'pending' && order.status !== 'cancelled' && (
                <TouchableOpacity
                  style={styles.modalBtnDanger}
                  onPress={() => onCancel(order.orderId)}
                >
                  <Text style={styles.modalBtnDangerText}>Cancel Order</Text>
                </TouchableOpacity>
              )}

              {order.status === 'shipped' && (
                <TouchableOpacity
                  style={styles.modalBtnSuccess}
                  onPress={() => onMarkDelivered(order.orderId)}
                >
                  <Text style={styles.modalBtnSuccessText}>Mark as Received</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 14,
    paddingBottom: 10,
    backgroundColor: '#fff',
    height: 60,
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
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    maxHeight: 44,
    marginTop: 0,
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: 6,
    position: 'relative',
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '400',
  },
  tabTextActive: {
    color: '#A68C7B',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: '#A68C7B',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
  },
  // Empty State
  emptyStateWrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    paddingTop: 120,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 20,
  },
  // Order Card
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderBody: {
    padding: 16,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  shippingText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFF5EB',
    padding: 10,
    borderRadius: 8,
  },
  trackingText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  trackingLabel: {
    fontWeight: '600',
    color: '#A68C7B',
  },
  orderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionBtnSecondary: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#A68C7B',
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnSmaller: {
    flex: 0.8,
  },
  actionBtnSecondaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnPrimary: {
    flex: 1,
    minWidth: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#A68C7B',
    borderRadius: 8,
    gap: 6,
  },
  actionBtnPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnDanger: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnDangerText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnSuccess: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    gap: 6,
  },
  actionBtnSuccessText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal
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
    color: '#333',
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  orderItem: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  orderItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  orderItemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  orderItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderItemQty: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  orderItemPrice: {
    fontSize: 12,
    color: '#999',
  },
  orderItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A68C7B',
    alignSelf: 'center',
  },
  addressDetails: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  trackingBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  trackingBoxContent: {
    marginLeft: 12,
    flex: 1,
  },
  trackingBoxLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  trackingBoxNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A68C7B',
  },
  trackingDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  paymentSummary: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summaryTotal: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#A68C7B',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnSecondaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBtnDanger: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F44336',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnDangerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBtnSuccess: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnSuccessText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
