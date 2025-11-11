import React, { useState } from 'react';
import { Modal, View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ProductDetailModal = ({ visible, onClose, item, onAddToCart, onPlaceBid, onBuyNow }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [quantity, setQuantity] = useState(1);

  if (!item) return null;

  const isAuction = item.listingType === 'auction';
  const minBid = item.currentBid || item.startingPrice || item.price;

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(item, quantity);
      onClose();
    }
  };

  const handleBuyNow = () => {
    if (onBuyNow) {
      onBuyNow(item, quantity);
      onClose();
    }
  };

  const handlePlaceBid = () => {
    const bid = parseFloat(bidAmount);
    if (!bid || bid <= minBid) {
      Alert.alert('Invalid Bid', `Bid must be greater than ₱${minBid?.toLocaleString() || '0'}`);
      return;
    }
    if (onPlaceBid) {
      onPlaceBid(item, bid);
      setBidAmount('');
      onClose();
    }
  };

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Artwork Details</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Image */}
          <Image
            source={
              item.primary_image
                ? { uri: item.primary_image }
                : require('../../assets/pic1.jpg')
            }
            style={styles.mainImage}
            resizeMode="cover"
          />

          {/* Badges */}
          <View style={styles.badgeContainer}>
            {item.is_featured && (
              <View style={[styles.badge, styles.featuredBadge]}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.badgeText}>Featured</Text>
              </View>
            )}
            {item.is_original && (
              <View style={[styles.badge, styles.originalBadge]}>
                <Text style={styles.badgeText}>Original</Text>
              </View>
            )}
            {isAuction && (
              <View style={[styles.badge, styles.auctionBadge]}>
                <Ionicons name="trophy" size={14} color="#fff" />
                <Text style={styles.badgeText}>Auction</Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Title & Price */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>{item.title}</Text>
              {isAuction ? (
                <View>
                  <Text style={styles.bidLabel}>Current Bid</Text>
                  <Text style={styles.price}>₱{minBid?.toLocaleString() || '0'}</Text>
                  <Text style={styles.timeLeft}>{getTimeRemaining(item.endTime)}</Text>
                </View>
              ) : (
                <View>
                  {item.originalPrice && (
                    <Text style={styles.originalPrice}>₱{item.originalPrice?.toLocaleString() || '0'}</Text>
                  )}
                  <Text style={styles.price}>₱{item.price?.toLocaleString() || '0'}</Text>
                </View>
              )}
            </View>

            {/* Artist Info */}
            <View style={styles.artistSection}>
              <Text style={styles.artistLabel}>Artist</Text>
              <Text style={styles.artistName}>
                {item.seller?.shopName || 'Unknown Artist'}
              </Text>
            </View>

            {/* Details */}
            <View style={styles.detailsSection}>
              <DetailRow label="Medium" value={item.medium || 'N/A'} />
              <DetailRow label="Dimensions" value={item.dimensions || 'N/A'} />
              <DetailRow
                label="Year Created"
                value={item.year_created?.toString() || new Date().getFullYear().toString()}
              />
              <DetailRow label="Category" value={item.category || 'Art'} />
              {item.quantity && (
                <DetailRow label="Available" value={`${item.quantity} in stock`} />
              )}
            </View>

            {/* Description */}
            {item.description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            )}

            {/* Auction Bid Section */}
            {isAuction ? (
              <View style={styles.bidSection}>
                <Text style={styles.sectionTitle}>Place Your Bid</Text>
                <Text style={styles.bidHint}>Minimum bid: ₱{(minBid + 1)?.toLocaleString() || '1'}</Text>
                <View style={styles.bidInputContainer}>
                  <Text style={styles.dollarSign}>₱</Text>
                  <TextInput
                    style={styles.bidInput}
                    placeholder="Enter bid amount"
                    keyboardType="numeric"
                    value={bidAmount}
                    onChangeText={setBidAmount}
                  />
                </View>
                <TouchableOpacity
                  style={styles.bidButton}
                  onPress={handlePlaceBid}
                >
                  <Text style={styles.bidButtonText}>Place Bid</Text>
                  <Ionicons name="trophy" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buySection}>
                <View style={styles.quantitySection}>
                  <Text style={styles.sectionTitle}>Quantity</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Ionicons name="remove" size={20} color="#A68C7B" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity(quantity + 1)}
                      disabled={!!(item.quantity && quantity >= item.quantity)}
                    >
                      <Ionicons name="add" size={20} color="#A68C7B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action Buttons Row */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.addToCartButton}
                    onPress={handleAddToCart}
                  >
                    <Ionicons name="cart-outline" size={20} color="#A68C7B" />
                    <Text style={styles.addToCartText}>Add to Cart</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.buyNowButton}
                    onPress={handleBuyNow}
                  >
                    <Text style={styles.buyNowText}>Buy Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  mainImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#f0f0f0',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  featuredBadge: {
    backgroundColor: '#FFF8DC',
  },
  originalBadge: {
    backgroundColor: '#E8F5E9',
  },
  auctionBadge: {
    backgroundColor: '#A68C7B',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  bidLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  timeLeft: {
    fontSize: 14,
    color: '#FF6B6B',
    marginTop: 4,
    fontWeight: '600',
  },
  artistSection: {
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  artistLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  descriptionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  bidSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
  },
  bidHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  bidInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#A68C7B',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A68C7B',
    marginRight: 5,
  },
  bidInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  bidButton: {
    flexDirection: 'row',
    backgroundColor: '#A68C7B',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bidButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buySection: {
    marginTop: 20,
  },
  quantitySection: {
    marginBottom: 20,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#A68C7B',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 30,
    minWidth: 30,
    textAlign: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#A68C7B',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addToCartText: {
    color: '#A68C7B',
    fontSize: 15,
    fontWeight: 'bold',
  },
  buyNowButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#A68C7B',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buyNowText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default ProductDetailModal;
