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

const OrderItems = () => {
  const navigation = useNavigation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [editingOrderItem, setEditingOrderItem] = useState<any>(null);
  const [image, setImage] = useState<Asset | null>(null);
  const [opened, setOpened] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

    // return () => Dimensions('change', updateLayout);
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

  const selectImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });
      if (result.assets && result.assets[0]) {
        setImage(result.assets[0]);
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

  const handleAddNewOrder = async () => {
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

      if (image) {
        const fileName = `order_item_${Date.now()}.${
          image.type?.split('/')[1] || 'jpg'
        }`;
        const uploadParams = {
          Bucket: bucketName,
          Key: fileName,
          Body: image,
          ContentType: image.type,
        };

        const uploadResult = await s3.upload(uploadParams).promise();
        imageUrl = uploadResult.Location;
      }

      const orderData = {
        ...orderDetails,
        item_image: imageUrl,
        cust_id: customerId,
      };

      if (editingOrderItem) {
        await axios.put(
          `${API_IP_ADDRESS}/api/v1/order-items/${customerId}/${editingOrderItem.item_id}`,
          orderData,
        );
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Order item updated successfully',
          position: 'bottom',
        });
      } else {
        await axios.post(
          `${API_IP_ADDRESS}/api/v1/order-items/${customerId}`,
          orderData,
        );
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Order item added successfully',
          position: 'bottom',
        });
      }

      setOpened(false);
      setEditingOrderItem(null);
      setImage(null);
      setOrderDetails({
        item_name: '',
        item_price: '',
        item_discount: '',
      });
      fetchOrderItems(customerId);
    } catch (error) {
      console.error('Error saving order item:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save order item',
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
      fetchOrderItems(customerId);
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
          onPress={() => handleDelete(item)}
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
            style={[styles.addButton, tw`bg-green-600`]}>
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
              style={[styles.addButton, tw`bg-green-600 mt-4`]}>
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
              placeholderTextColor="black"
            />
            <TextInput
              placeholder="Item Price"
              value={orderDetails.item_price}
              onChangeText={text =>
                setOrderDetails({...orderDetails, item_price: text})
              }
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor="black"
            />
            <TextInput
              placeholder="Item Discount (%)"
              value={orderDetails.item_discount}
              onChangeText={text =>
                setOrderDetails({...orderDetails, item_discount: text})
              }
              keyboardType="numeric"
              style={[styles.input, tw`placeholder-black`]}
              placeholderTextColor="black"
            />

            <TouchableOpacity
              onPress={selectImage}
              style={[styles.addButton, tw`bg-blue-600 mb-4`]}>
              <Text style={tw`text-white`}>
                {image || editingOrderItem?.item_image
                  ? 'Change Image'
                  : 'Select Image'}
              </Text>
            </TouchableOpacity>

            {(image || editingOrderItem?.item_image) && (
              <Image
                source={{uri: image?.uri || editingOrderItem?.item_image}}
                style={[styles.itemImage, tw`self-center mb-4`]}
                resizeMode="contain"
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setOpened(false)}
                style={[styles.button, tw`bg-gray-300 mr-2`]}>
                <Text style={tw`text-gray-800`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddNewOrder}
                style={[styles.button, tw`bg-green-600`]}>
                <Text style={tw`text-white`}>
                  {editingOrderItem ? 'Update' : 'Add'}
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
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
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
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937',
  },

  input: {
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    color: '#1F2937',
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
});

export default OrderItems;
