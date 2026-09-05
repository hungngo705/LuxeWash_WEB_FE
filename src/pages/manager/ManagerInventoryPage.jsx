import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  adjustManagerInventoryStock,
  approveManagerExtraUsageRequest,
  discardManagerInventoryBatch,
  fetchMaterials,
  fetchManagerExpiringBatches,
  fetchManagerExtraUsageRequests,
  fetchManagerInventoryBatches,
  fetchManagerInventoryReport,
  fetchManagerInventoryStocks,
  fetchManagerInventoryTransactions,
  importManagerInventoryBatch,
  rejectManagerExtraUsageRequest,
} from "../../api";
import PageHeader from "../../components/admin/shared/PageHeader";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DataTable from "../../components/ui/DataTable";
import { useToast } from "../../components/ui/Toast";
import { formatDateTime, formatVnd } from "../../utils/format";

const tabs = [
  { id: "stocks", label: "Tồn kho", icon: "warehouse" },
  { id: "imports", label: "Nhập kho", icon: "add_box" },
  { id: "batches", label: "Lô vật tư", icon: "inventory" },
  { id: "adjustments", label: "Điều chỉnh", icon: "tune" },
  { id: "transactions", label: "Lịch sử", icon: "history" },
  { id: "extra", label: "Duyệt phát sinh", icon: "task_alt" },
  { id: "report", label: "Báo cáo", icon: "analytics" },
];

const fieldClass =
  "h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant";
const labelTextClass =
  "text-xs font-semibold uppercase tracking-wide text-on-surface-variant";
const primaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70";
const dangerButtonClass =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-error/25 px-3 text-sm font-semibold text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-40";
const subtleButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-container/20 disabled:cursor-wait disabled:opacity-50";
const checkboxClass =
  "h-4 w-4 rounded border-outline-variant accent-primary focus:ring-primary/20";
const tableHeadClass =
  "border-b border-outline-variant bg-surface-container-low text-xs font-semibold uppercase tracking-wider text-on-surface-variant";
const tableRowClass = "transition-colors hover:bg-surface-container-low/60";

function num(value) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format(
    Number(value ?? 0),
  );
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : "";
}

function todayDateOnly() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function Notice({ message, type = "success" }) {
  if (!message) return null;
  const isError = type === "error";
  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
        isError
          ? "border-error-container bg-error-container/25 text-error"
          : "border-primary/25 bg-primary-container/15 text-primary"
      }`}
    >
      <span className="material-symbols-outlined mt-0.5 text-[18px]">
        {isError ? "error" : "check_circle"}
      </span>
      <span className="font-medium">{message}</span>
    </div>
  );
}

function Panel({ children, className = "" }) {
  return (
    <div
      className={`glass-panel soft-shadow overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest ${className}`}
    >
      {children}
    </div>
  );
}

function EmptyState({ title, description, icon = "inventory_2" }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container/15 text-primary">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </span>
      <p className="mt-4 font-sora font-semibold text-on-surface">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm leading-6 text-on-surface-variant">
          {description}
        </p>
      )}
    </div>
  );
}

function TableEmpty({ colSpan, title, description, icon }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <EmptyState title={title} description={description} icon={icon} />
      </td>
    </tr>
  );
}

function LoadingState({ label = "Đang tải dữ liệu..." }) {
  return (
    <Panel>
      <div className="flex items-center justify-center gap-3 px-6 py-12 text-sm font-medium text-on-surface-variant">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary" />
        {label}
      </div>
    </Panel>
  );
}

function TabBar({ items, activeTab, onChange }) {
  return (
    <Panel className="mb-5">
      <div className="flex gap-2 overflow-x-auto p-2">
        {items.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
                active
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
              }`}
              onClick={() => onChange(tab.id)}
            >
              <span
                className={`material-symbols-outlined text-[18px] ${active ? "filled" : ""}`}
              >
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function MetricCard({ label, value, icon }) {
  return (
    <Panel>
      <div className="flex items-center gap-4 px-4 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/15 text-primary">
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {label}
          </p>
          <p className="mt-1 truncate font-sora text-xl font-semibold text-on-surface">
            {value}
          </p>
        </div>
      </div>
    </Panel>
  );
}

export default function ManagerInventoryPage() {
  const [activeTab, setActiveTab] = useState("stocks");
  const [stocks, setStocks] = useState([]);
  const [batches, setBatches] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [extraRequests, setExtraRequests] = useState([]);
  const [report, setReport] = useState(null);
  const [filters, setFilters] = useState({
    materialId: "",
    includeDepleted: false,
    txType: "",
    from: "",
    to: "",
    extraStatus: "Pending",
  });
  const [importForm, setImportForm] = useState({
    materialId: "",
    batchCode: "",
    quantity: "",
    unitCost: "",
    manufactureDate: "",
    expiryDate: "",
    supplierName: "",
  });
  const [adjustForm, setAdjustForm] = useState({
    materialId: "",
    materialBatchId: "",
    quantityChange: "",
    reason: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();
  const [savingImport, setSavingImport] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [discardingBatchId, setDiscardingBatchId] = useState(null);
  const [reviewingRequestId, setReviewingRequestId] = useState(null);

  const materialOptions = useMemo(() => {
    const map = new Map();
    materials.forEach((m) =>
      map.set(Number(m.materialId), {
        id: Number(m.materialId),
        name: m.name,
        unit: m.unit,
      }),
    );
    stocks.forEach((s) =>
      map.set(Number(s.materialId), {
        id: Number(s.materialId),
        name: s.materialName,
        unit: s.unit,
      }),
    );
    batches.forEach((b) => {
      if (!map.has(Number(b.materialId)))
        map.set(Number(b.materialId), {
          id: Number(b.materialId),
          name: b.materialName,
          unit: "",
        });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [materials, stocks, batches]);

  const selectedImportMaterial = useMemo(
    () =>
      materialOptions.find(
        (material) => Number(material.id) === Number(importForm.materialId),
      ),
    [importForm.materialId, materialOptions],
  );

  const selectedAdjustMaterial = useMemo(
    () =>
      materialOptions.find(
        (material) => Number(material.id) === Number(adjustForm.materialId),
      ),
    [adjustForm.materialId, materialOptions],
  );

  const importTotalCost =
    Number(importForm.quantity || 0) * Number(importForm.unitCost || 0);

  const canSaveImport = Boolean(
    importForm.materialId &&
    importForm.batchCode.trim() &&
    Number(importForm.quantity) > 0 &&
    Number(importForm.unitCost) >= 0,
  );

  const canSaveAdjustment = Boolean(
    adjustForm.materialId &&
    Number(adjustForm.quantityChange) !== 0 &&
    adjustForm.reason.trim(),
  );

  const loadBase = useCallback(async () => {
    const [materialData, stockData, batchData] = await Promise.all([
      fetchMaterials(),
      fetchManagerInventoryStocks(),
      fetchManagerInventoryBatches({ includeDepleted: true }),
    ]);
    setMaterials(Array.isArray(materialData) ? materialData : []);
    setStocks(Array.isArray(stockData) ? stockData : []);
    setBatches(Array.isArray(batchData) ? batchData : []);
  }, []);

  const loadActive = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await loadBase();
      if (activeTab === "batches") {
        const [batchData, expiringData] = await Promise.all([
          fetchManagerInventoryBatches({
            materialId: filters.materialId || undefined,
            includeDepleted: filters.includeDepleted,
          }),
          fetchManagerExpiringBatches(),
        ]);
        setBatches(Array.isArray(batchData) ? batchData : []);
        setExpiring(Array.isArray(expiringData) ? expiringData : []);
      } else if (activeTab === "transactions") {
        setTransactions(
          await fetchManagerInventoryTransactions({
            materialId: filters.materialId || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
            type: filters.txType || undefined,
          }),
        );
      } else if (activeTab === "extra") {
        setExtraRequests(
          await fetchManagerExtraUsageRequests(
            filters.extraStatus || undefined,
          ),
        );
      } else if (activeTab === "report") {
        setReport(
          await fetchManagerInventoryReport({
            from: filters.from || undefined,
            to: filters.to || undefined,
          }),
        );
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Không tải được dữ liệu kho.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    filters.extraStatus,
    filters.from,
    filters.includeDepleted,
    filters.materialId,
    filters.to,
    filters.txType,
    loadBase,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load page data when filters/tab change
    loadActive();
  }, [loadActive]);

  const saveImport = async () => {
    if (savingImport || !canSaveImport) return;
    try {
      if (importForm.expiryDate && importForm.expiryDate <= todayDateOnly()) {
        setError("Hạn sử dụng phải sau ngày hôm nay.");
        return;
      }
      if (
        importForm.manufactureDate &&
        importForm.expiryDate &&
        importForm.manufactureDate > importForm.expiryDate
      ) {
        setError("Ngày sản xuất không được sau hạn sử dụng.");
        return;
      }
      setSavingImport(true);
      await importManagerInventoryBatch({
        materialId: Number(importForm.materialId),
        batchCode: importForm.batchCode.trim(),
        quantity: Number(importForm.quantity),
        unitCost: Number(importForm.unitCost),
        manufactureDate: importForm.manufactureDate || null,
        expiryDate: importForm.expiryDate || null,
        supplierName: importForm.supplierName.trim() || null,
      });
      setImportForm({
        materialId: "",
        batchCode: "",
        quantity: "",
        unitCost: "",
        manufactureDate: "",
        expiryDate: "",
        supplierName: "",
      });
      toast.success("Đã nhập batch vào kho.");
      await loadActive();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Không nhập được batch.",
      );
    } finally {
      setSavingImport(false);
    }
  };

  const saveAdjustment = async () => {
    if (savingAdjustment || !canSaveAdjustment) return;
    setSavingAdjustment(true);
    try {
      await adjustManagerInventoryStock({
        materialId: Number(adjustForm.materialId),
        materialBatchId: adjustForm.materialBatchId
          ? Number(adjustForm.materialBatchId)
          : null,
        quantityChange: Number(adjustForm.quantityChange),
        reason: adjustForm.reason.trim(),
      });
      setAdjustForm({
        materialId: "",
        materialBatchId: "",
        quantityChange: "",
        reason: "",
      });
      toast.success("Đã điều chỉnh tồn kho.");
      await loadActive();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Không điều chỉnh được tồn kho.",
      );
    } finally {
      setSavingAdjustment(false);
    }
  };

  const discardBatch = async (batch) => {
    if (discardingBatchId) return;
    const reason = window.prompt(
      `Lý do hủy batch ${batch.batchCode}?`,
      "Hết hạn/không còn sử dụng",
    );
    if (reason == null) return;
    setDiscardingBatchId(batch.materialBatchId);
    try {
      await discardManagerInventoryBatch(batch.materialBatchId, { reason });
      toast.success("Đã hủy batch.");
      await loadActive();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không hủy được batch.");
    } finally {
      setDiscardingBatchId(null);
    }
  };

  const reviewExtra = async (request, action) => {
    if (reviewingRequestId) return;
    const managerNote = window.prompt(
      `${action === "approve" ? "Duyệt" : "Từ chối"} request #${request.requestId}`,
      "",
    );
    if (managerNote == null) return;
    setReviewingRequestId(request.requestId);
    try {
      if (action === "approve") {
        await approveManagerExtraUsageRequest(request.requestId, {
          managerNote,
        });
      } else {
        await rejectManagerExtraUsageRequest(request.requestId, {
          managerNote,
        });
      }
      toast.success("Đã xử lý request phát sinh.");
      await loadActive();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Không xử lý được request.",
      );
    } finally {
      setReviewingRequestId(null);
    }
  };

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Kho vật tư"
        title="Kho chi nhánh"
        description="Nhập kho, theo dõi lô vật tư, điều chỉnh tồn và duyệt vật tư phát sinh"
        actionIcon="inventory_2"
      />
      <Notice message={error} type="error" />

      <TabBar items={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {(activeTab === "batches" ||
        activeTab === "transactions" ||
        activeTab === "report" ||
        activeTab === "extra") && (
        <Panel className="mb-4">
          <div className="flex flex-wrap items-end gap-3 p-4">
            {(activeTab === "batches" || activeTab === "transactions") && (
              <label className="block min-w-56 flex-1 space-y-1 md:flex-none">
                <span className={labelTextClass}>Vật tư</span>
                <select
                  className={fieldClass}
                  value={filters.materialId}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, materialId: e.target.value }))
                  }
                >
                  <option value="">Tất cả vật tư</option>
                  {materialOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {activeTab === "batches" && (
              <label className="flex h-11 items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm font-medium text-on-surface">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={filters.includeDepleted}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      includeDepleted: e.target.checked,
                    }))
                  }
                />
                Hiện batch đã hết hoặc đã hủy
              </label>
            )}
            {activeTab === "transactions" && (
              <>
                <label className="block min-w-48 space-y-1">
                  <span className={labelTextClass}>Loại giao dịch</span>
                  <select
                    className={fieldClass}
                    value={filters.txType}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, txType: e.target.value }))
                    }
                  >
                    <option value="">Tất cả loại</option>
                    {[
                      "BranchImport",
                      "Usage",
                      "ExtraUsage",
                      "Discard",
                      "Adjustment",
                    ].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-44 space-y-1">
                  <span className={labelTextClass}>Từ ngày</span>
                  <input
                    type="date"
                    className={fieldClass}
                    value={filters.from}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, from: e.target.value }))
                    }
                  />
                </label>
                <label className="block min-w-44 space-y-1">
                  <span className={labelTextClass}>Đến ngày</span>
                  <input
                    type="date"
                    className={fieldClass}
                    value={filters.to}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, to: e.target.value }))
                    }
                  />
                </label>
              </>
            )}
            {activeTab === "report" && (
              <>
                <label className="block min-w-44 space-y-1">
                  <span className={labelTextClass}>Từ ngày</span>
                  <input
                    type="date"
                    className={fieldClass}
                    value={filters.from}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, from: e.target.value }))
                    }
                  />
                </label>
                <label className="block min-w-44 space-y-1">
                  <span className={labelTextClass}>Đến ngày</span>
                  <input
                    type="date"
                    className={fieldClass}
                    value={filters.to}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, to: e.target.value }))
                    }
                  />
                </label>
              </>
            )}
            {activeTab === "extra" && (
              <label className="block min-w-48 space-y-1">
                <span className={labelTextClass}>Trạng thái</span>
                <select
                  className={fieldClass}
                  value={filters.extraStatus}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, extraStatus: e.target.value }))
                  }
                >
                  <option value="">Tất cả</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </label>
            )}
            <button
              type="button"
              className={primaryButtonClass}
              disabled={loading}
              onClick={loadActive}
            >
              <span className="material-symbols-outlined text-[18px]">
                refresh
              </span>
              {loading ? "Đang tải..." : "Tải lại"}
            </button>
          </div>
        </Panel>
      )}

      {loading ? (
        <LoadingState label="Đang tải dữ liệu kho..." />
      ) : (
        <>
          {activeTab === "stocks" && (
            <div className="grid gap-4 lg:grid-cols-3">
              {stocks.map((s) => (
                <Panel key={`${s.warehouseId}-${s.materialId}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/15 text-primary">
                          <span className="material-symbols-outlined text-[22px]">
                            inventory_2
                          </span>
                        </div>
                        <p className="truncate font-sora text-lg font-semibold text-on-surface">
                          {s.materialName}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {s.warehouseName}
                        </p>
                      </div>
                      {s.isLowStock ? (
                        <StatusBadge status="Low stock" />
                      ) : (
                        <StatusBadge status="OK" />
                      )}
                    </div>
                    <p className="mt-5 font-sora text-3xl font-semibold text-primary">
                      {num(s.currentQuantity)}{" "}
                      <span className="text-sm font-medium text-on-surface-variant">
                        {s.unit}
                      </span>
                    </p>
                    <div className="mt-3 rounded-xl bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                      Tối thiểu: {num(s.minStockLevel)} · Cập nhật{" "}
                      {formatDateTime(s.updatedAt)}
                    </div>
                  </div>
                </Panel>
              ))}
              {stocks.length === 0 && (
                <div className="lg:col-span-3">
                  <Panel>
                    <EmptyState
                      title="Chưa có tồn kho"
                      description="Nhập batch đầu tiên để bắt đầu theo dõi vật tư tại chi nhánh."
                    />
                  </Panel>
                </div>
              )}
            </div>
          )}

          {activeTab === "imports" && (
            <Panel>
              <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3">
                <p className="font-sora text-base font-semibold text-on-surface">
                  Nhập lô vật tư
                </p>
                <p className="text-xs text-on-surface-variant">
                  Ghi nhận batch mới, giá vốn và hạn sử dụng để hệ thống theo
                  dõi FIFO.
                </p>
              </div>
              <form
                className="grid gap-4 p-4 md:grid-cols-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveImport();
                }}
              >
                <label className="block space-y-1">
                  <span className={labelTextClass}>Vật tư</span>
                  <select
                    required
                    className={fieldClass}
                    value={importForm.materialId}
                    onChange={(e) =>
                      setImportForm((f) => ({
                        ...f,
                        materialId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Chọn vật tư</option>
                    {materialOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.unit ? `(${m.unit})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className={labelTextClass}>Mã batch</span>
                  <input
                    required
                    className={fieldClass}
                    value={importForm.batchCode}
                    onChange={(e) =>
                      setImportForm((f) => ({
                        ...f,
                        batchCode: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelTextClass}>Số lượng</span>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    required
                    className={fieldClass}
                    value={importForm.quantity}
                    onChange={(e) =>
                      setImportForm((f) => ({ ...f, quantity: e.target.value }))
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelTextClass}>Giá vốn / đơn vị</span>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    required
                    className={fieldClass}
                    value={importForm.unitCost}
                    onChange={(e) =>
                      setImportForm((f) => ({ ...f, unitCost: e.target.value }))
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelTextClass}>Ngày sản xuất</span>
                  <input
                    type="date"
                    className={fieldClass}
                    value={importForm.manufactureDate}
                    max={importForm.expiryDate || undefined}
                    onChange={(e) =>
                      setImportForm((f) => ({
                        ...f,
                        manufactureDate: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelTextClass}>Hạn sử dụng</span>
                  <input
                    type="date"
                    className={fieldClass}
                    value={importForm.expiryDate}
                    min={todayDateOnly()}
                    onChange={(e) =>
                      setImportForm((f) => ({
                        ...f,
                        expiryDate: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block space-y-1 md:col-span-2">
                  <span className={labelTextClass}>Nhà cung cấp</span>
                  <input
                    className={fieldClass}
                    value={importForm.supplierName}
                    onChange={(e) =>
                      setImportForm((f) => ({
                        ...f,
                        supplierName: e.target.value,
                      }))
                    }
                  />
                </label>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm">
                  <p className={labelTextClass}>Tạm tính</p>
                  <p className="mt-1 font-sora text-lg font-semibold text-on-surface">
                    {formatVnd(importTotalCost)}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {selectedImportMaterial?.unit
                      ? `Đơn vị: ${selectedImportMaterial.unit}`
                      : "Chọn vật tư để xem đơn vị"}
                  </p>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className={primaryButtonClass}
                    disabled={savingImport || !canSaveImport}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      add_box
                    </span>
                    {savingImport ? "Đang nhập..." : "Nhập kho"}
                  </button>
                </div>
              </form>
            </Panel>
          )}

          {activeTab === "batches" && (
            <div className="space-y-4">
              {expiring.length > 0 && (
                <Panel>
                  <div className="p-4">
                    <p className="mb-2 text-sm font-semibold text-error">
                      Batch sắp hết hạn
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {expiring.map((b) => (
                        <span
                          key={b.materialBatchId}
                          className="rounded-full border border-error/30 bg-error-container/20 px-3 py-1 text-xs text-error"
                        >
                          {b.batchCode} - {dateOnly(b.expiryDate)}
                        </span>
                      ))}
                    </div>
                  </div>
                </Panel>
              )}
              <Panel>
                <DataTable
                  data={batches}
                  loading={loading}
                  minWidth="960px"
                  emptyIcon="inventory"
                  emptyTitle="Chưa có batch"
                  emptyMessage="Không có lô vật tư nào khớp bộ lọc hiện tại."
                  columns={[
                    {
                      key: "batchCode",
                      label: "Batch",
                      render: (b) => (
                        <span className="font-mono font-semibold">
                          {b.batchCode}
                        </span>
                      ),
                    },
                    {
                      key: "materialName",
                      label: "Vật tư",
                      render: (b) => b.materialName,
                    },
                    {
                      key: "remainingQuantity",
                      label: "Còn lại",
                      render: (b) => (
                        <span>
                          {num(b.remainingQuantity)} / {num(b.importedQuantity)}
                        </span>
                      ),
                    },
                    {
                      key: "unitCost",
                      label: "Giá vốn",
                      render: (b) => formatVnd(b.unitCost),
                    },
                    {
                      key: "manufactureDate",
                      label: "Ngày SX",
                      render: (b) => dateOnly(b.manufactureDate) || "—",
                    },
                    {
                      key: "expiryDate",
                      label: "Hạn sử dụng",
                      render: (b) => dateOnly(b.expiryDate) || "—",
                    },
                    {
                      key: "status",
                      label: "Trạng thái",
                      render: (b) => <StatusBadge status={b.status} />,
                    },
                    {
                      key: "actions",
                      label: "Thao tác",
                      width: "160px",
                      align: "right",
                      renderActions: (b) => (
                        <button
                          type="button"
                          className={dangerButtonClass}
                          disabled={
                            Number(b.remainingQuantity) <= 0 ||
                            Boolean(discardingBatchId)
                          }
                          onClick={() => discardBatch(b)}
                        >
                          {discardingBatchId === b.materialBatchId
                            ? "Đang hủy..."
                            : "Hủy batch"}
                        </button>
                      ),
                    },
                  ]}
                />
              </Panel>
            </div>
          )}

          {activeTab === "adjustments" && (
            <Panel>
              <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3">
                <p className="font-sora text-base font-semibold text-on-surface">
                  Điều chỉnh tồn kho
                </p>
                <p className="text-xs text-on-surface-variant">
                  Tăng hoặc giảm tồn theo batch cụ thể, hoặc để hệ thống trừ
                  theo FIFO.
                </p>
              </div>
              <form
                className="grid gap-4 p-4 md:grid-cols-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveAdjustment();
                }}
              >
                <label className="block space-y-1">
                  <span className={labelTextClass}>Vật tư</span>
                  <select
                    required
                    className={fieldClass}
                    value={adjustForm.materialId}
                    onChange={(e) =>
                      setAdjustForm((f) => ({
                        ...f,
                        materialId: e.target.value,
                        materialBatchId: "",
                      }))
                    }
                  >
                    <option value="">Chọn vật tư</option>
                    {materialOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.unit ? `(${m.unit})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className={labelTextClass}>Batch</span>
                  <select
                    className={fieldClass}
                    value={adjustForm.materialBatchId}
                    onChange={(e) =>
                      setAdjustForm((f) => ({
                        ...f,
                        materialBatchId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Tự trừ FIFO</option>
                    {batches
                      .filter(
                        (b) =>
                          !adjustForm.materialId ||
                          Number(b.materialId) ===
                            Number(adjustForm.materialId),
                      )
                      .filter((b) => Number(b.remainingQuantity) > 0)
                      .map((b) => (
                        <option
                          key={b.materialBatchId}
                          value={b.materialBatchId}
                        >
                          {b.batchCode} - còn {num(b.remainingQuantity)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className={labelTextClass}>Tăng/giảm</span>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    className={fieldClass}
                    value={adjustForm.quantityChange}
                    onChange={(e) =>
                      setAdjustForm((f) => ({
                        ...f,
                        quantityChange: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelTextClass}>Lý do</span>
                  <input
                    required
                    className={fieldClass}
                    value={adjustForm.reason}
                    onChange={(e) =>
                      setAdjustForm((f) => ({ ...f, reason: e.target.value }))
                    }
                  />
                </label>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm md:col-span-4">
                  <p className={labelTextClass}>Xem trước</p>
                  <p className="mt-1 font-medium text-on-surface">
                    {selectedAdjustMaterial?.name || "Chưa chọn vật tư"}:{" "}
                    {Number(adjustForm.quantityChange || 0) > 0 ? "+" : ""}
                    {num(adjustForm.quantityChange || 0)}{" "}
                    {selectedAdjustMaterial?.unit || ""}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {adjustForm.materialBatchId
                      ? "Điều chỉnh batch đã chọn."
                      : "Nếu giảm tồn mà không chọn batch, hệ thống sẽ trừ theo FIFO."}
                  </p>
                </div>
                <div className="md:col-span-4">
                  <button
                    type="submit"
                    className={primaryButtonClass}
                    disabled={savingAdjustment || !canSaveAdjustment}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      tune
                    </span>
                    {savingAdjustment ? "Đang lưu..." : "Lưu điều chỉnh"}
                  </button>
                </div>
              </form>
            </Panel>
          )}

          {activeTab === "transactions" && (
            <Panel>
              <DataTable
                data={transactions}
                loading={loading}
                minWidth="1080px"
                emptyIcon="history"
                emptyTitle="Chưa có giao dịch kho"
                emptyMessage="Giao dịch nhập, dùng vật tư, hủy batch hoặc điều chỉnh sẽ hiển thị tại đây."
                columns={[
                  {
                    key: "createdAt",
                    label: "Thời gian",
                    render: (t) => formatDateTime(t.createdAt),
                  },
                  {
                    key: "transactionType",
                    label: "Loại",
                    render: (t) => <StatusBadge status={t.transactionType} />,
                  },
                  {
                    key: "materialName",
                    label: "Vật tư",
                    render: (t) => t.materialName,
                  },
                  {
                    key: "batchCode",
                    label: "Batch",
                    render: (t) => t.batchCode || "-",
                  },
                  {
                    key: "quantity",
                    label: "SL",
                    render: (t) => `${num(t.quantity)} ${t.unit}`,
                  },
                  {
                    key: "beforeQuantity",
                    label: "Trước/Sau",
                    render: (t) =>
                      `${num(t.beforeQuantity)} -> ${num(t.afterQuantity)}`,
                  },
                  {
                    key: "costAmount",
                    label: "Chi phí",
                    render: (t) => formatVnd(t.costAmount),
                  },
                  {
                    key: "note",
                    label: "Ghi chú",
                    render: (t) => t.note || "-",
                  },
                ]}
              />
            </Panel>
          )}

          {activeTab === "extra" && (
            <Panel>
              <DataTable
                data={extraRequests}
                loading={loading}
                minWidth="900px"
                emptyIcon="task_alt"
                emptyTitle="Không có request phát sinh"
                emptyMessage="Thử đổi bộ lọc trạng thái nếu bạn muốn xem request đã duyệt hoặc đã từ chối."
                columns={[
                  {
                    key: "requestId",
                    label: "Request",
                    width: "140px",
                    render: (r) => (
                      <>
                        <span>#{r.requestId}</span>
                        <p className="text-xs text-on-surface-variant">
                          {formatDateTime(r.createdAt)}
                        </p>
                      </>
                    ),
                  },
                  {
                    key: "bookingId",
                    label: "Booking",
                    render: (r) => `#${r.bookingId}`,
                  },
                  {
                    key: "materialName",
                    label: "Vật tư",
                    render: (r) => r.materialName,
                  },
                  {
                    key: "quantity",
                    label: "Số lượng",
                    render: (r) => `${num(r.quantity)} ${r.unit}`,
                  },
                  {
                    key: "reason",
                    label: "Lý do",
                    render: (r) => r.reason || "—",
                  },
                  {
                    key: "status",
                    label: "Trạng thái",
                    render: (r) => <StatusBadge status={r.status} />,
                  },
                  {
                    key: "actions",
                    label: "Thao tác",
                    width: "220px",
                    renderActions: (r) =>
                      r.status === "Pending" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={subtleButtonClass}
                            disabled={Boolean(reviewingRequestId)}
                            onClick={() => reviewExtra(r, "approve")}
                          >
                            {reviewingRequestId === r.requestId
                              ? "Đang xử lý..."
                              : "Duyệt"}
                          </button>
                          <button
                            type="button"
                            className={dangerButtonClass}
                            disabled={Boolean(reviewingRequestId)}
                            onClick={() => reviewExtra(r, "reject")}
                          >
                            {reviewingRequestId === r.requestId
                              ? "Đang xử lý..."
                              : "Từ chối"}
                          </button>
                        </div>
                      ) : (
                        <span>{r.managerNote || "—"}</span>
                      ),
                  },
                ]}
              />
            </Panel>
          )}

          {activeTab === "report" && report && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Doanh thu", formatVnd(report.revenue), "payments"],
                [
                  "Chi phí vật tư",
                  formatVnd(report.materialCost),
                  "inventory_2",
                ],
                ["Lợi nhuận gộp", formatVnd(report.grossProfit), "trending_up"],
                [
                  "Biên lợi nhuận gộp",
                  `${num(report.grossMargin)}%`,
                  "percent",
                ],
                [
                  "Dịch vụ hoàn thành",
                  num(report.completedBookings),
                  "task_alt",
                ],
              ].map(([label, value, icon]) => (
                <MetricCard
                  key={label}
                  label={label}
                  value={value}
                  icon={icon}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
