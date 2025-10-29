import React from "react";
import { Ionicons } from '@expo/vector-icons';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from "./screens/DashboardScreen";
import IncomeScreen from "./screens/IncomeScreen";
import ExpensesScreen from "./screens/ExpensesScreen";
import DailySpendsScreen from "./screens/DailySpendsScreen";
import AddSpendScreen from "./screens/AddSpendScreen";
import LoadTestData from "./screens/loadTestData";
import SettingsScreen from "./screens/SettingsScreen";
import { enableScreens } from 'react-native-screens';

enableScreens();
const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer theme={DefaultTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen name="LoadTestDataScreen" component={LoadTestData} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Income') {
            iconName = focused ? 'cash' : 'cash-outline';
          } else if (route.name === 'Expenses') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'Daily Spends') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Income" component={IncomeScreen} />
      <Tab.Screen name="Expenses">
        {() => <ExpensesStack />}
      </Tab.Screen>
      <Tab.Screen name="Daily Spends">
        {() => <InnerStack />}
      </Tab.Screen>
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
// Stack navigator for Expenses tab to allow navigation to AddExpenseScreen
}

const ExpensesStack = () => {
  const StackNavigator = createStackNavigator();
  return (
    <StackNavigator.Navigator initialRouteName="ExpensesScreen" screenOptions={{ headerShown: false }}>
      <StackNavigator.Screen name="ExpensesScreen" component={ExpensesScreen} />
      <StackNavigator.Screen name="AddExpenseScreen" component={require('./screens/AddExpenseScreen').default} />
    </StackNavigator.Navigator>
  );
}

const InnerStack = () => {
  const StackNavigator = createStackNavigator();
  return (
    <StackNavigator.Navigator initialRouteName="DailySpendsScreen" screenOptions={{ headerShown: false }}>
      <StackNavigator.Screen name="DailySpendsScreen" component={DailySpendsScreen} />
      <StackNavigator.Screen name="AddSpendScreen" component={AddSpendScreen} />
    </StackNavigator.Navigator>
  );
};
