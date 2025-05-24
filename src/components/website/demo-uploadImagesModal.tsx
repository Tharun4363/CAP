import React, {useEffect, useState} from 'react';
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
import {Controller} from 'react-hook-form';
import {launchImageLibrary} from 'react-native-image-picker';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {API_IP_ADDRESS} from '../../../config';
import Toast from 'react-native-toast-message';
import tw from 'tailwind-react-native-classnames';
import {s3, bucketName} from '../../services/s3'; // Adjust the import path as necessary
import {PutObjectCommand} from '@aws-sdk/client-s3';
import {RadioButton} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Types
// Define the upload function directly in this file since we don't have uploadService.js
async function uploadToS3(file: any, key: string) {
  const fileBlob = await fetch(file.uri).then(res => res.blob());
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBlob,
    ContentType: file.mimeType || 'application/octet-stream',
  });
  try {
    await s3.send(command);
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (err) {
    console.error('Upload error', err);
    throw err;
  }
}

// Rest of your UploadImagesModal component code...

interface UploadImagesModalProps {
  visible: boolean;
  onClose: () => void;
  control: any;
  formValues: any;
  setFormValues: (values: any) => void;
  isUploading: boolean;
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
  const [custId, setCustId] = useState<any>();
  const [videoUrls, setVideoUrls] = useState<string[]>(new Array(10).fill(''));
  // Renamed the state variable to avoid conflict with the prop
  const [isLocalUploading, setIsLocalUploading] = useState(false);

  // Fetch custId from AsyncStorage when component mounts
  useEffect(() => {
    const fetchCustId = async () => {
      try {
        const customerId = await AsyncStorage.getItem('customerId');
        setCustId(customerId);
        console.log('Stored custId:', customerId);
      } catch (error) {
        console.error('Error fetching custId from AsyncStorage:', error);
      }
    };

    fetchCustId();
  }, []);

  // Handle product image uploads
  const handleUploadProductImage = (slot: number) => {
    setSelectedProductSlot(slot);
    setSelectedCategory('products');
    setShowImageSelection(true);
    setDatabaseImages([]);
    fetchImagesFromDatabase('PRODUCTS_PAGE');
  };

  // Function to handle changes to video URL input fields
  const handleUrlChange = (text: string, index: number) => {
    const newUrls = [...videoUrls];
    newUrls[index] = text;
    setVideoUrls(newUrls);
  };

  // When "Done" is clicked, save these URLs to the form values
  const handleSaveUrls = async () => {
    // Filter out empty values from videoUrls
    const nonEmptyUrls = videoUrls.filter(url => url.trim() !== '');
    const currentVideos = formValues.uploadedImages[selectedCategory] || [];

    // Now calculate the total number of videos: both URLs and device-uploaded videos
    const totalVideos = currentVideos.length + nonEmptyUrls.length;

    if (totalVideos > 10) {
      Alert.alert(
        'Limit Exceeded',
        'You can only upload up to 10 videos combined (URLs + device uploads).',
      );
      return;
    }

    // Proceed with saving the URLs
    const updatedVideos = [...currentVideos, ...nonEmptyUrls];

    const updatedFormValues = {
      ...formValues,
      uploadedImages: {
        ...formValues.uploadedImages,
        [selectedCategory]: updatedVideos,
      },
    };

    setFormValues(updatedFormValues);
    setShowImageSelection(false);
  };

  const fetchImagesFromDatabase = async (category: string) => {
    try {
      const categoryIdResponse = await fetch(
        `${API_IP_ADDRESS}/api/get-category-id?cust_id=${custId}`,
      );
      const categoryIdData = await categoryIdResponse.json();
      const categoryId = categoryIdData.category_id;
      if (!categoryId) {
        console.error('No category_id found in AsyncStorage');
        return;
      }

      console.log('Category ID:', categoryId);

      const response = await fetch(
        `${API_IP_ADDRESS}/api/images?category=${category}&categoryId=${categoryId}`,
      );
      const data = await response.json();
      console.log('Database Response:', data);
      if (data && data.images) {
        const images = data.images.map((image: any) => ({
          url: image.arg_image_url,
        }));
        setDatabaseImages(images);
        // console.log("Database Images:", images);
      } else {
        console.error('No images found in response data.');
      }
    } catch (error) {
      console.error('Error fetching images from database:', error);
    }
  };

  const handleSelectImage = (imageUrl: string, category: string) => {
    // Check if the image is already selected
    const isAlreadySelected =
      formValues.uploadedImages[category]?.includes(imageUrl);

    // If already selected, remove it. Otherwise, add it.
    let updatedImages;
    if (isAlreadySelected) {
      updatedImages = formValues.uploadedImages[category].filter(
        (url: string) => url !== imageUrl,
      );
    } else {
      // For gallery and products, we handle specific slots
      if (category === 'gallery' && selectedGallerySlot !== null) {
        // Create a new array where we replace or add the image at the specified slot
        updatedImages = [...(formValues.uploadedImages[category] || [])];
        updatedImages[selectedGallerySlot - 1] = imageUrl;
      } else if (category === 'products' && selectedProductSlot !== null) {
        updatedImages = [...(formValues.uploadedImages[category] || [])];
        updatedImages[selectedProductSlot - 1] = imageUrl;
      } else {
        // For other categories, just append the image
        updatedImages = [
          ...(formValues.uploadedImages[category] || []),
          imageUrl,
        ];
      }
    }

    // Update the form values
    const updatedFormValues = {
      ...formValues,
      uploadedImages: {
        ...formValues.uploadedImages,
        [category]: updatedImages,
      },
    };

    setFormValues(updatedFormValues);
  };

  // Function to handle uploading images
  const handleUploadImage = async (onChange: any, category: any) => {
    setSelectedCategory(category);
    setShowImageSelection(true);
    setDatabaseImages([]);

    // You can add specific logic here based on category if needed
    // For example, fetching specific default images
    if (category === 'logo') {
      fetchImagesFromDatabase('LANDING_PAGE');
    } else if (category === 'items') {
      // For items, we'll just open the selection UI without fetching defaults
    } else {
      // For other categories, we might have specific fetch logic
      fetchImagesFromDatabase(category.toUpperCase());
    }
  };

  // Need to add missing functions that were referenced but not implemented
  const handleSelectItemImages = async () => {
    try {
      setIsLocalUploading(true);

      const result = await launchImageLibrary({
        mediaType: selectedCategory === 'videos' ? 'video' : 'photo',
        selectionLimit: 0, // 0 = unlimited selection
      });

      if (!result.didCancel && result.assets && result.assets.length > 0) {
        const existingCount =
          formValues.uploadedImages[selectedCategory]?.length || 0;
        const maxLimit = selectedCategory === 'videos' ? 10 : 5;

        if (existingCount + result.assets.length > maxLimit) {
          Alert.alert(
            'Limit Exceeded',
            `You can only upload up to ${maxLimit} ${selectedCategory}.`,
          );
          return;
        }

        const onChange = (value: Record<string, string[]>) => {
          setFormValues((prev: any) => ({
            ...prev,
            uploadedImages: {
              ...prev.uploadedImages,
              ...value,
            },
          }));
        };

        await handleFileUploadToAWS(onChange, selectedCategory);
      }
    } catch (error) {
      console.error('Error selecting files:', error);
      Alert.alert('Error', 'Failed to select files. Please try again.');
    } finally {
      setIsLocalUploading(false);
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

  const renderMedia = (mediaURL: string, category: string) => {
    const isVideo =
      mediaURL.endsWith('.mp4') ||
      mediaURL.endsWith('.webm') ||
      mediaURL.endsWith('.avi');
    const isSelected = formValues.uploadedImages[category]?.includes(mediaURL);

    return (
      <View style={tw`relative mb-2.5 w-24 h-24`}>
        <TouchableOpacity
          style={tw`absolute top-1 right-1 bg-red-500 rounded-full w-6 h-6 justify-center items-center z-10`}
          onPress={() => handleSelectImage(mediaURL, category)}>
          <Ionicons name="trash" size={14} color="white" />
        </TouchableOpacity>

        {isVideo ? (
          <View
            style={tw`w-24 h-24 bg-gray-100 justify-center items-center rounded`}>
            <Text style={tw`mb-1`}>Video</Text>
            <Ionicons name="play-circle-outline" size={24} color="black" />
          </View>
        ) : (
          <Image
            source={{uri: mediaURL}}
            style={tw`w-24 h-24 rounded ${
              isSelected ? 'border-3 border-blue-500' : ''
            }`}
          />
        )}
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
          <View
            style={tw`flex-row justify-between items-center p-4 border-b border-gray-200`}>
            <Text style={tw`text-lg font-bold`}>Upload Images</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>

          <ScrollView style={tw`p-4 `}>
            <View style={tw`bg-blue-50 border border-gray-300 rounded-md p-4`}>
              <Text style={tw`text-base font-medium`}>Upload Images</Text>

              <Controller
                name="uploadedImages"
                control={control}
                render={({field: {onChange}}) => (
                  <>
                    <View style={tw`mb-5`}>
                      {customLogoVisible &&
                        renderButton('Upload Custom Logo', () => {
                          handleUploadImage(onChange, 'logo');
                          setSelectedCategory('landingPage');
                          setShowImageSelection(true);
                          setDatabaseImages([]);
                          fetchImagesFromDatabase('LANDING_PAGE');
                        })}

                      {renderButton('Upload Landing Page Image', () => {
                        setSelectedCategory('landingPage');
                        setShowImageSelection(true);
                        setDatabaseImages([]);
                        fetchImagesFromDatabase('LANDING_PAGE');
                      })}

                      {renderButton('Upload About Us Image', () => {
                        setSelectedCategory('aboutUs');
                        setShowImageSelection(true);
                        setDatabaseImages([]);
                        fetchImagesFromDatabase('ABOUT_US_PAGE');
                      })}

                      {/* Gallery Image Buttons */}
                      {[1, 2, 3, 4, 5, 6].map(slot => (
                        <React.Fragment key={`gallery-${slot}`}>
                          {renderButton(`Upload Gallery Image ${slot}`, () => {
                            setSelectedCategory('gallery');
                            setShowImageSelection(true);
                            setSelectedGallerySlot(slot);
                            setDatabaseImages([]);
                            fetchImagesFromDatabase('GALLERY_PAGE');
                          })}
                        </React.Fragment>
                      ))}

                      {/* Product Image Buttons */}
                      {productImagesVisible &&
                        [1, 2, 3, 4, 5].map(slot => (
                          <React.Fragment key={`product-${slot}`}>
                            {renderButton(`Upload Product Image ${slot}`, () =>
                              handleUploadProductImage(slot),
                            )}
                          </React.Fragment>
                        ))}

                      {paymentQRVisible &&
                        renderButton('Upload Payment QR Image', () =>
                          handleFileUploadToAWS(onChange, 'paymentQR'),
                        )}

                      {renderButton('Upload Items (Max 5)', () =>
                        handleUploadImage(onChange, 'items'),
                      )}

                      {videosPageVisible &&
                        renderButton('Upload Video', () => {
                          setSelectedCategory('videos');
                          setShowImageSelection(true);
                          setDatabaseImages([]);
                        })}
                    </View>

                    {/* Item Price Input Fields */}
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

                    {/* Display uploaded media */}
                    <View style={tw`flex-row flex-wrap mt-5`}>
                      {(
                        Object.entries(
                          formValues.uploadedImages as Record<string, string[]>,
                        ) || []
                      ).map(([category, media]) =>
                        media.length > 0 ? (
                          <React.Fragment key={category}>
                            {media.map((mediaURL: string, index: number) => (
                              <View
                                key={`${category}-${index}`}
                                style={tw`m-1`}>
                                {renderMedia(mediaURL, category)}
                              </View>
                            ))}
                          </React.Fragment>
                        ) : null,
                      )}
                    </View>
                  </>
                )}
              />

              <TouchableOpacity
                style={tw`${
                  isUploading ? 'bg-gray-400' : 'bg-green-500'
                } p-4 rounded mt-2 mb-5  items-center`}
                onPress={saveUploadedImages}
                disabled={isUploading}>
                {isUploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={tw`text-white text-base font-bold`}>
                    Upload Images
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Image Selection Modal */}
      <Modal
        visible={showImageSelection}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowImageSelection(false)}>
        <View
          style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
          <View
            style={[tw`w-10/12 bg-white rounded-lg p-5`, {maxHeight: '80%'}]}>
            <Text style={tw`text-lg font-bold mb-4`}>Select</Text>

            {selectedCategory === 'videos' ? (
              <RadioButton.Group
                onValueChange={value => setSelectedOption(value)}
                value={selectedOption}>
                <View style={tw`flex-row items-center mb-2.5`}>
                  <RadioButton value="custom" />
                  <Text>Upload from Device</Text>
                </View>
                <View style={tw`flex-row items-center mb-2.5`}>
                  <RadioButton value="url" />
                  <Text>Enter Video URLs</Text>
                </View>
              </RadioButton.Group>
            ) : selectedCategory === 'items' ? null : (
              <RadioButton.Group
                onValueChange={value => setSelectedOption(value)}
                value={selectedOption}>
                <View style={tw`flex-row items-center mb-2.5`}>
                  <RadioButton value="custom" />
                  <Text>Upload from Device</Text>
                </View>
                <View style={tw`flex-row items-center mb-2.5`}>
                  <RadioButton value="default" />
                  <Text>Select from Default Images</Text>
                </View>
              </RadioButton.Group>
            )}

            {selectedCategory === 'videos' && selectedOption === 'url' && (
              <ScrollView style={[tw``, {maxHeight: 256}]}>
                {[...Array(10)].map((_, index) => (
                  <TextInput
                    key={index}
                    style={tw`bg-white border border-gray-300 rounded p-2.5 mb-2.5`}
                    placeholder={`Video URL ${index + 1}`}
                    value={videoUrls[index]}
                    onChangeText={text => handleUrlChange(text, index)}
                  />
                ))}
              </ScrollView>
            )}

            {selectedCategory === 'videos' && selectedOption === 'custom' && (
              <View style={tw`items-center my-4`}>
                <TouchableOpacity
                  style={tw`flex-row items-center justify-center bg-gray-100 p-4 rounded border border-gray-300 border-dashed w-full mb-2`}
                  onPress={handleSelectItemImages}>
                  <Ionicons name="document-attach" size={24} color="blue" />
                  <Text style={tw`ml-2 text-blue-500`}>Select Video Files</Text>
                </TouchableOpacity>
                <Text style={tw`text-gray-500 text-xs`}>
                  Please select your video files.
                </Text>
              </View>
            )}

            {selectedCategory !== 'videos' &&
              selectedCategory !== 'items' &&
              selectedOption === 'custom' && (
                <View style={tw`items-center my-4`}>
                  <TouchableOpacity
                    style={tw`flex-row items-center justify-center bg-gray-100 p-4 rounded border border-gray-300 border-dashed w-full mb-2`}
                    onPress={handleSelectItemImages}>
                    <Ionicons name="image" size={24} color="blue" />
                    <Text style={tw`ml-2 text-blue-500`}>Select Images</Text>
                  </TouchableOpacity>
                  <Text style={tw`text-gray-500 text-xs`}>
                    Please select your images.
                  </Text>
                </View>
              )}

            {selectedCategory !== 'videos' &&
              selectedCategory !== 'items' &&
              selectedOption === 'default' && (
                <ScrollView style={[tw``, {maxHeight: 256}]}>
                  {databaseImages.length === 0 ? (
                    <ActivityIndicator size="small" color="blue" />
                  ) : (
                    <View style={tw`flex-row flex-wrap justify-between`}>
                      {databaseImages.map((image: any, index: number) => {
                        const isSelected = formValues.uploadedImages?.[
                          selectedCategory
                        ]?.includes(image.url);
                        return (
                          <TouchableOpacity
                            key={index}
                            onPress={() =>
                              handleSelectImage(image.url, selectedCategory)
                            }
                            style={tw`m-1`}>
                            <Image
                              source={{uri: image.url}}
                              style={tw`w-36 h-36 rounded ${
                                isSelected ? 'border-3 border-blue-500' : ''
                              }`}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>
              )}

            {selectedCategory === 'items' && (
              <View style={tw`items-center my-4`}>
                <TouchableOpacity
                  style={tw`flex-row items-center justify-center bg-gray-100 p-4 rounded border border-gray-300 border-dashed w-full mb-2`}
                  onPress={handleSelectItemImages}>
                  <Ionicons name="cloud-upload" size={24} color="blue" />
                  <Text style={tw`ml-2 text-blue-500`}>Select Files</Text>
                </TouchableOpacity>
                <Text style={tw`text-gray-500 text-xs`}>
                  Please select your items (images or videos).
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={tw`bg-blue-500 p-3 rounded items-center mt-4`}
              onPress={() => {
                if (selectedCategory === 'videos' && selectedOption === 'url') {
                  handleSaveUrls();
                }
                setShowImageSelection(false);
              }}>
              <Text style={tw`text-white text-base font-medium`}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
