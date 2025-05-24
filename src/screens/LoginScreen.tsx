import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import tw from 'tailwind-react-native-classnames';
import {API_IP_ADDRESS} from '../../config';
import {useAuth} from '../Auth/AuthContext';

export default function LoginScreen() {
  const [custUniqId, setCustUniqId] = useState('');
  const [custId, setCustId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {login} = useAuth(); // ✅ Correct usage of AuthContext

  const validateInputs = () => {
    console.log('Inputs:', custUniqId, custId, password);
    if (!custUniqId || !custId || !password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'All fields are required!',
      });

      return false;
    }

    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Password must be at least 6 characters!',
      });
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_IP_ADDRESS}/api/login`, {
        cust_uniq_id: custUniqId,
        cust_id: custId,
        password,
      });

      if (response.data.success) {
        await Promise.all([
          AsyncStorage.setItem('token', response.data.token),
          AsyncStorage.setItem('cust_uniq_id', response.data.user.cust_uniq_id),
          AsyncStorage.setItem('customerId', response.data.user.cust_id),
        ]);

        Toast.show({
          type: 'success',
          text1: 'Login Successful',
          text2: 'Redirecting...',
        });

        setTimeout(() => {
          login(response.data.token, response.data.user); // ✅ Triggers auth context login
        }, 1000);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Invalid Credentials',
          text2: response.data.message || 'Check your details.',
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      console.log('Error:', errorMessage);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };
  console.log('API IP Address:', API_IP_ADDRESS);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw`flex-1 bg-white justify-center px-5`}
      enabled>
      <View style={tw`items-center mb-5`}>
        <Image
          source={{uri: 'https://readymadeui.com/login-image.webp'}}
          style={{width: 200, height: 200}}
          resizeMode="contain"
          accessibilityLabel="App logo"
        />
        <Text style={tw`text-xl font-bold text-center mt-5 text-gray-800`}>
          Welcome to Ai4Bazaar Customer Portal
        </Text>
      </View>

      <View style={tw`p-5 rounded-lg bg-white shadow-lg`}>
        <Text style={tw`text-lg font-bold text-gray-800 mb-3`}>
          Sign In to manage your customer portal.
        </Text>

        <TextInput
          style={tw`w-full border border-gray-300 p-3 rounded-lg text-base mb-3 text-gray-900`}
          placeholder="Customer Unique ID"
          placeholderTextColor="#888"
          value={custUniqId}
          onChangeText={setCustUniqId}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={tw`w-full border border-gray-300 p-3 rounded-lg text-base mb-3 text-gray-900`}
          placeholder="Customer ID"
          placeholderTextColor="#888"
          value={custId}
          onChangeText={setCustId}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={tw`relative mb-5`}>
          <TextInput
            style={tw`w-full border border-gray-300 p-3 rounded-lg text-base text-gray-900`}
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={tw`absolute right-3 top-3`}
            onPress={() => setShowPassword(!showPassword)}>
            <Text style={tw`text-blue-500`}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={tw`bg-blue-500 py-3 rounded-lg items-center`}
          onPress={handleLogin}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={tw`text-white text-lg font-bold`}>Login</Text>
          )}
        </TouchableOpacity>

        {/* <TouchableOpacity style={tw`mt-4`}>
          <Text style={tw`text-blue-500 text-center`}>Forgot Password?</Text>
        </TouchableOpacity> */}
      </View>
      <Toast />
    </KeyboardAvoidingView>
  );
}
