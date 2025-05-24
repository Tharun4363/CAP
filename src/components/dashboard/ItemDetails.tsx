import React, {useState, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import {Modal, Portal, Text, Button, TextInput} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {API_IP_ADDRESS} from '../../../config';
import Toast from 'react-native-toast-message';
import tw from 'tailwind-react-native-classnames';
import {useNavigation} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Sidebar from './Sidebar';

const api = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(request => {
  console.log('Starting Request:', request.method, request.url);
  return request;
});

api.interceptors.response.use(
  response => {
    console.log('Response:', response.status);
    return response;
  },
  error => {
    console.log('Response Error:', error.message);
    if (error.response) {
      console.log('Error Status:', error.response.status);
      console.log('Error Data:', error.response.data);
    }
    return Promise.reject(error);
  },
);

const ItemDetails: React.FC = () => {
  const navigation = useNavigation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [customerItemsData, setCustomerItemsData] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);
  const [opened, setOpened] = useState(false);
  const [newItem, setNewItem] = useState({
    item_details: '',
    description: '',
    purchased_price: '',
    selling_price: '',
    discount: '',
    arg1: '',
    arg2: '',
    arg3: '',
  });
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    console.log('API_IP_ADDRESS:', API_IP_ADDRESS);
  }, []);

  useEffect(() => {
    const loadCustomerId = async () => {
      try {
        const id = await AsyncStorage.getItem('customerId');

        console.log('Retrieved customerId from AsyncStorage:', id);

        if (id) {
          setCustomerId(id);
          await fetchCustomerItemsData(id);
        } else {
          console.warn('Customer ID or Schema not found in AsyncStorage');
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Customer data not found. Please login again.',
            position: 'bottom',
          });
          // navigation.navigate('Login');
        }
      } catch (error: any) {
        console.error('Error retrieving customer ID:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load customer data: ' + error.message,
          position: 'bottom',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerId();
  }, []);

  const fetchCustomerItemsData = async (customerId: string) => {
    try {
      const response = await axios.get(
        `${API_IP_ADDRESS}/api/v1/customer-items-by-schema/${customerId}`,
      );
      if (Array.isArray(response.data)) {
        setCustomerItemsData(response.data);
        console.log('Response data:', response.data);
      } else {
        console.error('Error: Response is not an array');
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Invalid data format received',
          position: 'bottom',
        });
      }
    } catch (error) {
      console.error('Error fetching customer items data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch items data',
        position: 'bottom',
      });
    }
  };

  const navigateBack = () => {
    navigation.goBack();
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

  const handleAddNew = async () => {
    if (
      !newItem.item_details ||
      !newItem.purchased_price ||
      !newItem.selling_price
    ) {
      // Alert.alert('Please fill in all required fields.');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all required fields',
        position: 'bottom',
      });
      return;
    }

    try {
      if (editingItem) {
        // If editing, update the existing record using the item_no
        await axios.put(
          `${API_IP_ADDRESS}/api/v1/customer-items-by-schema/${customerId}/${editingItem.item_no}`,
          newItem,
        );
        // Alert.alert('Customer item updated successfully');
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Customer item updated successfully',
          position: 'bottom',
        });
        navigation.goBack();
      } else {
        // If new record, create a new customer item
        await axios.post(
          `${API_IP_ADDRESS}/api/v1/customer-items-by-schema/${customerId}`,
          newItem,
        );
        // Alert.alert('Customer item added successfully');
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Customer item added successfully',
          position: 'bottom',
        });
        navigation.goBack();
      }

      setOpened(false); // Close modal after adding or updating
      fetchCustomerItemsData(customerId); // Refresh customer data after adding or updating a record
      setEditingItem(null); // Reset editing state
      setNewItem({
        // Reset form fields for next operation
        item_details: '',
        description: '',
        purchased_price: '',
        selling_price: '',
        discount: '',
        arg1: '',
        arg2: '',
        arg3: '',
      });
    } catch (error) {
      console.error('Error adding or updating customer item:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add or update customer item',
        position: 'bottom',
      });
    }
    setOpened(true);
  };

  const handleSaveItem = async () => {
    if (
      !newItem.item_details ||
      !newItem.purchased_price ||
      !newItem.selling_price
    ) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all required fields',
        position: 'bottom',
      });
      return;
    }

    try {
      if (editingItem) {
        await axios.put(
          `${API_IP_ADDRESS}/api/v1/customer-items-by-schema/${customerId}/${editingItem.item_no}`,
          newItem,
        );
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Item updated successfully',
          position: 'bottom',
        });
      } else {
        await axios.post(
          `${API_IP_ADDRESS}/api/v1/customer-items-by-schema/${customerId}`,
          newItem,
        );
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Item added successfully',
          position: 'bottom',
        });
      }

      setOpened(false);
      fetchCustomerItemsData(customerId);
      setEditingItem(null);
      setNewItem({
        item_details: '',
        description: '',
        purchased_price: '',
        selling_price: '',
        discount: '',
        arg1: '',
        arg2: '',
        arg3: '',
      });
    } catch (error: any) {
      console.error('Error saving item:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save item',
        position: 'bottom',
      });
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setNewItem({
      item_details: item.item_details,
      description: item.description,
      purchased_price: item.purchased_price,
      selling_price: item.selling_price,
      discount: item.discount,
      arg1: item.arg1,
      arg2: item.arg2,
      arg3: item.arg3,
    });
    setOpened(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={tw`flex-1 justify-center items-center bg-white mt-150`}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={tw`mt-4 text-gray-600`}>Loading order items...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Top Mobile Navbar */}
      {isMobile && !sidebarVisible && (
        <View
          style={tw`bg-gray-900 w-full absolute top-0 z-20 flex-row items-center py-4 px-4`}>
          <TouchableOpacity
            onPress={toggleSidebar}
            style={tw`bg-gray-800 p-2 rounded`}>
            <MaterialIcons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`ml-4 text-white text-lg font-semibold`}>
            Item Details
          </Text>
        </View>
      )}
      {/* Sidebar */}
      <Sidebar
        isMobile={isMobile}
        sidebarVisible={sidebarVisible}
        toggleSidebar={toggleSidebar}
      />
      {/* Header Section */}
      <View style={tw`p-4 mt-${isMobile ? '20' : '8'}`}>
        <Text style={tw`text-2xl font-bold mb-1 text-gray-900`}>
          Items Details
        </Text>
        <Text style={tw`text-base text-gray-700`}>
          Customer ID: {customerId ?? 'Loading...'}
        </Text>
      </View>
      {/* Action Buttons */}
      <View style={tw`flex-row px-4 py-3 border-b border-gray-200`}>
        <TouchableOpacity
          style={tw`bg-blue-500 py-3 px-4 rounded-lg mr-2 flex-1`}
          onPress={() => {
            setOpened(true);
            setEditingItem(null); // Reset editing state for new item
          }}>
          <Text style={tw`text-white text-center font-medium`}>
            Add New Item
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`bg-gray-100 py-3 px-4 rounded-lg ml-2 flex-1`}
          onPress={navigateBack}>
          <Text style={tw`text-gray-800 text-center font-medium`}>Back</Text>
        </TouchableOpacity>
      </View>
      {/* Main Content */}
      <View style={{marginTop: isMobile ? 60 : 0, flex: 1}}>
        {refreshing ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        ) : customerItemsData.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center p-4`}>
            <Text style={tw`text-gray-600 text-lg text-center`}>
              No order items found.
            </Text>
            <Text style={tw`text-gray-500 text-center mt-1`}>
              Add your first item by clicking the button above.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal contentContainerStyle={tw`px-4`}>
            <View>
              {/* Table Header */}
              <View style={tw`flex-row bg-gray-200 border border-gray-300`}>
                {[
                  'Item No',
                  'Item Details',
                  'Description',
                  'Purchased Price',
                  'Selling Price',
                  'Discount',
                  'Actions',
                ].map((title, i) => (
                  <Text
                    key={i}
                    style={tw`p-2 font-bold border-r border-gray-300 text-gray-800 ${
                      i === 0
                        ? 'w-24'
                        : i === 1
                        ? 'w-32'
                        : i === 2
                        ? 'w-40'
                        : i === 3 || i === 4
                        ? 'w-32'
                        : i === 5
                        ? 'w-24'
                        : 'w-28 border-r-0'
                    }`}>
                    {title}
                  </Text>
                ))}
              </View>

              {/* Table Rows */}
              {customerItemsData.map((item, index) => (
                <View key={index} style={tw`flex-row border-b border-gray-200`}>
                  <Text
                    style={tw`w-24 p-2 border-r border-gray-200 text-gray-800`}>
                    {item.item_no}
                  </Text>
                  <Text
                    style={tw`w-32 p-2 border-r border-gray-200 text-gray-800 `}>
                    {item.item_details}
                  </Text>
                  <Text
                    style={tw`w-40 p-2 border-r border-gray-200 text-gray-800`}>
                    {item.description}
                  </Text>
                  <Text
                    style={tw`w-32 p-2 border-r border-gray-200 text-gray-800`}>
                    {item.purchased_price}
                  </Text>
                  <Text
                    style={tw`w-32 p-2 border-r border-gray-200 text-gray-800`}>
                    {item.selling_price}
                  </Text>
                  <Text
                    style={tw`w-24 p-2 border-r border-gray-200 text-gray-800`}>
                    {item.discount}%
                  </Text>
                  <View style={tw`w-28 p-2 flex-row`}>
                    <TouchableOpacity
                      onPress={() => handleEdit(item)}
                      style={tw`bg-blue-100 px-3 py-1 rounded`}>
                      <Text style={tw`text-blue-600 text-sm`}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
      {/* Modal for adding/editing item */}
      <Portal>
        <Modal
          visible={opened} // This is controlled by the 'opened' state
          onDismiss={() => setOpened(false)} // Close the modal when dismissed
          contentContainerStyle={tw`bg-white p-6 rounded-2xl mx-4`}>
          <Text style={tw`text-xl font-semibold mb-6 text-gray-800`}>
            {editingItem ? 'Edit Item' : 'Add New Item'}
          </Text>

          <View style={tw`gap-3`}>
            {[
              ['Item Details', 'item_details'],
              ['Description', 'description'],
              ['Purchased Price', 'purchased_price', 'numeric'],
              ['Selling Price', 'selling_price', 'numeric'],
              ['Discount', 'discount', 'numeric'],
              ['Additional Info (arg1)', 'arg1'],
              ['Additional Info (arg2)', 'arg2'],
              ['Additional Info (arg3)', 'arg3'],
            ].map(([label, key, type], index) => (
              <TextInput
                key={index}
                mode="outlined"
                label={label}
                value={newItem[key as keyof typeof newItem]}
                keyboardType={type === 'numeric' ? 'numeric' : 'default'}
                onChangeText={text => setNewItem({...newItem, [key]: text})}
                style={tw`mb-3 text-gray-800`}
                theme={{
                  colors: {
                    background: '#fff',
                    text: '#000000',
                    placeholder: '#000',
                    primary: '#3B82F6',
                    outline: '#ccc',
                  },
                }}
              />
            ))}
          </View>

          <View style={tw`flex-row justify-between mt-6`}>
            <Button
              mode="outlined"
              onPress={() => setOpened(false)} // Close the modal
              style={tw`flex-1 mr-2`}>
              <Text style={tw`text-gray-800`}>Cancel</Text>
            </Button>
            <Button
              mode="contained"
              onPress={handleAddNew} // Action for adding/updating
              style={tw`flex-1 ml-2`}>
              {editingItem ? 'Update Item' : 'Add Item'}
            </Button>
          </View>
        </Modal>
      </Portal>

      <Toast />
    </View>
  );
};

export default ItemDetails;
