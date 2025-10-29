import React from "react";
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
import { useColorScheme } from "react-native";
import { enableScreens } from 'react-native-screens';

enableScreens();
const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

export default function App() {
  const scheme = useColorScheme() ?? "light";
  return (
    <NavigationContainer theme={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen name="LoadTestDataScreen" component={LoadTestData} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator initialRouteName="Dashboard">
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Income" component={IncomeScreen} />
      <Tab.Screen name="Expenses">
        {() => <ExpensesStack />}
      </Tab.Screen>
      <Tab.Screen name="Daily Spends">
        {() => <InnerStack />}
      </Tab.Screen>
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
