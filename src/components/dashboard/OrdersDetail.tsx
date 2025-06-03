import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import Sidebar from './Sidebar';
import axios from 'axios';
import { API_IP_ADDRESS } from '../../../config';
import Toast from 'react-native-toast-message';

interface Order {
  order_id: string;
  name: string;
  phone_no: string;
  email: string;
  address: string;
  order_status: string;
  item_name: string;
  item_price: number;
  quantity: number;
  pickup_at_store: 'Y' | 'N';
  home_delivery: 'Y' | 'N';
  [key: string]: any;
}

const OrdersDetail: React.FC = () => {
  const navigation = useNavigation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [groupedOrders, setGroupedOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [custId, setCustId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionError, setConnectionError] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Configure axios instance
  const api = axios.create({
    baseURL: API_IP_ADDRESS,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Request/response interceptors
  api.interceptors.request.use(request => {
    console.log('Starting Request:', request.method, request.url, request.params);
    return request;
  });

  api.interceptors.response.use(
    response => {
      console.log('Response:', response.status, JSON.stringify(response.data, null, 2));
      return response;
    },
    error => {
      console.log('Response Error:', error.message);
      if (error.response) {
        console.log('Error Status:', error.response.status);
        console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
      }
      return Promise.reject(error);
    },
  );

  // Log API_IP_ADDRESS
  useEffect(() => {
    console.log('API_IP_ADDRESS:', API_IP_ADDRESS);
  }, []);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  useEffect(() => {
    const getCustomerId = async () => {
      try {
        const id = await AsyncStorage.getItem('customerId');
        if (id) {
          console.log('Fetched customer ID:', id);
          setCustId(id);
        } else {
          console.warn('Customer ID not found');
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Customer ID not found. Please login again.',
            position: 'bottom',
          });
          navigation.goBack();
        }
      } catch (error: any) {
        console.error('Error retrieving customer ID:', error.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Error retrieving customer ID.',
          position: 'bottom',
        });
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
    setConnectionError(false);
    try {
      const response = await api.get('/api/v1/orders', {
        params: { cust_id: customerId },
      });

      console.log('API response:', response.data);

      const fetchedOrders = response.data.orders || [];
      if (Array.isArray(fetchedOrders) && fetchedOrders.length > 0) {
        console.log('Fetched orders:', JSON.stringify(fetchedOrders, null, 2));
        const grouped = groupOrders(fetchedOrders);
        setOrders(fetchedOrders);
        setGroupedOrders(grouped);
        setFilteredOrders(grouped);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Orders fetched successfully.',
          position: 'bottom',
        });
      } else {
        console.log('No orders found for customer:', customerId);
        setOrders([]);
        setGroupedOrders([]);
        setFilteredOrders([]);
        Toast.show({
          type: 'info',
          text1: 'Info',
          text2: 'No orders found.',
          position: 'bottom',
        });
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        console.log('404: No orders found for customer:', customerId);
        setOrders([]);
        setGroupedOrders([]);
        setFilteredOrders([]);
        Toast.show({
          type: 'info',
          text1: 'Info',
          text2: 'No orders found.',
          position: 'bottom',
        });
      } else {
        console.error('Error fetching orders:', error.message);
        let errorMessage = 'Failed to fetch orders. Please try again.';
        if (error.response) {
          errorMessage = `Server error: ${error.response.status}`;
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: errorMessage,
            position: 'bottom',
          });
        } else if (error.message === 'Network Error') {
          errorMessage = 'Cannot connect to server. Please check your connection or server status.';
          setConnectionError(true);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: errorMessage,
            position: 'bottom',
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: errorMessage,
            position: 'bottom',
          });
        }
        setOrders([]);
        setGroupedOrders([]);
        setFilteredOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const updateLayout = () => {
      const { width } = Dimensions.get('window');
      setIsMobile(width < 768);
    };

    updateLayout();
    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => subscription?.remove?.();
  }, []);

  const groupOrders = (orders: Order[]) => {
    const orderMap: { [key: string]: any } = {};
    orders.forEach(order => {
      const orderId = order.order_id || `order_${Math.random().toString(36).substr(2, 9)}`;
      if (orderMap[orderId]) {
        orderMap[orderId].items.push({
          item_name: order.item_name || 'Unknown Item',
          item_price: order.item_price || 0,
          quantity: order.quantity || 1,
          pickup_at_store: order.pickup_at_store || 'N',
          home_delivery: order.home_delivery || 'N',
        });
      } else {
        orderMap[orderId] = {
          order_id: orderId,
          name: order.name || 'N/A',
          phone_no: order.phone_no || 'N/A',
          email: order.email || 'N/A',
          address: order.address || 'N/A',
          order_status: order.order_status === 'XXXXXX' ? 'Open' : order.order_status || 'N/A',
          items: [
            {
              item_name: order.item_name || 'Unknown Item',
              item_price: order.item_price || 0,
              quantity: order.quantity || 1,
              pickup_at_store: order.pickup_at_store || 'N',
              home_delivery: order.home_delivery || 'N',
            },
          ],
        };
      }
    });
    return Object.values(orderMap);
  };

  useEffect(() => {
    if (searchQuery) {
      setFilteredOrders(
        groupedOrders.filter(
          order =>
            order.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.items.some((item: any) =>
              item.item_name.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
        ),
      );
    } else {
      setFilteredOrders(groupedOrders);
    }
  }, [searchQuery, groupedOrders]);

  const openOrderDetails = (order: any) => {
    console.log('Opening details for order:', order.order_id);
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  const calculateTotalAmount = (items: any[]) => {
    const total = items.reduce((sum, item) => sum + item.item_price * item.quantity, 0);
    return `₹ ${total.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    return status === 'Closed' ? '#22c55e' : status === 'Open' ? '#f97316' : '#6b7280';
  };

  const ConnectionErrorBanner = () => {
    if (!connectionError) return null;

    return (
      <View style={tw`bg-red-100 p-3 border-l-4 border-red-500 mb-4`}>
        <Text style={tw`text-red-700 font-medium`}>Connection Error</Text>
        <Text style={tw`text-red-600`}>Unable to connect to the server</Text>
        <TouchableOpacity
          style={tw`bg-red-200 py-1 px-3 rounded-lg self-start mt-1`}
          onPress={() => {
            if (custId) {
              console.log('Retry fetchOrders triggered');
              fetchOrders(custId);
            }
          }}>
          <Text style={tw`text-red-700`}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderOrderModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={closeModal}>
      <View style={tw`flex-1 justify-center px-4 bg-black bg-opacity-50`}>
        <View style={[tw`bg-white rounded-lg p-6`, { maxHeight: '75%' }]}>
          <Text style={tw`text-xl font-bold mb-4 text-gray-800`}>
            Order Details
          </Text>
          <ScrollView>
            {selectedOrder && (
              <>
                <Text style={tw`text-gray-700 mb-2`}>
                  <Text style={tw`font-semibold`}>Name:</Text> {selectedOrder.name}
                </Text>
                <Text style={tw`text-gray-700 mb-2`}>
                  <Text style={tw`font-semibold`}>Phone:</Text> {selectedOrder.phone_no}
                </Text>
                <Text style={tw`text-gray-700 mb-2`}>
                  <Text style={tw`font-semibold`}>Email:</Text> {selectedOrder.email}
                </Text>
                <Text style={tw`text-gray-700 mb-4`}>
                  <Text style={tw`font-semibold`}>Address:</Text> {selectedOrder.address}
                </Text>

                <Text style={tw`text-gray-700 font-semibold mb-2`}>Items:</Text>
                {selectedOrder.items.map((item: any, index: number) => (
                  <View key={index} style={tw`border-b border-gray-200 py-2`}>
                    <Text style={tw`text-gray-600`}>Item: {item.item_name}</Text>
                    <Text style={tw`text-gray-600`}>Price: ₹ {item.item_price}</Text>
                    <Text style={tw`text-gray-600`}>Quantity: {item.quantity}</Text>
                    <Text style={tw`text-gray-600`}>Pickup at Store: {item.pickup_at_store === 'Y' ? 'Yes' : 'No'}</Text>
                    <Text style={tw`text-gray-600`}>Home Delivery: {item.home_delivery === 'Y' ? 'Yes' : 'No'}</Text>
                  </View>
                ))}

                <Text style={tw`text-gray-700 mt-4`}>
                  <Text style={tw`font-semibold`}>Status:</Text>{' '}
                  <Text style={{ color: getStatusColor(selectedOrder.order_status) }}>
                    {selectedOrder.order_status}
                  </Text>
                </Text>
                <Text style={tw`text-gray-700 mt-2`}>
                  <Text style={tw`font-semibold`}>Total Amount:</Text> {calculateTotalAmount(selectedOrder.items)}
                </Text>
              </>
            )}
          </ScrollView>
          <View style={tw`flex-row justify-end mt-4`}>
            <TouchableOpacity
              style={tw`bg-gray-300 py-2 px-4 rounded-lg mr-2`}
              onPress={closeModal}>
              <Text style={tw`text-gray-800`}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
        style={{ marginTop: isMobile ? 60 : 0 }}>
        <TouchableOpacity
          style={tw`bg-gray-300 py-2 px-4 rounded-lg mb-4 self-start`}
          onPress={() => navigation.goBack()}>
          <Text style={tw`text-gray-800`}>Go Back</Text>
        </TouchableOpacity>
        <Text style={tw`text-2xl font-semibold text-gray-800 mb-4`}>
          Orders Detail
        </Text>
        <Text style={tw`text-base text-gray-700 mb-4`}>
          Customer ID: {custId ?? 'Loading...'}
        </Text>
        <TextInput
          style={tw`border border-gray-300 rounded-md px-4 py-2 mb-4 text-base`}
          placeholder="Search by Order ID, Name, Item"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <ConnectionErrorBanner />

        {loading ? (
          <View style={tw`flex-1 justify-center items-center py-8`}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={tw`mt-4 text-gray-600`}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length > 0 ? (
          <FlatList
            data={filteredOrders}
            keyExtractor={item => item.order_id}
            renderItem={({ item }) => (
              <View style={tw`bg-gray-50 p-4 mb-4 rounded-lg border border-gray-200`}>
                <View style={tw`flex-row justify-between items-center mb-2`}>
                  <Text style={tw`text-lg font-bold text-gray-800`}>
                    Order ID: {item.order_id}
                  </Text>
                  <TouchableOpacity
                    style={tw`bg-blue-500 px-3 py-1 rounded`}
                    onPress={() => openOrderDetails(item)}>
                    <Text style={tw`text-white`}>Details</Text>
                  </TouchableOpacity>
                </View>
                <Text style={tw`text-gray-700`}>Customer: {item.name}</Text>
                <Text style={tw`text-gray-700`}>Phone: {item.phone_no}</Text>
                <Text style={tw`text-gray-700`}>Email: {item.email}</Text>
                <Text style={tw`text-gray-700`}>Address: {item.address}</Text>
                <Text style={tw`text-gray-700`}>
                  <Text style={tw`font-semibold`}>Status:</Text>{' '}
                  <Text style={{ color: getStatusColor(item.order_status) }}>
                    {item.order_status}
                  </Text>
                </Text>
              </View>
            )}
          />
        ) : (
          <View style={tw`py-6 items-center`}>
            <Text style={tw`text-center text-gray-500 mb-4`}>No orders found</Text>
            {connectionError && (
              <TouchableOpacity
                style={tw`bg-blue-500 px-4 py-2 rounded`}
                onPress={() => {
                  if (custId) {
                    console.log('Retry fetchOrders triggered from no orders');
                    fetchOrders(custId);
                  }
                }}>
                <Text style={tw`text-white`}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {renderOrderModal()}
      <Toast />
    </View>
  );
};

export default OrdersDetail;