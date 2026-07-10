import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ReviewScreen from '../screens/ReviewScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Card to Contacts' }}
        />
        <Stack.Screen
          name="Review"
          component={ReviewScreen}
          options={{ title: 'Review & Edit' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
