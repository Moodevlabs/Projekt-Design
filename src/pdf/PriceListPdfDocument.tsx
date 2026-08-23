import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { groupPriceListItems, type PriceListDoc } from '@/domain/documents';
import { formatMoneyRange } from '@/domain/money';
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
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
  name: { width: 132, paddingRight: 10 },
  description: { flex: 1, paddingRight: 10 },
  leadTime: { width: 88, paddingRight: 8 },
  price: { width: 92, textAlign: 'right' },
  footer: { position: 'absolute', bottom: 20, left: 46, right: 46 },
});

export interface PriceListPdfProps {
  doc: PriceListDoc;
  theme: PdfTheme;
  brandKit: BrandKit;
  number: string | null;
  issueDate: string;
  currency?: string;
  logoDataUrl?: string | null;
}

/**
 * Dokument „Cennik usług dodatkowych" (F6.2).
 *
 * Cztery kolumny: nazwa | opis | termin | cena. **Bez sumy na dole** — i to
 * nie jest przeoczenie: cennik jest listą możliwości z widełkami, a nie
 * ofertą. Suma widełek nie znaczyłaby nic, a wyglądałaby jak kwota
 * do zapłaty.
 */
export function PriceListPdfDocument({
  doc,
  theme,
  brandKit,
  number,
  issueDate,
  currency = 'PLN',
  logoDataUrl,
}: PriceListPdfProps) {
  const waznyDo = addDays(new Date(issueDate), doc.validDays);

  return (
    <Document title={pl.editor.priceListTitle} author={brandKit.companyName}>
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
            {pl.editor.priceListTitle}
          </Text>
          <Text style={{ fontSize: 9, color: theme.inkSoft, marginTop: 3 }}>
            {`${pl.editor.date}: ${formatDate(new Date(issueDate))} · ${pl.pdf.validUntil}: ${formatDate(waznyDo)}`}
          </Text>
          {/*
            Zastrzezenie o widelkach stoi NAD tabela, nie w przypisie na dole:
            czytelnik ma wiedziec, jak czytac kwoty, zanim je zobaczy.
          */}
          <Text style={{ fontSize: 8, color: theme.inkSoft, marginTop: 8 }}>
            {pl.pdf.priceListRangeNote}
          </Text>

          {groupPriceListItems(doc.items).map((group) => (
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
                  }}
                >
                  {group.label}
                </Text>
              ) : null}

              {group.items.map((item) => (
                // `wrap={false}` — cena nie moze wyladowac na innej stronie
                // niz nazwa uslugi, ktorej dotyczy.
                <View
                  key={item.id}
                  style={[styles.row, { borderBottomWidth: 0.5, borderColor: theme.hair }]}
                  wrap={false}
                >
                  <Text style={[styles.name, { fontWeight: 700, color: theme.ink }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.description, { color: theme.inkSoft }]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.leadTime, { color: theme.inkSoft, fontSize: 8 }]}>
                    {item.leadTime}
                  </Text>
                  <Text style={[styles.price, { fontWeight: 700, color: theme.ink }]}>
                    {formatMoneyRange(item.priceMinCents, item.priceMaxCents, item.unit, currency)}
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
