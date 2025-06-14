import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
} from 'react-native';
import {
  Button,
  TextInput,
  Modal,
  Portal,
  Provider,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { PieChart } from 'react-native-chart-kit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'tailwind-react-native-classnames';
import { API_IP_ADDRESS } from '../../../config';
import Toast from 'react-native-toast-message';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Sidebar from './Sidebar';

type SalesRecord = {
  sales_date: string;
  total_sales: string;
  gross_income: string;
  total_expenses: string;
  net_income: string;
  arg1?: string;
  arg2?: string;
  arg3?: string;
  cust_id?: string;
  uniqueKey?: string;
};

const screenWidth = Dimensions.get('window').width;

const SalesTracker = () => {
  const navigation = useNavigation();
  const [schemaName, setSchemaName] = useState('');
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  const [newSales, setNewSales] = useState<SalesRecord>({
    sales_date: '',
    total_sales: '',
    gross_income: '',
    total_expenses: '',
    net_income: '',
    arg1: '',
    arg2: '',
    arg3: '',
    cust_id: '',
  });

  const [errors, setErrors] = useState<{
    sales_date: string | null;
    total_sales: string | null;
    gross_income: string | null;
    total_expenses: string | null;
    net_income: string | null;
    arg1: string | null;
    arg2: string | null;
    arg3: string | null;
  }>({
    sales_date: null,
    total_sales: null,
    gross_income: null,
    total_expenses: null,
    net_income: null,
    arg1: null,
    arg2: null,
    arg3: null,
  });

  // Validation functions
  const validateSalesDate = (value: string): string | null => {
    if (!value.trim()) return 'Sales Date is required';
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) return 'Sales Date must be in YYYY-MM-DD format';
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Invalid date';
    return null;
  };

  const validateTotalSales = (value: string): string | null => {
    if (!value.trim()) return 'Total Sales is required';
    if (isNaN(parseFloat(value)) || parseFloat(value) < 0) return 'Total Sales must be a non-negative number';
    return null;
  };

  const validateGrossIncome = (value: string): string | null => {
    if (!value.trim()) return 'Gross Income is required';
    if (isNaN(parseFloat(value)) || parseFloat(value) < 0) return 'Gross Income must be a non-negative number';
    return null;
  };

  const validateTotalExpenses = (value: string): string | null => {
    if (!value.trim()) return 'Total Expenses is required';
    if (isNaN(parseFloat(value)) || parseFloat(value) < 0) return 'Total Expenses must be a non-negative number';
    return null;
  };

  const validateNetIncome = (value: string): string | null => {
    if (!value.trim()) return 'Net Income is required';
    if (isNaN(parseFloat(value))) return 'Net Income must be a valid number';
    return null;
  };

  const validateArg1 = (value: string): string | null => {
    if (value && value.length > 255) return 'Additional Field 1 cannot exceed 255 characters';
    return null;
  };

  const validateArg2 = (value: string): string | null => {
    if (value && value.length > 255) return 'Additional Field 2 cannot exceed 255 characters';
    return null;
  };

  const validateArg3 = (value: string): string | null => {
    if (value && value.length > 255) return 'Additional Field 3 cannot exceed 255 characters';
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
    const fetchCustomerData = async () => {
      try {
        setIsLoading(true);
        const customerId = await AsyncStorage.getItem('customerId');
        console.log('Customer ID:', customerId);
        if (!customerId || customerId === 'demo_schema') {
          console.warn('Invalid or demo customerId, skipping API call');
          setSalesData([]);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Invalid customer ID. Please log in again.',
            position: 'bottom',
          });
          return;
        }
        setSchemaName(customerId);
        await fetchSalesData(customerId);
      } catch (error) {
        console.error('Error fetching customer data:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load customer data',
          position: 'bottom',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerData();
  }, []);

  const fetchSalesData = async (customerId: string) => {
    try {
      const url = `${API_IP_ADDRESS}/api/v1/sales-by-schema/${customerId}`;
      console.log('Fetching sales data from:', url);
      const response = await axios.get<SalesRecord[]>(url);
      setSalesData(
        response.data.map((item, index) => ({
          ...item,
          uniqueKey: `sales-${item.sales_date || index}-${index}`,
        })) || []
      );
    } catch (error: any) {
      // Handle 404 specifically - this means no data exists yet
      if (error.response?.status === 404) {
        setSalesData([]); // Set empty array for no data
        console.log('No sales data found for this customer - this is normal for new customers');
        // Don't show error toast for 404, just log it
      } else {
        // Log actual errors
        console.error('Error fetching sales data:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url,
        });
        
        // Show error toast only for actual errors (500, network errors, etc.)
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load sales data. Please try again later.',
          position: 'bottom',
        });
      }
    }
  };

  const handleAddNew = async () => {
    const newErrors = {
      sales_date: validateSalesDate(newSales.sales_date),
      total_sales: validateTotalSales(newSales.total_sales),
      gross_income: validateGrossIncome(newSales.gross_income),
      total_expenses: validateTotalExpenses(newSales.total_expenses),
      net_income: validateNetIncome(newSales.net_income),
      arg1: validateArg1(newSales.arg1 || ''),
      arg2: validateArg2(newSales.arg2 || ''),
      arg3: validateArg3(newSales.arg3 || ''),
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(error => error !== null)) {
      return;
    }

    try {
      setIsLoading(true);
      const updatedSales = { ...newSales, cust_id: schemaName };
      const url = `${API_IP_ADDRESS}/api/v1/sales-by-schema/${schemaName}`;
      console.log('Posting sales data to:', url, updatedSales);
      await axios.post(url, updatedSales);
      setModalVisible(false);
      setNewSales({
        sales_date: '',
        total_sales: '',
        gross_income: '',
        total_expenses: '',
        net_income: '',
        arg1: '',
        arg2: '',
        arg3: '',
        cust_id: '',
      });
      setErrors({
        sales_date: null,
        total_sales: null,
        gross_income: null,
        total_expenses: null,
        net_income: null,
        arg1: null,
        arg2: null,
        arg3: null,
      });
      await fetchSalesData(schemaName);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Sales data added successfully',
        position: 'bottom',
      });
    } catch (error: any) {
      console.error('Error adding sales data:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
      });
      const errorMessage =
        error.response?.status === 400
          ? error.response?.data?.error || 'Invalid data provided. Please check all fields.'
          : error.response?.status === 500
          ? 'Server error. Please ensure the database is set up correctly or try again later.'
          : 'Failed to add sales record. Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
        position: 'bottom',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const totalSales = salesData.reduce(
    (sum, s) => sum + parseFloat(s.total_sales || '0'),
    0,
  );
  const totalNetIncome = salesData.reduce(
    (sum, s) => sum + parseFloat(s.net_income || '0'),
    0,
  );

  const chartData = [
    {
      name: 'Total',
      population: totalSales,
      color: '#4F46E5',
      legendFontColor: '#374151',
      legendFontSize: 14,
    },
    {
      name: 'Net',
      population: totalNetIncome,
      color: '#10B981',
      legendFontColor: '#374151',
      legendFontSize: 14,
    },
  ];

  const renderItem = ({ item, index }: { item: SalesRecord; index: number }) => (
    <View style={tw`mb-1`}>
      <ScrollView horizontal>
        <View
          style={tw`${
            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
          } flex-row justify-between items-center px-4 py-3 border-b border-gray-100 min-w-full`}>
          <View style={tw`w-28`}>
            <Text style={tw`text-gray-700 font-medium`}>
              {new Date(item.sales_date).toLocaleDateString()}
            </Text>
            {item.cust_id && (
              <Text style={tw`text-xs text-gray-500 mt-1`}>ID: {item.cust_id}</Text>
            )}
          </View>
          <View style={tw`flex-row`}>
            <View style={tw`w-24 items-end`}>
              <Text style={tw`text-gray-500 text-xs`}>Total</Text>
              <Text style={tw`text-gray-800 font-medium`}>
                ${formatCurrency(item.total_sales)}
              </Text>
            </View>
            <View style={tw`w-24 items-end`}>
              <Text style={tw`text-gray-500 text-xs`}>Income</Text>
              <Text style={tw`text-gray-800 font-medium`}>
                ${formatCurrency(item.gross_income)}
              </Text>
            </View>
            <View style={tw`w-24 items-end`}>
              <Text style={tw`text-gray-500 text-xs`}>Net</Text>
              <Text
                style={[
                  tw`font-medium`,
                  parseFloat(item.net_income) >= 0 ? tw`text-green-600` : tw`text-red-600`,
                ]}>
                ${formatCurrency(item.net_income)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      {(item.arg1 || item.arg2 || item.arg3) && (
        <View style={tw`bg-gray-50 px-4 py-2 flex-row flex-wrap`}>
          {item.arg1 && (
            <View style={[tw`mr-6 mb-2 w-1/3`, styles.minWidthContainer]}>
              <Text style={tw`text-xs text-gray-500`}>Arg1</Text>
              <Text style={tw`text-sm text-gray-800`}>{item.arg1}</Text>
            </View>
          )}
          {item.arg2 && (
            <View style={[tw`mr-6 mb-2 w-1/3`, styles.minWidthContainer]}>
              <Text style={tw`text-xs text-gray-500`}>Arg2</Text>
              <Text style={tw`text-sm text-gray-800`}>{item.arg2}</Text>
            </View>
          )}
          {item.arg3 && (
            <View style={[tw`mr-6 mb-2 w-1/3`, styles.minWidthContainer]}>
              <Text style={tw`text-xs text-gray-500`}>Arg3</Text>
              <Text style={tw`text-sm text-gray-800`}>{item.arg3}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={tw`p-4 mt-${isMobile ? '16' : '0'}`}>
      <View style={tw`flex-row px-4 py-3 bg-white border-b border-gray-200 justify-between mb-4`}>
        <TouchableOpacity
          style={tw`bg-blue-500 py-2 px-4 rounded-lg mr-2 flex-1`}
          onPress={() => setModalVisible(true)}
          disabled={isLoading}>
          <Text style={tw`text-white text-center font-medium`}>
            {isLoading ? 'Loading...' : 'Add Sales Data'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`bg-gray-200 py-2 px-4 rounded-lg ml-2 flex-1`}
          onPress={() => navigation.goBack()}>
          <Text style={tw`text-gray-800 text-center font-medium`}>Back</Text>
        </TouchableOpacity>
      </View>
      {isLoading && !modalVisible ? (
        <View style={tw`items-center justify-center bg-gray-50 py-20`}>
          <ActivityIndicator animating color="#4F46E5" size="large" />
        </View>
      ) : salesData.length > 0 ? (
        <View style={tw`bg-white rounded-lg shadow p-4 mb-4`}>
          <PieChart
            data={chartData}
            width={screenWidth * 0.9}
            height={220}
            chartConfig={{
              backgroundGradientFrom: '#FFF',
              backgroundGradientTo: '#FFF',
              color: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      ) : (
        <View style={tw`bg-white rounded-lg shadow p-8 items-center mb-4`}>
          <MaterialIcons name="assessment" size={48} color="#9CA3AF" style={tw`mb-4`} />
          <Text style={tw`text-lg text-gray-600 font-medium mb-2`}>No Sales Data Yet</Text>
          <Text style={tw`text-sm text-gray-500 text-center`}>
            Get started by adding your first sales record using the button above.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <Provider>
      <View style={tw`flex-1 bg-gray-50`}>
        <StatusBar barStyle="light-content" />
        {isMobile && !sidebarVisible && (
          <View
            style={tw`bg-gray-900 w-full absolute top-0 z-20 flex-row items-center py-4 px-4`}>
            <TouchableOpacity onPress={toggleSidebar} style={tw`p-2 rounded-lg`}>
              <MaterialIcons name="menu" size={24} color="white" />
            </TouchableOpacity>
            <Text style={tw`ml-6 text-white text-lg font-semibold`}>Sales Tracker</Text>
          </View>
        )}
        <Sidebar
          isMobile={isMobile}
          sidebarVisible={sidebarVisible}
          toggleSidebar={toggleSidebar}
        />
        <FlatList
          data={salesData}
          keyExtractor={(item) => item.uniqueKey || item.sales_date}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-4`}
        />
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => {
              setModalVisible(false);
              setErrors({
                sales_date: null,
                total_sales: null,
                gross_income: null,
                total_expenses: null,
                net_income: null,
                arg1: null,
                arg2: null,
                arg3: null,
              });
            }}
            contentContainerStyle={[tw`bg-white p-6 mx-4 rounded-lg`, styles.modalContainer]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView contentContainerStyle={tw`pb-4`}>
                <Text style={tw`text-xl font-bold text-center text-gray-800 mb-4`}>
                  Add New Sales
                </Text>
                {[
                  ['sales_date', 'Sales Date (YYYY-MM-DD)', true],
                  ['total_sales', 'Total Sales', true],
                  ['gross_income', 'Gross Income', true],
                  ['total_expenses', 'Total Expenses', true],
                  ['net_income', 'Net Income', true],
                  ['arg1', 'Additional Field 1'],
                  ['arg2', 'Additional Field 2'],
                  ['arg3', 'Additional Field 3'],
                ].map(([key, label, required]) => (
                  <View key={key as string}>
                    <TextInput
                      label={`${label}${required ? ' *' : ''}`}
                      value={newSales[key as keyof SalesRecord]}
                      onChangeText={(text) => {
                        setNewSales((prev) => ({
                          ...prev,
                          [key as keyof SalesRecord]: text,
                        }));
                        if (key === 'sales_date') {
                          setErrors({ ...errors, sales_date: validateSalesDate(text) });
                        } else if (key === 'total_sales') {
                          setErrors({ ...errors, total_sales: validateTotalSales(text) });
                        } else if (key === 'gross_income') {
                          setErrors({ ...errors, gross_income: validateGrossIncome(text) });
                        } else if (key === 'total_expenses') {
                          setErrors({ ...errors, total_expenses: validateTotalExpenses(text) });
                        } else if (key === 'net_income') {
                          setErrors({ ...errors, net_income: validateNetIncome(text) });
                        } else if (key === 'arg1') {
                          setErrors({ ...errors, arg1: validateArg1(text) });
                        } else if (key === 'arg2') {
                          setErrors({ ...errors, arg2: validateArg2(text) });
                        } else if (key === 'arg3') {
                          setErrors({ ...errors, arg3: validateArg3(text) });
                        }
                      }}
                      mode="outlined"
                      style={tw`mb-2`}
                      keyboardType={
                        ['total_sales', 'gross_income', 'total_expenses', 'net_income'].includes(key as string)
                          ? 'numeric'
                          : 'default'
                      }
                      placeholder={key === 'sales_date' ? 'e.g., 2025-06-01' : undefined}
                      theme={{
                        colors: {
                          primary: errors[key as keyof typeof errors] ? '#EF4444' : 'black',
                          text: 'black',
                          placeholder: 'black',
                          onSurface: 'black',
                          background: '#FFFFFF',
                        },
                      }}
                      error={!!errors[key as keyof typeof errors]}
                    />
                    {errors[key as keyof typeof errors] && (
                      <Text style={tw`text-red-500 text-sm mb-2`}>
                        {errors[key as keyof typeof errors]}
                      </Text>
                    )}
                  </View>
                ))}
                <View style={tw`flex-row mt-4 justify-between`}>
                  <Button
                    mode="contained"
                    onPress={handleAddNew}
                    loading={isLoading}
                    disabled={isLoading}
                    buttonColor="#3B82F6"
                    textColor="#fff"
                    contentStyle={tw`py-2 px-4`}
                    style={tw`rounded flex-1 mr-2`}>
                    Save
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setModalVisible(false);
                      setErrors({
                        sales_date: null,
                        total_sales: null,
                        gross_income: null,
                        total_expenses: null,
                        net_income: null,
                        arg1: null,
                        arg2: null,
                        arg3: null,
                      });
                    }}
                    textColor="#3B82F6"
                    contentStyle={tw`py-2 px-4`}
                    style={tw`rounded flex-1`}>
                    Cancel
                  </Button>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>
        </Portal>
        <Toast />
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  minWidthContainer: {
    minWidth: 120,
  },
  modalContainer: {
    maxHeight: '80%',
  },
});

export default SalesTracker;