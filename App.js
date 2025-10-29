import React from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import DashboardScreen from "./screens/DashboardScreen";
import IncomeScreen from "./screens/IncomeScreen";
import ExpensesScreen from "./screens/ExpensesScreen";
import DailySpendsScreen from "./screens/DailySpendsScreen";
import { useColorScheme } from "react-native";
import { enableScreens } from 'react-native-screens';

enableScreens();
const Tab = createBottomTabNavigator();

export default function App() {
  const scheme = useColorScheme() ?? "light";
  return (
    <NavigationContainer theme={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <Tab.Navigator initialRouteName="Dashboard">
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Income" component={IncomeScreen} />
        <Tab.Screen name="Expenses" component={ExpensesScreen} />
        <Tab.Screen name="DailySpends" component={DailySpendsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
