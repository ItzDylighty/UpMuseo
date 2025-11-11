import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Image, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { supabase } from "../../supabase/supabaseClient";
import { useRouter } from "expo-router";

// Reusable component for each artist card
const ArtistCard = ({ name, imageSource, onPress }) => {
  // Support both local require() images and remote URL strings
  const resolvedSource = typeof imageSource === 'string' ? { uri: imageSource } : imageSource;
  return (
    <TouchableOpacity style={styles.artistCard} activeOpacity={0.8} onPress={onPress}>
      {resolvedSource ? (
        <Image source={resolvedSource} style={styles.artistImage} />
      ) : (
        <View style={[styles.artistImage, styles.placeholderCircle]} />
      )}
      <Text style={styles.artistName}>{name}</Text>
    </TouchableOpacity>
  );
};

const ArtistsScreen = () => {
  // Match home.js approach
  const API_BASE = "http://192.168.254.114:3000/api";
  const router = useRouter();

  // Start with empty list; we will fetch from backend
  const [artists, setArtists] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 6;

  const fetchArtists = async (at, rt) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/artist/getArtist`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `access_token=${at || ''}; refresh_token=${rt || ''}`,
        },
      });

      if (!res.ok) {
        console.warn('[artists.js] Failed to fetch artists:', res.status, res.statusText);
        return; // Keep empty list on failure
      }

      const json = await res.json();
      const list = Array.isArray(json?.artists) ? json.artists : [];
      if (list.length) {
        const mappedArtists = list.map((a) => ({
          id: a.id || a.username || String(Math.random()),
          username: a.username || null,
          name: a.name || a.username || 'Untitled Artist',
          image: a.hero || a.image || null,
          createdAt: a.createdAt || a.created_at || a.createdTime || null,
        }));
        
        // Sort by newest first
        const sortedArtists = mappedArtists.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        
        setArtists(sortedArtists);
      } else {
        setArtists([]);
      }
    } catch (e) {
      console.warn('[artists.js] Error fetching artists:', e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initAndFetch = async () => {
      const { data } = await supabase.auth.getSession();
      const at = data?.session?.access_token || null;
      const rt = data?.session?.refresh_token || null;
      setAccessToken(at);
      setRefreshToken(rt);
      await fetchArtists(at, rt);
    };

    initAndFetch();
  }, [API_BASE]);

  // Filter artists based on search query
  const filteredArtists = artists.filter(artist => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = (artist.name || '').toLowerCase();
    const username = (artist.username || '').toLowerCase();
    return name.includes(query) || username.includes(query);
  });

  const handleSearch = (text) => {
    setSearchQuery(text);
    setCurrentPage(0); // Reset to first page when searching
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(0); // Reset pagination
    try {
      await fetchArtists(accessToken, refreshToken);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Get paginated artists
  const paginatedArtists = filteredArtists.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  const totalPages = Math.ceil(filteredArtists.length / itemsPerPage);

  return (
    <SafeAreaView style={styles.container}>
      {/* Reusable Header with search */}
      <Header title="Artists" showSearch={true} onSearch={handleSearch} />

      {/* Artist Grid */}
      <ScrollView 
        style={styles.artistGrid}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#000']} // Android
            tintColor="#000" // iOS
          />
        }
      >
        {loading && artists.length === 0 ? (
          <Text style={{ margin: 12 }}>Loading...</Text>
        ) : null}
        
        {filteredArtists.length > 0 && (
          <View style={styles.headerContainer}>
            <Text style={styles.artistCount}>
              Showing {Math.min((currentPage + 1) * itemsPerPage, filteredArtists.length)} of {filteredArtists.length} artists
            </Text>
          </View>
        )}
        
        <View style={styles.row}>
          {paginatedArtists.length > 0 ? (
            paginatedArtists.map(artist => (
              <ArtistCard
                key={artist.id}
                name={artist.name}
                imageSource={artist.image}
                onPress={() => {
                  router.push({
                    pathname: '/(drawer)/viewArtist',
                    params: {
                      id: String(artist.id ?? ''),
                      username: String(artist.username ?? ''),
                      name: String(artist.name ?? ''),
                    },
                  });
                }}
              />
            ))
          ) : !loading && searchQuery.trim() ? (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={64} color="#ccc" />
              <Text style={styles.noResultsTitle}>No results found</Text>
              <Text style={styles.noResultsText}>
                Try searching for different keywords
              </Text>
            </View>
          ) : !loading && artists.length === 0 ? (
            <View style={styles.noResults}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.noResultsTitle}>No artists available</Text>
              <Text style={styles.noResultsText}>
                Check back later for featured artists
              </Text>
            </View>
          ) : null}
        </View>
        
        {/* Pagination Controls */}
        {filteredArtists.length > itemsPerPage && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === 0 && styles.paginationButtonDisabled]}
              onPress={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
            >
              <Ionicons name="chevron-back" size={20} color={currentPage === 0 ? '#ccc' : '#A68C7B'} />
            </TouchableOpacity>
            <View style={styles.paginationDots}>
              {Array.from({ length: totalPages }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentPage && styles.paginationDotActive
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.paginationButton,
                currentPage >= totalPages - 1 && styles.paginationButtonDisabled
              ]}
              onPress={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={currentPage >= totalPages - 1 ? '#ccc' : '#A68C7B'} 
              />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  artistGrid: {
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  artistCard: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  artistImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  placeholderCircle: {
    backgroundColor: '#e9e9e9',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  artistName: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    width: '100%',
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  headerContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 5,
  },
  artistCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
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
});

export default ArtistsScreen;
