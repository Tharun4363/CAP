import {
  ScrollView,
  TouchableOpacity,
  Text,
  View,
  useWindowDimensions,
  Alert,
  Linking,
} from 'react-native';
import React, { useEffect, useState, Dispatch, SetStateAction } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useForm, Control } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_IP_ADDRESS } from '../../config';
import UpdateAIContentModal from '../components/website/Content';
import UploadImagesModal from '../components/website/UploadImagesModal';
import Toast from 'react-native-toast-message';
import { launchImageLibrary } from 'react-native-image-picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import RNFS from 'react-native-fs';
import { s3, bucketName, region } from '../services/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';

// Define interfaces
interface FormValues {
  uploadedImages: {
    landingPage: string[];
    aboutUs: string[];
    gallery: string[];
    paymentQR: string[];
    products: string[];
    logo: string[];
    items: string[];
    videos: string[];
  };
}

type RootStackParamList = {
  Login: undefined;
  EditCustomer: undefined;
  SelectTemplate: undefined;
  MenuSettings: undefined;
  UploadImagesModal: undefined;
  Content: undefined;
};

type MediaCategory = keyof FormValues['uploadedImages'] | 'services';

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
  const router = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const isDesktop = width > 800;

  const [modalVisible, setModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [saveChangesLoading, setSaveChangesLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [previewUrlLoading, setPreviewUrlLoading] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [previewSuccessful, setPreviewSuccessful] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedGallerySlot, setSelectedGallerySlot] = useState<number | null>(null);
  const [selectedProductSlot, setSelectedProductSlot] = useState<number | null>(null);
  const [selectedServiceSlot, setSelectedServiceSlot] = useState<number | null>(null); // Added for UploadImagesModal
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [loading, setLoading] = useState(false);

  const { control } = useForm({
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

  const isAnyActionInProgress = () => {
    return (
      saveChangesLoading ||
      previewLoading ||
      deployLoading ||
      previewUrlLoading ||
      isUploading
    );
  };

  useEffect(() => {
    const fetchCustomerId = async () => {
      try {
        const id = await AsyncStorage.getItem('customerId');
        if (id) {
          setCustomerId(id);
          fetchCategoryId(id);
          console.log('Customer ID loaded from storage:', id);
        } else {
          console.warn('No customer provenant de l\'AsyncStorage');
          Alert.alert('Connexion Requise', 'Veuillez vous connecter pour continuer.', [
            // {text: 'OK', onPress: () => router.navigate('Login')},
          ]);
        }
      } catch (error: any) {
        console.error('Erreur lors de la récupération de l\'ID client:', error.message || error);
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
    } catch (error: any) {
      setLoading(false);
      console.error('Error fetching category ID:', error.message || error);
      Alert.alert('Error retrieving category information.');
    }
  };

  const handleFileUploadToAWS = async (
    onChange: (value: FormValues['uploadedImages']) => void,
    category: MediaCategory,
  ) => {
    try {
      setIsUploading(true);
      console.log(`Uploading files for category: ${category}`);

      // Map 'services' to 'products' for storage
      const storageCategory = category === 'services' ? 'products' : category;

      const result = await launchImageLibrary({
        mediaType: category === 'videos' ? 'video' : 'photo',
        selectionLimit: 1,
      });

      if (!result.didCancel && result.assets?.length) {
        const file = result.assets[0];
        const key = `images/${customerId}/${category}/${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const s3Url = await uploadToS3({ uri: file.uri, type: file.type }, key);

        const updatedImages = [
          ...(formValues.uploadedImages[storageCategory] || []),
          s3Url,
        ];

        const updatedFormValues: FormValues = {
          ...formValues,
          uploadedImages: {
            ...formValues.uploadedImages,
            [storageCategory]: updatedImages,
          },
        };

        setFormValues(updatedFormValues);
        onChange(updatedFormValues.uploadedImages);
        Toast.show({
          type: 'success',
          text1: 'Upload Successful',
          text2: `File uploaded to ${category}`,
        });
      }
    } catch (error: any) {
      console.error('Error uploading files:', error.message || error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: 'Failed to upload files. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  async function uploadToS3(file: any, key: string) {
    try {
      if (!file.uri) throw new Error('Invalid file: URI is missing');
      if (!bucketName) throw new Error('S3 bucket name is not configured');

      const isVideo = file.type?.startsWith('video') || key.match(/\.(mp4|webm|avi)$/);
      const contentType = file.type || (isVideo ? 'video/mp4' : 'image/jpeg');

      if (isVideo) {
        const filePath = file.uri.replace('file://', '');
        const stat = await ReactNativeBlobUtil.fs.stat(filePath);
        if (Number(stat.size) > 100 * 1024 * 1024) {
          throw new Error('Video file too large. Please select a video under 100MB.');
        }

        const base64 = await ReactNativeBlobUtil.fs.readFile(filePath, 'base64');
        const fileBuffer = Buffer.from(base64, 'base64');

        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType,
        });

        await s3.send(command);

        // const region = 'ap-south-1';
const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
        return s3Url;
      }

      const base64 = await RNFS.readFile(file.uri, 'base64');
      const fileBuffer = Buffer.from(base64, 'base64');

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL : 'public-read',
      });

      await s3.send(command);

      // const region = 'ap-south-1';
      const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
      return s3Url;
    } catch (error: any) {
      console.error('S3 Upload Error:', error.message || error);
      throw new Error(`Failed to upload to S3: ${error.message}`);
    }
  }

  

  const saveUploadedImages = async () => {
    try {
      setIsUploading(true);

      await AsyncStorage.setItem(
        'uploadedImages',
        JSON.stringify(formValues.uploadedImages),
      );

      setIsUploading(false);
      setUploadModalVisible(false);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Images saved successfully!',
      });
    } catch (error: any) {
      console.error('Error saving images:', error.message || error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save images. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleNavigation = (route: keyof RootStackParamList) => {
    if (!customerId) {
      Alert.alert('Login Required', 'Please login to continue.', [
        // {text: 'OK', onPress: () => router.navigate('Login')},
      ]);
      return;
    }

    if (isAnyActionInProgress()) {
      Alert.alert(
        'Action in Progress',
        'Please wait for the current operation to complete.',
        [{text: 'OK'}],
      );
      return;
    }

    if (route === 'Content') {
      setModalVisible(true);
      return;
    }

    if (route === 'UploadImagesModal') {
      setUploadModalVisible(true);
      return;
    }

    router.navigate(route);
  };

  const handleSaveChanges = async () => {
    if (!customerId) {
      Alert.alert('Login Required', 'Please login to continue.', [
        // {text: 'OK', onPress: () => router.navigate('Login')},
      ]);
      return;
    }

    try {
      setSaveChangesLoading(true);
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

        if (data.web_agent_id) {
          await AsyncStorage.setItem('web_agent_id', data.web_agent_id);
        }

        setPreviewEnabled(true);
      } else {
        Alert.alert(
          'Error',
          'No website generated. Check backend logs for details.',
          [{text: 'OK'}],
        );
      }
    } catch (error: any) {
      console.error('Error generating website:', error.message || error);
      Alert.alert('Error', 'An error occurred while generating the website.', [
        {text: 'OK'},
      ]);
    } finally {
      setSaveChangesLoading(false);
    }
  };

  useEffect(() => {
  const loadUploadedImages = async () => {
    try {
      const saved = await AsyncStorage.getItem('uploadedImages');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormValues(prev => ({
          ...prev,
          uploadedImages: parsed,
        }));
        console.log('✅ Refreshed uploadedImages from AsyncStorage:', parsed);
      }
    } catch (error: any) {
      console.error('Failed to load uploaded images from storage:', error.message || error);
    }
  };

  if (!uploadModalVisible) {
    loadUploadedImages();
  }
}, [uploadModalVisible]);


 const handlePreviewWebsite = async () => {
  if (!customerId) {
    Alert.alert('Login Required', 'Please login to continue.');
    return;
  }

  try {
    setPreviewLoading(true);

    // ✅ Step 1: Save uploaded images to backend first
    await saveUploadedImages();

    // ✅ Step 2: Then trigger preview endpoint
    const response = await fetch(
      `${API_IP_ADDRESS}/api/preview-website?cust_id=${encodeURIComponent(customerId)}`
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('Server Error:', text);
      throw new Error(`Failed to generate preview: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Preview Data:', data);

    if (data.preview_url) {
      Alert.alert('Success', 'Preview URL generated successfully!', [
        {
          text: 'Open Preview',
          onPress: () => Linking.openURL(data.preview_url),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);

      await AsyncStorage.setItem('previewUrl', data.preview_url);
      setPreviewSuccessful(true);
    } else {
      Alert.alert('Error', 'Preview URL not found.');
    }
  } catch (error: any) {
    console.error('Error generating preview:', error.message || error);
    Alert.alert('Error', error.message || 'Failed to generate preview.');
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
              console.error('Error deploying website:', error.message || error);
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
        // {text: 'OK', onPress: () => router.navigate('Login')},
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
              } catch (error: any) {
                console.error('Failed to copy URL:', error.message || error);
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
      console.error('Error fetching preview URL:', error.message || error);
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
            {buttonData.map(({ icon, text, route }, index) => (
              <TouchableOpacity
                key={index}
                style={tw`flex-row items-center border border-gray-300 rounded-lg px-10 py-6 bg-gray-100 mb-3 justify-center`}
                onPress={() => handleNavigation(route)}
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
          {buttonData.map(({ icon, text, route }, index) => (
            <TouchableOpacity
              key={index}
              style={tw`flex-row items-center border border-gray-300 rounded-lg px-6 py-4 bg-gray-100 mb-3 w-full justify-center`}
              onPress={() => handleNavigation(route)}
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
        selectedServiceSlot={selectedServiceSlot}
        setSelectedServiceSlot={setSelectedServiceSlot}
      />
    </ScrollView>
  );
};

export default UpdateWebsite;

const buttonData: { icon: string; text: string; route: keyof RootStackParamList }[] = [
  { icon: 'edit', text: 'Edit Customer Details', route: 'EditCustomer' },
  { icon: 'th-large', text: 'Select Template', route: 'SelectTemplate' },
  { icon: 'cog', text: 'Open Menu Settings', route: 'MenuSettings' },
  { icon: 'upload', text: 'Upload Your Images', route: 'UploadImagesModal' },
  { icon: 'refresh', text: 'Content Updation', route: 'Content' },
];