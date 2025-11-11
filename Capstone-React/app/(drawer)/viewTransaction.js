import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Image, ScrollView, TouchableOpacity, Modal, BackHandler } from 'react-native';
import Header from '../components/Header'; // Import reusable Header
import { useFocusEffect, useRouter } from 'expo-router';

const ViewTransactionScreen = () => {
  const router = useRouter();
  const [zoomImage, setZoomImage] = useState(null); // state for full-screen image

  // Ensure Android hardware back navigates to transactions list
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.replace('/(drawer)/transaction');
        return true; // consume back press
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [router])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Transaction" showSearch={false} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Artwork Image */}
        <TouchableOpacity style={styles.card} onPress={() => setZoomImage(require('../../assets/mustry.png'))}>
          <Image
            source={require('../../assets/mustry.png')}
            style={styles.artworkImage}
          />
        </TouchableOpacity>

        {/* Artwork Title and Author */}
        <View style={styles.card}>
          <Text style={styles.artworkTitle}>"The Mountains" by Dhalia Ford</Text>
        </View>

        {/* Details Section */}
        <View style={styles.card}>
          <Text style={styles.descriptionText}>
            <Text style={{ fontWeight: 'bold' }}>🏔️ Description:</Text>
            {"\n\n"}"The Mountains" is a vibrant landscape artwork that showcases bold lines, rich textures, and layered watercolor tones. The piece features snow-capped peaks, a glowing sun radiating through soft skies, and a serene alpine lake surrounded by rocky terrain. The dynamic composition and harmonious color palette create a sense of movement and depth, capturing the majestic stillness of mountain scenery.
          </Text>
          <Text style={styles.detailsHeader}>Details:</Text>
          <View style={styles.detailsList}>
            <Text style={styles.detailItem}><Text style={{ fontWeight: 'bold' }}>🎨 Medium:</Text> Watercolor & Ink on Cold-Pressed Paper</Text>
            <Text style={styles.detailItem}><Text style={{ fontWeight: 'bold' }}>📐 Size:</Text> 24 x 36 inches (Unframed)</Text>
            <Text style={styles.detailItem}><Text style={{ fontWeight: 'bold' }}>📜 Status:</Text> Original artwork available | Limited edition prints also offered</Text>
          </View>
        </View>
      </ScrollView>

      {/* Full-screen image modal */}
      <Modal
        visible={zoomImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setZoomImage(null)}
      >
        <TouchableOpacity style={styles.fullScreenContainer} onPress={() => setZoomImage(null)}>
          <Image source={zoomImage} style={styles.fullScreenImage} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  content: { paddingTop: 15, paddingBottom: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  artworkImage: { width: '100%', height: 200, resizeMode: 'cover', borderRadius: 10 },
  artworkTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  descriptionText: { fontSize: 14, color: '#555', marginBottom: 10 },
  detailsHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  detailsList: { marginLeft: 10 },
  detailItem: { fontSize: 14, color: '#555', marginBottom: 3 },

  // Full-screen image modal
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
});

export default ViewTransactionScreen;
