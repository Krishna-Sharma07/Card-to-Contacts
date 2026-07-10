import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function HomeScreen({ navigation: _navigation }: Props) {
  // Wired up to react-native-image-picker in the capture-flow milestone.
  const handleTakePhoto = () => {};
  const handleChooseFromGallery = () => {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Card to Contacts</Text>
      <Text style={styles.subtitle}>
        Scan a business card and save it straight to your contacts.
      </Text>

      <Pressable style={styles.button} onPress={handleTakePhoto}>
        <Text style={styles.buttonText}>Take Photo</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.secondaryButton]}
        onPress={handleChooseFromGallery}>
        <Text style={styles.buttonText}>Choose from Gallery</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2F6FED',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#5A5F66',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default HomeScreen;
