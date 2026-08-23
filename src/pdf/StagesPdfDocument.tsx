import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { groupStageEntries, type StagesDoc } from '@/domain/documents';
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
    paddingHorizontal: 46,
    paddingVertical: 20,
  },
  logo: { maxHeight: 30, maxWidth: 140, objectFit: 'contain' },
  body: { paddingHorizontal: 46, paddingTop: 18 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
  mark: { width: 18 },
  name: { width: 150, paddingRight: 10 },
  description: { flex: 1 },
  footer: { position: 'absolute', bottom: 20, left: 46, right: 46 },
});

export interface StagesPdfProps {
  doc: StagesDoc;
  theme: PdfTheme;
  brandKit: BrandKit;
  number: string | null;
  issueDate: string;
  logoDataUrl?: string | null;
}

/**
 * Dokument „Etapy współpracy" (F6.1).
 *
 * Dwie kolumny: znacznik z nazwą i opis. **Etapy nieobjęte zostają w tabeli**,
 * z krzyżykiem — to jest sedno tego dokumentu. Klient ma zobaczyć, czego nie
 * zamawia, zanim się o tym dowie w połowie projektu.
 */
export function StagesPdfDocument({
  doc,
  theme,
  brandKit,
  number,
  issueDate,
  logoDataUrl,
}: StagesPdfProps) {
  const waznyDo = addDays(new Date(issueDate), doc.validDays);
  const objete = doc.entries.filter((entry) => entry.included).length;

  return (
    <Document title={pl.editor.stagesDocTitle} author={brandKit.companyName}>
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
            {pl.editor.stagesDocTitle}
          </Text>
          <Text style={{ fontSize: 9, color: theme.inkSoft, marginTop: 3 }}>
            {`${pl.editor.date}: ${formatDate(new Date(issueDate))} · ${pl.pdf.validUntil}: ${formatDate(waznyDo)}`}
          </Text>

          {/* Legenda od razu pod nagłówkiem: bez niej znaczniki w tabeli są
              zagadką, a to one niosą całą treść tego dokumentu. */}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
            <Text style={{ fontSize: 8, color: theme.accent }}>{`✓ ${pl.pdf.stagesIncluded}`}</Text>
            <Text style={{ fontSize: 8, color: theme.inkSoft }}>
              {`✗ ${pl.pdf.stagesExcluded}`}
            </Text>
            <Text style={{ fontSize: 8, color: theme.inkSoft }}>
              {pl.pdf.stagesCount(objete, doc.entries.length)}
            </Text>
          </View>

          {groupStageEntries(doc.entries).map((group) => (
            <View key={group.label || '—'} style={{ marginTop: 16 }}>
              {group.label ? (
                <Text
                  style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    color: theme.accent,
                    textTransform: 'uppercase',
                    borderBottomWidth: 1,
                    borderColor: theme.hair,
                    paddingBottom: 3,
                    marginBottom: 2,
                  }}
                >
                  {group.label}
                </Text>
              ) : null}

              {group.entries.map((entry) => (
                // `wrap={false}` — nazwa etapu i jego opis nie moga wyladowac
                // na dwoch roznych stronach.
                <View key={entry.id} style={styles.row} wrap={false}>
                  <Text
                    style={[
                      styles.mark,
                      { color: entry.included ? theme.accent : theme.inkSoft, fontWeight: 700 },
                    ]}
                  >
                    {entry.included ? '✓' : '✗'}
                  </Text>
                  <Text
                    style={[
                      styles.name,
                      {
                        fontWeight: 700,
                        color: entry.included ? theme.ink : theme.inkSoft,
                      },
                    ]}
                  >
                    {entry.name}
                  </Text>
                  <Text style={[styles.description, { color: theme.inkSoft }]}>
                    {entry.description}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {doc.footnote ? (
            <View
              style={{
                marginTop: 20,
                borderTopWidth: 1,
                borderColor: theme.hair,
                paddingTop: 8,
              }}
              wrap={false}
            >
              <Text style={{ fontSize: 8, color: theme.inkSoft }}>{doc.footnote}</Text>
            </View>
          ) : null}
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
