import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { sendPushToTokens } from './notifications';

const EMERGENCIES = 'emergencies';
const RESPONDERS = 'responders';

export type EmergencyStatus = 'open' | 'acknowledged';

export type Emergency = {
  id: string;
  type: string;
  lat: number;
  lng: number;
  timestamp: ReturnType<typeof serverTimestamp> | { seconds: number; nanoseconds: number };
  status: EmergencyStatus;
};

export async function createEmergency(
  type: string,
  lat: number,
  lng: number
): Promise<{ id: string }> {
  const ref = await addDoc(collection(db, EMERGENCIES), {
    type,
    lat,
    lng,
    timestamp: serverTimestamp(),
    status: 'open',
  });
  return { id: ref.id };
}

export function subscribeToEmergency(
  emergencyId: string,
  onUpdate: (data: Emergency | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, EMERGENCIES, emergencyId), (snap) => {
    if (!snap.exists()) {
      onUpdate(null);
      return;
    }
    onUpdate({ id: snap.id, ...snap.data() } as Emergency);
  });
}

export function subscribeToLatestOpenEmergency(
  onEmergency: (data: Emergency | null) => void
): Unsubscribe {
  const q = query(
    collection(db, EMERGENCIES),
    where('status', '==', 'open'),
    orderBy('timestamp', 'desc'),
    limit(1)
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      onEmergency(null);
      return;
    }
    const d = snap.docs[0];
    onEmergency({ id: d.id, ...d.data() } as Emergency);
  });
}

export async function acknowledgeEmergency(emergencyId: string): Promise<void> {
  await updateDoc(doc(db, EMERGENCIES, emergencyId), { status: 'acknowledged' });
}

export async function getResponderPushTokens(): Promise<string[]> {
  const snap = await getDocs(collection(db, RESPONDERS));
  const tokens = [...new Set(snap.docs.map((d) => d.data().token).filter((t): t is string => typeof t === 'string' && t.length > 0))];
  return tokens;
}

export async function registerResponderToken(token: string): Promise<void> {
  const safeId = token.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 150);
  await setDoc(doc(db, RESPONDERS, safeId), { token, updatedAt: serverTimestamp() });
}

export async function notifyResponders(
  emergencyId: string,
  type: string,
  lat: number,
  lng: number
): Promise<void> {
  const tokens = await getResponderPushTokens();
  await sendPushToTokens(
    tokens,
    'Emergency: ' + type,
    `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    { emergencyId, type, lat, lng }
  );
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
