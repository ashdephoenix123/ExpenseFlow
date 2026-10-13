import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { AddExpenseScreen } from '../screens/AddExpenseScreen';
import { AiUsageScreen } from '../screens/AiUsageScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { AskAiScreen } from '../screens/AskAiScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ManageAccountsScreen } from '../screens/ManageAccountsScreen';
import { ManageCategoriesScreen } from '../screens/ManageCategoriesScreen';
import { MonthlyScreen } from '../screens/MonthlyScreen';
import { OverviewScreen } from '../screens/OverviewScreen';
import { ReminderScreen } from '../screens/ReminderScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useAuthStore } from '../store/authStore';
import { theme } from '../theme/theme';

export type RootStackParamList = {
  MainTabs: undefined;
  AddExpense:
  | {
    editId?: string;
    editAmount?: number;
    editCategory?: string;
    editNote?: string;
    editAccountId?: string;
    editIsReminder?: boolean;
  }
  | undefined;
  ManageCategories: undefined;
  ManageAccounts: undefined;
  Reminders: undefined;
  AiUsage: undefined;
  Auth: undefined;
  ResetPassword: undefined;
};

export type MainTabParamList = {
  Overview: undefined;
  Timeline?: undefined;
  Analytics?: undefined;
  Add: undefined;
  AskAi: undefined;
  Settings: undefined;
  Home?: undefined;
  Monthly?: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      initialRouteName="Overview"
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#F1F3F5',
        },
        headerTintColor: '#111827',
        headerTitleStyle: {
          fontFamily: theme.fonts.bold,
          fontSize: 18,
          color: '#111827',
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F1F3F5',
          borderTopWidth: 1,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          height: 60 + bottomPadding,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
        },
        tabBarActiveTintColor: '#18181B',
        tabBarInactiveTintColor: '#71717A',
        tabBarLabelStyle: {
          fontFamily: theme.fonts.medium,
          fontSize: 11,
          marginTop: 2,
        },
        tabBarIcon: ({ color, focused }) => {
          if (route.name === 'Overview' || route.name === 'Timeline') {
            return (
              <Icon
                name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
                size={24}
                color={color}
              />
            );
          }
          if (route.name === 'Add') {
            return (
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#18181B',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="plus" size={20} color="#FFFFFF" />
              </View>
            );
          }
          if (route.name === 'AskAi') {
            return (
              <Icon
                name={focused ? 'creation' : 'creation-outline'}
                size={24}
                color={color}
              />
            );
          }
          if (route.name === 'Settings') {
            return (
              <Icon
                name={focused ? 'cog' : 'cog-outline'}
                size={24}
                color={color}
              />
            );
          }
          return <Icon name="circle" size={24} color={color} />;
        },
        tabBarButton: ({ style, children, onPress, onLongPress }) => (
          <Pressable
            style={style as any}
            onPress={onPress}
            onLongPress={onLongPress}
            android_ripple={{ color: 'transparent' }}
          >
            {children}
          </Pressable>
        ),
      })}
    >
      <Tab.Screen
        name="Overview"
        component={OverviewScreen}
        options={{ title: 'Overview', headerShown: false }}
      />
      <Tab.Screen
        name="Add"
        component={HomeScreen}
        options={{ title: 'Add', headerShown: false }}
      />
      <Tab.Screen
        name="AskAi"
        component={AskAiScreen}
        options={{ title: 'Ask AI' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};
import * as SplashScreen from 'expo-splash-screen';

export const AppNavigator = () => {
  const { session, initialized, initialize, pendingPasswordReset } =
    useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const MyTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#F8F9FA',
      card: '#FFFFFF',
      text: '#111827',
      border: '#F1F3F5',
      primary: '#18181B',
    },
  };

  if (!initialized) return null;

  return (
    <NavigationContainer
      theme={MyTheme}
      onReady={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}
    >
      <Stack.Navigator
        screenOptions={{ headerShown: false, presentation: 'modal' }}
      >
        {session ? (
          pendingPasswordReset ? (
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
            />
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={TabNavigator} />
              <Stack.Screen
                name="AddExpense"
                component={AddExpenseScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="ManageCategories"
                component={ManageCategoriesScreen}
                options={{
                  headerShown: true,
                  title: 'Manage Categories',
                  headerStyle: { backgroundColor: '#FFFFFF' },
                  headerTintColor: '#111827',
                  headerTitleStyle: {
                    fontFamily: theme.fonts.bold,
                    fontSize: 18,
                    color: '#111827',
                  },
                }}
              />
              <Stack.Screen
                name="ManageAccounts"
                component={ManageAccountsScreen}
                options={{
                  headerShown: true,
                  title: 'Manage Accounts',
                  headerStyle: { backgroundColor: '#FFFFFF' },
                  headerTintColor: '#111827',
                  headerTitleStyle: {
                    fontFamily: theme.fonts.bold,
                    fontSize: 18,
                    color: '#111827',
                  },
                }}
              />
              <Stack.Screen
                name="Reminders"
                component={ReminderScreen}
                options={{
                  headerShown: true,
                  title: 'Reminders',
                  headerStyle: { backgroundColor: '#FFFFFF' },
                  headerTintColor: '#111827',
                  headerTitleStyle: {
                    fontFamily: theme.fonts.bold,
                    fontSize: 18,
                    color: '#111827',
                  },
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="AiUsage"
                component={AiUsageScreen}
                options={{
                  headerShown: true,
                  title: 'AI Usage',
                  headerStyle: { backgroundColor: '#FFFFFF' },
                  headerTintColor: '#111827',
                  headerTitleStyle: {
                    fontFamily: theme.fonts.bold,
                    fontSize: 18,
                    color: '#111827',
                  },
                }}
              />
            </>
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
