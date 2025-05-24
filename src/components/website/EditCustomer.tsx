import {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_IP_ADDRESS} from '../../../config';
import tw from 'twrnc';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ActivityIndicator} from 'react-native-paper';
import Toast from 'react-native-toast-message';

// Define your navigation stack types (you can extract this to a `types.ts`)
type RootStackParamList = {
  Home: undefined;
  EditCustomer: undefined;
  Deploy: undefined;
  UpdateWeb: undefined; // ✅ Add this since you use it in navigation
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'EditCustomer'
>;

interface FormData {
  cust_id: string;
  fullName: string;
  companyName: string;
  phone: string;
  email: string;
  aboutOrganization: string;
  address: string;
  address2: string;
  address3: string;
  district: string;
  state: string;
  zip: string;
  country: string;
  workingDays: string;
  startTime: string;
  endTime: string;
  latitude: string;
  longitude: string;
  category: string;
  web_agent_id: number;
  requireCustomWebsite: boolean;
  requirePaymentQRCode: boolean;
  requireSignBoard: boolean;
  requireProductImages: boolean;
}

type Errors = Partial<Record<keyof FormData, string>>;

export default function EditCustomer() {
  const navigation = useNavigation<NavigationProp>();
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    cust_id: '',
    fullName: '',
    companyName: '',
    phone: '',
    email: '',
    aboutOrganization: '',
    address: '',
    address2: '',
    address3: '',
    district: '',
    state: '',
    zip: '',
    country: '',
    workingDays: '',
    startTime: '',
    endTime: '',
    latitude: '',
    longitude: '',
    category: '',
    web_agent_id: 0,
    requireCustomWebsite: true,
    requirePaymentQRCode: false,
    requireSignBoard: true,
    requireProductImages: false,
  });

  const [errors, setErrors] = useState<Errors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const customerId = await AsyncStorage.getItem('customerId');
        if (customerId) {
          onRetrieve(customerId);
        } else {
          Alert.alert('Error', 'No Customer ID found in storage.');
        }
      } catch (error) {
        console.error('Error fetching customer ID:', error);
      }
    };

    fetchCustomerData();
  }, []);

  const validateForm = () => {
    const newErrors: Errors = {};
    const requiredFields: (keyof FormData)[] = [
      'fullName',
      'companyName',
      'phone',
      'email',
      'address',
    ];

    requiredFields.forEach(key => {
      if (!formData[key] || !formData[key].toString().trim()) {
        newErrors[key] = `${key.replace(/([A-Z])/g, ' $1')} is required.`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData({...formData, [field]: value});
    setErrors({...errors, [field]: ''});
  };

  const onRetrieve = async (custId: string) => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_IP_ADDRESS}/customer-details/${custId}`,
        {
          method: 'GET',
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Customer not found');
      }

      const result = await response.json();
      const {customer, additional} = result;

      setFormData({
        cust_id: customer.cust_id,
        fullName: customer.contact_name,
        companyName: customer.company_name,
        phone: customer.phone_no1,
        email: customer.email,
        aboutOrganization: customer.company_desc || '',
        address: customer.address1 || '',
        address2: customer.address2 || '',
        address3: customer.address3 || '',
        district: customer.district || '',
        state: customer.state || '',
        zip: customer.zip_code || '',
        country: customer.country || '',
        workingDays: additional.cust_working_days || '',
        startTime: additional.cust_working_hrs?.split('-')[0] || '',
        endTime: additional.cust_working_hrs?.split('-')[1] || '',
        latitude: additional.google_map_latitude || '',
        longitude: additional.google_map_longitude || '',
        category: additional.category_id || '',
        web_agent_id: additional.web_agent_id || 0,
        requireCustomWebsite: additional.custom_website === 'Y',
        requirePaymentQRCode: additional.payment_qr_code === 'Y',
        requireSignBoard: additional.sign_board === 'Y',
        requireProductImages: additional.custom_product_images === 'Y',
      });

      await AsyncStorage.setItem('category_id', additional.category_id);
      await AsyncStorage.setItem(
        'web_agent_id',
        additional.web_agent_id.toString(),
      );

      // Alert.alert('Success', 'Customer details retrieved successfully!');
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Customer details retrieved successfully!',
        position: 'bottom',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(message);
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const updatedData = {
        customer: {
          cust_id: formData.cust_id,
          contact_name: formData.fullName,
          company_name: formData.companyName,
          company_desc: formData.aboutOrganization,
          address1: formData.address,
          address2: formData.address2,
          address3: formData.address3,
          address4: '',
          address5: '',
          city: '',
          district: formData.district,
          zip_code: formData.zip,
          state: formData.state,
          country: formData.country,
          email: formData.email,
          phone_no1: formData.phone,
          phone_no2: '',
        },
        additional: {
          category_id: formData.category,
          cust_working_days: formData.workingDays,
          cust_working_hrs: `${formData.startTime}-${formData.endTime}`,
          google_map_latitude: formData.latitude,
          google_map_longitude: formData.longitude,
          custom_website: formData.requireCustomWebsite ? 'Y' : 'N',
          payment_qr_code: formData.requirePaymentQRCode ? 'Y' : 'N',
          sign_board: formData.requireSignBoard ? 'Y' : 'N',
          custom_product_images: formData.requireProductImages ? 'Y' : 'N',
          web_agent_id: formData.web_agent_id,
        },
      };

      const response = await fetch(
        `${API_IP_ADDRESS}/customer-details/${formData.cust_id}`,
        {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(updatedData),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Update failed');
      }

      Alert.alert('Success', 'Customer details updated successfully!');
      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(message);
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const topMargin = Platform.OS === 'ios' ? tw`mt-10` : tw`mt-1`;
  return (
    <ScrollView
      style={tw`flex-1 bg-gray-50 px-4 pt-4 pb-20`}
      contentContainerStyle={[tw`items-center`, topMargin]}
      showsVerticalScrollIndicator={false}>
      <View style={tw`w-full max-w-3xl`}>
        {/* Header with back button */}
        <View style={tw`flex-row items-center justify-between mb-6`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`flex-row items-center p-2 rounded-full bg-gray-100`}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#3b82f6" />
            <Text style={tw`ml-1 text-blue-600 font-medium`}>Back</Text>
          </TouchableOpacity>
          <Text style={tw`text-2xl font-bold text-gray-800`}>
            Edit Customer
          </Text>
          <View style={tw`w-10`} /> {/* Spacer for alignment */}
        </View>

        {/* Error message */}
        {errorMessage && (
          <View style={tw`bg-red-50 p-3 rounded-lg mb-4 border border-red-100`}>
            <Text style={tw`text-red-600 text-sm`}>{errorMessage}</Text>
          </View>
        )}

        {/* Form fields */}
        <View style={tw`bg-white rounded-xl p-6 shadow-sm mb-6`}>
          <Text
            style={tw`text-xl font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-100`}>
            Customer Information
          </Text>

          <View style={tw`flex flex-wrap flex-row justify-between`}>
            {Object.entries(formData).map(([key, value]) => {
              if (
                key.startsWith('require') ||
                key === 'cust_id' ||
                key === 'web_agent_id'
              )
                return null;

              const label = key
                .replace(/([A-Z])/g, ' $1')
                .replace('about Organization', 'Company Description');
              const isRequired = [
                'fullName',
                'companyName',
                'phone',
                'email',
                'address',
              ].includes(key);

              return (
                <View
                  key={key}
                  style={[
                    tw`mb-5 w-full`,
                    Platform.OS === 'web' ? tw`md:w-[48%]` : null,
                  ]}>
                  <Text style={tw`text-sm font-medium text-gray-600 mb-1`}>
                    {label}{' '}
                    {isRequired && <Text style={tw`text-red-500`}>*</Text>}
                  </Text>
                  <TextInput
                    style={[
                      tw`border border-gray-200 rounded-lg px-4 py-3 text-gray-800 bg-white`,
                      tw`focus:border-blue-500 focus:ring-2 focus:ring-blue-100`,
                      errors[key as keyof FormData] &&
                        tw`border-red-300 bg-red-50`,
                    ]}
                    placeholder={`Enter ${label}`}
                    placeholderTextColor="#9ca3af"
                    value={value?.toString()}
                    onChangeText={text =>
                      handleChange(key as keyof FormData, text)
                    }
                    editable={key !== 'category'}
                  />
                  {typeof key === 'string' && key in errors && (
                    <Text style={tw`text-red-500 mt-1 text-xs`}>
                      {errors[key as keyof FormData]}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Requirements section */}
        <View style={tw`bg-white rounded-xl p-6 shadow-sm mb-6`}>
          <Text
            style={tw`text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100`}>
            Requirements
          </Text>
          <View style={tw`flex-row flex-wrap`}>
            {Object.keys(formData)
              .filter(key => key.startsWith('require'))
              .map(key => (
                <TouchableOpacity
                  key={key}
                  style={tw`flex-row items-center mb-3 w-1/2`}
                  activeOpacity={0.7}
                  onPress={() =>
                    handleChange(
                      key as keyof FormData,
                      !formData[key as keyof FormData],
                    )
                  }>
                  <View
                    style={[
                      tw`w-5 h-5 rounded-md border-2 mr-2 flex items-center justify-center`,
                      formData[key as keyof FormData]
                        ? tw`bg-blue-500 border-blue-500`
                        : tw`border-gray-300`,
                    ]}>
                    {formData[key as keyof FormData] && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                  <Text style={tw`text-gray-700`}>
                    {key.replace(/require/, '').replace(/([A-Z])/g, ' $1')}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {/* Action buttons */}
        <View style={tw`flex-row justify-between mt-4 mb-10`}>
          {/* Save Button */}
          <TouchableOpacity
            style={[
              tw`flex-1 py-3 rounded-xl items-center justify-center mr-2`,
              tw`bg-blue-600`,
              isLoading && tw`opacity-60`,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}>
            {isLoading ? (
              <View style={tw`flex-row items-center`}>
                <ActivityIndicator
                  color="white"
                  size="small"
                  style={tw`mr-2`}
                />
                <Text style={tw`text-white text-base font-semibold`}>
                  Saving...
                </Text>
              </View>
            ) : (
              <Text style={tw`text-white text-base font-semibold`}>
                Save Changes
              </Text>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={tw`flex-1 py-3 rounded-xl items-center justify-center ml-2 bg-white border border-gray-300`}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}>
            <Text style={tw`text-gray-700 text-base font-semibold`}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
