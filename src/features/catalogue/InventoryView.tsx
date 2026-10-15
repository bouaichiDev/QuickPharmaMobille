import { ExpirationDateField } from '@/features/stores/components/ExpirationDateField';
import { exportInventoryReport, exportInventoryExcel } from './stockExports';
import { useStockApi } from './StockContext';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/feedback/ErrorState';
import { type CountLine, type StockLocation } from './stockApi';
import { useStockLocations, useStockMutation, useStockScope } from './useStock';
import { BarcodeFlow } from './BarcodeFlow';
import {
  SBadge,
  SButton,
  SCard,
  SField,
  SHeading,
  SNote,
  SProgress,
  SSearch,
  STabs,
  StockPage,
  st,
  stockDate,
  useDebounce,
  money,
  StockScopeBanner,
} from './StockDesign';
const statusLabel = (status: string) =>
  status === 'validated' ? 'Terminé' : status === 'in_progress' ? 'En cours' : 'Brouillon';
export function InventoryView({
  onClose,
  canAdjust,
  location,
}: {
  onClose: () => void;
  canAdjust: boolean;
  location?: StockLocation;
}) {
  const stockApi = useStockApi();
  const scope = useStockScope();
  const [sessionId, setSessionId] = useState<number>();
  const [editing, setEditing] = useState<number>();
  const [openSummary, setOpenSummary] = useState(false);
  const [create, setCreate] = useState(!!location);
  const [name, setName] = useState(location ? `Inventaire ${location.name}` : '');
  const [place, setPlace] = useState<number | null>(location?.id || null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const places = useStockLocations();
  const query = useQuery({
    queryKey: ['stock-sessions', scope, page, status],
    queryFn: () => stockApi.sessions(page, status),
    enabled: !!scope && !sessionId,
  });
  const add = useStockMutation(() => stockApi.createSession(name.trim(), place));
  const rename = useStockMutation(() => stockApi.renameSession(editing!, name.trim()));
  const [error, setError] = useState<unknown>();
  async function start() {
    try {
      if (editing) {
        await rename.mutateAsync(undefined);
        setCreate(false);
        setEditing(undefined);
        return;
      }
      const s = await add.mutateAsync(undefined);
      await query.refetch();
      setSessionId(s.id);
      setCreate(false);
    } catch (e) {
      setError(e);
    }
  }
  if (sessionId)
    return (
      <InventoryCount
        id={sessionId}
        initialSummary={openSummary}
        canAdjust={canAdjust}
        onClose={() => setSessionId(undefined)}
      />
    );
  if (create)
    return (
      <StockPage
        title={editing ? 'Paramétrer l’inventaire' : 'Nouvel inventaire'}
        onClose={() => setCreate(false)}
        footer={
          <SButton
            label={editing ? 'Enregistrer les paramètres' : 'Démarrer le comptage'}
            icon="play-arrow"
            disabled={!name.trim() || !canAdjust}
            busy={add.isPending || rename.isPending}
            onPress={() => void start()}
          />
        }
      >
        <SCard>
          <SField label="Nom de la session d’inventaire" value={name} onChange={setName} />
          <SHeading title="Périmètre de comptage" icon="place" />
          <Pressable
            accessibilityRole="radio"
            disabled={!!editing}
            accessibilityState={{ checked: place === null }}
            onPress={() => setPlace(null)}
            style={st.note}
          >
            <Icon
              name={place === null ? 'radio-button-checked' : 'radio-button-unchecked'}
              color="primary"
            />
            <AppText>Tout l’établissement</AppText>
          </Pressable>
          {places.data?.map((l) => (
            <Pressable
              key={l.id}
              accessibilityRole="radio"
              disabled={!!editing}
              accessibilityState={{ checked: place === l.id }}
              onPress={() => setPlace(l.id)}
              style={st.row}
            >
              <Icon
                name={place === l.id ? 'radio-button-checked' : 'radio-button-unchecked'}
                color="primary"
              />
              <AppText style={st.grow}>{l.name}</AppText>
              <SBadge label={`${l.products} produits`} />
            </Pressable>
          ))}
        </SCard>
        <SNote>
          Le stock théorique est mémorisé au démarrage. Le comptage ne modifie aucune quantité avant
          validation.
        </SNote>
        {error ? <ErrorState error={error} /> : null}
      </StockPage>
    );
  return (
    <StockPage title="Sessions d’inventaire" onClose={onClose}>
      <StockScopeBanner compact />
      <View style={st.row}>
        <View style={st.grow}>
          <AppText variant="headlineLg">Sessions d’inventaire</AppText>
        </View>
        {canAdjust ? (
          <SButton
            label="Nouvel inventaire"
            icon="add"
            compact
            onPress={() => {
              setEditing(undefined);
              setName('');
              setPlace(null);
              setCreate(true);
            }}
          />
        ) : null}
      </View>
      <View style={[st.row, { alignItems: 'stretch' }]}>
        {[
          {
            label: 'Actifs',
            icon: 'pending-actions' as const,
            value: String(
              Number(query.data?.counts?.in_progress || 0) + Number(query.data?.counts?.draft || 0),
            ),
            hint: 'En cours / brouillons',
          },
          {
            label: 'Clôturés',
            icon: 'task-alt' as const,
            value: String(query.data?.counts?.validated ?? '—'),
            hint: 'Inventaires validés',
          },
          {
            label: 'Conformité',
            icon: 'verified' as const,
            value:
              query.data?.stats?.conformity == null
                ? '—'
                : Number(query.data.stats.conformity).toLocaleString('fr-FR', {
                    maximumFractionDigits: 1,
                  }),
            hint: 'Précision globale',
          },
        ].map((m) => (
          <View key={m.label} style={[st.metric, { padding: 10, gap: 4 }]}>
            <View style={st.row}>
              <AppText variant="labelSm" color="outline" style={st.grow}>
                {m.label}
              </AppText>
              <Icon name={m.icon} color="primary" size={16} />
            </View>
            <AppText
              variant="dataMetric"
              color={m.label === 'Actifs' ? 'primary' : 'secondary'}
              numberOfLines={1}
            >
              {m.value}
              {m.label === 'Conformité' ? <AppText variant="labelMd">%</AppText> : null}
            </AppText>
            <AppText variant="labelSm" color="outline">
              {m.hint}
            </AppText>
          </View>
        ))}
      </View>
      <STabs
        values={[
          ['all', `Tous ${query.data?.counts?.all ?? query.data?.total ?? 0}`],
          ['in_progress', `En cours ${query.data?.counts?.in_progress ?? ''}`],
          ['draft', `Brouillon ${query.data?.counts?.draft ?? ''}`],
          ['validated', `Terminés ${query.data?.counts?.validated ?? ''}`],
        ]}
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      />
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data?.data
        .filter((s) => status === 'all' || s.status === status)
        .map((s) => (
          <View key={s.id} style={[st.card, { padding: 12, gap: 8 }]}>
            <View style={st.row}>
              <Icon
                name={
                  s.status === 'validated'
                    ? 'check-circle'
                    : s.status === 'draft'
                      ? 'edit-calendar'
                      : 'autorenew'
                }
                size={16}
                color="primary"
              />
              <AppText variant="labelSm" color="primary">
                {s.status === 'validated'
                  ? 'COMPTAGE · VALIDÉ'
                  : s.status === 'draft'
                    ? 'PLANIFIÉ · BROUILLON'
                    : 'TOURNANT · PRIORITÉ'}
              </AppText>
            </View>
            <View style={st.row}>
              <View style={st.grow}>
                <AppText variant="labelLg">{s.name}</AppText>
              </View>
              <SBadge
                label={statusLabel(s.status)}
                tone={s.status === 'validated' ? 'teal' : 'blue'}
              />
            </View>
            <View style={[st.metric, { gap: 4, padding: 8 }]}>
              <View style={st.row}>
                <Icon name="place" size={14} color="outline" />
                <AppText variant="bodySm" style={st.grow}>
                  {s.location_name || 'Zone globale officine'}
                </AppText>
                <Icon name="person-outline" size={14} color="outline" />
                <AppText variant="bodySm">{s.creator_name || 'Responsable non renseigné'}</AppText>
              </View>
              <View style={st.row}>
                <Icon name="event" size={14} color="outline" />
                <AppText variant="bodySm" style={st.grow}>
                  Lancé le {stockDate(s.created_at)}
                </AppText>
                <SBadge
                  label={`${s.summary.differences || 0} écarts détectés`}
                  tone={s.summary.differences ? 'red' : 'teal'}
                />
              </View>
            </View>
            <SProgress count={Number(s.summary.counted)} total={Number(s.summary.total)} />

            <View style={st.row}>
              {s.status === 'draft' && canAdjust ? (
                <View style={st.grow}>
                  <SButton
                    label="Paramétrer"
                    icon="edit"
                    secondary
                    compact
                    onPress={() => {
                      setEditing(s.id);
                      setName(s.name);
                      setPlace(s.location_id || null);
                      setCreate(true);
                    }}
                  />
                </View>
              ) : null}
              <View style={st.grow}>
                <SButton
                  label={
                    s.status === 'validated'
                      ? 'Rapport d’écarts'
                      : s.status === 'draft'
                        ? 'Démarrer'
                        : 'Reprendre le comptage'
                  }
                  secondary={s.status === 'validated'}
                  compact
                  icon={s.status === 'validated' ? 'fact-check' : 'qr-code-scanner'}
                  onPress={() => {
                    setOpenSummary(s.status === 'validated');
                    setSessionId(s.id);
                  }}
                />
              </View>
            </View>
          </View>
        ))}
      {query.data?.data.length === 0 ? (
        <SNote>Aucune session d’inventaire. Démarrez un premier comptage.</SNote>
      ) : null}
      {(query.data?.last_page || 1) > 1 ? (
        <View style={st.row}>
          <View style={st.grow}>
            <SButton
              label="Précédent"
              secondary
              disabled={page === 1}
              onPress={() => setPage((p) => p - 1)}
            />
          </View>
          <AppText>
            {page} / {query.data?.last_page || 1}
          </AppText>
          <View style={st.grow}>
            <SButton
              label="Suivant"
              secondary
              disabled={page >= (query.data?.last_page || 1)}
              onPress={() => setPage((p) => p + 1)}
            />
          </View>
        </View>
      ) : null}
    </StockPage>
  );
}
export function InventoryCount({
  id,
  initialSummary = false,
  initialLine,
  onClose,
  canAdjust,
}: {
  id: number;
  initialSummary?: boolean;
  initialLine?: CountLine;
  onClose: () => void;
  canAdjust: boolean;
}) {
  const stockApi = useStockApi();
  const scope = useStockScope();
  const [search, setSearch] = useState('');
  const settled = useDebounce(search);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CountLine | undefined>(initialLine);
  const [quantity, setQuantity] = useState(
    initialLine ? String(initialLine.counted ?? initialLine.expected) : '',
  );
  const [reason, setReason] = useState(initialLine?.reason || '');
  const [reasonOpen, setReasonOpen] = useState(false);
  const [expiry, setExpiry] = useState('');
  const [scanner, setScanner] = useState(false);
  const [summary, setSummary] = useState(initialSummary);
  const [summaryFilter, setSummaryFilter] = useState('differences');
  const [confirmed, setConfirmed] = useState(false);
  const [validating, setValidating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportChoice, setExportChoice] = useState(false);
  async function exportReport(excel = false) {
    setExporting(true);
    try {
      if (excel) await exportInventoryExcel(id, stockApi);
      else await exportInventoryReport(id, stockApi);
      setExportChoice(false);
    } catch (e) {
      setError(e);
    } finally {
      setExporting(false);
    }
  }
  const [error, setError] = useState<unknown>();
  const query = useQuery({
    queryKey: ['stock-session', scope, id, settled, filter, page, summary, summaryFilter],
    queryFn: () =>
      stockApi.session(id, {
        search: summary ? undefined : settled,
        filter: summary ? summaryFilter : filter,
        page,
      }),
    enabled: !!scope,
  });
  const save = useStockMutation(async () => {
    if (!selected || !/^[0-9]+$/.test(quantity))
      throw new Error('Saisissez une quantité entière positive ou nulle.');
    return stockApi.count(id, selected.product_id, Number(quantity), reason, expiry);
  });
  const validate = useStockMutation(() => stockApi.validate(id));
  const data = query.data;
  const isDone = data?.session.status === 'validated';
  function choose(line: CountLine) {
    setSelected(line);
    setQuantity(String(line.counted ?? line.expected));
    setReason(line.reason || '');
    setReasonOpen(false);
    setExpiry(line.expiry || '');
    setError(undefined);
  }
  async function persist() {
    try {
      await save.mutateAsync(undefined);
      setSelected(undefined);
    } catch (e) {
      setError(e);
    }
  }
  async function finish() {
    try {
      await validate.mutateAsync(undefined);
      setValidating(false);
      setConfirmed(false);
    } catch (e) {
      setError(e);
    }
  }
  const delta = selected ? Number(quantity) - selected.expected : 0;
  return (
    <>
      <StockPage
        title={summary ? 'Synthèse & validation' : 'Comptage d’inventaire'}
        onClose={() => (summary ? setSummary(false) : onClose())}
        footer={
          summary ? (
            <View style={st.row}>
              <View style={{ flex: 0.35 }}>
                <SButton
                  label="Reprendre"
                  secondary
                  icon="edit-note"
                  onPress={() => {
                    setSummary(false);
                    setValidating(false);
                  }}
                />
              </View>
              <View style={{ flex: 0.65 }}>
                <SButton
                  label={
                    isDone
                      ? 'Inventaire validé'
                      : validating
                        ? 'Confirmer et ajuster le stock'
                        : 'Valider et ajuster'
                  }
                  icon="verified"
                  disabled={
                    !!isDone ||
                    !canAdjust ||
                    !confirmed ||
                    data?.summary.counted !== data?.summary.total ||
                    !data?.summary.total
                  }
                  busy={validate.isPending}
                  onPress={() => (validating ? void finish() : setValidating(true))}
                />
              </View>
            </View>
          ) : (
            <View style={st.row}>
              <View style={st.grow}>
                <SButton label="Brouillon enregistré" secondary icon="save" onPress={onClose} />
              </View>
              <View style={st.grow}>
                <SButton
                  label="Terminer & synthèse"
                  icon="arrow-forward"
                  onPress={() => {
                    setSummary(true);
                    setPage(1);
                    setSelected(undefined);
                  }}
                />
              </View>
            </View>
          )
        }
      >
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : null}
        {data ? (
          <>
            {summary ? (
              <>
                <SCard compact>
                  <View style={st.row}>
                    <SBadge label="INVENTAIRE RÉGULIER" />
                    <View style={st.grow} />
                    <SBadge
                      label={
                        isDone
                          ? 'Clôturé'
                          : Number(data.summary.counted) === Number(data.summary.total)
                            ? 'Prêt pour clôture'
                            : 'Comptage incomplet'
                      }
                      tone={isDone ? 'teal' : 'blue'}
                    />
                  </View>
                  <AppText variant="headlineMd">Synthèse d’inventaire</AppText>
                  <AppText variant="bodySm" color="outline">
                    #INV-{new Date(data.session.created_at).getFullYear()}-
                    {String(data.session.id).padStart(3, '0')} · {data.session.name}
                  </AppText>
                  <View style={st.row}>
                    <View
                      style={{
                        height: 56,
                        width: 56,
                        borderRadius: 28,
                        borderWidth: 7,
                        borderColor: '#72f4e7',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AppText variant="headlineSm" color="secondary">
                        {data.summary.counted
                          ? Math.round(
                              ((Number(data.summary.counted) - Number(data.summary.differences)) *
                                100) /
                                Number(data.summary.counted),
                            )
                          : 0}
                        %
                      </AppText>
                    </View>
                    <View style={st.grow}>
                      <AppText variant="labelLg">
                        {Number(data.summary.counted) - Number(data.summary.differences)} conformes
                        / {data.summary.total}
                      </AppText>
                      <AppText variant="bodySm" color="outline">
                        {data.summary.total
                          ? Math.round(
                              (Number(data.summary.counted) * 100) / Number(data.summary.total),
                            )
                          : 0}
                        % des lignes pointées
                      </AppText>
                    </View>
                    <SBadge label={`${data.summary.differences || 0} avec écart`} tone="red" />
                  </View>
                </SCard>
                {data.summary.impact !== undefined ? (
                  <View style={[st.row, { alignItems: 'stretch' }]}>
                    <View style={[st.card, st.grow, { padding: 12, gap: 8 }]}>
                      <SHeading title="Impact Net" icon="trending-down" />
                      <AppText
                        variant="dataMetric"
                        color={Number(data.summary.impact) < 0 ? 'error' : 'secondary'}
                      >
                        {money(data.summary.impact)} <AppText variant="labelMd">DH</AppText>
                      </AppText>
                      <AppText variant="bodySm" color="outline">
                        Solde d’ajustement
                      </AppText>
                    </View>
                    <View style={[st.card, st.grow, { padding: 12, gap: 8 }]}>
                      <SHeading title="Flux Bruts" icon="swap-vert" />
                      <View style={st.row}>
                        <AppText variant="bodySm" style={st.grow}>
                          Pertes :
                        </AppText>
                        <AppText variant="labelMd" color="error">
                          {data.summary.losses === undefined ? '—' : money(data.summary.losses)} DH
                        </AppText>
                      </View>
                      <View style={st.row}>
                        <AppText variant="bodySm" style={st.grow}>
                          Surplus :
                        </AppText>
                        <AppText variant="labelMd" color="secondary">
                          {data.summary.surplus === undefined
                            ? '—'
                            : '+' + money(data.summary.surplus)}{' '}
                          DH
                        </AppText>
                      </View>
                    </View>
                  </View>
                ) : null}
              </>
            ) : (
              <SCard compact>
                <View style={st.row}>
                  <Icon name="inventory-2" color="primary" />
                  <AppText variant="headlineMd" style={st.grow}>
                    {data.session.name}
                  </AppText>
                  <SBadge
                    label={statusLabel(data.session.status)}
                    tone={isDone ? 'teal' : 'blue'}
                  />
                </View>
                <SProgress
                  count={Number(data.summary.counted)}
                  total={Number(data.summary.total)}
                />
              </SCard>
            )}
            {!summary ? (
              <>
                <SSearch
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
                  onScan={() => setScanner(true)}
                  placeholder="Scanner un produit ou rechercher…"
                />
                <SNote>
                  Le scan retrouve la ligne du produit ; la quantité doit être confirmée
                  manuellement.
                </SNote>
                <STabs
                  values={[
                    ['all', 'Tous'],
                    ['pending', 'Non comptés'],
                    ['differences', 'Avec écart'],
                  ]}
                  value={filter}
                  onChange={(v) => {
                    setFilter(v);
                    setPage(1);
                  }}
                />
              </>
            ) : (
              <View style={{ gap: 10 }}>
                <STabs
                  values={[
                    ['differences', 'Tous'],
                    ['surplus', 'Surplus'],
                    ['missing', 'Manquants'],
                  ]}
                  value={summaryFilter}
                  onChange={(v) => {
                    setSummaryFilter(v);
                    setPage(1);
                  }}
                />
              </View>
            )}
            {selected && !summary ? (
              <SCard>
                <View style={st.row}>
                  <SBadge label="COMPTAGE EN COURS" tone="teal" />
                  <View style={st.grow} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Réinitialiser la quantité"
                    onPress={() => {
                      setQuantity(String(selected.expected));
                      setReason('');
                      setReasonOpen(false);
                    }}
                  >
                    <AppText variant="labelSm" color="primary">
                      Réinitialiser
                    </AppText>
                  </Pressable>
                </View>
                <AppText variant="headlineMd">{selected.productName}</AppText>
                <AppText variant="bodySm" color="outline">
                  Stock théorique : {selected.expected} unités
                </AppText>
                <View style={st.row}>
                  <SButton
                    label="−"
                    secondary
                    onPress={() => setQuantity(String(Math.max(0, Number(quantity) - 1)))}
                  />
                  <View style={st.grow}>
                    <AppText variant="labelSm" align="center">
                      Quantité constatée
                    </AppText>
                    <TextInput
                      accessibilityLabel="Quantité constatée"
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="number-pad"
                      style={{
                        fontSize: 28,
                        fontWeight: 'bold',
                        color: '#00417c',
                        textAlign: 'center',
                        minHeight: 54,
                        backgroundColor: '#eff4ff',
                        borderRadius: 8,
                      }}
                    />
                  </View>
                  <SButton
                    label="+"
                    secondary
                    onPress={() => setQuantity(String(Number(quantity) + 1))}
                  />
                </View>
                <SBadge
                  label={`Écart : ${delta > 0 ? '+' : ''}${delta} unités`}
                  tone={delta ? 'red' : 'teal'}
                />
                <View style={st.row}>
                  {[-5, -1, 5, 10].map((n) => (
                    <View key={n} style={st.grow}>
                      <SButton
                        label={n > 0 ? `+${n}` : String(n)}
                        compact
                        secondary
                        onPress={() => setQuantity(String(Math.max(0, Number(quantity) + n)))}
                      />
                    </View>
                  ))}
                </View>
                {delta && reasonOpen ? (
                  <SField label="Motif de l’écart" value={reason} onChange={setReason} />
                ) : null}
                {delta > 0 && selected.hasExpiration ? (
                  <ExpirationDateField
                    label="Péremption des unités supplémentaires"
                    placeholder="Choisir une date"
                    value={expiry}
                    onChange={setExpiry}
                    locale="fr-FR"
                    doneLabel="Confirmer"
                  />
                ) : null}
                <SButton
                  label="Valider la ligne"
                  teal
                  icon="check-circle"
                  disabled={
                    !canAdjust ||
                    !!isDone ||
                    !/^\d+$/.test(quantity) ||
                    (!!delta && !reason.trim()) ||
                    (delta > 0 && !!selected.hasExpiration && !expiry)
                  }
                  busy={save.isPending}
                  onPress={() => void persist()}
                />
                {delta ? (
                  <SButton
                    label="Signaler anomalie / lot périmé"
                    secondary
                    compact
                    icon="report-problem"
                    onPress={() => setReasonOpen((v) => !v)}
                  />
                ) : null}
              </SCard>
            ) : null}
            {data.lines.data
              .filter((line) => summary || line.product_id !== selected?.product_id)
              .map((line) => (
                <Pressable
                  key={line.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Compter ${line.productName}`}
                  disabled={!!isDone || !canAdjust || summary}
                  onPress={() => choose(line)}
                >
                  <SCard compact>
                    <View style={st.row}>
                      {summary ? <Icon name="medication" color="primary" size={22} /> : null}
                      <View style={st.grow}>
                        <AppText variant="labelLg">{line.productName}</AppText>
                        <AppText variant="bodySm" color="outline">
                          {summary ? line.description || line.sku : line.sku}
                        </AppText>
                      </View>
                      <SBadge
                        label={
                          line.counted === null
                            ? 'En attente'
                            : Number(line.counted) === Number(line.expected)
                              ? 'Conforme'
                              : `${Number(line.counted) > Number(line.expected) ? '+' : ''}${Number(line.counted) - Number(line.expected)} unités`
                        }
                        tone={
                          line.counted === null
                            ? 'blue'
                            : Number(line.counted) >= Number(line.expected)
                              ? 'teal'
                              : 'red'
                        }
                      />
                    </View>
                    <View
                      style={[
                        st.row,
                        {
                          backgroundColor: summary ? '#eff4ff' : 'transparent',
                          padding: summary ? 10 : 0,
                          borderRadius: 8,
                        },
                      ]}
                    >
                      <View style={st.grow}>
                        <AppText variant="labelSm" color="outline">
                          Théorique
                        </AppText>
                        <AppText variant={summary ? 'headlineSm' : 'bodySm'}>
                          {line.expected}
                        </AppText>
                      </View>
                      {summary ? <Icon name="arrow-forward" color="outline" size={17} /> : null}
                      <View style={st.grow}>
                        <AppText variant="labelSm" color="outline">
                          Compté
                        </AppText>
                        <AppText variant={summary ? 'headlineSm' : 'labelMd'}>
                          {line.counted ?? '—'}
                        </AppText>
                      </View>
                      {summary && line.buyingPrice !== undefined ? (
                        <View style={{ alignItems: 'flex-end' }}>
                          <AppText variant="labelSm" color="outline">
                            Impact valorisation
                          </AppText>
                          <AppText
                            variant="labelLg"
                            color={
                              Number(line.counted) - Number(line.expected) < 0
                                ? 'error'
                                : 'secondary'
                            }
                          >
                            {Number(line.counted) - Number(line.expected) > 0 ? '+' : ''}
                            {money(
                              (Number(line.counted) - Number(line.expected)) *
                                Number(line.buyingPrice),
                            )}{' '}
                            DH
                          </AppText>
                        </View>
                      ) : !isDone && !summary ? (
                        <Icon name="edit" color="primary" size={18} />
                      ) : null}
                    </View>
                    {summary ? (
                      <View style={st.row}>
                        <Icon name="assignment-turned-in" color="outline" size={16} />
                        <AppText variant="bodySm" color="outline" style={st.grow}>
                          Motif consigné :{' '}
                          <AppText variant="labelSm">
                            {line.reason || 'À renseigner lors du comptage'}
                          </AppText>
                        </AppText>
                      </View>
                    ) : null}
                  </SCard>
                </Pressable>
              ))}
            {data.lines.data.length === 0 ? (
              <SNote>
                {summary ? 'Aucun écart enregistré.' : 'Aucun produit trouvé dans cette session.'}
              </SNote>
            ) : null}
            {data.lines.last_page > 1 ? (
              <View style={st.row}>
                <View style={st.grow}>
                  <SButton
                    label="Précédent"
                    secondary
                    disabled={page === 1}
                    onPress={() => setPage((p) => p - 1)}
                  />
                </View>
                <AppText>
                  {page} / {data.lines.last_page}
                </AppText>
                <View style={st.grow}>
                  <SButton
                    label="Suivant"
                    secondary
                    disabled={page >= data.lines.last_page}
                    onPress={() => setPage((p) => p + 1)}
                  />
                </View>
              </View>
            ) : null}
            {summary && !isDone ? (
              <>
                <SCard compact>
                  <SHeading title="Mise en garde légale & comptable" icon="shield" />
                  <AppText variant="bodySm" color="outline">
                    La validation finale ajuste les unités de stock. Elle ne peut être annulée
                    depuis ce formulaire. Un stock modifié pendant le comptage bloque la validation.
                  </AppText>
                </SCard>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: confirmed }}
                  onPress={() => setConfirmed((v) => !v)}
                  style={st.row}
                >
                  <Icon
                    name={confirmed ? 'check-box' : 'check-box-outline-blank'}
                    color="primary"
                  />
                  <AppText variant="bodySm" style={st.grow}>
                    Je certifie l’exactitude des comptages physiques effectués et confirme les
                    ajustements.
                  </AppText>
                </Pressable>
                {validating ? (
                  <SNote error>
                    Confirmez une seconde fois pour appliquer les écarts de stock de cet inventaire.
                  </SNote>
                ) : null}
              </>
            ) : null}
            {summary ? (
              <SButton
                label="Exporter rapport d’inventaire (PDF / Excel)"
                compact
                secondary
                icon="picture-as-pdf"
                busy={exporting}
                onPress={() => setExportChoice(true)}
              />
            ) : null}
          </>
        ) : (
          <AppText>Chargement du comptage…</AppText>
        )}
        {error ? <ErrorState error={error} /> : null}
      </StockPage>
      {exportChoice ? (
        <StockPage title="Exporter l’inventaire" onClose={() => setExportChoice(false)}>
          <SCard>
            <SHeading title="Choisir le format du rapport" icon="download" />
            <SButton
              label="PDF · Rapport imprimable"
              icon="picture-as-pdf"
              busy={exporting}
              onPress={() => void exportReport()}
            />
            <SButton
              label="Excel · Tableur XML"
              secondary
              icon="table-chart"
              busy={exporting}
              onPress={() => void exportReport(true)}
            />
            <AppText variant="bodySm" color="outline">
              Le tableur s’ouvre dans Excel et conserve les références et les zéros initiaux.
            </AppText>
          </SCard>
          {error ? <ErrorState error={error} /> : null}
        </StockPage>
      ) : null}
      {scanner ? (
        <BarcodeFlow
          onClose={() => setScanner(false)}
          onLinked={() => setScanner(false)}
          onScanned={(code) => {
            setSearch(code);
            setFilter('all');
            setPage(1);
            setScanner(false);
          }}
        />
      ) : null}
    </>
  );
}
