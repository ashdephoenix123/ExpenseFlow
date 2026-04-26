import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AddCategoryScreen } from '../screens/AddCategoryScreen';
import { AddExpenseScreen } from '../screens/AddExpenseScreen';
import { AiUsageScreen } from '../screens/AiUsageScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { AskAiScreen } from '../screens/AskAiScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ManageCategoriesScreen } from '../screens/ManageCategoriesScreen';
import { MonthlyScreen } from '../screens/MonthlyScreen';
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
    newCategory?: string;
  }
  | undefined;
  AddCategory: undefined;
  ManageCategories: undefined;
  AiUsage: undefined;
  Auth: undefined;
  ResetPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Monthly: undefined;
  AskAi: undefined;
  Analytics: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          ...theme.typography.h2,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: bottomPadding,
          paddingTop: 10,
          height: 60 + bottomPadding,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: theme.fonts.displaySemiBold,
          fontSize: 10,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';
          if (route.name === 'Home') iconName = 'view-dashboard';
          else if (route.name === 'Monthly') iconName = 'calendar-month';
          else if (route.name === 'AskAi') iconName = 'creation';
          else if (route.name === 'Analytics') iconName = 'chart-pie';
          else if (route.name === 'Settings') iconName = 'cog';
          return <Icon name={iconName} size={size + 2} color={color} />;
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
        name="Home"
        component={HomeScreen}
        options={{ title: 'Daily Expenses' }}
      />
      <Tab.Screen
        name="Monthly"
        component={MonthlyScreen}
        options={{ title: 'Monthly View' }}
      />
      <Tab.Screen
        name="AskAi"
        component={AskAiScreen}
        options={{ title: 'Ask AI' }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

import BootSplash from 'react-native-bootsplash';

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
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.primary,
    },
  };

  if (!initialized) return null;

  return (
    <NavigationContainer
      theme={MyTheme}
      onReady={() => BootSplash.hide({ fade: true })}
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
                  headerShown: true,
                  title: 'Add Expense',
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.colors.text,
                  presentation: 'modal',
                  headerTitleStyle: theme.typography.h3,
                }}
              />
              <Stack.Screen
                name="AddCategory"
                component={AddCategoryScreen}
                options={{
                  headerShown: true,
                  title: 'New Category',
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.colors.text,
                  presentation: 'modal',
                  headerTitleStyle: theme.typography.h3,
                }}
              />
              <Stack.Screen
                name="ManageCategories"
                component={ManageCategoriesScreen}
                options={{
                  headerShown: true,
                  title: 'Manage Categories',
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.colors.text,
                  headerTitleStyle: theme.typography.h3,
                }}
              />
              <Stack.Screen
                name="AiUsage"
                component={AiUsageScreen}
                options={{
                  headerShown: true,
                  title: 'AI Usage',
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.colors.text,
                  headerTitleStyle: theme.typography.h3,
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
