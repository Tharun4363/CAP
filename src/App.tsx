import React from 'react';
import { enableScreens } from 'react-native-screens';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './Auth/AuthContext';
import { Provider as PaperProvider } from 'react-native-paper';
import 'react-native-url-polyfill';

// Your screens
import Home from './screens/Home';
import LoginScreen from './screens/LoginScreen';
import UpdateWebsite from './screens/UpdateWebsiteMain';
import ProfileNavigator from './screens/ProfileNavigator';
import CRMNavigator from './screens/CRMNavigator';
import UpdateWebsiteNavigator from './screens/UpdateWebsiteNavigator';

export type RootStackParamList = {
  Home: undefined;
  Details: undefined;
  Login: undefined;
  UpdateWebsiteTab: undefined; // Renamed
  ProfileTab: undefined; // Renamed
  CRM: undefined;
  ViewProfile: undefined;
};

export type TabParamList = {
  Home: undefined;
  CRM: undefined;
  UpdateWebsiteTab: undefined; // Renamed
  ProfileTab: undefined; // Renamed
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <PaperProvider>
      <NavigationContainer>
        {isAuthenticated ? (
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: string;

                switch (route.name) {
                  case 'Home':
                    iconName = focused ? 'home' : 'home-outline';
                    break;
                  case 'CRM':
                    iconName = focused ? 'people' : 'people-outline';
                    break;
                  case 'UpdateWebsiteTab': // Updated
                    iconName = focused ? 'construct' : 'construct-outline';
                    break;
                  case 'ProfileTab': // Updated
                    iconName = focused ? 'person' : 'person-outline';
                    break;
                  default:
                    iconName = 'home';
                }

                return <Icon name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#000',
              tabBarInactiveTintColor: 'gray',
            })}
          >
            <Tab.Screen name="Home" component={Home} />
            <Tab.Screen name="CRM" component={CRMNavigator} />
            <Tab.Screen name="UpdateWebsiteTab" component={UpdateWebsiteNavigator} />
            <Tab.Screen name="ProfileTab" component={ProfileNavigator} />
          </Tab.Navigator>
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </PaperProvider>
  );
}

function App(): React.JSX.Element {
  enableScreens();
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

export default App;