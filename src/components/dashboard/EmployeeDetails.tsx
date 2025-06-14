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
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import axios from 'axios';
import { API_IP_ADDRESS } from '../../../config';
import Toast from 'react-native-toast-message';
import Sidebar from './Sidebar';
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

const EmployeeDetails: React.FC = () => {
  const navigation = useNavigation();
  const [custId, setCustId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [schemaName, setSchemaName] = useState('');
  const [employeeData, setEmployeeData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Form states
  const [newEmployee, setNewEmployee] = useState({
    employee_name: '',
    email: '',
    phone_no_1: '',
    phone_no_2: '',
    employee_salary: '',
    id_card_type: '',
    id_card_number: '',
    address: '',
    arg1: '',
    arg2: '',
    arg3: '',
  });

  // Error states for inline validation messages
  const [errors, setErrors] = useState({
    employee_name: null as string | null,
    email: null as string | null,
    phone_no_1: null as string | null,
    phone_no_2: null as string | null,
    employee_salary: null as string | null,
    id_card_type: null as string | null,
    id_card_number: null as string | null,
    address: null as string | null,
    arg1: null as string | null,
    arg2: null as string | null,
    arg3: null as string | null,
  });

  interface Employee {
    employee_name: string;
    email: string;
    phone_no_1: string;
    phone_no_2?: string;
    employee_salary: string;
    id_card_type: string;
    id_card_number: string;
    address?: string;
    arg1?: string;
    arg2?: string;
    arg3?: string;
    emp_id?: string;
  }

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Log API_IP_ADDRESS on component mount
  useEffect(() => {
    console.log('API_IP_ADDRESS:', API_IP_ADDRESS);
  }, []);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  useEffect(() => {
    const loadCustomerId = async () => {
      try {
        const customerId = await AsyncStorage.getItem('customerId');
        console.log('Retrieved customerId from AsyncStorage:', customerId);

        if (customerId) {
          setSchemaName(customerId);
          fetchEmployeeData(customerId);
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
        console.error('Error retrieving customer ID:', error.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load employee data: ' + error.message,
          position: 'bottom',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerId();
  }, []);

  const fetchEmployeeData = async (customerId: string) => {
    setRefreshing(true);
    setConnectionError(false);
    const url = `${API_IP_ADDRESS}/api/v1/employee-by-schema/${customerId}`;
    console.log('Fetching data from URL:', url);

    try {
      const response = await api.get(url);
      console.log('Employee data received:', response.data?.length || 'no data');

      if (Array.isArray(response.data)) {
        setEmployeeData(response.data);
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
  if (error.response?.status === 404) {
    console.log('No employee data found.');
    setEmployeeData([]); // handled gracefully
  } else {
    console.error('Error fetching employee data:', error.message);

    if (error.message === 'Network Error') {
      setConnectionError(true);
    }

    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to fetch employee data: ' + error.message,
      position: 'bottom',
    });
  }
} finally {
  setRefreshing(false);
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

  const validateForm = (form: typeof newEmployee, isEdit: boolean = false) => {
    console.log('Validating form:', JSON.stringify(form, null, 2));
    const newErrors: typeof errors = {
      employee_name: null,
      email: null,
      phone_no_1: null,
      phone_no_2: null,
      employee_salary: null,
      id_card_type: null,
      id_card_number: null,
      address: null,
      arg1: null,
      arg2: null,
      arg3: null,
    };

    // employee_name: Required, 2-50 characters, letters and spaces
    const trimmedName = form.employee_name.trim();
    if (!trimmedName) {
      newErrors.employee_name = 'Employee name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(trimmedName)) {
      newErrors.employee_name = 'Name must contain only letters and spaces';
    } else if (trimmedName.length < 2 || trimmedName.length > 50) {
      newErrors.employee_name = 'Name must be 2-50 characters';
    }

    // email: Required, valid format, max 100, unique (for add modal)
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!isEdit) {
      if (!trimmedEmail) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        newErrors.email = 'Invalid email format';
      } else if (trimmedEmail.length > 100) {
        newErrors.email = 'Email cannot exceed 100 characters';
      } else if (employeeData.some(emp => emp.email.toLowerCase() === trimmedEmail)) {
        newErrors.email = 'Email must be unique';
      }
    }

    // phone_no_1: Required, 10 digits, optional country code
    const trimmedPhone1 = form.phone_no_1.trim();
    if (!trimmedPhone1) {
      newErrors.phone_no_1 = 'Primary phone number is required';
    } else if (!/^\+?\d{10,15}$/.test(trimmedPhone1.replace(/\s/g, ''))) {
      newErrors.phone_no_1 = 'Phone number must be 10 digits';
    }

    // phone_no_2: Optional, same format if provided
    const trimmedPhone2 = form.phone_no_2.trim();
    if (trimmedPhone2 && !/^\+?\d{10,15}$/.test(trimmedPhone2.replace(/\s/g, ''))) {
      newErrors.phone_no_2 = 'Secondary phone number must be 10 digits';
    }

    // employee_salary: Required, positive number, max 10 digits
    const salary = form.employee_salary.trim();
    if (!salary) {
      newErrors.employee_salary = 'Salary is required';
    } else if (!/^\d+(\.\d{1,2})?$/.test(salary) || parseFloat(salary) <= 0) {
      newErrors.employee_salary = 'Salary must be a positive number';
    } else if (salary.replace('.', '').length > 10) {
      newErrors.employee_salary = 'Salary cannot exceed 10 digits';
    }

    // id_card_type: Required, 2-50 characters, letters and spaces
    const trimmedIdType = form.id_card_type.trim();
    if (!trimmedIdType) {
      newErrors.id_card_type = 'ID card type is required';
    } else if (!/^[a-zA-Z\s]+$/.test(trimmedIdType)) {
      newErrors.id_card_type = 'ID card type must contain only letters and spaces';
    } else if (trimmedIdType.length < 2 || trimmedIdType.length > 50) {
      newErrors.id_card_type = 'ID card type must be 2-50 characters';
    }

    // id_card_number: Required, 5 characters, alphanumeric
    const trimmedIdNumber = form.id_card_number.trim();
    if (!trimmedIdNumber) {
      newErrors.id_card_number = 'ID card number is required';
    } else if (!/^[a-zA-Z0-9]+$/.test(trimmedIdNumber)) {
      newErrors.id_card_number = 'ID card number must be alphanumeric';
    } 

    // address: Optional, max 500 characters
    if (form.address && form.address.length > 500) {
      newErrors.address = 'Address cannot exceed 500 characters';
    }

    // arg1, arg2, arg3: Optional, max 100 characters
    if (form.arg1 && form.arg1.length > 100) {
      newErrors.arg1 = 'Additional field 1 cannot exceed 100 characters';
    }
    if (form.arg2 && form.arg2.length > 100) {
      newErrors.arg2 = 'Additional field 2 cannot exceed 100 characters';
    }
    if (form.arg3 && form.arg3.length > 100) {
      newErrors.arg3 = 'Additional field 3 cannot exceed 100 characters';
    }

    return newErrors;
  };

  const handleAddEmployee = async () => {
    try {
      console.log('Add Employee button pressed. Form state:', JSON.stringify(newEmployee, null, 2));
      const validationErrors = validateForm(newEmployee);
      setErrors(validationErrors);

      if (Object.values(validationErrors).some(error => error !== null)) {
        console.log('Validation failed:', validationErrors);
        return;
      }

      const url = `${API_IP_ADDRESS}/api/v1/employee-by-schema/${schemaName}`;
      console.log('Adding employee at URL:', url);

      const payload = {
        employee_name: newEmployee.employee_name.trim(),
        email: newEmployee.email.trim().toLowerCase(),
        phone_no_1: newEmployee.phone_no_1.trim(),
        phone_no_2: newEmployee.phone_no_2.trim() || null,
        employee_salary: newEmployee.employee_salary.trim(),
        id_card_type: newEmployee.id_card_type.trim(),
        id_card_number: newEmployee.id_card_number.trim(),
        address: newEmployee.address.trim() || null,
        arg1: newEmployee.arg1.trim() || null,
        arg2: newEmployee.arg2.trim() || null,
        arg3: newEmployee.arg3.trim() || null,
      };

      console.log('Employee payload:', JSON.stringify(payload, null, 2));

      const response = await api.post(url, payload);
      console.log('Add employee response:', JSON.stringify(response.data, null, 2));

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Employee added successfully',
        position: 'bottom',
      });

      setAddModalVisible(false);
      setNewEmployee({
        employee_name: '',
        email: '',
        phone_no_1: '',
        phone_no_2: '',
        employee_salary: '',
        id_card_type: '',
        id_card_number: '',
        address: '',
        arg1: '',
        arg2: '',
        arg3: '',
      });
      setErrors({
        employee_name: null,
        email: null,
        phone_no_1: null,
        phone_no_2: null,
        employee_salary: null,
        id_card_type: null,
        id_card_number: null,
        address: null,
        arg1: null,
        arg2: null,
        arg3: null,
      });
      fetchEmployeeData(schemaName);
    } catch (error: any) {
      console.error('Error in handleAddEmployee:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add employee: ' + error.message,
        position: 'bottom',
      });
    }
  };

  const handleEditEmployee = async () => {
    if (!editingEmployee) {
      console.log('No employee data to edit');
      return;
    }

    try {
      const form = {
        employee_name: editingEmployee.employee_name,
        email: editingEmployee.email,
        phone_no_1: editingEmployee.phone_no_1,
        phone_no_2: editingEmployee.phone_no_2 || '',
        employee_salary: editingEmployee.employee_salary,
        id_card_type: editingEmployee.id_card_type,
        id_card_number: editingEmployee.id_card_number,
        address: editingEmployee.address || '',
        arg1: editingEmployee.arg1 || '',
        arg2: editingEmployee.arg2 || '',
        arg3: editingEmployee.arg3 || '',
      };

      console.log('Validating edit form:', JSON.stringify(form, null, 2));
      const validationErrors = validateForm(form, true);
      setErrors(validationErrors);

      if (Object.values(validationErrors).some(error => error !== null)) {
        console.log('Edit validation failed:', validationErrors);
        return;
      }

      const url = `${API_IP_ADDRESS}/api/v1/employee-by-schema/${schemaName}/${editingEmployee.emp_id}`;
      console.log('Updating employee at URL:', url);

      const payload = {
        employee_name: editingEmployee.employee_name.trim(),
        email: editingEmployee.email.trim().toLowerCase(),
        phone_no_1: editingEmployee.phone_no_1.trim(),
        phone_no_2: editingEmployee.phone_no_2?.trim() || null,
        employee_salary: editingEmployee.employee_salary.trim(),
        id_card_type: editingEmployee.id_card_type.trim(),
        id_card_number: editingEmployee.id_card_number.trim(),
        address: editingEmployee.address?.trim() || null,
        arg1: editingEmployee.arg1?.trim() || null,
        arg2: editingEmployee.arg2?.trim() || null,
        arg3: editingEmployee.arg3?.trim() || null,
      };

      console.log('Employee update payload:', JSON.stringify(payload, null, 2));

      const response = await api.put(url, payload);
      console.log('Update employee response:', JSON.stringify(response.data, null, 2));

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Employee updated successfully',
        position: 'bottom',
      });

      setEditModalVisible(false);
      setEditingEmployee(null);
      setErrors({
        employee_name: null,
        email: null,
        phone_no_1: null,
        phone_no_2: null,
        employee_salary: null,
        id_card_type: null,
        id_card_number: null,
        address: null,
        arg1: null,
        arg2: null,
        arg3: null,
      });
      fetchEmployeeData(schemaName);
    } catch (error: any) {
      console.error('Error in handleEditEmployee:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update employee: ' + error.message,
        position: 'bottom',
      });
    }
  };

  const ConnectionErrorBanner = () => {
    if (!connectionError) return null;

    return (
      <View style={[tw`bg-red-100 p-3 border-l-4 border-red-500`, { marginTop: 150 }]}>
        <Text style={tw`text-red-700 font-medium`}>Connection Error</Text>
        <Text style={tw`text-red-600`}>Unable to connect to the server</Text>
        <TouchableOpacity
          style={tw`bg-red-200 py-1 px-3 rounded-lg self-start mt-1`}
          onPress={() => {
            if (schemaName) {
              fetchEmployeeData(schemaName);
            }
          }}>
          <Text style={tw`text-red-700`}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[tw`flex-1 justify-center items-center bg-white`, { marginTop: 150 }]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={tw`mt-4 text-gray-600`}>Loading employee data...</Text>
      </SafeAreaView>
    );
  }

  const renderAddModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={addModalVisible}
      onRequestClose={() => setAddModalVisible(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[tw`flex-1 justify-center px-4`, { marginTop: 15 }]}>
        <View style={tw`bg-white rounded-lg p-6 shadow-lg mx-2`}>
          <Text style={tw`text-xl font-bold mb-4 text-center text-gray-800`}>
            Add New Employee
          </Text>

          <ScrollView style={tw`max-h-96`}>
            <Text style={tw`text-gray-700 font-medium mb-1`}>Employee Name*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter employee name (e.g., John Doe)"
              value={newEmployee.employee_name}
              onChangeText={text => {
                setNewEmployee({ ...newEmployee, employee_name: text });
                setErrors({ ...errors, employee_name: null });
              }}
              maxLength={50}
            />
            {errors.employee_name && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.employee_name}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Email*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter employee email (e.g., john@example.com)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newEmployee.email}
              onChangeText={text => {
                setNewEmployee({ ...newEmployee, email: text });
                setErrors({ ...errors, email: null });
              }}
              maxLength={100}
            />
            {errors.email && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.email}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Phone Number*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter primary phone number (e.g., +1234567890)"
              keyboardType="phone-pad"
              value={newEmployee.phone_no_1}
              onChangeText={text => {
                setNewEmployee({ ...newEmployee, phone_no_1: text });
                setErrors({ ...errors, phone_no_1: null });
              }}
              maxLength={10}
            />
            {errors.phone_no_1 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.phone_no_1}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Secondary Phone Number</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter secondary phone number (optional)"
              keyboardType="phone-pad"
              value={newEmployee.phone_no_2}
              onChangeText={text => {
                setNewEmployee({ ...newEmployee, phone_no_2: text });
                setErrors({ ...errors, phone_no_2: null });
              }}
              maxLength={10}
            />
            {errors.phone_no_2 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.phone_no_2}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Salary*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter employee salary (e.g., 50000)"
              keyboardType="numeric"
              value={newEmployee.employee_salary}
              onChangeText={text => {
                setNewEmployee({ ...newEmployee, employee_salary: text });
                setErrors({ ...errors, employee_salary: null });
              }}
              maxLength={12} // Allows for 10 digits + decimal + 2 decimals
            />
            {errors.employee_salary && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.employee_salary}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>ID Card Type*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter ID card type (e.g., Passport)"
              value={newEmployee.id_card_type}
              onChangeText={text => {
                setNewEmployee({ ...newEmployee, id_card_type: text });
                setErrors({ ...errors, id_card_type: null });
              }}
              maxLength={50}
            />
            {errors.id_card_type && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.id_card_type}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>ID Card Number*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter ID card number (e.g., ABC12345)"
              value={newEmployee.id_card_number}
              onChangeText={text => {
                setNewEmployee({ ...newEmployee, id_card_number: text });
                setErrors({ ...errors, id_card_number: null });
              }}
              maxLength={20}
            />
            {errors.id_card_number && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.id_card_number}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Address</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter address (optional)"
              multiline={true}
              numberOfLines={3}
              value={newEmployee.address}
              onChangeText={text => {
                setNewEmployee({ ...newEmployee, address: text });
                setErrors({ ...errors, address: null });
              }}
              maxLength={500}
            />
            {errors.address && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.address}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Additional Field 1</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter additional info (optional)"
              value={newEmployee.arg1}
              onChangeText={text => {
                setNewEmployee({ ...newEmployee, arg1: text });
                setErrors({ ...errors, arg1: null });
              }}
              maxLength={100}
            />
            {errors.arg1 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.arg1}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Additional Field 2</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter additional info (optional)"
              value={newEmployee.arg2}
              onChangeText={text => {
                setNewEmployee({ ...newEmployee, arg2: text });
                setErrors({ ...errors, arg2: null });
              }}
              maxLength={100}
            />
            {errors.arg2 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.arg2}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Additional Field 3</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter additional info (optional)"
              value={newEmployee.arg3}
              onChangeText={text => {
                setNewEmployee({ ...newEmployee, arg3: text });
                setErrors({ ...errors, arg3: null });
              }}
              maxLength={100}
            />
            {errors.arg3 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.arg3}</Text>
            )}
          </ScrollView>

          <View style={tw`flex-row justify-between mt-2`}>
            <TouchableOpacity
              style={tw`bg-gray-300 py-3 px-5 rounded-lg flex-1 mr-2 items-center justify-center`}
              onPress={() => {
                console.log('Cancel add employee button pressed');
                setAddModalVisible(false);
                setNewEmployee({
                  employee_name: '',
                  email: '',
                  phone_no_1: '',
                  phone_no_2: '',
                  employee_salary: '',
                  id_card_type: '',
                  id_card_number: '',
                  address: '',
                  arg1: '',
                  arg2: '',
                  arg3: '',
                });
                setErrors({
                  employee_name: null,
                  email: null,
                  phone_no_1: null,
                  phone_no_2: null,
                  employee_salary: null,
                  id_card_type: null,
                  id_card_number: null,
                  address: null,
                  arg1: null,
                  arg2: null,
                  arg3: null,
                });
              }}>
              <Text style={tw`text-gray-800 font-medium`}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`bg-blue-500 py-3 px-5 rounded-lg flex-1 ml-2 items-center justify-center`}
              onPress={() => {
                console.log('Add Employee button triggered');
                handleAddEmployee();
              }}>
              <Text style={tw`text-white font-medium`}>Add Employee</Text>
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
      onRequestClose={() => setEditModalVisible(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[tw`flex-1 justify-center px-4`, { marginTop: 15 }]}>
        <View style={tw`bg-white rounded-lg p-6 shadow-lg mx-2`}>
          <Text style={tw`text-xl font-bold mb-4 text-center text-gray-800`}>
            Edit Employee
          </Text>

          <ScrollView style={tw`max-h-96`}>
            <Text style={tw`text-gray-700 font-medium mb-1`}>Employee Name*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter employee name"
              value={editingEmployee?.employee_name || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({ ...editingEmployee, employee_name: text });
                  setErrors({ ...errors, employee_name: null });
                }
              }}
              maxLength={50}
            />
            {errors.employee_name && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.employee_name}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Email*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base bg-gray-100`}
              value={editingEmployee?.email || ''}
              editable={false}
            />
            {errors.email && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.email}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Phone Number*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter primary phone number"
              keyboardType="phone-pad"
              value={editingEmployee?.phone_no_1 || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({ ...editingEmployee, phone_no_1: text });
                  setErrors({ ...errors, phone_no_1: null });
                }
              }}
              maxLength={10}
            />
            {errors.phone_no_1 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.phone_no_1}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Secondary Phone Number</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter secondary phone number"
              keyboardType="phone-pad"
              value={editingEmployee?.phone_no_2 || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({ ...editingEmployee, phone_no_2: text });
                  setErrors({ ...errors, phone_no_2: null });
                }
              }}
              maxLength={10}
            />
            {errors.phone_no_2 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.phone_no_2}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Salary*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter employee salary"
              keyboardType="numeric"
              value={editingEmployee?.employee_salary || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({ ...editingEmployee, employee_salary: text });
                  setErrors({ ...errors, employee_salary: null });
                }
              }}
              maxLength={12}
            />
            {errors.employee_salary && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.employee_salary}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>ID Card Type*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter ID card type"
              value={editingEmployee?.id_card_type || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({ ...editingEmployee, id_card_type: text });
                  setErrors({ ...errors, id_card_type: null });
                }
              }}
              maxLength={50}
            />
            {errors.id_card_type && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.id_card_type}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>ID Card Number*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter ID card number"
              value={editingEmployee?.id_card_number || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({ ...editingEmployee, id_card_number: text });
                  setErrors({ ...errors, id_card_number: null });
                }
              }}
              maxLength={20}
            />
            {errors.id_card_number && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.id_card_number}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Address</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter address"
              multiline={true}
              numberOfLines={3}
              value={editingEmployee?.address || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({ ...editingEmployee, address: text });
                  setErrors({ ...errors, address: null });
                }
              }}
              maxLength={500}
            />
            {errors.address && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.address}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Additional Field 1</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter additional info"
              value={editingEmployee?.arg1 || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({ ...editingEmployee, arg1: text });
                  setErrors({ ...errors, arg1: null });
                }
              }}
              maxLength={100}
            />
            {errors.arg1 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.arg1}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Additional Field 2</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter additional info"
              value={editingEmployee?.arg2 || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({ ...editingEmployee, arg2: text });
                  setErrors({ ...errors, arg2: null });
                }
              }}
              maxLength={100}
            />
            {errors.arg2 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.arg2}</Text>
            )}

            <Text style={tw`text-gray-700 font-medium mb-1`}>Additional Field 3</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-1 text-base`}
              placeholder="Enter additional info"
              value={editingEmployee?.arg3 || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({ ...editingEmployee, arg3: text });
                  setErrors({ ...errors, arg3: null });
                }
              }}
              maxLength={100}
            />
            {errors.arg3 && (
              <Text style={tw`text-red-500 text-sm mb-3`}>{errors.arg3}</Text>
            )}
          </ScrollView>

          <View style={tw`flex-row justify-between mt-2`}>
            <TouchableOpacity
              style={tw`bg-gray-300 py-3 px-5 rounded-lg flex-1 mr-2 items-center justify-center`}
              onPress={() => {
                console.log('Cancel edit employee button pressed');
                setEditModalVisible(false);
                setEditingEmployee(null);
                setErrors({
                  employee_name: null,
                  email: null,
                  phone_no_1: null,
                  phone_no_2: null,
                  employee_salary: null,
                  id_card_type: null,
                  id_card_number: null,
                  address: null,
                  arg1: null,
                  arg2: null,
                  arg3: null,
                });
              }}>
              <Text style={tw`text-gray-800 font-medium`}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`bg-blue-500 py-3 px-5 rounded-lg flex-1 ml-2 items-center justify-center`}
              onPress={() => {
                console.log('Save Changes button triggered');
                handleEditEmployee();
              }}>
              <Text style={tw`text-white font-medium`}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <StatusBar barStyle="dark-content" />

      {/* Top Navigation for Mobile */}
      {isMobile && !sidebarVisible && (
        <View
          style={tw`bg-gray-900 w-full absolute top-0 z-20 flex-row items-center py-4 px-4`}>
          <TouchableOpacity
            onPress={toggleSidebar}
            style={tw`bg-gray-800 p-2 rounded`}>
            <MaterialIcons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`ml-4 text-white text-lg font-semibold`}>
            Employee Details
          </Text>
        </View>
      )}

      {/* Sidebar */}
      <Sidebar
        isMobile={isMobile}
        sidebarVisible={sidebarVisible}
        toggleSidebar={toggleSidebar}
      />

      {/* Connection Error Banner */}
      <ConnectionErrorBanner />

      {/* Header */}
      <View style={[tw`px-4 pt-20 pb-2 bg-white border-b border-gray-200`, { marginTop: 15 }]}>
        <Text style={tw`text-2xl font-bold text-gray-800`}>Employee Management</Text>
        <Text style={tw`text-gray-600`}>Schema: {schemaName}</Text>
      </View>

      {/* Action Buttons */}
      <View style={tw`flex-row px-4 py-3 bg-white border-b border-gray-200`}>
        <TouchableOpacity
          style={tw`bg-blue-500 py-2 px-4 rounded-lg mr-2 flex-1 items-center justify-center`}
          onPress={() => {
            console.log('Add New Employee button pressed');
            setAddModalVisible(true);
          }}>
          <Text style={tw`text-white font-medium`}>Add New Employee</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`bg-gray-200 py-2 px-4 rounded-lg ml-2 flex-1 items-center justify-center`}
          onPress={() => {
            console.log('Back button pressed');
            navigation.goBack();
          }}>
          <Text style={tw`text-gray-800 font-medium`}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Debug Info - Remove in production */}
      <View style={tw`px-4 py-2 bg-gray-100 border-b border-gray-200`}>
        <TouchableOpacity
          style={tw`bg-gray-200 py-1 px-2 rounded mt-1 self-start`}
          onPress={() => {
            console.log('Refresh Data button pressed');
            fetchEmployeeData(schemaName);
          }}>
          <Text style={tw`text-xs`}>Refresh Data</Text>
        </TouchableOpacity>
      </View>

      {/* Employee Content */}
      {refreshing ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : employeeData.length === 0 ? (
        <View style={tw`flex-1 justify-center items-center p-4`}>
          <Text style={tw`text-gray-600 text-lg text-center`}>No employees found.</Text>
          <Text style={tw`text-gray-500 text-center mt-1`}>
            Add your first employee by clicking the button above.
          </Text>
        </View>
      ) : (
        <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-6`}>
          <View style={{ marginTop: isMobile ? 60 : 0, paddingHorizontal: 16 }}>
            <Text style={tw`text-2xl font-semibold text-gray-800 mb-4`}>Employee Details</Text>
            <Text style={tw`text-base text-gray-700`}>Customer ID: {schemaName ?? 'Loading...'}</Text>
          </View>

          {employeeData.map((employee, index) => (
            <View
              key={index}
              style={tw`bg-white mx-4 my-2 p-4 rounded-lg shadow-sm border border-gray-100`}>
              <View style={tw`flex-row justify-between items-center mb-2`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>{employee.employee_name}</Text>
                <View style={tw`flex-row`}>
                  <TouchableOpacity
                    style={tw`bg-blue-100 p-2 rounded-lg mr-2`}
                    onPress={() => {
                      console.log('Edit button pressed for:', employee);
                      setEditingEmployee(employee);
                      setEditModalVisible(true);
                    }}>
                    <Text style={tw`text-blue-600 font-medium`}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={tw`flex-row items-center mb-1`}>
                <Text style={tw`text-gray-500 w-20`}>Email:</Text>
                <Text style={tw`text-gray-700 flex-1`}>{employee.email}</Text>
              </View>

              <View style={tw`flex-row items-center mb-1`}>
                <Text style={tw`text-gray-500 w-20`}>Phone:</Text>
                <Text style={tw`text-gray-700 flex-1`}>{employee.phone_no_1}</Text>
              </View>

              <View style={tw`flex-row items-center mb-1`}>
                <Text style={tw`text-gray-500 w-20`}>ID Type:</Text>
                <Text style={tw`text-gray-700 flex-1`}>{employee.id_card_type}</Text>
              </View>

              <View style={tw`flex-row items-center mb-1`}>
                <Text style={tw`text-gray-500 w-20`}>ID Number:</Text>
                <Text style={tw`text-gray-700 flex-1`}>{employee.id_card_number}</Text>
              </View>

              <View style={tw`flex-row items-center`}>
                <Text style={tw`text-gray-500 w-20`}>Salary:</Text>
                <Text style={tw`text-gray-700 flex-1`}>{employee.employee_salary}</Text>
              </View>
            </View>
          ))}
          <View style={tw`h-4`} />
        </ScrollView>
      )}

      {renderAddModal()}
      {renderEditModal()}
      <Toast />
    </SafeAreaView>
  );
};

export default EmployeeDetails;