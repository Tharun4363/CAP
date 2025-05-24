import React, {useEffect, useState} from 'react';
import {View, Text, Image, TouchableOpacity, ScrollView} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; // Icons for modern look
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native'; // React Navigation hook for navigating
import {useAuth} from '../Auth/AuthContext';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import {API_IP_ADDRESS} from '../../config';
const ProfilePage = () => {
  const navigation = useNavigation(); // Get the navigation object
  const {logout} = useAuth(); // <- use the logout function from context
  const [userName, setUserName] = useState('User');
  const [customerId, setCustomerId] = useState<any>();

  useEffect(() => {
    const fetchUserData = async () => {
      const storedName = await AsyncStorage.getItem('user_name');
      const id = await AsyncStorage.getItem('customerId');

      // setUserName(storedName);
      setCustomerId(id);
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchName = async () => {
      try {
        const response = await axios.get(
          `${API_IP_ADDRESS}/api/get-contact-name`,
          {
            params: {
              cust_id: customerId,
            },
          },
        );
        setUserName(response.data.contact_name); // ✅ fix key name
        console.log(response.data.contact_name);
      } catch (error) {
        console.error('Error fetching name:', error);
      }
    };

    if (customerId) {
      fetchName(); // ✅ only fetch if cust_id exists
    }
  }, [customerId]);

  const handleLogout = async () => {
    await logout(); // Navigate to the ProfilePage after logout
    Toast.show({
      type: 'success',
      text1: 'Logout Successful',
      text2: 'Redirecting...',
      position: 'bottom',
    });
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flex: 1,
        backgroundColor: '#f7fafc',
        padding: 24,
      }}>
      {/* User Profile Section */}
      <View style={{alignItems: 'center', marginTop: 24}}>
        <Image
          source={{
            uri: 'https://cdn.pixabay.com/photo/2017/06/09/23/22/avatar-2388584_1280.png',
          }} // Replace with your logo URL
          style={{width: 112, height: 112}}
        />
        <Text
          style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#2d3748',
            marginTop: 8,
          }}>
          {userName.toLocaleUpperCase()}
        </Text>
        <Text style={{fontSize: 16, color: '#718096'}}>{customerId}</Text>
      </View>

      {/* Menu Section */}
      <View style={{marginTop: 32}}>
        {[
          {
            title: 'View Profile',
            icon: 'person-outline',
            route: 'ViewProfile',
          },
          {
            title: 'Manage Tickets',
            icon: 'ticket-outline',
            route: 'ManageTickets',
          },
          {
            title: 'Reset Password',
            icon: 'key-outline',
            route: 'ResetPassword',
          },
          {
            title: 'Contact Us',
            icon: 'mail-outline',
            route: 'ContactUs',
          },
        ].map((item, index) => (
          <TouchableOpacity
            key={index}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              marginTop: 16,
              backgroundColor: 'white',
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 2},
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
            onPress={() => navigation.navigate(item.route)} // Use React Navigation to navigate
          >
            <Ionicons name={item.icon} size={24} color="black" />
            <Text style={{fontSize: 18, color: '#2d3748', marginLeft: 12}}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={{
          padding: 16,
          backgroundColor: '#e53e3e',
          borderRadius: 12,
          marginTop: 32,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="white" />
        <Text
          style={{
            fontSize: 18,
            color: 'white',
            fontWeight: '600',
            marginLeft: 8,
          }}>
          Logout
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ProfilePage;
