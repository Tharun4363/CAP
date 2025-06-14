// UpdateWebsiteNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import UpdateWebsite from './UpdateWebsiteMain';
import EditCustomer from '../components/website/EditCustomer';
import MenuSettings from '../components/website/MenuSettings';
import Deploy from '../components/website/Deploy';
import SelectTemplate from '../components/website/SelectTemplate';
import Content from '../components/website/Content';
import PreviewUrl from '../components/website/PreviewUrl';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  UpdateWebsiteMain: undefined; // Renamed
  EditCustomer: undefined;
  MenuSettings: undefined;
  Previewurl: undefined;
  Deploy: undefined;
  Content: undefined;
  SelectTemplate: undefined;
  UploadImagesModal: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const ContentWrapper: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return <Content visible={true} onClose={() => navigation.goBack()} />;
};

export default function App() {
  return (
    <Stack.Navigator initialRouteName="UpdateWebsiteMain" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UpdateWebsiteMain" component={UpdateWebsite} />
      <Stack.Screen name="EditCustomer" component={EditCustomer} />
      <Stack.Screen name="MenuSettings" component={MenuSettings} />
      <Stack.Screen name="Previewurl" component={PreviewUrl} />
      <Stack.Screen name="Content" component={ContentWrapper} />
      <Stack.Screen name="Deploy" component={Deploy} />
      <Stack.Screen name="SelectTemplate" component={SelectTemplate} />
    </Stack.Navigator>
  );
}