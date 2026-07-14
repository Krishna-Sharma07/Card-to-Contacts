import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { space, type } from '../theme/theme';

type Props = {
  label: string;
  children: React.ReactNode;
};

function Section({ label, children }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: space.xl,
  },
  sectionLabel: {
    ...type.sectionLabel,
    marginBottom: space.md,
  },
});

export default Section;
