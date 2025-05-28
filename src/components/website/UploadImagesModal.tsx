import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { Controller } from 'react-hook-form';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { API_IP_ADDRESS } from '../../../config';
import Toast from 'react-native-toast-message';
import tw from 'tailwind-react-native-classnames';
import { RadioButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import 'react-native-url-polyfill/auto';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { s3, bucketName } from '../../services/s3'; // adjust path as needed
import { PutObjectCommand } from '@aws-sdk/client-s3';

// Category mapping between frontend and backend
const categoryMapping: Record<string, string> = {
  landingPage: 'LANDING_PAGE',
  aboutUs: 'LANDING_PAGE',
  gallery: 'GALLERY_PAGE',
  products: 'PRODUCTS_PAGE',
  logo: 'LANDING_PAGE',
  items: 'ITEMS',
  paymentQR: 'PAYMENT_QR',
  videos: 'VIDEOS',
};

// Maximum image limits for each category
const categoryLimits: Record<string, number> = {
  logo: 1,
  landingPage: 1,
  aboutUs: 1,
  gallery: 6,
  products: 5,
  paymentQR: 1,
  items: 5,
  videos: 10,
};


// const bucketName = 'visys-aiweb.ai4bazaar.com';

async function uploadToS3(file: any, key: string) {
  try {
    if (!file.uri) throw new Error('Invalid file: URI is missing');
    if (!bucketName) throw new Error('S3 bucket name is not configured');

    const isVideo = file.type?.startsWith('video') || key.match(/\.(mp4|webm|avi)$/);
    const contentType = file.type || (isVideo ? 'video/mp4' : 'image/jpeg');

    if (isVideo) {
      const filePath = file.uri.replace('file://', '');

      // ✅ ADD THIS: check video file size
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

      const region = 'ap-south-1';
      const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
      return s3Url;
    }

    // ✅ Fallback for images
    const base64 = await RNFS.readFile(file.uri, 'base64');
    const fileBuffer = Buffer.from(base64, 'base64');

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3.send(command);

    const region = 'ap-south-1';
    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    return s3Url;
  } catch (err: any) {
    console.error('S3 Upload Error:', err.message || err);
    throw new Error(`Failed to upload to S3: ${err.message}`);
  }
}
interface UploadImagesModalProps {
  visible: boolean;
  onClose: () => void;
  control: any;
  formValues: any;
  setFormValues: (values: any) => void;
  isUploading: boolean;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  handleFileUploadToAWS: (
    onChange: (value: Record<string, string[]>) => void,
    category:
      | 'landingPage'
      | 'aboutUs'
      | 'gallery'
      | 'paymentQR'
      | 'products'
      | 'logo'
      | 'items'
      | 'videos',
  ) => Promise<void>;
  paymentQRVisible: boolean;
  productImagesVisible: boolean;
  customLogoVisible: boolean;
  videosPageVisible: boolean;
  saveUploadedImages: () => Promise<void>;
  selectedGallerySlot: number | null;
  setSelectedGallerySlot: React.Dispatch<React.SetStateAction<number | null>>;
  selectedProductSlot: number | null;
  setSelectedProductSlot: React.Dispatch<React.SetStateAction<number | null>>;
}

export default function UploadImagesModal({
  visible,
  onClose,
  control,
  formValues,
  setFormValues,
  isUploading,
  setIsUploading,
  handleFileUploadToAWS,
  paymentQRVisible,
  productImagesVisible,
  customLogoVisible,
  videosPageVisible,
  saveUploadedImages,
  selectedGallerySlot,
  setSelectedGallerySlot,
  selectedProductSlot,
  setSelectedProductSlot,
}: UploadImagesModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    | 'landingPage'
    | 'aboutUs'
    | 'gallery'
    | 'products'
    | 'paymentQR'
    | 'logo'
    | 'videos'
    | 'items'
  >('landingPage');
  const [showImageSelection, setShowImageSelection] = useState(false);
  const [selectedOption, setSelectedOption] = useState('custom');
  const [databaseImages, setDatabaseImages] = useState<any[]>([]);
  const [custId, setCustId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>('');
  const [videoUrls, setVideoUrls] = useState<string[]>(new Array(10).fill(''));
  const [isLocalUploading, setIsLocalUploading] = useState(false);

  useEffect(() => {
    const fetchCustIdAndCategoryId = async () => {
      try {
        const customerId = await AsyncStorage.getItem('customerId');
        if (customerId) {
          setCustId(customerId);
          console.log('Customer ID fetched:', customerId);

          const response = await fetch(
            `${API_IP_ADDRESS}/api/get-category-id?cust_id=${encodeURIComponent(customerId)}`
          );
          const result = await response.json();

          if (response.ok && result.category_id) {
            setCategoryId(result.category_id);
            console.log('Category ID fetched:', result.category_id);
          } else {
            console.error('Category ID not found for customer:', customerId);
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Category ID not found. Please try again.',
            });
          }
        } else {
          console.error('No customer ID found in AsyncStorage');
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Customer ID not found. Please log in.',
          });
        }
      } catch (error) {
        console.error('Error fetching custId or categoryId:', error.message || error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch customer or category ID.',
        });
      }
    };

    fetchCustIdAndCategoryId();
  }, []);

  const fetchImagesFromDatabase = async (frontendCategory: string) => {
    try {
      if (!custId) {
        console.error('No customer ID available');
        return;
      }

      const backendCategory = categoryMapping[frontendCategory];
      if (!backendCategory) {
        console.error(`No backend category mapping for ${frontendCategory}`);
        return;
      }

      console.log('Fetching images for:', backendCategory, 'with custId:', custId);

      const categoryIdResponse = await fetch(
        `${API_IP_ADDRESS}/api/get-category-id?cust_id=${custId}`
      );

      if (!categoryIdResponse.ok) {
        throw new Error(`Failed to fetch category ID: ${categoryIdResponse.status}`);
      }

      const categoryIdData = await categoryIdResponse.json();
      const categoryId = categoryIdData.category_id;

      if (!categoryId) {
        console.error('No category_id found for customer:', custId);
        return;
      }

      const response = await fetch(
        `${API_IP_ADDRESS}/api/images?category=${backendCategory}&categoryId=${categoryId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status}`);
      }

      const data = await response.json();

      if (data?.images) {
        const images = data.images.map((image: any) => ({
          url: image.arg_image_url,
        }));
        setDatabaseImages(images);
        console.log(`Found ${images.length} images for ${backendCategory}`);
      } else {
        console.log('No images found for category:', backendCategory);
        setDatabaseImages([]);
      }
    } catch (error) {
      console.error(`Error fetching ${frontendCategory} images:`, error);
      Toast.show({
        type: 'error',
        text1: 'Error loading images',
        text2: 'Please try again',
      });
      setDatabaseImages([]);
    }
  };

  const handleUploadImage = async (category: any) => {
    console.log('Uploading for category:', category);
    setSelectedCategory(category);
    setShowImageSelection(true);
    setDatabaseImages([]);

    // For logo, paymentQR, videos, and items, force device selection
    if (category === 'logo' || category === 'paymentQR' || category === 'videos' || category === 'items') {
      setSelectedOption('custom');
    } else {
      console.log('Fetching DB images for:', category);
      fetchImagesFromDatabase(category);
      setSelectedOption('custom');
    }
  };

  const handleUploadProductImage = (slot: number) => {
    setSelectedProductSlot(slot);
    setSelectedCategory('products');
    setShowImageSelection(true);
    setDatabaseImages([]);
    fetchImagesFromDatabase('products');
  };

  const checkImageLimits = (category: string, additionalCount: number = 1): boolean => {
    const currentCount = formValues.uploadedImages[category]?.length || 0;
    const maxLimit = categoryLimits[category] || 5;

    if (category === 'gallery' && selectedGallerySlot !== null) {
      return true;
    }

    if (category === 'products' && selectedProductSlot !== null) {
      return true;
    }

    if (category === 'logo' || category === 'landingPage' || category === 'paymentQR') {
      return true;
    }

    if (currentCount + additionalCount > maxLimit) {
      Alert.alert(
        'Limit Exceeded',
        `You can only upload up to ${maxLimit} ${category} images.`,
      );
      return false;
    }

    return true;
  };

  const handleSelectImage = (imageUrl: string, category: string) => {
    if (category === 'logo' || category === 'landingPage' || category === 'paymentQR' || category === 'aboutUs') {
      setFormValues({
        ...formValues,
        uploadedImages: {
          ...formValues.uploadedImages,
          [category]: [imageUrl],
        },
      });
      setShowImageSelection(false);
      return;
    }

    if (category === 'gallery' && selectedGallerySlot !== null) {
      const updatedImages = [...(formValues.uploadedImages[category] || Array(6).fill(''))];
      updatedImages[selectedGallerySlot - 1] = imageUrl;

      setFormValues({
        ...formValues,
        uploadedImages: {
          ...formValues.uploadedImages,
          [category]: updatedImages,
        },
      });
      setShowImageSelection(false);
      return;
    }

    if (category === 'products' && selectedProductSlot !== null) {
      const updatedImages = [...(formValues.uploadedImages[category] || Array(5).fill(''))];
      updatedImages[selectedProductSlot - 1] = imageUrl;

      setFormValues({
        ...formValues,
        uploadedImages: {
          ...formValues.uploadedImages,
          [category]: updatedImages,
        },
      });
      setShowImageSelection(false);
      return;
    }

    const isAlreadySelected = formValues.uploadedImages[category]?.includes(imageUrl);

    if (isAlreadySelected) {
      const updatedImages = formValues.uploadedImages[category].filter(
        (url: string) => url !== imageUrl,
      );

      setFormValues({
        ...formValues,
        uploadedImages: {
          ...formValues.uploadedImages,
          [category]: updatedImages,
        },
      });
    } else {
      if (!checkImageLimits(category)) {
        return;
      }

      const updatedImages = [...(formValues.uploadedImages[category] || []), imageUrl];

      setFormValues({
        ...formValues,
        uploadedImages: {
          ...formValues.uploadedImages,
          [category]: updatedImages,
        },
      });
    }
  };

  const handleSelectItemImages = async () => {
    try {
      setIsLocalUploading(true);
      console.log('Selecting image for category:', selectedCategory);

      const result = await launchImageLibrary({
        mediaType: selectedCategory === 'videos' ? 'video' : 'photo',
        selectionLimit: 0,
      });

      if (!result.didCancel && result.assets?.length) {
        console.log('Selected assets:', result.assets);

        if (selectedCategory === 'logo' || selectedCategory === 'landingPage' || selectedCategory === 'paymentQR' || selectedCategory === 'aboutUs') {
          if (result.assets.length > 1) {
            Alert.alert(
              'Only One Image Allowed',
              `You can only upload one image for ${selectedCategory}.`,
            );
            setIsLocalUploading(false);
            return;
          }

          const newUri = result.assets[0].uri || '';
          console.log(`Selected ${selectedCategory} image URI:`, newUri);

          const updatedImages = {
            ...formValues.uploadedImages,
            [selectedCategory]: [newUri],
          };
          setFormValues({
            ...formValues,
            uploadedImages: updatedImages,
          });
          console.log(`Updated formValues for ${selectedCategory}:`, updatedImages[selectedCategory]);

          setTimeout(() => {
            console.log(`formValues after setTimeout for ${selectedCategory}:`, formValues.uploadedImages[selectedCategory]);
          }, 100);

          setShowImageSelection(false);
          setIsLocalUploading(false);
          return;
        }

        if (selectedCategory === 'items') {
          if (result.assets.length > 1) {
            Alert.alert('Only One Image Allowed', 'You can only upload one image for Payment QR.');
            setIsLocalUploading(false);
            return;
          }

          const newUri = result.assets[0].uri || '';
          if (!newUri.startsWith('file://') && !newUri.startsWith('content://')) {
            Alert.alert('Invalid Image', 'Payment QR image must be a local file.');
            setIsLocalUploading(false);
            return;
          }

          console.log('Selected Payment QR image URI:', newUri);

          setFormValues((prevValues: { uploadedImages: any; }) => ({
            ...prevValues,
            uploadedImages: {
              ...prevValues.uploadedImages,
              [selectedCategory]: [newUri],
            },
          }));
          console.log('Updated formValues for Payment QR:', formValues.uploadedImages[selectedCategory]);

          Toast.show({
            type: 'success',
            text1: 'Image Selected',
            text2: 'Payment QR image selected successfully.',
          });

          setShowImageSelection(false);
          setIsLocalUploading(false);
          return;
        }

        const newUris = result.assets.map((asset: any) => asset.uri);
        console.log(`Selected multiple URIs for ${selectedCategory}:`, newUris);

        const updatedImages = {
          ...formValues.uploadedImages,
          [selectedCategory]: [...(formValues.uploadedImages[selectedCategory] || []), ...newUris],
        };
        setFormValues({
          ...formValues,
          uploadedImages: updatedImages,
        });
        console.log(`Updated formValues for ${selectedCategory}:`, updatedImages[selectedCategory]);

        setShowImageSelection(false);
        setIsLocalUploading(false);
      }
    } catch (error) {
      console.error(`Error selecting files for ${selectedCategory}:`, error.message || error);
      Toast.show({
        type: 'error',
        text1: 'Error Selecting File',
        text2: `Failed to select ${selectedCategory} image. Please try again.`,
      });
    } finally {
      setIsLocalUploading(false);
    }
  };

  const handleUrlChange = (text: string, index: number) => {
    const newUrls = [...videoUrls];
    newUrls[index] = text;
    setVideoUrls(newUrls);
  };

  const handleSaveUrls = async () => {
    const nonEmptyUrls = videoUrls.filter(url => url.trim() !== '');

    if (nonEmptyUrls.length === 0) {
      setShowImageSelection(false);
      return;
    }

    const currentVideos = formValues.uploadedImages[selectedCategory] || [];
    const totalVideos = currentVideos.length + nonEmptyUrls.length;

    if (totalVideos > categoryLimits.videos) {
      Alert.alert(
        'Limit Exceeded',
        `You can only upload up to ${categoryLimits.videos} videos combined (URLs + device uploads).`,
      );
      return;
    }

    setFormValues({
      ...formValues,
      uploadedImages: {
        ...formValues.uploadedImages,
        [selectedCategory]: [...currentVideos, ...nonEmptyUrls],
      },
    });
    setShowImageSelection(false);
  };
const handleSaveUploadedImages = async () => {
  if (isUploading) {
    console.log('Upload already in progress, skipping...');
    return;
  }

  try {
    if (!custId) {
      throw new Error('Customer ID is not available');
    }
    if (!categoryId) {
      throw new Error('Category ID is not available');
    }

    console.log('Starting upload process...', {
      selectedCategory,
      custId,
      categoryId,
      paymentQRImages: formValues.uploadedImages.paymentQR,
    });

    if (selectedCategory === 'paymentQR') {
      const paymentQRImages = formValues.uploadedImages.paymentQR || [];
      if (paymentQRImages.length === 0) {
        throw new Error('No Payment QR image selected to upload');
      }
      if (paymentQRImages.length > 1) {
        throw new Error('Payment QR category can only have one image');
      }
      if (!paymentQRImages[0] || (!paymentQRImages[0].startsWith('file://') && !paymentQRImages[0].startsWith('content://'))) {
        throw new Error('Invalid Payment QR image URI: Must be a local file URI');
      }
    }

    setIsUploading(true);
    const uploadedUrls: Record<string, string[]> = {};

    for (const category in formValues.uploadedImages) {
      if (formValues.uploadedImages.hasOwnProperty(category)) {
        const filesOrUrls = formValues.uploadedImages[category];
        const uploadedCategoryUrls: string[] = [];

        console.log(`Processing category: ${category}`, { filesOrUrls });

        for (const fileOrUrl of filesOrUrls) {
          if (!fileOrUrl) continue;

          if (fileOrUrl.startsWith('file://') || fileOrUrl.startsWith('content://')) {
            const key = `images/${custId}/${category}/${Date.now()}-${Math.random().toString(36).substring(7)}`;
            console.log(`Uploading to S3: ${fileOrUrl} with key: ${key}`);
            const s3Url = await uploadToS3(
              { uri: fileOrUrl, type: category === 'videos' ? 'video/mp4' : 'image/jpeg' },
              key
            );
            uploadedCategoryUrls.push(s3Url);
          } else if (fileOrUrl) {
            uploadedCategoryUrls.push(fileOrUrl);
          }
        }

        uploadedUrls[category] = uploadedCategoryUrls;
      }
    }

    console.log('All uploaded URLs:', uploadedUrls);

    setFormValues({ ...formValues, uploadedImages: uploadedUrls });

    const backendCategory = categoryMapping[selectedCategory];
    if (!backendCategory) {
      throw new Error(`No backend category mapping for ${selectedCategory}`);
    }

    const payload = {
  cust_id: custId,
  category_id: categoryId,
  uploadedUrls: uploadedUrls, // send all uploaded categories
  taglines: formValues.taglines || {} // optional, send taglines if available
};
    console.log('Sending to backend:', payload);

    await fetch(`${API_IP_ADDRESS}/api/save-uploaded-images`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});


    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      throw new Error(`Failed to save images to backend: ${errorText || response.statusText}`);
    }

    const responseData = await response.json();
    console.log('Backend response:', responseData);

    Toast.show({
      type: 'success',
      text1: 'Upload Successful',
      text2: 'Images have been uploaded and saved',
    });

    onClose();
  } catch (error) {
    console.error(`Upload error for ${selectedCategory}:`, error.message || error);
    Toast.show({
      type: 'error',
      text1: 'Upload Failed',
      text2: error.message || `Failed to upload ${selectedCategory} image. Please try again.`,
    });
  } finally {
    setIsUploading(false);
    console.log('Upload process completed');
  }
};

  const renderButton = (title: string, onPress: () => void) => (
    <TouchableOpacity
      style={tw`bg-blue-600 flex-row justify-between items-center p-3 rounded mb-2.5 w-full`}
      onPress={onPress}>
      <Text style={tw`text-white font-medium`}>{title}</Text>
      <Ionicons name="cloud-upload-outline" size={20} color="white" />
    </TouchableOpacity>
  );

  const extractYoutubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getVideoThumbnail = (mediaURL: string) => {
    const youtubeId = extractYoutubeVideoId(mediaURL);
    if (youtubeId) {
      return `https://img.youtube.com/vi/${youtubeId}/0.jpg`;
    }
    return null;
  };

  const renderMedia = (mediaURL: string, category: string, index: number = -1) => {
    const isVideo = mediaURL.match(/\.(mp4|webm|avi)$/) || 
                   mediaURL.includes('youtube.com') || 
                   mediaURL.includes('youtu.be');
    const isSelected = formValues.uploadedImages[category]?.includes(mediaURL);
    const thumbnailUrl = isVideo ? getVideoThumbnail(mediaURL) : null;

    return (
      <View style={tw`relative mb-2.5 w-24 h-24`}>
        <TouchableOpacity
          style={tw`absolute top-1 right-1 bg-red-500 rounded-full w-6 h-6 justify-center items-center z-10`}
          onPress={() => {
            if (category === 'gallery' && index >= 0) {
              const updatedImages = [...(formValues.uploadedImages[category] || [])];
              updatedImages[index] = '';
              setFormValues({
                ...formValues,
                uploadedImages: {
                  ...formValues.uploadedImages,
                  [category]: updatedImages,
                },
              });
            } else if (category === 'products' && index >= 0) {
              const updatedImages = [...(formValues.uploadedImages[category] || [])];
              updatedImages[index] = '';
              setFormValues({
                ...formValues,
                uploadedImages: {
                  ...formValues.uploadedImages,
                  [category]: updatedImages,
                },
              });
            } else {
              const updatedImages = formValues.uploadedImages[category]?.filter(
                (url: string) => url !== mediaURL,
              ) || [];
              setFormValues({
                ...formValues,
                uploadedImages: {
                  ...formValues.uploadedImages,
                  [category]: updatedImages,
                },
              });
            }
          }}>
          <Ionicons name="trash" size={14} color="white" />
        </TouchableOpacity>

        {isVideo ? (
          <View style={tw`w-24 h-24 bg-gray-100 justify-center items-center rounded overflow-hidden`}>
            {thumbnailUrl ? (
              <>
                <Image
                  source={{uri: thumbnailUrl}}
                  style={[
                    tw`w-24 h-24 absolute`,
                    isSelected && tw`border-2 border-blue-500`
                  ]}
                />
                <View style={tw`w-10 h-10 bg-black bg-opacity-50 rounded-full justify-center items-center`}>
                  <Ionicons name="play" size={20} color="white" />
                </View>
              </>
            ) : (
              <>
                <Text style={tw`mb-1 text-xs text-center`}>Video</Text>
                <Ionicons name="play-circle-outline" size={24} color="black" />
              </>
            )}
          </View>
        ) : (
          <Image
            source={{uri: mediaURL}}
            style={[
              tw`w-24 h-24 rounded`,
              isSelected && tw`border-2 border-blue-500`
            ]}
          />
        )}
      </View>
    );
  };

  const renderGalleryPreview = () => {
    const images = formValues.uploadedImages['gallery'] || [];
    if (!images.length) return null;

    return (
      <View style={tw`mt-4 mb-2`}>
        <Text style={tw`text-sm font-medium mb-2`}>Gallery Preview:</Text>
        <View style={tw`flex-row flex-wrap`}>
          {Array(6).fill(null).map((_, index) => (
            <View key={`gallery-preview-${index}`} style={tw`m-1`}>
              {images[index] ? (
                renderMedia(images[index], 'gallery', index)
              ) : (
                <View style={tw`w-24 h-24 bg-gray-200 rounded justify-center items-center`}>
                  <Text style={tw`text-gray-500 text-xs`}>Empty Slot {index + 1}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderProductsPreview = () => {
    const images = formValues.uploadedImages['products'] || [];
    if (!images.length) return null;

    return (
      <View style={tw`mt-4 mb-2`}>
        <Text style={tw`text-sm font-medium mb-2`}>Products Preview:</Text>
        <View style={tw`flex-row flex-wrap`}>
          {Array(5).fill(null).map((_, index) => (
            <View key={`products-preview-${index}`} style={tw`m-1`}>
              {images[index] ? (
                renderMedia(images[index], 'products', index)
              ) : (
                <View style={tw`w-24 h-24 bg-gray-200 rounded justify-center items-center`}>
                  <Text style={tw`text-gray-500 text-xs`}>Empty Slot {index + 1}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPreviewSection = (
    category: string,
    title: string,
  ) => {
    if (category === 'gallery') {
      return renderGalleryPreview();
    }

    if (category === 'products') {
      return renderProductsPreview();
    }

    const images = formValues.uploadedImages[category] || [];
    if (images.length === 0) return null;

    return (
      <View style={tw`mt-4 mb-2`}>
        <Text style={tw`text-sm font-medium mb-2`}>{title} Preview:</Text>
        <View style={tw`flex-row flex-wrap`}>
          {images.map((url: string, index: number) => (
            <View key={`${category}-${index}`} style={tw`m-1`}>
              {url && renderMedia(url, category)}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}>
        <View style={tw`flex-1 bg-white`}>
          <View style={tw`flex-row justify-between items-center p-4 border-b border-gray-200`}>
            <Text style={tw`text-lg font-bold`}>Upload Images</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>

          <ScrollView style={tw`p-4`}>
            <View style={tw`bg-blue-50 border border-gray-300 rounded-md p-4`}>
              <Text style={tw`text-base font-medium mb-4`}>Upload Images</Text>

              <Controller
                name="uploadedImages"
                control={control}
                render={({field: {onChange}}) => (
                  <>
                    {customLogoVisible && (
                      <View style={tw`mb-4`}>
                        {renderButton('Upload Custom Logo', () => handleUploadImage('logo'))}
                        {renderPreviewSection('logo', 'Logo')}
                      </View>
                    )}

                    <View style={tw`mb-4`}>
                      {renderButton('Upload Landing Page Image', () => handleUploadImage('landingPage'))}
                      {renderPreviewSection('landingPage', 'Landing Page')}
                    </View>

                    <View style={tw`mb-4`}>
                      {renderButton('Upload About Us Image', () => handleUploadImage('aboutUs'))}
                      {renderPreviewSection('aboutUs', 'About Us')}
                    </View>

                    <View style={tw`mb-4`}>
                      <Text style={tw`text-base font-medium mb-2`}>Gallery Images (6 slots)</Text>
                      {[1, 2, 3, 4, 5, 6].map(slot => (
                        <React.Fragment key={`gallery-${slot}`}>
                          {renderButton(`Upload Gallery Image ${slot}`, () => {
                            setSelectedCategory('gallery');
                            setShowImageSelection(true);
                            setSelectedGallerySlot(slot);
                            setDatabaseImages([]);
                            fetchImagesFromDatabase('gallery');
                          })}
                        </React.Fragment>
                      ))}
                      {renderGalleryPreview()}
                    </View>

                    {productImagesVisible && (
                      <View style={tw`mb-4`}>
                        <Text style={tw`text-base font-medium mb-2`}>Product Images (5 slots)</Text>
                        {[1, 2, 3, 4, 5].map(slot => (
                          <React.Fragment key={`product-${slot}`}>
                            {renderButton(`Upload Product Image ${slot}`, () => handleUploadProductImage(slot))}
                          </React.Fragment>
                        ))}
                        {renderProductsPreview()}
                      </View>
                    )}

                    {paymentQRVisible && (
                      <View style={tw`mb-4`}>
                        {renderButton('Upload Payment QR Image', () => handleUploadImage('paymentQR'))}
                        {renderPreviewSection('paymentQR', 'Payment QR')}
                      </View>
                    )}

                    <View style={tw`mb-4`}>
                      {renderButton('Upload Items (Max 5)', () => handleUploadImage('items'))}
                      {renderPreviewSection('items', 'Items')}
                    </View>

                    {videosPageVisible && (
                      <View style={tw`mb-4`}>
                        {renderButton('Upload Video', () => handleUploadImage('videos'))}
                        {renderPreviewSection('videos', 'Videos')}
                      </View>
                    )}

                    {formValues.uploadedImages?.items?.length > 0 && (
                      <View style={tw`mb-4`}>
                        <Text style={tw`text-base font-medium mb-2`}>Item Prices</Text>
                        {formValues.uploadedImages?.items?.map(
                          (imageURL: string, index: number) => (
                            <TextInput
                              key={index}
                              style={tw`bg-white border border-gray-300 rounded p-2.5 mb-2.5`}
                              placeholder={`ITEM PRICE ${index + 1}`}
                              value={formValues[`arg_oss_url_${index + 1}`] || ''}
                              onChangeText={text =>
                                setFormValues({
                                  ...formValues,
                                  [`arg_oss_url_${index + 1}`]: text,
                                })
                              }
                            />
                          ),
                        )}
                      </View>
                    )}

                    <TouchableOpacity
                      style={tw`${
                        isUploading ? 'bg-gray-400' : 'bg-green-500'
                      } p-4 rounded justify-center items-center mt-4 flex-row`}
                      onPress={handleSaveUploadedImages}
                      disabled={isUploading}>
                      {isUploading ? (
                        <ActivityIndicator color="white" style={tw`mr-2`} />
                      ) : (
                        <Ionicons name="save" size={20} color="white" style={tw`mr-2`} />
                      )}
                      <Text style={tw`text-white font-medium`}>
                        {isUploading ? 'Uploading...' : 'Save All Images'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showImageSelection}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowImageSelection(false)}>
        <View style={tw`flex-1 bg-white`}>
          <View style={tw`flex-row justify-between items-center p-4 border-b border-gray-200`}>
            <Text style={tw`text-lg font-bold`}>
              {selectedCategory === 'videos'
                ? 'Upload Videos'
                : `Upload ${selectedCategory} Image`}
            </Text>
            <TouchableOpacity onPress={() => setShowImageSelection(false)}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>

          <ScrollView style={tw`p-4`}>
            {selectedCategory === 'videos' ? (
              <View style={tw`mb-4`}>
                <Text style={tw`text-base font-medium mb-2`}>Enter YouTube Video URLs:</Text>
                {videoUrls.slice(0, categoryLimits.videos).map((url, index) => (
                  <TextInput
                    key={`video-url-${index}`}
                    style={tw`border border-gray-300 rounded p-2.5 mb-2.5`}
                    placeholder={`YouTube Video URL ${index + 1}`}
                    value={url}
                    onChangeText={(text) => handleUrlChange(text, index)}
                  />
                ))}

                <View style={tw`flex-row justify-between mt-4`}>
                  <TouchableOpacity
                    style={tw`bg-blue-500 p-3 rounded flex-1 mr-2 justify-center items-center`}
                    onPress={handleSelectItemImages}>
                    <Text style={tw`text-white`}>Upload Video from Device</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={tw`bg-green-500 p-3 rounded flex-1 ml-2 justify-center items-center`}
                    onPress={handleSaveUrls}>
                    <Text style={tw`text-white`}>Save URLs</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {selectedCategory !== 'logo' && selectedCategory !== 'paymentQR' && selectedCategory !== 'items' && (
                  <View style={tw`mb-4`}>
                    <View style={tw`flex-row items-center mb-2`}>
                      <RadioButton
                        value="custom"
                        status={selectedOption === 'custom' ? 'checked' : 'unchecked'}
                        onPress={() => setSelectedOption('custom')}
                        color="#2563eb"
                      />
                      <Text style={tw`ml-2`}>Upload from device</Text>
                    </View>
                    <View style={tw`flex-row items-center`}>
                      <RadioButton
                        value="database"
                        status={selectedOption === 'database' ? 'checked' : 'unchecked'}
                        onPress={() => setSelectedOption('database')}
                        color="#2563eb"
                      />
                      <Text style={tw`ml-2`}>Choose from available images</Text>
                    </View>
                  </View>
                )}

                {selectedOption === 'custom' ? (
                  <TouchableOpacity
                    style={tw`bg-blue-600 p-4 rounded justify-center items-center flex-row mb-4`}
                    onPress={handleSelectItemImages}
                    disabled={isLocalUploading}>
                    {isLocalUploading ? (
                      <ActivityIndicator color="white" style={tw`mr-2`} />
                    ) : (
                      <Ionicons name="image-outline" size={20} color="white" style={tw`mr-2`} />
                    )}
                    <Text style={tw`text-white font-medium`}>
                      {isLocalUploading ? 'Uploading...' : 'Select from Device'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    {databaseImages.length > 0 ? (
                      <FlatList
                        data={databaseImages}
                        numColumns={3}
                        renderItem={({item}) => (
                          <TouchableOpacity
                            style={tw`m-1`}
                            onPress={() => handleSelectImage(item.url, selectedCategory)}>
                            <Image
                              source={{uri: item.url}}
                              style={[
                                tw`w-24 h-24 rounded`,
                                formValues.uploadedImages[selectedCategory]?.includes(item.url) &&
                                  tw`border-2 border-blue-500`,
                              ]}
                            />
                          </TouchableOpacity>
                        )}
                        keyExtractor={(item, index) => `db-image-${index}`}
                        ListEmptyComponent={
                          <Text style={tw`text-center text-gray-500 my-4`}>No images available</Text>
                        }
                      />
                    ) : (
                      <View style={tw`justify-center items-center py-10`}>
                        <ActivityIndicator size="large" color="#4b5563" />
                        <Text style={tw`text-gray-500 mt-4`}>Loading images...</Text>
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectedImage: {
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
});