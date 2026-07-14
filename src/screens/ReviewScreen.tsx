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
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import CircleSafePhotoCapture, {
  type CircleSafePhotoCaptureHandle,
} from '../components/CircleSafePhotoCapture';
import Button from '../components/Button';
import Section from '../components/Section';
import { colors, radius, space, type } from '../theme/theme';
import { detectDefaultCountryCode } from '../services/detectCountryCode';
import { recognizeCardText } from '../services/ocr';
import { extractPhoneCountryCode, parseCardFields } from '../services/parseCardFields';
import {
  findExistingContactByPhone,
  saveContactFromForm,
  updateContactFromForm,
  type ContactForm,
} from '../services/saveContact';
import { addScanHistoryEntry } from '../services/scanHistory';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

function createEmptyForm(): ContactForm {
  return {
    name: '',
    title: '',
    company: '',
    phones: [''],
    countryCode: '',
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

    detectDefaultCountryCode().then(code => {
      // Only seed the SIM/locale-based guess if nothing's claimed the field
      // yet -- a code already printed on the card (set by the OCR effect
      // below) or a manual edit should never be clobbered by this default.
      if (!cancelled) {
        setForm(prev => (prev.countryCode ? prev : { ...prev, countryCode: code }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const finishSave = async (photoUri: string | undefined, existingRecordID?: string) => {
    setSaving(true);
    setSaveError(undefined);
    try {
      if (existingRecordID) {
        await updateContactFromForm(existingRecordID, form, photoUri);
      } else {
        await saveContactFromForm(form, photoUri);
      }
      await addScanHistoryEntry({
        name: form.name,
        title: form.title,
        company: form.company,
        phones: form.phones,
        countryCode: form.countryCode,
        email: form.email,
        website: form.website,
        address: form.address,
        photoUri,
      });
      Alert.alert('Saved', `${form.name || 'Contact'} was saved to your contacts.`);
      navigation.navigate('Home');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save contact.');
    } finally {
      setSaving(false);
    }
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

      const existing = await findExistingContactByPhone(form);
      if (existing) {
        setSaving(false);
        Alert.alert(
          'Contact already exists',
          `${existing.displayName || existing.givenName || 'A contact'} already has this phone number. Update that contact, or save this as a new one?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Save as New', onPress: () => finishSave(photoUri) },
            {
              text: 'Update Existing',
              onPress: () => finishSave(photoUri, existing.recordID),
            },
          ],
        );
        return;
      }

      await finishSave(photoUri);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save contact.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <CircleSafePhotoCapture ref={photoCaptureRef} uri={frontUri} />

        <View style={styles.photoRow}>
          <Image source={{ uri: frontUri }} style={styles.thumbnail} />
          {backUri ? <Image source={{ uri: backUri }} style={styles.thumbnail} /> : null}
        </View>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.centeredStateText}>Reading the card…</Text>
          </View>
        ) : error ? (
          <View style={styles.centeredState}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <Section label="Contact">
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
            </Section>

            <Section label="Phone">
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
                      hitSlop={space.sm}
                      style={styles.removePhoneButton}
                      onPress={() => removePhone(index)}>
                      <Text style={styles.removePhoneText}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              <Pressable
                testID="add-phone-button"
                hitSlop={space.sm}
                style={styles.addPhoneButton}
                onPress={addPhone}>
                <Text style={styles.addPhoneText}>+ Add another phone number</Text>
              </Pressable>
            </Section>

            <Section label="Other details">
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
            </Section>

            {saveError ? (
              <Text testID="save-error" style={styles.errorText}>
                {saveError}
              </Text>
            ) : null}

            <Button
              testID="save-contact-button"
              label="Save to Contacts"
              loading={saving}
              onPress={handleSave}
              style={styles.saveButton}
            />

            <Section label="Front (raw text)">
              <Text style={styles.rawText}>{frontText || '(no text found)'}</Text>
            </Section>
            {backUri ? (
              <Section label="Back (raw text)">
                <Text style={styles.rawText}>{backText || '(no text found)'}</Text>
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        style={[styles.input, focused && styles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: space.xl,
  },
  photoRow: {
    flexDirection: 'row',
    gap: space.md,
    marginBottom: space.xl,
  },
  thumbnail: {
    flex: 1,
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
    backgroundColor: colors.placeholder,
  },
  centeredState: {
    padding: space.xl,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: space.sm,
  },
  centeredStateText: {
    ...type.subtitle,
  },
  rawText: {
    ...type.body,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
  },
  field: {
    marginBottom: space.md,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
  },
  phoneInputWrapper: {
    flex: 1,
  },
  removePhoneButton: {
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    marginBottom: space.md,
  },
  removePhoneText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  addPhoneButton: {
    alignSelf: 'flex-start',
    paddingVertical: space.xs,
  },
  addPhoneText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  fieldLabel: {
    ...type.fieldLabel,
    marginBottom: space.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  saveButton: {
    marginBottom: space.xxl,
  },
});

export default ReviewScreen;
