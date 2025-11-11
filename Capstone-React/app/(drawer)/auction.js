import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Image, ScrollView, TextInput, TouchableOpacity, Modal, BackHandler } from 'react-native';
import Header from '../components/Header'; // Reusable Header
import { useFocusEffect, useRouter } from 'expo-router';

const AuctionScreen = () => {
  const [zoomImage, setZoomImage] = useState(null); // state for full-screen image
  const router = useRouter();

  // Ensure Android hardware back navigates to Marketplace screen
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.replace('/(drawer)/marketplace');
        return true; // consume back press
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [router])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Marketplace" showSearch={false} />

      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Artwork Image */}
        <TouchableOpacity style={styles.imageContainer} onPress={() => setZoomImage(require('../../assets/pic1.jpg'))}>
          <Image
            source={require('../../assets/pic1.jpg')} // replace with actual Golden Silence image
            style={styles.artworkImage}
          />
        </TouchableOpacity>

        {/* Title and Author */}
        <View style={styles.titleContainer}>
          <Text style={styles.artworkTitle}>"Golden Silence" by Elara Mendez</Text>
        </View>

        {/* Description */}
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionTitle}>📝 Description:</Text>
          <Text style={styles.descriptionText}>
            Captures a woman's intense gaze amid abstract strokes and earthy textures. The artist’s emotive brushwork and moody palette create a raw, haunting, and captivating effect.
          </Text>
        </View>

        {/* Bid Section */}
        <View style={styles.bidBox}>
          <Text style={styles.bidLabel}>Bid</Text>
          <TextInput
            style={styles.bidInput}
            placeholder="Enter your bid"
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.bidButton}>
            <Text style={styles.bidButtonText}>Submit Bid</Text>
          </TouchableOpacity>
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

  imageContainer: {
    marginTop: 10,
    marginHorizontal: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  artworkImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 10,
  },

  titleContainer: {
    marginTop: 10,
    marginHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  artworkTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  descriptionBox: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 10,
    padding: 15,
  },
  descriptionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },

  bidBox: {
    margin: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  bidLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bidInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  bidButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bidButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

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

export default AuctionScreen;
