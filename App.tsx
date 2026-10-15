import { useEffect } from 'react';
import { StatusBar, useColorScheme, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { AppNavigator } from './src/navigation/AppNavigator';
import { supabase } from './src/services/supabase';
import { updateService } from './src/services/updateService';
import { useAuthStore } from './src/store/authStore';
import { useTheme } from './src/theme/theme';
import * as Sentry from '@sentry/react-native';

// Keep splash screen visible until initial resources are loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

async function handleDeepLinkUrl(url: string) {
  console.log('[DeepLink] Received URL:', url);

  if (url.includes('access_token') && url.includes('refresh_token')) {
    // Parse tokens from the URL fragment
    const fragment = url.split('#')[1] || '';
    const fragmentParams = new URLSearchParams(fragment);
    const accessToken = fragmentParams.get('access_token');
    const refreshToken = fragmentParams.get('refresh_token');

    // Check for recovery type in fragment params, query params, or URL path
    const fragmentType = fragmentParams.get('type');
    const queryString = url.split('?')[1]?.split('#')[0] || '';
    const queryParams = new URLSearchParams(queryString);
    const queryType = queryParams.get('type');
    const isRecovery =
      fragmentType === 'recovery' ||
      queryType === 'recovery' ||
      url.includes('type=recovery');

    console.log('[DeepLink] isRecovery:', isRecovery, 'fragmentType:', fragmentType, 'queryType:', queryType);

    if (accessToken && refreshToken) {
      if (isRecovery) {
        useAuthStore.getState().setPendingPasswordReset(true);
      }

      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }
}

// Listen for deep links
Linking.addEventListener('url', async (event) => {
  handleDeepLinkUrl(event.url);
});

// Also check cold start initial URL
Linking.getInitialURL().then((url) => {
  if (url) handleDeepLinkUrl(url);
});

Sentry.init({
  dsn: 'https://c0bfd3b14403ee70c22127bb88bc820d@o4512232925691904.ingest.de.sentry.io/4512232929558608',
  tracesSampleRate: 1.0,
  _experiments: {
    profilesSampleRate: 1.0,
  },
});

function App() {
  const [fontsLoaded] = useFonts({
    'GoogleSans-Regular': require('./assets/fonts/GoogleSans-Regular.ttf'),
    'GoogleSans-Medium': require('./assets/fonts/GoogleSans-Medium.ttf'),
    'GoogleSans-SemiBold': require('./assets/fonts/GoogleSans-SemiBold.ttf'),
    'GoogleSans-Bold': require('./assets/fonts/GoogleSans-Bold.ttf'),
    'PlayfairDisplay-Regular': require('./assets/fonts/PlayfairDisplay-Regular.ttf'),
    'PlayfairDisplay-Medium': require('./assets/fonts/PlayfairDisplay-Medium.ttf'),
    'PlayfairDisplay-SemiBold': require('./assets/fonts/PlayfairDisplay-SemiBold.ttf'),
    'PlayfairDisplay-Bold': require('./assets/fonts/PlayfairDisplay-Bold.ttf'),
  });

  const { isDark, colors } = useTheme();

  // Pull any published JS update in the background; it applies on next launch.
  useEffect(() => {
    updateService.syncInBackground();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PaperProvider>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <AppNavigator />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default Sentry.wrap(App); 
