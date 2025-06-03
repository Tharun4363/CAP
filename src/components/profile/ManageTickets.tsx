import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import tw from 'tailwind-react-native-classnames';
import axios from 'axios';
import * as Animatable from 'react-native-animatable';
import {API_IP_ADDRESS} from '../../../config';
import {useAuth} from '../../Auth/AuthContext';
import Toast from 'react-native-toast-message';
import {KeyboardTypeOptions} from 'react-native';

const ManageTickets = () => {
  const router = useNavigation();
  const {user, isAuthenticated} = useAuth();
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [customerId, setCustomerId] = useState(user?.cust_id);
  const [customerUniqueId, setCustomerUniqueId] = useState(
    user?.cust_uniq_id ?? '',
  );
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const regex = /\S+@\S+\.\S+/;
    return regex.test(email);
  };

  const handleTicket = async () => {
    if (
      !name ||
      !mobileNumber ||
      !email ||
      !customerId ||
      !customerUniqueId ||
      !issue
    ) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all required fields.',
        position: 'bottom',
      });
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid email address.',
        position: 'bottom',
      });
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

    try {
      const response = await axios.post(
        `${API_IP_ADDRESS}/submit-ticket`,
        ticketData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.status === 200) {
        Alert.alert('Success', 'Your ticket has been submitted successfully!');
        setName('');
        setMobileNumber('');
        setEmail('');
        setCustomerId('');
        setCustomerUniqueId('');
        setWebsiteUrl('');
        setIssue('');
        router.goBack();
      } else {
        // Alert.alert(
        //   'Error',
        //   response.data.message || 'Something went wrong. Please try again.',
        // );
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2:
            response.data.message || 'Something went wrong. Please try again.',
          position: 'bottom',
        });
      }
    } catch (error) {
      console.error(error);
      // Alert.alert('Error', 'An error occurred while submitting the ticket.');
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
          style={tw`flex-row items-center mb-4`}>
          <Ionicons name="arrow-back" size={24} color="black" />
          <Text style={tw`ml-2 text-lg`}>Back</Text>
        </TouchableOpacity>

        <Animatable.Text
          animation="fadeInDown"
          delay={200}
          style={tw`text-xl font-bold text-center my-2`}>
          Support Ticket
        </Animatable.Text>
        <Animatable.Text
          animation="fadeIn"
          delay={400}
          style={tw`text-gray-500 text-center mb-4`}>
          Fill in the form below to create a support ticket.
        </Animatable.Text>

        <Animatable.View
          animation="fadeInUp"
          delay={500}
          style={tw`bg-white p-4 rounded-lg shadow-md`}>
          <View style={tw`flex-row flex-wrap justify-between`}>
            {/* Animating each form field container */}
            {[
              {
                label: 'Name *',
                value: name,
                onChangeText: setName,
                placeholder: 'Your Name',
              },
              {
                label: 'Mobile Number *',
                value: mobileNumber,
                onChangeText: setMobileNumber,
                placeholder: 'Your Mobile Number',
                keyboardType: 'phone-pad',
              },
              {
                label: 'Email *',
                value: email,
                onChangeText: setEmail,
                placeholder: 'Your Email Address',
                keyboardType: 'email-address',
              },
              {
                label: 'Customer ID *',
                value: customerId,
                onChangeText: setCustomerId,
                placeholder: 'CUST....',
              },
              {
                label: 'Customer Unique ID *',
                value: customerUniqueId,
                onChangeText: setCustomerUniqueId,
                placeholder: 'IND....',
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
                style={tw`w-full sm:w-1/2 mb-4`}>
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
              </Animatable.View>
            ))}
          </View>

          <Animatable.View
            animation="fadeInUp"
            delay={1200}
            style={tw`w-full mb-4`}>
            <Text style={tw`text-gray-700 mb-1`}>Issue *</Text>
            <TextInput
              style={tw`border border-gray-300 p-2 rounded-md`}
              placeholder="Describe your issue"
              multiline
              value={issue}
              onChangeText={setIssue}
            />
          </Animatable.View>

          <Animatable.View animation="bounceIn" delay={1300}>
            <TouchableOpacity
              style={tw`bg-blue-600 py-3 rounded-md mt-2`}
              onPress={handleTicket}
              disabled={loading}>
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
