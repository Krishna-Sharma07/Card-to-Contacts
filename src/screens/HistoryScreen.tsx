import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, space, type } from '../theme/theme';
import {
  clearScanHistory,
  getScanHistory,
  removeScanHistoryEntry,
  type ScanHistoryEntry,
} from '../services/scanHistory';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

function Separator() {
  return <View style={styles.separator} />;
}

function formatScannedAt(scannedAt: string): string {
  const date = new Date(scannedAt);
  if (Number.isNaN(date.getTime())) {
    return scannedAt;
  }
  return date.toLocaleString();
}

function HistoryScreen({ navigation }: Props) {
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

  const handleClearAll = useCallback(() => {
    Alert.alert('Clear scan history?', 'This removes every saved scan from this list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await clearScanHistory();
          setEntries([]);
        },
      },
    ]);
  }, []);

  const handleRemove = useCallback((id: string) => {
    Alert.alert('Remove this scan?', 'This only removes it from your scan history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = await removeScanHistoryEntry(id);
          setEntries(updated);
        },
      },
    ]);
  }, []);

  if (entries.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <Text testID="history-empty" style={styles.emptyText}>
            No scans yet. Cards you save will show up here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <FlatList
        testID="history-list"
        contentContainerStyle={styles.list}
        data={entries}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <Pressable
            testID="clear-history-button"
            hitSlop={space.sm}
            style={styles.clearAllButton}
            onPress={handleClearAll}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`history-item-${item.id}`}
            style={styles.item}
            android_ripple={{ color: colors.accentMuted }}
            onPress={() => navigation.navigate('HistoryDetail', { entry: item })}>
            <View style={styles.itemHeaderRow}>
              <Text style={styles.itemName}>{item.name || 'Unnamed contact'}</Text>
              <Pressable
                testID={`remove-history-${item.id}`}
                hitSlop={space.sm}
                onPress={() => handleRemove(item.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
            {item.company ? <Text style={styles.itemCompany}>{item.company}</Text> : null}
            <Text style={styles.itemDate}>{formatScannedAt(item.scannedAt)}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: space.xl,
  },
  separator: {
    height: space.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  emptyText: {
    ...type.subtitle,
    textAlign: 'center',
  },
  item: {
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  itemName: {
    ...type.body,
    fontWeight: '600',
  },
  itemCompany: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: space.xs / 2,
  },
  itemDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: space.sm,
  },
  removeText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  clearAllButton: {
    alignSelf: 'flex-end',
    marginBottom: space.lg,
    paddingVertical: space.xs,
  },
  clearAllText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default HistoryScreen;
