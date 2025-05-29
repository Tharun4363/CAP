import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';

import { useNavigation } from '@react-navigation/native';
import { API_IP_ADDRESS } from '../../../config';
import Toast from 'react-native-toast-message';

interface AIContentData {
  [key: string]: any;
  ai2human_generated_text_1: string;
  ai2human_generated_text_10: string;
  ai_generated_tagline_arg1: string;
  ai_generated_tagline_arg2: string;
  ai_generated_tagline_arg3: string;
  ai_generated_tagline_arg4: string;
  ai_generated_tagline_arg5: string;
}

type UpdateAIContentModalProps = {
  visible: boolean;
  onClose: () => void;
};

const UpdateAIContentModal = ({ visible, onClose }: UpdateAIContentModalProps) => {
  const navigation = useNavigation();
  const [data, setData] = useState<AIContentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [initialFetched, setInitialFetched] = useState(false);

  useEffect(() => {
    fetchCustomerId();
  }, []);

  const fetchCustomerId = async () => {
    try {
      setLoading(true);
      const custId = await AsyncStorage.getItem('customerId');
      if (custId) {
        setCustomerId(custId);
        fetchCategoryId(custId);
      } else {
        Alert.alert('Customer ID not found in storage. Please login again.');
      }
    } catch (error) {
      console.error('Error fetching customer ID from storage:', error);
      Alert.alert('Error retrieving customer information.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryId = async (custId: any) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_IP_ADDRESS}/api/get-category-id?cust_id=${encodeURIComponent(custId)}`
      );
      const result = await response.json();

      if (response.ok && result.category_id) {
        setCategoryId(result.category_id);
        fetchContentWithIds(custId, result.category_id);
      } else {
        setLoading(false);
        Alert.alert('Category ID not found for this customer.');
      }
    } catch (error) {
      setLoading(false);
      console.error('Error fetching category ID:', error);
      Alert.alert('Error retrieving category information.');
    }
  };

  const fetchContentWithIds = async (custId: string, catId: string) => {
    try {
      const response = await fetch(
        `${API_IP_ADDRESS}/get-ai-content?cust_id=${encodeURIComponent(
          custId
        )}&category_id=${encodeURIComponent(catId)}`
      );
      const result = await response.json();

      if (result?.row) {
        setData(result.row);
        setInitialFetched(true);
      } else {
        Alert.alert('No content data found for this customer.');
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      Alert.alert('Error retrieving content data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchContent = () => {
    if (customerId && categoryId) {
      setLoading(true);
      fetch(
        `${API_IP_ADDRESS}/get-ai-content?cust_id=${encodeURIComponent(
          customerId
        )}&category_id=${encodeURIComponent(categoryId)}`
      )
        .then(res => res.json())
        .then(result => {
          if (result?.row) {
            setData(result.row);
            setInitialFetched(true);
            Toast.show({
              type: 'success',
              text1: 'Success',
              text2: 'Content fetched successfully',
              position: 'bottom',
            });
          } else {
            setData(null);
            Toast.show({
              type: 'info',
              text1: 'No data found',
              text2: 'No data found for this Customer ID.',
              position: 'bottom',
            });
          }
        })
        .catch(err => {
          console.error(err);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Error fetching data.',
            position: 'bottom',
          });
        })
        .finally(() => setLoading(false));
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please ensure Customer ID and Category ID are available',
        position: 'bottom',
      });
    }
  };

  const handleChange = (field: keyof AIContentData, value: string) => {
    setData(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSubmit = () => {
    if (data && categoryId && customerId) {
      setLoading(true);
      fetch(`${API_IP_ADDRESS}/update-ai-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, category_id: categoryId, ...data }),
      })
        .then(res => res.json())
        .then(result => {
          if (result.message === 'Update successful') {
            Toast.show({
              type: 'success',
              text1: 'Success',
              text2: 'Content updated successfully',
              position: 'bottom',
            });
            navigation.goBack();
            onClose();
          } else {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Update failed: ' + (result.message || 'Unknown error'),
              position: 'bottom',
            });
            navigation.goBack();
            onClose();
          }
        })
        .catch(err => {
          console.error(err);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Update failed due to network error',
            position: 'bottom',
          });
        })
        .finally(() => setLoading(false));
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Missing customer ID, category ID, or content data',
        position: 'bottom',
      });
    }
  };

  useEffect(() => {
    if (!visible) {
      setInitialFetched(false);
      setData(null);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView
        style={tw`bg-white px-6 pt-8`}
        contentContainerStyle={tw`pb-16`}>
        {/* Header */}
        <View style={tw`flex-row items-center justify-between mb-6`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`flex-row items-center px-3 py-2 rounded-full bg-gray-100`}>
            <Ionicons name="arrow-back" size={20} color="#3b82f6" />
            <Text style={tw`ml-2 text-blue-600 font-medium`}>Back</Text>
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold text-gray-800`}>Update Content</Text>
          <View style={tw`w-10`} />
        </View>

        {loading ? (
          <View style={tw`items-center justify-center py-10`}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={tw`mt-4 text-gray-500 text-base`}>
              Loading content...
            </Text>
          </View>
        ) : (
          <>
            {!initialFetched && (
              <>
                {/* Customer ID */}
                <View style={tw`mb-5`}>
                  <Text style={tw`text-sm text-gray-700 font-semibold mb-1`}>
                    Customer ID
                  </Text>
                  <TextInput
                    value={customerId}
                    onChangeText={setCustomerId}
                    placeholder="Enter Customer ID"
                    editable={false}
                    style={tw`bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-gray-800`}
                  />
                </View>

                {/* Category ID */}
                <View style={tw`mb-5`}>
                  <Text style={tw`text-sm text-gray-700 font-semibold mb-1`}>
                    Category ID
                  </Text>
                  <TextInput
                    value={categoryId}
                    onChangeText={setCategoryId}
                    placeholder="Auto-fetched"
                    editable={false}
                    style={tw`bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-gray-800`}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleFetchContent}
                  style={tw`bg-green-500 py-3 rounded-xl mt-2`}>
                  <Text style={tw`text-white text-center text-base font-semibold`}>
                    Refresh Content
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Content Fields */}
            {initialFetched && data && (
              <View style={tw`mt-2`}>
                {[
                  { key: 'ai2human_generated_text_1', label: 'Landing Image' },
                  { key: 'ai2human_generated_text_10', label: 'About Us' },
                ].map(({ key, label }) => (
                  <View key={key} style={tw`mb-5`}>
                    <Text style={tw`text-sm text-gray-700 font-semibold mb-1`}>
                      {label}
                    </Text>
                    <TextInput
                      multiline
                      numberOfLines={4}
                      value={data[key]}
                      onChangeText={text => handleChange(key, text)}
                      style={tw`border border-gray-300 rounded-xl px-4 py-3 text-gray-800 h-32`}
                    />
                  </View>
                ))}

                {Array.from({ length: 5 }, (_, i) => {
                  const field = `ai_generated_tagline_arg${i + 1}` as keyof typeof data;
                  return (
                    <View key={field} style={tw`mb-5`}>
                      <Text style={tw`text-sm text-gray-700 font-semibold mb-1`}>
                        Tagline {i + 1}
                      </Text>
                      <TextInput
                        value={data[field]}
                        onChangeText={text => handleChange(field, text)}
                        style={tw`border border-gray-300 rounded-xl px-4 py-3 text-gray-800`}
                      />
                    </View>
                  );
                })}

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={loading}
                  style={tw`bg-blue-600 py-3 rounded-xl mt-4`}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={tw`text-white text-center text-base font-semibold`}>
                      Update
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Modal>
  );
};

export default UpdateAIContentModal;
