import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
  TextInput,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import Sidebar from './Sidebar';
import axios from 'axios';
import {API_IP_ADDRESS} from '../../../config';
import Toast from 'react-native-toast-message';
import {launchImageLibrary} from 'react-native-image-picker';
import {bucketName, s3} from '../../services/s3';
import {Asset} from 'react-native-image-picker';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import RNFS from 'react-native-fs';

const OrderItems = () => {
  const navigation = useNavigation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [editingOrderItem, setEditingOrderItem] = useState<any>(null);
  const [image, setImage] = useState<Asset | null>(null);
  const [opened, setOpened] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [orderDetails, setOrderDetails] = useState({
    item_name: '',
    item_price: '',
    item_discount: '',
  });

  useEffect(() => {
    const updateLayout = () => {
      const {width} = Dimensions.get('window');
      setIsMobile(width < 768);
    };
    updateLayout();
    Dimensions.addEventListener('change', updateLayout);

    return () => {
      // Cleanup listener if needed
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const customerId = await AsyncStorage.getItem('customerId');
        if (customerId) {
          await fetchOrderItems(customerId);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Customer ID not found',
            position: 'bottom',
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load order items',
          position: 'bottom',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchOrderItems = async (customerId: string) => {
    try {
      const response = await axios.get(
        `${API_IP_ADDRESS}/api/v1/order-items/${customerId}`,
      );
      setOrderItems(response.data || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
      throw error;
    }
  };

  // 1. First, modify your selectImage function to include base64:
// Add this import at top of your OrderItems.tsx file


// Updated selectImage function (remove includeBase64 since we'll read file directly)
const selectImage = async () => {
  try {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false, // We don't need base64 with this approach
    });
    
    if (result.assets && result.assets[0]) {
      const asset = result.assets[0];
      console.log('Selected image:', {
        uri: asset.uri,
        type: asset.type,
        fileSize: asset.fileSize,
        fileName: asset.fileName
      });
      setImage(asset);
    }
  } catch (error) {
    console.error('Error selecting image:', error);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to select image',
      position: 'bottom',
    });
  }
};

// Most reliable upload function using react-native-fs
const uploadImageToS3 = async (imageAsset: Asset): Promise<string> => {
  try {
    setIsUploading(true);
    
    if (!imageAsset.uri) {
      throw new Error('Image URI is missing');
    }

    console.log('Starting upload process...');

    // Create unique filename
    const fileExtension = imageAsset.type?.split('/')[1] || 'jpg';
    const fileName = `order_item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;

    // Read file as base64 using react-native-fs
    let base64Data: string;
    try {
      // Handle different URI formats
      let filePath = imageAsset.uri;
      
      // Android file URIs might need adjustment
      if (Platform.OS === 'android' && !filePath.startsWith('file://')) {
        filePath = `file://${filePath}`;
      }
      
      // Remove file:// prefix for RNFS
      const cleanPath = filePath.replace('file://', '');
      
      console.log('Reading file from path:', cleanPath);
      base64Data = await RNFS.readFile(cleanPath, 'base64');
      console.log('File read successfully, size:', base64Data.length);
      
    } catch (readError) {
      console.error('Error reading file:', readError);
      throw new Error(`Failed to read image file: ${readError.message}`);
    }

    // Convert base64 to Uint8Array
    const base64ToUint8Array = (base64: string): Uint8Array => {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    };

    const fileData = base64ToUint8Array(base64Data);
    
    console.log('Prepared for upload:', {
      fileName,
      fileSize: fileData.length,
      contentType: imageAsset.type || 'image/jpeg',
      bucketName
    });

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileData,
      ContentType: imageAsset.type || 'image/jpeg',
      // Add some metadata for debugging
      Metadata: {
        'original-name': imageAsset.fileName || 'unknown',
        'upload-timestamp': Date.now().toString(),
        'app-version': 'react-native'
      }
    });

    console.log('Sending to S3...');
    const result = await s3.send(uploadCommand);
    console.log('S3 Upload successful:', result);

    // Construct the public URL
    const imageUrl = `https://${bucketName}.s3.amazonaws.com/${fileName}`;
    
    console.log('Upload completed, URL:', imageUrl);
    return imageUrl;
    
  } catch (error: any) {
    console.error('Upload failed:', error);
    throw new Error(`Failed to upload image: ${error.message || 'Unknown error'}`);
  } finally {
    setIsUploading(false);
  }
};
 const handleAddNewOrder = async () => {
  // Input validation
  if (
    !orderDetails.item_name ||
    !orderDetails.item_price ||
    !orderDetails.item_discount
  ) {
    Toast.show({
      type: 'error',
      text1: 'Validation Error',
      text2: 'Please fill in all required fields',
      position: 'bottom',
    });
    return;
  }

  if (isUploading) {
    Toast.show({
      type: 'info',
      text1: 'Please wait',
      text2: 'Image is still uploading...',
      position: 'bottom',
    });
    return;
  }

  try {
    const customerId = await AsyncStorage.getItem('customerId');
    if (!customerId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Customer ID not found',
        position: 'bottom',
      });
      return;
    }

    let imageUrl = editingOrderItem?.item_image;

    // Upload new image if selected
    if (image) {
      try {
        imageUrl = await uploadImageToS3(image);
        Toast.show({
          type: 'success',
          text1: 'Image uploaded successfully',
          position: 'bottom',
        });
      } catch (uploadError: any) {
        console.error('Image upload failed:', uploadError);
        Toast.show({
          type: 'error',
          text1: 'Upload Error',
          text2: uploadError.message || 'Failed to upload image',
          position: 'bottom',
        });
        return;
      }
    }

    // Prepare and validate order data
    const orderData = {
      item_name: orderDetails.item_name.trim(),
      item_price: parseFloat(orderDetails.item_price),
      item_discount: parseFloat(orderDetails.item_discount),
      item_image: imageUrl || null,
      cust_id: customerId,
    };

    // Validate numeric fields
    if (isNaN(orderData.item_price) || orderData.item_price <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid price',
        position: 'bottom',
      });
      return;
    }

    if (isNaN(orderData.item_discount) || orderData.item_discount < 0 || orderData.item_discount > 100) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid discount (0-100%)',
        position: 'bottom',
      });
      return;
    }

    console.log('Sending order data:', orderData);

    // Make API call with improved error handling
    try {
      let response;
      const apiConfig = {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      };

      if (editingOrderItem) {
        console.log('Updating order item:', editingOrderItem.item_id);
        const updateUrl = `${API_IP_ADDRESS}/api/v1/order-items/${customerId}/${editingOrderItem.item_id}`;
        console.log('Update URL:', updateUrl);
        
        response = await axios.put(updateUrl, orderData, apiConfig);
      } else {
        console.log('Creating new order item');
        const createUrl = `${API_IP_ADDRESS}/api/v1/order-items/${customerId}`;
        console.log('Create URL:', createUrl);
        
        response = await axios.post(createUrl, orderData, apiConfig);
      }

      console.log('API Response:', response.data);
      console.log('API Status:', response.status);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: editingOrderItem ? 'Order item updated successfully' : 'Order item added successfully',
        position: 'bottom',
      });

      // Reset form and close modal
      setOpened(false);
      setEditingOrderItem(null);
      setImage(null);
      setOrderDetails({
        item_name: '',
        item_price: '',
        item_discount: '',
      });
      
      // Refresh the order items list
      await fetchOrderItems(customerId);

    } catch (apiError: any) {
      console.error('API Error Details:', {
        message: apiError.message,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        url: apiError.config?.url,
        method: apiError.config?.method,
        requestData: orderData,
        headers: apiError.config?.headers,
      });

      let errorMessage = 'Failed to save order item';
      
      if (apiError.response?.status === 500) {
        errorMessage = 'Server error. Please check your backend logs and database connection.';
        console.error('Server returned 500 error. Backend logs needed.');
      } else if (apiError.response?.status === 400) {
        errorMessage = apiError.response?.data?.message || 'Invalid data provided. Check data format.';
      } else if (apiError.response?.status === 404) {
        errorMessage = 'API endpoint not found. Check your API URL.';
      } else if (apiError.response?.status === 401) {
        errorMessage = 'Unauthorized. Check your authentication.';
      } else if (apiError.response?.status === 403) {
        errorMessage = 'Forbidden. Check your permissions.';
      } else if (apiError.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please try again.';
      } else if (apiError.code === 'NETWORK_ERROR' || !apiError.response) {
        errorMessage = 'Network error. Check your connection and API server.';
      }

      Toast.show({
        type: 'error',
        text1: 'API Error',
        text2: errorMessage,
        position: 'bottom',
      });

      // If there's a detailed error message from backend, log it
      if (apiError.response?.data) {
        console.error('Backend error details:', apiError.response.data);
      }
    }

  } catch (generalError: any) {
    console.error('General error in handleAddNewOrder:', generalError);
    Toast.show({
      type: 'error',
      text1: 'Unexpected Error',
      text2: 'Something went wrong. Please try again.',
      position: 'bottom',
    });
  }
};
  const handleEdit = (orderItem: any) => {
    setOrderDetails({
      item_name: orderItem.item_name,
      item_price: orderItem.item_price,
      item_discount: orderItem.item_discount,
    });
    setEditingOrderItem(orderItem);
    setImage(null); // Reset image selection
    setOpened(true);
  };

  const handleAddNew = () => {
    setOrderDetails({
      item_name: '',
      item_price: '',
      item_discount: '',
    });
    setEditingOrderItem(null);
    setImage(null);
    setOpened(true);
  };

  const handleDelete = async (orderId: string) => {
    try {
      const customerId = await AsyncStorage.getItem('customerId');
      if (!customerId) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Customer ID not found',
          position: 'bottom',
        });
        return;
      }

      await axios.delete(
        `${API_IP_ADDRESS}/api/v1/order-items/${customerId}/${orderId}`,
      );
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Order item deleted successfully',
        position: 'bottom',
      });
      await fetchOrderItems(customerId);
    } catch (error) {
      console.error('Error deleting order item:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete order item',
        position: 'bottom',
      });
    }
  };

  const renderItem = ({item}: {item: any}) => (
    <View style={[styles.itemContainer, tw`bg-white shadow-sm`]}>
      <View style={styles.itemInfo}>
        {item.item_image && (
          <Image
            source={{uri: item.item_image}}
            style={styles.itemImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.itemDetails}>
          <Text style={styles.itemName}>{item.item_name}</Text>
          <Text style={styles.itemPrice}>Price: ₹{item.item_price}</Text>
          <Text style={styles.itemDiscount}>
            Discount: {item.item_discount}%
          </Text>
        </View>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          onPress={() => handleEdit(item)}
          style={[styles.actionButton, tw`bg-blue-500 mr-2`]}>
          <MaterialIcons name="edit" size={18} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item.item_id)}
          style={[styles.actionButton, tw`bg-red-500`]}>
          <MaterialIcons name="delete" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={tw`mt-2 text-gray-600`}>Loading order items...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-100`}>
      {/* Mobile Header */}
      {isMobile && !sidebarVisible && (
        <View style={tw`bg-gray-800 w-full flex-row items-center p-4`}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)}>
            <MaterialIcons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`ml-4 text-white text-lg font-semibold`}>
            Order Items
          </Text>
        </View>
      )}

      <Sidebar
        isMobile={isMobile}
        sidebarVisible={sidebarVisible}
        toggleSidebar={() => setSidebarVisible(!sidebarVisible)}
      />

      <View style={tw`flex-1 p-4`}>
        <View style={tw`flex-row justify-between items-center mb-4`}>
          <Text style={tw`text-2xl font-bold text-gray-800`}>Order Items</Text>
          <TouchableOpacity
            onPress={handleAddNew}
            style={[styles.addButton, tw`bg-blue-500`]}>
            <MaterialIcons name="add" size={20} color="white" />
            <Text style={tw`text-white ml-2`}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {orderItems.length > 0 ? (
          <FlatList
            data={orderItems}
            keyExtractor={item => item.item_id}
            renderItem={renderItem}
            contentContainerStyle={tw`pb-4`}
            ItemSeparatorComponent={() => <View style={tw`h-2`} />}
          />
        ) : (
          <View style={tw`flex-1 justify-center items-center`}>
            <Text style={tw`text-gray-500 text-lg`}>No order items found</Text>
            <TouchableOpacity
              onPress={handleAddNew}
              style={[styles.addButton, tw`bg-blue-500 mt-4`]}>
              <Text style={tw`text-white`}>Add Your First Item</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        visible={opened}
        onRequestClose={() => setOpened(false)}
        transparent
        animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {editingOrderItem ? 'Edit Order Item' : 'Add New Order Item'}
            </Text>

            <TextInput
              placeholder="Item Name"
              value={orderDetails.item_name}
              onChangeText={text =>
                setOrderDetails({...orderDetails, item_name: text})
              }
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
            
            <TextInput
              placeholder="Item Price"
              value={orderDetails.item_price}
              onChangeText={text =>
                setOrderDetails({...orderDetails, item_price: text})
              }
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
            
            <TextInput
              placeholder="Item Discount (%)"
              value={orderDetails.item_discount}
              onChangeText={text =>
                setOrderDetails({ ...orderDetails, item_discount: text })
              }
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              onPress={selectImage}
              style={[styles.addButton, tw`bg-blue-500 mb-4`]}
              disabled={isUploading}>
              <MaterialIcons 
                name="photo-camera" 
                size={20} 
                color="white" 
                style={tw`mr-2`} 
              />
              <Text style={tw`text-white`}>
                {image ? 'Change Image' : 
                 editingOrderItem?.item_image ? 'Update Image' : 'Select Image'}
              </Text>
            </TouchableOpacity>

            {/* Show current image or selected image */}
            {(image?.uri || editingOrderItem?.item_image) && (
              <View style={tw`items-center mb-4`}>
                <Image
                  source={{uri: image?.uri || editingOrderItem?.item_image}}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                {image && (
                  <Text style={tw`text-sm text-gray-600 mt-2`}>
                    New image selected
                  </Text>
                )}
              </View>
            )}

            {/* Upload progress indicator */}
            {isUploading && (
              <View style={tw`items-center mb-4`}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={tw`text-sm text-gray-600 mt-2`}>
                  Uploading image...
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setOpened(false);
                  setImage(null);
                }}
                style={[styles.button, tw`bg-gray-300 mr-2`]}
                disabled={isUploading}>
                <Text style={tw`text-gray-800`}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleAddNewOrder}
                style={[
                  styles.button, 
                  tw`bg-blue-500`,
                  isUploading && tw`opacity-50`
                ]}
                disabled={isUploading}>
                <Text style={tw`text-white`}>
                  {isUploading ? 'Processing...' : 
                   editingOrderItem ? 'Update' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#1F2937',
  },
  itemPrice: {
    fontSize: 14,
    color: '#4B5563',
  },
  itemDiscount: {
    fontSize: 14,
    color: '#EF4444',
  },
  itemActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    color: '#1F2937',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 80,
  },
});

export default OrderItems;