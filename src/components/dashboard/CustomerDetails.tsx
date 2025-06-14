import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import axios from 'axios';
import Sidebar from './Sidebar';
import { API_IP_ADDRESS } from '../../../config';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const CustomerDetails: React.FC = () => {
  const [schemaName, setSchemaName] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<{
    customer_name: string;
    cust_id?: string;
    email: string;
    phone_no_1: string;
    uniqueKey?: string;
  } | null>(null);
  const navigation = useNavigation();

  // Form state
  const [newCustomer, setNewCustomer] = useState<{
    name: string;
    email: string;
    phone: string;
  }>({
    name: '',
    email: '',
    phone: '',
  });

  // Error state for add modal
  const [addErrors, setAddErrors] = useState<{
    name: string | null;
    email: string | null;
    phone: string | null;
  }>({
    name: null,
    email: null,
    phone: null,
  });

  // Error state for edit modal
  const [editErrors, setEditErrors] = useState<{
    name: string | null;
    email: string | null;
    phone: string | null;
  }>({
    name: null,
    email: null,
    phone: null,
  });

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  // Function to generate unique keys for customer data
  const generateUniqueKey = (item: any, index: number) => {
    return `customer-${item.email || index}-${index}`;
  };

  // Validation functions
  const validateName = (name: string): string | null => {
    if (!name.trim()) return 'Customer name is required';
    return null;
  };

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@gmail\.com$/;
    if (!emailRegex.test(email)) return 'Email must be a valid Gmail address';
    return null;
  };

  const validatePhone = (phone: string): string | null => {
    if (!phone.trim()) return 'Phone number is required';
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) return 'Phone number must be exactly 10 digits';
    return null;
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

  useEffect(() => {
    const loadCustomerId = async () => {
      try {
        const customerId = await AsyncStorage.getItem('customerId');
        console.log('Retrieved customerId from AsyncStorage:', customerId);

        if (customerId) {
          setSchemaName(customerId);
          fetchCustomerData(customerId);
        } else {
          console.warn('Customer ID not found in AsyncStorage');
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Customer ID not found. Please login again.',
          });
          navigation.goBack();
        }
      } catch (error: any) {
        console.error('Error retrieving customer ID:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load customer data: ' + error.message,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerId();
  }, []);

  const fetchCustomerData = async (customerId: string) => {
    if (!customerId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Invalid customer ID',
      });
      return;
    }

    setConnectionError(false);
    const url = `${API_IP_ADDRESS}/api/v1/customers-by-schema/${customerId}?t=${Date.now()}`;
    console.log('Fetching data from URL:', url);

    try {
      const response = await api.get(url);
      console.log('Customer data received:', response.data);

      if (!response.data || !Array.isArray(response.data)) {
        console.error('Invalid response format:', response.data);
        Toast.show({
          type: 'error',
          text1: 'Data Error',
          text2: 'Invalid data format received from server',
        });
        return;
      }

      const customersWithUniqueKeys = response.data.map((customer, index) => ({
        ...customer,
        uniqueKey: generateUniqueKey(customer, index),
      }));

      console.log('Customer data updated in state:', customersWithUniqueKeys.length, 'customers');
      setCustomerData(customersWithUniqueKeys);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      handleApiError('fetching customer data', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
      }
    }
  };

  const handleApiError = (action: string, error: any) => {
    console.error(`Error ${action}:`, error);
    let errorMessage = 'An unknown error occurred';

    if (error.message === 'Network Error') {
      errorMessage = 'Cannot connect to server. Please check your connection.';
    } else if (error.response) {
      errorMessage = `Server error: ${error.response.status}`;
      if (error.response.data && error.response.data.message) {
        errorMessage += ` - ${error.response.data.message}`;
      }
    } else if (error.request) {
      errorMessage = 'No response from server. Check if the server is running.';
    } else {
      errorMessage = error.message;
    }

    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: errorMessage,
      position: 'bottom',
    });
  };

  const handleAddCustomer = async () => {
    // Validate all fields
    const nameError = validateName(newCustomer.name);
    const emailError = validateEmail(newCustomer.email);
    const phoneError = validatePhone(newCustomer.phone);

    // Update error state
    setAddErrors({
      name: nameError,
      email: emailError,
      phone: phoneError,
    });

    // Proceed only if no errors
    if (nameError || emailError || phoneError) {
      return;
    }

    try {
      const url = `${API_IP_ADDRESS}/api/v1/customers-by-schema/${schemaName}`;
      console.log('Adding customer at URL:', url);
      const payload = {
        customerId: schemaName,
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
      };
      console.log('Customer data to add:', payload);

      const response = await api.post(url, payload);
      console.log('Add customer response:', response.data);

      Toast.show({
        type: 'success',
        text1: 'Success!',
        text2: 'Customer added successfully',
        position: 'bottom',
        visibilityTime: 3000,
      });

      setAddModalVisible(false);
      setNewCustomer({ name: '', email: '', phone: '' });
      setAddErrors({ name: null, email: null, phone: null });
      fetchCustomerData(schemaName);
    } catch (error) {
      handleApiError('adding customer', error);
    }
  };

  const handleEditCustomer = async () => {
    if (!editingCustomer) return;

    // Validate all fields
    const nameError = validateName(editingCustomer.customer_name);
    const emailError = validateEmail(editingCustomer.email); // Email is disabled, but validate for consistency
    const phoneError = validatePhone(editingCustomer.phone_no_1);

    // Update error state
    setEditErrors({
      name: nameError,
      email: emailError,
      phone: phoneError,
    });

    // Proceed only if no errors
    if (nameError || emailError || phoneError) {
      return;
    }

    try {
      const url = `${API_IP_ADDRESS}/api/v1/customers-by-schema/${schemaName}`;
      console.log('Updating customer at URL:', url);
      console.log('Customer data to update:', editingCustomer);

      const updateData = {
        customer_name: editingCustomer.customer_name,
        email: editingCustomer.email,
        phone_no_1: editingCustomer.phone_no_1,
        original_email: editingCustomer.email,
      };

      const response = await api.put(url, updateData);
      console.log('Update customer response:', response.data);

      // Update local state optimistically
      setCustomerData(prevData =>
        prevData.map(item =>
          item.email === editingCustomer.email
            ? { ...item, ...editingCustomer, uniqueKey: generateUniqueKey(editingCustomer, prevData.indexOf(item)) }
            : item
        )
      );

      setEditModalVisible(false);
      setEditingCustomer(null);
      setEditErrors({ name: null, email: null, phone: null });

      Toast.show({
        type: 'success',
        text1: 'Success!',
        text2: 'Customer updated successfully',
        position: 'bottom',
        visibilityTime: 3000,
      });

      console.log('Refreshing customer data after update...');
      await fetchCustomerData(schemaName);
    } catch (error) {
      handleApiError('updating customer', error);
    }
  };

  const ConnectionErrorBanner = () => {
    if (!connectionError) return null;

    let retryTimeout: NodeJS.Timeout | null = null;
    const handleRetry = () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      retryTimeout = setTimeout(() => {
        if (schemaName) fetchCustomerData(schemaName);
      }, 500);
    };

    return (
      <View style={tw`bg-red-100 p-3 border-l-4 border-red-500 mt-150`}>
        <Text style={tw`text-red-700 font-medium`}>Connection Error</Text>
        <Text style={tw`text-red-600`}>Unable to connect to the server</Text>
        <TouchableOpacity
          style={tw`bg-red-200 py-1 px-3 rounded-lg self-start mt-1`}
          onPress={handleRetry}>
          <Text style={tw`text-red-700`}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-white p-4`}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={tw`mt-4 text-gray-600`}>Loading customer data...</Text>
      </SafeAreaView>
    );
  }

  const renderAddModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={addModalVisible}
      onRequestClose={() => {
        setAddModalVisible(false);
        setAddErrors({ name: null, email: null, phone: null });
      }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1 justify-center px-4 mt-14`}>
        <View style={tw`bg-white rounded-lg p-6 shadow-lg mx-2`}>
          <Text style={tw`text-xl font-bold mb-4 text-center text-gray-800`}>
            Add New Customer
          </Text>

          <Text style={tw`text-gray-700 font-medium mb-1`}>Customer Name</Text>
          <TextInput
            style={tw`border ${addErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 mb-1 text-base`}
            placeholder="Enter customer name"
            value={newCustomer.name}
            onChangeText={text => {
              setNewCustomer({ ...newCustomer, name: text });
              setAddErrors({ ...addErrors, name: validateName(text) });
            }}
          />
          {addErrors.name && (
            <Text style={tw`text-red-500 text-xs mb-3`}>{addErrors.name}</Text>
          )}

          <Text style={tw`text-gray-700 font-medium mb-1`}>Email</Text>
          <TextInput
            style={tw`border ${addErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 mb-1 text-base`}
            placeholder="Enter Gmail address (e.g., user@gmail.com)"
            keyboardType="email-address"
            autoCapitalize="none"
            value={newCustomer.email}
            onChangeText={text => {
              const lowercaseText = text.toLowerCase();
              setNewCustomer({ ...newCustomer, email: lowercaseText });
              setAddErrors({ ...addErrors, email: validateEmail(lowercaseText) });
            }}
          />
          {addErrors.email ? (
            <Text style={tw`text-red-500 text-xs mb-3`}>{addErrors.email}</Text>
          ) : (
            <Text style={tw`text-xs text-gray-500 mb-3`}>* Must be a Gmail address</Text>
          )}

          <Text style={tw`text-gray-700 font-medium mb-1`}>Phone Number</Text>
          <TextInput
            style={tw`border ${addErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 mb-1 text-base`}
            placeholder="Enter 10-digit phone number"
            keyboardType="phone-pad"
            value={newCustomer.phone}
            onChangeText={text => {
              const numericText = text.replace(/[^0-9]/g, '');
              setNewCustomer({ ...newCustomer, phone: numericText });
              setAddErrors({ ...addErrors, phone: validatePhone(numericText) });
            }}
            maxLength={10}
          />
          {addErrors.phone ? (
            <Text style={tw`text-red-500 text-xs mb-3`}>{addErrors.phone}</Text>
          ) : (
            <Text style={tw`text-xs text-gray-500 mb-3`}>* Must be exactly 10 digits</Text>
          )}

          <View style={tw`flex-row justify-between`}>
            <TouchableOpacity
              style={tw`bg-gray-300 py-3 px-5 rounded-lg flex-1 mr-2 items-center justify-center`}
              onPress={() => {
                setAddModalVisible(false);
                setAddErrors({ name: null, email: null, phone: null });
              }}>
              <Text style={tw`text-gray-800 text-center font-medium`}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`bg-blue-500 py-3 px-5 rounded-lg flex-1 ml-2`}
              onPress={handleAddCustomer}>
              <Text style={tw`text-white text-center font-medium`}>Add Customer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={editModalVisible}
      onRequestClose={() => {
        setEditModalVisible(false);
        setEditErrors({ name: null, email: null, phone: null });
      }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1 justify-center px-4`}>
        <View style={tw`bg-white rounded-lg p-6 shadow-lg mx-2`}>
          <Text style={tw`text-xl font-bold mb-4 text-center text-gray-800`}>Edit Customer</Text>

          <Text style={tw`text-gray-700 font-medium mb-1`}>Customer Name</Text>
          <TextInput
            style={tw`border ${editErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 mb-1 text-base`}
            placeholder="Enter customer name"
            value={editingCustomer?.customer_name || ''}
            onChangeText={text => {
              if (editingCustomer) {
                setEditingCustomer({ ...editingCustomer, customer_name: text });
                setEditErrors({ ...editErrors, name: validateName(text) });
              }
            }}
          />
          {editErrors.name && (
            <Text style={tw`text-red-500 text-xs mb-3`}>{editErrors.name}</Text>
          )}

          <Text style={tw`text-gray-700 font-medium mb-1`}>Email</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base bg-gray-100 text-gray-600`}
            value={editingCustomer?.email || ''}
            editable={false}
          />
          <Text style={tw`text-xs text-gray-500 mb-3`}>* Email cannot be changed</Text>

          <Text style={tw`text-gray-700 font-medium mb-1`}>Phone Number</Text>
          <TextInput
            style={tw`border ${editErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 mb-1 text-base`}
            placeholder="Enter 10-digit phone number"
            keyboardType="phone-pad"
            value={editingCustomer?.phone_no_1 || ''}
            onChangeText={text => {
              const numericText = text.replace(/[^0-9]/g, '');
              if (editingCustomer) {
                setEditingCustomer({ ...editingCustomer, phone_no_1: numericText });
                setEditErrors({ ...editErrors, phone: validatePhone(numericText) });
              }
            }}
            maxLength={10}
          />
          {editErrors.phone ? (
            <Text style={tw`text-red-500 text-xs mb-3`}>{editErrors.phone}</Text>
          ) : (
            <Text style={tw`text-xs text-gray-500 mb-3`}>* Must be exactly 10 digits</Text>
          )}

          <View style={tw`flex-row justify-between`}>
            <TouchableOpacity
              style={tw`bg-gray-300 py-3 px-5 rounded-lg flex-1 mr-2`}
              onPress={() => {
                setEditModalVisible(false);
                setEditErrors({ name: null, email: null, phone: null });
              }}>
              <Text style={tw`text-gray-800 text-center font-medium`}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`bg-blue-500 py-3 px-5 rounded-lg flex-1 ml-2`}
              onPress={handleEditCustomer}>
              <Text style={tw`text-white text-center font-medium`}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <View style={tw`flex-1`}>
      {isMobile && !sidebarVisible && (
        <View
          style={tw`bg-gray-900 w-full absolute top-0 z-20 flex-row items-center py-4 px-4`}>
          <TouchableOpacity onPress={toggleSidebar} style={tw`p-2 rounded-lg`}>
            <MaterialIcons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`ml-6 text-white text-lg font-semibold`}>Customer Details</Text>
        </View>
      )}

      <Sidebar
        isMobile={isMobile}
        sidebarVisible={sidebarVisible}
        toggleSidebar={toggleSidebar}
      />

      <View style={tw`flex-1 p-8 mt-16`}>
        <Text style={tw`text-xl text-gray-900 font-semibold`}>
          Customer ID: {schemaName ?? 'Not Available'}
        </Text>

        <View style={tw`flex-row px-4 py-3 bg-white border-b border-gray-200`}>
          <TouchableOpacity
            style={tw`bg-blue-500 py-2 px-4 rounded-lg mr-2 flex-1`}
            onPress={() => setAddModalVisible(true)}>
            <Text style={tw`text-white text-center font-medium`}>Add New Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`bg-gray-200 py-2 px-4 rounded-lg ml-2 items-center justify-center`}
            onPress={() => navigation.goBack()}>
            <Text style={tw`text-gray-800 text-center font-medium`}>Back</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <>
            {customerData.length === 0 ? (
              <View style={tw`flex-1 justify-center items-center p-4`}>
                <Text style={tw`text-gray-600 text-lg text-center`}>No customers found.</Text>
                <Text style={tw`text-gray-500 text-center mt-1`}>
                  Add your first customer by clicking the button above.
                </Text>
              </View>
            ) : (
              <FlatList
                key={refreshKey}
                contentContainerStyle={tw`p-4`}
                data={customerData}
                keyExtractor={item => item.uniqueKey}
                ListHeaderComponent={<ConnectionErrorBanner />}
                renderItem={({ item }) => {
                  console.log('Rendering item with uniqueKey:', item.uniqueKey);
                  return (
                    <View style={tw`bg-white p-4 rounded-lg shadow mb-4`}>
                      <Text style={tw`text-lg font-bold`}>{item.customer_name}</Text>
                      <Text style={tw`text-sm text-gray-700`}>Email: {item.email}</Text>
                      <Text style={tw`text-sm text-gray-700`}>Phone: {item.phone_no_1}</Text>
                      <View style={tw`flex-row mt-2`}>
                        <TouchableOpacity
                          style={tw`bg-blue-500 py-1 px-3 rounded mr-2`}
                          onPress={() => {
                            setEditingCustomer(item);
                            setEditModalVisible(true);
                          }}>
                          <Text style={tw`text-white`}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <Text style={tw`text-center text-gray-500 mt-10`}>
                    No customer data available
                  </Text>
                }
              />
            )}
          </>
        )}
      </View>

      {renderAddModal()}
      {renderEditModal()}
      <Toast />
    </View>
  );
};

export default CustomerDetails;