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
import { Station } from './src/data/stations';
import { PreferencesProvider, usePreferences } from './src/context/PreferencesContext';
import { PreferencesModal } from './src/components/PreferencesModal';

interface ScreenState {
  tab: TabKey;
  isSearching?: boolean;
  trackingTrain?: string | null;
}

// Global Web Style Reset: remove browser default focus outline/squares around text inputs
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'global-no-outline-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      input, textarea, [contenteditable="true"] {
        outline: none !important;
        outline-style: none !important;
        outline-width: 0 !important;
        border: none !important;
        box-shadow: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      input:focus, textarea:focus, [contenteditable="true"]:focus {
        outline: none !important;
        outline-style: none !important;
        outline-width: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
  }
}

function MainApp() {
  const { colors, isDarkMode, t, showWelcomeModal, setShowWelcomeModal } = usePreferences();
  const [showPrefsModal, setShowPrefsModal] = useState(false);
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

  const [activeLiveTrainNumber, setActiveLiveTrainNumber] = useState<string>('22436');
  const [trackingTrainMeta, setTrackingTrainMeta] = useState<{
    number: string;
    name?: string;
    fromStation?: Station;
    toStation?: Station;
  } | null>(null);

  const handleTrackTrain = useCallback((trainNumber: string, trainName?: string, fromStation?: Station, toStation?: Station) => {
    setActiveLiveTrainNumber(trainNumber);
    setTrackingTrainMeta({
      number: trainNumber,
      name: trainName,
      fromStation: fromStation || searchParams?.from || selectedFromStation || undefined,
      toStation: toStation || searchParams?.to || selectedToStation || undefined,
    });
    navigateTo('home', false, trainNumber);
  }, [navigateTo, searchParams, selectedFromStation, selectedToStation]);

  const handleSelectTab = useCallback((tab: TabKey) => {
    if (tab === activeTab && !isSearching) return;
    if (tab === 'live') {
      navigateTo('home', false, '22436');
      return;
    }
    navigateTo(tab, false);
  }, [activeTab, isSearching, navigateTo]);

  // Compute header props based on active screen
  const getHeaderProps = () => {
    const canGoBack = historyStack.length > 1;

    if (activeTab === 'home' && isSearching) {
      return {
        title: searchParams ? `${searchParams.from.code} ➔ ${searchParams.to.code}` : t('findTrains'),
        subtitle: searchParams ? `${searchParams.date}` : '',
        showBack: true,
      };
    }

    switch (activeTab) {
      case 'live':
        return {
          title: t('tabLive'),
          subtitle: 'Spot train location with GPS',
          showBack: canGoBack,
        };
      case 'pnr':
        return {
          title: t('tabPnr'),
          subtitle: 'Live seat & berth confirmation',
          showBack: canGoBack,
        };
      case 'schedule':
        return {
          title: t('tabSchedule'),
          subtitle: '100% Offline schedule list',
          showBack: canGoBack,
        };
      case 'home':
      default:
        return {
          title: t('appName'),
          subtitle: t('tagline'),
          showBack: false,
        };
    }
  };

  const headerProps = getHeaderProps();

  const renderCurrentScreen = () => {
    if (trackingTrainNumber) {
      return (
        <LiveTrainTrackerScreen
          trainNumber={trackingTrainNumber}
          trainName={trackingTrainMeta?.name}
          fromStationCode={trackingTrainMeta?.fromStation?.code}
          toStationCode={trackingTrainMeta?.toStation?.code}
          fromStationName={trackingTrainMeta?.fromStation?.name}
          toStationName={trackingTrainMeta?.toStation?.name}
          onBack={handleBack}
        />
      );
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar style={isDarkMode ? 'light' : 'light'} />

      {/* Top Header with universal Back Button, Language, & Day/Night Mode */}
      {!(activeTab === 'home' && isSearching) && !trackingTrainNumber && (
        <Header
          title={headerProps.title}
          subtitle={headerProps.subtitle}
          showBack={headerProps.showBack}
          onBack={handleBack}
          onOpenPreferences={() => setShowPrefsModal(true)}
        />
      )}

      {/* Active Screen Content */}
      <View style={[styles.screenContent, { backgroundColor: colors.background }]}>
        {renderCurrentScreen()}
      </View>

      {/* Bottom Navigation: Hidden on HomeScreen as requested because Quick Railway Services already handles navigation */}
      {!trackingTrainNumber && !isSearching && activeTab !== 'home' && (
        <BottomTabBar activeTab={activeTab} onSelectTab={handleSelectTab} />
      )}

      {/* Language (Hindi/English) & Day/Night Mode Modal */}
      <PreferencesModal
        visible={showWelcomeModal || showPrefsModal}
        onClose={() => {
          setShowWelcomeModal(false);
          setShowPrefsModal(false);
        }}
        isFirstLaunch={showWelcomeModal}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <PreferencesProvider>
      <MainApp />
    </PreferencesProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  screenContent: {
    flex: 1,
  },
});
