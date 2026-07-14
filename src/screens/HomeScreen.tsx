import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  PermissionsAndroid,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { ImagePickerResponse } from 'react-native-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import Button from '../components/Button';
import { colors, radius, space, type } from '../theme/theme';

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
    async (side: Side) => {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Camera permission needed', 'Enable camera access to take a photo.');
        return;
      }
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

  const handleRemovePhoto = useCallback((side: Side) => {
    const setUri = side === 'front' ? setFrontUri : setBackUri;
    setUri(undefined);
  }, []);

  const handleSave = useCallback(() => {
    if (!frontUri) {
      return;
    }
    navigation.navigate('Review', { frontUri, backUri });
  }, [navigation, frontUri, backUri]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Card to Contacts</Text>
          <Text style={styles.subtitle}>
            Scan a business card and save it straight to your contacts.
          </Text>
        </View>

        <CardPanel
          label="Front"
          hint="Required"
          imageUri={frontUri}
          onTakePhoto={() => handleTakePhoto('front')}
          onChooseFromGallery={() => handleChooseFromGallery('front')}
          onRemovePhoto={() => handleRemovePhoto('front')}
        />

        <CardPanel
          label="Back"
          hint="Optional"
          imageUri={backUri}
          onTakePhoto={() => handleTakePhoto('back')}
          onChooseFromGallery={() => handleChooseFromGallery('back')}
          onRemovePhoto={() => handleRemovePhoto('back')}
        />

        <Button
          testID="save-button"
          label="Save"
          disabled={!frontUri}
          onPress={handleSave}
          style={styles.saveButton}
        />

        <Button
          testID="view-history-button"
          label="View Scan History"
          variant="ghost"
          onPress={() => navigation.navigate('History')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

type CardPanelProps = {
  label: string;
  hint: string;
  imageUri?: string;
  onTakePhoto: () => void;
  onChooseFromGallery: () => void;
  onRemovePhoto: () => void;
};

function CardPanel({
  label,
  hint,
  imageUri,
  onTakePhoto,
  onChooseFromGallery,
  onRemovePhoto,
}: CardPanelProps) {
  const testIdPrefix = label.toLowerCase().startsWith('front') ? 'front' : 'back';
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <Text style={styles.panelLabel}>{label}</Text>
        <Text style={styles.panelHint}>{hint}</Text>
      </View>
      {imageUri ? (
        <View style={styles.thumbnailWrapper}>
          <Image source={{ uri: imageUri }} style={styles.thumbnail} />
          <Pressable
            testID={`${testIdPrefix}-remove-photo`}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${label.toLowerCase()} photo`}
            onPress={onRemovePhoto}
            hitSlop={space.sm}
            android_ripple={{ color: colors.dangerMuted, borderless: true }}
            style={styles.removeButton}>
            <Text style={styles.removeButtonLabel}>✕</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Text style={styles.thumbnailPlaceholderText}>No photo yet</Text>
        </View>
      )}
      <View style={styles.panelButtons}>
        <Button
          testID={`${testIdPrefix}-take-photo`}
          label="Take Photo"
          variant="outline"
          onPress={onTakePhoto}
          style={styles.panelButton}
        />
        <Button
          testID={`${testIdPrefix}-choose-from-gallery`}
          label="Choose from Gallery"
          variant="outline"
          onPress={onChooseFromGallery}
          style={styles.panelButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: space.xl,
  },
  header: {
    marginBottom: space.xl,
  },
  title: {
    ...type.title,
    marginBottom: space.xs,
  },
  subtitle: {
    ...type.subtitle,
  },
  panel: {
    marginBottom: space.xl,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  panelLabel: {
    ...type.body,
    fontWeight: '600',
  },
  panelHint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  thumbnailWrapper: {
    marginBottom: space.md,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
    backgroundColor: colors.placeholder,
  },
  removeButton: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonLabel: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 15,
  },
  thumbnailPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
    marginBottom: space.md,
    backgroundColor: colors.placeholder,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  panelButtons: {
    flexDirection: 'row',
    gap: space.md,
  },
  panelButton: {
    flex: 1,
  },
  saveButton: {
    marginTop: space.sm,
    marginBottom: space.lg,
  },
});

export default HomeScreen;
