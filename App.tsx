/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, Text, TextInput, useColorScheme } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';

import { AppNavigator } from './src/navigation/AppNavigator';
import { Linking } from 'react-native';
import { supabase } from './src/services/supabase';

import { useAuthStore } from './src/store/authStore';

// Listen for deep links
Linking.addEventListener('url', async (event) => {
  const url = event.url;
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
      // Flag password reset BEFORE setting session to avoid race condition
      // (setSession triggers onAuthStateChange which re-renders the navigator)
      if (isRecovery) {
        useAuthStore.getState().setPendingPasswordReset(true);
      }

      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }
});


// Set default font globally for all Text and TextInput components
const defaultFontFamily = 'GoogleSans-Regular';

// @ts-ignore – overriding defaultProps is a common RN pattern
Text.defaultProps = Text.defaultProps || {};
// @ts-ignore
Text.defaultProps.style = [{ fontFamily: defaultFontFamily, includeFontPadding: false }, Text.defaultProps.style];

// @ts-ignore
TextInput.defaultProps = TextInput.defaultProps || {};
// @ts-ignore
TextInput.defaultProps.style = [{ fontFamily: defaultFontFamily, includeFontPadding: false }, TextInput.defaultProps.style];

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <PaperProvider>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppNavigator />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default App;
