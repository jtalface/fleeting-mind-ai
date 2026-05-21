import type { TenantBillingContract, TenantRateCardDto } from "@fleetmind/shared";
import { Card, PageHeader } from "@fleetmind/ui";
import { useCallback, useEffect, useState } from "react";
import type { ApiClientConfig } from "../api/client.js";
import {
  activateBillingContract,
  createBillingContract,
  getBillingContracts,
  getTenantRateCard,
  putTenantRateCard
} from "../api/client.js";
import { FinanceMetricsCallout } from "../components/FinanceMetricsCallout.js";

export interface FinanceSettingsPageProps {
  cfg: ApiClientConfig;
}

export function FinanceSettingsPage({ cfg }: FinanceSettingsPageProps): JSX.Element {
  const [rateCard, setRateCard] = useState<TenantRateCardDto | undefined>();
  const [contracts, setContracts] = useState<TenantBillingContract[]>([]);
  const [activeContractId, setActiveContractId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const [revenuePerKm, setRevenuePerKm] = useState("2.1");
  const [operatingCostPerKm, setOperatingCostPerKm] = useState("0.6");
  const [currency, setCurrency] = useState("USD");

  const [newName, setNewName] = useState("");
  const [newJobId, setNewJobId] = useState("");
  const [newRevenue, setNewRevenue] = useState("3.2");
  const [newCost, setNewCost] = useState("0.85");
  const [newNotes, setNewNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [card, list] = await Promise.all([getTenantRateCard(cfg), getBillingContracts(cfg)]);
      setRateCard(card);
      setRevenuePerKm(String(card.revenuePerKm));
      setOperatingCostPerKm(String(card.operatingCostPerKm));
      setCurrency(card.currency);
      setContracts(list.contracts);
      setActiveContractId(list.activeContractId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load finance settings");
    } finally {
      setLoading(false);
    }
  }, [cfg]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRateCard = async () => {
    setSaving(true);
    setError(undefined);
    try {
      const card = await putTenantRateCard(cfg, {
        revenuePerKm: Number(revenuePerKm),
        operatingCostPerKm: Number(operatingCostPerKm),
        currency
      });
      setRateCard(card);
      setActiveContractId(undefined);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rate card");
    } finally {
      setSaving(false);
    }
  };

  const addContract = async () => {
    if (!newName.trim()) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await createBillingContract(cfg, {
        name: newName.trim(),
        ...(newJobId.trim() ? { externalJobId: newJobId.trim() } : {}),
        revenuePerKm: Number(newRevenue),
        operatingCostPerKm: Number(newCost),
        ...(newNotes.trim() ? { notes: newNotes.trim() } : {})
      });
      setNewName("");
      setNewJobId("");
      setNewNotes("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create contract");
    } finally {
      setSaving(false);
    }
  };

  const onActivate = async (id: string) => {
    setSaving(true);
    setError(undefined);
    try {
      const result = await activateBillingContract(cfg, id);
      setRateCard(result.rateCard);
      setRevenuePerKm(String(result.rateCard.revenuePerKm));
      setOperatingCostPerKm(String(result.rateCard.operatingCostPerKm));
      setCurrency(result.rateCard.currency);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to activate contract");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    padding: "var(--fm-space-2)",
    borderRadius: "var(--fm-radius-sm)",
    border: "1px solid var(--fm-color-border)",
    background: "var(--fm-color-surface)",
    color: "var(--fm-color-text)",
    width: "100%"
  } as const;

  return (
    <div>
      <PageHeader
        title="Finance settings"
        subtitle="Rate cards drive KPI revenue and operating cost (distance × rates). Activate a billing contract to sync rates automatically."
      />
      <FinanceMetricsCallout />

      {error ? (
        <p role="alert" style={{ color: "var(--fm-color-critical)", marginBottom: "var(--fm-space-3)" }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: "grid", gap: "var(--fm-space-4)", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <Card title="Tenant rate card (manual)">
          {loading && !rateCard ? (
            <p style={{ color: "var(--fm-color-text-muted)" }}>Loading…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--fm-space-3)" }}>
              {rateCard?.sourceContractId ? (
                <p style={{ fontSize: "0.85rem", color: "var(--fm-color-text-muted)", margin: 0 }}>
                  Synced from contract <code>{rateCard.sourceContractId}</code>. Saving below clears the link and overrides rates.
                </p>
              ) : null}
              <label>
                Revenue per km
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={revenuePerKm}
                  onChange={(e) => setRevenuePerKm(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label>
                Operating cost per km
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={operatingCostPerKm}
                  onChange={(e) => setOperatingCostPerKm(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label>
                Currency
                <input
                  type="text"
                  maxLength={3}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  style={inputStyle}
                />
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveRateCard()}
                style={{
                  padding: "var(--fm-space-2) var(--fm-space-4)",
                  borderRadius: "var(--fm-radius-sm)",
                  border: "none",
                  background: "var(--fm-color-accent)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: saving ? "wait" : "pointer"
                }}
              >
                Save rate card
              </button>
            </div>
          )}
        </Card>

        <Card title="Add billing contract">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--fm-space-3)" }}>
            <label>
              Name
              <input value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} placeholder="Municipal sweeper Q2" />
            </label>
            <label>
              External job ID (optional)
              <input value={newJobId} onChange={(e) => setNewJobId(e.target.value)} style={inputStyle} placeholder="JOB-SWEEP-01" />
            </label>
            <label>
              Revenue per km
              <input type="number" step="0.01" value={newRevenue} onChange={(e) => setNewRevenue(e.target.value)} style={inputStyle} />
            </label>
            <label>
              Operating cost per km
              <input type="number" step="0.01" value={newCost} onChange={(e) => setNewCost(e.target.value)} style={inputStyle} />
            </label>
            <label>
              Notes
              <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} style={inputStyle} />
            </label>
            <button
              type="button"
              disabled={saving || !newName.trim()}
              onClick={() => void addContract()}
              style={{
                padding: "var(--fm-space-2) var(--fm-space-4)",
                borderRadius: "var(--fm-radius-sm)",
                border: "1px solid var(--fm-color-border)",
                background: "var(--fm-color-surface-elevated)",
                fontWeight: 600,
                cursor: saving ? "wait" : "pointer"
              }}
            >
              Add contract
            </button>
          </div>
        </Card>
      </div>

      <section style={{ marginTop: "var(--fm-space-5)" }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 var(--fm-space-3)", color: "var(--fm-color-text-muted)" }}>Contracts</h2>
        {contracts.length === 0 && !loading ? (
          <p style={{ color: "var(--fm-color-text-muted)" }}>No contracts yet. Add one above or run database seed.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--fm-space-3)" }}>
            {contracts.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: "var(--fm-space-3) var(--fm-space-4)",
                  border: "1px solid var(--fm-color-border)",
                  borderRadius: "var(--fm-radius-sm)",
                  background: c.isActive ? "var(--fm-color-accent-muted)" : "var(--fm-color-surface)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--fm-space-3)" }}>
                  <div>
                    <strong>{c.name}</strong>
                    {c.isActive ? (
                      <span style={{ marginLeft: "var(--fm-space-2)", fontSize: "0.75rem", fontWeight: 700 }}>ACTIVE</span>
                    ) : null}
                    {c.externalJobId ? (
                      <div style={{ fontSize: "0.85rem", color: "var(--fm-color-text-muted)" }}>Job: {c.externalJobId}</div>
                    ) : null}
                    <div style={{ fontSize: "0.85rem", marginTop: "var(--fm-space-1)" }}>
                      {c.revenuePerKm} rev/km · {c.operatingCostPerKm} cost/km · {c.currency}
                    </div>
                    {c.notes ? (
                      <div style={{ fontSize: "0.8rem", color: "var(--fm-color-text-muted)", marginTop: "var(--fm-space-1)" }}>{c.notes}</div>
                    ) : null}
                  </div>
                  {!c.isActive ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void onActivate(c.id)}
                      style={{
                        padding: "var(--fm-space-2) var(--fm-space-3)",
                        borderRadius: "var(--fm-radius-sm)",
                        border: "none",
                        background: "var(--fm-color-accent)",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: saving ? "wait" : "pointer",
                        whiteSpace: "nowrap"
                      }}
                    >
                      Activate
                    </button>
                  ) : activeContractId === c.id ? (
                    <span style={{ fontSize: "0.85rem", color: "var(--fm-color-text-muted)" }}>Drives rate card</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
