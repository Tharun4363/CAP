import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import Sidebar from './Sidebar';
import {StatusBar} from 'react-native';
import {API_IP_ADDRESS} from '../../../config';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import {SafeAreaView} from 'react-native-safe-area-context';

// Create a configured axios instance with timeout and retry logic
const api = axios.create({
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Add request interceptor for logging
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

const PayLaterDetails: React.FC = () => {
  const navigation = useNavigation();
  const [schemaName, setSchemaName] = useState('');

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [payLaterData, setPayLaterData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);
  // Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPayLater, setEditingPayLater] = useState<{
    customer_name: string;
    email: string;
    phone_no: string;
    purchased_item: string;
    total_amount: number;
    amount_paid?: number;
    amount_due?: number;
  } | null>(null);

  // Form states
  const [newPayLater, setNewPayLater] = useState({
    customer_name: '',
    email: '',
    phone_no: '',
    purchased_item: '',
    total_amount: '',
    amount_paid: '',
    amount_due: '',
    purchased_date: new Date().toISOString().split('T')[0], // Default to today's date
    pay_status: 'Pending', // Default status
    arg1: '',
    arg2: '',
    arg3: '',
  });

  // Log API_IP_ADDRESS on component mount
  useEffect(() => {
    console.log('API_IP_ADDRESS:', API_IP_ADDRESS);
  }, []);
  useEffect(() => {
    const loadCustomerId = async () => {
      try {
        const customerId = await AsyncStorage.getItem('customerId');
        console.log('Retrieved customerId from AsyncStorage:', customerId);

        if (customerId) {
          setSchemaName(customerId);
          fetchPayLaterData(customerId);
        } else {
          console.warn('Customer ID not found in AsyncStorage');
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Customer ID not found. Please login again.',
            position: 'bottom',
          });
          navigation.goBack();
        }
      } catch (error: any) {
        console.error('Error retrieving customer ID:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',

          text2: 'Failed to load paylater data: ' + error.message,
          position: 'bottom',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerId();
  }, []);

  const fetchPayLaterData = async (customerId: any) => {
    setRefreshing(true);
    setConnectionError(false);
    const url = `${API_IP_ADDRESS}/api/v1/paylater-by-schema/${customerId}`;
    console.log('Fetching paylater data from URL:', url);

    try {
      const response = await api.get(url);
      console.log(
        'PayLater data received:',
        response.data?.length || 'no data',
      );

      // Log the first item to inspect structure if available
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log(
          'First PayLater item structure:',
          JSON.stringify(response.data[0], null, 2),
        );
      }

      if (Array.isArray(response.data)) {
        setPayLaterData(response.data);
      } else {
        console.error('Error: Response is not an array', response.data);
        Toast.show({
          type: 'error',
          text1: 'Data Error',
          text2: 'Invalid data format received',
          position: 'bottom',
        });
      }
    } catch (error: any) {
      handleApiError('fetching paylater data', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
      }
    } finally {
      setRefreshing(false);
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
      } else if (error.response.data && error.response.data.error) {
        errorMessage += ` - ${error.response.data.error}`;
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

  const handleAddPayLater = async () => {
    if (
      !newPayLater.customer_name ||
      !newPayLater.email ||
      !newPayLater.phone_no ||
      !newPayLater.purchased_item ||
      !newPayLater.total_amount
    ) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Required fields must be filled',
        position: 'bottom',
      });
      return;
    }

    try {
      const url = `${API_IP_ADDRESS}/api/v1/paylater-by-schema/${schemaName}`;
      console.log('Adding paylater at URL:', url);
      console.log('PayLater data to add:', newPayLater);

      const response = await api.post(url, newPayLater);
      console.log('Add paylater response:', response.data);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'PayLater details added successfully',
        position: 'bottom',
      });

      setAddModalVisible(false);
      setNewPayLater({
        customer_name: '',
        email: '',
        phone_no: '',
        purchased_item: '',
        total_amount: '',
        amount_paid: '',
        amount_due: '',
        purchased_date: new Date().toISOString().split('T')[0],
        pay_status: 'Pending',
        arg1: '',
        arg2: '',
        arg3: '',
      });
      fetchPayLaterData(schemaName);
    } catch (error) {
      handleApiError('adding paylater details', error);
    }
  };
  const handleEditPayLater = async () => {
    if (
      !editingPayLater?.customer_name ||
      !editingPayLater?.email ||
      !editingPayLater?.phone_no ||
      !editingPayLater?.purchased_item ||
      !editingPayLater?.total_amount
    ) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Required fields must be filled',
        position: 'bottom',
      });
      return;
    }

    try {
      // Note: According to your backend API, updates are based on email
      const url = `${API_IP_ADDRESS}/api/v1/paylater-by-schema/${schemaName}`;
      console.log('Updating paylater at URL:', url);
      console.log('PayLater data to update:', editingPayLater);

      const response = await api.put(url, editingPayLater);
      console.log('Update paylater response:', response.data);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'PayLater details updated successfully',
        position: 'bottom',
      });

      setEditModalVisible(false);
      setEditingPayLater(null);
      fetchPayLaterData(schemaName);
    } catch (error) {
      handleApiError('updating paylater details', error);
    }
  };

  const handleDeletePayLater = (payLater: any) => {
    if (!payLater || !payLater.email) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Email is required for deletion',
        position: 'bottom',
      });
      return;
    }

    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete paylater details for ${payLater.customer_name}?`,
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
              // Using email as the identifier for deletion according to your API
              const url = `${API_IP_ADDRESS}/api/v1/paylater-by-schema/${schemaName}/${payLater.email}`;
              console.log('Deleting paylater at URL:', url);

              const response = await api.delete(url);
              console.log('Delete paylater response:', response.data);

              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'PayLater details deleted successfully',
                position: 'bottom',
              });

              fetchPayLaterData(schemaName);
            } catch (error) {
              handleApiError('deleting paylater details', error);
            }
          },
        },
      ],
    );
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

  if (isLoading) {
    return (
      <SafeAreaView
        style={tw`flex-1 justify-center items-center bg-white mt-150`}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={tw`mt-4 text-gray-600`}>Loading PayLater data...</Text>
      </SafeAreaView>
    );
  }

  // Add PayLater Modal
  const renderAddModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={addModalVisible}
      onRequestClose={() => setAddModalVisible(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1 justify-center px-4 mt-14`}>
        <ScrollView>
          <View style={tw`bg-white rounded-lg p-6 shadow-lg mx-2 my-4`}>
            <Text style={tw`text-xl font-bold mb-4 text-center text-gray-800`}>
              Add New PayLater Details
            </Text>

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Customer Name
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter customer name"
              value={newPayLater.customer_name}
              onChangeText={text =>
                setNewPayLater({...newPayLater, customer_name: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Email</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter customer email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newPayLater.email}
              onChangeText={text =>
                setNewPayLater({...newPayLater, email: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Phone Number</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              value={newPayLater.phone_no}
              onChangeText={text =>
                setNewPayLater({...newPayLater, phone_no: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Purchased Item
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter purchased item"
              value={newPayLater.purchased_item}
              onChangeText={text =>
                setNewPayLater({...newPayLater, purchased_item: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Total Amount</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter total amount"
              keyboardType="numeric"
              value={newPayLater.total_amount}
              onChangeText={text =>
                setNewPayLater({...newPayLater, total_amount: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Amount Paid</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter amount paid"
              keyboardType="numeric"
              value={newPayLater.amount_paid}
              onChangeText={text =>
                setNewPayLater({...newPayLater, amount_paid: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Amount Due</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-4 text-base`}
              placeholder="Enter amount due"
              keyboardType="numeric"
              value={newPayLater.amount_due}
              onChangeText={text =>
                setNewPayLater({...newPayLater, amount_due: text})
              }
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
                onPress={handleAddPayLater}>
                <Text style={tw`text-white text-center font-medium`}>
                  Add Details
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
  // Edit PayLater Modal
  const renderEditModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={editModalVisible}
      onRequestClose={() => setEditModalVisible(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1 justify-center px-4`}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={tw`bg-white rounded-lg p-6 shadow-lg mx-2 my-4`}>
            <Text style={tw`text-xl font-bold mb-4 text-center text-gray-800`}>
              Edit PayLater Details
            </Text>

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Customer Name
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter customer name"
              value={editingPayLater?.customer_name || ''}
              onChangeText={text =>
                setEditingPayLater(prev => ({
                  ...prev!,
                  customer_name: text,
                }))
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Email (Cannot be changed)
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base bg-gray-100`}
              placeholder="Enter customer email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={editingPayLater?.email || ''}
              editable={false} // Email cannot be changed as it's the identifier
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Phone Number</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              value={editingPayLater?.phone_no || ''}
              onChangeText={text =>
                setEditingPayLater(prev => ({
                  ...prev!,
                  phone_no: text,
                }))
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Purchased Item
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter purchased item"
              value={editingPayLater?.purchased_item || ''}
              onChangeText={text =>
                setEditingPayLater(prev => ({
                  ...prev!,
                  purchased_item: text,
                }))
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Total Amount</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter total amount"
              keyboardType="numeric"
              value={String(editingPayLater?.total_amount || '')}
              onChangeText={text =>
                setEditingPayLater(prev => ({
                  ...prev!,
                  total_amount: text ? parseFloat(text) : 0, // Convert to number safely
                }))
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Amount Paid</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter amount paid"
              keyboardType="numeric"
              value={String(editingPayLater?.amount_paid || '')}
              onChangeText={text =>
                setEditingPayLater(prev => ({
                  ...prev!,
                  amount_paid: text ? parseFloat(text) : 0, // Convert to number safely
                }))
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Amount Due</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-4 text-base`}
              placeholder="Enter amount due"
              keyboardType="numeric"
              value={String(editingPayLater?.amount_due || '')}
              onChangeText={text =>
                setEditingPayLater(prev => ({
                  ...prev!,
                  amount_due: text ? parseFloat(text) : 0, // Convert to number safely
                }))
              }
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
                onPress={handleEditPayLater}>
                <Text style={tw`text-white text-center font-medium`}>
                  Save Changes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
            Pay Later Details
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
        <Text style={tw`text-base text-gray-700`}>
          Customer ID: {schemaName ?? 'Loading...'}
        </Text>
        {/* Action Buttons */}
        <View style={tw`flex-row px-4 py-3 bg-white border-b border-gray-200`}>
          <TouchableOpacity
            style={tw`bg-blue-500 py-2 px-4 rounded-lg mr-2 flex-1`}
            onPress={() => setAddModalVisible(true)}>
            <Text style={tw`text-white text-center font-medium`}>
              Add New PayLater
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`bg-gray-200 py-2 px-4 rounded-lg ml-2 flex-1`}
            onPress={navigateBack}>
            <Text style={tw`text-gray-800 text-center font-medium`}>Back</Text>
          </TouchableOpacity>
        </View>
        {/* PayLater List */}
        {refreshing ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        ) : payLaterData.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center p-4`}>
            <Text style={tw`text-gray-600 text-lg text-center`}>
              No PayLater details found.
            </Text>
            <Text style={tw`text-gray-500 text-center mt-1`}>
              Add your first PayLater details by clicking the button above.
            </Text>
          </View>
        ) : (
          <ScrollView style={tw`flex-1`}>
            {payLaterData.map((payLater, index) => (
              <View
                key={index}
                style={tw`bg-white mx-4 my-2 p-4 rounded-lg shadow-sm border border-gray-100`}>
                <View style={tw`flex-row justify-between items-center mb-2`}>
                  <Text style={tw`text-lg font-bold text-gray-800`}>
                    {payLater.customer_name}
                  </Text>
                  <View style={tw`flex-row`}>
                    <TouchableOpacity
                      style={tw`bg-blue-100 p-2 rounded-lg mr-2`}
                      onPress={() => {
                        console.log('Setting editing payLater:', payLater);
                        setEditingPayLater({...payLater});
                        setEditModalVisible(true);
                      }}>
                      <Text style={tw`text-blue-600 font-medium`}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={tw`bg-red-100 p-2 rounded-lg`}
                      onPress={() => handleDeletePayLater(payLater)}>
                      <Text style={tw`text-red-600 font-medium`}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={tw`flex-row items-center mb-1`}>
                  <Text style={tw`text-gray-500 w-28`}>Email:</Text>
                  <Text style={tw`text-gray-700 flex-1`}>{payLater.email}</Text>
                </View>

                <View style={tw`flex-row items-center mb-1`}>
                  <Text style={tw`text-gray-500 w-28`}>Phone:</Text>
                  <Text style={tw`text-gray-700 flex-1`}>
                    {payLater.phone_no}
                  </Text>
                </View>

                <View style={tw`flex-row items-center mb-1`}>
                  <Text style={tw`text-gray-500 w-28`}>Purchased Item:</Text>
                  <Text style={tw`text-gray-700 flex-1`}>
                    {payLater.purchased_item}
                  </Text>
                </View>

                <View
                  style={tw`flex-row items-center mb-1 bg-gray-50 p-1 rounded`}>
                  <Text style={tw`text-gray-500 w-28`}>Total Amount:</Text>
                  <Text style={tw`text-gray-700 flex-1 font-medium`}>
                    {payLater.total_amount} IND
                  </Text>
                </View>

                <View
                  style={tw`flex-row items-center mb-1 bg-green-50 p-1 rounded`}>
                  <Text style={tw`text-gray-500 w-28`}>Amount Paid:</Text>
                  <Text style={tw`text-green-700 flex-1 font-medium`}>
                    {payLater.amount_paid} IND
                  </Text>
                </View>

                <View style={tw`flex-row items-center bg-red-50 p-1 rounded`}>
                  <Text style={tw`text-gray-500 w-28`}>Amount Due:</Text>
                  <Text style={tw`text-red-700 flex-1 font-medium`}>
                    {payLater.amount_due} IND
                  </Text>
                </View>
              </View>
            ))}
            <View style={tw`h-4`} />
          </ScrollView>
        )}
      </ScrollView>
      {renderAddModal()}
      {renderEditModal()}
      <Toast />
    </View>
  );
};

export default PayLaterDetails;
