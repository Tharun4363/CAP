import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import tw from 'tailwind-react-native-classnames';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';

const ContactUs = () => {
  const router = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!message.trim() || message.length < 10) {
      Alert.alert('Error', 'Message should be at least 10 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      console.log('Form submitted:', {name, email, message});
      setIsSubmitting(false);
      setName('');
      setEmail('');
      setMessage('');
      Alert.alert('Success', 'Your message has been sent!', [
        {text: 'OK', onPress: () => router.goBack()},
      ]);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw`flex-1 bg-gray-50`}>
      <ScrollView
        contentContainerStyle={tw`p-6 pb-16`}
        keyboardShouldPersistTaps="handled">
        {/* Header with back button */}
        <Animatable.View
          animation="fadeInDown"
          duration={500}
          style={tw`flex-row items-center mb-6`}>
          <TouchableOpacity
            onPress={() => router.goBack()}
            style={tw`p-2 rounded-full bg-white shadow-sm`}>
            <Ionicons name="arrow-back" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <Text style={tw`ml-4 text-2xl font-bold text-gray-900`}>
            Contact Us
          </Text>
        </Animatable.View>

        {/* Contact Form */}
        <Animatable.View
          animation="fadeInUp"
          duration={600}
          delay={100}
          style={tw`bg-white p-6 rounded-2xl shadow-sm mb-8`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-1`}>
            Get in touch
          </Text>
          <Text style={tw`text-gray-500 mb-6`}>
            We'll respond within 24 hours
          </Text>

          <View style={tw`mb-5`}>
            <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>
              Your name
            </Text>
            <TextInput
              style={tw`border border-gray-200 p-3 rounded-xl bg-gray-50 text-gray-800`}
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={tw`mb-5`}>
            <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>
              Email address
            </Text>
            <TextInput
              style={tw`border border-gray-200 p-3 rounded-xl bg-gray-50 text-gray-800`}
              placeholder="john@example.com"
              value={email}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={setEmail}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={tw`mb-6`}>
            <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>
              Message
            </Text>
            <TextInput
              style={tw`border border-gray-200 p-3 rounded-xl bg-gray-50 text-gray-800 h-32`}
              placeholder="Type your message here..."
              value={message}
              multiline
              textAlignVertical="top"
              onChangeText={setMessage}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={tw`bg-blue-600 p-4 rounded-xl flex-row items-center justify-center shadow-md ${
              isSubmitting ? 'opacity-80' : ''
            }`}>
            {isSubmitting ? (
              <Ionicons
                name="ios-hourglass"
                size={20}
                color="white"
                style={tw`mr-2`}
              />
            ) : (
              <Ionicons name="send" size={20} color="white" style={tw`mr-2`} />
            )}
            <Text style={tw`text-white font-medium`}>
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </Text>
          </TouchableOpacity>
        </Animatable.View>

        {/* Contact Information */}
        <Animatable.View
          animation="fadeInUp"
          duration={600}
          delay={200}
          style={tw`mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>
            Other ways to reach us
          </Text>

          <View style={tw`mb-4`}>
            <View
              style={tw`flex-row items-start bg-white p-5 rounded-2xl shadow-sm mb-4`}>
              <View style={tw`bg-blue-100 p-3 rounded-full mr-4`}>
                <MaterialIcons name="location-on" size={20} color="#3b82f6" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`font-medium text-gray-800 mb-1`}>
                  Our office
                </Text>
                <Text style={tw`text-gray-500`}>
                  10th Floor, Vasavi MPM Grand, Hyderabad, Telangana 500073
                </Text>
              </View>
            </View>

            <View
              style={tw`flex-row items-center bg-white p-5 rounded-2xl shadow-sm mb-4`}>
              <View style={tw`bg-blue-100 p-3 rounded-full mr-4`}>
                <Ionicons name="call" size={20} color="#3b82f6" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`font-medium text-gray-800 mb-1`}>
                  Customer service
                </Text>
                <Text style={tw`text-gray-500`}>1800 491 7909 (Toll Free)</Text>
              </View>
            </View>

            <View
              style={tw`flex-row items-center bg-white p-5 rounded-2xl shadow-sm`}>
              <View style={tw`bg-blue-100 p-3 rounded-full mr-4`}>
                <MaterialIcons name="email" size={20} color="#3b82f6" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`font-medium text-gray-800 mb-1`}>Email us</Text>
                <Text style={tw`text-gray-500`}>support@ai4bazaar.com</Text>
              </View>
            </View>
          </View>
        </Animatable.View>

        {/* Social Media Links */}
        <Animatable.View
          animation="fadeInUp"
          duration={600}
          delay={300}
          style={tw`mt-2`}>
          <Text style={tw`text-center text-gray-500 mb-4`}>
            Follow us on social media
          </Text>
          <View style={tw`flex-row justify-center mr-4`}>
            <TouchableOpacity style={tw`bg-blue-600 p-3 rounded-full`}>
              <Ionicons name="logo-facebook" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={tw`bg-blue-400 p-3 rounded-full`}>
              <Ionicons name="logo-twitter" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={tw`bg-pink-600 p-3 rounded-full`}>
              <Ionicons name="logo-instagram" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={tw`bg-blue-700 p-3 rounded-full`}>
              <Ionicons name="logo-linkedin" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </Animatable.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ContactUs;
