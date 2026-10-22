import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlarmRinging } from './src/components/AlarmRinging';
import { CreditBanner } from './src/components/CreditBanner';
import { OtaUpdater } from './src/components/OtaUpdater';
import { DataProvider, useData } from './src/context/DataContext';
import { RootDrawer } from './src/navigation/RootDrawer';
import { colors } from './src/theme';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.ink,
    border: colors.line,
    primary: colors.accent,
  },
};

function AppShell() {
  const { ready } = useData();

  if (!ready) {
    return (
      <View style={splash}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CreditBanner />
      <OtaUpdater />
      <NavigationContainer theme={navTheme}>
        <StatusBar style="dark" />
        <RootDrawer />
      </NavigationContainer>
      <AlarmRinging />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    InstrumentSerif_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={splash}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <DataProvider>
        <AppShell />
      </DataProvider>
    </SafeAreaProvider>
  );
}

const splash = {
  flex: 1,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: colors.bg,
};
