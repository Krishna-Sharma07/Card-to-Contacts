import type { ScanHistoryEntry } from '../services/scanHistory';

export type RootStackParamList = {
  Home: undefined;
  Review: {
    frontUri: string;
    backUri?: string;
  };
  History: undefined;
  HistoryDetail: {
    entry: ScanHistoryEntry;
  };
};
