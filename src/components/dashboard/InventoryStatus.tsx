import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import axios from 'axios';
import {API_IP_ADDRESS} from '../../../config';

import Toast from 'react-native-toast-message';

import Sidebar from './Sidebar';
import {SafeAreaView} from 'react-native-safe-area-context';

const InventoryStatus: React.FC = () => {
  const [custId, setCustId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [schemaName, setSchemaName] = useState('');
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Form states
  const [newInventory, setNewInventory] = useState({
    inv_no: '',
    item_details: '',
    description: '',
    item_status: '',
  });

  interface Inventory {
    inv_no: string;
    item_details: string;
    item_status: string;
    description?: string;
    arg1?: string | null;
    arg2?: string | null;
    arg3?: string | null;
  }

  const [editingInventory, setEditingInventory] = useState<Inventory | null>(
    null,
  );

  // Log API_IP_ADDRESS on component mount
  useEffect(() => {
    console.log('API_IP_ADDRESS:', API_IP_ADDRESS);
  }, []);
  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);
  const navigation = useNavigation();
  // Create a configured axios instance with timeout and retry logic
  const api = axios.create({
    timeout: 15000, // 15 seconds timeout
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  useEffect(() => {
    const loadCustomerId = async () => {
      try {
        const customerId = await AsyncStorage.getItem('customerId');
        console.log('Retrieved customerId from AsyncStorage:', customerId);

        if (customerId) {
          setSchemaName(customerId);
          fetchInventoryData(customerId);
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
      } catch (error) {
        console.error('Error retrieving customer ID:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load inventory data: ' + error,
          position: 'bottom',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerId();
  }, []);

  const fetchInventoryData = async (customerId: any) => {
    setRefreshing(true);
    setConnectionError(false);
    const url = `${API_IP_ADDRESS}/api/v1/inventory-by-schema/${customerId}`;
    console.log('Fetching inventory data from URL:', url);

    try {
      const response = await api.get(url);
      console.log('Inventory data received:', response.data || 'no data');

      if (Array.isArray(response.data)) {
        setInventoryData(response.data);
      } else {
        console.error('Error: Response is not an array', response.data);
        Toast.show({
          type: 'error',
          text1: 'Data Error',
          text2: 'Invalid data format received',
        });
      }
    } catch (error: any) {
      handleApiError('fetching inventory data', error);
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
    });
  };

  const handleAddInventory = async () => {
    if (
      !newInventory.inv_no ||
      !newInventory.item_details ||
      !newInventory.item_status
    ) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Inventory number, item details, and status are required',
        position: 'bottom',
      });
      return;
    }

    try {
      const url = `${API_IP_ADDRESS}/api/v1/inventory-by-schema/${schemaName}`;
      console.log('Adding inventory at URL:', url);
      console.log('Inventory data to add:', newInventory);

      const response = await api.post(url, newInventory);
      console.log('Add inventory response:', response.data);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Inventory item added successfully',
        position: 'bottom',
      });

      setAddModalVisible(false);
      setNewInventory({
        inv_no: '',
        item_details: '',
        description: '',
        item_status: '',
      });
      fetchInventoryData(schemaName);
    } catch (error) {
      handleApiError('adding inventory', error);
    }
  };

  const handleEditInventory = async () => {
    if (
      !editingInventory?.inv_no ||
      !editingInventory?.item_details ||
      !editingInventory?.item_status
    ) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Inventory number, item details, and status are required',
        position: 'bottom',
      });
      return;
    }

    try {
      // Update the URL to include the inv_no in the path
      const url = `${API_IP_ADDRESS}/api/v1/inventory-by-schema/${schemaName}/${editingInventory.inv_no}`;
      console.log('Updating inventory at URL:', url);

      // Make sure your request body matches what the backend expects
      const updateData = {
        description: editingInventory.description || '',
        item_status: editingInventory.item_status,
        item_details: editingInventory.item_details,
        // Include these if your backend expects them, otherwise remove
        arg1: editingInventory.arg1 || null,
        arg2: editingInventory.arg2 || null,
        arg3: editingInventory.arg3 || null,
      };

      console.log('Inventory data to update:', updateData);

      const response = await api.put(url, updateData);
      console.log('Update inventory response:', response.data);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Inventory updated successfully',
        position: 'bottom',
      });

      setEditModalVisible(false);
      setEditingInventory(null);
      fetchInventoryData(schemaName);
    } catch (error) {
      handleApiError('updating inventory', error);
    }
  };

  const handleDeleteInventory = (inventory: any) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete inventory item ${inventory.inv_no}?`,
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
              // Update the URL to include the inv_no in the path
              const url = `${API_IP_ADDRESS}/api/v1/inventory-by-schema/${schemaName}/${inventory.inv_no}`;
              console.log('Deleting inventory at URL:', url);

              // No need to send data in the body for DELETE
              const response = await api.delete(url);
              console.log('Delete inventory response:', response.data);

              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Inventory deleted successfully',
                position: 'bottom',
              });

              fetchInventoryData(schemaName);
            } catch (error) {
              handleApiError('deleting inventory', error);
            }
          },
        },
      ],
    );
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

  // Add Inventory Modal
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
            Add New Inventory
          </Text>

          <Text style={tw`text-gray-700 font-medium mb-1`}>
            Inventory Number
          </Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
            placeholder="Enter inventory number"
            value={newInventory.inv_no}
            onChangeText={text =>
              setNewInventory({...newInventory, inv_no: text})
            }
          />

          <Text style={tw`text-gray-700 font-medium mb-1`}>Item Details</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
            placeholder="Enter item details"
            value={newInventory.item_details}
            onChangeText={text =>
              setNewInventory({...newInventory, item_details: text})
            }
          />

          <Text style={tw`text-gray-700 font-medium mb-1`}>Description</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
            placeholder="Enter description"
            multiline={true}
            numberOfLines={3}
            value={newInventory.description}
            onChangeText={text =>
              setNewInventory({...newInventory, description: text})
            }
          />

          <Text style={tw`text-gray-700 font-medium mb-1`}>Item Status</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-4 text-base`}
            placeholder="Enter item status"
            value={newInventory.item_status}
            onChangeText={text =>
              setNewInventory({...newInventory, item_status: text})
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
              onPress={handleAddInventory}>
              <Text style={tw`text-white text-center font-medium`}>
                Add Inventory
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Edit Inventory Modal
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
            Edit Inventory
          </Text>

          <Text style={tw`text-gray-700 font-medium mb-1`}>
            Inventory Number
          </Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base bg-gray-100`}
            placeholder="Enter inventory number"
            value={editingInventory?.inv_no || ''}
            editable={false} // Make inventory number non-editable as it's often a primary key
          />

          <Text style={tw`text-gray-700 font-medium mb-1`}>Item Details</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base bg-gray-100`}
            placeholder="Enter item details"
            value={editingInventory?.item_details || ''}
            editable={false}
            onChangeText={text => {
              if (!editingInventory) return;
              setEditingInventory({...editingInventory, item_details: text});
            }}
          />

          <Text style={tw`text-gray-700 font-medium mb-1`}>Description</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-3 text-base`}
            placeholder="Enter description"
            multiline={true}
            numberOfLines={3}
            value={editingInventory?.description || ''}
            onChangeText={text => {
              if (!editingInventory) return;
              setEditingInventory({...editingInventory, description: text});
            }}
          />

          <Text style={tw`text-gray-700 font-medium mb-1`}>Item Status</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-3 mb-4 text-base`}
            placeholder="Enter item status"
            value={editingInventory?.item_status || ''}
            onChangeText={text => {
              if (!editingInventory) return;
              setEditingInventory({...editingInventory, item_status: text});
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
              onPress={handleEditInventory}>
              <Text style={tw`text-white text-center font-medium`}>
                Save Changes
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
  // Network error component
  const ConnectionErrorBanner = () => {
    if (!connectionError) return null;

    return (
      <View style={tw`bg-red-100 p-3 border-l-4 border-red-500 mt-150`}>
        <Text style={tw`text-red-700 font-medium`}>Connection Error</Text>
        <Text style={tw`text-red-600`}>Unable to connect to the server</Text>
        <TouchableOpacity
          style={tw`bg-red-200 py-1 px-3 rounded-lg self-start mt-1`}
          onPress={() => {
            if (schemaName) {
              fetchInventoryData(schemaName);
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
        <Text style={tw`mt-4 text-gray-600`}>Loading inventory data...</Text>
      </SafeAreaView>
    );
  }
  const navigateBack = () => {
    navigation.goBack();
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Your Original Top Bar for Mobile */}
      {isMobile && !sidebarVisible && (
        <View
          style={tw`bg-gray-900 w-full absolute top-0 z-20 flex-row items-center py-4 px-4`}>
          <TouchableOpacity
            onPress={toggleSidebar}
            style={tw`bg-gray-800 p-2 rounded`}>
            <MaterialIcons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`ml-4 text-white text-lg font-semibold`}>
            Inventory Status
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

      {/* Action Buttons - Enhanced */}
      <View
        style={tw`flex-col px-4 py-3 bg-white border-b border-gray-200 shadow-sm ${
          isMobile ? 'mt-16' : 'mt-4'
        }`}>
        <TouchableOpacity
          style={tw`bg-indigo-600 py-3 px-4 rounded-lg mb-3 flex-row justify-center items-center`}
          onPress={() => setAddModalVisible(true)}>
          <MaterialIcons name="add" size={20} color="white" />
          <Text style={tw`text-white ml-2 text-center font-medium`}>
            Add New Inventory
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`bg-white border border-gray-300 py-3 px-4 rounded-lg flex-row justify-center items-center`}
          onPress={navigateBack}>
          <MaterialIcons name="arrow-back" size={20} color="#4b5563" />
          <Text style={tw`text-gray-700 ml-2 text-center font-medium`}>
            Back
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content - Enhanced */}
      <ScrollView
        contentContainerStyle={tw`pb-8`}
        style={tw`${isMobile ? 'mt-2' : 'mt-0'}`}>
        {refreshing ? (
          <View style={tw`flex-1 justify-center items-center py-16`}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={tw`text-gray-500 mt-2`}>Loading inventory...</Text>
          </View>
        ) : inventoryData.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center p-8 mt-8`}>
            <MaterialIcons name="inventory" size={48} color="#9ca3af" />
            <Text
              style={tw`text-gray-600 text-lg font-medium text-center mt-4`}>
              No inventory items found
            </Text>
            <Text style={tw`text-gray-500 text-center mt-1`}>
              Add your first inventory item using the button above
            </Text>
          </View>
        ) : (
          <View style={tw`p-4`}>
            <Text style={tw`text-gray-500 text-sm mb-3`}>
              Showing {inventoryData.length}{' '}
              {inventoryData.length === 1 ? 'item' : 'items'}
            </Text>

            {inventoryData.map((inventory: any, index) => (
              <View
                key={index}
                style={tw`bg-white mb-4 p-5 rounded-xl shadow-xs border border-gray-100`}>
                <View style={tw`flex-row justify-between items-start mb-3`}>
                  <Text style={tw`text-lg font-bold text-gray-800`}>
                    {inventory.inv_no}
                  </Text>
                  <View style={tw`flex-row`}>
                    <TouchableOpacity
                      style={tw`bg-blue-50 p-2 rounded-lg mr-2`}
                      onPress={() => {
                        setEditingInventory(inventory);
                        setEditModalVisible(true);
                      }}>
                      <MaterialIcons name="edit" size={18} color="#3b82f6" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={tw`bg-red-50 p-2 rounded-lg`}
                      onPress={() => handleDeleteInventory(inventory)}>
                      <MaterialIcons name="delete" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-500 text-sm mb-1`}>
                    Item Details
                  </Text>
                  <Text style={tw`text-gray-800`}>
                    {inventory.item_details}
                  </Text>
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-500 text-sm mb-1`}>
                    Description
                  </Text>
                  <Text style={tw`text-gray-700`}>
                    {inventory.description || 'No description provided'}
                  </Text>
                </View>

                <View>
                  <Text style={tw`text-gray-500 text-sm mb-1`}>Status</Text>
                  <View
                    style={[
                      tw`inline-flex px-3 py-1 rounded-full`,
                      inventory.item_status?.toLowerCase() === 'available' &&
                        tw`bg-green-50`,
                      inventory.item_status?.toLowerCase() === 'in use' &&
                        tw`bg-yellow-50`,
                      inventory.item_status?.toLowerCase() === 'maintenance' &&
                        tw`bg-orange-50`,
                      inventory.item_status?.toLowerCase() === 'damaged' &&
                        tw`bg-red-50`,
                      ![
                        'available',
                        'in use',
                        'maintenance',
                        'damaged',
                      ].includes(inventory.item_status?.toLowerCase()) &&
                        tw`bg-gray-50`,
                    ]}>
                    <Text
                      style={[
                        tw`text-sm font-medium`,
                        inventory.item_status?.toLowerCase() === 'available' &&
                          tw`text-green-700`,
                        inventory.item_status?.toLowerCase() === 'in use' &&
                          tw`text-yellow-700`,
                        inventory.item_status?.toLowerCase() ===
                          'maintenance' && tw`text-orange-700`,
                        inventory.item_status?.toLowerCase() === 'damaged' &&
                          tw`text-red-700`,
                        ![
                          'available',
                          'in use',
                          'maintenance',
                          'damaged',
                        ].includes(inventory.item_status?.toLowerCase()) &&
                          tw`text-gray-700`,
                      ]}>
                      {inventory.item_status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {renderAddModal()}
      {renderEditModal()}
      <Toast />
    </View>
  );
};

export default InventoryStatus;
