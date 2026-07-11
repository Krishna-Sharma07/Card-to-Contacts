import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { recognizeCardText } from '../services/ocr';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

function ReviewScreen({ route }: Props) {
  const { frontUri, backUri } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [frontText, setFrontText] = useState<string | undefined>();
  const [backText, setBackText] = useState<string | undefined>();

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: frontUri }} style={styles.thumbnail} />
      {backUri ? (
        <Image source={{ uri: backUri }} style={styles.thumbnail} />
      ) : null}

      {/* Raw OCR output for now; field-parsing (name, company, phones,
          emails, etc.) into an editable form lands in the next milestone. */}
      <View style={styles.placeholder}>
        {loading ? (
          <ActivityIndicator />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Front</Text>
            <Text style={styles.rawText}>{frontText || '(no text found)'}</Text>
            {backUri ? (
              <>
                <Text style={styles.sectionLabel}>Back</Text>
                <Text style={styles.rawText}>{backText || '(no text found)'}</Text>
              </>
            ) : null}
          </>
        )}
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
});

export default ReviewScreen;
