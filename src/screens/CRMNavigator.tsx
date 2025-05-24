// navigation/CRMNavigator.tsx
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import CRM from '../screens/CRM';
import CustomerDetails from '../components/dashboard/CustomerDetails';
import PayLaterDetails from '../components/dashboard/PayLaterDetails';
import OrderItems from '../components/dashboard/OrderItems';
import InventoryStatus from '../components/dashboard/InventoryStatus';
import SalesTracker from '../components/dashboard/SalesTracker';
import OrdersDetails from '../components/dashboard/OrdersDetail';

import EmployeeDetails from '../components/dashboard/EmployeeDetails';
import EmployeeTimesheets from '../components/dashboard/EmployeeTimesheets';
import ItemDetails from '../components/dashboard/ItemDetails';
import Dashboard from '../components/dashboard/Dashboard';
// Add other screens like OrderItems, etc.

const Stack = createNativeStackNavigator();

const CRMNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen name="CustomerDetails" component={CustomerDetails} />
      <Stack.Screen name="PayLaterDetails" component={PayLaterDetails} />
      <Stack.Screen name="ItemDetails" component={ItemDetails} />
      <Stack.Screen name="OrderItems" component={OrderItems} />
      <Stack.Screen name="InventoryStatus" component={InventoryStatus} />
      <Stack.Screen name="SalesTracker" component={SalesTracker} />
      <Stack.Screen name="Orders" component={OrdersDetails} />
      <Stack.Screen name="EmployeeDetails" component={EmployeeDetails} />
      <Stack.Screen name="EmployeeTimesheets" component={EmployeeTimesheets} />

      {/* Add more screens here */}
    </Stack.Navigator>
  );
};

export default CRMNavigator;
