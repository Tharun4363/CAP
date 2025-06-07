import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardTypeOptions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import tw from 'tailwind-react-native-classnames';
import axios from 'axios';
import * as Animatable from 'react-native-animatable';
import { API_IP_ADDRESS } from '../../../config';
import { useAuth } from '../../Auth/AuthContext';
import Toast from 'react-native-toast-message';

const ManageTickets = () => {
  const router = useNavigation();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [customerId, setCustomerId] = useState(user?.cust_id ?? '');
  const [customerUniqueId, setCustomerUniqueId] = useState(user?.cust_uniq_id ?? '');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);

  // For showing errors below fields
  const [errors, setErrors] = useState<{
    name?: string;
    mobileNumber?: string;
    email?: string;
    customerId?: string;
    customerUniqueId?: string;
    issue?: string;
  }>({});

  // For showing success message on screen
  const [successMessage, setSuccessMessage] = useState('');

  const isValidEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const isValidPhoneNumber = (phone: string) => {
    const regex = /^[0-9]{10}$/;
    return regex.test(phone);
  };

  const validateFields = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!mobileNumber.trim()) newErrors.mobileNumber = 'Mobile number is required';
    else if (!isValidPhoneNumber(mobileNumber)) newErrors.mobileNumber = 'Mobile number must be exactly 10 digits';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!isValidEmail(email)) newErrors.email = 'Invalid email address';
    if (!customerId.trim()) newErrors.customerId = 'Customer ID is required';
    if (!customerUniqueId.trim()) newErrors.customerUniqueId = 'Customer Unique ID is required';
    if (!issue.trim()) newErrors.issue = 'Issue description is required';

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleTicket = async () => {
    setSuccessMessage('');
    if (!validateFields()) {
      // If validation errors exist, do not proceed
      return;
    }

    setLoading(true);

    const ticketData = {
      name,
      mobileNumber,
      email,
      customerId,
      customerUniqueId,
      websiteUrl,
      issue,
    };

    console.log('Submitting ticket with data:', ticketData);

    try {
      const response = await axios.post(
        `${API_IP_ADDRESS}/submit-ticket`,
        ticketData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('API response:', response);

      if (response.status === 200) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Your ticket has been submitted successfully.',
          position: 'bottom',
        });

        setSuccessMessage('Your ticket has been submitted successfully.');

        // Reset fields
        setName('');
        setMobileNumber('');
        setEmail('');
        setCustomerId(user?.cust_id ?? '');
        setCustomerUniqueId(user?.cust_uniq_id ?? '');
        setWebsiteUrl('');
        setIssue('');
        setErrors({});

        // Optionally go back after delay (commented out to keep message visible)
        // setTimeout(() => router.goBack(), 2000);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.data.message || 'Something went wrong. Please try again.',
          position: 'bottom',
        });
      }
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An error occurred while submitting the ticket.',
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-gray-100 p-4 mt-6`}>
      <ScrollView contentContainerStyle={tw`flex-grow`}>
        <TouchableOpacity
          onPress={() => router.goBack()}
          style={tw`flex-row items-center mb-4`}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
          <Text style={tw`ml-2 text-lg`}>Back</Text>
        </TouchableOpacity>

        <Animatable.Text
          animation="fadeInDown"
          delay={200}
          style={tw`text-xl font-bold text-center my-2`}
        >
          Support Ticket
        </Animatable.Text>
        <Animatable.Text
          animation="fadeIn"
          delay={400}
          style={tw`text-gray-500 text-center mb-4`}
        >
          Fill in the form below to create a support ticket.
        </Animatable.Text>

        <Animatable.View
          animation="fadeInUp"
          delay={500}
          style={tw`bg-white p-4 rounded-lg shadow-md`}
        >
          <View style={tw`flex-row flex-wrap justify-between`}>
            {[
              {
                label: 'Name *',
                value: name,
                onChangeText: setName,
                placeholder: 'Your Name',
                error: errors.name,
              },
              {
                label: 'Mobile Number *',
                value: mobileNumber,
                onChangeText: setMobileNumber,
                placeholder: 'Your Mobile Number',
                keyboardType: 'phone-pad',
                error: errors.mobileNumber,
              },
              {
                label: 'Email *',
                value: email,
                onChangeText: setEmail,
                placeholder: 'Your Email Address',
                keyboardType: 'email-address',
                error: errors.email,
              },
              {
                label: 'Customer ID *',
                value: customerId,
                onChangeText: setCustomerId,
                placeholder: 'CUST....',
                error: errors.customerId,
              },
              {
                label: 'Customer Unique ID *',
                value: customerUniqueId,
                onChangeText: setCustomerUniqueId,
                placeholder: 'IND....',
                error: errors.customerUniqueId,
              },
              {
                label: 'Website URL',
                value: websiteUrl,
                onChangeText: setWebsiteUrl,
                placeholder: 'Your Website URL',
              },
            ].map((field, index) => (
              <Animatable.View
                key={index}
                animation="fadeInUp"
                delay={600 + index * 100}
                style={tw`w-full mb-4`}
              >
                <Text style={tw`text-gray-700 mb-1`}>{field.label}</Text>
                <TextInput
                  style={tw`border border-gray-300 p-2 rounded-md`}
                  placeholder={field.placeholder}
                  value={field.value}
                  onChangeText={field.onChangeText}
                  keyboardType={
                    (field.keyboardType as KeyboardTypeOptions) || 'default'
                  }
                />
                {field.error && (
                  <Text style={tw`text-red-600 mt-1`}>{field.error}</Text>
                )}
              </Animatable.View>
            ))}
          </View>

          <Animatable.View
            animation="fadeInUp"
            delay={1200}
            style={tw`w-full mb-4`}
          >
            <Text style={tw`text-gray-700 mb-1`}>Issue *</Text>
            <TextInput
              style={tw`border border-gray-300 p-2 rounded-md`}
              placeholder="Describe your issue"
              multiline
              value={issue}
              onChangeText={setIssue}
            />
            {errors.issue && (
              <Text style={tw`text-red-600 mt-1`}>{errors.issue}</Text>
            )}
          </Animatable.View>

          {successMessage ? (
            <Animatable.Text
              animation="fadeIn"
              style={tw`text-green-600 mb-4 text-center font-semibold`}
            >
              {successMessage}
            </Animatable.Text>
          ) : null}

          <Animatable.View animation="bounceIn" delay={1300}>
            <TouchableOpacity
              style={tw`bg-blue-600 py-3 rounded-md mt-2`}
              onPress={handleTicket}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={tw`text-white text-center text-lg`}>
                  Submit Ticket
                </Text>
              )}
            </TouchableOpacity>
          </Animatable.View>
        </Animatable.View>
      </ScrollView>
    </View>
  );
};

export default ManageTickets;
