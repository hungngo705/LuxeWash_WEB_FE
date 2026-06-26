import { useCallback, useEffect, useMemo, useState } from "react";
import StaffBookingDetailModal from "../components/dashboard/StaffBookingDetailModal";
import {
  ApiError,
  enrichStaffBooking,
  fetchStaffLaneAssignment,
  fetchStaffTasks,
  formatPaymentMethodLabel,
  formatStaffStationLabel,
  normalizeStaffTask,
  searchBookingsByLicensePlate,
  staffCheckinBooking,
  updateStaffBookingStatus,
} from "../api";
import { formatDateTime, formatVnd } from "../utils/format";

const CAMERA_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuClp7ADyI2iBVUMA7EIoPJsEAYC2R4QW-wLfbu4V-aXdn2Mz-TQbaCcFYwtlZAX9KsIFU7XGtg5P5AR6HmgOL12_CBKkQdCh9I-BO7ZutWni9cVeBvi07Qicp7uFO9EVhZ3lpQueRoPAmxh8p_bGfItEe3Q60cAdRRZDEUlgQ93Hj6MZEy9-MlXay4Ab63PaE6vJ6tQIlxr64EslF4K7_d4wmwqOG_XztDYgbI4RSQGLu2p4iTRecovl8-Wcs-iPQ7biJH3ov3inmPr";

function normalizePlate(plate) {
  return String(plate ?? "")
    .toUpperCase()
    .replace(/\s/g, "")
    .replace(/\./g, "");
}

/** @param {import('../api/operationStaff.api').StaffTask[]} list @param {import('../api/operationStaff.api').StaffTask} booking */
function upsertStaffTaskList(list, booking) {
  const id = Number(booking.bookingId);
  if (!id) return list;
  const idx = list.findIndex((t) => Number(t.bookingId) === id);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = { ...next[idx], ...booking };
    return next;
  }
  return [...list, booking];
}

/** Giữ xe Processing tra cứu local nếu poll tasks chưa trả về. */
function mergeStaffTasksFromApi(prev, fromApi) {
  const apiList = Array.isArray(fromApi) ? fromApi : [];
  const localProcessing = prev.filter(
    (b) =>
      b.status === "Processing" &&
      !apiList.some((a) => Number(a.bookingId) === Number(b.bookingId)),
  );
  let merged = [...apiList];
  for (const local of localProcessing) {
    merged = upsertStaffTaskList(merged, local);
  }
  return merged;
}

const ACTIVE_PLATE_STATUSES = new Set(["Processing", "Checked-in", "Pending"]);
const PLATE_STATUS_PRIORITY = { Processing: 0, "Checked-in": 1, Pending: 2 };

/** @param {import('../api/operationStaff.api').StaffTask[]} list @param {string} normalized */
function pickBestPlateBooking(list, normalized) {
  const samePlate = list.filter(
    (b) => normalizePlate(b.licensePlate) === normalized,
  );
  if (!samePlate.length) return null;

  const active = samePlate.filter((b) => ACTIVE_PLATE_STATUSES.has(b.status));
  const pool = active.length ? active : samePlate;

  return [...pool].sort((a, b) => {
    const diff =
      (PLATE_STATUS_PRIORITY[a.status] ?? 9) -
      (PLATE_STATUS_PRIORITY[b.status] ?? 9);
    if (diff !== 0) return diff;
    return (
      new Date(b.scheduledTime ?? 0).getTime() -
      new Date(a.scheduledTime ?? 0).getTime()
    );
  })[0];
}

function plateLookupMessage(status) {
  if (status === "Pending") return "";
  if (status === "Processing") return "";
  if (status !== "Checked-in") {
    return "Xe chưa check-in vào làn của bạn.";
  }
  return "";
}

function StatusBadge({ status }) {
  const styles = {
    Pending:
      "border-tertiary-container/40 bg-tertiary-container/15 text-tertiary-container",
    "Checked-in":
      "border-primary-container/40 bg-primary-container/15 text-primary-container",
    Processing:
      "border-secondary-container/40 bg-secondary-container/15 text-secondary-container",
    Completed:
      "border-outline-variant bg-surface-variant text-on-surface-variant",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${styles[status] ?? styles.Pending}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function RankBadge({ rankName, rankId }) {
  const label = String(rankName ?? "—");
  const isVip =
    label.includes("VIP") ||
    label.includes("PLATINUM") ||
    (rankId != null && rankId >= 4);
  return (
    <span
      className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${
        isVip
          ? "border-primary-container/30 bg-primary-container/10 text-primary-container"
          : "border-outline-variant bg-surface-variant text-on-surface-variant"
      }`}
    >
      {label}
    </span>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const isError = type === "error";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-3 shadow-xl ${
        isError
          ? "border-error-container/50 bg-error-container/20 text-error"
          : "border-primary-container/50 bg-primary-container/20 text-primary-container"
      }`}
    >
      <span className="material-symbols-outlined text-xl">
        {isError ? "error" : "check_circle"}
      </span>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

function LoadingSpinner({ label = "Đang xử lý…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
      <span className="text-sm text-on-surface-variant">{label}</span>
    </div>
  );
}

function PlateLookupPanel({
  plateInput,
  onPlateChange,
  onSearch,
  loading,
  checkedInCount,
  processingCount,
}) {
  return (
    <section className="glass-panel soft-shadow flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">search</span>
          <h3 className="font-sora text-xl font-semibold text-on-surface">
            Tra cứu biển số
          </h3>
        </div>
        <span className="rounded bg-surface-variant px-2 py-1 text-xs font-semibold text-on-surface-variant">
          {checkedInCount} chờ · {processingCount} rửa
        </span>
      </div>
      <div className="flex-1 space-y-4 p-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
            Nhập biển số xe
          </label>
          <div className="flex gap-2">
            <input
              className="h-12 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-base font-medium tracking-wider text-on-surface uppercase placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="VD: 30A12322"
              value={plateInput}
              onChange={(e) => onPlateChange(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />
            <button
              type="button"
              className="h-12 shrink-0 rounded-xl bg-primary px-5 text-sm font-semibold tracking-wide text-on-primary uppercase shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
              onClick={onSearch}
              disabled={loading || !plateInput.trim()}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border border-on-primary/30 border-t-on-primary" />
                </span>
              ) : (
                "Tra cứu"
              )}
            </button>
          </div>
        </div>
        <div
          className="relative overflow-hidden rounded-xl bg-black"
          style={{ minHeight: "140px" }}
        >
          <img
            alt=""
            className="h-full w-full object-cover opacity-50"
            src={CAMERA_IMAGE}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-4xl text-primary-container opacity-70">
              videocam_off
            </span>
            <span className="text-xs text-primary-container opacity-70">
              Camera AI chưa triển khai
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckedInQueuePanel({ items, selectedBookingId, onSelect }) {
  return (
    <section className="glass-panel soft-shadow mt-4 flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">
            format_list_numbered
          </span>
          <h3 className="font-sora text-lg font-semibold text-on-surface">
            Đã check-in — chờ rửa
          </h3>
        </div>
        <span className="rounded bg-primary-container/15 px-2 py-1 text-xs font-semibold text-primary-container">
          {items.length} xe
        </span>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-on-surface-variant">
            Chưa có xe check-in tại làn của bạn.
          </p>
        ) : (
          items.map((item) => {
            const selected = item.bookingId === selectedBookingId;
            return (
              <button
                key={item.bookingId}
                type="button"
                onClick={() => onSelect(item)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  selected
                    ? "border-primary-container bg-primary-container/10 shadow-sm"
                    : "border-outline-variant bg-surface-container-low hover:border-primary-container/30"
                }`}
              >
                <span className="material-symbols-outlined text-2xl text-primary-container">
                  directions_car
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sora text-lg font-bold tracking-wide text-on-surface">
                      {item.licensePlate}
                    </span>
                    <RankBadge rankName={item.rankName} rankId={item.rankId} />
                  </div>
                  <p className="truncate text-sm text-on-surface">
                    {item.customerName}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {item.serviceName} · {item.slotLabel}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function CustomerInfoPanel({
  booking,
  loading,
  error,
  onStartProcessing,
  onCheckin,
  onSkip,
  onViewDetail,
  confirming,
  checkingIn,
}) {
  if (loading) return <LoadingSpinner label="Đang tra cứu lịch hẹn…" />;
  if (error && !booking) {
    return (
      <section className="glass-panel soft-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <span className="material-symbols-outlined text-4xl text-error">
            error
          </span>
          <p className="text-sm text-error">{error}</p>
        </div>
      </section>
    );
  }
  if (!booking) {
    return (
      <section className="glass-panel soft-shadow flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant bg-surface-container-low p-4">
          <h3 className="font-sora text-xl font-semibold text-on-surface">
            Thông tin khách hàng
          </h3>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
          <span className="material-symbols-outlined text-5xl text-outline">
            info
          </span>
          <p className="text-center text-sm text-on-surface-variant">
            Chọn xe trong hàng chờ hoặc tra cứu biển số để xem thông tin
          </p>
        </div>
      </section>
    );
  }

  const canStart = booking.status === "Checked-in";
  const isProcessing = booking.status === "Processing";

  const safeText = (v, fallback = "—") =>
    v == null || v === "" ? fallback : v;

  return (
    <section className="glass-panel soft-shadow flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="border-b border-outline-variant bg-surface-container-low p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-sora text-xl font-semibold text-on-surface">
            Thông tin khách hàng
          </h3>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-surface-variant"
            onClick={() => onViewDetail(booking)}
          >
            <span className="material-symbols-outlined text-[16px]">
              visibility
            </span>
            Xem chi tiết
          </button>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-4">
        {error && (
          <div className="rounded-lg border border-tertiary-container/40 bg-tertiary-container/10 px-3 py-2 text-xs text-tertiary-container">
            {error}
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-sora text-2xl font-semibold text-on-surface">
              {safeText(booking.customerName, "Khách lẻ")}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">
                call
              </span>
              {safeText(booking.phoneMasked, "Chưa có SĐT")}
            </p>
          </div>
          <RankBadge rankName={booking.rankName} rankId={booking.rankId} />
        </div>

        <div className="flex items-center justify-between">
          <StatusBadge status={booking.status} />
          <span className="text-xs font-medium text-on-surface-variant">
            #{booking.bookingId}
          </span>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              directions_car
            </span>
            <span className="font-sora text-2xl font-bold tracking-widest text-on-surface">
              {safeText(booking.licensePlate, "—")}
            </span>
          </div>
          <div className="space-y-1 text-sm text-on-surface">
            <p>
              <span className="font-semibold text-on-surface">
                {safeText(booking.serviceName, "Chưa rõ dịch vụ")}
              </span>
              {booking.vehicleDisplayName &&
                booking.vehicleDisplayName !== "—" &&
                ` · ${booking.vehicleDisplayName}`}
            </p>
            <p className="text-on-surface-variant">
              <span className="material-symbols-outlined mr-1 align-middle text-[14px]">
                schedule
              </span>
              {safeText(booking.slotLabel, "")}
              {booking.slotLabel && booking.scheduledTime ? " — " : ""}
              {booking.scheduledTime
                ? formatDateTime(booking.scheduledTime)
                : ""}
            </p>
            {booking.processingLaneName && (
              <p className="text-on-surface-variant">
                <span className="material-symbols-outlined mr-1 align-middle text-[14px]">
                  garage
                </span>
                Làn: {safeText(booking.processingLaneName)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
            <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Thanh toán
            </p>
            <p className="font-sora text-base font-semibold text-on-surface">
              {booking.finalAmount != null
                ? formatVnd(booking.finalAmount)
                : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
            <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Hình thức
            </p>
            <p className="text-sm font-medium text-on-surface">
              {safeText(
                formatPaymentMethodLabel(booking.paymentMethod),
                "Chưa chọn",
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          {canStart && (
            <button
              type="button"
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold tracking-wide text-on-primary uppercase shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
              onClick={onStartProcessing}
              disabled={confirming}
            >
              {confirming ? "Đang xử lý…" : "Bắt đầu rửa"}
            </button>
          )}
          {isProcessing && (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-secondary-container/40 bg-secondary-container/10 px-4 py-3 text-sm font-medium text-secondary-container">
              Xe đang rửa — hoàn thành ở cột bên phải
            </div>
          )}
          {booking.status === "Pending" && !isProcessing ? (
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold tracking-wide text-on-primary uppercase shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
              onClick={onCheckin}
              disabled={confirming}
            >
              {checkingIn ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border border-on-primary/30 border-t-on-primary" />
                  Đang check-in…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">
                    login
                  </span>
                  Check-in ngay
                </>
              )}
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-xl border border-outline bg-transparent px-4 py-3 text-sm font-medium tracking-wide text-on-surface uppercase transition-colors hover:bg-surface-variant"
            onClick={onSkip}
            disabled={confirming}
          >
            Bỏ qua
          </button>
        </div>
      </div>
    </section>
  );
}

function ProcessingVehiclesPanel({
  vehicles,
  onComplete,
  onSelect,
  completingId,
}) {
  return (
    <section className="glass-panel soft-shadow flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">wash</span>
          <h3 className="font-sora text-xl font-semibold text-on-surface">
            Đang rửa
          </h3>
        </div>
        <span className="rounded bg-secondary-container/20 px-2 py-1 text-xs font-semibold text-secondary-container">
          {vehicles.length} xe
        </span>
      </div>
      {vehicles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
          <span className="material-symbols-outlined text-5xl text-outline">
            water_drop
          </span>
          <p className="text-center text-sm text-on-surface-variant">
            Chưa có xe đang rửa
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {vehicles.map((v) => (
            <div
              key={v.bookingId}
              className="group relative overflow-hidden rounded-xl border border-secondary-container/25 bg-surface-container-low p-4 transition-all hover:border-secondary-container/50"
            >
              <button
                type="button"
                className="mb-3 w-full text-left"
                onClick={() => onSelect(v)}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-sora text-xl font-bold tracking-wide text-secondary-container">
                    {v.licensePlate}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-secondary-container/15 px-2 py-0.5 text-[10px] font-semibold text-secondary-container uppercase">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary-container" />
                    Processing
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-on-surface">
                    {v.customerName}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {v.serviceName}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {formatPaymentMethodLabel(v.paymentMethod)} ·{" "}
                    {formatVnd(v.finalAmount)}
                  </p>
                </div>
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-primary-container bg-primary-container/10 px-3 py-2 text-center text-xs font-semibold tracking-wide text-primary-container uppercase transition-colors hover:bg-primary-container/25 disabled:opacity-50"
                onClick={() => onComplete(v.bookingId)}
                disabled={completingId === v.bookingId}
              >
                {completingId === v.bookingId ? "Đang xử lý…" : "Hoàn thành"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const [staffTasks, setStaffTasks] = useState([]);
  const [plateInput, setPlateInput] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailBooking, setDetailBooking] = useState(null);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [laneLabel, setLaneLabel] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const loadStaffTasks = useCallback(async ({ signal } = {}) => {
    try {
      const data = await fetchStaffTasks({ signal })
      if (signal?.aborted) return
      setStaffTasks((prev) => mergeStaffTasksFromApi(prev, data))
    } catch (err) {
      if (err?.name === 'AbortError' || err?.name === 'CanceledError') return
      console.warn('Failed to load staff tasks:', err)
    } finally {
      if (!signal?.aborted) setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadStaffTasks({ signal: controller.signal })
    fetchStaffLaneAssignment({ signal: controller.signal })
      .then((a) => {
        if (!controller.signal.aborted) {
          setLaneLabel(formatStaffStationLabel(a))
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || err?.name === 'CanceledError') return
        if (!controller.signal.aborted) setLaneLabel('Chưa phân công làn')
      })

    const interval = setInterval(() => {
      loadStaffTasks({ signal: controller.signal })
    }, 30_000)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [loadStaffTasks])

  const checkedInQueue = useMemo(
    () => staffTasks.filter((b) => b.status === "Checked-in"),
    [staffTasks],
  );

  const processingVehicles = useMemo(() => {
    const fromTasks = staffTasks.filter((b) => b.status === "Processing");
    if (
      selectedBooking?.status === "Processing" &&
      !fromTasks.some(
        (t) => Number(t.bookingId) === Number(selectedBooking.bookingId),
      )
    ) {
      return [...fromTasks, selectedBooking];
    }
    return fromTasks.map((task) => {
      if (
        selectedBooking?.status === "Processing" &&
        Number(task.bookingId) === Number(selectedBooking.bookingId)
      ) {
        return { ...task, ...selectedBooking };
      }
      return task;
    });
  }, [staffTasks, selectedBooking]);

  const applySelectedBooking = useCallback(async (booking, options = {}) => {
    setSelectedBooking(booking);
    if (options.message !== undefined) setLookupError(options.message);

    try {
      const enriched = await enrichStaffBooking(booking, { allowStandaloneFetch: true });
      if (
        enriched.status === "Processing" ||
        enriched.status === "Checked-in"
      ) {
        setStaffTasks((prev) => upsertStaffTaskList(prev, enriched));
      }
      setSelectedBooking(enriched);
    } catch {
      if (booking.status === "Processing" || booking.status === "Checked-in") {
        setStaffTasks((prev) => upsertStaffTaskList(prev, booking));
      }
    }
  }, []);

  const handleSearch = useCallback(async () => {
    const plate = plateInput.trim().toUpperCase();
    if (!plate) return;
    setLookupError("");
    setLoadingLookup(true);
    try {
      const normalized = normalizePlate(plate);
      const found = staffTasks.find(
        (t) => normalizePlate(t.licensePlate) === normalized,
      );
      if (found) {
        await applySelectedBooking(found);
        return;
      }

      const list = (await searchBookingsByLicensePlate(plate)).map(
        normalizeStaffTask,
      );
      const todayMatch = pickBestPlateBooking(list, normalized);
      if (todayMatch) {
        await applySelectedBooking(todayMatch, {
          message: plateLookupMessage(todayMatch.status),
        });
        return;
      }

      setSelectedBooking(null);
      setLookupError(
        "Không tìm thấy lịch hẹn cho biển số này tại làn của bạn.",
      );
    } catch {
      setLookupError("Không thể tra cứu. Vui lòng thử lại.");
      setSelectedBooking(null);
    } finally {
      setLoadingLookup(false);
    }
  }, [plateInput, staffTasks, applySelectedBooking]);

  const handleStartProcessing = useCallback(async () => {
    if (!selectedBooking || selectedBooking.status !== "Checked-in") return;
    setConfirming(true);
    try {
      await updateStaffBookingStatus(selectedBooking.bookingId, "Processing");
      let processingBooking = { ...selectedBooking, status: "Processing" };
      try {
        processingBooking = await enrichStaffBooking(processingBooking, { allowStandaloneFetch: true });
      } catch {
        // keep local processing booking
      }
      setStaffTasks((prev) => upsertStaffTaskList(prev, processingBooking));
      setSelectedBooking(processingBooking);
      showToast(`Xe ${processingBooking.licensePlate} bắt đầu rửa.`);
      setLookupError("");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Lỗi khi bắt đầu rửa. Vui lòng thử lại.";
      showToast(msg, "error");
    } finally {
      setConfirming(false);
    }
  }, [selectedBooking]);

  const handleCheckin = useCallback(async () => {
    if (!selectedBooking || selectedBooking.status !== "Pending") return;
    setCheckingIn(true);
    try {
      await staffCheckinBooking(selectedBooking.bookingId);
      showToast(`Xe ${selectedBooking.licensePlate} đã check-in thành công.`);
      await loadStaffTasks();
      const updated = staffTasks.find(
        (t) => Number(t.bookingId) === Number(selectedBooking.bookingId),
      );
      if (updated) {
        setSelectedBooking(updated);
      } else {
        try {
          const enriched = await enrichStaffBooking(selectedBooking, { allowStandaloneFetch: true });
          setSelectedBooking(enriched);
          setStaffTasks((prev) => upsertStaffTaskList(prev, enriched));
        } catch {
          setSelectedBooking((prev) => ({ ...prev, status: "Checked-in" }));
        }
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Lỗi khi check-in. Vui lòng thử lại.";
      showToast(msg, "error");
    } finally {
      setCheckingIn(false);
    }
  }, [selectedBooking, staffTasks, loadStaffTasks]);

  const handleComplete = useCallback(
    async (bookingId) => {
      const task =
        staffTasks.find((t) => Number(t.bookingId) === Number(bookingId)) ??
        processingVehicles.find(
          (t) => Number(t.bookingId) === Number(bookingId),
        );
      setCompletingId(bookingId);
      try {
        await updateStaffBookingStatus(bookingId, "Completed");
        showToast(`Xe ${task?.licensePlate ?? bookingId} đã hoàn thành.`);
        setStaffTasks((prev) =>
          prev.filter((t) => Number(t.bookingId) !== Number(bookingId)),
        );
        if (selectedBooking?.bookingId === bookingId) {
          setSelectedBooking(null);
          setPlateInput("");
        }
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Lỗi khi hoàn thành. Vui lòng thử lại.";
        showToast(msg, "error");
      } finally {
        setCompletingId(null);
      }
    },
    [staffTasks, selectedBooking, processingVehicles],
  );

  const handleSkip = useCallback(() => {
    setSelectedBooking(null);
    setPlateInput("");
    setLookupError("");
  }, []);

  const handleSelectFromQueue = useCallback(
    async (item) => {
      setPlateInput(item.licensePlate);
      setLookupError("");
      await applySelectedBooking(item);
    },
    [applySelectedBooking],
  );

  if (initialLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner label="Đang tải dữ liệu…" />
      </div>
    );
  }

  return (
    <div className="relative">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {detailBooking && (
        <StaffBookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sora text-2xl font-semibold text-on-surface">
            Bảng điều khiển Staff
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-2 rounded-full border border-primary-container/30 bg-primary-container/10 px-3 py-1.5 text-xs text-primary-container">
            <span className="material-symbols-outlined text-[16px]">login</span>
            {checkedInQueue.length} check-in
          </span>
          <span className="flex items-center gap-2 rounded-full border border-secondary-container/30 bg-secondary-container/10 px-3 py-1.5 text-xs text-secondary-container">
            <span className="material-symbols-outlined text-[16px]">wash</span>
            {processingVehicles.length} đang rửa
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <PlateLookupPanel
            plateInput={plateInput}
            onPlateChange={setPlateInput}
            onSearch={handleSearch}
            loading={loadingLookup}
            checkedInCount={checkedInQueue.length}
            processingCount={processingVehicles.length}
          />
          <CheckedInQueuePanel
            items={checkedInQueue}
            selectedBookingId={selectedBooking?.bookingId}
            onSelect={handleSelectFromQueue}
          />
        </div>
        <div className="lg:col-span-4">
          <CustomerInfoPanel
            booking={selectedBooking}
            loading={loadingLookup}
            error={lookupError}
            onStartProcessing={handleStartProcessing}
            onCheckin={handleCheckin}
            onSkip={handleSkip}
            onViewDetail={setDetailBooking}
            confirming={confirming}
            checkingIn={checkingIn}
          />
        </div>
        <div className="lg:col-span-4">
          <ProcessingVehiclesPanel
            vehicles={processingVehicles}
            onComplete={handleComplete}
            onSelect={handleSelectFromQueue}
            completingId={completingId}
          />
        </div>
      </div>
    </div>
  );
}
