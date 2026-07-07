import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Tab = 'Today' | 'Ghost' | 'Lists' | 'Settings';
type Activity = { id: string; title: string; category: string; start: number; duration: number; color: string };

const START_HOUR = 6;
const END_HOUR = 22;
const SNAP = 5;
const PX_PER_MIN = 2.25;
const MIN_DURATION = 15;
const { width } = Dimensions.get('window');

const palette: Record<string, string> = {
  Faith: '#8B5CF6', Health: '#22C55E', 'Lead Generation': '#F97316', Business: '#38BDF8',
  Family: '#EC4899', Kids: '#FACC15', Admin: '#94A3B8', Personal: '#14B8A6', Growth: '#A3E635',
};

const ghostSeed: Activity[] = [
  { id: 'faith', title: 'Faith', category: 'Faith', start: 6 * 60 + 30, duration: 30, color: palette.Faith },
  { id: 'walk', title: 'Walk', category: 'Health', start: 7 * 60 + 15, duration: 35, color: palette.Health },
  { id: 'prospecting', title: 'Prospecting', category: 'Lead Generation', start: 9 * 60, duration: 90, color: palette['Lead Generation'] },
  { id: 'follow-up', title: 'Follow Up', category: 'Business', start: 11 * 60, duration: 60, color: palette.Business },
  { id: 'kids', title: 'Kids', category: 'Kids', start: 15 * 60 + 30, duration: 90, color: palette.Kids },
  { id: 'recovery', title: 'Recovery', category: 'Personal', start: 20 * 60 + 30, duration: 45, color: palette.Personal },
];

const reusable = ['Deep Work', 'Client Call', 'Workout', 'Reading', 'Family Dinner', 'Admin Sprint', 'Planning', 'Prayer'];
const timelineHeight = (END_HOUR - START_HOUR) * 60 * PX_PER_MIN;

function snap(value: number) { return Math.round(value / SNAP) * SNAP; }
function timeLabel(minutes: number) {
  const h = Math.floor(minutes / 60); const m = minutes % 60; const hour = ((h + 11) % 12) + 1;
  return `${hour}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function topFor(min: number) { return (min - START_HOUR * 60) * PX_PER_MIN; }

function ActivityTile({ item, onChange, faded }: { item: Activity; faded: boolean; onChange: (next: Activity) => void }) {
  const origin = useRef(item).current;
  origin.start = item.start; origin.duration = item.duration;
  const drag = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      const delta = snap(g.dy / PX_PER_MIN);
      const maxStart = END_HOUR * 60 - origin.duration;
      onChange({ ...origin, start: Math.max(START_HOUR * 60, Math.min(maxStart, origin.start + delta)) });
    },
  });
  const resizeBottom = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => onChange({ ...origin, duration: Math.max(MIN_DURATION, snap(origin.duration + g.dy / PX_PER_MIN)) }),
  });
  const resizeTop = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      const delta = snap(g.dy / PX_PER_MIN);
      const nextStart = Math.max(START_HOUR * 60, origin.start + delta);
      const end = origin.start + origin.duration;
      onChange({ ...origin, start: Math.min(nextStart, end - MIN_DURATION), duration: Math.max(MIN_DURATION, end - nextStart) });
    },
  });
  return (
    <Animated.View style={[styles.tile, { top: topFor(item.start), height: item.duration * PX_PER_MIN, borderColor: item.color, opacity: faded ? 0.46 : 1 }]} {...drag.panHandlers}>
      <View style={[styles.tileGlow, { backgroundColor: item.color }]} />
      <View style={styles.resizeHandle} {...resizeTop.panHandlers} />
      <Text style={styles.tileTitle}>{item.title}</Text>
      <Text style={styles.tileMeta}>{timeLabel(item.start)} • {item.duration} min • {item.category}</Text>
      <View style={[styles.resizeHandle, styles.bottomHandle]} {...resizeBottom.panHandlers} />
    </Animated.View>
  );
}

function Schedule({ data, setData, ghost = false }: { data: Activity[]; setData?: (d: Activity[]) => void; ghost?: boolean }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, []);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  return <ScrollView style={styles.scroller} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <View style={styles.timelineWrap}>
      {hours.map(h => <View key={h} style={[styles.hourRow, { top: (h - START_HOUR) * 60 * PX_PER_MIN }]}><Text style={styles.hourText}>{timeLabel(h * 60)}</Text><View style={styles.hourLine} /></View>)}
      {nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60 && <View style={[styles.nowLine, { top: topFor(nowMinutes) }]}><View style={styles.nowDot} /><Text style={styles.nowText}>NOW</Text></View>}
      {data.map(item => <ActivityTile key={item.id} item={item} faded={!ghost && item.start + item.duration < nowMinutes} onChange={(next) => setData?.(data.map(x => x.id === item.id ? next : x))} />)}
    </View>
  </ScrollView>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('Today');
  const [today, setToday] = useState<Activity[]>(ghostSeed.map(x => ({ ...x, id: `today-${x.id}` })));
  const [ghost, setGhost] = useState<Activity[]>(ghostSeed);
  const addActivity = (title: string) => setToday([...today, { id: `${title}-${Date.now()}`, title, category: 'Personal', start: 12 * 60, duration: 30, color: palette.Personal }]);
  const content = useMemo(() => {
    if (tab === 'Today') return <Schedule data={today} setData={setToday} />;
    if (tab === 'Ghost') return <><View style={styles.copyBar}><Text style={styles.copyText}>Template day</Text><Pressable style={styles.copyBtn} onPress={() => setToday(ghost.map(x => ({ ...x, id: `copy-${x.id}-${Date.now()}` })))}><Text style={styles.copyBtnText}>Copy to Today</Text></Pressable></View><Schedule data={ghost} setData={setGhost} ghost /></>;
    if (tab === 'Lists') return <View style={styles.panel}>{reusable.map((x, i) => <Pressable key={x} style={styles.listItem} onPress={() => addActivity(x)}><View><Text style={styles.listTitle}>{x}</Text><Text style={styles.listMeta}>Tap once to add to Today</Text></View><Text style={styles.addIcon}>＋</Text></Pressable>)}</View>;
    return <View style={styles.panel}>{['Dark mode enabled', '5-minute snapping', 'Work hours 6:00 AM – 10:00 PM', 'Designed for iPhone Expo Go SDK 54'].map(x => <View key={x} style={styles.setting}><Text style={styles.settingText}>{x}</Text><Text style={styles.checkIcon}>✓</Text></View>)}</View>;
  }, [tab, today, ghost]);
  return <SafeAreaView style={styles.safe}><StatusBar style="light" /><View style={styles.header}><Text style={styles.kicker}>Daily Rock V5.1</Text><Text style={styles.title}>{tab}</Text></View>{content}<View style={styles.nav}>{(['Today','Ghost','Lists','Settings'] as Tab[]).map(t => <Pressable key={t} onPress={() => setTab(t)} style={[styles.navItem, tab === t && styles.navActive]}><Text style={[styles.navIcon, tab === t && styles.navIconActive]}>{t === 'Today' ? '◷' : t === 'Ghost' ? '▣' : t === 'Lists' ? '☰' : '⚙'}</Text><Text style={[styles.navText, tab === t && styles.navTextActive]}>{t}</Text></Pressable>)}</View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090A0F' }, header: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 12 }, kicker: { color: '#F97316', fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }, title: { color: '#F8FAFC', fontSize: 36, fontWeight: '900', marginTop: 2 },
  scroller: { flex: 1 }, scrollContent: { paddingBottom: 108 }, timelineWrap: { height: timelineHeight + 80, marginHorizontal: 14, position: 'relative' }, hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' }, hourText: { width: 72, color: '#64748B', fontSize: 12, fontWeight: '700' }, hourLine: { flex: 1, height: 1, backgroundColor: '#182033' },
  tile: { position: 'absolute', left: 76, width: width - 104, backgroundColor: '#121826', borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6, overflow: 'hidden' }, tileGlow: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, opacity: 0.95 }, tileTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '900' }, tileMeta: { color: '#CBD5E1', fontSize: 12, fontWeight: '700', marginTop: 4 }, resizeHandle: { position: 'absolute', top: 3, alignSelf: 'center', width: 46, height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' }, bottomHandle: { top: undefined, bottom: 3 },
  nowLine: { position: 'absolute', left: 68, right: 0, height: 2, backgroundColor: '#F97316', zIndex: 5 }, nowDot: { position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#F97316' }, nowText: { position: 'absolute', right: 4, top: -18, color: '#FDBA74', fontSize: 11, fontWeight: '900' },
  nav: { position: 'absolute', left: 14, right: 14, bottom: 12, height: 72, borderRadius: 28, backgroundColor: 'rgba(15,23,42,0.96)', flexDirection: 'row', padding: 8, borderWidth: 1, borderColor: '#1E293B' }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 22 }, navActive: { backgroundColor: '#F97316' }, navText: { color: '#64748B', fontSize: 11, fontWeight: '800', marginTop: 3 }, navTextActive: { color: '#FFF7ED' },
  copyBar: { marginHorizontal: 18, marginBottom: 8, padding: 12, backgroundColor: '#111827', borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, copyText: { color: '#E2E8F0', fontWeight: '800' }, copyBtn: { backgroundColor: '#F97316', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14 }, copyBtnText: { color: '#FFF7ED', fontWeight: '900' },
  panel: { flex: 1, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 100 }, listItem: { backgroundColor: '#121826', borderRadius: 22, borderWidth: 1, borderColor: '#1E293B', padding: 18, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, listTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '900' }, listMeta: { color: '#94A3B8', marginTop: 4, fontWeight: '700' }, setting: { backgroundColor: '#121826', borderRadius: 22, borderWidth: 1, borderColor: '#1E293B', padding: 18, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, settingText: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' }, addIcon: { color: '#F97316', fontSize: 30, fontWeight: '900' }, checkIcon: { color: '#22C55E', fontSize: 24, fontWeight: '900' }, navIcon: { color: '#64748B', fontSize: 20, fontWeight: '900' }, navIconActive: { color: '#FFF7ED' },
});
