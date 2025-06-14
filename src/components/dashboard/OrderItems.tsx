import React, { useEffect, useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import Sidebar from './Sidebar';
import axios from 'axios';
import { API_IP_ADDRESS } from '../../../config';
import Toast from 'react-native-toast-message';
import { launchImageLibrary } from 'react-native-image-picker';
import { bucketName, s3 } from '../../services/s3';
import { Asset } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { PutObjectCommand } from '@aws-sdk/client-s3';

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
  const [errors, setErrors] = useState({
    item_name: '',
    item_price: '',
    item_discount: '',
  });
 
  useEffect(() => {
    const updateLayout = () => {
      const { width } = Dimensions.get('window');
      setIsMobile(width < 768);
    };
    updateLayout();
    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => subscription.remove();
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
            text2: 'Customer ID not found. Please log in again.',
            position: 'bottom',
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load order items. Please try again.',
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
        { timeout: 30000 }
      );
      setOrderItems(response.data || []);
    } catch (error: any) {
      console.error('Error fetching order items:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch order items. Please try again.',
        position: 'bottom',
      });
      throw error;
    }
  };

  const selectImage = () => {
    launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
    }, (response) => {
      if (response.assets && response.assets[0]) {
        setImage(response.assets[0]);
      }
    });
  };

 const uploadImageToS3 = async (imageAsset: Asset): Promise<string> => {
  try {
    setIsUploading(true);
    if (!imageAsset.uri) throw new Error('Image URI is missing');
    if (!bucketName) throw new Error('S3 bucket name is not configured');

    const fileExtension = imageAsset.type?.split('/')[1] || 'jpg';
    const fileName = `order_item_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}.${fileExtension}`;

    const filePath = imageAsset.uri.replace('file://', '');
    
    // Check if file exists
    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      throw new Error('Selected image file does not exist');
    }

    // Read file as base64
    const base64Data = await RNFS.readFile(filePath, 'base64');
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // Create the upload command
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: imageAsset.type || 'image/jpeg',
      // ACL: 'public-read', // Make sure the image is publicly accessible
      Metadata: {
        'original-name': imageAsset.fileName || 'unknown',
        'upload-timestamp': new Date().toISOString(),
        'app-version': 'react-native',
      },
    });

    // Upload to S3
    const response = await s3.send(uploadCommand);
    console.log('S3 Upload successful:', response);

    // Construct the S3 URL
    const s3Url = `http://${bucketName}.s3.amazonaws.com/${fileName}`;
    
    // Verify the URL is accessible (optional)
    console.log('Uploaded image URL:', s3Url);
    
    return s3Url;
  } catch (error: any) {
    console.error('S3 Upload Error:', error);
    
    // More detailed error logging
    if (error.name === 'NetworkError') {
      console.error('Network error during upload');
    } else if (error.name === 'CredentialsError') {
      console.error('AWS credentials error');
    } else if (error.name === 'AccessDenied') {
      console.error('Access denied to S3 bucket');
    }
    
    Toast.show({
      type: 'error',
      text1: 'Upload Error',
      text2: error.message || 'Failed to upload image to S3.',
      position: 'bottom',
    });
    
    // Return a placeholder URL instead of throwing
    return 'https://via.placeholder.com/120';
  } finally {
    setIsUploading(false);
  }
};

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      item_name: '',
      item_price: '',
      item_discount: '',
    };

    // Item Name Validation
    if (!orderDetails.item_name.trim()) {
      newErrors.item_name = 'Item name is required';
      isValid = false;
    } else if (orderDetails.item_name.length < 2) {
      newErrors.item_name = 'Item name must be at least 2 characters';
      isValid = false;
    } else if (orderDetails.item_name.length > 100) {
      newErrors.item_name = 'Item name cannot exceed 100 characters';
      isValid = false;
    }

    // Item Price Validation
    const price = parseFloat(orderDetails.item_price);
    if (!orderDetails.item_price) {
      newErrors.item_price = 'Item price is required';
      isValid = false;
    } else if (isNaN(price)) {
      newErrors.item_price = 'Item price must be a valid number';
      isValid = false;
    } else if (price <= 0) {
      newErrors.item_price = 'Item price must be greater than 0';
      isValid = false;
    } else if (price > 1000000) {
      newErrors.item_price = 'Item price cannot exceed 1,000,000';
      isValid = false;
    }

    // Item Discount Validation
    const discount = parseFloat(orderDetails.item_discount);
    if (!orderDetails.item_discount) {
      newErrors.item_discount = 'Item discount is required';
      isValid = false;
    } else if (isNaN(discount)) {
      newErrors.item_discount = 'Item discount must be a valid number';
      isValid = false;
    } else if (discount < 0) {
      newErrors.item_discount = 'Item discount cannot be negative';
      isValid = false;
    } else if (discount > 100) {
      newErrors.item_discount = 'Item discount cannot exceed 100%';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAddNewOrder = async () => {
    if (!validateForm()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please correct the errors in the form',
        position: 'bottom',
      });
      return;
    }

    try {
      setIsUploading(true);
      
      let imageUrl = editingOrderItem?.item_image; // If editing, keep the old image URL

      if (image) {
        // If a new image is uploaded, upload it to S3
        imageUrl = await uploadImageToS3(image);
      }

      const customerId = await AsyncStorage.getItem('customerId');
      if (!customerId) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Customer ID not found in storage',
          position: 'bottom',
        });
        return;
      }

      const newOrder = {
        item_name: orderDetails.item_name,
        item_price: orderDetails.item_price,
        item_discount: orderDetails.item_discount,
        item_image: imageUrl, // Use the existing or new image URL
        cust_id: customerId,
      };

      if (editingOrderItem) {
        // If editing, send PUT request with updated image URL
        const response = await axios.put(
          `${API_IP_ADDRESS}/api/v1/order-items/${customerId}/${editingOrderItem.item_id}`,
          newOrder,
          { timeout: 30000 }
        );
        if (response.status === 200) {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Order item updated successfully!',
            position: 'bottom',
          });
        }
      } else {
        // If new order item, send POST request
        const response = await axios.post(
          `${API_IP_ADDRESS}/api/v1/order-items/${customerId}`,
          newOrder,
          { timeout: 30000 }
        );
        if (response.status === 200) {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Order item added successfully!',
            position: 'bottom',
          });
        }
      }

      setOpened(false);
      setEditingOrderItem(null);
      setImage(null);
      setOrderDetails({
        item_name: '',
        item_price: '',
        item_discount: '',
      });
      setErrors({
        item_name: '',
        item_price: '',
        item_discount: '',
      });

      // Refresh the order items list
      await fetchOrderItems(customerId);
    } catch (error: any) {
      console.error('Error saving order item:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An error occurred while adding or updating the order item.',
        position: 'bottom',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (orderItem: any) => {
    setOrderDetails({
      item_name: orderItem.item_name,
      item_price: orderItem.item_price.toString(),
      item_discount: orderItem.item_discount.toString(),
    });
    setEditingOrderItem(orderItem);
    setImage(null);
    setErrors({
      item_name: '',
      item_price: '',
      item_discount: '',
    });
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
    setErrors({
      item_name: '',
      item_price: '',
      item_discount: '',
    });
    setOpened(true);
  };

  const handleDelete = async (orderId: string) => {
    try {
      const customerId = await AsyncStorage.getItem('customerId');
      if (!customerId) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Customer ID not found. Please log in again.',
          position: 'bottom',
        });
        return;
      }

      await axios.delete(
        `${API_IP_ADDRESS}/api/v1/order-items/${customerId}/${orderId}`,
        { timeout: 30000 }
      );
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Order item deleted successfully.',
        position: 'bottom',
      });
      await fetchOrderItems(customerId);
    } catch (error: any) {
      console.error('Error deleting order item:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete order item. Please try again.',
        position: 'bottom',
      });
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.itemContainer, tw`bg-white shadow-sm`]}>
      <View style={styles.itemInfo}>
        <Image
          source={{ uri: item.item_image }}
          style={styles.itemImage}
          resizeMode="cover"
        />
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
      <View style={tw`flex-1 justify-center items-center bg-gray-100`}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={tw`mt-2 text-gray-600`}>Loading order items...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-100`}>
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
            keyExtractor={item => item.item_id.toString()}
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
        onRequestClose={() => {
          setOpened(false);
          setImage(null);
          setOrderDetails({ item_name: '', item_price: '', item_discount: '' });
          setErrors({ item_name: '', item_price: '', item_discount: '' });
        }}
        transparent
        animationType="slide"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={80}
        >
          <View style={styles.modalContainer}>
            <ScrollView
              contentContainerStyle={{ paddingBottom: 30 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>
                {editingOrderItem ? 'Edit Order Item' : 'Add New Order Item'}
              </Text>

              <View>
                <TextInput
                  placeholder="Item Name"
                  value={orderDetails.item_name}
                  onChangeText={text =>
                    setOrderDetails({ ...orderDetails, item_name: text })
                  }
                  style={[styles.input, errors.item_name && styles.inputError]}
                  placeholderTextColor="#9CA3AF"
                />
                {errors.item_name && (
                  <Text style={styles.errorText}>{errors.item_name}</Text>
                )}
              </View>

              <View>
                <TextInput
                  placeholder="Item Price"
                  value={orderDetails.item_price}
                  onChangeText={text =>
                    setOrderDetails({ ...orderDetails, item_price: text })
                  }
                  keyboardType="numeric"
                  style={[styles.input, errors.item_price && styles.inputError]}
                  placeholderTextColor="#9CA3AF"
                />
                {errors.item_price && (
                  <Text style={styles.errorText}>{errors.item_price}</Text>
                )}
              </View>

              <View>
                <TextInput
                  placeholder="Item Discount (%)"
                  value={orderDetails.item_discount}
                  onChangeText={text =>
                    setOrderDetails({ ...orderDetails, item_discount: text })
                  }
                  keyboardType="numeric"
                  style={[styles.input, errors.item_discount && styles.inputError]}
                  placeholderTextColor="#9CA3AF"
                />
                {errors.item_discount && (
                  <Text style={styles.errorText}>{errors.item_discount}</Text>
                )}
              </View>

              <TouchableOpacity
                onPress={selectImage}
                style={[styles.addButton, tw`bg-blue-500 mb-4`]}
                disabled={isUploading}
              >
                <MaterialIcons
                  name="photo-camera"
                  size={20}
                  color="white"
                  style={tw`mr-2`}
                />
                <Text style={tw`text-white`}>
                  {image ? 'Change Image' : 'Select Image'}
                </Text>
              </TouchableOpacity>

              {/* Show current image when editing */}
              {editingOrderItem && editingOrderItem.item_image && !image && (
                <View style={tw`items-center mb-4`}>
                  <Text style={tw`text-sm text-gray-600 mb-2`}>Current Image:</Text>
                  <Image
                    source={{ uri: editingOrderItem.item_image }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* Show selected image preview */}
              {image && (
                <View style={tw`items-center mb-4`}>
                  <Text style={tw`text-sm text-gray-600 mb-2`}>Selected Image:</Text>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                </View>
              )}

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
                    setOrderDetails({ item_name: '', item_price: '', item_discount: '' });
                    setErrors({ item_name: '', item_price: '', item_discount: '' });
                  }}
                  style={[styles.button, tw`bg-gray-300 mr-2`]}
                  disabled={isUploading}
                >
                  <Text style={tw`text-gray-800`}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAddNewOrder}
                  style={[styles.button, tw`bg-blue-500`, isUploading && tw`opacity-50`]}
                  disabled={isUploading}
                >
                  <Text style={tw`text-white`}>
                    {isUploading ? 'Processing...' : editingOrderItem ? 'Update' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    backgroundColor: '#fff',
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
    backgroundColor: '#f0f0f0',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
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
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    maxHeight: '80%',
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
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 8,
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