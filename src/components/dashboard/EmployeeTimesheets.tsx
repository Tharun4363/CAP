import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StyleSheet,
  TextInput,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import Sidebar from './Sidebar';
import {API_IP_ADDRESS} from '../../../config';
import axios from 'axios';
import {format} from 'date-fns';
import Toast from 'react-native-toast-message';

// Create a configured axios instance with timeout and retry logic
const api = axios.create({
  baseURL: API_IP_ADDRESS,
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
const EmployeeTimesheets: React.FC = () => {
  const navigation = useNavigation();
  const [custId, setCustId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [schemaName, setSchemaName] = useState('');
  const [timesheetData, setTimesheetData] = useState<any[]>([]);
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);
  // Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Form states
  const [newTimesheet, setNewTimesheet] = useState({
    emp_id: '',
    work_date: format(new Date(), 'yyyy-MM-dd'),
    work_hrs: '8',
    attendance_flag: 'Y',
    description: '',
    arg1: '',
    arg2: '',
    arg3: '',
  });

  const [editingTimesheet, setEditingTimesheet] = useState(null);

  useEffect(() => {
    const loadCustomerId = async () => {
      try {
        const customerId = await AsyncStorage.getItem('customerId');
        console.log('Retrieved customerId from AsyncStorage:', customerId);

        if (customerId) {
          setSchemaName(customerId);
          await fetchEmployeeNames(customerId);
          await fetchTimesheetData(customerId);
        } else {
          console.warn('Customer ID not found in AsyncStorage');
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Customer ID not found. Please login again.',
          });
          // navigation.navigate('Login');
        }
      } catch (error: any) {
        console.error('Error retrieving customer ID:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load data: ' + error.message,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerId();
  }, []);
  // Fetch employee names
  const fetchEmployeeNames = async (customerId = schemaName) => {
    setConnectionError(false);
    try {
      const response = await api.get(
        `/api/v1/employee-names-by-schema/${customerId}`,
      );
      console.log('Employee names fetched:', response.data);

      if (Array.isArray(response.data)) {
        setEmployeeNames(response.data);
      } else {
        throw new Error('Invalid employee names data format');
      }
    } catch (error: any) {
      handleApiError('fetching employee names', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
      }
    }
  };

  const fetchTimesheetData = async (customerId = schemaName) => {
    setRefreshing(true);
    setConnectionError(false);
    try {
      const response = await api.get(
        `/api/v1/timesheets-by-schema/${customerId}`,
      );
      console.log('Timesheet data received:', response.data || 'no data');

      if (Array.isArray(response.data)) {
        setTimesheetData(response.data);
      } else {
        console.error('Error: Response is not an array', response.data);
        Toast.show({
          type: 'error',
          text1: 'Data Error',
          text2: 'Invalid data format received',
        });
      }
    } catch (error: any) {
      handleApiError('fetching timesheet data', error);
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
    });
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
            Timesheet Data
          </Text>
        </View>
      )}

      <Sidebar
        isMobile={isMobile}
        sidebarVisible={sidebarVisible}
        toggleSidebar={toggleSidebar}
      />

      <ScrollView
        contentContainerStyle={tw`p-4`}
        style={{marginTop: isMobile ? 60 : 0}}>
        <Text style={tw`text-2xl font-semibold text-gray-800 mb-2`}>
          Timesheet Data
        </Text>
        <Text style={tw`text-base text-gray-700 mb-4`}>
          Customer ID: {schemaName ?? 'Loading...'}
        </Text>
        {/* <TouchableOpacity
          onPress={() => setIsAddModalVisible(true)}
          style={tw`ml-auto bg-blue-500 p-2 rounded flex-row items-center`}>
          <MaterialIcons name="add" size={20} color="white" />
          <Text style={tw`ml-2 text-white`}>Add Timesheet</Text>
        </TouchableOpacity> */}

        {/* Horizontal Scroll Container */}
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Table Header */}
            <View style={tw`flex-row bg-gray-100 p-3 min-w-full`}>
              <Text style={tw`w-32 font-bold text-gray-700`}>Date</Text>
              <Text style={tw`w-32 font-bold text-gray-700`}>Customer ID</Text>
              <Text style={tw`w-32 font-bold text-gray-700`}>Employee ID</Text>
              <Text style={tw`w-64 font-bold text-gray-700`}>Description</Text>
              <Text style={tw`w-64 font-bold text-gray-700`}>
                Attendance Flag
              </Text>
              <Text style={tw`w-32 font-bold text-gray-700`}>Hours</Text>
              {/* Add more headers if needed */}
            </View>

            {/* Table Rows */}
            {timesheetData.length > 0 ? (
              <FlatList
                data={timesheetData}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                renderItem={({item}) => (
                  <View
                    style={tw`flex-row p-3 border-b border-gray-200 min-w-full`}>
                    <Text style={tw`w-32 text-gray-600`}>
                      {item.work_date.split('T')[0]}
                    </Text>
                    <Text style={tw`w-32 text-gray-600`}>{item.cust_id}</Text>
                    <Text style={tw`w-32 text-gray-600`}>{item.emp_id}</Text>
                    <Text style={tw`w-64 text-gray-600`} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <Text style={tw`w-64 text-gray-600`} numberOfLines={1}>
                      {item.attendance_flag}
                    </Text>
                    <Text style={tw`w-32 text-gray-600`}>{item.work_hrs}</Text>
                    {/* Add more columns if needed */}
                  </View>
                )}
              />
            ) : (
              <View style={tw`p-4 min-w-full`}>
                <Text style={tw`text-gray-500 text-center`}>
                  No timesheet data available
                </Text>
              </View>
            )}

            {/* Summary Row */}
            {timesheetData.length > 0 && (
              <View style={tw`flex-row bg-gray-50 p-3 `}>
                <Text style={tw`w-96 font-bold text-gray-700`}>
                  Total Hours
                </Text>
                <Text style={tw`w-32 font-bold text-gray-700`}>
                  {timesheetData.reduce(
                    (sum, item) => sum + parseFloat(item.work_hrs || 0),
                    0,
                  )}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
};

export default EmployeeTimesheets;
