import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import Sidebar from './Sidebar';

import axios from 'axios';
import {API_IP_ADDRESS} from '../../../config';
import Toast from 'react-native-toast-message';
const OrdersDetail: React.FC = () => {
  const navigation = useNavigation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [groupedOrders, setGroupedOrders] = useState<any[]>([]);
  const [custId, setCustId] = useState<string | null>(null);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  useEffect(() => {
    const getCustomerId = async () => {
      try {
        const id = await AsyncStorage.getItem('customerId');
        if (id) {
          console.log('Fetched customer ID:', id);
          setCustId(id);
        }
      } catch (error) {
        // Alert.alert('Error', 'Error retrieving customer ID.');
        Toast.show({
          type: 'error',
          text1: 'Error retrieving customer ID.',
          position: 'bottom',
        });
        // console.error("Error retrieving customer ID:", error);
      }
    };
    getCustomerId();
  }, []);

  useEffect(() => {
    if (custId) {
      fetchOrders(custId);
    }
  }, [custId]);

  const fetchOrders = async (customerId: string) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_IP_ADDRESS}/api/v1/orders?cust_id=${customerId}`,
      );
      console.log(`${API_IP_ADDRESS}/api/v1/orders?cust_id=${customerId}`);
      if (response.data && response.data.orders.length > 0) {
        console.log('Fetched orders:', response.data.orders);
        const grouped = groupOrders(response.data.orders);
        setOrders(response.data.orders);
        setGroupedOrders(grouped);
        Alert.alert('Success', 'Orders fetched successfully.');
      } else {
        Alert.alert('Info', 'No orders found.');
        setOrders([]);
      }
    } catch (error) {
      // Alert.alert('Error', 'Failed to fetch orders. Please try again.');
      console.error('Error fetching orders:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to fetch orders. Please try again.',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const updateLayout = () => {
      const {width} = Dimensions.get('window');
      setIsMobile(width < 768);
    };

    updateLayout();
    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => subscription?.remove?.();
  }, []);

  const groupOrders = (orders: Order[]) => {
    const orderMap: {[key: string]: any} = {};
    orders.forEach(order => {
      if (orderMap[order.orderId]) {
        orderMap[order.orderId].items.push(order);
      } else {
        orderMap[order.orderId] = {
          ...order,
          items: [order],
        };
      }
    });
    return Object.values(orderMap);
  };
  return (
    <View style={tw`flex-1 bg-white`}>
      {isMobile && !sidebarVisible && (
        <View
          style={tw`bg-gray-900 w-full absolute top-0 z-20 flex-row items-center py-4 px-4`}>
          <TouchableOpacity
            onPress={toggleSidebar}
            style={tw`bg-gray-800 p-2 rounded`}>
            <MaterialIcons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`ml-4 text-white text-lg font-semibold`}>
            Orders Detail
          </Text>
        </View>
      )}

      <Sidebar
        isMobile={isMobile}
        sidebarVisible={sidebarVisible}
        toggleSidebar={toggleSidebar}
      />

      <ScrollView
        contentContainerStyle={tw`p-6`}
        style={{marginTop: isMobile ? 60 : 0}}>
        <Text style={tw`text-2xl font-semibold text-gray-800 mb-4`}>
          Orders Detail
        </Text>
        <Text style={tw`text-base text-gray-700`}>
          Customer ID: {custId ?? 'Loading...'}
        </Text>
        <Text style={tw`text-2xl font-bold mb-2`}>Your Orders</Text>
        <TextInput
          style={tw`border border-gray-300 rounded-md px-4 py-2 mb-4 text-base`}
          placeholder="Search by Order ID, Item Name"
          placeholderTextColor="#9CA3AF" // Tailwind's gray-400
        />

        {loading ? (
          <View style={tw`flex-1 justify-center items-center py-8`}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={tw`mt-4 text-gray-600`}>Loading orders...</Text>
          </View>
        ) : (
          <ScrollView horizontal style={tw`mb-4`}>
            <View style={[tw`rounded-md overflow-hidden`, {minWidth: 1000}]}>
              {/* Table Header */}
              <View style={tw`flex-row bg-gray-200 py-3 px-2`}>
                {[
                  'Order ID',
                  'Name',
                  'Phone No',
                  'Email',
                  'Address',
                  'Status',
                  'Actions',
                ].map((header, index) => (
                  <Text
                    key={index}
                    style={[tw`font-bold text-center`, {width: 140}]} // Fixed width per column
                  >
                    {header}
                  </Text>
                ))}
              </View>

              {/* Table Body */}
              {orders.length > 0 ? (
                <FlatList
                  data={orders}
                  keyExtractor={item => item.orderId.toString()}
                  scrollEnabled={false} // Prevents nested scroll issues
                  renderItem={({item}) => (
                    <View
                      style={tw`flex-row border-b border-gray-200 py-3 px-2`}>
                      <Text style={[tw`text-center`, {width: 140}]}>
                        {item.orderId}
                      </Text>
                      <Text style={[tw`text-center`, {width: 140}]}>
                        {item.name}
                      </Text>
                      <Text style={[tw`text-center`, {width: 140}]}>
                        {item.phoneNo}
                      </Text>
                      <Text style={[tw`text-center`, {width: 140}]}>
                        {item.email}
                      </Text>
                      <Text style={[tw`text-center`, {width: 140}]}>
                        {item.address}
                      </Text>
                      <Text style={[tw`text-center`, {width: 140}]}>
                        {item.status}
                      </Text>
                      <View style={[tw`items-center`, {width: 140}]}>
                        <TouchableOpacity
                          style={tw`bg-blue-500 px-3 py-1 rounded`}
                          onPress={() => OrdersDetail(item)}>
                          <Text style={tw`text-white`}>Details</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              ) : (
                <View style={tw`py-6 border-b border-gray-200`}>
                  <Text style={tw`text-center text-gray-500`}>
                    No orders found
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );
};

export default OrdersDetail;
