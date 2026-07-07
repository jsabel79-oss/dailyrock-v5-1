import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Tab = 'Today' | 'Ghost' | 'Lists' | 'Settings';
type Activity = { id: string; title: string; category: string; start: number; duration: number; color: string };
type Editing = { mode: 'activity'; id?: string; schedule: 'today' | 'ghost'; draft: Activity } | { mode: 'template'; title: string; start: number; duration: number } | null;

const START_HOUR = 0;
const END_HOUR = 24;
const SNAP = 5;
const { width, height } = Dimensions.get('window');
const INITIAL_PX_PER_MIN = clamp((height - 220) / (10 * 60), 0.72, 1.05);
const MIN_PX_PER_MIN = 0.65;
const MAX_PX_PER_MIN = 2.6;
const MIN_DURATION = 15;

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

const reusable = ['Prospecting', 'Follow Up', 'Swim', 'Walk', 'Reading', 'Client Call', 'Listing Presentation', 'Workout'];

function snap(value: number) { return Math.round(value / SNAP) * SNAP; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function timeLabel(minutes: number) {
  const h = Math.floor(minutes / 60); const m = minutes % 60; const hour = ((h + 11) % 12) + 1;
  return `${hour}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function clockValue(minutes: number) {
  const safe = clamp(snap(minutes), START_HOUR * 60, END_HOUR * 60 - MIN_DURATION);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}
function parseClock(value: string, fallback: number) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/i);
  if (!match) return fallback;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const suffix = match[3]?.toLowerCase();
  if (Number.isNaN(hour) || Number.isNaN(minute) || minute > 59) return fallback;
  if (suffix === 'pm' && hour < 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  return clamp(hour * 60 + minute, START_HOUR * 60, END_HOUR * 60 - MIN_DURATION);
}
function parseDuration(value: string, fallback: number) {
  const next = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(next) && next > 0 ? next : fallback;
}
function topFor(min: number, pxPerMin: number) { return (min - START_HOUR * 60) * pxPerMin; }
function newActivity(title: string, start: number, duration: number, category = 'Personal'): Activity {
  return { id: `${title}-${Date.now()}-${Math.round(Math.random() * 1000)}`, title, category, start, duration, color: palette[category] ?? palette.Personal };
}
function distance(touches: any[]) {
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

function ActivityTile({ item, onChange, onEdit, onInteraction, faded, pxPerMin }: { item: Activity; faded: boolean; pxPerMin: number; onEdit: () => void; onInteraction: () => void; onChange: (next: Activity) => void }) {
  const dragOrigin = useRef(item);
  const resizeOrigin = useRef(item);
  const moved = useRef(false);
  const drag = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 2,
    onPanResponderGrant: () => { moved.current = false; dragOrigin.current = item; onInteraction(); },
    onPanResponderMove: (_, g) => {
      moved.current = moved.current || Math.abs(g.dy) > 4;
      const delta = snap(g.dy / pxPerMin);
      const maxStart = END_HOUR * 60 - dragOrigin.current.duration;
      onChange({ ...dragOrigin.current, start: clamp(dragOrigin.current.start + delta, START_HOUR * 60, maxStart) });
    },
    onPanResponderRelease: () => { onInteraction(); if (!moved.current) onEdit(); },
  }), [item, onChange, onEdit, onInteraction, pxPerMin]);
  const resizeBottom = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { resizeOrigin.current = item; onInteraction(); },
    onPanResponderMove: (_, g) => onChange({ ...resizeOrigin.current, duration: clamp(snap(resizeOrigin.current.duration + g.dy / pxPerMin), MIN_DURATION, END_HOUR * 60 - resizeOrigin.current.start) }),
    onPanResponderRelease: onInteraction,
  }), [item, onChange, onInteraction, pxPerMin]);
  return (
    <Animated.View style={[styles.tile, { top: topFor(item.start, pxPerMin), height: item.duration * pxPerMin, borderColor: item.color, opacity: faded ? 0.46 : 1 }]} {...drag.panHandlers}>
      <View style={[styles.tileGlow, { backgroundColor: item.color }]} />
      <Text style={styles.tileTitle}>{item.title}</Text>
      <Text style={styles.tileMeta}>{timeLabel(item.start)} • {item.duration} min • {item.category}</Text>
      <View style={[styles.resizeHandle, styles.bottomHandle]} {...resizeBottom.panHandlers} />
    </Animated.View>
  );
}

function Schedule({ data, setData, onEdit, onCreate, showNow = false }: { data: Activity[]; setData: (d: Activity[]) => void; onEdit: (item: Activity) => void; onCreate: (start: number) => void; showNow?: boolean }) {
  const [now, setNow] = useState(new Date());
  const [pxPerMin, setPxPerMin] = useState(INITIAL_PX_PER_MIN);
  const [isPinching, setIsPinching] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pinch = useRef({ distance: 0, px: INITIAL_PX_PER_MIN });
  const suppressCreate = useRef(false);
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markActivityInteraction = () => {
    suppressCreate.current = true;
    if (suppressTimer.current) clearTimeout(suppressTimer.current);
    suppressTimer.current = setTimeout(() => { suppressCreate.current = false; suppressTimer.current = null; }, 120);
  };
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, []);
  useEffect(() => () => { if (suppressTimer.current) clearTimeout(suppressTimer.current); }, []);
  useEffect(() => { requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 7 * 60 * pxPerMin - 8, animated: false })); }, []);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const timelineHeight = (END_HOUR - START_HOUR) * 60 * pxPerMin;
  return <ScrollView ref={scrollRef} scrollEnabled={!isPinching} style={styles.scroller} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <Pressable disabled={isPinching} onPress={(event) => { if (suppressCreate.current) return; onCreate(clamp(snap(event.nativeEvent.locationY / pxPerMin), 0, END_HOUR * 60 - MIN_DURATION)); }}>
      <View style={[styles.timelineWrap, { height: timelineHeight + 80 }]}
        onTouchStart={(e) => { if (e.nativeEvent.touches.length === 2) { setIsPinching(true); pinch.current = { distance: distance(e.nativeEvent.touches), px: pxPerMin }; } }}
        onTouchMove={(e) => { if (e.nativeEvent.touches.length === 2 && pinch.current.distance > 0) setPxPerMin(clamp(pinch.current.px * (distance(e.nativeEvent.touches) / pinch.current.distance), MIN_PX_PER_MIN, MAX_PX_PER_MIN)); }}
        onTouchEnd={() => { setIsPinching(false); pinch.current.distance = 0; }}>
        {hours.map(h => <View key={h} style={[styles.hourRow, { top: (h - START_HOUR) * 60 * pxPerMin }]}><Text style={styles.hourText}>{timeLabel(h * 60)}</Text><View style={styles.hourLine} /></View>)}
        <View style={[styles.windowHint, { top: 7 * 60 * pxPerMin }]}><Text style={styles.windowHintText}>Default day view starts here</Text></View>
        {showNow && nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60 && <View style={[styles.nowLine, { top: topFor(nowMinutes, pxPerMin) }]}><View style={styles.nowDot} /><Text style={styles.nowText}>NOW</Text></View>}
        {data.map(item => <ActivityTile key={item.id} item={item} pxPerMin={pxPerMin} faded={showNow && item.start + item.duration < nowMinutes} onEdit={() => onEdit(item)} onInteraction={markActivityInteraction} onChange={(next) => setData(data.map(x => x.id === item.id ? next : x))} />)}
      </View>
    </Pressable>
  </ScrollView>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('Today');
  const [today, setToday] = useState<Activity[]>(ghostSeed.map(x => ({ ...x, id: `today-${x.id}` })));
  const [ghost, setGhost] = useState<Activity[]>(ghostSeed);
  const [editing, setEditing] = useState<Editing>(null);
  const saveDraft = (draft: Activity, schedule: 'today' | 'ghost', id?: string) => {
    const setter = schedule === 'today' ? setToday : setGhost;
    const source = schedule === 'today' ? today : ghost;
    setter(id ? source.map(x => x.id === id ? draft : x) : [...source, draft]);
    setEditing(null);
  };
  const deleteDraft = (schedule: 'today' | 'ghost', id?: string) => {
    if (!id) return setEditing(null);
    (schedule === 'today' ? setToday : setGhost)((schedule === 'today' ? today : ghost).filter(x => x.id !== id));
    setEditing(null);
  };
  const content = useMemo(() => {
    if (tab === 'Today') return <Schedule data={today} setData={setToday} showNow onCreate={(start) => setEditing({ mode: 'activity', schedule: 'today', draft: newActivity('New Activity', start, 30) })} onEdit={(item) => setEditing({ mode: 'activity', schedule: 'today', id: item.id, draft: item })} />;
    if (tab === 'Ghost') return <><View style={styles.copyBar}><Text style={styles.copyText}>Permanent template day</Text><Pressable style={styles.copyBtn} onPress={() => Alert.alert('Replace Today?', 'Copy Ghost to Today and replace the current live schedule?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Replace', style: 'destructive', onPress: () => setToday(ghost.map(x => ({ ...x, id: `copy-${x.id}-${Date.now()}` }))) }])}><Text style={styles.copyBtnText}>Copy Ghost → Today</Text></Pressable></View><Schedule data={ghost} setData={setGhost} onCreate={(start) => setEditing({ mode: 'activity', schedule: 'ghost', draft: newActivity('New Template', start, 30) })} onEdit={(item) => setEditing({ mode: 'activity', schedule: 'ghost', id: item.id, draft: item })} /></>;
    if (tab === 'Lists') return <View style={styles.panel}>{reusable.map((x) => <Pressable key={x} style={styles.listItem} onPress={() => setEditing({ mode: 'template', title: x, start: 9 * 60, duration: 30 })}><View><Text style={styles.listTitle}>{x}</Text><Text style={styles.listMeta}>Tap to choose start time and duration</Text></View><Text style={styles.addIcon}>＋</Text></Pressable>)}</View>;
    return <View style={styles.panel}>{['Settings placeholder', 'Dark theme enabled', '5-minute snapping', 'Pinch timeline to zoom'].map(x => <View key={x} style={styles.setting}><Text style={styles.settingText}>{x}</Text><Text style={styles.checkIcon}>✓</Text></View>)}</View>;
  }, [tab, today, ghost]);
  return <SafeAreaView style={styles.safe}><StatusBar style="light" /><View style={styles.header}><Text style={styles.kicker}>Daily Rock V5.1</Text><Text style={styles.title}>{tab}</Text></View>{content}<EditModal editing={editing} setEditing={setEditing} onSave={saveDraft} onDelete={deleteDraft} /><View style={styles.nav}>{(['Today','Ghost','Lists','Settings'] as Tab[]).map(t => <Pressable key={t} onPress={() => setTab(t)} style={[styles.navItem, tab === t && styles.navActive]}><Text style={[styles.navIcon, tab === t && styles.navIconActive]}>{t === 'Today' ? '◷' : t === 'Ghost' ? '▣' : t === 'Lists' ? '☰' : '⚙'}</Text><Text style={[styles.navText, tab === t && styles.navTextActive]}>{t}</Text></Pressable>)}</View></SafeAreaView>;
}

function EditModal({ editing, setEditing, onSave, onDelete }: { editing: Editing; setEditing: (e: Editing) => void; onSave: (draft: Activity, schedule: 'today' | 'ghost', id?: string) => void; onDelete: (schedule: 'today' | 'ghost', id?: string) => void }) {
  if (!editing) return null;
  const isTemplate = editing.mode === 'template';
  const draft = isTemplate ? newActivity(editing.title, editing.start, editing.duration) : editing.draft;
  const categories = Object.keys(palette);
  const setDraft = (next: Activity) => {
    if (isTemplate) return;
    setEditing({ ...editing, draft: next });
  };
  const updateTemplate = (title: string, start: number, duration: number) => {
    if (!isTemplate) return;
    setEditing({ ...editing, title, start: clamp(start, 0, END_HOUR * 60 - MIN_DURATION), duration: clamp(duration, MIN_DURATION, END_HOUR * 60) });
  };
  const updateActivity = (patch: Partial<Activity>) => {
    if (isTemplate) return;
    const nextCategory = patch.category ?? draft.category;
    setDraft({ ...draft, ...patch, color: patch.color ?? (patch.category ? palette[nextCategory] ?? draft.color : draft.color) });
  };
  const updateTime = (nextStart: number, nextDuration: number) => {
    const safeStart = clamp(snap(nextStart), 0, END_HOUR * 60 - MIN_DURATION);
    const safeDuration = clamp(snap(nextDuration), MIN_DURATION, END_HOUR * 60 - safeStart);
    isTemplate ? updateTemplate(editing.title, safeStart, safeDuration) : updateActivity({ start: safeStart, duration: safeDuration });
  };
  const save = () => isTemplate ? onSave(newActivity(editing.title, editing.start, editing.duration), 'today') : onSave(draft, editing.schedule, editing.id);
  return <Modal transparent animationType="fade" visible><View style={styles.modalShade}><View style={styles.modalCard}>
    <Text style={styles.modalKicker}>{isTemplate ? 'Insert into Today' : `Edit ${editing.schedule === 'ghost' ? 'Ghost' : 'Today'} Activity`}</Text>
    <TextInput style={styles.textField} value={isTemplate ? editing.title : draft.title} placeholder="Activity title" placeholderTextColor="#64748B" onChangeText={(text) => isTemplate ? updateTemplate(text, editing.start, editing.duration) : updateActivity({ title: text })} />
    {!isTemplate && <><Text style={styles.fieldLabel}>Category</Text><TextInput style={styles.compactField} value={draft.category} placeholder="Category" placeholderTextColor="#64748B" onChangeText={(category) => updateActivity({ category })} /><View style={styles.chipGrid}>{categories.map(category => <Pressable key={category} style={[styles.chip, draft.category === category && styles.chipActive, { borderColor: palette[category] }]} onPress={() => updateActivity({ category })}><View style={[styles.chipDot, { backgroundColor: palette[category] }]} /><Text style={[styles.chipText, draft.category === category && styles.chipTextActive]}>{category}</Text></Pressable>)}</View></>}
    {!isTemplate && <><Text style={styles.fieldLabel}>Color</Text><View style={styles.colorRow}>{Object.entries(palette).map(([name, color]) => <Pressable key={name} accessibilityLabel={`${name} color`} style={[styles.colorChip, { backgroundColor: color }, draft.color === color && styles.colorChipActive]} onPress={() => updateActivity({ color })} />)}</View></>}
    <Text style={styles.modalMeta}>{timeLabel(isTemplate ? editing.start : draft.start)} • {(isTemplate ? editing.duration : draft.duration)} min</Text>
    <View style={styles.timeEditorRow}>
      <View style={styles.timeEditorCell}><Text style={styles.fieldLabel}>Start time</Text><TextInput style={styles.compactField} value={clockValue(isTemplate ? editing.start : draft.start)} keyboardType="numbers-and-punctuation" placeholder="09:00" placeholderTextColor="#64748B" onChangeText={(value) => updateTime(parseClock(value, isTemplate ? editing.start : draft.start), isTemplate ? editing.duration : draft.duration)} /></View>
      <View style={styles.timeEditorCell}><Text style={styles.fieldLabel}>Duration</Text><TextInput style={styles.compactField} value={String(isTemplate ? editing.duration : draft.duration)} keyboardType="number-pad" placeholder="30" placeholderTextColor="#64748B" onChangeText={(value) => updateTime(isTemplate ? editing.start : draft.start, parseDuration(value, isTemplate ? editing.duration : draft.duration))} /></View>
    </View>
    <View style={styles.controlGrid}>{[-30,-15,15,30].map(v => <Pressable key={`s${v}`} style={styles.controlBtn} onPress={() => updateTime((isTemplate ? editing.start : draft.start) + v, isTemplate ? editing.duration : draft.duration)}><Text style={styles.controlText}>{v > 0 ? '+' : ''}{v} start</Text></Pressable>)}{[-15,15,30,60].map(v => <Pressable key={`d${v}`} style={styles.controlBtn} onPress={() => updateTime(isTemplate ? editing.start : draft.start, (isTemplate ? editing.duration : draft.duration) + v)}><Text style={styles.controlText}>{v > 0 ? '+' : ''}{v} min</Text></Pressable>)}</View>
    <View style={styles.modalActions}><Pressable style={styles.secondaryBtn} onPress={() => setEditing(null)}><Text style={styles.secondaryText}>Cancel</Text></Pressable>{!isTemplate && <Pressable style={styles.deleteBtn} onPress={() => onDelete(editing.schedule, editing.id)}><Text style={styles.deleteText}>Delete</Text></Pressable>}<Pressable style={styles.saveBtn} onPress={save}><Text style={styles.saveText}>{isTemplate ? 'Insert' : 'Save'}</Text></Pressable></View>
  </View></View></Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090A0F' }, header: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 12 }, kicker: { color: '#F97316', fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }, title: { color: '#F8FAFC', fontSize: 36, fontWeight: '900', marginTop: 2 },
  scroller: { flex: 1 }, scrollContent: { paddingBottom: 108 }, timelineWrap: { marginHorizontal: 14, position: 'relative' }, hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' }, hourText: { width: 72, color: '#64748B', fontSize: 12, fontWeight: '700' }, hourLine: { flex: 1, height: 1, backgroundColor: '#182033' }, windowHint: { position: 'absolute', left: 76, right: 0, height: 1, backgroundColor: 'rgba(249,115,22,0.22)' }, windowHintText: { position: 'absolute', right: 6, top: -17, color: '#7C2D12', fontSize: 10, fontWeight: '900' },
  tile: { position: 'absolute', left: 76, width: width - 104, backgroundColor: '#121826', borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6, overflow: 'hidden', minHeight: 28 }, tileGlow: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, opacity: 0.95 }, tileTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '900' }, tileMeta: { color: '#CBD5E1', fontSize: 12, fontWeight: '700', marginTop: 4 }, resizeHandle: { position: 'absolute', alignSelf: 'center', width: 46, height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' }, bottomHandle: { bottom: 3 },
  nowLine: { position: 'absolute', left: 68, right: 0, height: 2, backgroundColor: '#EF4444', zIndex: 5 }, nowDot: { position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' }, nowText: { position: 'absolute', right: 4, top: -18, color: '#FCA5A5', fontSize: 11, fontWeight: '900' },
  nav: { position: 'absolute', left: 14, right: 14, bottom: 12, height: 72, borderRadius: 28, backgroundColor: 'rgba(15,23,42,0.96)', flexDirection: 'row', padding: 8, borderWidth: 1, borderColor: '#1E293B' }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 22 }, navActive: { backgroundColor: '#F97316' }, navText: { color: '#64748B', fontSize: 11, fontWeight: '800', marginTop: 3 }, navTextActive: { color: '#FFF7ED' }, navIcon: { color: '#64748B', fontSize: 20, fontWeight: '900' }, navIconActive: { color: '#FFF7ED' },
  copyBar: { marginHorizontal: 18, marginBottom: 8, padding: 12, backgroundColor: '#111827', borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, copyText: { color: '#E2E8F0', fontWeight: '800' }, copyBtn: { backgroundColor: '#F97316', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14 }, copyBtnText: { color: '#FFF7ED', fontWeight: '900' },
  panel: { flex: 1, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 100 }, listItem: { backgroundColor: '#121826', borderRadius: 22, borderWidth: 1, borderColor: '#1E293B', padding: 18, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, listTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '900' }, listMeta: { color: '#94A3B8', marginTop: 4, fontWeight: '700' }, setting: { backgroundColor: '#121826', borderRadius: 22, borderWidth: 1, borderColor: '#1E293B', padding: 18, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, settingText: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' }, addIcon: { color: '#F97316', fontSize: 30, fontWeight: '900' }, checkIcon: { color: '#22C55E', fontSize: 24, fontWeight: '900' },
  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }, modalCard: { backgroundColor: '#111827', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, borderWidth: 1, borderColor: '#1E293B' }, modalKicker: { color: '#F97316', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }, textField: { color: '#F8FAFC', fontSize: 24, fontWeight: '900', marginTop: 8, marginBottom: 12, padding: 12, borderRadius: 16, backgroundColor: '#1E293B' }, compactField: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', marginBottom: 10, padding: 10, borderRadius: 14, backgroundColor: '#1E293B' }, fieldLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4, marginBottom: 8 }, chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }, chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#121826' }, chipActive: { backgroundColor: '#1E293B' }, chipDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 }, chipText: { color: '#94A3B8', fontSize: 12, fontWeight: '900' }, chipTextActive: { color: '#F8FAFC' }, colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }, colorChip: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' }, colorChipActive: { borderColor: '#F8FAFC' }, modalTitle: { color: '#F8FAFC', fontSize: 28, fontWeight: '900', marginTop: 4 }, timeEditorRow: { flexDirection: 'row', gap: 10, marginBottom: 4 }, timeEditorCell: { flex: 1 }, modalMeta: { color: '#CBD5E1', fontWeight: '800', marginTop: 4, marginBottom: 16 }, controlGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, controlBtn: { width: (width - 62) / 2, padding: 13, borderRadius: 16, backgroundColor: '#1E293B', alignItems: 'center' }, controlText: { color: '#E2E8F0', fontWeight: '900' }, modalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 18 }, secondaryBtn: { padding: 13 }, secondaryText: { color: '#94A3B8', fontWeight: '900' }, deleteBtn: { backgroundColor: '#3F1D1D', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13 }, deleteText: { color: '#FCA5A5', fontWeight: '900' }, saveBtn: { backgroundColor: '#F97316', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 13 }, saveText: { color: '#FFF7ED', fontWeight: '900' },
});
