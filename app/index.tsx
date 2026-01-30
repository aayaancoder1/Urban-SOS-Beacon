import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BeaconColors } from '@/constants/theme';
import {
  acknowledgeEmergency,
  createEmergency,
  haversineKm,
  notifyResponders,
  registerResponderToken,
  subscribeToEmergency,
  subscribeToLatestOpenEmergency,
  type Emergency,
} from '@/lib/emergencies';
import { registerForPushNotificationsAsync } from '@/lib/notifications';

type Mode = 'victim' | 'responder';

const EMERGENCY_TYPES = [
  'Medical',
  'Accident',
  'Violence / Assault',
  'Fire',
  'Natural disaster',
  'Other',
];

export default function BeaconScreen() {
  const [mode, setMode] = useState<Mode>('victim');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [emergencySent, setEmergencySent] = useState(false);
  const [emergencyId, setEmergencyId] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [responderEmergency, setResponderEmergency] = useState<Emergency | null>(null);
  const [responderLocation, setResponderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const responderAckedId = useRef<string | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? BeaconColors.surfaceDark : BeaconColors.surface;
  const cardBg = isDark ? '#2A2A2A' : '#fff';
  const text = isDark ? '#ECEDEE' : '#11181C';
  const border = isDark ? BeaconColors.borderDark : BeaconColors.border;

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    if (mode !== 'responder') return;
    let token: string | null = null;
    registerForPushNotificationsAsync().then((t) => {
      token = t;
      if (t) return registerResponderToken(t);
    });
    return () => {};
  }, [mode]);

  useEffect(() => {
    if (mode !== 'responder') return;
    const unsub = subscribeToLatestOpenEmergency(setResponderEmergency);
    return () => unsub();
  }, [mode]);

  useEffect(() => {
    if (mode !== 'responder' || !responderEmergency) return;
    Location.getCurrentPositionAsync({}).then(
      (loc) => setResponderLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude }),
      () => setResponderLocation(null)
    );
  }, [mode, responderEmergency?.id]);

  useEffect(() => {
    if (mode !== 'victim' || !emergencyId) return;
    const unsub = subscribeToEmergency(emergencyId, (data) => {
      if (data?.status === 'acknowledged') setAcknowledged(true);
    });
    return () => unsub();
  }, [mode, emergencyId]);

  const handleEmergency = async () => {
    if (!selectedType) return;
    setError(null);
    setSending(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission required');
        setSending(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const { id } = await createEmergency(selectedType, lat, lng);
      setEmergencyId(id);
      setEmergencySent(true);
      await notifyResponders(id, selectedType, lat, lng);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!responderEmergency) return;
    setAcknowledging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await acknowledgeEmergency(responderEmergency.id);
      responderAckedId.current = responderEmergency.id;
      setAcknowledged(true);
    } finally {
      setAcknowledging(false);
    }
  };

  const victimAcked = acknowledged;
  const responderAcked = responderEmergency ? responderAckedId.current === responderEmergency.id || responderEmergency.status === 'acknowledged' : false;

  const distanceKm =
    responderEmergency && responderLocation
      ? haversineKm(
          responderEmergency.lat,
          responderEmergency.lng,
          responderLocation.lat,
          responderLocation.lng
        )
      : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: text }]}>Urban SOS Beacon</Text>
        <View style={[styles.toggle, { backgroundColor: cardBg, borderColor: border }]}>
          <Pressable
            style={[
              styles.toggleOption,
              mode === 'victim' && styles.toggleActive,
              mode === 'victim' && { backgroundColor: BeaconColors.emergency },
            ]}
            onPress={() => setMode('victim')}
          >
            <Text
              style={[
                styles.toggleText,
                { color: mode === 'victim' ? '#fff' : text },
              ]}
            >
              Victim
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleOption,
              mode === 'responder' && styles.toggleActive,
              mode === 'responder' && { backgroundColor: BeaconColors.acknowledge },
            ]}
            onPress={() => setMode('responder')}
          >
            <Text
              style={[
                styles.toggleText,
                { color: mode === 'responder' ? '#fff' : text },
              ]}
            >
              Responder
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'victim' ? (
          <View style={styles.victim}>
            <Text style={[styles.sectionLabel, { color: text }]}>
              Emergency type
            </Text>
            <View style={[styles.typeList, { backgroundColor: cardBg, borderColor: border }]}>
              {EMERGENCY_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.typeRow,
                    selectedType === type && {
                      backgroundColor: isDark ? '#3A3A3A' : '#F0F0F0',
                    },
                  ]}
                  onPress={() => {
                    setSelectedType(type);
                    setEmergencySent(false);
                    setEmergencyId(null);
                    setAcknowledged(false);
                  }}
                >
                  <Text style={[styles.typeText, { color: text }]}>{type}</Text>
                  {selectedType === type && (
                    <View style={styles.check} />
                  )}
                </Pressable>
              ))}
            </View>

            {error ? (
              <Text style={[styles.hint, { color: BeaconColors.emergency }]}>{error}</Text>
            ) : null}

            <Pressable
              style={[
                styles.emergencyBtn,
                (!selectedType || emergencySent || sending) && styles.emergencyBtnDisabled,
              ]}
              onPress={handleEmergency}
              disabled={!selectedType || emergencySent || sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.emergencyBtnText}>
                  {emergencySent ? 'Signal sent' : 'EMERGENCY'}
                </Text>
              )}
            </Pressable>
            {emergencySent && (
              <Text style={[styles.hint, { color: text }]}>
                {victimAcked ? 'A responder has acknowledged. Help is on the way.' : 'Help has been signaled. Stay safe.'}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.responder}>
            <View style={[styles.waitingCard, { backgroundColor: cardBg, borderColor: border }]}>
              {responderEmergency ? (
                <>
                  <Text style={[styles.waitingTitle, { color: text }]}>
                    Emergency: {responderEmergency.type}
                  </Text>
                  <Text style={[styles.waitingSub, { color: text }]}>
                    {responderEmergency.lat.toFixed(4)}, {responderEmergency.lng.toFixed(4)}
                  </Text>
                  {distanceKm != null && (
                    <Text style={[styles.waitingSub, { color: text }]}>
                      {distanceKm < 1 ? `${(distanceKm * 1000).toFixed(0)} m away` : `${distanceKm.toFixed(1)} km away`}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={[styles.waitingTitle, { color: text }]}>
                    Waiting for emergency
                  </Text>
                  <Text style={[styles.waitingSub, { color: text }]}>
                    You will see alerts here when someone nearby needs help.
                  </Text>
                </>
              )}
            </View>
            <Pressable
              style={[styles.ackBtn, (responderAcked || !responderEmergency) && styles.ackBtnDone]}
              onPress={handleAcknowledge}
              disabled={!responderEmergency || responderAcked || acknowledging}
            >
              {acknowledging ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ackBtnText}>
                  {responderAcked ? 'Acknowledged' : 'Acknowledge'}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleActive: {},
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  victim: {
    gap: 16,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  typeList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  typeText: {
    fontSize: 16,
  },
  check: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BeaconColors.acknowledge,
  },
  emergencyBtn: {
    marginTop: 24,
    backgroundColor: BeaconColors.emergency,
    paddingVertical: 20,
    borderRadius: 14,
    alignItems: 'center',
  },
  emergencyBtnDisabled: {
    opacity: 0.5,
  },
  emergencyBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  responder: {
    gap: 24,
  },
  waitingCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  waitingSub: {
    fontSize: 15,
    opacity: 0.8,
  },
  ackBtn: {
    backgroundColor: BeaconColors.acknowledge,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  ackBtnDone: {
    opacity: 0.7,
  },
  ackBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
