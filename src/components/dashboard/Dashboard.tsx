import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import tw from 'tailwind-react-native-classnames';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Sidebar from './Sidebar';

const Dashboard = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  const analytics = [
    {icon: 'users', label: 'Users', value: '1,245', color: 'blue'},
    {icon: 'shopping-cart', label: 'Orders', value: '478', color: 'green'},
    {icon: 'dollar-sign', label: 'Revenue', value: '$25.6K', color: 'orange'},
  ];

  const activities = [
    '✅ Order placed by Alex Smith',
    '📦 Inventory updated for product ID #234',
    '📩 New message from client John',
    '🔔 Reminder set for meeting',
  ];

  const tasks = [
    '📌 Call client about invoice',
    '📝 Prepare sales report',
    '🛒 Check supplier inventory',
    '📆 Review timesheets',
  ];

  const isMobile = Dimensions.get('window').width <= 768; // Mobile check for responsive design

  return (
    <View style={tw`flex-1 flex-row bg-gray-100`}>
      {/* Sidebar */}
      <Sidebar
        isMobile={isMobile}
        sidebarVisible={sidebarVisible}
        toggleSidebar={toggleSidebar}
      />

      {/* Main content */}
      <View style={tw`flex-1`}>
        {/* Mobile header with toggle button */}
        {isMobile && !sidebarVisible && (
          <View
            style={tw`bg-gray-900 w-full absolute top-0 z-20 flex-row items-center py-4 px-4`}>
            <TouchableOpacity
              onPress={toggleSidebar}
              style={tw`p-2 rounded-lg`}>
              <MaterialIcons name="menu" size={24} color="white" />
            </TouchableOpacity>
            <Text style={tw`ml-6 text-white text-lg font-semibold`}>
              Dashboard
            </Text>
          </View>
        )}

        <ScrollView contentContainerStyle={tw`p-4 mt-20`}>
          {/* <Text style={tw`text-3xl font-bold text-gray-800 text-center mb-4`}>
            CRM Dashboard
          </Text> */}

          {/* Analytics */}
          <View style={tw`bg-white p-5 rounded-xl shadow mb-4`}>
            <Text style={tw`text-lg font-bold text-gray-800 mb-3`}>
              Analytics
            </Text>
            <View style={tw`flex-row justify-between`}>
              {analytics.map((item, idx) => (
                <View key={idx} style={tw`items-center`}>
                  <Feather name={item.icon} size={24} color={item.color} />
                  <Text style={tw`text-lg font-bold`}>{item.value}</Text>
                  <Text style={tw`text-gray-500 text-sm`}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recent Activity */}
          <View style={tw`bg-white p-5 rounded-xl shadow mb-4`}>
            <Text style={tw`text-lg font-bold text-gray-800 mb-2`}>
              Recent Activity
            </Text>
            {activities.map((item, idx) => (
              <Text key={idx} style={tw`text-gray-600 mb-1`}>
                {item}
              </Text>
            ))}
          </View>

          {/* Task Reminders */}
          <View style={tw`bg-white p-5 rounded-xl shadow`}>
            <Text style={tw`text-lg font-bold text-gray-800 mb-2`}>
              Tasks & Reminders
            </Text>
            {tasks.map((item, idx) => (
              <Text key={idx} style={tw`text-gray-600 mb-1`}>
                {item}
              </Text>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default Dashboard;
