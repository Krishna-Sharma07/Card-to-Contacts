import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import Section from '../components/Section';
import { colors, radius, space, type } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoryDetail'>;

function formatScannedAt(scannedAt: string): string {
  const date = new Date(scannedAt);
  if (Number.isNaN(date.getTime())) {
    return scannedAt;
  }
  return date.toLocaleString();
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function HistoryDetailScreen({ route }: Props) {
  const { entry } = route.params;
  const [photoFailed, setPhotoFailed] = useState(false);
  const phones = (entry.phones ?? []).filter(Boolean);
  const hasOtherDetails = Boolean(entry.email || entry.website || entry.address);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {entry.photoUri && !photoFailed ? (
          <Image
            testID="history-detail-photo"
            source={{ uri: entry.photoUri }}
            style={styles.thumbnail}
            onError={() => setPhotoFailed(true)}
          />
        ) : null}

        <Text style={styles.scannedAt}>Scanned {formatScannedAt(entry.scannedAt)}</Text>

        <Section label="Contact">
          <DetailRow label="Name" value={entry.name || 'Unnamed contact'} />
          {entry.title ? <DetailRow label="Job Title" value={entry.title} /> : null}
          {entry.company ? <DetailRow label="Company" value={entry.company} /> : null}
        </Section>

        {phones.length > 0 ? (
          <Section label="Phone">
            {entry.countryCode ? (
              <DetailRow label="Country Code" value={entry.countryCode} />
            ) : null}
            {phones.map((phone, index) => (
              <DetailRow
                key={index}
                label={index === 0 ? 'Phone' : `Phone ${index + 1}`}
                value={phone}
              />
            ))}
          </Section>
        ) : null}

        {hasOtherDetails ? (
          <Section label="Other details">
            {entry.email ? <DetailRow label="Email" value={entry.email} /> : null}
            {entry.website ? <DetailRow label="Website" value={entry.website} /> : null}
            {entry.address ? <DetailRow label="Address" value={entry.address} /> : null}
          </Section>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
    marginBottom: space.lg,
    backgroundColor: colors.placeholder,
  },
  scannedAt: {
    ...type.subtitle,
    marginBottom: space.xl,
  },
  field: {
    marginBottom: space.md,
  },
  fieldLabel: {
    ...type.fieldLabel,
    marginBottom: space.xs,
  },
  fieldValue: {
    ...type.body,
  },
});

export default HistoryDetailScreen;
