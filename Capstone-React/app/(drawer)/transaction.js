import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';

const TransactionScreen = () => {
  const router = useRouter();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('ewallet'); // 'ewallet' | 'card'
  const [wallet, setWallet] = useState('gcash'); // 'gcash' | 'paymaya' | 'paypal'

  const handleConfirm = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    Alert.alert('Success', `Top up M${value} via ${method === 'ewallet' ? wallet : 'Credit Card'}`);
    // Reset form
    setAmount('');
    setShowTopUpForm(false);
    // Add your top-up logic here
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Reusable Header */}
      <Header title="Wallet" />

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Wallet Balance Card */}
        <View style={styles.walletCard}>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceAmount}>
                {balanceVisible ? 'M 0.00' : '****'}
              </Text>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
            </View>
            <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>
              <Ionicons 
                name={balanceVisible ? 'eye-outline' : 'eye-off-outline'} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.topupButton}
            onPress={() => setShowTopUpForm(!showTopUpForm)}
          >
            <Text style={styles.topupButtonText}>
              {showTopUpForm ? 'Cancel' : 'Top Up'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Top Up Form - Shows when button is clicked */}
        {showTopUpForm && (
          <View style={styles.topUpFormCard}>
            {/* Enter Amount */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>ENTER AMOUNT</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Payment Method Tabs */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>CHOOSE PAYMENT METHOD</Text>
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[styles.tab, method === 'ewallet' && styles.tabActive]}
                  onPress={() => setMethod('ewallet')}
                >
                  <Text style={[styles.tabText, method === 'ewallet' && styles.tabTextActive]}>
                    E-Wallet
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, method === 'card' && styles.tabActive]}
                  onPress={() => setMethod('card')}
                >
                  <Text style={[styles.tabText, method === 'card' && styles.tabTextActive]}>
                    Credit Card
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* E-Wallet Options */}
            {method === 'ewallet' ? (
              <View style={styles.optionsList}>
                <TouchableOpacity
                  style={[styles.option, wallet === 'gcash' && styles.optionSelected]}
                  onPress={() => setWallet('gcash')}
                >
                  <View style={[styles.brandIcon, styles.brandGcash]}>
                    <Text style={styles.brandLetter}>G</Text>
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionName}>Gcash</Text>
                    <Text style={styles.optionMasked}>09••••••66</Text>
                  </View>
                  {wallet === 'gcash' && (
                    <Ionicons name="checkmark-circle" size={24} color="#A68C7B" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.option, wallet === 'paymaya' && styles.optionSelected]}
                  onPress={() => setWallet('paymaya')}
                >
                  <View style={[styles.brandIcon, styles.brandPaymaya]}>
                    <Text style={styles.brandLetter}>P</Text>
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionName}>Paymaya</Text>
                    <Text style={styles.optionMasked}>09••••••66</Text>
                  </View>
                  {wallet === 'paymaya' && (
                    <Ionicons name="checkmark-circle" size={24} color="#A68C7B" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.option, wallet === 'paypal' && styles.optionSelected]}
                  onPress={() => setWallet('paypal')}
                >
                  <View style={[styles.brandIcon, styles.brandPaypal]}>
                    <Text style={styles.brandLetter}>P</Text>
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionName}>PayPal</Text>
                    <Text style={styles.optionMasked}>••••</Text>
                  </View>
                  {wallet === 'paypal' && (
                    <Ionicons name="checkmark-circle" size={24} color="#A68C7B" />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Card number"
                  keyboardType="numeric"
                />
                <View style={styles.cardRow}>
                  <TextInput
                    style={[styles.input, styles.cardInput]}
                    placeholder="MM/YY"
                  />
                  <TextInput
                    style={[styles.input, styles.cardInput]}
                    placeholder="CVC"
                    keyboardType="numeric"
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Name on card"
                />
              </View>
            )}

            {/* Confirm Button */}
            <TouchableOpacity
              style={[styles.confirmButton, (!amount || Number(amount) <= 0) && styles.confirmButtonDisabled]}
              disabled={!amount || Number(amount) <= 0}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  /* Wallet Card */
  walletCard: {
    marginTop: 20,
    marginHorizontal: 20,
    padding: 24,
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#A68C7B", // Same color as profile border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  balanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  
  balanceLabel: {
    fontSize: 16,
    fontWeight: "400",
    color: "#666",
  },

  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 20,
  },

  /* Top Up Button */
  topupButton: {
    backgroundColor: "#A68C7B",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#A68C7B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  topupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Top Up Form Styles
  topUpFormCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: "#A68C7B",
  },

  formGroup: {
    marginTop: 14,
  },

  label: {
    fontSize: 12,
    color: "#7b7f86",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    fontWeight: "600",
  },

  input: {
    width: "100%",
    height: 44,
    borderWidth: 1,
    borderColor: "#e6e6ea",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: "#fff",
  },

  tabs: {
    flexDirection: "row",
    gap: 12,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e6e6ea",
    alignItems: "center",
  },

  tabActive: {
    backgroundColor: "#A68C7B",
    borderColor: "#A68C7B",
  },

  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },

  tabTextActive: {
    color: "#fff",
  },

  optionsList: {
    marginTop: 12,
    gap: 10,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e6e6ea",
  },

  optionSelected: {
    backgroundColor: "#F5F0EB",
    borderColor: "#A68C7B",
    borderWidth: 2,
  },

  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  brandGcash: {
    backgroundColor: "#1a73e8",
  },

  brandPaymaya: {
    backgroundColor: "#0bb24b",
  },

  brandPaypal: {
    backgroundColor: "#003087",
  },

  brandLetter: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  optionInfo: {
    flex: 1,
  },

  optionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  optionMasked: {
    fontSize: 13,
    color: "#8a8f98",
    marginTop: 2,
  },

  cardForm: {
    marginTop: 12,
    gap: 10,
  },

  cardRow: {
    flexDirection: "row",
    gap: 10,
  },

  cardInput: {
    flex: 1,
  },

  confirmButton: {
    backgroundColor: "#A68C7B",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#A68C7B",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  confirmButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
  },

  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default TransactionScreen;
