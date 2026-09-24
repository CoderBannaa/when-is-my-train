import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, SafeAreaView, Platform, StatusBar as RNStatusBar, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Header } from './src/components/Header';
import { BottomTabBar, TabKey } from './src/components/BottomTabBar';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchResultsScreen } from './src/screens/SearchResultsScreen';
import { LiveStatusScreen } from './src/screens/LiveStatusScreen';
import { LiveTrainTrackerScreen } from './src/screens/LiveTrainTrackerScreen';
import { PnrScreen } from './src/screens/PnrScreen';
import { TimetableScreen } from './src/screens/TimetableScreen';
import { Colors } from './src/theme/colors';
import { Station } from './src/data/stations';

interface ScreenState {
  tab: TabKey;
  isSearching?: boolean;
  trackingTrain?: string | null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isSearching, setIsSearching] = useState(false);
  const [trackingTrainNumber, setTrackingTrainNumber] = useState<string | null>(null);
  const [historyStack, setHistoryStack] = useState<ScreenState[]>([{ tab: 'home', isSearching: false, trackingTrain: null }]);
  
  const [searchParams, setSearchParams] = useState<{
    from: Station;
    to: Station;
    date: string;
  } | null>(null);

  const [selectedFromStation, setSelectedFromStation] = useState<Station | null>(null);
  const [selectedToStation, setSelectedToStation] = useState<Station | null>(null);

  // Handle hardware and UI back action
  const handleBack = useCallback((): boolean => {
    if (historyStack.length > 1) {
      const newStack = [...historyStack];
      newStack.pop(); // Remove current screen
      const previousScreen = newStack[newStack.length - 1];
      setHistoryStack(newStack);
      setActiveTab(previousScreen.tab);
      setIsSearching(!!previousScreen.isSearching);
      setTrackingTrainNumber(previousScreen.trackingTrain || null);
      return true;
    }
    return false;
  }, [historyStack]);

  // Android hardware back press listener
  useEffect(() => {
    const onBackPress = () => {
      return handleBack();
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [handleBack]);

  const navigateTo = useCallback((tab: TabKey, searching = false, trainNum: string | null = null) => {
    setActiveTab(tab);
    setIsSearching(searching);
    setTrackingTrainNumber(trainNum);
    setHistoryStack((prev) => [...prev, { tab, isSearching: searching, trackingTrain: trainNum }]);
  }, []);

  const handleSearchTrains = useCallback((from: Station, to: Station, date: string) => {
    setSelectedFromStation(from);
    setSelectedToStation(to);
    setSearchParams({ from, to, date });
    navigateTo('home', true, null);
  }, [navigateTo]);

  const [activeLiveTrainNumber, setActiveLiveTrainNumber] = useState<string>('64902');

  const handleTrackTrain = useCallback((trainNumber: string, _trainName: string) => {
    setActiveLiveTrainNumber(trainNumber);
    navigateTo('home', false, trainNumber);
  }, [navigateTo]);

  const handleSelectTab = useCallback((tab: TabKey) => {
    if (tab === activeTab && !isSearching) return;
    navigateTo(tab, false);
  }, [activeTab, isSearching, navigateTo]);

  // Compute header props based on active screen
  const getHeaderProps = () => {
    const canGoBack = historyStack.length > 1;

    if (activeTab === 'home' && isSearching) {
      return {
        title: searchParams ? `${searchParams.from.code} ➔ ${searchParams.to.code}` : 'Train Search',
        subtitle: searchParams ? `${searchParams.date}` : '',
        showBack: true,
      };
    }

    switch (activeTab) {
      case 'live':
        return {
          title: 'Live Train Running Status',
          subtitle: 'Spot train location with GPS',
          showBack: canGoBack,
        };
      case 'pnr':
        return {
          title: 'PNR Status Checker',
          subtitle: 'Live seat & berth confirmation',
          showBack: canGoBack,
        };
      case 'schedule':
        return {
          title: 'Train Timetable & Route',
          subtitle: '100% Offline schedule list',
          showBack: canGoBack,
        };
      case 'home':
      default:
        return {
          title: 'When is my train',
          subtitle: 'IRCTC & Live GPS Tracking',
          showBack: false,
        };
    }
  };

  const headerProps = getHeaderProps();

  const renderCurrentScreen = () => {
    if (trackingTrainNumber) {
      return <LiveTrainTrackerScreen trainNumber={trackingTrainNumber} onBack={handleBack} />;
    }

    if (activeTab === 'home' && isSearching && searchParams) {
      return (
        <SearchResultsScreen
          fromStation={searchParams.from}
          toStation={searchParams.to}
          selectedDate={searchParams.date}
          onBack={handleBack}
          onTrackTrain={handleTrackTrain}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            onNavigateToTab={(tab) => navigateTo(tab, false)}
            onSearchTrains={handleSearchTrains}
            onTrackTrain={handleTrackTrain}
            fromStation={selectedFromStation}
            toStation={selectedToStation}
            onSetFromStation={setSelectedFromStation}
            onSetToStation={setSelectedToStation}
          />
        );
      case 'live':
        return (
          <LiveStatusScreen
            initialTrainNumber={activeLiveTrainNumber}
            onTrackTrain={handleTrackTrain}
          />
        );
      case 'pnr':
        return <PnrScreen />;
      case 'schedule':
        return <TimetableScreen />;
      default:
        return (
          <HomeScreen
            onNavigateToTab={(tab) => navigateTo(tab, false)}
            onSearchTrains={handleSearchTrains}
            onTrackTrain={handleTrackTrain}
            fromStation={selectedFromStation}
            toStation={selectedToStation}
            onSetFromStation={setSelectedFromStation}
            onSetToStation={setSelectedToStation}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header with universal Back Button support */}
      {!(activeTab === 'home' && isSearching) && !trackingTrainNumber && (
        <Header
          title={headerProps.title}
          subtitle={headerProps.subtitle}
          showBack={headerProps.showBack}
          onBack={handleBack}
        />
      )}

      {/* Active Screen Content */}
      <View style={styles.screenContent}>{renderCurrentScreen()}</View>

      {/* Bottom Navigation (Hidden during Search Results and full-screen Live Tracking) */}
      {!trackingTrainNumber && !isSearching && (
        <BottomTabBar activeTab={activeTab} onSelectTab={handleSelectTab} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  screenContent: {
    flex: 1,
    backgroundColor: '#F0F7FD',
  },
});
