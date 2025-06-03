import React, {useEffect, useState} from 'react';
import {View, Text, Image, ScrollView, TouchableOpacity} from 'react-native';
import tw from 'twrnc'; // For Tailwind CSS (twrnc for CLI)
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import {useAuth} from '../../Auth/AuthContext';
import axios from 'axios';
import {API_IP_ADDRESS} from '../../../config';
import {set} from 'date-fns';

export default function ViewProfile() {
  const navigation = useNavigation();
  const {logout} = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [uniqueId, setUniqueId] = useState<string | null>(null);
  const [customerData, setCustomerData] = React.useState<{
    contact_name: string;
    email: string;
    address1?: string;
    city?: string;
    state?: string;
    country?: string;
  } | null>(null);

  const [category, setCategory] = React.useState(null);
  const [data, setData] = useState<{
    customer: Record<string, any>;
    additional: Record<string, any>;
  } | null>(null);

  useEffect(() => {
    const getStorageData = async () => {
      const custId = await AsyncStorage.getItem('customerId');
      const uniqId = await AsyncStorage.getItem('cust_uniq_id');
      setCustomerId(custId);
      setUniqueId(uniqId);
    };

    getStorageData();
  }, []);

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      try {
        const response = await axios.get(
          `${API_IP_ADDRESS}/customers/get-details/${customerId}`,
        );

        const categoryResponse = await axios.get(
          `${API_IP_ADDRESS}/api/get-category-id`,
          {
            params: {cust_id: customerId},
          },
        );

        const res = await axios.get(
          `${API_IP_ADDRESS}/customer-details/${customerId}`,
        );
        console.log(res.data);
        const data = response.data;
        setData(res.data);
        setCategory(categoryResponse.data.category_id);
        setCustomerData(data);
        console.log('Customer Details:', data);
      } catch (error) {
        console.error('Error fetching customer details:', error);
      }
    };

    if (customerId) {
      fetchCustomerDetails();
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
    <ScrollView contentContainerStyle={tw`flex-1 bg-gray-100`}>
      {/* Header */}
      <View style={tw`bg-white p-4 flex-row items-center shadow`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
          <Icon name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={tw`text-xl font-semibold text-gray-900 ml-4`}>
          Account Profile
        </Text>
      </View>

      {/* Profile */}
      <View style={tw`items-center mt-6`}>
        <Image
          source={{
            uri: 'https://cdn.pixabay.com/photo/2017/06/09/23/22/avatar-2388584_1280.png',
          }}
          style={tw`w-28 h-28 rounded-full`}
        />
        <Text style={tw`text-2xl font-bold text-gray-900 mt-2`}>
          {customerData?.contact_name.toUpperCase() ?? 'John Doe'}
        </Text>
        <Text style={tw`text-md text-gray-500`}>{customerData?.email}</Text>
      </View>

      {/* Details */}
      <ScrollView style={tw`px-4 mt-6`}>
        <Text style={tw`text-lg font-semibold text-gray-800 mb-2`}>
          Account Information
        </Text>

        <View style={tw`bg-white p-4 rounded-xl shadow-sm`}>
          <InfoItem
            label="Customer Name"
            value={data?.customer?.contact_name ?? '-'}
          />

          <InfoItem
            label="Company Name"
            value={data?.customer?.company_name ?? '-'}
          />
          <InfoItem label="Customer ID" value={customerId ?? '-'} />
          <InfoItem label="Unique ID" value={uniqueId ?? '-'} />
          <InfoItem label="Category ID" value={category ?? '-'} />
          <InfoItem
            label="Web Agent ID"
            value={data?.additional?.web_agent_id ?? '-'}
          />
          <InfoItem
            label="Phone Number"
            value={data?.customer?.phone_no1 ?? '-'}
          />
          <InfoItem label="Email" value={data?.customer?.email ?? '-'} />
          <InfoItem
            label="Date Joined"
            value={
              data?.customer?.create_date
                ? data.customer.create_date.slice(0, 10)
                : '-'
            }
          />

          <InfoItem label="Address" value={customerData?.address1 ?? null} />
          <InfoItem label="City" value={customerData?.city ?? '-'} />
          <InfoItem label="District" value={data?.customer?.district ?? '-'} />
          <InfoItem label="State" value={customerData?.state ?? null} />
          <InfoItem label="Country" value={customerData?.country ?? null} />
          <InfoItem
            label="Postal Code"
            value={data?.customer?.zip_code ?? '-'}
          />
        </View>
      </ScrollView>

      {/* Logout */}
      <TouchableOpacity
        style={tw`bg-blue-500 p-4 rounded-xl mt-6 mx-4`}
        onPress={handleLogout}>
        <Text style={tw`text-lg text-white text-center font-semibold`}>
          Logout
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const InfoItem = ({label, value}: {label: string; value: string | null}) => (
  <View
    style={tw`flex-row justify-between items-center border-b border-gray-200 pb-2 mb-2`}>
    <Text style={tw`text-md text-gray-500`}>{label}:</Text>
    <Text style={tw`text-md text-gray-900 font-semibold`}>{value}</Text>
  </View>
);
