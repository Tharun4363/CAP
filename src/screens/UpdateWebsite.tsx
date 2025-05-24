import {
  ScrollView,
  TouchableOpacity,
  Text,
  View,
  useWindowDimensions,
  Alert,
  Linking,
} from 'react-native';
import React, {useEffect, useState} from 'react';
import Clipboard from '@react-native-clipboard/clipboard';

import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {useForm} from 'react-hook-form';
import {useNavigation} from '@react-navigation/native';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_IP_ADDRESS} from '../../config';
import UpdateAIContentModal from '../components/website/Content';
// import UploadImagesModal from '../components/website/UploadImagesModal';

import Toast from 'react-native-toast-message';
import UploadImagesModal from '../components/website/UploadImagesModal';

const PREVIEW_URL_ENDPOINT = `${API_IP_ADDRESS}/api/get-preview-url`; // New endpoint to fetch preview URL

const UpdateWebsite = () => {
  const initialFormValues: FormValues = {
    uploadedImages: {
      landingPage: [],
      aboutUs: [],
      gallery: [],
      paymentQR: [],
      products: [],
      logo: [],
      items: [],
      videos: [],
    },
  };
  const router = useNavigation();
  const {width} = useWindowDimensions();
  const isDesktop = width > 800;

  // State variables
  const [modalVisible, setModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [customerId, setCustomerId] = useState('');
  // const [category_id, setCategoryId] = useState('');
  // Processing states for various actions
  const [saveChangesLoading, setSaveChangesLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [previewUrlLoading, setPreviewUrlLoading] = useState(false);

  // Button states
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [previewSuccessful, setPreviewSuccessful] = useState(false);
const [categoryId, setCategoryId] = useState('');
  // Image upload related states
  const [isUploading, setIsUploading] = useState(false);
  const [selectedGallerySlot, setSelectedGallerySlot] = useState(null);
  const [selectedProductSlot, setSelectedProductSlot] = useState(null);
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  // const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);
  // Initialize form values with empty arrays for each category
  // Correctly initialize formValues

  type MediaCategory =
    | 'landingPage'
    | 'aboutUs'
    | 'gallery'
    | 'paymentQR'
    | 'products'
    | 'logo'
    | 'items'
    | 'videos';

  interface FormValues {
    uploadedImages: {
      [key in MediaCategory]: string[];
    };
  }

  // Initialize react-hook-form
  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm({
    defaultValues: {
      uploadedImages: {
        landingPage: [],
        aboutUs: [],
        gallery: [],
        paymentQR: [],
        products: [],
        logo: [],
        items: [],
        videos: [],
      },
    },
  });

  // Helper function to check if any action is in progress
  const isAnyActionInProgress = () => {
    return (
      saveChangesLoading ||
      previewLoading ||
      deployLoading ||
      previewUrlLoading ||
      isUploading
    );
  };

  // Fetch customer ID when component mounts
  useEffect(() => {
    const fetchCustomerId = async () => {
      try {
        const id = await AsyncStorage.getItem('customerId');
        if (id) {
          setCustomerId(id);
          fetchCategoryId(id);
          console.log('Customer ID loaded from storage:', id);
        } else {
          console.warn('No customer ID found in storage');
          Alert.alert('Login Required', 'Please login to continue.', [
            // {text: 'OK', onPress: () => router.navigate('/Login')},
          ]);
        }
      } catch (error) {
        console.error('Error fetching customer ID:', error);
      }
    };

    fetchCustomerId();
  }, []);
  console.log('Customer ID:', customerId, 'Category ID:', categoryId);

  const fetchCategoryId = async (custId: string) => {
  try {
    setLoading(true);
    const response = await fetch(
      `${API_IP_ADDRESS}/api/get-category-id?cust_id=${encodeURIComponent(custId)}`
    );
    const result = await response.json();

    if (response.ok && result.category_id) {
      setCategoryId(result.category_id);
      console.log('Category ID set:', result.category_id);
      setLoading(false);
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
  type RouteType =
    | 'EditCustomer'
    | 'MenuSettings'
    | 'SelectTemplate'
    | 'PreviewUrl'
    | 'Deploy'
    | 'ContentUpdation'
    | 'UploadImagesModal';

  // Handle file upload to AWS
  const handleFileUploadToAWS = async (
    onChange: (value: FormValues['uploadedImages']) => void,
    category: MediaCategory,
  ) => {
    try {
      setIsUploading(true);
      console.log(`Uploading files for category: ${category}`);

      // Simulate upload delay
      setTimeout(() => {
        setIsUploading(false);

        const mockUploadedUrl = `https://example.com/mock-image-${Date.now()}.jpg`;

        const updatedImages = [
          ...(formValues.uploadedImages[category] || []),
          mockUploadedUrl,
        ];

        const updatedFormValues: FormValues = {
          ...formValues,
          uploadedImages: {
            ...formValues.uploadedImages,
            [category]: updatedImages,
          },
        };

        // Update form values and ensure it's correctly typed
        setFormValues(updatedFormValues);
        onChange(updatedFormValues.uploadedImages);
      }, 1000);
    } catch (error) {
      console.error('Error uploading files:', error);
      setIsUploading(false);
      Alert.alert('Error', 'Failed to upload files. Please try again.');
    }
  };

  // Save uploaded images
  const saveUploadedImages = async () => {
    try {
      setIsUploading(true);

      // Store uploaded images in AsyncStorage
      await AsyncStorage.setItem(
        'uploadedImages',
        JSON.stringify(formValues.uploadedImages),
      );

      // Add additional save logic here

      setIsUploading(false);
      setUploadModalVisible(false);

      // Show success message
      Alert.alert('Success', 'Images uploaded successfully!');
    } catch (error) {
      console.error('Error saving images:', error);
      setIsUploading(false);
      Alert.alert('Error', 'Failed to save images. Please try again.');
    }
  };

  const handleNavigation = (route: RouteType) => {
    // Check if user is logged in before proceeding
    if (!customerId) {
      Alert.alert('Login Required', 'Please login to continue.', [
        // {text: 'OK', onPress: () => router.navigate('/Login')},
      ]);
      return;
    }

    // Don't allow navigation if any action is in progress
    if (isAnyActionInProgress()) {
      Alert.alert(
        'Action in Progress',
        'Please wait for the current operation to complete.',
        [{text: 'OK'}],
      );
      return;
    }

    // Special handling for content updation
    if (route === 'ContentUpdation') {
      setModalVisible(true);
      return;
    }

    // Special handling for image upload
    if (route === 'UploadImagesModal') {
      setUploadModalVisible(true); // Ensure this modal state is properly defined
      return;
    }

    // For all other routes, proceed with normal navigation
    router.navigate(route as never);
  };

  const handleSaveChanges = async () => {
    if (!customerId) {
      Alert.alert('Login Required', 'Please login to continue.', [
        // {text: 'OK', onPress: () => router.navigate('/Login')},
      ]);
      return;
    }

    try {
      setSaveChangesLoading(true);
      // Call the API to generate website
      const response = await fetch(
        `${API_IP_ADDRESS}/generate-website?cust_id=${customerId}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server Error:', errorText);
        throw new Error(`Failed to generate website: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Generate Website Data:', data);

      if (data.success) {
        Alert.alert(
          'Success',
          data.message ||
            `Website generated successfully! Website: ${data.generate_website}`,
          [{text: 'OK'}],
        );

        // Store any relevant data returned from the API
        if (data.web_agent_id) {
          await AsyncStorage.setItem('web_agent_id', data.web_agent_id);
        }

        // Enable preview after successful generation
        setPreviewEnabled(true);
      } else {
        Alert.alert(
          'Error',
          'No website generated. Check backend logs for details.',
          [{text: 'OK'}],
        );
      }
    } catch (error) {
      console.error('Error generating website:', error);
      Alert.alert('Error', 'An error occurred while generating the website.', [
        {text: 'OK'},
      ]);
    } finally {
      setSaveChangesLoading(false);
    }
  };
  const handlePreviewWebsite = async () => {
    if (!customerId) {
      Alert.alert('Login Required', 'Please login to continue.', [
        // {text: 'OK', onPress: () => router.navigate('/Login')},
      ]);
      return;
    }

    try {
      setPreviewLoading(true);

      const response = await fetch(
        `${API_IP_ADDRESS}/api/preview-website?cust_id=${encodeURIComponent(
          customerId,
        )}`,
      );

      if (!response.ok) {
        const text = await response.text();
        console.error('Server Error:', text);
        throw new Error(`Failed to fetch preview data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Preview Data:', data);

      if (data.preview_url) {
        Alert.alert('Success', `Preview URL generated successfully!`, [
          {
            text: 'Open Preview',
            onPress: () => Linking.openURL(data.preview_url),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]);

        // Store preview URL if needed
        await AsyncStorage.setItem('previewUrl', data.preview_url);

        // Set preview as successful to enable deploy button
        setPreviewSuccessful(true);
      } else {
        Alert.alert('Error', 'Preview URL not found.', [{text: 'OK'}]);
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
      Alert.alert('Error', 'An error occurred while generating the preview.', [
        {text: 'OK'},
      ]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeployWebsite = async () => {
    if (!customerId) {
      Alert.alert('Login Required', 'Please login to continue.');
      Toast.show({
        type: 'error',
        text1: 'Login Required',
        text2: 'Please login to continue.',
        position: 'bottom',
      });
      return;
    }

    Alert.alert(
      'Confirm Deployment',
      'Are you sure you want to deploy this website? This will make it live.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Deploy',
          onPress: async () => {
            try {
              setDeployLoading(true);

              const webAgentId = await AsyncStorage.getItem('web_agent_id');

              if (!webAgentId) {
                throw new Error(
                  'Web Agent ID not found. Please generate the website first.',
                );
              }

              const response = await fetch(
                `${API_IP_ADDRESS}/api/deploy-website?cust_id=${customerId}&web_agent_id=${webAgentId}`,
              );

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Deployment failed');
              }

              const data = await response.json();

              Alert.alert(
                'Deployment Status',
                data.message ||
                  (data.success
                    ? 'Deployment completed successfully!'
                    : 'Deployment failed.'),
                [{text: 'OK'}],
              );
            } catch (error: any) {
              console.error('Error deploying website:', error);
              Alert.alert(
                'Error',
                error.message || 'Error deploying website.',
                [{text: 'OK'}],
              );
            } finally {
              setDeployLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleGetPreviewURL = async () => {
    if (!customerId) {
      Alert.alert('Login Required', 'Please login to continue.', [
        // {text: 'OK', onPress: () => router.navigate('/Login')},
      ]);
      return;
    }

    try {
      setPreviewUrlLoading(true);

      const response = await fetch(
        `${API_IP_ADDRESS}/api/get-preview-url?cust_id=${customerId}`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch preview URL');
      }

      const data = await response.json();

      if (data.preview_url) {
        Alert.alert('Preview URL', `URL: ${data.preview_url}`, [
          {
            text: 'Open URL',
            onPress: () => Linking.openURL(data.preview_url),
          },
          {
            text: 'Copy URL',
            onPress: async () => {
              try {
                Clipboard.setString(data.preview_url);
                Alert.alert('Success', 'URL copied to clipboard');
                // Optional Toast:
                // Toast.show({
                //   type: 'success',
                //   text1: 'Copied to Clipboard',
                //   text2: data.preview_url,
                // });
              } catch (e) {
                console.error('Failed to copy URL:', e);
                Alert.alert('Error', 'Failed to copy URL');
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]);
      } else {
        Alert.alert(
          'Error',
          'No preview URL available. Please generate the website first.',
          [{text: 'OK'}],
        );
      }
    } catch (error: any) {
      console.error('Error fetching preview URL:', error);
      Alert.alert('Error', error.message || 'Failed to fetch preview URL');
    } finally {
      setPreviewUrlLoading(false);
    }
  };
  return (
    <ScrollView style={tw`flex-1 bg-white px-5 pb-24`}>
      <View style={tw`items-center mt-6 mb-6`}>
        <Text
          style={{
            fontSize: isDesktop ? 36 : 32,
            color: '#1E40AF',
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
          Update Your Website
        </Text>
        <Text style={tw`text-gray-500 text-center text-base mt-2`}>
          Fill out the form below to update your custom website details.
        </Text>
      </View>

      {isDesktop ? (
        <View style={tw`flex-row w-full`}>
          <View style={tw`w-1/2 pr-4`}>
            {buttonData.map(({icon, text, route}, index) => (
              <TouchableOpacity
                key={index}
                style={tw`flex-row items-center border border-gray-300 rounded-lg px-10 py-6 bg-gray-100 mb-3 justify-center`}
                onPress={() => handleNavigation(route as RouteType)}
                disabled={isAnyActionInProgress()}>
                <FontAwesome
                  name={icon}
                  size={20}
                  color="#1E40AF"
                  style={tw`mr-2`}
                />
                <Text style={tw`ml-2 text-xl text-black`}>{text}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={tw`w-1/2 items-center`}>
            <TouchableOpacity
              style={tw`bg-black p-5 rounded-lg w-4/5 mb-4`}
              onPress={handleSaveChanges}
              disabled={isAnyActionInProgress()}>
              <Text style={tw`text-white text-center text-lg font-bold`}>
                {saveChangesLoading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>

            <View style={tw`flex-row justify-between w-4/5 mb-4`}>
              <TouchableOpacity
                style={tw`bg-blue-600 px-6 py-4 rounded-lg flex-1 mr-2`}
                onPress={handlePreviewWebsite}
                disabled={isAnyActionInProgress() || !previewEnabled}>
                <Text style={tw`text-white text-xs font-semibold text-center`}>
                  {previewLoading ? 'Processing...' : 'Preview Website'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`bg-blue-600 px-6 py-4 rounded-lg flex-1 ml-2`}
                onPress={handleDeployWebsite}
                disabled={isAnyActionInProgress() || !previewSuccessful}>
                <Text style={tw`text-white text-xs font-semibold text-center`}>
                  {deployLoading ? 'Processing...' : 'Deploy Website'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={tw`bg-blue-600 px-6 py-4 rounded-lg w-4/5`}
              onPress={handleGetPreviewURL}
              disabled={isAnyActionInProgress() || !previewEnabled}>
              <Text style={tw`text-white text-xs font-semibold text-center`}>
                {previewUrlLoading ? 'Processing...' : 'Get Preview URL'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={tw`w-full items-center pb-28`}>
          {buttonData.map(({icon, text, route}, index) => (
            <TouchableOpacity
              key={index}
              style={tw`flex-row items-center border border-gray-300 rounded-lg px-6 py-4 bg-gray-100 mb-3 w-full justify-center`}
              onPress={() => handleNavigation(route as RouteType)}
              disabled={isAnyActionInProgress()}>
              <FontAwesome name={icon} size={18} color="#1E40AF" />
              <Text style={tw`ml-2 text-base font-medium text-black`}>
                {text}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={tw`bg-black p-5 rounded-lg w-full mt-2`}
            onPress={handleSaveChanges}>
            <Text style={tw`text-white text-center text-lg font-bold`}>
              {saveChangesLoading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`bg-blue-600 px-6 py-4 rounded-lg w-full mt-3`}
            onPress={handlePreviewWebsite}>
            <Text style={tw`text-white text-base font-semibold text-center`}>
              {previewLoading ? 'Processing...' : 'Preview Website'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`bg-blue-600 px-6 py-4 rounded-lg w-full mt-3`}
            onPress={handleDeployWebsite}>
            <Text style={tw`text-white text-base font-semibold text-center`}>
              {deployLoading ? 'Processing...' : 'Deploy Website'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`bg-blue-600 px-6 py-4 rounded-lg w-full mt-3`}
            onPress={handleGetPreviewURL}>
            <Text style={tw`text-white text-base font-semibold text-center`}>
              {previewUrlLoading ? 'Processing...' : 'Get Preview URL'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <UpdateAIContentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    <UploadImagesModal
  visible={uploadModalVisible}
  onClose={() => setUploadModalVisible(false)}
  control={control}
  formValues={formValues}
  setFormValues={setFormValues}
  isUploading={isUploading}
  setIsUploading={setIsUploading}
  handleFileUploadToAWS={handleFileUploadToAWS}
  paymentQRVisible={true}
  productImagesVisible={true}
  customLogoVisible={true}
  videosPageVisible={true}
  saveUploadedImages={saveUploadedImages}
  selectedGallerySlot={selectedGallerySlot}
  setSelectedGallerySlot={setSelectedGallerySlot}
  selectedProductSlot={selectedProductSlot}
  setSelectedProductSlot={setSelectedProductSlot}
/>
    </ScrollView>
  );
};

export default UpdateWebsite;

const buttonData = [
  {icon: 'edit', text: 'Edit Customer Details', route: 'EditCustomer'},
  {icon: 'th-large', text: 'Select Template', route: 'SelectTemplate'},
  {icon: 'cog', text: 'Open Menu Settings', route: 'MenuSettings'},
  {icon: 'upload', text: 'Upload Your Images', route: 'UploadImagesModal'},
  {icon: 'refresh', text: 'Content Updation', route: 'Content'},
];
