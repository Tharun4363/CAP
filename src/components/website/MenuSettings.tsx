import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useForm, Controller, FieldValues} from 'react-hook-form';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {API_IP_ADDRESS} from '../../../config';
import Toast from 'react-native-toast-message';

const languages = [
  {value: 'te', label: 'Telugu'},
  {value: 'hi', label: 'Hindi'},
  {value: 'bn', label: 'Bengali'},
  {value: 'mr', label: 'Marathi'},
  {value: 'ta', label: 'Tamil'},
  {value: 'ur', label: 'Urdu'},
  {value: 'gu', label: 'Gujarati'},
  {value: 'pa', label: 'Punjabi'},
  {value: 'ml', label: 'Malayalam'},
  {value: 'kn', label: 'Kannada'},
  {value: 'or', label: 'Odia'},
  {value: 'as', label: 'Assamese'},
  {value: 'ma', label: 'Maithili'},
  {value: 'bh', label: 'Bhojpuri'},
  {value: 'sd', label: 'Sindhi'},
  {value: 'sa', label: 'Sanskrit'},
  {value: 'kok', label: 'Konkani'},
  {value: 'ne', label: 'Nepali'},
  {value: 'si', label: 'Sinhala'},
  {value: 'en', label: 'English'},
];

const toggleOptions = [
  {name: 'home_page', label: 'Home Page'},
  {name: 'about_us_page', label: 'About Us Page'},
  {name: 'service_page', label: 'Service Page'},
  {name: 'videos_page', label: 'Videos Page'},
  {name: 'gallery_page', label: 'Gallery Page'},
  {name: 'products_page', label: 'Products Page'},
  {name: 'contact_us_page', label: 'Contact Us Page'},
  {name: 'book_appointment_page', label: 'Book Appointment Page'},
];

// Toggles that are always enabled and non-changeable
const nonChangeableToggles = [
  'home_page',
  'about_us_page',
  'gallery_page',
  'contact_us_page',
  'book_appointment_page',
];

export default function MenuSettingsScreen() {
  const navigation = useNavigation();
  const {width} = useWindowDimensions();
  const isDesktop = width >= 768;

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [custId, setCustId] = useState('');

  const {control, handleSubmit, watch, setValue} = useForm<FieldValues>({
    defaultValues: {
      home_page: 'Y',
      about_us_page: 'Y',
      service_page: 'N',
      videos_page: 'N',
      gallery_page: 'Y',
      products_page: 'N',
      contact_us_page: 'Y',
      book_appointment_page: 'Y',
      language: 'en',
      custom_logo: 'N',
      logo_shortcut_text: '',
    },
  });

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const customerID = await AsyncStorage.getItem('customerId');
        if (customerID) {
          setCustId(customerID);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Could not retrieve customer information',
          });
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load customer data',
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchCustomerData();
  }, []);

  const onSubmit = async (data: FieldValues) => {
    if (!custId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Customer information not available',
      });
      return;
    }

    if (
      (data.service_page === true || data.service_page === 'Y') &&
      (data.products_page === true || data.products_page === 'Y')
    ) {
      Alert.alert(
        'Selection Error',
        'Please select either Service Page or Products Page, not both.'
      );
      return;
    }

    const formattedData = {
      cust_id: custId,
      home_page: 'Y', // Always 'Y'
      about_us_page: 'Y', // Always 'Y'
      service_page: data.service_page === true || data.service_page === 'Y' ? 'Y' : 'N',
      videos_page: data.videos_page === true || data.videos_page === 'Y' ? 'Y' : 'N',
      gallery_page: 'Y', // Always 'Y'
      products_page: data.products_page === true || data.products_page === 'Y' ? 'Y' : 'N',
      contact_us_page: 'Y', // Always 'Y'
      book_appointment_page: 'Y', // Always 'Y'
      language: data.language || 'en',
      custom_logo: data.custom_logo === 'Y' ? 'Y' : 'N',
      logo_shortcut_text: data.logo_shortcut_text || '',
    };

    console.log("Formatted data:", formattedData);

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_IP_ADDRESS}/api/menu-settings`, formattedData);
      console.log("Response from API:", response.data);

      if (response.data) {
        // Save to AsyncStorage
        await AsyncStorage.setItem(`menu_settings_${custId}`, JSON.stringify(formattedData));
        console.log(`Menu settings saved to AsyncStorage for custId: ${custId}`);

        Alert.alert('Success', 'Menu settings submitted successfully');
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Menu settings updated successfully',
        });
        navigation.goBack();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to update menu settings',
        });
      }
    } catch (error) {
      console.error("Error from API:", error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update menu settings',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={tw`mt-4 text-lg`}>Loading...</Text>
      </View>
    );
  }

  const selectedLang = languages.find(l => l.value === watch('language'));

  return (
    <View style={tw.style(`flex-1 bg-gray-50`)}>
      <ScrollView
        contentContainerStyle={[
          tw.style(`px-4 py-6`),
          isDesktop ? tw.style(`w-1/2 mx-auto`) : tw.style(`w-full`),
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={tw.style(`flex-row items-center mb-2`)}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw.style(`p-2 rounded-full bg-gray-100`)}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <Text style={tw.style(`ml-3 text-blue-600 font-medium`)}>Back</Text>
        </View>

        <Text style={tw.style(`text-2xl font-bold text-gray-900 mb-10 text-center`)}>
          Menu Settings
        </Text>

        {/* Page Toggles */}
        <View style={tw.style(`bg-white rounded-xl shadow-sm p-6 mb-8`)}>
          {toggleOptions.map(({name, label}, index) => (
            <View key={name}>
              <Controller
                name={name}
                control={control}
                render={({field}) => (
                  <View style={tw.style(`flex-row items-center justify-between py-4`)}>
                    <Text style={tw.style(`text-lg font-medium text-gray-800`)}>
                      {label}
                    </Text>
                    <Switch
                      value={field.value === 'Y'}
                      onValueChange={val => {
                        // Prevent selecting both service and products
                        const otherValue = watch(name === 'service_page' ? 'products_page' : name === 'products_page' ? 'service_page' : '');
                        if (
                          (name === 'service_page' || name === 'products_page') &&
                          val === true &&
                          otherValue === 'Y'
                        ) {
                          Alert.alert(
                            'Selection Error',
                            'You can select either Service Page or Products Page, not both.'
                          );
                          return;
                        }
                        field.onChange(val ? 'Y' : 'N');
                      }}
                      trackColor={{false: '#e5e7eb', true: '#93c5fd'}}
                      thumbColor={field.value === 'Y' ? '#3b82f6' : '#f3f4f6'}
                      disabled={nonChangeableToggles.includes(name)}
                    />
                  </View>
                )}
              />
              {index < toggleOptions.length - 1 && (
                <View style={tw.style(`border-b border-gray-100`)} />
              )}
            </View>
          ))}
        </View>

        {/* Language Picker */}
        <TouchableOpacity
          onPress={() => setLanguageModalVisible(true)}
          style={tw.style(`bg-white rounded-xl shadow-sm p-6 mb-8`)}
          activeOpacity={0.7}>
          <View style={tw.style(`flex-row items-center justify-between`)}>
            <Text style={tw.style(`text-lg font-medium text-gray-800`)}>
              Language: {selectedLang?.label || 'Select Language'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        {/* Custom Logo */}
        <View style={tw.style(`bg-white rounded-xl shadow-sm p-6 mb-8`)}>
          <Controller
            name="custom_logo"
            control={control}
            render={({field}) => (
              <>
                <View style={tw.style(`flex-row items-center justify-between py-4`)}>
                  <Text style={tw.style(`text-lg font-medium text-gray-800`)}>
                    Use Custom Logo
                  </Text>
                  <Switch
                    value={field.value === 'Y'}
                    onValueChange={val => {
                      field.onChange(val ? 'Y' : 'N');
                      if (val) setValue('logo_shortcut_text', '');
                    }}
                    trackColor={{false: '#e5e7eb', true: '#93c5fd'}}
                    thumbColor={field.value === 'Y' ? '#3b82f6' : '#f3f4f6'}
                  />
                </View>
                {field.value === 'N' && (
                  <View style={tw.style(`mt-4`)}>
                    <Text style={tw.style(`text-sm font-medium text-gray-500 mb-2`)}>
                      Logo Shortcut Text
                    </Text>
                    <Controller
                      name="logo_shortcut_text"
                      control={control}
                      render={({field}) => (
                        <TextInput
                          style={tw.style(`border border-gray-200 rounded-lg p-4 text-gray-800 bg-gray-50`)}
                          placeholder="Enter text (e.g., company initials)"
                          placeholderTextColor="#9ca3af"
                          value={field.value}
                          onChangeText={field.onChange}
                        />
                      )}
                    />
                  </View>
                )}
              </>
            )}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            tw.style(`bg-blue-500 p-5 rounded-xl shadow-sm mt-6`),
            isLoading && tw.style(`opacity-80`),
            isDesktop && tw.style(`w-1/2 mx-auto`),
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          activeOpacity={0.8}>
          {isLoading ? (
            <View style={tw.style(`flex-row justify-center items-center`)}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={tw.style(`text-white font-semibold text-lg ml-3`)}>
                Saving Changes...
              </Text>
            </View>
          ) : (
            <Text style={tw.style(`text-white font-semibold text-lg text-center`)}>
              Save Settings
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={languageModalVisible} animationType="slide">
        <View style={tw.style(`flex-1 bg-gray-50`)}>
          <View style={tw.style(`bg-white px-4 py-4 shadow-sm`)}>
            <View style={tw.style(`flex-row items-center justify-between`)}>
              <TouchableOpacity
                onPress={() => setLanguageModalVisible(false)}
                style={tw.style(`p-2`)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={tw.style(`text-lg font-semibold text-gray-900`)}>
                Select Language
              </Text>
              <View style={tw.style(`w-8`)} />
            </View>
          </View>

          <ScrollView contentContainerStyle={tw.style(`pb-8`)}>
            {languages.map(lang => (
              <TouchableOpacity
                key={lang.value}
                onPress={() => {
                  setValue('language', lang.value);
                  setLanguageModalVisible(false);
                }}
                style={tw.style(`px-6 py-4`)}>
                <View style={tw.style(`flex-row items-center justify-between`)}>
                  <Text style={tw.style(`text-lg text-gray-800`)}>
                    {lang.label}
                  </Text>
                  {watch('language') === lang.value && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Toast />
    </View>
  );
}