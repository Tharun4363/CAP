import {View, Text, TouchableOpacity, ScrollView, Image} from 'react-native';
import React, {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import tw from 'tailwind-react-native-classnames';
import Feather from 'react-native-vector-icons/Feather';

const Profile = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('User');
  const [customerId, setCustomerId] = useState<any>();

  useEffect(() => {
    const fetchUserData = async () => {
      const storedName = await AsyncStorage.getItem('user_name');
      const id = await AsyncStorage.getItem('customerId');
      if (storedName) {
        setUserName(storedName);
        setCustomerId(id);
      }
    };
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.clear();
  };

  return (
    <ScrollView style={tw`bg-gray-100 flex-1`}>
      {/* Profile Card */}
      <View style={tw`bg-white p-6 rounded-b-3xl shadow-md items-center`}>
        {/* <Image
          source={{
            uri: "https://cdn.pixabay.com/photo/2015/03/04/22/35/avatar-659652_1280.png",
          }}
          style={tw`w-24 h-24 rounded-full mb-4`}
        /> */}
        <Text style={tw`text-xl font-bold`}>{userName}</Text>
        <Text style={tw`text-gray-500`}>@{customerId}</Text>
      </View>

      {/* Options List */}
      <View style={tw`p-4`}>
        {[
          {title: 'My Orders', icon: 'shopping-bag'},
          {title: 'Wallet & Payments', icon: 'credit-card'},
          {title: 'Saved Addresses', icon: 'map-pin'},
          {title: 'Help & Support', icon: 'help-circle'},
          {title: 'Settings', icon: 'settings'},
        ].map((item, index) => (
          <TouchableOpacity
            key={index}
            style={tw`flex-row items-center p-4 bg-white mb-2 rounded-lg shadow-sm`}>
            <Feather
              name={item.icon}
              size={22}
              color="black"
              style={tw`mr-4`}
            />
            <Text style={tw`text-lg`}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={tw`p-4 bg-red-500 mx-4 my-6 rounded-lg items-center`}
        onPress={handleLogout}>
        <Text style={tw`text-white text-lg font-bold`}>{}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default Profile;
