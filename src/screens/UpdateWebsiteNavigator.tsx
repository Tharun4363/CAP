import React from 'react';

import {createNativeStackNavigator} from '@react-navigation/native-stack';

import UpdateWebsite from '../screens/UpdateWebsite';
import EditCustomer from '../components/website/EditCustomer';
import MenuSettings from '../components/website/MenuSettings';

import Deploy from '../components/website/Deploy';
import UploadImagesModal from '../components/website/UploadImagesModal';
import SelectTemplate from '../components/website/SelectTemplate';
import Content from '../components/website/Content';
// import Test from '../components/website/Test';
import PreviewUrl from '../components/website/PreviewUrl';

export type RootStackParamList = {
  UpdateWebsite: undefined;
  EditCustomer: undefined;
  MenuSettings: undefined;
  Previewurl: undefined;
  Deploy: undefined;
  ContentUpdation: {
    visible: boolean;
    onClose: () => void;
  };
  SelectTemplate: undefined;
  Content: undefined;
  UploadImagesModal: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <Stack.Navigator
      initialRouteName="UpdateWebsite"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="UpdateWebsite" component={UpdateWebsite} />
      <Stack.Screen name="EditCustomer" component={EditCustomer} />
      <Stack.Screen name="MenuSettings" component={MenuSettings} />
      <Stack.Screen name="Previewurl" component={PreviewUrl} />
      <Stack.Screen name="Content" component={Content} />
      <Stack.Screen name="Deploy" component={Deploy} />
      {/* <Stack.Screen name="UploadImagesModal" component={Test} /> */}

      <Stack.Screen name="SelectTemplate" component={SelectTemplate} />
      {/* <Stack.Screen name="UploadImages" component={UploadImagesModal} /> */}
    </Stack.Navigator>
  );
}
