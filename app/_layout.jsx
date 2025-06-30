import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#000',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: "Face Recognition",
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="face-collection" 
          options={{ 
            title: "Face Collection",
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="face-verification" 
          options={{ 
            title: "Face Verification",
            headerShown: false 
          }} 
        />
      </Stack>
    </>
  );
}
