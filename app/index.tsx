import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
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

// Mocked victim coordinates for Maps redirect (hackathon demo)
const MOCK_VICTIM_LAT = 37.7749;
const MOCK_VICTIM_LNG = -122.4194;

export default function BeaconScreen() {
  const [mode, setMode] = useState<Mode>('victim');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [emergencySent, setEmergencySent] = useState(false);
  const [emergencyId, setEmergencyId] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [showEmergencySentModal, setShowEmergencySentModal] = useState(false);
  const [showHelpOnTheWayModal, setShowHelpOnTheWayModal] = useState(false);
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
    return () => { };
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
      if (data?.status === 'acknowledged') {
        setAcknowledged(true);
        setShowHelpOnTheWayModal(true);
      }
    });
    return () => unsub();
  }, [mode, emergencyId]);

  // Auto-dismiss "Emergency Alert Sent" after 5s
  useEffect(() => {
    if (!showEmergencySentModal) return;
    const t = setTimeout(() => setShowEmergencySentModal(false), 5000);
    return () => clearTimeout(t);
  }, [showEmergencySentModal]);

  // Auto-dismiss "Help Is On The Way" after 5–7s
  useEffect(() => {
    if (!showHelpOnTheWayModal) return;
    const t = setTimeout(() => setShowHelpOnTheWayModal(false), 6000);
    return () => clearTimeout(t);
  }, [showHelpOnTheWayModal]);

  // --- Call triggerEmergency here: when victim taps EMERGENCY (shows "Emergency alert sent" popup) ---
  const handleEmergency = async () => {
    if (!selectedType) return;
    setError(null);
    setSending(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowEmergencySentModal(true);
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

  // --- Call acknowledgeEmergency here: when responder taps Acknowledge (victim sees "Help is on the way" + opens Maps) ---
  const handleAcknowledge = async () => {
    if (!responderEmergency) return;
    setAcknowledging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await acknowledgeEmergency(responderEmergency.id);
      responderAckedId.current = responderEmergency.id;
      setAcknowledged(true);
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${MOCK_VICTIM_LAT},${MOCK_VICTIM_LNG}`;
      Linking.openURL(mapsUrl);
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

      {/* FEATURE 1: Emergency Alert Sent popup — shown when triggerEmergency (handleEmergency) runs */}
      <Modal
        visible={showEmergencySentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmergencySentModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEmergencySentModal(false)}>
          <View style={[styles.popupCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.popupTitle, { color: text }]}>Emergency alert sent</Text>
            <Text style={[styles.popupBody, { color: text }]}>
              Nearby responders have been notified.
            </Text>
          </View>
        </Pressable>
      </Modal>

      {/* FEATURE 2: Help Is On The Way popup — shown on victim when responder calls acknowledgeEmergency */}
      <Modal
        visible={showHelpOnTheWayModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHelpOnTheWayModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowHelpOnTheWayModal(false)}>
          <View style={[styles.popupCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.popupTitle, { color: text }]}>Help is on the way</Text>
            <Text style={[styles.popupBody, { color: text }]}>
              A responder has acknowledged your alert.
            </Text>
          </View>
        </Pressable>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popupCard: {
    borderRadius: 16,
    padding: 24,
    maxWidth: 320,
    alignItems: 'center',
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  popupBody: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.9,
  },
});
