import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import {
  printableRooms,
  projectStages,
  roomHeading,
  roomStages,
  stageCoversRoom,
} from './schedule-content';
import { calcSchedule, calcStageDays, type ScheduleBody } from '@/domain/schedule';
import type { Room } from '@/domain/quote';
import type { BrandKit } from '@/domain/brand/schema';
import type { PdfTheme } from './theme';
import { addDays, formatDate } from '@/lib/dates';
import { pl } from '@/i18n/pl';

const styles = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 48, paddingHorizontal: 0, fontSize: 9 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  logo: { maxHeight: 30, maxWidth: 140, objectFit: 'contain' },
  body: { paddingHorizontal: 40, paddingTop: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  roomCell: { flex: 1, paddingRight: 8 },
  markCell: { width: 46, textAlign: 'center' },
  daysCell: { width: 52, textAlign: 'right' },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40 },
});

export interface SchedulePdfProps {
  schedule: ScheduleBody;
  rooms: Room[];
  theme: PdfTheme;
  brandKit: BrandKit;
  number: string | null;
  issueDate: string;
  validDays: number;
  logoDataUrl?: string | null;
}

/**
 * Dokument „Szacowany termin" (F5.3).
 *
 * **Osobny dokument, ta sama wycena** — numer, klient i stopka są jedne, bo
 * inwestor dostaje pakiet, a nie zbiór luźnych plików.
 *
 * Macierz `pomieszczenia × etapy` obejmuje **wyłącznie etapy zależne od
 * pomieszczeń**. Kolumna dla etapu liczonego na cały projekt miałaby w każdym
 * wierszu to samo — nie niosłaby informacji, a zabierała szerokość. Takie
 * etapy idą listą pod tabelą.
 */
export function SchedulePdfDocument({
  schedule,
  rooms,
  theme,
  brandKit,
  number,
  issueDate,
  validDays,
  logoDataUrl,
}: SchedulePdfProps) {
  const result = calcSchedule(schedule, rooms);
  const wiersze = printableRooms(rooms);
  const kolumny = roomStages(schedule, rooms);
  const caloscProjektu = projectStages(schedule, rooms);
  const waznyDo = addDays(new Date(issueDate), validDays);

  return (
    <Document title={pl.editor.scheduleTitle} author={brandKit.companyName}>
      <Page size="A4" style={[styles.page, { fontFamily: theme.fontFamily }]}>
        <View style={[styles.header, { backgroundColor: theme.accent }]}>
          {logoDataUrl ? (
            <Image src={logoDataUrl} style={styles.logo} />
          ) : (
            <Text style={{ color: theme.onAccent, fontSize: 13, fontWeight: 700 }}>
              {brandKit.companyName}
            </Text>
          )}
          <Text style={{ color: theme.onAccent, fontSize: 9 }}>{number ?? ''}</Text>
        </View>

        <View style={styles.body}>
          <Text style={{ fontSize: 18, color: theme.ink, textTransform: 'uppercase' }}>
            {pl.editor.scheduleTitle}
          </Text>
          <Text style={{ fontSize: 9, color: theme.inkSoft, marginTop: 3 }}>
            {`${pl.editor.date}: ${formatDate(new Date(issueDate))} · ${pl.pdf.validUntil}: ${formatDate(waznyDo)}`}
          </Text>

          {/* Ramy czasowe na GORZE, nie na koncu: to jest jedyna liczba,
              po ktora inwestor siega, otwierajac ten dokument. */}
          <Timeframe result={result} schedule={schedule} theme={theme} />

          {kolumny.length > 0 && wiersze.length > 0 ? (
            <RoomMatrix rooms={wiersze} stages={kolumny} theme={theme} allRooms={rooms} />
          ) : null}

          {caloscProjektu.length > 0 ? (
            <View style={{ marginTop: 18 }}>
              <SectionTitle text={pl.pdf.scheduleWholeProject} theme={theme} />
              {caloscProjektu.map((stage) => (
                <View key={stage.id} style={styles.row} wrap={false}>
                  <Text style={[styles.roomCell, { color: theme.ink }]}>{stage.name}</Text>
                  <Text style={[styles.markCell, { color: theme.inkSoft }]}>
                    {stage.owner === 'provider'
                      ? pl.editor.stageOwnerProvider
                      : pl.editor.stageOwnerClient}
                  </Text>
                  <Text style={[styles.daysCell, { color: theme.ink }]}>
                    {pl.editor.stageDays(calcStageDays(stage, rooms))}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <Summary result={result} theme={theme} />
        </View>

        <View style={styles.footer} fixed>
          <Text style={{ fontSize: 7.5, color: theme.inkSoft }}>
            {brandKit.footerText ?? brandKit.companyName}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/** Trzy daty: start, termin optymalny i najpóźniejszy. */
function Timeframe({
  result,
  schedule,
  theme,
}: {
  result: ReturnType<typeof calcSchedule>;
  schedule: ScheduleBody;
  theme: PdfTheme;
}) {
  if (!schedule.startDate) {
    return (
      <Text style={{ fontSize: 9, color: theme.inkSoft, marginTop: 14 }}>
        {pl.pdf.scheduleNoStart}
      </Text>
    );
  }

  return (
    <View
      style={{
        marginTop: 14,
        flexDirection: 'row',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.hair,
        paddingVertical: 10,
      }}
      wrap={false}
    >
      <Cell
        label={pl.pdf.scheduleStart}
        value={formatDate(new Date(schedule.startDate))}
        theme={theme}
      />
      <Cell
        label={pl.editor.scheduleEndOptimal}
        value={result.endOptimal ? formatDate(new Date(result.endOptimal)) : '—'}
        theme={theme}
      />
      <Cell
        label={pl.editor.scheduleEndLatest}
        value={result.endLatest ? formatDate(new Date(result.endLatest)) : '—'}
        theme={theme}
      />
    </View>
  );
}

function Cell({ label, value, theme }: { label: string; value: string; theme: PdfTheme }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 7.5, color: theme.inkSoft, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 12, color: theme.ink, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

/** Macierz pomieszczenia × etapy z ✓ i —. */
function RoomMatrix({
  rooms,
  stages,
  theme,
  allRooms,
}: {
  rooms: Room[];
  stages: ReturnType<typeof roomStages>;
  theme: PdfTheme;
  allRooms: Room[];
}) {
  return (
    <View style={{ marginTop: 18 }}>
      <SectionTitle text={pl.pdf.scheduleRoomsTable} theme={theme} />

      {/* Naglowek powtarza sie na kazdej stronie — bez tego druga strona
          tabeli to kolumny znaczkow bez wyjasnienia, czym sa. */}
      <View style={[styles.row, { borderBottomWidth: 1, borderColor: theme.ink }]} fixed>
        <Text style={[styles.roomCell, { fontSize: 7.5, color: theme.inkSoft }]}>
          {pl.editor.rooms}
        </Text>
        {stages.map((stage) => (
          <Text key={stage.id} style={[styles.markCell, { fontSize: 7, color: theme.inkSoft }]}>
            {stage.name}
          </Text>
        ))}
      </View>

      {rooms.map((room) => (
        // `wrap={false}` — wiersz nie moze pekac miedzy stronami: polowa
        // znaczkow na dole jednej kartki i polowa na gorze drugiej jest
        // nie do odczytania.
        <View
          key={room.id}
          style={[styles.row, { borderBottomWidth: 0.5, borderColor: theme.hair }]}
          wrap={false}
        >
          <Text style={[styles.roomCell, { color: theme.ink }]}>
            {roomHeading(room, pl.editor.newRoomName)}
          </Text>
          {stages.map((stage) => (
            <Text
              key={stage.id}
              style={[
                styles.markCell,
                { color: stageCoversRoom(stage, room) ? theme.accent : theme.inkSoft },
              ]}
            >
              {stageCoversRoom(stage, room) ? '✓' : '—'}
            </Text>
          ))}
        </View>
      ))}

      <View style={[styles.row, { borderTopWidth: 1, borderColor: theme.ink }]} wrap={false}>
        <Text style={[styles.roomCell, { fontSize: 7.5, color: theme.inkSoft }]}>
          {pl.pdf.scheduleStageDays}
        </Text>
        {stages.map((stage) => (
          <Text key={stage.id} style={[styles.markCell, { color: theme.ink }]}>
            {calcStageDays(stage, allRooms)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Summary({ result, theme }: { result: ReturnType<typeof calcSchedule>; theme: PdfTheme }) {
  return (
    <View style={{ marginTop: 20, alignSelf: 'flex-end', width: 260 }} wrap={false}>
      <Line
        label={pl.editor.scheduleProviderDays}
        value={pl.editor.stageDays(result.providerDays)}
        theme={theme}
      />
      <Line
        label={pl.editor.scheduleClientDays}
        value={pl.editor.stageDays(result.clientDays)}
        theme={theme}
      />
    </View>
  );
}

function Line({ label, value, theme }: { label: string; value: string; theme: PdfTheme }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
      <Text style={{ fontSize: 9, color: theme.inkSoft }}>{label}</Text>
      <Text style={{ fontSize: 9, color: theme.ink }}>{value}</Text>
    </View>
  );
}

function SectionTitle({ text, theme }: { text: string; theme: PdfTheme }) {
  return (
    <Text
      style={{
        fontSize: 8,
        fontWeight: 700,
        color: theme.accent,
        textTransform: 'uppercase',
        marginBottom: 4,
      }}
    >
      {text}
    </Text>
  );
}
