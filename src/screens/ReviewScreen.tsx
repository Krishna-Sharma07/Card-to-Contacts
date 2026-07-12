import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recognizeCardText } from '../services/ocr';
import { parseCardFields } from '../services/parseCardFields';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

type ContactForm = {
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  address: string;
};

const EMPTY_FORM: ContactForm = {
  name: '',
  title: '',
  company: '',
  phone: '',
  email: '',
  website: '',
  address: '',
};

function ReviewScreen({ route }: Props) {
  const { frontUri, backUri } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [frontText, setFrontText] = useState<string | undefined>();
  const [backText, setBackText] = useState<string | undefined>();
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);

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
        );
        setForm({
          name: parsed.name ?? '',
          title: parsed.title ?? '',
          company: parsed.company ?? '',
          phone: parsed.phone ?? '',
          email: parsed.email ?? '',
          website: parsed.website ?? '',
          address: parsed.address ?? '',
        });
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

  const updateField = (field: keyof ContactForm) => (value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
              testID="phone-input"
              label="Phone"
              value={form.phone}
              onChangeText={updateField('phone')}
              keyboardType="phone-pad"
            />
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
});

export default ReviewScreen;
