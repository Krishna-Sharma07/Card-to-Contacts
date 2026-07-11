import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { ImagePickerResponse } from 'react-native-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type Side = 'front' | 'back';

function HomeScreen({ navigation }: Props) {
  const [frontUri, setFrontUri] = useState<string | undefined>();
  const [backUri, setBackUri] = useState<string | undefined>();

  const handleResponse = useCallback(
    (side: Side, response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert(
          'Unable to get image',
          response.errorMessage ?? response.errorCode,
        );
        return;
      }
      const uri = response.assets?.[0]?.uri;
      if (!uri) {
        return;
      }
      const setUri = side === 'front' ? setFrontUri : setBackUri;
      setUri(uri);
    },
    [],
  );

  const handleTakePhoto = useCallback(
    (side: Side) => {
      launchCamera({ mediaType: 'photo', saveToPhotos: false }, response =>
        handleResponse(side, response),
      );
    },
    [handleResponse],
  );

  const handleChooseFromGallery = useCallback(
    (side: Side) => {
      launchImageLibrary({ mediaType: 'photo' }, response =>
        handleResponse(side, response),
      );
    },
    [handleResponse],
  );

  const handleSave = useCallback(() => {
    if (!frontUri) {
      return;
    }
    navigation.navigate('Review', { frontUri, backUri });
  }, [navigation, frontUri, backUri]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Card to Contacts</Text>
      <Text style={styles.subtitle}>
        Scan a business card and save it straight to your contacts.
      </Text>

      <CardPanel
        label="Front"
        imageUri={frontUri}
        onTakePhoto={() => handleTakePhoto('front')}
        onChooseFromGallery={() => handleChooseFromGallery('front')}
      />

      <CardPanel
        label="Back (optional)"
        imageUri={backUri}
        onTakePhoto={() => handleTakePhoto('back')}
        onChooseFromGallery={() => handleChooseFromGallery('back')}
      />

      <Pressable
        style={[styles.button, !frontUri && styles.buttonDisabled]}
        disabled={!frontUri}
        onPress={handleSave}>
        <Text style={styles.buttonText}>Save</Text>
      </Pressable>
    </ScrollView>
  );
}

type CardPanelProps = {
  label: string;
  imageUri?: string;
  onTakePhoto: () => void;
  onChooseFromGallery: () => void;
};

function CardPanel({
  label,
  imageUri,
  onTakePhoto,
  onChooseFromGallery,
}: CardPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelLabel}>{label}</Text>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.thumbnail} />
      ) : (
        <View style={styles.thumbnailPlaceholder} />
      )}
      <View style={styles.panelButtons}>
        <Pressable
          style={[styles.smallButton, styles.secondaryButton]}
          onPress={onTakePhoto}>
          <Text style={styles.buttonText}>Take Photo</Text>
        </Pressable>
        <Pressable
          style={[styles.smallButton, styles.secondaryButton]}
          onPress={onChooseFromGallery}>
          <Text style={styles.buttonText}>Choose from Gallery</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
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
    marginBottom: 24,
    textAlign: 'center',
  },
  panel: {
    width: '100%',
    marginBottom: 20,
  },
  panelLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#E5E7EB',
  },
  thumbnailPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
  panelButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  smallButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#2F6FED',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
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
