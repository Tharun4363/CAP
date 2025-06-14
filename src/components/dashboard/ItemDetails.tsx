import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Text,
} from 'react-native';
import { Modal, Portal, Button, TextInput } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_IP_ADDRESS } from '../../../config';
import Toast from 'react-native-toast-message';
import tw from 'tailwind-react-native-classnames';
import { useNavigation } from '@react-navigation/native';
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
  console.log('Request:', request.method, request.url, request.data);
  return Promise.resolve(request);
});

api.interceptors.response.use(
  (success) => Promise.resolve(success),
  (error) => {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Error Status:', error.response.status);
      console.log('Error Data:', error.response.data);
    }
    return Promise.reject(error);
  }
);

const ItemDetails: React.FC = () => {
  const navigation = useNavigation();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [customerItemsData, setCustomerItemsData] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opened, setOpened] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
  const [errors, setErrors] = useState({
    item_details: '',
    description: '',
    purchased_price: '',
    selling_price: '',
    discount: '',
    arg1: '',
    arg2: '',
    arg3: '',
  });

  useEffect(() => {
    console.log('API_IP_ADDRESS:', API_IP_ADDRESS);
  }, []);

  useEffect(() => {
    const loadCustomerId = async () => {
      try {
        const id = await AsyncStorage.getItem('customerId');
        console.log('Retrieved customerId:', id);

        if (id) {
          setCustomerId(id);
          await fetchCustomerItemsData(id);
        } else {
          console.warn('Customer ID not found');
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
        console.log('Fetched items:', response.data);
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
      console.error('Error fetching items:', error);
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
      const { width } = Dimensions.get('window');
      setIsMobile(width < 768);
    };
    updateLayout();

    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => subscription?.remove?.();
  }, []);

  // Validate text inputs (only letters, spaces, and basic punctuation)
  const isValidTextValue = (value: string) => {
    if (!value || value.trim() === '') return true; // Allow empty values
    return /^[a-zA-Z\s.,!?-]+$/.test(value);
  };

  // Sanitize and validate numeric inputs
  const validateNumericValue = (value: string) => {
    if (!value || value.trim() === '') return { valid: true, sanitized: '' };
    let cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1]) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2);
    }
    if (cleaned.startsWith('0') && !cleaned.startsWith('0.')) {
      cleaned = cleaned.replace(/^0+/, '') || '0';
    }
    return { valid: /^[0-9]+(\.[0-9]{1,2})?$/.test(cleaned) || cleaned === '0', sanitized: cleaned };
  };

  // Validate required fields
  const validateRequiredFields = () => {
    const requiredFields = ['item_details', 'description', 'purchased_price', 'selling_price', 'discount'];
    let newErrors = { ...errors };
    let isValid = true;

    requiredFields.forEach(field => {
      if (!newItem[field as keyof typeof newItem] || newItem[field as keyof typeof newItem].toString().trim() === '') {
        newErrors[field as keyof typeof errors] = 'This field is required';
        isValid = false;
      } else {
        newErrors[field as keyof typeof errors] = '';
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Validate numeric fields
  const validateNumericFields = () => {
    let newErrors = { ...errors };
    let isValid = true;

    const numericFields = ['purchased_price', 'selling_price', 'discount'];
    numericFields.forEach(field => {
      const value = newItem[field as keyof typeof newItem].toString().trim();
      if (value) {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          newErrors[field as keyof typeof errors] = 'Must be a valid number';
          isValid = false;
        } else if (field === 'discount' && numValue < 0) {
          newErrors[field as keyof typeof errors] = 'Discount cannot be negative';
          isValid = false;
        } else if ((field === 'purchased_price' || field === 'selling_price') && numValue <= 0) {
          newErrors[field as keyof typeof errors] = 'Must be greater than 0';
          isValid = false;
        } else {
          newErrors[field as keyof typeof errors] = '';
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Validate text fields (only for item_details and description)
  const validateTextFields = () => {
    let newErrors = { ...errors };
    let isValid = true;

    const textFields = ['item_details', 'description'];
    textFields.forEach(field => {
      const value = newItem[field as keyof typeof newItem].toString().trim();
      if (value && !isValidTextValue(value)) {
        newErrors[field as keyof typeof errors] = 'Only letters, spaces, or basic punctuation allowed';
        isValid = false;
      } else {
        newErrors[field as keyof typeof errors] = '';
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleAddNew = () => {
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
    setErrors({
      item_details: '',
      description: '',
      purchased_price: '',
      selling_price: '',
      discount: '',
      arg1: '',
      arg2: '',
      arg3: '',
    });
    setOpened(true);
  };

  const handleSaveItem = async () => {
    if (isSaving) return;

    // Validate all fields
    const isRequiredValid = validateRequiredFields();
    const isNumericValid = validateNumericFields();
    const isTextValid = validateTextFields();

    if (!isRequiredValid || !isNumericValid || !isTextValid) return;

    // Trimmed values
    const trimmedItemDetails = newItem.item_details.trim();
    const trimmedDescription = newItem.description.trim();
    const trimmedPurchasedPrice = newItem.purchased_price.trim();
    const trimmedSellingPrice = newItem.selling_price.trim();
    const trimmedDiscount = newItem.discount.trim();
    const trimmedArg1 = newItem.arg1.trim();
    const trimmedArg2 = newItem.arg2.trim();
    const trimmedArg3 = newItem.arg3.trim();

    // Convert to numbers for payload
    const parsedPurchasedPrice = parseFloat(trimmedPurchasedPrice);
    const parsedSellingPrice = parseFloat(trimmedSellingPrice);
    const parsedDiscount = parseFloat(trimmedDiscount);

    // Prepare payload
    const payload = {
      item_details: trimmedItemDetails,
      description: trimmedDescription,
      purchased_price: parsedPurchasedPrice,
      selling_price: parsedSellingPrice,
      discount: parsedDiscount,
      arg1: trimmedArg1.length > 0 ? trimmedArg1 : 'arg1',
      arg2: trimmedArg2.length > 0 ? trimmedArg2 : 'arg2',
      arg3: trimmedArg3.length > 0 ? trimmedArg3 : 'arg3',
    };

    setIsSaving(true);

    try {
      if (editingItem) {
        const cleanCustomerId = customerId.toString().trim();
        const cleanItemNo = editingItem.item_no.toString().trim();

        console.log('Editing item:', cleanItemNo, 'Customer ID:', cleanCustomerId);
        console.log('PUT request to:', `${API_IP_ADDRESS}/api/v1/customer-items-by-schema/${cleanCustomerId}/${cleanItemNo}`);
        console.log('Payload:', JSON.stringify(payload, null, 2));

        const response = await axios.put(
          `${API_IP_ADDRESS}/api/v1/customer-items-by-schema/${cleanCustomerId}/${cleanItemNo}`,
          { ...payload, item_no: cleanItemNo },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
          },
        );

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Item updated successfully',
          position: 'bottom',
        });

        console.log('Update response:', response.data);
      } else {
        console.log('Adding item, Customer ID:', customerId);
        const response = await axios.post(
          `${API_IP_ADDRESS}/api/v1/customer-items-by-schema/${customerId}`,
          payload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
          },
        );

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Item added successfully',
          position: 'bottom',
        });

        console.log('Add response:', response.data);
      }

      // Reset form and reload data
      setOpened(false);
      await fetchCustomerItemsData(customerId);
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
      setErrors({
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
      console.error('Error saving item:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        payload,
        customerId,
      });

      let errorMessage = 'Failed to save item';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid data provided. Please check all fields.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please contact support or try again later.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      }

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
        position: 'bottom',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: any) => {
    console.log('Editing item:', item);
    setEditingItem(item);
    setNewItem({
      item_details: item.item_details || '',
      description: item.description || '',
      purchased_price: item.purchased_price ? item.purchased_price.toString() : '',
      selling_price: item.selling_price ? item.selling_price.toString() : '',
      discount: item.discount ? item.discount.toString() : '',
      arg1: item.arg1 || '',
      arg2: item.arg2 || '',
      arg3: item.arg3 || '',
    });
    setErrors({
      item_details: '',
      description: '',
      purchased_price: '',
      selling_price: '',
      discount: '',
      arg1: '',
      arg2: '',
      arg3: '',
    });
    setOpened(true);
  };

  // Handle input changes with validation
  const handleInputChange = (key: string, text: string) => {
    let newErrors = { ...errors };

    if (key === 'purchased_price' || key === 'selling_price' || key === 'discount') {
      const { valid, sanitized } = validateNumericValue(text);
      if (!valid && text.trim() !== '') {
        newErrors[key as keyof typeof errors] = 'Must be a valid number';
      } else if (sanitized) {
        const numValue = parseFloat(sanitized);
        if (key === 'discount' && numValue < 0) {
          newErrors[key as keyof typeof errors] = 'Discount cannot be negative';
        } else if ((key === 'purchased_price' || key === 'selling_price') && numValue <= 0) {
          newErrors[key as keyof typeof errors] = 'Must be greater than 0';
        } else {
          newErrors[key as keyof typeof errors] = '';
        }
      } else {
        newErrors[key as keyof typeof errors] = '';
      }
      setNewItem({ ...newItem, [key]: sanitized });
    } else if (key === 'item_details' || key === 'description') {
      if (text && !isValidTextValue(text)) {
        newErrors[key as keyof typeof errors] = 'Only letters, spaces, or basic punctuation allowed';
      } else {
        newErrors[key as keyof typeof errors] = '';
      }
      setNewItem({ ...newItem, [key]: text });
    } else {
      // No validation for arg1, arg2, arg3
      newErrors[key as keyof typeof errors] = '';
      setNewItem({ ...newItem, [key]: text });
    }

    setErrors(newErrors);
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[tw`flex-1 justify-center items-center bg-white`, { marginTop: 150 }]}
      >
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={tw`mt-4 text-gray-600`}>Loading items...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Top Mobile Navbar */}
      {isMobile && !sidebarVisible && (
        <View
          style={tw`bg-gray-900 w-full absolute top-0 z-20 flex-row items-center py-4 px-4`}
        >
          <TouchableOpacity
            onPress={() => setSidebarVisible(!sidebarVisible)}
            style={tw`bg-gray-800 p-2 rounded`}
          >
            <MaterialIcons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`ml-4 text-white text-lg font-semibold`}>Item Details</Text>
        </View>
      )}
      {/* Sidebar */}
      <Sidebar
        isMobile={isMobile}
        sidebarVisible={sidebarVisible}
        toggleSidebar={() => setSidebarVisible(!sidebarVisible)}
      />
      {/* Header Section */}
      <View style={tw`p-4 mt-${isMobile ? '20' : '8'}`}>
        <Text style={tw`text-2xl font-bold mb-1 text-gray-900`}>Items Details</Text>
        <Text style={tw`text-base text-gray-700`}>Customer ID: {customerId || 'Loading...'}</Text>
      </View>
      {/* Action Buttons */}
      <View style={tw`flex-row px-4 py-3 border-b border-gray-200`}>
        <TouchableOpacity
          style={tw`bg-blue-500 py-3 px-4 rounded-lg mr-2 flex-1`}
          onPress={handleAddNew}
        >
          <Text style={tw`text-white text-center font-medium`}>Add New Item</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`bg-gray-100 py-3 px-4 rounded-lg ml-2 flex-1`}
          onPress={navigateBack}
        >
          <Text style={tw`text-gray-800 text-center font-medium`}>Back</Text>
        </TouchableOpacity>
      </View>
      {/* Main Content */}
      <View style={{ marginTop: isMobile ? 60 : 0, flex: 1 }}>
        {refreshing ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        ) : customerItemsData.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center p-4`}>
            <Text style={tw`text-gray-600 text-lg text-center`}>No items found.</Text>
            <Text style={tw`text-gray-500 text-center mt-1`}>
              Add your first item by clicking the button above.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            contentContainerStyle={tw`px-4`}
            showsHorizontalScrollIndicator={true}
            style={tw`flex-1`}
          >
            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ minWidth: '100%' }}
            >
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
                      }`}
                    >
                      {title}
                    </Text>
                  ))}
                </View>
                {/* Table Rows */}
                {customerItemsData.map((item, index) => (
                  <View key={index} style={tw`flex-row border-b border-gray-200`}>
                    <Text style={tw`w-24 p-2 border-r border-gray-200 text-gray-800`}>{item.item_no}</Text>
                    <Text style={tw`w-32 p-2 border-r border-gray-200 text-gray-800`}>{item.item_details || ''}</Text>
                    <Text style={tw`w-40 p-2 border-r border-gray-200 text-gray-800`}>{item.description || ''}</Text>
                    <Text style={tw`w-32 p-2 border-r border-gray-200 text-gray-800`}>{item.purchased_price || ''}</Text>
                    <Text style={tw`w-32 p-2 border-r border-gray-200 text-gray-800`}>{item.selling_price || ''}</Text>
                    <Text style={tw`w-24 p-2 border-r border-gray-200 text-gray-800`}>{item.discount ? `${item.discount}%` : '0%'}</Text>
                    <View style={tw`w-28 p-2 flex-row`}>
                      <TouchableOpacity
                        onPress={() => handleEdit(item)}
                        style={tw`bg-blue-100 px-3 py-1 rounded`}
                      >
                        <Text style={tw`text-blue-600 text-sm`}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        )}
      </View>
      {/* Modal for adding/editing item */}
      <Portal>
        <Modal
          visible={opened}
          onDismiss={() => !isSaving && setOpened(false)}
          contentContainerStyle={[
            tw`bg-white p-6 rounded-2xl mx-4`,
            {
              maxHeight: Dimensions.get('window').height * 0.8,
              width: Math.min(Dimensions.get('window').width - 32, 500),
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            contentContainerStyle={tw`pb-4`}
          >
            <Text style={tw`text-xl font-semibold mb-6 text-black`}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>
            <View>
              {[
                ['Item Details *', 'item_details', 'text'],
                ['Description *', 'description', 'text'],
                ['Purchased Price *', 'purchased_price', 'numeric'],
                ['Selling Price *', 'selling_price', 'numeric'],
                ['Discount *', 'discount', 'numeric'],
                ['Additional Info (arg1)', 'arg1', 'text'],
                ['Additional Info (arg2)', 'arg2', 'text'],
                ['Additional Info (arg3)', 'arg3', 'text'],
              ].map(([label, key, type], index, array) => (
                <View key={index} style={tw`${index < array.length - 1 ? 'mb-3' : ''}`}>
                  <TextInput
                    mode="outlined"
                    label={label}
                    value={newItem[key as keyof typeof newItem]}
                    keyboardType={type === 'numeric' ? 'numeric' : 'default'}
                    onChangeText={text => handleInputChange(key, text)}
                    error={!!errors[key as keyof typeof errors]}
                    theme={{
                      colors: {
                        background: '#fff',
                        text: 'black',
                        placeholder: 'black',
                        primary: 'black',
                        outline: 'black',
                        error: 'red',
                      },
                    }}
                    textColor="black"
                    disabled={isSaving}
                  />
                  {!!errors[key as keyof typeof errors] && (
                    <Text style={tw`text-red-500 text-sm mt-1`}>{errors[key as keyof typeof errors]}</Text>
                  )}
                </View>
              ))}
            </View>
            <View style={tw`flex-row justify-between mt-6`}>
              <Button
                mode="outlined"
                onPress={() => setOpened(false)}
                style={tw`flex-1 mr-2 bg-gray-300 rounded-lg`}
                labelStyle={tw`text-gray-800 font-medium`}
                contentStyle={tw`py-3`}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveItem}
                style={tw`flex-1 ml-2 rounded-lg bg-blue-500`}
                labelStyle={tw`text-white font-medium`}
                contentStyle={tw`py-3`}
                disabled={isSaving}
                loading={isSaving}
              >
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
      <Toast />
    </View>
  );
};

export default ItemDetails;