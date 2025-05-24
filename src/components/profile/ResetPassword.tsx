import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import tw from 'tailwind-react-native-classnames';
import {useNavigation} from '@react-navigation/native';
import {API_IP_ADDRESS} from '../../../config';
import {useAuth} from '../../Auth/AuthContext';
import Toast from 'react-native-toast-message';

export interface User {
  cust_id: string;
  cust_uniq_id: string;
  token?: string;
}

const ResetPassword = () => {
  const navigation = useNavigation();
  const {user, isAuthenticated} = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const customerId = user?.cust_id ?? '';
  const customerUniqueId = user?.cust_uniq_id ?? '';
  const token = user?.token ?? '';

  const showToast = (type: string, text1: string, text2: string = '') => {
    Toast.show({
      type,
      text1,
      text2,
      position: 'bottom',
      visibilityTime: 3000,
    });
  };

  const handleResetPassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return showToast('error', 'Missing Fields', 'Please fill in all fields.');
    }
    if (newPassword !== confirmNewPassword) {
      return showToast(
        'error',
        'Password Mismatch',
        'New passwords do not match.',
      );
    }

    try {
      setIsLoading(true);
      const payload = {
        token,
        customerId,
        customerUniqueId,
        currentPassword,
        newPassword,
      };

      const response = await axios.post(
        `${API_IP_ADDRESS}/api/reset-password`,
        payload,
      );

      if (response.data.success) {
        showToast('success', 'Password Reset', 'Please check your email.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');

        setTimeout(() => {
          navigation.goBack();
        }, 1500); // Let the toast appear before navigating
      } else {
        showToast('error', 'Error', response.data.message);
      }
    } catch (error) {
      console.error('Reset error:', error);
      showToast('error', 'Error', 'Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <Text>Please log in to reset your password.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-gray-100`}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={tw`p-6`}
        keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={tw`flex-row items-center mb-4`}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="black" />
          <Text style={tw`ml-2 text-lg font-semibold`}>Back</Text>
        </TouchableOpacity>

        <Text style={tw`text-3xl font-bold mb-1 text-gray-900`}>
          Reset Password
        </Text>
        <Text style={tw`text-gray-600 mb-6`}>
          Enter your customer details and reset your password securely.
        </Text>

        <View style={tw`bg-white rounded-2xl p-5 shadow`}>
          <Text style={tw`text-sm font-semibold mb-1`}>Customer ID *</Text>
          <TextInput
            value={customerId}
            editable={false}
            style={tw`bg-gray-100 border border-gray-300 rounded-lg p-3 mb-4 text-gray-500`}
          />

          <Text style={tw`text-sm font-semibold mb-1`}>
            Customer Unique ID *
          </Text>
          <TextInput
            value={customerUniqueId}
            editable={false}
            style={tw`bg-gray-100 border border-gray-300 rounded-lg p-3 mb-4 text-gray-500`}
          />

          {[
            {
              label: 'Current Password',
              value: currentPassword,
              onChangeText: setCurrentPassword,
              show: showCurrentPassword,
              toggle: () => setShowCurrentPassword(!showCurrentPassword),
            },
            {
              label: 'New Password',
              value: newPassword,
              onChangeText: setNewPassword,
              show: showNewPassword,
              toggle: () => setShowNewPassword(!showNewPassword),
            },
            {
              label: 'Confirm New Password',
              value: confirmNewPassword,
              onChangeText: setConfirmNewPassword,
              show: showConfirmPassword,
              toggle: () => setShowConfirmPassword(!showConfirmPassword),
            },
          ].map((item, idx) => (
            <View key={idx} style={tw`mb-4`}>
              <Text style={tw`text-sm font-semibold mb-1`}>{item.label} *</Text>
              <View
                style={tw`flex-row items-center border border-gray-300 rounded-lg`}>
                <TextInput
                  secureTextEntry={!item.show}
                  value={item.value}
                  onChangeText={item.onChangeText}
                  placeholder={`Enter ${item.label.toLowerCase()}`}
                  style={tw`flex-1 p-3`}
                />
                <TouchableOpacity onPress={item.toggle} style={tw`p-3`}>
                  <Ionicons
                    name={item.show ? 'eye' : 'eye-off'}
                    size={20}
                    color="gray"
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={tw`bg-blue-600 py-3 rounded-lg mt-2 ${
              isLoading ? 'opacity-50' : ''
            }`}
            onPress={handleResetPassword}
            disabled={isLoading}>
            <Text style={tw`text-white text-center font-semibold`}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ResetPassword;
