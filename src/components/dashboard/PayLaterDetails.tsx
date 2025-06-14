import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import Sidebar from './Sidebar';
import { StatusBar } from 'react-native';
import { API_IP_ADDRESS } from '../../../config';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';

// Create a configured axios instance with timeout and retry logic
const api = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Add request interceptor for logging
api.interceptors.request.use(request => {
  console.log('Starting Request:', request.method, request.url, JSON.stringify(request.data, null, 2));
  return request;
});

// Add response interceptor for logging
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
    phone_no: string;
    phone2: string;
    email: string;
    purchased_item: string;
    purchased_date: string;
    total_amount: string;
    amount_paid: string;
    amount_due: string;
    pay_status: string;
    arg1: string;
    arg2: string;
    arg3: string;
  } | null>(null);

  // Form states
  const [newPayLater, setNewPayLater] = useState({
    customer_name: '',
    phone_no: '',
    phone2: '',
    email: '',
    purchased_item: '',
    purchased_date: new Date().toISOString().split('T')[0],
    total_amount: '',
    amount_paid: '',
    amount_due: '',
    pay_status: 'Pending',
    arg1: '',
    arg2: '',
    arg3: '',
  });

  // Error states for add modal
  const [addErrors, setAddErrors] = useState<{
    customer_name: string | null;
    phone_no: string | null;
    phone2: string | null;
    email: string | null;
    purchased_item: string | null;
    purchased_date: string | null;
    total_amount: string | null;
    amount_paid: string | null;
    amount_due: string | null;
    pay_status: string | null;
    arg1: string | null;
    arg2: string | null;
    arg3: string | null;
  }>({
    customer_name: null,
    phone_no: null,
    phone2: null,
    email: null,
    purchased_item: null,
    purchased_date: null,
    total_amount: null,
    amount_paid: null,
    amount_due: null,
    pay_status: null,
    arg1: null,
    arg2: null,
    arg3: null,
  });

  // Error states for edit modal
  const [editErrors, setEditErrors] = useState<{
    customer_name: string | null;
    phone_no: string | null;
    phone2: string | null;
    email: string | null;
    purchased_item: string | null;
    purchased_date: string | null;
    total_amount: string | null;
    amount_paid: string | null;
    amount_due: string | null;
    pay_status: string | null;
    arg1: string | null;
    arg2: string | null;
    arg3: string | null;
  }>({
    customer_name: null,
    phone_no: null,
    phone2: null,
    email: null,
    purchased_item: null,
    purchased_date: null,
    total_amount: null,
    amount_paid: null,
    amount_due: null,
    pay_status: null,
    arg1: null,
    arg2: null,
    arg3: null,
  });

  // Validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{10}$/;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  // Validation functions
  const validateCustomerName = (value: string): string | null => {
    if (!value.trim()) return 'Customer name is required';
    if (value.length > 100) return 'Customer name cannot exceed 100 characters';
    return null;
  };

  const validateEmail = (value: string): string | null => {
    if (!value.trim()) return 'Email is required';
    if (!emailRegex.test(value.trim())) return 'Please enter a valid email address';
    if (value.length > 255) return 'Email cannot exceed 255 characters';
    return null;
  };

  const validatePhoneNo = (value: string): string | null => {
    if (!value.trim()) return 'Phone number is required';
    if (!phoneRegex.test(value.trim())) return 'Phone number must be exactly 10 digits';
    return null;
  };

  const validatePhone2 = (value: string): string | null => {
    if (value && !phoneRegex.test(value.trim())) return 'Secondary phone number must be exactly 10 digits';
    return null;
  };

  const validatePurchasedItem = (value: string): string | null => {
    if (!value.trim()) return 'Purchased item is required';
    if (value.length > 200) return 'Purchased item cannot exceed 200 characters';
    return null;
  };

  const validatePurchasedDate = (value: string): string | null => {
    if (value && !dateRegex.test(value)) return 'Invalid date format (use YYYY-MM-DD)';
    if (value) {
      const date = new Date(value);
      if (isNaN(date.getTime()) || date > new Date()) return 'Purchase date must be a valid past or current date';
    }
    return null;
  };

  const validateTotalAmount = (value: string): string | null => {
    if (!value) return 'Total amount is required';
    if (isNaN(parseFloat(value)) || parseFloat(value) <= 0) return 'Total amount must be a positive number';
    if (parseFloat(value) > 9999999999.99) return 'Total amount is too large';
    return null;
  };

  const validateAmountPaid = (value: string, total_amount: string): string | null => {
    if (value) {
      if (isNaN(parseFloat(value)) || parseFloat(value) < 0) return 'Amount paid must be a non-negative number';
      if (total_amount && parseFloat(value) > parseFloat(total_amount)) return 'Amount paid cannot exceed total amount';
      if (parseFloat(value) > 9999999999.99) return 'Amount paid is too large';
    }
    return null;
  };

  const validateAmountDue = (value: string, total_amount: string, amount_paid: string): string | null => {
    if (value) {
      if (isNaN(parseFloat(value)) || parseFloat(value) < 0) return 'Amount due must be a non-negative number';
      if (
        amount_paid &&
        total_amount &&
        Math.abs(parseFloat(value) + parseFloat(amount_paid) - parseFloat(total_amount)) > 0.01
      ) return 'Amount due plus amount paid must equal total amount';
      if (parseFloat(value) > 9999999999.99) return 'Amount due is too large';
    }
    return null;
  };

  const validatePayStatus = (value: string): string | null => {
    if (value && value.length > 50) return 'Payment status cannot exceed 50 characters';
    return null;
  };

  const validateArg1 = (value: string): string | null => {
    if (value && value.length > 255) return 'Additional Info 1 cannot exceed 255 characters';
    return null;
  };

  const validateArg2 = (value: string): string | null => {
    if (value && value.length > 255) return 'Additional Info 2 cannot exceed 255 characters';
    return null;
  };

  const validateArg3 = (value: string): string | null => {
    if (value && value.length > 255) return 'Additional Info 3 cannot exceed 255 characters';
    return null;
  };

  // Log API_IP_ADDRESS on component mount
  useEffect(() => {
    console.log('API_IP_ADDRESS:', API_IP_ADDRESS);
  }, []);

  useEffect(() => {
    const loadCustomerId = async () => {
      try {
        const customerId = await AsyncStorage.getItem('customerId');
        console.log('Retrieved customerId from AsyncStorage:', customerId);

        if (customerId && /^[a-zA-Z0-9_]+$/.test(customerId)) {
          setSchemaName(customerId);
          fetchPayLaterData(customerId);
        } else {
          console.warn('Invalid or missing customer ID in AsyncStorage:', customerId);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Invalid customer ID. Please login again.',
            position: 'bottom',
          });
          navigation.goBack();
        }
      } catch (error: any) {
        console.error('Error retrieving customer ID:', error.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load customer data: ' + error.message,
          position: 'bottom',
        });
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerId();
  }, []);

  const fetchPayLaterData = async (customerId: string) => {
    setRefreshing(true);
    setConnectionError(false);
    const url = `${API_IP_ADDRESS}/api/v1/paylater-by-schema/${customerId}`;
    console.log('Fetching paylater data from URL:', url);

    try {
      const response = await api.get(url);
      console.log('PayLater data received:', response.data?.length || 'no data');

      if (Array.isArray(response.data)) {
        setPayLaterData(response.data.map((item, index) => ({
          ...item,
          uniqueKey: `paylater-${item.email || index}-${index}`,
        })));
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

  const handleApiError = (action: string, error: any) => {
    console.error(`Error ${action}:`, error.message);

    let errorMessage = 'An unknown error occurred while adding PayLater details';

    if (error.message === 'Network Error') {
      errorMessage = 'Cannot connect to server. Please check your internet connection.';
    } else if (error.response) {
      if (error.response.status === 400) {
        errorMessage = error.response.data.error || 'Invalid data provided. Please check all required fields.';
      } else if (error.response.status === 500) {
        errorMessage = error.response.data.error || 'Server error. Please ensure all fields are valid (e.g., unique email, valid numbers, existing customer ID).';
      } else {
        errorMessage = `Server error: ${error.response.status}`;
      }
    } else {
      errorMessage = 'No response from server. Please try again later.';
    }

    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: errorMessage,
      position: 'bottom',
    });
  };

  const handleAddPayLater = async () => {
    console.log('Add Details button pressed. Form state:', JSON.stringify(newPayLater, null, 2));

    // Validate schemaName
    if (!schemaName || !/^[a-zA-Z0-9_]+$/.test(schemaName)) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Invalid customer ID. Please log in again.',
        position: 'bottom',
      });
      navigation.goBack();
      return;
    }

    // Validate form
    const errors = {
      customer_name: validateCustomerName(newPayLater.customer_name),
      email: validateEmail(newPayLater.email),
      phone_no: validatePhoneNo(newPayLater.phone_no),
      phone2: validatePhone2(newPayLater.phone2),
      purchased_item: validatePurchasedItem(newPayLater.purchased_item),
      purchased_date: validatePurchasedDate(newPayLater.purchased_date),
      total_amount: validateTotalAmount(newPayLater.total_amount),
      amount_paid: validateAmountPaid(newPayLater.amount_paid, newPayLater.total_amount),
      amount_due: validateAmountDue(newPayLater.amount_due, newPayLater.total_amount, newPayLater.amount_paid),
      pay_status: validatePayStatus(newPayLater.pay_status),
      arg1: validateArg1(newPayLater.arg1),
      arg2: validateArg2(newPayLater.arg2),
      arg3: validateArg3(newPayLater.arg3),
    };

    setAddErrors(errors);

    if (Object.values(errors).some(error => error !== null)) {
      return;
    }

    try {
      // Prepare payload matching web app
      const payload = {
        customer_name: newPayLater.customer_name.trim(),
        phone_no: newPayLater.phone_no.trim(),
        phone2: newPayLater.phone2?.trim() || '',
        email: newPayLater.email.trim(),
        purchased_item: newPayLater.purchased_item.trim(),
        purchased_date: newPayLater.purchased_date || '',
        total_amount: newPayLater.total_amount ? String(newPayLater.total_amount) : '',
        amount_paid: newPayLater.amount_paid ? String(newPayLater.amount_paid) : '',
        amount_due: newPayLater.amount_due ? String(newPayLater.amount_due) : '',
        pay_status: newPayLater.pay_status || '',
        arg1: newPayLater.arg1?.trim() || '',
        arg2: newPayLater.arg2?.trim() || '',
        arg3: newPayLater.arg3?.trim() || '',
      };

      console.log('PayLater payload:', JSON.stringify(payload, null, 2));
      const url = `${API_IP_ADDRESS}/api/v1/paylater-by-schema/${schemaName}`;

      const response = await api.post(url, payload);
      console.log('Add paylater response:', JSON.stringify(response.data, null, 2));

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'PayLater details added successfully',
        position: 'bottom',
      });

      // Reset form
      setAddModalVisible(false);
      setNewPayLater({
        customer_name: '',
        phone_no: '',
        phone2: '',
        email: '',
        purchased_item: '',
        purchased_date: new Date().toISOString().split('T')[0],
        total_amount: '',
        amount_paid: '',
        amount_due: '',
        pay_status: 'Pending',
        arg1: '',
        arg2: '',
        arg3: '',
      });
      setAddErrors({
        customer_name: null,
        phone_no: null,
        phone2: null,
        email: null,
        purchased_item: null,
        purchased_date: null,
        total_amount: null,
        amount_paid: null,
        amount_due: null,
        pay_status: null,
        arg1: null,
        arg2: null,
        arg3: null,
      });
      fetchPayLaterData(schemaName);
    } catch (error: any) {
      console.error('Error in handleAddPayLater:', error.message);
      handleApiError('adding paylater details', error);
    }
  };

  const handleEditPayLater = async () => {
    if (!editingPayLater) {
      console.log('No payLater data to edit');
      return;
    }

    console.log('Validating edit form:', JSON.stringify(editingPayLater, null, 2));

    // Validate form
    const errors = {
      customer_name: validateCustomerName(editingPayLater.customer_name),
      email: validateEmail(editingPayLater.email),
      phone_no: validatePhoneNo(editingPayLater.phone_no),
      phone2: validatePhone2(editingPayLater.phone2),
      purchased_item: validatePurchasedItem(editingPayLater.purchased_item),
      purchased_date: validatePurchasedDate(editingPayLater.purchased_date),
      total_amount: validateTotalAmount(editingPayLater.total_amount),
      amount_paid: validateAmountPaid(editingPayLater.amount_paid, editingPayLater.total_amount),
      amount_due: validateAmountDue(editingPayLater.amount_due, editingPayLater.total_amount, editingPayLater.amount_paid),
      pay_status: validatePayStatus(editingPayLater.pay_status),
      arg1: validateArg1(editingPayLater.arg1),
      arg2: validateArg2(editingPayLater.arg2),
      arg3: validateArg3(editingPayLater.arg3),
    };

    setEditErrors(errors);

    if (Object.values(errors).some(error => error !== null)) {
      return;
    }

    try {
      const payload = {
        customer_name: editingPayLater.customer_name.trim(),
        phone_no: editingPayLater.phone_no.trim(),
        phone2: editingPayLater.phone2?.trim() || '',
        email: editingPayLater.email.trim(),
        purchased_item: editingPayLater.purchased_item.trim(),
        purchased_date: editingPayLater.purchased_date || '',
        total_amount: editingPayLater.total_amount ? String(editingPayLater.total_amount) : '',
        amount_paid: editingPayLater.amount_paid ? String(editingPayLater.amount_paid) : '',
        amount_due: editingPayLater.amount_due ? String(editingPayLater.amount_due) : '',
        pay_status: editingPayLater.pay_status || '',
        arg1: editingPayLater.arg1?.trim() || '',
        arg2: editingPayLater.arg2?.trim() || '',
        arg3: editingPayLater.arg3?.trim() || '',
      };

      console.log('PayLater update payload:', JSON.stringify(payload, null, 2));
      const url = `${API_IP_ADDRESS}/api/v1/paylater-by-schema/${schemaName}`;

      const response = await api.put(url, payload);
      console.log('Update paylater response:', JSON.stringify(response.data, null, 2));

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'PayLater details updated successfully',
        position: 'bottom',
      });

      setEditModalVisible(false);
      setEditingPayLater(null);
      setEditErrors({
        customer_name: null,
        phone_no: null,
        phone2: null,
        email: null,
        purchased_item: null,
        purchased_date: null,
        total_amount: null,
        amount_paid: null,
        amount_due: null,
        pay_status: null,
        arg1: null,
        arg2: null,
        arg3: null,
      });
      fetchPayLaterData(schemaName);
    } catch (error: any) {
      console.error('Error in handleEditPayLater:', error.message);
      handleApiError('updating paylater details', error);
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

  if (isLoading) {
    return (
      <SafeAreaView
        style={[tw`flex-1 justify-center items-center bg-white`, { marginTop: 150 }]}
      >
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
      onRequestClose={() => {
        setAddModalVisible(false);
        setAddErrors({
          customer_name: null,
          phone_no: null,
          phone2: null,
          email: null,
          purchased_item: null,
          purchased_date: null,
          total_amount: null,
          amount_paid: null,
          amount_due: null,
          pay_status: null,
          arg1: null,
          arg2: null,
          arg3: null,
        });
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1 justify-center px-4 mt-14`}
      >
        <ScrollView>
          <View style={tw`bg-white rounded-lg p-6 shadow-lg mx-2 my-4`}>
            <Text style={tw`text-xl font-bold mb-4 text-center text-gray-800`}>
              Add New PayLater Details
            </Text>

            <Text style={tw`text-gray-700 font-medium mb-1`}>Customer Name</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${addErrors.customer_name ? 'border-red-500' : ''}`}
              placeholder="Enter customer name (max 100 chars)"
              value={newPayLater.customer_name}
              onChangeText={text => {
                setNewPayLater({ ...newPayLater, customer_name: text.slice(0, 100) });
                setAddErrors({ ...addErrors, customer_name: validateCustomerName(text) });
              }}
            />
            {addErrors.customer_name && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{addErrors.customer_name}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Email</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${addErrors.email ? 'border-red-500' : ''}`}
              placeholder="Enter customer email (e.g., user@domain.com)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newPayLater.email}
              onChangeText={text => {
                setNewPayLater({ ...newPayLater, email: text.slice(0, 255) });
                setAddErrors({ ...addErrors, email: validateEmail(text) });
              }}
            />
            {addErrors.email && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{addErrors.email}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Phone Number</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${addErrors.phone_no ? 'border-red-500' : ''}`}
              placeholder="Enter 10-digit phone number"
              keyboardType="phone-pad"
              value={newPayLater.phone_no}
              onChangeText={text => {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                setNewPayLater({ ...newPayLater, phone_no: cleaned });
                setAddErrors({ ...addErrors, phone_no: validatePhoneNo(cleaned) });
              }}
              maxLength={10}
            />
            {addErrors.phone_no && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{addErrors.phone_no}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Secondary Phone Number (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${addErrors.phone2 ? 'border-red-500' : ''}`}
              placeholder="Enter secondary phone number (max 10 digits)"
              keyboardType="phone-pad"
              value={newPayLater.phone2}
              onChangeText={text => {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                setNewPayLater({ ...newPayLater, phone2: cleaned });
                setAddErrors({ ...addErrors, phone2: validatePhone2(cleaned) });
              }}
              maxLength={10}
            />
            {addErrors.phone2 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{addErrors.phone2}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Purchased Item</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${addErrors.purchased_item ? 'border-red-500' : ''}`}
              placeholder="Enter purchased item (max 200 chars)"
              value={newPayLater.purchased_item}
              onChangeText={text => {
                setNewPayLater({ ...newPayLater, purchased_item: text.slice(0, 200) });
                setAddErrors({ ...addErrors, purchased_item: validatePurchasedItem(text) });
              }}
            />
            {addErrors.purchased_item && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{addErrors.purchased_item}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Purchase Date (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${addErrors.purchased_date ? 'border-red-500' : ''}`}
              placeholder="YYYY-MM-DD"
              value={newPayLater.purchased_date}
              onChangeText={text => {
                setNewPayLater({ ...newPayLater, purchased_date: text });
                setAddErrors({ ...addErrors, purchased_date: validatePurchasedDate(text) });
              }}
            />
            {addErrors.purchased_date && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{addErrors.purchased_date}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Total Amount</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${addErrors.total_amount ? 'border-red-500' : ''}`}
              placeholder="Enter total amount (e.g., 1000.00)"
              keyboardType="decimal-pad"
              value={newPayLater.total_amount}
              onChangeText={text => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                if (cleaned.split('.').length <= 2) {
                  setNewPayLater({ ...newPayLater, total_amount: cleaned });
                  setAddErrors({ ...addErrors, total_amount: validateTotalAmount(cleaned) });
                }
              }}
            />
            {addErrors.total_amount && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{addErrors.total_amount}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Amount Paid (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${addErrors.amount_paid ? 'border-red-500' : ''}`}
              placeholder="Enter amount paid (e.g., 500.00)"
              keyboardType="decimal-pad"
              value={newPayLater.amount_paid}
              onChangeText={text => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                if (cleaned.split('.').length <= 2) {
                  setNewPayLater({ ...newPayLater, amount_paid: cleaned });
                  setAddErrors({ ...addErrors, amount_paid: validateAmountPaid(cleaned, newPayLater.total_amount) });
                }
              }}
            />
            {addErrors.amount_paid && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{addErrors.amount_paid}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Amount Due (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${addErrors.amount_due ? 'border-red-500' : ''}`}
              placeholder="Enter amount due (e.g., 500.00)"
              keyboardType="decimal-pad"
              value={newPayLater.amount_due}
              onChangeText={text => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                if (cleaned.split('.').length <= 2) {
                  setNewPayLater({ ...newPayLater, amount_due: cleaned });
                  setAddErrors({ ...addErrors, amount_due: validateAmountDue(cleaned, newPayLater.total_amount, newPayLater.amount_paid) });
                }
              }}
            />
            {addErrors.amount_due && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{addErrors.amount_due}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Payment Status (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${addErrors.pay_status ? 'border-red-500' : ''}`}
              placeholder="Enter payment status (max 50 chars)"
              value={newPayLater.pay_status}
              onChangeText={text => {
                setNewPayLater({ ...newPayLater, pay_status: text.slice(0, 50) });
                setAddErrors({ ...addErrors, pay_status: validatePayStatus(text) });
              }}
            />
            {addErrors.pay_status && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{addErrors.pay_status}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Additional Info 1 (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${addErrors.arg1 ? 'border-red-500' : ''}`}
              placeholder="Enter additional info 1 (max 255 chars)"
              value={newPayLater.arg1}
              onChangeText={text => {
                setNewPayLater({ ...newPayLater, arg1: text.slice(0, 255) });
                setAddErrors({ ...addErrors, arg1: validateArg1(text) });
              }}
            />
            {addErrors.arg1 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{addErrors.arg1}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Additional Info 2 (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${addErrors.arg2 ? 'border-red-500' : ''}`}
              placeholder="Enter additional info 2 (max 255 chars)"
              value={newPayLater.arg2}
              onChangeText={text => {
                setNewPayLater({ ...newPayLater, arg2: text.slice(0, 255) });
                setAddErrors({ ...addErrors, arg2: validateArg2(text) });
              }}
            />
            {addErrors.arg2 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{addErrors.arg2}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Additional Info 3 (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${addErrors.arg3 ? 'border-red-500' : ''}`}
              placeholder="Enter additional info 3 (max 255 chars)"
              value={newPayLater.arg3}
              onChangeText={text => {
                setNewPayLater({ ...newPayLater, arg3: text.slice(0, 255) });
                setAddErrors({ ...addErrors, arg3: validateArg3(text) });
              }}
            />
            {addErrors.arg3 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{addErrors.arg3}</Text>
            )}

            <View style={tw`flex-row justify-between`}>
              <TouchableOpacity
                style={tw`bg-gray-300 py-3 px-5 rounded-lg flex-1 mr-2`}
                onPress={() => {
                  console.log('Cancel button pressed');
                  setAddModalVisible(false);
                  setAddErrors({
                    customer_name: null,
                    phone_no: null,
                    phone2: null,
                    email: null,
                    purchased_item: null,
                    purchased_date: null,
                    total_amount: null,
                    amount_paid: null,
                    amount_due: null,
                    pay_status: null,
                    arg1: null,
                    arg2: null,
                    arg3: null,
                  });
                }}
              >
                <Text style={tw`text-gray-800 text-center font-medium`}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`bg-blue-500 py-3 px-5 rounded-lg flex-1 ml-2`}
                onPress={handleAddPayLater}
              >
                <Text style={tw`text-white text-center font-medium`}>Add Details</Text>
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
      onRequestClose={() => {
        setEditModalVisible(false);
        setEditErrors({
          customer_name: null,
          phone_no: null,
          phone2: null,
          email: null,
          purchased_item: null,
          purchased_date: null,
          total_amount: null,
          amount_paid: null,
          amount_due: null,
          pay_status: null,
          arg1: null,
          arg2: null,
          arg3: null,
        });
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1 justify-center px-4`}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={tw`bg-white rounded-lg p-6 shadow-lg mx-2 my-4`}>
            <Text style={tw`text-xl font-bold mb-4 text-center text-gray-800`}>
              Edit PayLater Details
            </Text>

            <Text style={tw`text-gray-700 font-medium mb-1`}>Customer Name</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${editErrors.customer_name ? 'border-red-500' : ''}`}
              placeholder="Enter customer name (max 100 chars)"
              value={editingPayLater?.customer_name || ''}
              onChangeText={text => {
                setEditingPayLater(prev => ({
                  ...prev!,
                  customer_name: text.slice(0, 100),
                }));
                setEditErrors({ ...editErrors, customer_name: validateCustomerName(text) });
              }}
            />
            {editErrors.customer_name && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{editErrors.customer_name}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Email (Cannot be changed)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base bg-gray-100 text-gray-600`}
              value={editingPayLater?.email || ''}
              editable={false}
            />
            <Text style={tw`text-gray-500 text-sm mb-3`}>* Email cannot be changed</Text>

            <Text style={tw`text-gray-700 font-medium mb-1`}>Phone Number</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${editErrors.phone_no ? 'border-red-500' : ''}`}
              placeholder="Enter 10-digit phone number"
              keyboardType="phone-pad"
              value={editingPayLater?.phone_no || ''}
              onChangeText={text => {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                setEditingPayLater(prev => ({
                  ...prev!,
                  phone_no: cleaned,
                }));
                setEditErrors({ ...editErrors, phone_no: validatePhoneNo(cleaned) });
              }}
              maxLength={10}
            />
            {editErrors.phone_no && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{editErrors.phone_no}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Secondary Phone Number (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${editErrors.phone2 ? 'border-red-500' : ''}`}
              placeholder="Enter secondary phone number (max 10 digits)"
              keyboardType="phone-pad"
              value={editingPayLater?.phone2 || ''}
              onChangeText={text => {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                setEditingPayLater(prev => ({
                  ...prev!,
                  phone2: cleaned,
                }));
                setEditErrors({ ...editErrors, phone2: validatePhone2(cleaned) });
              }}
              maxLength={10}
            />
            {editErrors.phone2 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{editErrors.phone2}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Purchased Item</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${editErrors.purchased_item ? 'border-red-500' : ''}`}
              placeholder="Enter purchased item (max 200 chars)"
              value={editingPayLater?.purchased_item || ''}
              onChangeText={text => {
                setEditingPayLater(prev => ({
                  ...prev!,
                  purchased_item: text.slice(0, 200),
                }));
                setEditErrors({ ...editErrors, purchased_item: validatePurchasedItem(text) });
              }}
            />
            {editErrors.purchased_item && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{editErrors.purchased_item}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Purchase Date (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${editErrors.purchased_date ? 'border-red-500' : ''}`}
              placeholder="YYYY-MM-DD"
              value={editingPayLater?.purchased_date || ''}
              onChangeText={text => {
                setEditingPayLater(prev => ({
                  ...prev!,
                  purchased_date: text,
                }));
                setEditErrors({ ...editErrors, purchased_date: validatePurchasedDate(text) });
              }}
            />
            {editErrors.purchased_date && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{editErrors.purchased_date}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Total Amount</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${editErrors.total_amount ? 'border-red-500' : ''}`}
              placeholder="Enter total amount (e.g., 1000.00)"
              keyboardType="decimal-pad"
              value={editingPayLater?.total_amount || ''}
              onChangeText={text => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                if (cleaned.split('.').length <= 2) {
                  setEditingPayLater(prev => ({
                    ...prev!,
                    total_amount: cleaned,
                  }));
                  setEditErrors({ ...editErrors, total_amount: validateTotalAmount(cleaned) });
                }
              }}
            />
            {editErrors.total_amount && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{editErrors.total_amount}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Amount Paid (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${editErrors.amount_paid ? 'border-red-500' : ''}`}
              placeholder="Enter amount paid (e.g., 500.00)"
              keyboardType="decimal-pad"
              value={editingPayLater?.amount_paid || ''}
              onChangeText={text => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                if (cleaned.split('.').length <= 2) {
                  setEditingPayLater(prev => ({
                    ...prev!,
                    amount_paid: cleaned,
                  }));
                  setEditErrors({ ...editErrors, amount_paid: validateAmountPaid(cleaned, editingPayLater?.total_amount || '') });
                }
              }}
            />
            {editErrors.amount_paid && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{editErrors.amount_paid}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Amount Due (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${editErrors.amount_due ? 'border-red-500' : ''}`}
              placeholder="Enter amount due (e.g., 500.00)"
              keyboardType="decimal-pad"
              value={editingPayLater?.amount_due || ''}
              onChangeText={text => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                if (cleaned.split('.').length <= 2) {
                  setEditingPayLater(prev => ({
                    ...prev!,
                    amount_due: cleaned,
                  }));
                  setEditErrors({ ...editErrors, amount_due: validateAmountDue(cleaned, editingPayLater?.total_amount || '', editingPayLater?.amount_paid || '') });
                }
              }}
            />
            {editErrors.amount_due && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{editErrors.amount_due}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Payment Status (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${editErrors.pay_status ? 'border-red-500' : ''}`}
              placeholder="Enter payment status (max 50 chars)"
              value={editingPayLater?.pay_status || ''}
              onChangeText={text => {
                setEditingPayLater(prev => ({
                  ...prev!,
                  pay_status: text.slice(0, 50),
                }));
                setEditErrors({ ...editErrors, pay_status: validatePayStatus(text) });
              }}
            />
            {editErrors.pay_status && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{editErrors.pay_status}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Additional Info 1 (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${editErrors.arg1 ? 'border-red-500' : ''}`}
              placeholder="Enter additional info 1 (max 255 chars)"
              value={editingPayLater?.arg1 || ''}
              onChangeText={text => {
                setEditingPayLater(prev => ({
                  ...prev!,
                  arg1: text.slice(0, 255),
                }));
                setEditErrors({ ...editErrors, arg1: validateArg1(text) });
              }}
            />
            {editErrors.arg1 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{editErrors.arg1}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Additional Info 2 (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${editErrors.arg2 ? 'border-red-500' : ''}`}
              placeholder="Enter additional info 2 (max 255 chars)"
              value={editingPayLater?.arg2 || ''}
              onChangeText={text => {
                setEditingPayLater(prev => ({
                  ...prev!,
                  arg2: text.slice(0, 255),
                }));
                setEditErrors({ ...editErrors, arg2: validateArg2(text) });
              }}
            />
            {editErrors.arg2 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{editErrors.arg2}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Additional Info 3 (Optional)</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base ${editErrors.arg3 ? 'border-red-500' : ''}`}
              placeholder="Enter additional info 3 (max 255 chars)"
              value={editingPayLater?.arg3 || ''}
              onChangeText={text => {
                setEditingPayLater(prev => ({
                  ...prev!,
                  arg3: text.slice(0, 255),
                }));
                setEditErrors({ ...editErrors, arg3: validateArg3(text) });
              }}
            />
            {editErrors.arg3 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{editErrors.arg3}</Text>
            )}

            <View style={tw`flex-row justify-between`}>
              <TouchableOpacity
                style={tw`bg-gray-300 py-3 px-5 rounded-lg flex-1 mr-2`}
                onPress={() => {
                  console.log('Cancel edit button pressed');
                  setEditModalVisible(false);
                  setEditErrors({
                    customer_name: null,
                    phone_no: null,
                    phone2: null,
                    email: null,
                    purchased_item: null,
                    purchased_date: null,
                    total_amount: null,
                    amount_paid: null,
                    amount_due: null,
                    pay_status: null,
                    arg1: null,
                    arg2: null,
                    arg3: null,
                  });
                }}
              >
                <Text style={tw`text-gray-800 text-center font-medium`}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`bg-blue-500 py-3 px-5 rounded-lg flex-1 ml-2`}
                onPress={handleEditPayLater}
              >
                <Text style={tw`text-white text-center font-medium`}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <View style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" />
      {isMobile && !sidebarVisible && (
        <View style={tw`bg-gray-900 w-full absolute top-0 z-20 flex-row items-center py-4 px-4`}>
          <TouchableOpacity
            onPress={toggleSidebar}
            style={tw`bg-gray-800 p-2 rounded`}
          >
            <MaterialIcons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`ml-4 text-white text-lg font-semibold`}>Pay Later Details</Text>
        </View>
      )}

      <Sidebar
        isMobile={isMobile}
        sidebarVisible={sidebarVisible}
        toggleSidebar={toggleSidebar}
      />

      <ScrollView
        contentContainerStyle={tw`p-6`}
        style={tw`flex-1 ${isMobile ? 'mt-16' : ''}`}
      >
        <Text style={tw`text-base text-gray-700 mb-4`}>
          Customer ID: {schemaName ?? 'Loading...'}
        </Text>
        {/* Action Buttons */}
        <View style={tw`flex-row px-4 py-3 bg-white border-b border-gray-200`}>
          <TouchableOpacity
            style={tw`bg-blue-500 py-2 px-4 rounded-lg mr-2 flex-1`}
            onPress={() => {
              console.log('Add New PayLater button pressed');
              setAddModalVisible(true);
            }}
          >
            <Text style={tw`text-white text-center font-medium`}>Add New PayLater</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`bg-gray-200 py-2 px-4 rounded-lg ml-2 flex-1 items-center justify-center`}
            onPress={() => {
              console.log('Back button pressed');
              navigation.goBack();
            }}
          >
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
          <View style={tw`flex-1`}>
            {payLaterData.map((payLater) => (
              <View
                key={payLater.uniqueKey}
                style={tw`bg-white mx-4 my-2 p-4 rounded-lg shadow-sm border border-gray-100`}
              >
                <View style={tw`flex-row justify-between items-center mb-2`}>
                  <Text style={tw`text-lg font-bold text-gray-800`}>
                    {payLater.customer_name}
                  </Text>
                  <View style={tw`flex-row`}>
                    <TouchableOpacity
                      style={tw`bg-blue-100 p-2 rounded-lg`}
                      onPress={() => {
                        console.log('Edit button pressed for:', payLater);
                        setEditingPayLater({
                          customer_name: payLater.customer_name || '',
                          phone_no: payLater.phone_no || '',
                          phone2: payLater.phone2 || '',
                          email: payLater.email || '',
                          purchased_item: payLater.purchased_item || '',
                          purchased_date: payLater.purchased_date || '',
                          total_amount: String(payLater.total_amount || ''),
                          amount_paid: String(payLater.amount_paid || ''),
                          amount_due: String(payLater.amount_due || ''),
                          pay_status: payLater.pay_status || '',
                          arg1: payLater.arg1 || '',
                          arg2: payLater.arg2 || '',
                          arg3: payLater.arg3 || '',
                        });
                        setEditModalVisible(true);
                      }}
                    >
                      <Text style={tw`text-blue-600 font-medium`}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={tw`flex-row items-center mb-1`}>
                  <Text style={tw`text-gray-500 w-28`}>Email:</Text>
                  <Text style={tw`text-gray-700 flex-1`}>{payLater.email}</Text>
                </View>

                <View style={tw`flex-row items-center mb-1`}>
                  <Text style={tw`text-gray-500 w-28`}>Phone:</Text>
                  <Text style={tw`text-gray-700 flex-1`}>{payLater.phone_no}</Text>
                </View>

                <View style={tw`flex-row items-center mb-1`}>
                  <Text style={tw`text-gray-500 w-28`}>Purchased Item:</Text>
                  <Text style={tw`text-gray-700 flex-1`}>{payLater.purchased_item}</Text>
                </View>

                <View style={tw`flex-row items-center mb-1 bg-gray-50 p-1 rounded`}>
                  <Text style={tw`text-gray-500 w-28`}>Total Amount:</Text>
                  <Text style={tw`text-gray-700 flex-1 font-medium`}>
                    {payLater.total_amount} IND
                  </Text>
                </View>

                <View style={tw`flex-row items-center mb-1 bg-green-50 p-1 rounded`}>
                  <Text style={tw`text-gray-500 w-28`}>Amount Paid:</Text>
                  <Text style={tw`text-green-700 flex-1 font-medium`}>
                    {payLater.amount_paid || 0} IND
                  </Text>
                </View>

                <View style={tw`flex-row items-center bg-red-50 p-1 rounded`}>
                  <Text style={tw`text-gray-500 w-28`}>Amount Due:</Text>
                  <Text style={tw`text-red-700 flex-1 font-medium`}>
                    {payLater.amount_due || 0} IND
                  </Text>
                </View>
              </View>
            ))}
            <View style={tw`h-4`} />
          </View>
        )}
      </ScrollView>
      {renderAddModal()}
      {renderEditModal()}
      <Toast />
    </View>
  );
};

export default PayLaterDetails;