// ProfileNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Profile from './ProfileMain';
import ViewProfile from '../components/profile/ViewProfile';
import ManageTickets from '../components/profile/ManageTickets';
import ResetPassword from '../components/profile/ResetPassword';
import ContactUs from '../components/profile/ContactUs';

export type ProfileStackParamList = {
  ProfileMain: undefined; // Renamed
  ViewProfile: undefined;
  ManageTickets: undefined;
  ResetPassword: undefined;
  ContactUs: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={Profile} />
      <Stack.Screen name="ViewProfile" component={ViewProfile} />
      <Stack.Screen name="ManageTickets" component={ManageTickets} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
      <Stack.Screen name="ContactUs" component={ContactUs} />
    </Stack.Navigator>
  );
}