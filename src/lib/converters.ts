/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  DocumentData,
  WithFieldValue
} from 'firebase/firestore';

// Helper đệ quy để convert Timestamp -> Date
const convertTimestamps = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;

  // Nếu là Timestamp của Firebase (có hàm toDate)
  if (obj.toDate && typeof obj.toDate === 'function') {
    return obj.toDate();
  }

  // Nếu là Array
  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }

  // Nếu là Object thường -> duyệt từng key
  const result: any = {};
  for (const key in obj) {
    result[key] = convertTimestamps(obj[key]);
  }
  return result;
};

// Áp dụng vào converter
export const genericConverter = <T extends DocumentData>(): FirestoreDataConverter<T> => ({
  toFirestore: (data: WithFieldValue<T>) => data as DocumentData,
  fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData>, options: SnapshotOptions): T => {
    const data = snapshot.data(options);
    // Tự động convert toàn bộ Timestamp sang Date
    const convertedData = convertTimestamps(data);

    return {
      id: snapshot.id,
      ...convertedData
    } as T;
  },
});