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
import { PutObjectCommand } from '@aws-sdk/client-s3';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

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
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState<{ [key: string]: boolean }>({});
  const [orderDetails, setOrderDetails] = useState({
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

  const selectImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
      });

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const normalizedUri = asset.uri; // Keep file:// for local images
        const filePath = normalizedUri.replace('file://', '');
        const uriExists = await RNFS.exists(filePath);
        console.log('Selected image:', {
          uri: normalizedUri,
          type: asset.type,
          fileSize: asset.fileSize,
          fileName: asset.fileName,
          uriExists,
        });
        if (!uriExists) {
          throw new Error('Selected image file is inaccessible');
        }
        setImage({ ...asset, uri: normalizedUri });
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to select image. Please try again.',
        position: 'bottom',
      });
    }
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
      const base64Data = await RNFS.readFile(filePath, 'base64');
      const fileBuffer = Buffer.from(base64Data, 'base64');

      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: fileBuffer,
        ContentType: imageAsset.type || 'image/jpeg',
        Metadata: {
          'original-name': imageAsset.fileName || 'unknown',
          'upload-timestamp': new Date().toISOString(),
          'app-version': 'react-native',
        },
      });

      await s3.send(uploadCommand);
      const s3Url = `https://${bucketName}.s3.amazonaws.com/${fileName}`;
      return s3Url;
    } catch (error: any) {
      console.error('S3 Upload Error:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Upload Error',
        text2: error.message || 'Failed to upload image.',
        position: 'bottom',
      });
      return 'https://via.placeholder.com/120';
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddNewOrder = async () => {
    if (!orderDetails.item_name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Item name is required.',
        position: 'bottom',
      });
      return;
    }

    const price = parseFloat(orderDetails.item_price);
    if (isNaN(price) || price <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid price greater than 0.',
        position: 'bottom',
      });
      return;
    }

    const discount = parseFloat(orderDetails.item_discount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid discount (0-100%).',
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
          text2: 'Customer ID not found. Please log in again.',
          position: 'bottom',
        });
        return;
      }

      let imageUrl = 'https://via.placeholder.com/120';
      if (image) {
        imageUrl = await uploadImageToS3(image);
      }

      const orderData = {
        item_name: orderDetails.item_name.trim(),
        item_price: price,
        item_discount: discount,
        item_image: imageUrl,
        cust_id: customerId,
      };

      const createUrl = `${API_IP_ADDRESS}/api/v1/order-items/${customerId}`;
      let response;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          response = await axios.post(createUrl, orderData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
          });
          break;
        } catch (error: any) {
          attempts++;
          if (attempts === maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Order item added successfully.',
        position: 'bottom',
      });

      setOpened(false);
      setEditingOrderItem(null);
      setImage(null);
      setOrderDetails({
        item_name: '',
        item_price: '',
        item_discount: '',
      });
      await fetchOrderItems(customerId);
    } catch (apiError: any) {
      console.error('API Error:', apiError.message);
      let errorMessage = 'Failed to save order item. Please try again.';
      if (apiError.response?.status === 500) {
        errorMessage = apiError.response?.data?.error || 'Server error.';
      } else if (apiError.response?.status === 400) {
        errorMessage = apiError.response?.data?.error || 'Invalid data provided.';
      } else if (apiError.response?.status === 404) {
        errorMessage = 'API endpoint not found.';
      } else if (apiError.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out.';
      } else if (apiError.code === 'NETWORK_ERROR' || !apiError.response) {
        errorMessage = 'Network error. Check your connection.';
      }

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
        position: 'bottom',
      });
    }
  };

  const handleUpdateOrder = async () => {
    if (!orderDetails.item_name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Item name is required.',
        position: 'bottom',
      });
      return;
    }

    const price = parseFloat(orderDetails.item_price);
    if (isNaN(price) || price <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid price greater than 0.',
        position: 'bottom',
      });
      return;
    }

    const discount = parseFloat(orderDetails.item_discount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid discount (0-100%).',
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
      if (!customerId || !editingOrderItem?.item_id) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Customer ID or Item ID not found.',
          position: 'bottom',
        });
        return;
      }

      let imageUrl = editingOrderItem.item_image || 'https://via.placeholder.com/120';
      if (image) {
        imageUrl = await uploadImageToS3(image);
      }

      const orderData = {
        item_name: orderDetails.item_name.trim(),
        item_price: price,
        item_discount: discount,
        item_image: imageUrl,
      };

      const updateUrl = `${API_IP_ADDRESS}/api/v1/order-items/${customerId}/${editingOrderItem.item_id}`;
      const response = await axios.put(updateUrl, orderData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Order item updated successfully.',
        position: 'bottom',
      });

      setOpened(false);
      setEditingOrderItem(null);
      setImage(null);
      setOrderDetails({
        item_name: '',
        item_price: '',
        item_discount: '',
      });
      await fetchOrderItems(customerId);
    } catch (apiError: any) {
      console.error('API Error:', apiError.message);
      let errorMessage = 'Failed to update order item. Please try again.';
      if (apiError.response?.status === 500) {
        errorMessage = apiError.response?.data?.error || 'Server error.';
      } else if (apiError.response?.status === 400) {
        errorMessage = apiError.response?.data?.error || 'Invalid data provided.';
      } else if (apiError.response?.status === 404) {
        errorMessage = 'API endpoint not found.';
      } else if (apiError.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out.';
      } else if (apiError.code === 'Error' || !apiError.response) {
        errorMessage = 'Network error. Check your connection.';
      }

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
        position: 'bottom',
      });
    }
  };

  const handleEdit = (orderItem: any) => {
    try {
      setOrderDetails({
        item_name: orderItem.item_name || '',
        item_price: orderItem.item_price?.toString() || '',
        item_discount: orderItem.item_discount?.toString() || '',
      });
      setEditingOrderItem(orderItem);
      setImage(null);
      setOpened(true);
    } catch (error) {
      console.error('Error handling edit:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load item for editing.',
        position: 'bottom',
      });
    }
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

  const renderItem = ({ item }: { item: any }) => {
    const isValidImage = item.item_image && !item.item_image.includes('placeholder.com');
    return (
      <View style={[styles.itemContainer, tw`bg-white shadow-sm`]}>
        <View style={styles.itemInfo}>
          {isValidImage ? (
            <>
              {imageLoading[item.item_id] && (
                <ActivityIndicator
                  size="small"
                  color="#3B82F6"
                  style={styles.itemImage}
                />
              )}
              <Image
                source={{ uri: `${item.item_image}?t=${Date.now()}` }}
                style={[styles.itemImage, imageLoading[item.item_id] && { display: 'none' }]}
                resizeMode="cover"
                onLoadStart={() => setImageLoading(prev => ({ ...prev, [item.item_id]: true }))}
                onLoadEnd={() => setImageLoading(prev => ({ ...prev, [item.item_id]: false }))}
                onError={(error) => {
                  console.error('Image load error for', item.item_id, ':', error.nativeEvent);
                  Toast.show({
                    type: 'error',
                    text1: 'Image Error',
                    text2: `Failed to load image for ${item.item_name}`,
                    position: 'bottom',
                  });
                }}
              />
            </>
          ) : (
            <View style={styles.itemImagePlaceholder}>
              <Text style={tw`text-gray-500 text-sm`}>No Image</Text>
            </View>
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
  };

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
        }}
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
                setOrderDetails({ ...orderDetails, item_name: text })
              }
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              placeholder="Item Price"
              value={orderDetails.item_price}
              onChangeText={text =>
                setOrderDetails({ ...orderDetails, item_price: text })
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
              <Text style={tw`text-white`}>{image ? 'Change Image' : 'Select Image'}</Text>
            </TouchableOpacity>

            {(() => {
              const previewUri = image?.uri || (editingOrderItem?.item_image && !editingOrderItem.item_image.includes('placeholder.com') ? editingOrderItem.item_image : 'https://via.placeholder.com/120');
              const imageSource = previewUri.startsWith('file://') 
                ? { uri: previewUri } 
                : { uri: `${previewUri}?t=${Date.now()}` };
              return previewUri && (
                <View style={tw`items-center mb-4`}>
                  {isPreviewLoading && (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  )}
                  <Image
                    source={imageSource}
                    style={[styles.previewImage, isPreviewLoading && { display: 'none' }]}
                    resizeMode="contain"
                    key={previewUri}
                    onLoadStart={() => {
                      Image.prefetch(previewUri).catch(() => {});
                      setIsPreviewLoading(true);
                    }}
                    onLoadEnd={() => setIsPreviewLoading(false)}
                    onError={(error) => {
                      console.error('Modal image load error:', {
                        error: error.nativeEvent,
                        uri: previewUri,
                        isLocalUri: previewUri.startsWith('file://') || !previewUri.includes('http'),
                        isEditing: !!editingOrderItem,
                        source: image ? 'newly selected' : editingOrderItem ? 'existing item' : 'placeholder',
                      });
                      setIsPreviewLoading(false);
                      Toast.show({
                        type: 'error',
                        text1: 'Image Error',
                        text2: 'Failed to load preview image.',
                        position: 'bottom',
                      });
                    }}
                  />
                  {image && (
                    <Text style={tw`text-sm text-gray-600 mt-2`}>
                      New image selected
                    </Text>
                  )}
                </View>
              );
            })()}

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
                }}
                style={[styles.button, tw`bg-gray-300 mr-2`]}
                disabled={isUploading}>
                <Text style={tw`text-gray-800`}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={editingOrderItem ? handleUpdateOrder : handleAddNewOrder}
                style={[styles.button, tw`bg-blue-500`, isUploading && tw`opacity-50`]}
                disabled={isUploading}>
                <Text style={tw`text-white`}>{isUploading ? 'Processing...' : editingOrderItem ? 'Update' : 'Add'}</Text>
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
  itemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
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
    borderWidth: 1,
    borderColor: '#D1D5DB',
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingHorizontal: 8,
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