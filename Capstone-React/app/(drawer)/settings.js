import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Platform, KeyboardAvoidingView, Alert, SafeAreaView, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import Header from "../components/Header";
import { Ionicons } from '@expo/vector-icons';
import { supabase } from "../../supabase/supabaseClient";
import { useUser } from "../contexts/UserContext";

const API_BASE = "http://192.168.254.114:3000/api";
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

export default function SettingsScreen() {
  const { userData, refreshUserData } = useUser();
  const role = userData?.role || null;
  const router = useRouter();

  // Profile state
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
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  // Notification states
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [newFollowers, setNewFollowers] = useState(true);
  const [commentsLikes, setCommentsLikes] = useState(true);
  
  // Notifications list
  const [notifications, setNotifications] = useState([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  // Collapsible sections
  const [accountExpanded, setAccountExpanded] = useState(true);
  const [notificationsExpanded, setNotificationsExpanded] = useState(true);
  const [marketplaceExpanded, setMarketplaceExpanded] = useState(true);

  // Privacy states
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showActivityStatus, setShowActivityStatus] = useState(true);
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);

  // Marketplace states
  const [commissionRate, setCommissionRate] = useState('15');
  const [acceptCustomOrders, setAcceptCustomOrders] = useState(true);
  const [internationalShipping, setInternationalShipping] = useState(false);
  const [vacationMode, setVacationMode] = useState(false);

  // Edit Profile modal state
  const [modalVisible, setModalVisible] = useState(false);
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSexDropdown, setShowSexDropdown] = useState(false);

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
  const [appValidIdImage, setAppValidIdImage] = useState(null);
  const [appSelfieImage, setAppSelfieImage] = useState(null);
  const [appSubmitting, setAppSubmitting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // Apply as Seller modal state (3-step wizard)
  const [sellerModalVisible, setSellerModalVisible] = useState(false);
  const [sellerCurrentStep, setSellerCurrentStep] = useState(1);
  const [sellerSubmitting, setSellerSubmitting] = useState(false);
  const [hasPendingSellerRequest, setHasPendingSellerRequest] = useState(false);
  
  // Step 1: Basic Information
  const [shopName, setShopName] = useState("");
  const [sellerFullName, setSellerFullName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  
  // Step 2: Business Address (PSGC)
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showBarangayDropdown, setShowBarangayDropdown] = useState(false);
  
  // Step 3: Verification & Terms
  const [shopDescription, setShopDescription] = useState("");
  const [sellerIdDocument, setSellerIdDocument] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [sellerApplicationStatus, setSellerApplicationStatus] = useState(null); // 'pending', 'approved', 'rejected'

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const at = data?.session?.access_token || null;
        const rt = data?.session?.refresh_token || null;
        setAccessToken(at);
        setRefreshToken(rt);

        if (at && rt) {
          await refreshUserData();
          await fetchProfile(at, rt);
          await checkPendingRequest(at, rt);
        }
      } catch (e) {
        console.warn("Settings init error:", e?.message || e);
      }
    };
    init();
  }, []);

  // Refresh profile data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refresh = async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const at = data?.session?.access_token || null;
          const rt = data?.session?.refresh_token || null;
          
          if (at && rt) {
            await refreshUserData();
            await fetchProfile(at, rt);
            await checkPendingRequest(at, rt);
          }
        } catch (e) {
          console.warn("Settings focus refresh error:", e?.message || e);
        }
      };
      refresh();
      return () => {};
    }, [])
  );

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
    }
  };

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
      
      if (data?.requests && Array.isArray(data.requests)) {
        const pendingArtistRequest = data.requests.find(
          req => req.requestType === 'artist_verification' && req.status === 'pending'
        );
        const hasPending = !!pendingArtistRequest;
        setHasPendingRequest(hasPending);
        return hasPending;
      }
      setHasPendingRequest(false);
      return false;
    } catch (error) {
      console.error("Error checking pending request:", error?.message || error);
      setHasPendingRequest(false);
      return false;
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

  const onChangeTempDate = (event, selectedDate) => {
    if (selectedDate) setTempBirthday(selectedDate);
    if (Platform.OS === 'android') setShowDatePicker(false);
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
      await refreshUserData();

      Alert.alert("Success", "Profile updated successfully!");
    } catch (err) {
      console.error("Profile update error:", err);
      Alert.alert("Update Failed", err?.message || "Failed to save profile information");
    }
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

      let at = accessToken, rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
      }

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
      fd.append('consent', 'true');
      fd.append('file', { uri: appValidIdImage.uri, name: 'valid_id.jpg', type: 'image/jpeg' });
      fd.append('file2', { uri: appSelfieImage.uri, name: 'selfie.jpg', type: 'image/jpeg' });

      const endpoint = `${API_BASE}/request/registerAsArtist`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
        body: fd,
      });
      const bodyText = await res.text();
      if (!res.ok) throw new Error(bodyText || 'Application failed');

      await checkPendingRequest(at, rt);
      Alert.alert('Submitted', 'Your application has been submitted.');
      setApplyModalVisible(false);
    } catch (e) {
      console.error('submitArtistApplication error:', e?.message || e);
      Alert.alert('Failed', e?.message || 'Could not submit application');
    } finally {
      setAppSubmitting(false);
    }
  };

  // Fetch PSGC regions when seller modal opens
  useEffect(() => {
    if (sellerModalVisible) {
      fetchRegions();
      // Pre-fill user data
      setSellerFullName(userData?.fullName || firstName + ' ' + lastName || '');
      setSellerEmail(userData?.email || '');
    }
  }, [sellerModalVisible]);

  const fetchRegions = async () => {
    try {
      const response = await fetch('https://psgc.gitlab.io/api/regions/');
      const data = await response.json();
      setRegions(data);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const fetchProvinces = async (regionCode) => {
    try {
      const response = await fetch(`https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`);
      const data = await response.json();
      setProvinces(data);
    } catch (error) {
      console.error('Error fetching provinces:', error);
    }
  };

  const fetchCities = async (provinceCode) => {
    try {
      const response = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);
      const data = await response.json();
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchBarangays = async (cityCode) => {
    try {
      const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`);
      const data = await response.json();
      setBarangays(data);
    } catch (error) {
      console.error('Error fetching barangays:', error);
    }
  };

  const handleRegionChange = (regionCode) => {
    setSelectedRegion(regionCode);
    setSelectedProvince('');
    setSelectedCity('');
    setSelectedBarangay('');
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    if (regionCode) {
      fetchProvinces(regionCode);
    }
    setShowRegionDropdown(false);
  };

  const handleProvinceChange = (provinceCode) => {
    setSelectedProvince(provinceCode);
    setSelectedCity('');
    setSelectedBarangay('');
    setCities([]);
    setBarangays([]);
    if (provinceCode) {
      fetchCities(provinceCode);
    }
    setShowProvinceDropdown(false);
  };

  const handleCityChange = (cityCode) => {
    setSelectedCity(cityCode);
    setSelectedBarangay('');
    setBarangays([]);
    if (cityCode) {
      fetchBarangays(cityCode);
    }
    setShowCityDropdown(false);
  };

  const handleBarangayChange = (barangayCode) => {
    setSelectedBarangay(barangayCode);
    setShowBarangayDropdown(false);
  };

  const validateSellerStep = () => {
    if (sellerCurrentStep === 1) {
      if (!shopName.trim() || !sellerFullName.trim() || !sellerEmail.trim() || !sellerPhone.trim()) {
        Alert.alert('Incomplete', 'Please fill in all required fields.');
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(sellerEmail)) {
        Alert.alert('Invalid', 'Please enter a valid email address.');
        return false;
      }
    } else if (sellerCurrentStep === 2) {
      if (!street.trim() || !selectedRegion || !selectedProvince || !selectedCity || !selectedBarangay || !postalCode.trim()) {
        Alert.alert('Incomplete', 'Please complete all address fields.');
        return false;
      }
    } else if (sellerCurrentStep === 3) {
      if (!shopDescription.trim() || !sellerIdDocument) {
        Alert.alert('Incomplete', 'Please provide shop description and upload your ID.');
        return false;
      }
      if (!agreedToTerms) {
        Alert.alert('Agreement Required', 'You must agree to the Seller Terms and Conditions.');
        return false;
      }
    }
    return true;
  };

  const handleSellerNext = () => {
    if (validateSellerStep()) {
      setSellerCurrentStep(prev => prev + 1);
    }
  };

  const handleSellerBack = () => {
    setSellerCurrentStep(prev => prev - 1);
  };

  const submitSellerApplication = async () => {
    if (!validateSellerStep()) return;

    try {
      setSellerSubmitting(true);

      let at = accessToken, rt = refreshToken;
      if (!at || !rt) {
        const { data } = await supabase.auth.getSession();
        at = data?.session?.access_token || at;
        rt = data?.session?.refresh_token || rt;
      }

      const region = regions.find(r => r.code === selectedRegion);
      const province = provinces.find(p => p.code === selectedProvince);
      const city = cities.find(c => c.code === selectedCity);
      const barangay = barangays.find(b => b.code === selectedBarangay);

      const fd = new FormData();
      fd.append('shopName', shopName);
      fd.append('fullName', sellerFullName);
      fd.append('email', sellerEmail);
      fd.append('phoneNumber', sellerPhone);
      fd.append('street', street);
      fd.append('landmark', landmark);
      fd.append('region', region?.name || '');
      fd.append('province', province?.name || '');
      fd.append('city', city?.name || '');
      fd.append('barangay', barangay?.name || '');
      fd.append('postalCode', postalCode);
      fd.append('shopDescription', shopDescription);
      fd.append('idDocument', {
        uri: sellerIdDocument.uri,
        name: 'government_id.jpg',
        type: 'image/jpeg'
      });

      const endpoint = `${API_BASE}/marketplace/seller/apply`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Cookie: `access_token=${at}; refresh_token=${rt}` },
        body: fd,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Application failed');
      }

      const data = await res.json();
      
      // Success notification with detailed message
      Alert.alert(
        '🎉 Application Submitted!',
        data.message || 'Your seller application has been submitted successfully!\n\nWhat happens next:\n• Our team will review your application\n• You\'ll be notified via email once approved\n• You can check your application status in Settings\n\nThank you for joining Museo Marketplace!',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Seller application submitted successfully');
            }
          }
        ]
      );
      
      setHasPendingSellerRequest(true);
      resetSellerForm();
      setSellerModalVisible(false);
    } catch (e) {
      console.error('submitSellerApplication error:', e?.message || e);
      Alert.alert('Failed', e?.message || 'Could not submit application');
    } finally {
      setSellerSubmitting(false);
    }
  };

  const pickSellerIdDocument = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setSellerIdDocument({ uri: result.assets[0].uri });
    }
  };

  const resetSellerForm = () => {
    setSellerCurrentStep(1);
    setShopName('');
    setSellerFullName('');
    setSellerEmail('');
    setSellerPhone('');
    setStreet('');
    setLandmark('');
    setSelectedRegion('');
    setSelectedProvince('');
    setSelectedCity('');
    setSelectedBarangay('');
    setPostalCode('');
    setShopDescription('');
    setSellerIdDocument(null);
    setAgreedToTerms(false);
  };

  const formattedTempDate = tempBirthday
    ? tempBirthday.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Settings" showSearch={false} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        
        {/* Profile Section */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Settings</Text>
            
            {/* Profile Preview - Tap to View */}
            <TouchableOpacity 
              style={styles.profilePreviewCard}
              onPress={() => router.push('/profile')}
              activeOpacity={0.7}
            >
              <Image 
                source={image || { uri: 'https://via.placeholder.com/100' }} 
                style={styles.profileAvatar}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {userData?.fullName || userData?.username || 'User Name'}
                </Text>
                <Text style={styles.profileUsername}>@{userData?.username || 'username'}</Text>
                <Text style={styles.profileViewHint}>Tap to view profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#A68C7B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => {
                setTempImage(image);
                setTempBackgroundImage(backgroundImage);
                setTempFirstName(firstName);
                setTempMiddleName(middleName);
                setTempLastName(lastName);
                setTempUserNameField(userNameField || username);
                setTempSex(sex);
                setTempBirthday(birthday || new Date());
                setTempAddress(address);
                setTempBio(bio);
                setTempAbout(about);
                setModalVisible(true);
              }}
            >
              <View style={styles.settingContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="create-outline" size={24} color="#A68C7B" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Edit Profile</Text>
                  <Text style={styles.settingDescription}>Update your personal information</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>

            {/* Privacy Settings */}
            <Text style={styles.groupTitle}>Privacy</Text>
            
            <View>
              <View style={[styles.settingButton, styles.visibilityContainer]}>
                <View style={styles.settingContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="eye-outline" size={24} color="#A68C7B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingTitle}>Profile Visibility</Text>
                    <Text style={styles.settingDescription}>Control who can see your profile</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.visibilitySelector}
                  onPress={() => setShowVisibilityDropdown(!showVisibilityDropdown)}
                >
                  <Text style={{ color: '#A68C7B', fontSize: 14, fontWeight: '600', flex: 1 }}>
                    {profileVisibility === 'public' ? 'Public' : profileVisibility === 'followers' ? 'Followers Only' : 'Private'}
                  </Text>
                  <Ionicons name={showVisibilityDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#A68C7B" />
                </TouchableOpacity>
              </View>
              
              {showVisibilityDropdown && (
                <View style={styles.dropdownMenu}>
                <TouchableOpacity 
                  style={styles.dropdownItem}
                  onPress={() => {
                    setProfileVisibility('public');
                    setShowVisibilityDropdown(false);
                  }}
                >
                  <Ionicons name="globe-outline" size={20} color="#666" />
                  <Text style={styles.dropdownText}>Public</Text>
                  {profileVisibility === 'public' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.dropdownItem}
                  onPress={() => {
                    setProfileVisibility('followers');
                    setShowVisibilityDropdown(false);
                  }}
                >
                  <Ionicons name="people-outline" size={20} color="#666" />
                  <Text style={styles.dropdownText}>Followers Only</Text>
                  {profileVisibility === 'followers' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.dropdownItem}
                  onPress={() => {
                    setProfileVisibility('private');
                    setShowVisibilityDropdown(false);
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={20} color="#666" />
                  <Text style={styles.dropdownText}>Private</Text>
                  {profileVisibility === 'private' && <Ionicons name="checkmark" size={20} color="#A68C7B" />}
                </TouchableOpacity>
              </View>
              )}
            </View>

            <View style={styles.settingToggleItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Show Activity Status</Text>
                <Text style={styles.settingDescription}>Let others see when you're active</Text>
              </View>
              <TouchableOpacity 
                style={[styles.toggleSwitch, showActivityStatus && styles.toggleSwitchActive]}
                onPress={() => setShowActivityStatus(!showActivityStatus)}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, showActivityStatus && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setAccountExpanded(!accountExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Account Settings</Text>
              <Ionicons 
                name={accountExpanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#A68C7B" 
              />
            </TouchableOpacity>
            
            {accountExpanded && (
              <View>
                <Text style={styles.groupTitle}>Security</Text>
            <TouchableOpacity style={styles.settingButton}>
              <View style={styles.settingContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="key-outline" size={24} color="#A68C7B" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Change Password</Text>
                  <Text style={styles.settingDescription}>Update your account password</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingButton}>
              <View style={styles.settingContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="mail-outline" size={24} color="#A68C7B" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Update Email</Text>
                  <Text style={styles.settingDescription}>{userData?.email || 'user@example.com'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>

            <Text style={styles.groupTitle}>Account Management</Text>
            <TouchableOpacity style={styles.settingButton}>
              <View style={styles.settingContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="trash-outline" size={24} color="#FF4444" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: '#FF4444' }]}>Delete Account</Text>
                  <Text style={styles.settingDescription}>Permanently delete your account</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>
              </View>
            )}
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setNotificationsExpanded(!notificationsExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Notification Preferences</Text>
              <Ionicons 
                name={notificationsExpanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#A68C7B" 
              />
            </TouchableOpacity>
            
            {notificationsExpanded && (
              <View>
            
            <Text style={styles.groupTitle}>Email Notifications</Text>
            
            <View style={styles.settingToggleItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Marketing Emails</Text>
                <Text style={styles.settingDescription}>Updates about new features</Text>
              </View>
              <TouchableOpacity 
                style={[styles.toggleSwitch, marketingEmails && styles.toggleSwitchActive]}
                onPress={() => setMarketingEmails(!marketingEmails)}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, marketingEmails && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingToggleItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Order Updates</Text>
                <Text style={styles.settingDescription}>Get notified about order status</Text>
              </View>
              <TouchableOpacity 
                style={[styles.toggleSwitch, orderUpdates && styles.toggleSwitchActive]}
                onPress={() => setOrderUpdates(!orderUpdates)}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, orderUpdates && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingToggleItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>New Followers</Text>
                <Text style={styles.settingDescription}>When someone follows you</Text>
              </View>
              <TouchableOpacity 
                style={[styles.toggleSwitch, newFollowers && styles.toggleSwitchActive]}
                onPress={() => setNewFollowers(!newFollowers)}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, newFollowers && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingToggleItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Comments & Likes</Text>
                <Text style={styles.settingDescription}>Interactions on your posts</Text>
              </View>
              <TouchableOpacity 
                style={[styles.toggleSwitch, commentsLikes && styles.toggleSwitchActive]}
                onPress={() => setCommentsLikes(!commentsLikes)}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, commentsLikes && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
              </View>
            )}
        </View>

        {/* Marketplace Section */}
        <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setMarketplaceExpanded(!marketplaceExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Marketplace</Text>
              <Ionicons 
                name={marketplaceExpanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#A68C7B" 
              />
            </TouchableOpacity>
            
            {marketplaceExpanded && (
              <View>
            
            {userData?.isSeller ? (
              <>
                <View style={styles.sellerBadge}>
                  <Ionicons name="star" size={24} color="#FFD700" />
                  <Text style={styles.sellerBadgeText}>Verified Seller</Text>
                </View>

                <Text style={styles.groupTitle}>Seller Preferences</Text>
                
                <View style={styles.settingToggleItem}>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Accept Custom Orders</Text>
                    <Text style={styles.settingDescription}>Allow custom artwork requests</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.toggleSwitch, acceptCustomOrders && styles.toggleSwitchActive]}
                    onPress={() => setAcceptCustomOrders(!acceptCustomOrders)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.toggleThumb, acceptCustomOrders && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.settingToggleItem}>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>International Shipping</Text>
                    <Text style={styles.settingDescription}>Ship artwork internationally</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.toggleSwitch, internationalShipping && styles.toggleSwitchActive]}
                    onPress={() => setInternationalShipping(!internationalShipping)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.toggleThumb, internationalShipping && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.settingToggleItem}>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Vacation Mode</Text>
                    <Text style={styles.settingDescription}>Temporarily pause your store</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.toggleSwitch, vacationMode && styles.toggleSwitchActive]}
                    onPress={() => setVacationMode(!vacationMode)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.toggleThumb, vacationMode && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Apply as Artist Section */}
                {String(role ?? '').trim().toLowerCase() === 'user' && (
                  <View>
                    <Text style={styles.groupTitle}>Become an Artist</Text>
                    <TouchableOpacity
                      style={[styles.settingButton, hasPendingRequest && styles.disabledButton]}
                      onPress={() => {
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
                      }}
                      disabled={hasPendingRequest}
                    >
                      <View style={styles.settingContent}>
                        <View style={styles.iconContainer}>
                          <Ionicons name="brush-outline" size={24} color={hasPendingRequest ? "#999" : "#A68C7B"} />
                        </View>
                        <View style={styles.settingTextContainer}>
                          <Text style={[styles.settingTitle, hasPendingRequest && styles.disabledText]}>
                            {hasPendingRequest ? "Verification Pending" : "Apply as Artist"}
                          </Text>
                          <Text style={styles.settingDescription}>
                            {hasPendingRequest ? "Your application is under review" : "Submit your artist verification"}
                          </Text>
                        </View>
                        {!hasPendingRequest && <Ionicons name="chevron-forward" size={24} color="#999" />}
                        {hasPendingRequest && <Ionicons name="time-outline" size={24} color="#FFC107" />}
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Apply as Seller - for Artists (only show if NOT already a seller) */}
                {String(role ?? '').trim().toLowerCase() === 'artist' && !userData?.isSeller && (
                  <View>
                    <Text style={styles.groupTitle}>Become a Seller</Text>
                    <TouchableOpacity 
                      style={[styles.settingButton, (hasPendingSellerRequest || sellerApplicationStatus === 'pending') && styles.disabledButton]}
                      onPress={() => {
                        resetSellerForm();
                        setSellerModalVisible(true);
                      }}
                      disabled={hasPendingSellerRequest || sellerApplicationStatus === 'pending'}
                    >
                      <View style={styles.settingContent}>
                        <View style={styles.iconContainer}>
                          <Ionicons 
                            name="storefront-outline" 
                            size={24} 
                            color={(hasPendingSellerRequest || sellerApplicationStatus === 'pending') ? "#999" : sellerApplicationStatus === 'rejected' ? "#FF4444" : "#A68C7B"} 
                          />
                        </View>
                        <View style={styles.settingTextContainer}>
                          <Text style={[styles.settingTitle, (hasPendingSellerRequest || sellerApplicationStatus === 'pending') && styles.disabledText, sellerApplicationStatus === 'rejected' && { color: '#FF4444' }]}>
                            {sellerApplicationStatus === 'pending' || hasPendingSellerRequest ? "Seller Verification Pending" : 
                             sellerApplicationStatus === 'rejected' ? "Application Rejected - Reapply" : 
                             "Apply as Seller"}
                          </Text>
                          <Text style={styles.settingDescription}>
                            {sellerApplicationStatus === 'pending' || hasPendingSellerRequest ? "Your seller application is under review" : 
                             sellerApplicationStatus === 'rejected' ? "Your application was rejected. You can submit a new application." : 
                             "Register to sell your artwork"}
                          </Text>
                        </View>
                        {!hasPendingSellerRequest && sellerApplicationStatus !== 'pending' && sellerApplicationStatus !== 'rejected' && <Ionicons name="chevron-forward" size={24} color="#999" />}
                        {(hasPendingSellerRequest || sellerApplicationStatus === 'pending') && <Ionicons name="time-outline" size={24} color="#FFC107" />}
                        {sellerApplicationStatus === 'rejected' && <Ionicons name="refresh" size={24} color="#FF4444" />}
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
              </View>
            )}
        </View>
      </ScrollView>

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

      {/* Apply as Seller Modal - 3 Steps */}
      <Modal
        visible={sellerModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          resetSellerForm();
          setSellerModalVisible(false);
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.uploadModalOverlay}>
            <View style={styles.uploadModalContent}>
              <View style={styles.uploadModalHeader}>
                <View>
                  <Text style={styles.uploadModalTitle}>Become a Museo Seller</Text>
                  <Text style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                    Step {sellerCurrentStep} of 3 - {sellerCurrentStep === 1 ? 'Basic Information' : sellerCurrentStep === 2 ? 'Business Address' : 'Verification'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { resetSellerForm(); setSellerModalVisible(false); }}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {/* Progress Bar */}
              <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 20, marginBottom: 20 }}>
                {[1, 2, 3].map(step => (
                  <View key={step} style={{
                    flex: 1,
                    height: 4,
                    backgroundColor: step <= sellerCurrentStep ? '#A68C7B' : '#e0e0e0',
                    borderRadius: 2
                  }} />
                ))}
              </View>

              <ScrollView style={styles.uploadModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Step 1: Basic Information */}
                {sellerCurrentStep === 1 && (
                  <View>
                    <View style={{ padding: 12, backgroundColor: '#FFF9E6', borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#A68C7B' }}>
                      <Text style={{ fontSize: 13, color: '#666' }}>
                        <Text style={{ fontWeight: 'bold' }}>Welcome!</Text> Start selling your artwork on Museo. No business registration required for individual artists.
                      </Text>
                    </View>

                    <Text style={styles.uploadInputLabel}>Shop Name *</Text>
                    <TextInput 
                      style={styles.uploadInput} 
                      placeholder="e.g., Aria's Art Studio"
                      value={shopName} 
                      onChangeText={setShopName} 
                    />
                    <Text style={{ fontSize: 12, color: '#999', marginBottom: 16, marginTop: -8 }}>This will be your public seller name on Museo</Text>

                    <Text style={styles.uploadInputLabel}>Full Name *</Text>
                    <TextInput 
                      style={styles.uploadInput} 
                      placeholder="Juan Dela Cruz"
                      value={sellerFullName} 
                      onChangeText={setSellerFullName} 
                    />

                    <Text style={styles.uploadInputLabel}>Email *</Text>
                    <TextInput 
                      style={styles.uploadInput} 
                      placeholder="your@email.com"
                      keyboardType="email-address"
                      value={sellerEmail} 
                      onChangeText={setSellerEmail} 
                    />

                    <Text style={styles.uploadInputLabel}>Phone Number *</Text>
                    <TextInput 
                      style={styles.uploadInput} 
                      placeholder="+63 912 345 6789"
                      keyboardType="phone-pad"
                      value={sellerPhone} 
                      onChangeText={setSellerPhone} 
                    />
                  </View>
                )}

                {/* Step 2: Business Address */}
                {sellerCurrentStep === 2 && (
                  <View>
                    <View style={{ padding: 12, backgroundColor: '#FFF9E6', borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#A68C7B' }}>
                      <Text style={{ fontSize: 13, color: '#666' }}>
                        <Text style={{ fontWeight: 'bold' }}>Business Address</Text> - This will be used for returns and verification purposes.
                      </Text>
                    </View>

                    <Text style={styles.uploadInputLabel}>Street Address *</Text>
                    <TextInput 
                      style={styles.uploadInput} 
                      placeholder="House/Unit No., Building, Street"
                      value={street} 
                      onChangeText={setStreet} 
                    />

                    <Text style={styles.uploadInputLabel}>Landmark (Optional)</Text>
                    <TextInput 
                      style={styles.uploadInput} 
                      placeholder="Near..."
                      value={landmark} 
                      onChangeText={setLandmark} 
                    />

                    <Text style={styles.uploadInputLabel}>Region *</Text>
                    <TouchableOpacity style={styles.uploadInput} onPress={() => setShowRegionDropdown(!showRegionDropdown)}>
                      <Text style={{ color: selectedRegion ? '#000' : '#999' }}>
                        {selectedRegion ? regions.find(r => r.code === selectedRegion)?.name : 'Select Region'}
                      </Text>
                      <Ionicons name={showRegionDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#555" style={{ position: 'absolute', right: 12, top: 12 }} />
                    </TouchableOpacity>
                    {showRegionDropdown && (
                      <ScrollView style={[styles.categoryDropdown, { maxHeight: 200 }]}>
                        {regions.map(region => (
                          <TouchableOpacity key={region.code} style={styles.categoryItem} onPress={() => handleRegionChange(region.code)}>
                            <Text style={styles.categoryItemText}>{region.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    <Text style={styles.uploadInputLabel}>Province *</Text>
                    <TouchableOpacity 
                      style={[styles.uploadInput, { opacity: !selectedRegion ? 0.5 : 1 }]} 
                      onPress={() => selectedRegion && setShowProvinceDropdown(!showProvinceDropdown)}
                      disabled={!selectedRegion}
                    >
                      <Text style={{ color: selectedProvince ? '#000' : '#999' }}>
                        {selectedProvince ? provinces.find(p => p.code === selectedProvince)?.name : 'Select Province'}
                      </Text>
                      <Ionicons name={showProvinceDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#555" style={{ position: 'absolute', right: 12, top: 12 }} />
                    </TouchableOpacity>
                    {showProvinceDropdown && (
                      <ScrollView style={[styles.categoryDropdown, { maxHeight: 200 }]}>
                        {provinces.map(province => (
                          <TouchableOpacity key={province.code} style={styles.categoryItem} onPress={() => handleProvinceChange(province.code)}>
                            <Text style={styles.categoryItemText}>{province.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    <Text style={styles.uploadInputLabel}>City/Municipality *</Text>
                    <TouchableOpacity 
                      style={[styles.uploadInput, { opacity: !selectedProvince ? 0.5 : 1 }]} 
                      onPress={() => selectedProvince && setShowCityDropdown(!showCityDropdown)}
                      disabled={!selectedProvince}
                    >
                      <Text style={{ color: selectedCity ? '#000' : '#999' }}>
                        {selectedCity ? cities.find(c => c.code === selectedCity)?.name : 'Select City/Municipality'}
                      </Text>
                      <Ionicons name={showCityDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#555" style={{ position: 'absolute', right: 12, top: 12 }} />
                    </TouchableOpacity>
                    {showCityDropdown && (
                      <ScrollView style={[styles.categoryDropdown, { maxHeight: 200 }]}>
                        {cities.map(city => (
                          <TouchableOpacity key={city.code} style={styles.categoryItem} onPress={() => handleCityChange(city.code)}>
                            <Text style={styles.categoryItemText}>{city.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    <Text style={styles.uploadInputLabel}>Barangay *</Text>
                    <TouchableOpacity 
                      style={[styles.uploadInput, { opacity: !selectedCity ? 0.5 : 1 }]} 
                      onPress={() => selectedCity && setShowBarangayDropdown(!showBarangayDropdown)}
                      disabled={!selectedCity}
                    >
                      <Text style={{ color: selectedBarangay ? '#000' : '#999' }}>
                        {selectedBarangay ? barangays.find(b => b.code === selectedBarangay)?.name : 'Select Barangay'}
                      </Text>
                      <Ionicons name={showBarangayDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#555" style={{ position: 'absolute', right: 12, top: 12 }} />
                    </TouchableOpacity>
                    {showBarangayDropdown && (
                      <ScrollView style={[styles.categoryDropdown, { maxHeight: 200 }]}>
                        {barangays.map(barangay => (
                          <TouchableOpacity key={barangay.code} style={styles.categoryItem} onPress={() => handleBarangayChange(barangay.code)}>
                            <Text style={styles.categoryItemText}>{barangay.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    <Text style={styles.uploadInputLabel}>Postal Code *</Text>
                    <TextInput 
                      style={styles.uploadInput} 
                      placeholder="1234"
                      keyboardType="number-pad"
                      maxLength={4}
                      value={postalCode} 
                      onChangeText={setPostalCode} 
                    />
                  </View>
                )}

                {/* Step 3: Verification & Terms */}
                {sellerCurrentStep === 3 && (
                  <View>
                    <View style={{ padding: 12, backgroundColor: '#FFF9E6', borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#A68C7B' }}>
                      <Text style={{ fontSize: 13, color: '#666' }}>
                        <Text style={{ fontWeight: 'bold' }}>Final Step!</Text> Upload your ID and agree to our seller terms.
                      </Text>
                    </View>

                    <Text style={styles.uploadInputLabel}>Shop Description *</Text>
                    <TextInput 
                      style={[styles.uploadInput, styles.uploadTextArea]} 
                      placeholder="Tell buyers about your art style, inspiration, and what makes your work unique..."
                      multiline
                      numberOfLines={4}
                      value={shopDescription} 
                      onChangeText={setShopDescription} 
                    />

                    <Text style={styles.uploadInputLabel}>Government ID (for verification) *</Text>
                    <TouchableOpacity onPress={pickSellerIdDocument} style={styles.uploadImagePicker}>
                      {sellerIdDocument ? (
                        <Image source={sellerIdDocument} style={styles.uploadPickedImage} />
                      ) : (
                        <View style={styles.uploadImagePlaceholder}>
                          <Ionicons name="card-outline" size={48} color="#A68C7B" />
                          <Text style={styles.uploadImageText}>Upload valid government ID</Text>
                          <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>JPG, PNG up to 10MB</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Seller Agreement */}
                    <View style={{ padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8, maxHeight: 200, marginBottom: 16 }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#A68C7B', marginBottom: 8 }}>Seller Agreement</Text>
                      <ScrollView style={{ maxHeight: 140 }}>
                        <Text style={{ fontSize: 13, color: '#666', lineHeight: 20 }}>
                          • 15% commission on all sales{'\n'}
                          • Provide accurate artwork descriptions{'\n'}
                          • Ship within specified timeframe{'\n'}
                          • Respond to inquiries within 2-3 business days{'\n'}
                          • Honor returns for damaged items{'\n'}
                          • No counterfeit or stolen artwork{'\n'}
                          • Maintain professional conduct{'\n'}
                          • Payments processed within 7-10 days after delivery{'\n'}
                          • You own rights to artwork sold{'\n'}
                          • Museo may remove listings that violate policies
                        </Text>
                      </ScrollView>
                    </View>

                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
                      onPress={() => setAgreedToTerms(!agreedToTerms)}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        borderWidth: 2,
                        borderColor: agreedToTerms ? '#A68C7B' : '#ccc',
                        backgroundColor: agreedToTerms ? '#A68C7B' : '#fff',
                        marginRight: 8,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {agreedToTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                      <Text style={{ fontSize: 14, color: '#333' }}>I agree to the Seller Terms and Conditions *</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Navigation Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, paddingBottom: 20 }}>
                  {sellerCurrentStep > 1 && (
                    <TouchableOpacity 
                      style={[styles.uploadButton, { backgroundColor: '#e0e0e0', flex: 1 }]}
                      onPress={handleSellerBack}
                      disabled={sellerSubmitting}
                    >
                      <Text style={[styles.uploadButtonText, { color: '#333' }]}>Back</Text>
                    </TouchableOpacity>
                  )}

                  {sellerCurrentStep < 3 ? (
                    <TouchableOpacity 
                      style={[styles.uploadButton, sellerCurrentStep === 1 ? { width: '100%' } : { flex: 1 }]}
                      onPress={handleSellerNext}
                      disabled={sellerSubmitting}
                    >
                      <Text style={styles.uploadButtonText}>Next</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.uploadButton, { flex: 1, opacity: (!agreedToTerms || sellerSubmitting) ? 0.5 : 1 }]}
                      onPress={submitSellerApplication}
                      disabled={!agreedToTerms || sellerSubmitting}
                    >
                      <Text style={styles.uploadButtonText}>
                        {sellerSubmitting ? 'Submitting...' : 'Submit Application'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollView: { flex: 1 },
  contentContainer: { padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: "#A68C7B", marginBottom: 30 },
  section: { marginBottom: 15 },
  settingButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingContent: { flexDirection: "row", alignItems: "center" },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F0EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  settingTextContainer: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
  settingDescription: { fontSize: 13, color: "#666" },
  disabledButton: { opacity: 0.6 },
  disabledText: { color: "#999" },
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
  // Tab styles
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabContentContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  tabButtonActive: {
    backgroundColor: '#F5F0EB',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 6,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#A68C7B',
    fontWeight: '600',
  },
  // Tab panels
  tabPanel: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#A68C7B',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  // Profile preview
  profilePreviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  profileViewHint: {
    fontSize: 12,
    color: '#A68C7B',
    fontStyle: 'italic',
  },
  // Toggle items
  settingToggleItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Seller badge
  sellerBadge: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  sellerBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  // Activities
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  activitiesLoading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  activitiesList: {
    marginTop: 10,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  activitiesEmpty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#A68C7B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Toggle Switch Styles
  toggleSwitch: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#A68C7B',
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  // Profile Visibility Dropdown
  visibilityContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'column',
  },
  visibilitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F0EB',
    marginTop: 12,
    width: '100%',
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
});
