import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import CircleSafePhotoCapture, {
  type CircleSafePhotoCaptureHandle,
} from '../components/CircleSafePhotoCapture';
import { detectDefaultCountryCode } from '../services/detectCountryCode';
import { recognizeCardText } from '../services/ocr';
import { extractPhoneCountryCode, parseCardFields } from '../services/parseCardFields';
import { saveContactFromForm, type ContactForm } from '../services/saveContact';
import { addScanHistoryEntry } from '../services/scanHistory';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

function createEmptyForm(): ContactForm {
  return {
    name: '',
    title: '',
    company: '',
    phones: [''],
    countryCode: detectDefaultCountryCode(),
    email: '',
    website: '',
    address: '',
  };
}

function ReviewScreen({ route, navigation }: Props) {
  const { frontUri, backUri } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [frontText, setFrontText] = useState<string | undefined>();
  const [backText, setBackText] = useState<string | undefined>();
  const [form, setForm] = useState<ContactForm>(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>();
  const photoCaptureRef = useRef<CircleSafePhotoCaptureHandle>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(undefined);

    recognizeCardText(frontUri, backUri)
      .then(result => {
        if (cancelled) {
          return;
        }
        setFrontText(result.frontText);
        setBackText(result.backText);
        const parsed = parseCardFields(
          [result.frontText, result.backText].filter(Boolean).join('\n'),
          [...(result.frontLines ?? []), ...(result.backLines ?? [])],
        );
        // Prefer a country code the card actually printed over the device's
        // own region guess -- otherwise the field looks wrong/misleading
        // whenever it disagrees with what's right there on the card.
        const cardCountryCode = parsed.phones
          .map(extractPhoneCountryCode)
          .find((code): code is string => Boolean(code));
        setForm(prev => ({
          name: parsed.name ?? '',
          title: parsed.title ?? '',
          company: parsed.company ?? '',
          phones: parsed.phones.length > 0 ? parsed.phones : [''],
          countryCode: cardCountryCode ?? prev.countryCode,
          email: parsed.email ?? '',
          website: parsed.website ?? '',
          address: parsed.address ?? '',
        }));
      })
      .catch(err => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to read text from the card.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [frontUri, backUri]);

  const updateField =
    (field: Exclude<keyof ContactForm, 'phones'>) => (value: string) => {
      setForm(prev => ({ ...prev, [field]: value }));
    };

  const updatePhone = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      phones: prev.phones.map((phone, i) => (i === index ? value : phone)),
    }));
  };

  const addPhone = () => {
    setForm(prev => ({ ...prev, phones: [...prev.phones, ''] }));
  };

  const removePhone = (index: number) => {
    setForm(prev => ({ ...prev, phones: prev.phones.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(undefined);
    try {
      // Contact photos are shown as circular avatars everywhere in Android,
      // which would otherwise crop a landscape card straight through its
      // text. Pad it onto a white square sized so the whole card stays
      // inside that circle, falling back to the raw photo if padding fails.
      let photoUri = frontUri;
      try {
        const paddedUri = await photoCaptureRef.current?.capture();
        if (paddedUri) {
          photoUri = paddedUri;
        }
      } catch {
        photoUri = frontUri;
      }

      await saveContactFromForm(form, photoUri);
      await addScanHistoryEntry({ name: form.name, company: form.company });
      Alert.alert('Saved', `${form.name || 'Contact'} was saved to your contacts.`);
      navigation.navigate('Home');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save contact.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <CircleSafePhotoCapture ref={photoCaptureRef} uri={frontUri} />
      <Image source={{ uri: frontUri }} style={styles.thumbnail} />
      {backUri ? (
        <Image source={{ uri: backUri }} style={styles.thumbnail} />
      ) : null}

      <View style={styles.placeholder}>
        {loading ? (
          <ActivityIndicator />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <FormField
              testID="name-input"
              label="Name"
              value={form.name}
              onChangeText={updateField('name')}
            />
            <FormField
              testID="title-input"
              label="Job Title"
              value={form.title}
              onChangeText={updateField('title')}
            />
            <FormField
              testID="company-input"
              label="Company"
              value={form.company}
              onChangeText={updateField('company')}
            />
            <FormField
              testID="country-code-input"
              label="Country Code"
              value={form.countryCode}
              onChangeText={updateField('countryCode')}
              keyboardType="phone-pad"
            />
            {form.phones.map((phone, index) => (
              <View key={index} style={styles.phoneRow}>
                <View style={styles.phoneInputWrapper}>
                  <FormField
                    testID={`phone-input-${index}`}
                    label={index === 0 ? 'Phone' : `Phone ${index + 1}`}
                    value={phone}
                    onChangeText={value => updatePhone(index, value)}
                    keyboardType="phone-pad"
                  />
                </View>
                {form.phones.length > 1 ? (
                  <Pressable
                    testID={`remove-phone-${index}`}
                    style={styles.removePhoneButton}
                    onPress={() => removePhone(index)}>
                    <Text style={styles.removePhoneText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Pressable
              testID="add-phone-button"
              style={styles.addPhoneButton}
              onPress={addPhone}>
              <Text style={styles.addPhoneText}>+ Add another phone number</Text>
            </Pressable>

            <FormField
              testID="email-input"
              label="Email"
              value={form.email}
              onChangeText={updateField('email')}
              keyboardType="email-address"
            />
            <FormField
              testID="website-input"
              label="Website"
              value={form.website}
              onChangeText={updateField('website')}
            />
            <FormField
              testID="address-input"
              label="Address"
              value={form.address}
              onChangeText={updateField('address')}
            />

            {saveError ? (
              <Text testID="save-error" style={styles.errorText}>
                {saveError}
              </Text>
            ) : null}

            <Pressable
              testID="save-contact-button"
              style={[styles.button, saving && styles.buttonDisabled]}
              disabled={saving}
              onPress={handleSave}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Save to Contacts</Text>
              )}
            </Pressable>

            <Text style={styles.sectionLabel}>Front (raw text)</Text>
            <Text style={styles.rawText}>{frontText || '(no text found)'}</Text>
            {backUri ? (
              <>
                <Text style={styles.sectionLabel}>Back (raw text)</Text>
                <Text style={styles.rawText}>{backText || '(no text found)'}</Text>
              </>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}

type FormFieldProps = {
  testID: string;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
};

function FormField({ testID, label, value, onChangeText, keyboardType }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  rawText: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#C0392B',
  },
  field: {
    marginBottom: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  phoneInputWrapper: {
    flex: 1,
  },
  removePhoneButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  removePhoneText: {
    color: '#C0392B',
    fontSize: 13,
    fontWeight: '600',
  },
  addPhoneButton: {
    marginBottom: 12,
  },
  addPhoneText: {
    color: '#2F6FED',
    fontSize: 13,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#2F6FED',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReviewScreen;
