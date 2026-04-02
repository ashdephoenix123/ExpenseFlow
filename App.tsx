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

// Listen for deep links
Linking.addEventListener('url', async (event) => {
  const url = event.url;
  if (url.includes('access_token') && url.includes('refresh_token')) {
    // Parse tokens from the URL fragment
    const params = new URLSearchParams(url.split('#')[1]);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
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
Text.defaultProps.style = [{ fontFamily: defaultFontFamily }, Text.defaultProps.style];

// @ts-ignore
TextInput.defaultProps = TextInput.defaultProps || {};
// @ts-ignore
TextInput.defaultProps.style = [{ fontFamily: defaultFontFamily }, TextInput.defaultProps.style];

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
