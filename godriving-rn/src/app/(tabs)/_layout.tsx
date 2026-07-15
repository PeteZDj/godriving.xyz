import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { C, font } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.line,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: font.bodySemi, fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="games"
        options={{ title: 'Games', tabBarIcon: ({ color, size }) => <Ionicons name="game-controller" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="schools"
        options={{ title: 'Schools', tabBarIcon: ({ color, size }) => <Ionicons name="school" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{ title: 'Ranks', tabBarIcon: ({ color, size }) => <Ionicons name="podium" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
