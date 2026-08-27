import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import {
  calcDiscounts,
  calcItemCents,
  calcQuoteTotals,
  documentTextInfo,
  itemTextContext,
  pricingContextOf,
  type PricingContext,
  quoteTextContext,
  renderText,
  type Group,
  type Item,
  type QuoteBody,
  type Room,
} from '@/domain/quote';
import { formatMoney } from '@/domain/money';
import { formatQty, unitLabel } from '@/domain/library/units';
import { addDays, formatDate } from '@/lib/dates';
import type { BrandKit } from '@/domain/brand/schema';
import type { PdfTheme } from './theme';
import {
  groupHeading,
  preparedByLine,
  roomsSummaryLine,
  shouldPrintGroup,
  visibleItems as visibleItemsOf,
} from './document-content';
import { pl } from '@/i18n/pl';

export interface QuotePdfProps {
  body: QuoteBody;
  theme: PdfTheme;
  brandKit: BrandKit;
  number: string | null;
  /** Etykieta wersji przy numerze (np. „v2"). `null` = nie pokazuj (T-57). */
  versionLabel?: string | null;
  issueDate: string;
  currency: string;
  /** Data URL logo w wariancie wskazanym przez `theme.headerLogo`. */
  logoDataUrl?: string | null;
}

const styles = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 48, paddingHorizontal: 0, fontSize: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 51,
    paddingVertical: 22,
  },
  logo: { maxHeight: 34, maxWidth: 150, objectFit: 'contain' },
  body: { paddingHorizontal: 51, paddingTop: 22 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  metaCell: { width: '50%', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
  rowMain: { flex: 1, paddingRight: 12 },
  rowAmount: { width: 90, textAlign: 'right' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingBottom: 4,
    marginBottom: 2,
  },
  /*
   * PODSUMOWANIE NA CAŁĄ SZEROKOŚĆ (poprawka 3, 2026-08-27).
   *
   * Do tej pory było to pudełko 240 pt dosunięte do prawej krawędzi. Wyglądało
   * jak przypis, a jest jedyną rzeczą, której klient szuka w ofercie od razu.
   * Wąska kolumna dodatkowo łamała dłuższe etykiety („Rabaty", „VAT 23%”)
   * na dwie linijki i ściskała kwoty.
   */
  totals: { marginTop: 18, padding: 18 },
  totalsLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  /** Kwota do zapłaty: etykieta z lewej, liczba z prawej, na jednej linii. */
  totalsNet: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 51,
    right: 51,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

/**
 * Dokument oferty (04-PDF §2) rozszerzony o to, co przyszło z arkusza:
 * bloki pomieszczeń (F1.5), osobną sekcję rabatów (F3.3) i stopkę „CZYNNE"
 * z podpisem wystawiającego (F7.2).
 *
 * Kwoty pozycji liczy **domena** (`calcItemCents`), a nie ten plik. To była
 * pułapka złapana w T-35: wiersz w edytorze liczył po swojemu i pokazywał inną
 * liczbę niż podsumowanie. PDF jest trzecim miejscem, które kwotę wyświetla —
 * i ma czytać ją z tego samego źródła.
 */
export function QuotePdfDocument({
  body,
  theme,
  brandKit,
  number,
  versionLabel = null,
  issueDate,
  currency,
  logoDataUrl,
}: QuotePdfProps) {
  const totals = calcQuoteTotals(body);
  const discounts = calcDiscounts(body, body.rooms);
  const validUntil = addDays(new Date(issueDate), body.validDays);
  /*
   * Placeholdery w opisach (F4.2) podstawiamy w JEDNYM miejscu i przekazujemy
   * w dol jako funkcje. Gdyby kazdy wiersz skladal kontekst po swojemu, PDF
   * i podglad w edytorze moglyby wymieniac inne pomieszczenia — ta sama klasa
   * bledu, ktora wyszla przy kwotach pozycji w T-35.
   */
  const pricing = pricingContextOf(body);
  const textInfo = documentTextInfo(body, formatDate(validUntil));
  const describeItem = (item: Item) =>
    renderText(item.description, itemTextContext(textInfo, item));
  const docText = (template: string) => renderText(template, quoteTextContext(textInfo));
  const money = (cents: number) => formatMoney(cents, currency);

  const visibleItems = (items: Item[]) => visibleItemsOf(items, body.showDisabledItems);

  return (
    <Document title={number ?? body.title} author={brandKit.companyName}>
      <Page size="A4" style={[styles.page, { fontFamily: theme.fontFamily }]}>
        <View style={[styles.header, { backgroundColor: theme.accent }]} fixed={false}>
          {logoDataUrl ? (
            <Image src={logoDataUrl} style={styles.logo} />
          ) : (
            <Text style={{ color: theme.onAccent, fontSize: 14, fontWeight: 700 }}>
              {brandKit.companyName}
            </Text>
          )}
          <View style={{ alignItems: 'flex-end' }}>
            {number ? (
              <Text style={{ color: theme.onAccent, fontSize: 11 }}>
                {versionLabel ? `${number} · ${versionLabel}` : number}
              </Text>
            ) : null}
            <Text style={{ color: theme.onAccent, fontSize: theme.sizes.small }}>
              {formatDate(new Date(issueDate))}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={{ fontSize: theme.sizes.title, fontWeight: 700, color: theme.ink }}>
            {body.title}
          </Text>
          {body.subtitle ? (
            <Text style={{ fontSize: theme.sizes.body, color: theme.inkSoft, marginTop: 4 }}>
              {body.subtitle}
            </Text>
          ) : null}

          <View style={styles.metaGrid}>
            <Meta label={pl.editor.investor} value={body.client.name} theme={theme} />
            <Meta label={pl.editor.validity} value={formatDate(validUntil)} theme={theme} />
            <Meta label={pl.editor.phone} value={body.client.phone} theme={theme} />
            <Meta label={pl.editor.email} value={body.client.email} theme={theme} />
          </View>

          {/* Wiersz „Pomieszczenia: …" — F1.5. Bez pomieszczeń się nie drukuje. */}
          {body.rooms.length > 0 ? (
            <Text style={{ fontSize: theme.sizes.small, color: theme.inkSoft, marginTop: 10 }}>
              {`${pl.editor.rooms}: ${roomsSummaryLine(body.rooms)}`}
            </Text>
          ) : null}

          {body.intro ? (
            <Text style={{ marginTop: 14, fontSize: theme.sizes.body, color: theme.ink }}>
              {docText(body.intro)}
            </Text>
          ) : null}

          {body.projectDescription ? (
            <Text style={{ marginTop: 8, fontSize: theme.sizes.body, color: theme.inkSoft }}>
              {docText(body.projectDescription)}
            </Text>
          ) : null}

          {body.sections.map((section) => (
            <View key={section.id} style={{ marginTop: 20 }} minPresenceAhead={80}>
              <View style={[styles.sectionHeader, { borderBottomColor: theme.ink }]}>
                <Text
                  style={{
                    fontSize: theme.sizes.sectionTitle,
                    fontWeight: 700,
                    color: theme.ink,
                    textTransform: 'uppercase',
                  }}
                >
                  {section.title}
                </Text>
              </View>

              {visibleItems(section.items).map((item) => (
                <ItemLine
                  key={item.id}
                  item={item}
                  rooms={body.rooms}
                  theme={theme}
                  money={money}
                  describeItem={describeItem}
                  pricing={pricing}
                />
              ))}

              {section.groups.map((group) => (
                <GroupBlockPdf
                  key={group.id}
                  group={group}
                  rooms={body.rooms}
                  theme={theme}
                  money={money}
                  visibleItems={visibleItems}
                  showDisabledItems={body.showDisabledItems}
                  describeItem={describeItem}
                  pricing={pricing}
                />
              ))}
            </View>
          ))}

          {/* Rabaty jako osobna sekcja — tak jak w arkuszu i w edytorze (F3.3). */}
          {body.discounts.length > 0 ? (
            <View style={{ marginTop: 20 }} minPresenceAhead={60}>
              <View style={[styles.sectionHeader, { borderBottomColor: theme.ink }]}>
                <Text
                  style={{
                    fontSize: theme.sizes.sectionTitle,
                    fontWeight: 700,
                    color: theme.ink,
                    textTransform: 'uppercase',
                  }}
                >
                  {pl.editor.discountsTitle}
                </Text>
              </View>

              {body.discounts.map((discount) => {
                const line = discounts.lines.find((row) => row.discountId === discount.id);
                const amount = line?.amountCents ?? 0;
                const unmet = line !== undefined && !line.conditionMet;

                return (
                  <View key={discount.id} style={styles.row} wrap={false}>
                    <View style={styles.rowMain}>
                      <Text style={{ fontSize: theme.sizes.body, color: theme.ink }}>
                        {discount.name}
                      </Text>
                      {/* Rabat niespełniony pokazujemy z powodem — to narzędzie
                          sprzedażowe: klient widzi, co zyska, dobierając etap. */}
                      {unmet ? (
                        <Text style={{ fontSize: theme.sizes.small, color: theme.inkSoft }}>
                          {pl.editor.discountUnmet(line.enabledInScope, line.itemsInScope)}
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.rowAmount,
                        { fontSize: theme.sizes.body, color: theme.discount },
                      ]}
                    >
                      {amount > 0 ? `-${money(amount)}` : money(0)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={[styles.totals, { backgroundColor: theme.background }]} wrap={false}>
            <View style={styles.totalsLine}>
              <Text style={{ fontSize: theme.sizes.small, color: theme.inkSoft }}>
                {pl.editor.itemsTotal}
              </Text>
              <Text style={{ fontSize: theme.sizes.small }}>{money(totals.itemsCents)}</Text>
            </View>

            {totals.discountsCents > 0 ? (
              <View style={styles.totalsLine}>
                <Text style={{ fontSize: theme.sizes.small, color: theme.inkSoft }}>
                  {pl.editor.discounts}
                </Text>
                <Text style={{ fontSize: theme.sizes.small, color: theme.discount }}>
                  {`-${money(totals.discountsCents)}`}
                </Text>
              </View>
            ) : null}

            <View style={[styles.totalsNet, { borderTopColor: theme.hair }]}>
              <Text style={{ fontSize: theme.sizes.sectionTitle, color: theme.inkSoft }}>
                {pl.editor.net}
              </Text>
              <Text style={{ fontSize: theme.sizes.total, fontWeight: 700, color: theme.ink }}>
                {money(totals.netCents)}
              </Text>
            </View>

            {body.vatRate > 0 ? (
              <View style={{ marginTop: 8 }}>
                <View style={styles.totalsLine}>
                  <Text style={{ fontSize: theme.sizes.small, color: theme.inkSoft }}>
                    {`${pl.editor.vat} ${body.vatRate}%`}
                  </Text>
                  <Text style={{ fontSize: theme.sizes.small }}>{money(totals.vatCents)}</Text>
                </View>
                <View style={styles.totalsLine}>
                  <Text style={{ fontSize: theme.sizes.small, color: theme.inkSoft }}>
                    {pl.editor.gross}
                  </Text>
                  <Text style={{ fontSize: theme.sizes.body, fontWeight: 700 }}>
                    {money(totals.grossCents)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <ContactBlock body={body} brandKit={brandKit} theme={theme} />
        </View>

        <View style={styles.footer} fixed>
          <Text style={{ fontSize: theme.sizes.small, color: theme.inkSoft }}>
            {brandKit.footerText ?? brandKit.companyName}
          </Text>
          <Text
            style={{ fontSize: theme.sizes.small, color: theme.inkSoft }}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

function Meta({ label, value, theme }: { label: string; value: string; theme: PdfTheme }) {
  if (!value) return null;

  return (
    <View style={styles.metaCell}>
      <Text style={{ fontSize: theme.sizes.small, color: theme.inkSoft }}>{label}</Text>
      <Text style={{ fontSize: theme.sizes.body, color: theme.ink }}>{value}</Text>
    </View>
  );
}

/** Blok grupy — dla grupy przypiętej do pomieszczenia nagłówek dostaje `x2`. */
function GroupBlockPdf({
  group,
  rooms,
  theme,
  money,
  visibleItems,
  showDisabledItems,
  describeItem,
  pricing,
}: {
  group: Group;
  rooms: Room[];
  theme: PdfTheme;
  money: (cents: number) => string;
  visibleItems: (items: Item[]) => Item[];
  showDisabledItems: boolean;
  describeItem: (item: Item) => string;
  pricing: PricingContext;
}) {
  if (!shouldPrintGroup(group, rooms, showDisabledItems)) return null;

  const items = visibleItems(group.items);
  const title = groupHeading(group, rooms);

  return (
    <View style={{ marginTop: 10 }} minPresenceAhead={50}>
      <Text
        style={{
          fontSize: theme.sizes.groupTitle,
          fontWeight: 700,
          color: theme.accent,
          textTransform: 'uppercase',
          marginBottom: 2,
        }}
      >
        {title}
      </Text>
      {items.map((item) => (
        <ItemLine
          key={item.id}
          item={item}
          rooms={rooms}
          theme={theme}
          money={money}
          describeItem={describeItem}
          pricing={pricing}
        />
      ))}
    </View>
  );
}

function ItemLine({
  item,
  rooms,
  theme,
  money,
  describeItem,
  pricing,
}: {
  item: Item;
  rooms: Room[];
  pricing: PricingContext;
  theme: PdfTheme;
  money: (cents: number) => string;
  describeItem: (item: Item) => string;
}) {
  const description = describeItem(item);
  // Wartość z domeny — patrz komentarz przy `QuotePdfDocument`.
  const valueCents = calcItemCents(item, rooms, pricing);
  const off = !item.enabled;

  return (
    <View
      style={[styles.row, { borderBottomWidth: 0.5, borderBottomColor: theme.hair }]}
      wrap={false}
    >
      <View style={styles.rowMain}>
        <Text
          style={{
            fontSize: theme.sizes.body,
            fontWeight: 700,
            color: off ? theme.inkSoft : theme.ink,
          }}
        >
          {item.name}
        </Text>
        {description ? (
          <Text style={{ fontSize: theme.sizes.small, color: theme.inkSoft, marginTop: 1 }}>
            {description}
          </Text>
        ) : null}
      </View>

      {/* Ilość z JEDNOSTKĄ (T-60): „80 m² ×" zamiast samego „80 ×". Ryczałt
          nie ma etykiety, więc przy qty = 1 dalej nic nie drukujemy. */}
      {item.qty !== 1 || unitLabel(item.unit, item.unitLabel) ? (
        <Text style={{ fontSize: theme.sizes.small, color: theme.inkSoft, marginRight: 8 }}>
          {`${formatQty(item.qty, item.unit, item.unitLabel)} x`}
        </Text>
      ) : null}

      <Text
        style={[
          styles.rowAmount,
          { fontSize: theme.sizes.body, color: off ? theme.inkSoft : theme.ink },
        ]}
      >
        {/* „Wycena indywidualna" zamiast kwoty (T-60) — pozycja jest w ofercie,
            ale ceny nie ma. Zero drukowałoby „0,00 zł", czyli „gratis". */}
        {item.unitPriceCents === null ? pl.pdf.individualPrice : money(valueCents)}
      </Text>
    </View>
  );
}

/** Kontakt, podpis wystawiającego i blok „CZYNNE" (F7.2). */
function ContactBlock({
  body,
  brandKit,
  theme,
}: {
  body: QuoteBody;
  brandKit: BrandKit;
  theme: PdfTheme;
}) {
  const preparedBy = preparedByLine(body, brandKit.signerName, brandKit.signerTitle);

  return (
    <View style={{ marginTop: 24 }} wrap={false}>
      {preparedBy ? (
        <Text style={{ fontSize: theme.sizes.small, color: theme.inkSoft }}>
          {`${pl.editor.preparedBy}: ${preparedBy}`}
        </Text>
      ) : null}

      {brandKit.contacts.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
          {brandKit.contacts.map((contact, index) => (
            <View key={index} style={{ width: '50%', marginBottom: 3 }}>
              <Text style={{ fontSize: theme.sizes.small, color: theme.ink }}>
                {[contact.name, contact.phone, contact.email].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {brandKit.openingHours.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          <Text
            style={{
              fontSize: theme.sizes.small,
              fontWeight: 700,
              color: theme.ink,
              textTransform: 'uppercase',
            }}
          >
            {pl.brand.openingHours}
          </Text>
          {brandKit.openingHours.map((row, index) => (
            <Text key={index} style={{ fontSize: theme.sizes.small, color: theme.inkSoft }}>
              {`${row.label}: ${row.hours}`}
            </Text>
          ))}
        </View>
      ) : null}

      {brandKit.address || brandKit.taxId ? (
        <Text style={{ fontSize: theme.sizes.small, color: theme.inkSoft, marginTop: 6 }}>
          {[brandKit.address, brandKit.taxId ? `NIP ${brandKit.taxId}` : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
    </View>
  );
}
