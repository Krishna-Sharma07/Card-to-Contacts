import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

function ReviewScreen({ route }: Props) {
  const { imageUri } = route.params;

  // Populated by the OCR + field-parsing milestones; editable form fields
  // (name, company, title, phones, emails, website, address) land here.
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.thumbnail} />
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Extracted fields will appear here for review before saving to
          Contacts.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 8,
    marginBottom: 24,
    backgroundColor: '#E5E7EB',
  },
  placeholder: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  placeholderText: {
    fontSize: 14,
    opacity: 0.7,
  },
});

export default ReviewScreen;
