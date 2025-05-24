import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';

interface SidebarProps {
  isMobile: boolean;
  sidebarVisible: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isMobile,
  sidebarVisible,
  toggleSidebar,
}) => {
  const navigation = useNavigation();

  const menuItems = [
    {title: 'Home', icon: 'home', path: 'Home'},
    {title: 'Customer Details', icon: 'person', path: 'CustomerDetails'},
    {title: 'Pay Later Details', icon: 'payment', path: 'PayLaterDetails'},
    {title: 'Item Details', icon: 'inventory', path: 'ItemDetails'},
    {title: 'Inventory Status', icon: 'assessment', path: 'InventoryStatus'},
    {title: 'Sales Tracker', icon: 'bar-chart', path: 'SalesTracker'},
    {title: 'Orders', icon: 'shopping-bag', path: 'Orders'},
    {title: 'Contact Support', icon: 'support-agent', path: 'ContactSupport'},
    {title: 'Employee Details', icon: 'badge', path: 'EmployeeDetails'},
    {
      title: 'Employee Timesheets',
      icon: 'schedule',
      path: 'EmployeeTimesheets',
    },
    {title: 'Order Items', icon: 'list', path: 'OrderItems'},
  ];

  if (isMobile && !sidebarVisible) return null;

  return (
    <View
      style={[
        tw`h-full bg-gray-900 p-4`,
        styles.sidebar,
        {
          width: isMobile ? 240 : 224,
          position: isMobile ? 'absolute' : 'relative',
          zIndex: 10,
        },
      ]}>
      {isMobile && (
        <TouchableOpacity onPress={toggleSidebar} style={tw`self-end mb-4`}>
          <MaterialIcons name="close" size={24} color="white" />
        </TouchableOpacity>
      )}
      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => {
            navigation.navigate(item.path as never);
            if (isMobile) toggleSidebar();
          }}
          style={tw`flex-row items-center py-3 px-2 rounded`}>
          <MaterialIcons
            name={item.icon}
            size={22}
            color="white"
            style={tw`mr-4`}
          />
          <Text style={tw`text-white text-base`}>{item.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const DashboardContent = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      const width = Dimensions.get('window').width;
      setIsMobile(width < 768);
    };

    updateLayout();
    const subscription = Dimensions.addEventListener('change', updateLayout);

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <View style={tw`flex-1`}>
      {isMobile && !sidebarVisible && (
        <View
          style={tw`bg-gray-900 w-full absolute top-0 z-20 flex-row items-center py-4 px-4`}>
          <TouchableOpacity
            onPress={toggleSidebar}
            style={tw`bg-gray-900 p-3 rounded-lg`}>
            <MaterialIcons name="menu" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`ml-8 text-white text-lg font-semibold`}>
            Welcome to Insight CRM
          </Text>
        </View>
      )}
      <View style={tw`flex-row h-full`}>
        <Sidebar
          isMobile={isMobile}
          sidebarVisible={sidebarVisible}
          toggleSidebar={toggleSidebar}
        />
        <View
          style={[
            tw`flex-1 p-6 bg-gray-100`,
            isMobile && sidebarVisible ? {opacity: 0.5} : null,
          ]}>
          <Text
            style={tw`text-2xl pt-8 font-bold text-center text-gray-800 mt-${
              isMobile ? '12' : '0'
            }`}>
            Dashboard
          </Text>
          <Text style={tw`text-gray-600 text-center mt-2`}>
            Welcome to your dashboard!
          </Text>
          <ScrollView style={tw`mt-4`} showsVerticalScrollIndicator={false}>
            <View style={tw`bg-white p-5 rounded-lg shadow-md mb-4`}>
              <Text style={tw`text-lg font-bold text-gray-800`}>
                Analytics Overview
              </Text>
              <Text style={tw`text-gray-600 mt-1`}>
                View your latest stats and performance metrics.
              </Text>
              <View style={tw`flex-row justify-between mt-4`}>
                <View style={tw`items-center`}>
                  <MaterialIcons name="people" size={24} color="blue" />
                  <Text style={tw`text-lg font-bold`}>1,200</Text>
                  <Text style={tw`text-gray-500 text-sm`}>Users</Text>
                </View>
                <View style={tw`items-center`}>
                  <MaterialIcons name="shopping-cart" size={24} color="green" />
                  <Text style={tw`text-lg font-bold`}>350</Text>
                  <Text style={tw`text-gray-500 text-sm`}>Orders</Text>
                </View>
                <View style={tw`items-center`}>
                  <MaterialIcons name="attach-money" size={24} color="red" />
                  <Text style={tw`text-lg font-bold`}>$15K</Text>
                  <Text style={tw`text-gray-500 text-sm`}>Revenue</Text>
                </View>
              </View>
            </View>

            <View style={tw`bg-white p-5 rounded-lg shadow-md mb-4`}>
              <Text style={tw`text-lg font-bold text-gray-800`}>
                Recent Activity
              </Text>
              <View style={tw`mt-3`}>
                <Text style={tw`text-gray-600 mb-1`}>
                  ✅ New order placed by John Doe
                </Text>
                <Text style={tw`text-gray-600 mb-1`}>
                  🚀 Website deployed successfully
                </Text>
                <Text style={tw`text-gray-600 mb-1`}>
                  📩 New message from a client
                </Text>
              </View>
            </View>

            <View style={tw`bg-white p-5 rounded-lg shadow-md mb-4`}>
              <Text style={tw`text-lg font-bold text-gray-800`}>
                Tasks & Reminders
              </Text>
              <View style={tw`mt-3`}>
                <Text style={tw`text-gray-600 mb-1`}>
                  📌 Update website content
                </Text>
                <Text style={tw`text-gray-600 mb-1`}>
                  📅 Schedule a meeting with a client
                </Text>
                <Text style={tw`text-gray-600 mb-1`}>
                  🔄 Check for system updates
                </Text>
              </View>
            </View>

            <View style={tw`h-24`} />
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 2, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
});

export default DashboardContent;
