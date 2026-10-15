import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Station, STATIONS_DATABASE } from '../data/stations';
import { searchAndRankStations } from '../utils/searchRanker';

interface StationSearchModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelectStation: (station: Station) => void;
}

export const StationSearchModal: React.FC<StationSearchModalProps> = ({
  visible,
  title,
  onClose,
  onSelectStation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Smart Ranked Stations (Exact Code & Station Name startsWith rank highest)
  const filteredStations = useMemo(() => {
    return searchAndRankStations(searchQuery, STATIONS_DATABASE);
  }, [searchQuery]);

  const handleSelect = (station: Station) => {
    onSelectStation(station);
    setSearchQuery('');
    onClose();
  };

  const renderStationItem = ({ item }: { item: Station }) => (
    <TouchableOpacity
      style={styles.stationItem}
      activeOpacity={0.7}
      onPress={() => handleSelect(item)}
    >
      <View style={styles.stationLeft}>
        <View style={styles.codeBadge}>
          <Text style={styles.codeText}>{item.code}</Text>
        </View>
        <View style={styles.stationDetails}>
          <Text style={styles.stationName}>{item.name}</Text>
          <Text style={styles.stationLocation}>
            {item.city}, {item.state}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>Select from 8,000+ Indian Stations</Text>
            </View>
          </View>

          {/* Search Box */}
          <View style={styles.searchBoxWrapper}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="Search station name or code (e.g. NDLS, Delhi)"
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Station Results List */}
          <View style={styles.listContainer}>
            <Text style={styles.listHeaderTitle}>
              {searchQuery ? `Matching Stations (${filteredStations.length})` : 'All Major Railway Stations'}
            </Text>

            <FlatList
              data={filteredStations}
              keyExtractor={(item) => item.code}
              renderItem={renderStationItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={44} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Stations Found</Text>
                  <Text style={styles.emptySub}>Try searching with station code or nearby city name</Text>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: '#F0F7FD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  searchBoxWrapper: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  stationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  codeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 56,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.2,
  },
  stationDetails: {
    flex: 1,
  },
  stationName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  stationLocation: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
});
