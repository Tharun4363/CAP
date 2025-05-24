import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
} from 'react-native';

import {useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import axios from 'axios';
import Sidebar from './Sidebar';
import {API_IP_ADDRESS} from '../../../config';
import {useEffect, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';

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

// Add response interceptor for logging
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
  // Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<{
    customer_name: string;
    email: string;
    phone_no_1: string;
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

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  useEffect(() => {
    const updateLayout = () => {
      const {width} = Dimensions.get('window');
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
  const fetchCustomerData = async (customerId: any) => {
    setConnectionError(false);
    const url = `${API_IP_ADDRESS}/api/v1/customers-by-schema/${customerId}`;
    console.log('Fetching data from URL:', url);

    try {
      const response = await api.get(url);
      console.log(
        'Customer data received:',
        response.data?.length || 'no data',
      );

      if (Array.isArray(response.data)) {
        setCustomerData(response.data);
        console.log('Customer data set:', response.data);
      } else {
        console.error('Error: Response is not an array', response.data);
        Toast.show({
          type: 'error',
          text1: 'Data Error',
          text2: 'Invalid data format received',
        });
      }
    } catch (error: any) {
      handleApiError('fetching customer data', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
      }
    } finally {
    }
  };
  const handleApiError = (action: any, error: any) => {
    console.error(`Error ${action}:`, error);

    let errorMessage = 'An unknown error occurred';

    if (error.message === 'Network Error') {
      errorMessage = 'Cannot connect to server. Please check your connection.';
    } else if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage = `Server error: ${error.response.status}`;
      if (error.response.data && error.response.data.message) {
        errorMessage += ` - ${error.response.data.message}`;
      }
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response from server. Check if the server is running.';
    } else {
      // Something happened in setting up the request that triggered an Error
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
    if (!newCustomer.name || !newCustomer.email || !newCustomer.phone) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'All fields are required',
        position: 'bottom',
      });
      return;
    }

    try {
      // Build the URL for the API endpoint
      const url = `${API_IP_ADDRESS}/api/v1/customers-by-schema/${schemaName}`;

      console.log('Adding customer at URL:', url);
      console.log('Customer data to add:', newCustomer);

      // Send the customer data in the request body
      const response = await api.post(url, newCustomer);
      console.log('Add customer response:', response.data);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Customer added successfully',
        position: 'bottom',
      });

      setAddModalVisible(false);
      setNewCustomer({name: '', email: '', phone: ''});
      fetchCustomerData(schemaName);
    } catch (error) {
      handleApiError('adding customer', error);
    }
  };

  const handleEditCustomer = async () => {
    if (
      !editingCustomer?.customer_name ||
      !editingCustomer?.email ||
      !editingCustomer?.phone_no_1
    ) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'All fields are required',
        position: 'bottom',
      });
      return;
    }

    try {
      const url = `${API_IP_ADDRESS}/api/v1/customers-by-schema/${schemaName}`;
      console.log('Updating customer at URL:', url);
      console.log('Customer data to update:', editingCustomer);

      const response = await api.put(url, editingCustomer);
      console.log('Update customer response:', response.data);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Customer updated successfully',
        position: 'bottom',
      });

      setEditModalVisible(false);
      setEditingCustomer(null);
      fetchCustomerData(schemaName);
    } catch (error) {
      handleApiError('updating customer', error);
    }
  };

  const handleDeleteCustomer = (customer: any) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${customer.customer_name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const url = `${API_IP_ADDRESS}/api/v1/customers-by-schema/${schemaName}`;
              console.log('Deleting customer at URL:', url);
              console.log('Customer email to delete:', customer.email);

              const response = await api.delete(url, {
                data: {email: customer.email},
              });
              console.log('Delete customer response:', response.data);

              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Customer deleted successfully',
                position: 'bottom',
              });

              fetchCustomerData(schemaName);
            } catch (error) {
              handleApiError('deleting customer', error);
            }
          },
        },
      ],
    );
  };
  const ConnectionErrorBanner = () => {
    if (!connectionError) return null;

    return (
      <View style={tw`bg-red-100 p-3 border-l-4 border-red-500  mt-150`}>
        <Text style={tw`text-red-700 font-medium`}>Connection Error</Text>
        <Text style={tw`text-red-600`}>Unable to connect to the server</Text>
        <TouchableOpacity
          style={tw`bg-red-200 py-1 px-3 rounded-lg self-start mt-1`}
          onPress={() => {
            if (schemaName) {
              fetchCustomerData(schemaName);
            }
          }}>
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

  // Add Customer Modal
  const renderAddModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={addModalVisible}
      onRequestClose={() => setAddModalVisible(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1 justify-center px-4 mt-14`}>
        <View style={tw`bg-white rounded-lg p-6 shadow-lg mx-2`}>
          <Text style={tw`text-xl font-bold mb-4 text-center text-gray-800`}>
            Add New Customer
          </Text>

          <Text style={tw`text-gray-700 font-medium mb-1`}>Customer Name</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
            placeholder="Enter customer name"
            value={newCustomer.name}
            onChangeText={text => setNewCustomer({...newCustomer, name: text})}
          />

          <Text style={tw`text-gray-700 font-medium mb-1`}>Email</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
            placeholder="Enter customer email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={newCustomer.email}
            onChangeText={text => setNewCustomer({...newCustomer, email: text})}
          />

          <Text style={tw`text-gray-700 font-medium mb-1`}>Phone Number</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-4 text-base`}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            value={newCustomer.phone}
            onChangeText={text => setNewCustomer({...newCustomer, phone: text})}
          />

          <View style={tw`flex-row justify-between`}>
            <TouchableOpacity
              style={tw`bg-gray-300 py-3 px-5 rounded-lg flex-1 mr-2`}
              onPress={() => setAddModalVisible(false)}>
              <Text style={tw`text-gray-800 text-center font-medium`}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`bg-blue-500 py-3 px-5 rounded-lg flex-1 ml-2`}
              onPress={handleAddCustomer}>
              <Text style={tw`text-white text-center font-medium`}>
                Add Customer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
  // Edit Customer Modal
  const renderEditModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={editModalVisible}
      onRequestClose={() => setEditModalVisible(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1 justify-center px-4`}>
        <View style={tw`bg-white rounded-lg p-6 shadow-lg mx-2`}>
          <Text style={tw`text-xl font-bold mb-4 text-center text-gray-800`}>
            Edit Customer
          </Text>

          <Text style={tw`text-gray-700 font-medium mb-1`}>Customer Name</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
            placeholder="Enter customer name"
            value={editingCustomer?.customer_name || ''}
            onChangeText={text => {
              if (editingCustomer) {
                setEditingCustomer({...editingCustomer, customer_name: text});
              }
            }}
          />

          <Text style={tw`text-gray-700 font-medium mb-1`}>Email</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
            placeholder="Enter customer email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={editingCustomer?.email || ''}
            onChangeText={text => {
              if (editingCustomer) {
                setEditingCustomer({...editingCustomer, email: text});
              }
            }}
          />

          <Text style={tw`text-gray-700 font-medium mb-1`}>Phone Number</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-4 text-base`}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            value={editingCustomer?.phone_no_1 || ''}
            onChangeText={text => {
              if (editingCustomer) {
                setEditingCustomer({...editingCustomer, phone_no_1: text});
              }
            }}
          />

          <View style={tw`flex-row justify-between`}>
            <TouchableOpacity
              style={tw`bg-gray-300 py-3 px-5 rounded-lg flex-1 mr-2`}
              onPress={() => setEditModalVisible(false)}>
              <Text style={tw`text-gray-800 text-center font-medium`}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`bg-blue-500 py-3 px-5 rounded-lg flex-1 ml-2`}
              onPress={handleEditCustomer}>
              <Text style={tw`text-white text-center font-medium`}>
                Save Changes
              </Text>
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
          <Text style={tw`ml-6 text-white text-lg font-semibold`}>
            Customer Details
          </Text>
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
            <Text style={tw`text-white text-center font-medium`}>
              Add New Customer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`bg-gray-200 py-2 px-4 rounded-lg ml-2 flex-1`}
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
                <Text style={tw`text-gray-600 text-lg text-center`}>
                  No customers found.
                </Text>
                <Text style={tw`text-gray-500 text-center mt-1`}>
                  Add your first customer by clicking the button above.
                </Text>
              </View>
            ) : (
              <FlatList
                contentContainerStyle={tw`p-4`}
                data={customerData}
                keyExtractor={(item, index) => index.toString()}
                ListHeaderComponent={<ConnectionErrorBanner />}
                renderItem={({item}) => (
                  <View style={tw`bg-white p-4 rounded-lg shadow mb-4`}>
                    <Text style={tw`text-lg font-bold`}>
                      {item.customer_name}
                    </Text>
                    <Text style={tw`text-sm text-gray-700`}>
                      Email: {item.email}
                    </Text>
                    <Text style={tw`text-sm text-gray-700`}>
                      Phone: {item.phone_no_1}
                    </Text>

                    <View style={tw`flex-row mt-2`}>
                      <TouchableOpacity
                        style={tw`bg-blue-500 py-1 px-3 rounded mr-2`}
                        onPress={() => {
                          setEditingCustomer(item);
                          setEditModalVisible(true);
                        }}>
                        <Text style={tw`text-white`}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={tw`bg-red-500 py-1 px-3 rounded`}
                        onPress={() => handleDeleteCustomer(item)}>
                        <Text style={tw`text-white`}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
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
