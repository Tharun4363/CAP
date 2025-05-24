import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import Sidebar from './Sidebar';
import axios from 'axios';
import {API_IP_ADDRESS} from '../../../config';
import Toast from 'react-native-toast-message';
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
          // navigation.navigate('Login');
        }
      } catch (error: any) {
        console.error('Error retrieving customer ID:', error);
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
      console.log(
        'Employee data received:',
        response.data?.length || 'no data',
      );

      if (Array.isArray(response.data)) {
        setEmployeeData(response.data);
      } else {
        console.error('Error: Response is not an array', response.data);
        Toast.show({
          type: 'error',
          text1: 'Data Error',
          text2: 'Invalid data format received',
        });
      }
    } catch (error: any) {
      if (error.message === 'Network Error') {
        setConnectionError(true);
      }
    } finally {
      setRefreshing(false);
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

  // 2. handleAddEmployee function to call POST endpoint
  const handleAddEmployee = async () => {
    if (
      !newEmployee.employee_name ||
      !newEmployee.email ||
      !newEmployee.phone_no_1 ||
      !newEmployee.employee_salary ||
      !newEmployee.id_card_type ||
      !newEmployee.id_card_number
    ) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'All required fields must be filled',
      });
      return;
    }

    try {
      const url = `${API_IP_ADDRESS}/api/v1/employee-by-schema/${schemaName}`;
      console.log('Adding employee at URL:', url);
      console.log('Employee data to add:', newEmployee);

      const response = await api.post(url, newEmployee);
      console.log('Add employee response:', response.data);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Employee added successfully',
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
      fetchEmployeeData(schemaName);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add employee: ' + error.message,
        position: 'bottom',
      });
    }
  };

  // 3. handleEditEmployee function to call PUT endpoint
  const handleEditEmployee = async () => {
    if (
      !editingEmployee?.employee_name ||
      !editingEmployee?.email ||
      !editingEmployee?.phone_no_1 ||
      !editingEmployee?.employee_salary ||
      !editingEmployee?.id_card_type ||
      !editingEmployee?.id_card_number
    ) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'All required fields must be filled',
      });
      return;
    }

    try {
      const url = `${API_IP_ADDRESS}/api/v1/employee-by-schema/${schemaName}/${editingEmployee.emp_id}`;
      console.log('Updating employee at URL:', url);
      console.log('Employee data to update:', editingEmployee);

      const response = await api.put(url, editingEmployee);
      console.log('Update employee response:', response.data);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Employee updated successfully',
      });

      setEditModalVisible(false);
      setEditingEmployee(null);
      fetchEmployeeData(schemaName);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update employee: ' + error.message,
        position: 'bottom',
      });
    }
  };

  // 4. handleDeleteEmployee function to call DELETE endpoint
  const handleDeleteEmployee = (employee: any) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${employee.employee_name}?`,
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
              const url = `${API_IP_ADDRESS}/api/v1/employee-by-schema/${schemaName}/${employee.emp_id}`;
              console.log('Deleting employee at URL:', url);

              const response = await api.delete(url);
              console.log('Delete employee response:', response.data);

              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Employee deleted successfully',
              });

              fetchEmployeeData(schemaName);
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete employee: ' + error.message,
                position: 'bottom',
              });
            }
          },
        },
      ],
    );
  };
  const navigateBack = () => {
    navigation.goBack();
  };
  const ConnectionErrorBanner = () => {
    if (!connectionError) return null;

    return (
      <View style={tw`bg-red-100 p-3 border-l-4 border-red-500`}>
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
        style={tw`flex-1 justify-center items-center bg-white mt-150`}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={tw`mt-4 text-gray-600`}>Loading employee data...</Text>
      </SafeAreaView>
    );
  }

  // Add Employee Modal
  const renderAddModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={addModalVisible}
      onRequestClose={() => setAddModalVisible(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1 justify-center px-4 mt-15`}>
        <View style={tw`bg-white rounded-lg p-6 shadow-lg mx-2`}>
          <Text style={tw`text-xl font-bold mb-4 text-center text-gray-800`}>
            Add New Employee
          </Text>

          <ScrollView style={tw`max-h-96`}>
            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Employee Name*
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter employee name"
              value={newEmployee.employee_name}
              onChangeText={text =>
                setNewEmployee({...newEmployee, employee_name: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Email*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter employee email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newEmployee.email}
              onChangeText={text =>
                setNewEmployee({...newEmployee, email: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Phone Number*
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter primary phone number"
              keyboardType="phone-pad"
              value={newEmployee.phone_no_1}
              onChangeText={text =>
                setNewEmployee({...newEmployee, phone_no_1: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Secondary Phone Number
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter secondary phone number"
              keyboardType="phone-pad"
              value={newEmployee.phone_no_2}
              onChangeText={text =>
                setNewEmployee({...newEmployee, phone_no_2: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Salary*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter employee salary"
              keyboardType="numeric"
              value={newEmployee.employee_salary}
              onChangeText={text =>
                setNewEmployee({...newEmployee, employee_salary: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              ID Card Type*
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter ID card type"
              value={newEmployee.id_card_type}
              onChangeText={text =>
                setNewEmployee({...newEmployee, id_card_type: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              ID Card Number*
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter ID card number"
              value={newEmployee.id_card_number}
              onChangeText={text =>
                setNewEmployee({...newEmployee, id_card_number: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Address</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter address"
              multiline={true}
              numberOfLines={3}
              value={newEmployee.address}
              onChangeText={text =>
                setNewEmployee({...newEmployee, address: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Additional Field 1
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter additional info"
              value={newEmployee.arg1}
              onChangeText={text =>
                setNewEmployee({...newEmployee, arg1: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Additional Field 2
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter additional info"
              value={newEmployee.arg2}
              onChangeText={text =>
                setNewEmployee({...newEmployee, arg2: text})
              }
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Additional Field 3
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-4 text-base`}
              placeholder="Enter additional info"
              value={newEmployee.arg3}
              onChangeText={text =>
                setNewEmployee({...newEmployee, arg3: text})
              }
            />
          </ScrollView>

          <View style={tw`flex-row justify-between mt-2`}>
            <TouchableOpacity
              style={tw`bg-gray-300 py-3 px-5 rounded-lg flex-1 mr-2`}
              onPress={() => setAddModalVisible(false)}>
              <Text style={tw`text-gray-800 text-center font-medium`}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`bg-blue-500 py-3 px-5 rounded-lg flex-1 ml-2`}
              onPress={handleAddEmployee}>
              <Text style={tw`text-white text-center font-medium`}>
                Add Employee
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Edit Employee Modal
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
            Edit Employee
          </Text>

          <ScrollView style={tw`max-h-96`}>
            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Employee Name*
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter employee name"
              value={editingEmployee?.employee_name || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({...editingEmployee, employee_name: text});
                }
              }}
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Email*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter employee email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={editingEmployee?.email || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({...editingEmployee, email: text});
                }
              }}
              editable={false} // Email is typically used as unique identifier, so make it non-editable
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Phone Number*
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter primary phone number"
              keyboardType="phone-pad"
              value={editingEmployee?.phone_no_1 || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({...editingEmployee, phone_no_1: text});
                }
              }}
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Secondary Phone Number
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter secondary phone number"
              keyboardType="phone-pad"
              value={editingEmployee?.phone_no_2 || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({...editingEmployee, phone_no_2: text});
                }
              }}
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Salary*</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter employee salary"
              keyboardType="numeric"
              value={editingEmployee?.employee_salary || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({
                    ...editingEmployee,
                    employee_salary: text,
                  });
                }
              }}
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              ID Card Type*
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter ID card type"
              value={editingEmployee?.id_card_type || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({...editingEmployee, id_card_type: text});
                }
              }}
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              ID Card Number*
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter ID card number"
              value={editingEmployee?.id_card_number || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({
                    ...editingEmployee,
                    id_card_number: text,
                  });
                }
              }}
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>Address</Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter address"
              multiline={true}
              numberOfLines={3}
              value={editingEmployee?.address || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({...editingEmployee, address: text});
                }
              }}
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Additional Field 1
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter additional info"
              value={editingEmployee?.arg1 || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({...editingEmployee, arg1: text});
                }
              }}
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Additional Field 2
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
              placeholder="Enter additional info"
              value={editingEmployee?.arg2 || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({...editingEmployee, arg2: text});
                }
              }}
            />

            <Text style={tw`text-gray-700 font-medium mb-1`}>
              Additional Field 3
            </Text>
            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 mb-4 text-base`}
              placeholder="Enter additional info"
              value={editingEmployee?.arg3 || ''}
              onChangeText={text => {
                if (editingEmployee) {
                  setEditingEmployee({...editingEmployee, arg3: text});
                }
              }}
            />
          </ScrollView>

          <View style={tw`flex-row justify-between mt-2`}>
            <TouchableOpacity
              style={tw`bg-gray-300 py-3 px-5 rounded-lg flex-1 mr-2`}
              onPress={() => setEditModalVisible(false)}>
              <Text style={tw`text-gray-800 text-center font-medium`}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`bg-blue-500 py-3 px-5 rounded-lg flex-1 ml-2`}
              onPress={handleEditEmployee}>
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
      <View style={tw`px-4 pt-20 pb-2 bg-white border-b border-gray-200 mt-15`}>
        <Text style={tw`text-2xl font-bold text-gray-800`}>
          Employee Management
        </Text>
        <Text style={tw`text-gray-600`}>Schema: {schemaName}</Text>
      </View>

      {/* Action Buttons */}
      <View style={tw`flex-row px-4 py-3 bg-white border-b border-gray-200`}>
        <TouchableOpacity
          style={tw`bg-blue-500 py-2 px-4 rounded-lg mr-2 flex-1`}
          onPress={() => setAddModalVisible(true)}>
          <Text style={tw`text-white text-center font-medium`}>
            Add New Employee
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`bg-gray-200 py-2 px-4 rounded-lg ml-2 flex-1`}
          onPress={navigateBack}>
          <Text style={tw`text-gray-800 text-center font-medium`}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Debug Info - Remove in production */}
      <View style={tw`px-4 py-2 bg-gray-100 border-b border-gray-200`}>
        <TouchableOpacity
          style={tw`bg-gray-200 py-1 px-2 rounded mt-1 self-start`}
          onPress={() => fetchEmployeeData(schemaName)}>
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
          <Text style={tw`text-gray-600 text-lg text-center`}>
            No employees found.
          </Text>
          <Text style={tw`text-gray-500 text-center mt-1`}>
            Add your first employee by clicking the button above.
          </Text>
        </View>
      ) : (
        <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-6`}>
          <View style={{marginTop: isMobile ? 60 : 0, paddingHorizontal: 16}}>
            <Text style={tw`text-2xl font-semibold text-gray-800 mb-4`}>
              Employee Details
            </Text>
            <Text style={tw`text-base text-gray-700`}>
              Customer ID: {schemaName ?? 'Loading...'}
            </Text>
          </View>

          {employeeData.map((employee, index) => (
            <View
              key={index}
              style={tw`bg-white mx-4 my-2 p-4 rounded-lg shadow-sm border border-gray-100`}>
              <View style={tw`flex-row justify-between items-center mb-2`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>
                  {employee.employee_name}
                </Text>
                <View style={tw`flex-row`}>
                  <TouchableOpacity
                    style={tw`bg-blue-100 p-2 rounded-lg mr-2`}
                    onPress={() => {
                      setEditingEmployee(employee);
                      setEditModalVisible(true);
                    }}>
                    <Text style={tw`text-blue-600 font-medium`}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={tw`bg-red-100 p-2 rounded-lg`}
                    onPress={() => handleDeleteEmployee(employee)}>
                    <Text style={tw`text-red-600 font-medium`}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={tw`flex-row items-center mb-1`}>
                <Text style={tw`text-gray-500 w-20`}>Email:</Text>
                <Text style={tw`text-gray-700 flex-1`}>{employee.email}</Text>
              </View>

              <View style={tw`flex-row items-center mb-1`}>
                <Text style={tw`text-gray-500 w-20`}>Phone:</Text>
                <Text style={tw`text-gray-700 flex-1`}>
                  {employee.phone_no_1}
                </Text>
              </View>

              <View style={tw`flex-row items-center mb-1`}>
                <Text style={tw`text-gray-500 w-20`}>ID Type:</Text>
                <Text style={tw`text-gray-700 flex-1`}>
                  {employee.id_card_type}
                </Text>
              </View>

              <View style={tw`flex-row items-center mb-1`}>
                <Text style={tw`text-gray-500 w-20`}>ID Number:</Text>
                <Text style={tw`text-gray-700 flex-1`}>
                  {employee.id_card_number}
                </Text>
              </View>

              <View style={tw`flex-row items-center`}>
                <Text style={tw`text-gray-500 w-20`}>Salary:</Text>
                <Text style={tw`text-gray-700 flex-1`}>
                  {employee.employee_salary}
                </Text>
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
