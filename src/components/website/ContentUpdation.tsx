import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';

import {API_IP_ADDRESS} from '../../../config';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';

interface AIContentData {
  ai2human_generated_text_1: string;
  ai2human_generated_text_10: string;
  ai_generated_tagline_arg1: string;
  ai_generated_tagline_arg2: string;
  ai_generated_tagline_arg3: string;
  ai_generated_tagline_arg4: string;
  ai_generated_tagline_arg5: string;
}

// Extend your props to include navigation props
type ScreenProps = NativeStackScreenProps<RootStackParamList>;
type UpdateAIContentModalProps = {
  visible: boolean;
  onClose: () => void;
};

const ContentUpdation = ({
  visible,
  onClose,
}: UpdateAIContentModalProps & ScreenProps) => {
  const [data, setData] = useState<AIContentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [initialFetched, setInitialFetched] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchCustomerId();
    }
  }, [visible]);

  const fetchCustomerId = async () => {
    try {
      const custId = await AsyncStorage.getItem('customerId');
      if (custId) {
        setCustomerId(custId);
        fetchCategoryId(custId);
      } else {
        alert('Customer ID not found in storage. Please login again.');
      }
    } catch (error) {
      console.error('Error fetching customer ID from storage:', error);
      alert('Error retrieving customer information.');
    }
  };

  const fetchCategoryId = async (custId: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_IP_ADDRESS}/api/get-category-id?cust_id=${encodeURIComponent(
          custId,
        )}`,
      );
      const result = await response.json();

      if (response.ok && result.category_id) {
        setCategoryId(result.category_id);
        fetchContentWithIds(custId, result.category_id);
      } else {
        setLoading(false);
        alert('Category ID not found for this customer.');
      }
    } catch (error) {
      setLoading(false);
      console.error('Error fetching category ID:', error);
      alert('Error retrieving category information.');
    }
  };

  const fetchContentWithIds = async (custId: string, catId: string) => {
    try {
      const response = await fetch(
        `${API_IP_ADDRESS}/get-ai-content?cust_id=${encodeURIComponent(
          custId,
        )}&category_id=${encodeURIComponent(catId)}`,
      );
      const result = await response.json();

      if (result?.row) {
        setData(result.row);
        setInitialFetched(true);
      } else {
        alert('No content data found for this customer.');
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      alert('Error retrieving content data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchContent = () => {
    if (customerId && categoryId) {
      setLoading(true);
      fetch(
        `${API_IP_ADDRESS}/get-ai-content?cust_id=${encodeURIComponent(
          customerId,
        )}&category_id=${encodeURIComponent(categoryId)}`,
      )
        .then(res => res.json())
        .then(result => {
          if (result?.row) {
            setData(result.row);
            setInitialFetched(true);
          } else {
            setData(null);
            alert('No data found for this Customer ID.');
          }
        })
        .catch(err => {
          console.error(err);
          alert('Error fetching data.');
        })
        .finally(() => setLoading(false));
    } else {
      alert('Please ensure Customer ID and Category ID are available');
    }
  };

  const handleChange = (field: keyof AIContentData, value: string) => {
    setData(prev => (prev ? {...prev, [field]: value} : null));
  };

  const handleSubmit = () => {
    if (data && categoryId && customerId) {
      setLoading(true);
      fetch(`${API_IP_ADDRESS}/update-ai-content`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({customerId, category_id: categoryId, ...data}),
      })
        .then(res => res.json())
        .then(result => {
          if (result.message === 'Update successful') {
            alert('Content updated successfully');
            onClose();
          } else {
            alert('Update failed: ' + (result.message || 'Unknown error'));
          }
        })
        .catch(err => {
          console.error(err);
          alert('Update failed due to network error');
        })
        .finally(() => setLoading(false));
    } else {
      alert('Missing customer ID, category ID, or content data');
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
      <ScrollView style={tw`bg-white p-4`} contentContainerStyle={tw`pb-12`}>
        <View style={tw`flex-row gap-8 items-center mb-4`}>
          <TouchableOpacity
            onPress={onClose}
            style={tw`flex-row items-center mb-4`}>
            <Ionicons name="arrow-back" size={24} color="black" />
            <Text style={tw`ml-2 text-lg`}>Close</Text>
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold mt-12`}>Update Content</Text>
        </View>

        {loading ? (
          <View style={tw`items-center justify-center py-10`}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={tw`mt-4 text-center text-gray-600`}>
              Loading content...
            </Text>
          </View>
        ) : (
          <>
            {!initialFetched && (
              <>
                <View style={tw`mb-4`}>
                  <Text style={tw`text-base font-semibold mb-2`}>
                    Customer ID
                  </Text>
                  <TextInput
                    value={customerId}
                    onChangeText={setCustomerId}
                    placeholder="Enter Customer ID"
                    style={tw`border border-gray-300 rounded-md p-2`}
                    editable={false}
                  />
                </View>
                <View style={tw`mb-4`}>
                  <Text style={tw`text-base font-semibold mb-2`}>
                    Category ID
                  </Text>
                  <TextInput
                    value={categoryId}
                    onChangeText={setCategoryId}
                    placeholder="Category ID will be fetched automatically"
                    style={tw`border border-gray-300 rounded-md p-2`}
                    editable={false}
                  />
                </View>
              </>
            )}

            {!initialFetched && !loading && (
              <TouchableOpacity
                onPress={handleFetchContent}
                style={tw`bg-green-500 rounded-md py-3 mb-4`}>
                <Text style={tw`text-white text-center font-bold text-base`}>
                  Refresh Content
                </Text>
              </TouchableOpacity>
            )}

            {initialFetched && data && (
              <View style={tw`space-y-4`}>
                {[
                  {key: 'ai2human_generated_text_1', label: 'Landing Image'},
                  {key: 'ai2human_generated_text_10', label: 'About Us'},
                ].map(({key, label}) => (
                  <View key={key}>
                    <Text style={tw`text-base font-semibold mb-2`}>
                      {label}
                    </Text>
                    <TextInput
                      multiline
                      numberOfLines={4}
                      value={data[key as keyof AIContentData]}
                      onChangeText={text =>
                        handleChange(key as keyof AIContentData, text)
                      }
                      style={tw`border border-gray-300 rounded-md p-2 text-base h-32`}
                    />
                  </View>
                ))}

                {Array.from({length: 5}, (_, i) => {
                  const field = `ai_generated_tagline_arg${
                    i + 1
                  }` as keyof AIContentData;
                  return (
                    <View key={field}>
                      <Text style={tw`text-base font-semibold mb-2`}>
                        Tagline {i + 1}
                      </Text>
                      <TextInput
                        value={data[field]}
                        onChangeText={text => handleChange(field, text)}
                        style={tw`border border-gray-300 rounded-md p-2 text-base`}
                      />
                    </View>
                  );
                })}

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={loading}
                  style={tw`bg-blue-500 rounded-md py-3 mt-4`}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={tw`text-white text-center font-bold text-base`}>
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
/*******  eda4581d-a286-4204-9b37-8c2a8a45ac91  *******/

export default ContentUpdation;
function alert(arg0: string) {
  throw new Error('Function not implemented.');
}
