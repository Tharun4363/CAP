// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   Alert,
//   Dimensions,
//   Platform,
//   KeyboardAvoidingView,
//   FlatList,
// } from 'react-native';
// import {
//   Button,
//   TextInput,
//   Modal,
//   Portal,
//   Provider,
//   ActivityIndicator,
// } from 'react-native-paper';
// import {useNavigation} from '@react-navigation/native';
// import {PieChart} from 'react-native-chart-kit';
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import tw from 'tailwind-react-native-classnames';
// import {API_IP_ADDRESS} from '../../../config';
// import Toast from 'react-native-toast-message';
// import { TouchableOpacity } from 'react-native';

// type SalesRecord = {
//   sales_date: string;
//   total_sales: string;
//   gross_income: string;
//   total_expenses: string;
//   net_income: string;
//   arg1?: string;
//   arg2?: string;
//   arg3?: string;
//   cust_id?: string;
// };

// const screenWidth = Dimensions.get('window').width;

// const SalesTracker = () => {
//   const navigation = useNavigation();
//   const [schemaName, setSchemaName] = useState('');
//   const [salesData, setSalesData] = useState<SalesRecord[]>([]);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [newSales, setNewSales] = useState<SalesRecord>({
//     sales_date: '',
//     total_sales: '',
//     gross_income: '',
//     total_expenses: '',
//     net_income: '',
//     arg1: '',
//     arg2: '',
//     arg3: '',
//     cust_id: '',
//   });

//   useEffect(() => {
//     const fetchCustomerData = async () => {
//       try {
//         setIsLoading(true);
//         const customerId =
//           (await AsyncStorage.getItem('customerId')) || 'demo_schema';
//         if (customerId) {
//           setSchemaName(customerId);
//           await fetchSalesData(customerId);
//         }
//       } catch (error) {
//         console.error('Error fetching customer data:', error);
//         Alert.alert('Error', 'Failed to load customer data');
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchCustomerData();
//   }, []);

//   const fetchSalesData = async (customerId: string) => {
//     try {
//       const response = await axios.get<SalesRecord[]>(
//         `${API_IP_ADDRESS}/api/v1/sales-by-schema/${customerId}`,
//       );
//       setSalesData(response.data || []);
//     } catch (error) {
//       console.error('Error fetching sales data:', error);
//       // Alert.alert('Error', 'Failed to load sales data');
//       Toast.show({
//         type: 'error',
//         text1: 'Error',
//         text2: 'Failed to load sales data',
//         position: 'bottom',
//       });
//     }
//   };

//   const handleAddNew = async () => {
//     const {sales_date, total_sales, gross_income, total_expenses, net_income} =
//       newSales;

//     if (
//       !sales_date ||
//       !total_sales ||
//       !gross_income ||
//       !total_expenses ||
//       !net_income
//     ) {
//       Toast.show({
//         type: 'error',
//         text1: 'Error',
//         text2: 'All fields are required!',
//         position: 'bottom',
//       });
//       return;
//     }

//     try {
//       setIsLoading(true);
//       await axios.post(
//         `${API_IP_ADDRESS}/api/v1/sales-by-schema/${schemaName}`,
//         newSales,
//       );
//       setModalVisible(false);
//       setNewSales({
//         sales_date: '',
//         total_sales: '',
//         gross_income: '',
//         total_expenses: '',
//         net_income: '',
//         arg1: '',
//         arg2: '',
//         arg3: '',
//         cust_id: '',
//       });
//       await fetchSalesData(schemaName);
//     } catch (error) {
//       console.error('Error adding sales data:', error);
//       Alert.alert('Error', 'Failed to add sales record');
//       Toast.show({
//         type: 'error',
//         text1: 'Error',
//         text2: 'Failed to add sales record',
//         position: 'bottom',
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const formatCurrency = (value: string) => {
//     const num = parseFloat(value);
//     return isNaN(num) ? '0.00' : num.toFixed(2);
//   };

//   const totalSales = salesData.reduce(
//     (sum, s) => sum + parseFloat(s.total_sales || '0'),
//     0,
//   );
//   const totalNetIncome = salesData.reduce(
//     (sum, s) => sum + parseFloat(s.net_income || '0'),
//     0,
//   );

//   const chartData = [
//     {
//       name: 'Total',
//       population: totalSales,
//       color: '#4F46E5',
//       legendFontColor: '#374151',
//       legendFontSize: 14,
//     },
//     {
//       name: 'Net',
//       population: totalNetIncome,
//       color: '#10B981',
//       legendFontColor: '#374151',
//       legendFontSize: 14,
//     },
//   ];

//   if (isLoading && !modalVisible) {
//     return (
//       <View style={tw`flex-1 items-center justify-center bg-gray-50`}>
//         <ActivityIndicator animating color="#4F46E5" size="large" />
//       </View>
//     );
//   }

//   // Enhanced renderItem with better styling
//   const renderItem = ({item, index}: {item: SalesRecord; index: number}) => (
//     <ScrollView horizontal style={tw`mb-1`}>
//       <View
//         style={tw`${
//           index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
//         } flex-row justify-between items-center px-4 py-3 border-b border-gray-100`}>
//         <View style={tw`w-28`}>
//           <Text style={tw`text-gray-700 font-medium`}>
//             {new Date(item.sales_date).toLocaleDateString()}
//           </Text>
//           {item.cust_id && (
//             <Text style={tw`text-xs text-gray-500 mt-1`}>
//               ID: {item.cust_id}
//             </Text>
//           )}
//         </View>
//         <View style={tw`flex-row`}>
//           <View style={tw`w-24 items-end`}>
//             <Text style={tw`text-gray-500 text-xs`}>Total</Text>
//             <Text style={tw`text-gray-800 font-medium`}>
//               ${formatCurrency(item.total_sales)}
//             </Text>
//           </View>
//           <View style={tw`w-24 items-end`}>
//             <Text style={tw`text-gray-500 text-xs`}>Income</Text>
//             <Text style={tw`text-gray-800 font-medium`}>
//               ${formatCurrency(item.gross_income)}
//             </Text>
//           </View>
//           <View style={tw`w-24 items-end`}>
//             <Text style={tw`text-gray-500 text-xs`}>Net</Text>
//             <Text
//               style={[
//                 tw`font-medium`,
//                 parseFloat(item.net_income) >= 0
//                   ? tw`text-green-600`
//                   : tw`text-red-600`,
//               ]}>
//               ${formatCurrency(item.net_income)}
//             </Text>
//           </View>
//         </View>
//       </View>

//       {(item.arg1 || item.arg2 || item.arg3) && (
//         <View style={tw`bg-gray-50 px-4 py-2 flex-row`}>
//           {item.arg1 && (
//             <View style={tw`mr-6`}>
//               <Text style={tw`text-xs text-gray-500`}>Arg1</Text>
//               <Text style={tw`text-sm text-gray-800`}>{item.arg1}</Text>
//             </View>
//           )}
//           {item.arg2 && (
//             <View style={tw`mr-6`}>
//               <Text style={tw`text-xs text-gray-500`}>Arg2</Text>
//               <Text style={tw`text-sm text-gray-800`}>{item.arg2}</Text>
//             </View>
//           )}
//           {item.arg3 && (
//             <View style={tw`mr-6`}>
//               <Text style={tw`text-xs text-gray-500`}>Arg3</Text>
//               <Text style={tw`text-sm text-gray-800`}>{item.arg3}</Text>
//             </View>
//           )}
//         </View>
//       )}
//     </ScrollView>
//   );

//   return (
//     <Provider>
//       <View style={tw`bg-gray-50`}>
//         <View style={tw`p-4`}>
//           <View style={tw`flex-row px-4 py-3 bg-white border-b border-gray-200`}>
//   <TouchableOpacity
//     style={tw`bg-gray-200 py-2 px-4 rounded-lg mr-2 flex-1`}
//     onPress={() => navigation.goBack()}>
//     <Text style={tw`text-gray-800 text-center font-medium`}>Back</Text>
//   </TouchableOpacity>

//   <TouchableOpacity
//     style={tw`bg-blue-500 py-2 px-4 rounded-lg ml-2 flex-1`}
//     onPress={() => setModalVisible(true)}
//     disabled={isLoading}>
//     <Text style={tw`text-white text-center font-medium`}>
//       {isLoading ? 'Loading...' : 'Add Sales'}
//     </Text>
//   </TouchableOpacity>
// </View>


//           {salesData.length > 0 ? (
//             <>
//               <View style={tw`bg-white rounded-lg shadow p-4 mb-4`}>
//                 <PieChart
//                   data={chartData}
//                   width={screenWidth * 0.9}
//                   height={220}
//                   chartConfig={{
//                     backgroundGradientFrom: '#FFF',
//                     backgroundGradientTo: '#FFF',
//                     color: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
//                   }}
//                   accessor="population"
//                   backgroundColor="transparent"
//                   paddingLeft="15"
//                   absolute
//                 />
//               </View>

//               <View style={tw`bg-white rounded-lg shadow overflow-hidden`}>
//                 <FlatList
//                   data={salesData}
//                   keyExtractor={(item, index) => `${item.sales_date}-${index}`}
//                   renderItem={renderItem}
//                 />
//               </View>
//             </>
//           ) : (
//             <View style={tw`bg-white rounded-lg shadow p-8 items-center`}>
//               <Text style={tw`text-lg text-gray-500`}>
//                 No sales data available
//               </Text>
//             </View>
//           )}
//         </View>
//       </View>

//       <Portal>
//         <Modal
//           visible={modalVisible}
//           onDismiss={() => setModalVisible(false)}
//           contentContainerStyle={tw`bg-white p-6 mx-4 rounded-lg`}>
//           <KeyboardAvoidingView
//             behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
//             <ScrollView>
//               <Text
//                 style={tw`text-xl font-bold text-center text-gray-800 mb-4`}>
//                 Add New Sales
//               </Text>
//               {[
//                 ['sales_date', 'Sales Date', true],
//                 ['total_sales', 'Total Sales', true],
//                 ['gross_income', 'Gross Income', true],
//                 ['total_expenses', 'Total Expenses', true],
//                 ['net_income', 'Net Income', true],
//                 ['arg1', 'Additional Field 1'],
//                 ['arg2', 'Additional Field 2'],
//                 ['arg3', 'Additional Field 3'],
//                 ['cust_id', 'Customer ID'],
//               ].map(([key, label, required]) => (
//                 <React.Fragment key={key as string}>
//                 <TextInput
//   label={`${label}${required ? ' *' : ''}`}
//   value={newSales[key as keyof SalesRecord]}
//   onChangeText={text =>
//     setNewSales(prev => ({
//       ...prev,
//       [key as keyof SalesRecord]: text,
//     }))
//   }
//   mode="outlined"
//   style={tw`mb-2`}
//   keyboardType={
//     [
//       'total_sales',
//       'gross_income',
//       'total_expenses',
//       'net_income',
//     ].includes(key as string)
//       ? 'numeric'
//       : 'default'
//   }
//   theme={{
//     colors: {
//       primary: 'black',
//       text: 'black',
//       placeholder: 'black',
//       onSurface: 'black',
//       background: '#FFFFFF',
//     },
//   }}
// />

//                 </React.Fragment>
//               ))}
//              <View style={tw`flex-row mt-4`}>
//   <Button
//     mode="contained"
//     onPress={handleAddNew}
//     loading={isLoading}
//     disabled={isLoading}
//     buttonColor="#3B82F6" // Tailwind blue-500 hex
//     textColor="#fff"
//     contentStyle={tw`py-1 px-3`}
//     style={tw`rounded flex-1 mr-2`} // full width & margin right
//   >
//     Save
//   </Button>

//   <Button
//     mode="outlined"
//     onPress={() => setModalVisible(false)}
//     textColor="#3B82F6"
//     contentStyle={tw`py-1 px-3`}
//     style={tw`rounded flex-1`} // full width, no margin
//   >
//     Cancel
//   </Button>
// </View>



//             </ScrollView>
//           </KeyboardAvoidingView>
//         </Modal>
//       </Portal>
//     </Provider>
//   );
// };

// export default SalesTracker;

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  TouchableOpacity,
  StatusBar,
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
        const customerId =
          (await AsyncStorage.getItem('customerId')) || 'demo_schema';
        if (customerId) {
          setSchemaName(customerId);
          await fetchSalesData(customerId);
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
        Alert.alert('Error', 'Failed to load customer data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerData();
  }, []);

  const fetchSalesData = async (customerId: string) => {
    try {
      const response = await axios.get<SalesRecord[]>(
        `${API_IP_ADDRESS}/api/v1/sales-by-schema/${customerId}`,
      );
      setSalesData(response.data || []);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load sales data',
        position: 'bottom',
      });
    }
  };

  const handleAddNew = async () => {
    const { sales_date, total_sales, gross_income, total_expenses, net_income } =
      newSales;

    if (
      !sales_date ||
      !total_sales ||
      !gross_income ||
      !total_expenses ||
      !net_income
    ) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'All fields are required!',
        position: 'bottom',
      });
      return;
    }

    try {
      setIsLoading(true);
      await axios.post(
        `${API_IP_ADDRESS}/api/v1/sales-by-schema/${schemaName}`,
        newSales,
      );
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
      await fetchSalesData(schemaName);
    } catch (error) {
      console.error('Error adding sales data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add sales record',
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
    <ScrollView horizontal style={tw`mb-1`}>
      <View
        style={tw`${
          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
        } flex-row justify-between items-center px-4 py-3 border-b border-gray-100`}>
        <View style={tw`w-28`}>
          <Text style={tw`text-gray-700 font-medium`}>
            {new Date(item.sales_date).toLocaleDateString()}
          </Text>
          {item.cust_id && (
            <Text style={tw`text-xs text-gray-500 mt-1`}>
              ID: {item.cust_id}
            </Text>
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
                parseFloat(item.net_income) >= 0
                  ? tw`text-green-600`
                  : tw`text-red-600`,
              ]}>
              ${formatCurrency(item.net_income)}
            </Text>
          </View>
        </View>
      </View>

      {(item.arg1 || item.arg2 || item.arg3) && (
        <View style={tw`bg-gray-50 px-4 py-2 flex-row`}>
          {item.arg1 && (
            <View style={tw`mr-6`}>
              <Text style={tw`text-xs text-gray-500`}>Arg1</Text>
              <Text style={tw`text-sm text-gray-800`}>{item.arg1}</Text>
            </View>
          )}
          {item.arg2 && (
            <View style={tw`mr-6`}>
              <Text style={tw`text-xs text-gray-500`}>Arg2</Text>
              <Text style={tw`text-sm text-gray-800`}>{item.arg2}</Text>
            </View>
          )}
          {item.arg3 && (
            <View style={tw`mr-6`}>
              <Text style={tw`text-xs text-gray-500`}>Arg3</Text>
              <Text style={tw`text-sm text-gray-800`}>{item.arg3}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
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
            <Text style={tw`ml-6 text-white text-lg font-semibold`}>
              Sales Tracker
            </Text>
          </View>
        )}

        <Sidebar
          isMobile={isMobile}
          sidebarVisible={sidebarVisible}
          toggleSidebar={toggleSidebar}
        />

        <View style={tw`flex-1 p-4 mt-16`}>
          <View style={tw`flex-row px-4 py-3 bg-white border-b border-gray-200`}>
            <TouchableOpacity
              style={tw`bg-gray-200 py-2 px-4 rounded-lg mr-2 flex-1`}
              onPress={() => navigation.goBack()}>
              <Text style={tw`text-gray-800 text-center font-medium`}>Back</Text>
            </TouchableOpacity>

           
          </View>

          {salesData.length > 0 ? (
            <>
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

              <View style={tw`bg-white rounded-lg shadow overflow-hidden`}>
                <FlatList
                  data={salesData}
                  keyExtractor={(item, index) => `${item.sales_date}-${index}`}
                  renderItem={renderItem}
                />
              </View>
            </>
          ) : (
            <View style={tw`bg-white rounded-lg shadow p-8 items-center`}>
              <Text style={tw`text-lg text-gray-500`}>
                No sales data available
              </Text>
            </View>
          )}
        </View>

        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            contentContainerStyle={tw`bg-white p-6 mx-4 rounded-lg`}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView>
                <Text style={tw`text-xl font-bold text-center text-gray-800 mb-4`}>
                  Add New Sales
                </Text>
                {[
                  ['sales_date', 'Sales Date', true],
                  ['total_sales', 'Total Sales', true],
                  ['gross_income', 'Gross Income', true],
                  ['total_expenses', 'Total Expenses', true],
                  ['net_income', 'Net Income', true],
                  ['arg1', 'Additional Field 1'],
                  ['arg2', 'Additional Field 2'],
                  ['arg3', 'Additional Field 3'],
                  ['cust_id', 'Customer ID'],
                ].map(([key, label, required]) => (
                  <TextInput
                    key={key as string}
                    label={`${label}${required ? ' *' : ''}`}
                    value={newSales[key as keyof SalesRecord]}
                    onChangeText={text =>
                      setNewSales(prev => ({
                        ...prev,
                        [key as keyof SalesRecord]: text,
                      }))
                    }
                    mode="outlined"
                    style={tw`mb-2`}
                    keyboardType={
                      [
                        'total_sales',
                        'gross_income',
                        'total_expenses',
                        'net_income',
                      ].includes(key as string)
                        ? 'numeric'
                        : 'default'
                    }
                    theme={{
                      colors: {
                        primary: 'black',
                        text: 'black',
                        placeholder: 'black',
                        onSurface: 'black',
                        background: '#FFFFFF',
                      },
                    }}
                  />
                ))}
                <View style={tw`flex-row mt-4`}>
                  <Button
                    mode="contained"
                    onPress={handleAddNew}
                    loading={isLoading}
                    disabled={isLoading}
                    buttonColor="#3B82F6"
                    textColor="#fff"
                    contentStyle={tw`py-1 px-3`}
                    style={tw`rounded flex-1 mr-2`}>
                    Save
                  </Button>

                  <Button
                    mode="outlined"
                    onPress={() => setModalVisible(false)}
                    textColor="#3B82F6"
                    contentStyle={tw`py-1 px-3`}
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

export default SalesTracker;