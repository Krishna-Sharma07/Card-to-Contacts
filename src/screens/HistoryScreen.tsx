import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getScanHistory, type ScanHistoryEntry } from '../services/scanHistory';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

function formatScannedAt(scannedAt: string): string {
  const date = new Date(scannedAt);
  if (Number.isNaN(date.getTime())) {
    return scannedAt;
  }
  return date.toLocaleString();
}

function HistoryScreen(_props: Props) {
  const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getScanHistory().then(history => {
        if (!cancelled) {
          setEntries(history);
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text testID="history-empty" style={styles.emptyText}>
          No scans yet. Cards you save will show up here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="history-list"
      contentContainerStyle={styles.list}
      data={entries}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View testID={`history-item-${item.id}`} style={styles.item}>
          <Text style={styles.itemName}>{item.name || 'Unnamed contact'}</Text>
          {item.company ? <Text style={styles.itemCompany}>{item.company}</Text> : null}
          <Text style={styles.itemDate}>{formatScannedAt(item.scannedAt)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  item: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemCompany: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2,
  },
  itemDate: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 6,
  },
});

export default HistoryScreen;
