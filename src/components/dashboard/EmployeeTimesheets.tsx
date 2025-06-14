import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
  FlatList,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import Sidebar from './Sidebar';
import { API_IP_ADDRESS } from '../../../config';
import axios from 'axios';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';

// Configure axios instance
const api = axios.create({
  baseURL: API_IP_ADDRESS,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(request => {
  console.log('Starting Request:', request.method, request.url);
  return request;
});

// Response interceptor for logging
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

// Custom Dropdown Component
const CustomDropdown = ({
  label,
  selectedValue,
  onSelect,
  options,
  placeholder,
}: {
  label: string;
  selectedValue: string;
  onSelect: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={tw`mb-4`}>
      <Text style={tw`text-sm font-semibold mb-2 text-gray-700`}>{label}</Text>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        style={tw`border border-gray-300 rounded p-3 bg-white flex-row items-center justify-between`}>
        <Text style={tw`text-gray-700 text-sm flex-1`}>
          {selectedValue
            ? options.find(opt => opt.value === selectedValue)?.label
            : placeholder}
        </Text>
        <MaterialIcons
          name={isOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
          size={24}
          color="#4A5568"
        />
      </TouchableOpacity>
      {isOpen && (
        <View
          style={tw`absolute top-16 left-0 right-0 bg-white border border-gray-300 rounded shadow-lg z-10 max-h-40`}>
         <ScrollView style={{ maxHeight: 160 }}>
  {options.map(item => (
    <TouchableOpacity
      key={item.value}
      onPress={() => {
        console.log(`${label} selected:`, item.value);
        onSelect(item.value);
        setIsOpen(false);
      }}
      style={tw`p-3 border-b border-gray-200`}>
      <Text style={tw`text-gray-700 text-sm`}>{item.label}</Text>
    </TouchableOpacity>
  ))}
</ScrollView>

        </View>
      )}
    </View>
  );
};

const EmployeeTimesheets: React.FC = () => {
  const navigation = useNavigation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [schemaName, setSchemaName] = useState('');
  const [timesheetData, setTimesheetData] = useState<any[]>([]);
  const [employeeNames, setEmployeeNames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [newTimesheet, setNewTimesheet] = useState({
    emp_id: '' as string | null,
    work_date: format(new Date(), 'yyyy-MM-dd'),
    work_hrs: '8',
    attendance_flag: 'Y' as string | null,
    description: '',
  });

  const attendanceOptions = [
    { label: 'Present', value: 'Y' },
    { label: 'Absent', value: 'N' },
  ];

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

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

  // Fetch timesheet data
  const fetchTimesheetData = async (customerId = schemaName) => {
    setRefreshing(true);
    setConnectionError(false);
    try {
      const response = await api.get(
        `/api/v1/timesheets-by-schema/${customerId}`,
      );
      console.log('Timesheet data received:', response.data || 'no data');
      console.log(
        'Timesheet details:',
        response.data.map((item: { id: any; emp_id: any; work_date: any; }) => ({
          id: item.id,
          emp_id: item.emp_id,
          work_date: item.work_date,
        })),
      );

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

  // Handle adding a new timesheet
  const handleAddNew = async () => {
    const { emp_id, work_date, attendance_flag } = newTimesheet;

    if (!emp_id || !work_date || !attendance_flag) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all required fields.',
      });
      return;
    }

    try {
      await api.post(`/api/v1/timesheets-by-schema/${schemaName}`, {
        emp_id,
        work_date,
        work_hrs: newTimesheet.work_hrs,
        attendance_flag,
        description: newTimesheet.description,
      });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Timesheet added successfully',
      });
      setAddModalVisible(false);
      setNewTimesheet({
        emp_id: '',
        work_date: format(new Date(), 'yyyy-MM-dd'),
        work_hrs: '8',
        attendance_flag: 'Y',
        description: '',
      });
      fetchTimesheetData(schemaName);
    } catch (error: any) {
      handleApiError('adding new timesheet', error);
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
    });
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

  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setCurrentDate(selectedDate);
      setNewTimesheet({
        ...newTimesheet,
        work_date: format(selectedDate, 'yyyy-MM-dd'),
      });
    }
  };

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
        contentContainerStyle={tw`p-4 flex-grow`}
        style={{ marginTop: isMobile ? 60 : 0 }}>
        <Text style={tw`text-2xl font-semibold text-gray-800 mb-2`}>
          Timesheet Data
        </Text>
        <Text style={tw`text-base text-gray-700 mb-4`}>
          Customer ID: {schemaName ?? 'Loading...'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            console.log('Add Timesheet button pressed');
            setAddModalVisible(true);
          }}
          style={tw`bg-blue-500 p-3 rounded flex-row items-center mb-4 self-end`}>
          <MaterialIcons name="add" size={20} color="white" />
          <Text style={tw`ml-2 text-white font-semibold`}>Add New Timesheet</Text>
        </TouchableOpacity>

        {/* Horizontal Scroll Container */}
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Table Header */}
            <View style={tw`flex-row bg-gray-100 p-3 min-w-full`}>
              <Text style={tw`w-32 font-bold text-gray-700`}>Date</Text>
              <Text style={tw`w-32 font-bold text-gray-700`}>Customer ID</Text>
              <Text style={tw`w-32 font-bold text-gray-700`}>Employee ID</Text>
              <Text style={tw`w-64 font-bold text-gray-700`}>Description</Text>
              <Text style={tw`w-64 font-bold text-gray-700`}>Attendance Flag</Text>
              <Text style={tw`w-32 font-bold text-gray-700`}>Hours</Text>
            </View>

            {/* Table Rows */}
            {timesheetData.length > 0 ? (
              <FlatList
                data={timesheetData}
                keyExtractor={(item, index) =>
                  item.id ? item.id.toString() : `${item.emp_id}-${item.work_date}-${index}`
                }
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View
                    style={tw`flex-row p-3 border-b border-gray-200 min-w-full`}>
                    <Text style={tw`w-32 text-gray-600`}>
                      {item.work_date.split('T')[0]}
                    </Text>
                    <Text style={tw`w-32 text-gray-600`}>{item.cust_id}</Text>
                    <Text style={tw`w-32 text-gray-600`}>{item.emp_id}</Text>
                    <Text style={tw`w-64 text-gray-600`} numberOfLines={1}>
                      {item.description || 'N/A'}
                    </Text>
                    <Text style={tw`w-64 text-gray-600`} numberOfLines={1}>
                      {item.attendance_flag === 'Y' ? 'Present' : 'Absent'}
                    </Text>
                    <Text style={tw`w-32 text-gray-600`}>{item.work_hrs}</Text>
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
              <View style={tw`flex-row bg-gray-50 p-3 min-w-full`}>
                <Text style={tw`w-96 font-bold text-gray-700`}>Total Hours</Text>
                <Text style={tw`w-32 font-bold text-gray-700`}>
                  {timesheetData.reduce(
                    (sum, item) => sum +parseFloat(item.work_hrs || '0'),
                    0,
                  )}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Add Timesheet Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={addModalVisible}
          onRequestClose={() => setAddModalVisible(false)}>
          <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
          <View
  style={[
    tw`bg-white p-6 rounded-lg w-11/12`,
    {
      maxHeight: Dimensions.get('window').height * 0.75, // 75vh equivalent
    },
  ]}
>

              <ScrollView contentContainerStyle={tw`pb-10 flex-grow`}>
                <Text style={tw`text-lg font-bold mb-4 text-gray-800`}>
                  Add New Timesheet
                </Text>

                <CustomDropdown
                  label="Employee"
                  selectedValue={newTimesheet.emp_id || ''}
                  onSelect={value =>
                    setNewTimesheet({ ...newTimesheet, emp_id: value })
                  }
                  options={employeeNames.map(emp => ({
                    label: emp.employee_name,
                    value: emp.emp_id,
                  }))}
                  placeholder="Select Employee"
                />

                <Text style={tw`text-sm font-semibold mb-2 text-gray-700`}>
                  Work Date
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={tw`border border-gray-300 rounded p-3 mb-4 bg-white flex-row items-center justify-between`}>
                  <Text style={tw`text-gray-700 flex-1 text-sm`}>{newTimesheet.work_date}</Text>
                  <MaterialIcons name="calendar-today" size={20} color="#4A5568" />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={currentDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                )}

                <Text style={tw`text-sm font-semibold mb-2 text-gray-700`}>
                  Work Hours
                </Text>
                <TextInput
                  style={tw`border border-gray-300 rounded p-5 mb-4 bg-white text-gray-700 w-full text-sm`}
                  value={newTimesheet.work_hrs}
                  onChangeText={(text) =>
                    setNewTimesheet({ ...newTimesheet, work_hrs: text })
                  }
                  keyboardType="numeric"
                  placeholder="Hours"
                  placeholderTextColor="#A0AEC0"
                />

                <CustomDropdown
                  label="Attendance"
                  selectedValue={newTimesheet.attendance_flag || 'Y'}
                  onSelect={value =>
                    setNewTimesheet({ ...newTimesheet, attendance_flag: value })
                  }
                  options={attendanceOptions}
                  placeholder="Select Attendance"
                />

                <Text style={tw`text-sm font-semibold mb-2 text-gray-700`}>
                  Description
                </Text>
                <TextInput
                  style={tw`border border-gray-300 rounded p-5 mb-4 bg-white text-gray-700 w-full h-24 text-sm`}
                  value={newTimesheet.description}
                  onChangeText={(text) =>
                    setNewTimesheet({ ...newTimesheet, description: text })
                  }
                  multiline
                  numberOfLines={4}
                  placeholder="Description"
                  placeholderTextColor="#A0AEC0"
                />

                <View style={tw`flex-row justify-end mt-4`}>
                  <TouchableOpacity
                    onPress={() => setAddModalVisible(false)}
                    style={tw`bg-gray-300 p-3 rounded mr-2`}>
                    <Text style={tw`text-gray-700 font-semibold`}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddNew}
                    style={tw`bg-blue-500 p-3 rounded`}>
                    <Text style={tw`text-white font-semibold`}>Add Timesheet</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

export default EmployeeTimesheets;