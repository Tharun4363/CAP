import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import tw from 'tailwind-react-native-classnames';
import {Title} from 'react-native-paper';

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
    {title: 'Dashboard', icon: 'dashboard', path: 'Dashboard'},
    {title: 'Customer Details', icon: 'person', path: 'CustomerDetails'},
    {title: 'Pay Later Details', icon: 'payment', path: 'PayLaterDetails'},
    {title: 'Inventory Status', icon: 'assessment', path: 'InventoryStatus'},
    {title: 'Sales Tracker', icon: 'bar-chart', path: 'SalesTracker'},
    // {title: 'Contact Support', icon: 'support-agent', path: 'ContactSupport'},
    {title: 'Employee Details', icon: 'badge', path: 'EmployeeDetails'},
    {
      title: 'Employee Timesheets',
      icon: 'schedule',
      path: 'EmployeeTimesheets',
    },
    {title: 'Item Details', icon: 'inventory', path: 'ItemDetails'},
    {title: 'Order Items', icon: 'list', path: 'OrderItems'},
    {title: 'Orders', icon: 'shopping-bag', path: 'Orders'},
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

const styles = StyleSheet.create({
  sidebar: {
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 2, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
});

export default Sidebar;
