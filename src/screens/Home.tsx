import React, {use, useEffect} from 'react';
import {ScrollView, Text, TouchableOpacity, View, Image} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../App';
import Ionicons from 'react-native-vector-icons/Ionicons';
import tw from 'tailwind-react-native-classnames';
import {useAuth} from '../Auth/AuthContext';
import axios from 'axios';
import {API_IP_ADDRESS} from '../../config';
type HomeProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const Home = ({navigation}: HomeProps) => {
  const {user} = useAuth();
  const [name, setName] = React.useState('');

  useEffect(() => {
    const fetchName = async () => {
      try {
        const response = await axios.get(
          `${API_IP_ADDRESS}/api/get-contact-name`,
          {
            params: {
              cust_id: user?.cust_id,
            },
          },
        );
        setName(response.data.contact_name); // ✅ fix key name
        console.log(response.data.contact_name);
      } catch (error) {
        console.error('Error fetching name:', error);
      }
    };

    if (user?.cust_id) {
      fetchName(); // ✅ only fetch if cust_id exists
    }
  }, [user?.cust_id]); // ✅ runs only when cust_id is available

  // Dashboard cards
  const dashboardCards = [
    {
      title: 'Update Your Website',
      subtitle: 'Start from scratch or template',
      icon: 'add-circle-outline',
      action: () => navigation.navigate('UpdateWebsite'),
      color: 'bg-blue-100',
      textColor: 'text-blue-800',
    },
    {
      title: 'Customer Relationship Management',
      subtitle: 'Manage your customers',
      icon: 'people-outline',
      action: () => navigation.navigate('CRM'),
      color: 'bg-purple-100',
      textColor: 'text-purple-800',
    },
  ];

  console.log(user, 'user Name', name);

  return (
    <ScrollView style={tw`bg-white`} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={tw`px-6 pt-16 pb-8 bg-white`}>
        <View style={tw`flex-row items-center justify-between`}>
          {/* Left Side: Welcome Text */}
          <View>
            <Text style={tw`text-lg font-medium text-gray-500`}>
              Welcome back
            </Text>
            <View style={tw`flex-row items-baseline mt-1`}>
              <Text style={tw`text-3xl font-bold text-indigo-700 mr-2`}>
                {name.toLocaleUpperCase()}
              </Text>
              <Text style={tw`text-2xl`}>👋</Text>
            </View>

            {user?.cust_id && (
              <View
                style={tw`mt-4 bg-indigo-50 rounded-lg px-3 py-2 self-start`}>
                <Text style={tw`text-xs font-medium text-indigo-600`}>
                  CUSTOMER ID
                </Text>
                <Text style={tw`text-sm font-semibold text-indigo-800 mt-1`}>
                  {user.cust_id}
                </Text>
              </View>
            )}
          </View>

          {/* Right Side: Profile Icon or Image */}
          <View
            style={tw`bg-indigo-100 rounded-full w-16 h-16 items-center justify-center`}>
            <Text style={tw`text-3xl`}>👤</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={tw`px-6 mb-8`}>
        <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>
          Quick Actions
        </Text>
        <View style={tw`flex-row justify-between flex-wrap `}>
          {dashboardCards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={tw`${card.color} rounded-xl p-5 w-full mb-4`}
              onPress={card.action}>
              <Ionicons
                name={card.icon}
                size={28}
                style={tw`${card.textColor} mb-3`}
              />
              <Text style={tw`${card.textColor} text-lg font-semibold mb-1`}>
                {card.title}
              </Text>
              <Text style={tw`text-gray-600 text-sm`}>{card.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Templates Section */}
      <View style={tw`px-6 mb-10`}>
        <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>
          Starter Templates
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity style={tw`mr-4`}>
            <View
              style={tw`bg-blue-50 rounded-xl w-40 h-48 items-center justify-center mb-2`}>
              <Ionicons name="storefront-outline" size={40} color="#3B82F6" />
            </View>
            <Text style={tw`text-center text-gray-800`}>E-commerce</Text>
          </TouchableOpacity>

          <TouchableOpacity style={tw`mr-4`}>
            <View
              style={tw`bg-purple-50 rounded-xl w-40 h-48 items-center justify-center mb-2`}>
              <Ionicons name="briefcase-outline" size={40} color="#8B5CF6" />
            </View>
            <Text style={tw`text-center text-gray-800`}>Portfolio</Text>
          </TouchableOpacity>

          <TouchableOpacity style={tw`mr-4`}>
            <View
              style={tw`bg-green-50 rounded-xl w-40 h-48 items-center justify-center mb-2`}>
              <Ionicons name="business-outline" size={40} color="#10B981" />
            </View>
            <Text style={tw`text-center text-gray-800`}>Corporate</Text>
          </TouchableOpacity>

          <TouchableOpacity>
            <View
              style={tw`bg-yellow-50 rounded-xl w-40 h-48 items-center justify-center mb-2`}>
              <Ionicons name="newspaper-outline" size={40} color="#F59E0B" />
            </View>
            <Text style={tw`text-center text-gray-800`}>Blog</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ScrollView>
  );
};

export default Home;
