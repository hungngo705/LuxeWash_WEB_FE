import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LiveLprFeed from "../components/dashboard/LiveLprFeed";
import BarrierDevicePanel from "../components/dashboard/BarrierDevicePanel";
import StaffBookingDetailModal from "../components/dashboard/StaffBookingDetailModal";
import WashTelemetry, { WashDurationBadge } from "../components/shared/WashTelemetry";
import TierBadge from "../components/shared/TierBadge";
import LaneAssignmentBadge from "../components/shared/LaneAssignmentBadge";
import {
  publishLaneDisplayEvent,
  publishLaneDisplayHeartbeat,
} from "../services/laneDisplayChannel";
import {
  ApiError,
  apiRequest,
  cameraCheckInByPlate,
  cameraCheckOutByPlate,
  createWalkInBooking,
  enrichStaffBooking,
  enrichStaffTasks,
  fetchBookingPaymentStatus,
  fetchStaffLaneAssignment,
  fetchStaffLaneOccupancies,
  fetchStaffTasks,
  fetchUserById,
  fetchVehicleTypes,
  maskPhoneNumber,
  fleetWalkIn,
  formatStaffStationLabel,
  formatPaymentMethodLabel,
  fetchMaterials,
  normalizeStaffTask,
  reportStaffExtraMaterialUsage,
  smartLookupLicensePlate,
  staffCheckinBooking,
  submitVehicleVisionFeedback,
  updateStaffBookingStatus,
} from "../api";
import { formatDateTime, formatVnd } from "../utils/format";
import {
  isValidVietnameseLicensePlate,
  normalizeVietnameseLicensePlate,
} from "../utils/licensePlate";
import {
  canCheckIn,
  canStartWash,
  getLaneAssignmentState,
  getLaneDisplayName,
  hasAssignedLane,
} from "../utils/laneAssignment";
import useBarrierController from "../hooks/useBarrierController";
import {
  BARRIER_GATES,
  gateFromBarrierId,
  gateFromQueueLaneType,
  getBarrierGateLabel,
} from "../services/barrierDevice";

function normalizePlate(plate) {
  return String(plate ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

const MANUAL_COMPLETION_STORAGE_KEY = "luxewash:manual-completions";
const MANUAL_COMPLETION_TTL_MS = 10 * 60 * 1000;
const NO_FEEDBACK_REVIEW_TTL_MS = 5_000;
const DISMISSED_REVIEW_SUPPRESSION_MS = 60_000;

function getRecentManualCompletions() {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(MANUAL_COMPLETION_STORAGE_KEY) || "[]",
    );
    if (!Array.isArray(stored)) return [];
    const cutoff = Date.now() - MANUAL_COMPLETION_TTL_MS;
    return stored.filter(
      (item) =>
        normalizePlate(item?.licensePlate) &&
        Number(item?.completedAt) >= cutoff,
    );
  } catch {
    return [];
  }
}

function findRecentManualCompletion(licensePlate) {
  const normalized = normalizePlate(licensePlate);
  if (!normalized) return null;
  return (
    getRecentManualCompletions().find(
      (item) => normalizePlate(item.licensePlate) === normalized,
    ) ?? null
  );
}

function rememberManualCompletion(booking) {
  const licensePlate = normalizePlate(booking?.licensePlate);
  if (!licensePlate || typeof window === "undefined") return;
  try {
    const remaining = getRecentManualCompletions().filter(
      (item) => normalizePlate(item.licensePlate) !== licensePlate,
    );
    window.localStorage.setItem(
      MANUAL_COMPLETION_STORAGE_KEY,
      JSON.stringify([
        {
          licensePlate,
          bookingId: booking?.bookingId,
          completedAt: Date.now(),
        },
        ...remaining,
      ].slice(0, 20)),
    );
  } catch {
    // The fallback still completes the booking even if browser storage is unavailable.
  }
}

function isLocalAppHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  );
}

function getPayOsCallbackUrl(path) {
  if (typeof window === "undefined") return "https://payos.vn";
  return isLocalAppHost(window.location.hostname)
    ? "https://payos.vn"
    : `${window.location.origin}${path}`;
}

function isPaidPaymentStatus(status) {
  const normalized = String(status ?? "").trim().toLowerCase();
  return ["completed", "paid", "success", "succeeded"].includes(normalized);
}

function mergeStaffCheckInResult(booking, result) {
  if (!booking || !result?.hasAdmissionDecision) return null;
  if (
    result.bookingId != null &&
    Number(result.bookingId) !== Number(booking.bookingId)
  ) {
    return null;
  }

  return {
    ...booking,
    licensePlate: result.licensePlate || booking.licensePlate,
    status: result.bookingStatus || booking.status,
    processingLaneId: result.isWaiting ? undefined : result.laneId,
    processingLaneName: result.isWaiting ? undefined : result.laneName,
    isWaitingForLane: result.isWaiting,
    barrierCommandId: result.barrierCommandId,
    barrierCommandCreated: result.barrierCommandCreated,
    barrierId: result.barrierId,
    barrierCommandExpiresAt: result.barrierCommandExpiresAt,
    admissionStatus: result.admissionStatus,
  };
}

function getCheckInSuccessMessage(booking) {
  const plate = booking?.licensePlate || "xe";
  if (booking?.status === "Processing" && hasAssignedLane(booking)) {
    const laneName = getLaneDisplayName(booking, "");
    return laneName
      ? `Xe ${plate} đã check-in và được phân vào ${laneName}.`
      : `Xe ${plate} đã check-in và bắt đầu vào làn.`;
  }
  return `Xe ${plate} đã check-in và đang chờ làn trống.`;
}

function publishBookingLaneState(booking) {
  if (!booking?.licensePlate) return null;
  const state = getLaneAssignmentState(booking);
  if (
    state === "assigned" ||
    (state === "processing" && hasAssignedLane(booking))
  ) {
    return publishLaneDisplayEvent({
      type: "assigned",
      plate: booking.licensePlate,
      bookingId: booking.bookingId,
      laneId: booking.processingLaneId,
      laneName: getLaneDisplayName(booking, ""),
      barrierCommandId: booking.barrierCommandId,
      barrierId: booking.barrierId,
    });
  }
  if (state === "payment") {
    return publishLaneDisplayEvent({
      type: "payment",
      plate: booking.licensePlate,
      bookingId: booking.bookingId,
    });
  }
  if (state === "waiting") {
    return publishLaneDisplayEvent({
      type: "waiting",
      plate: booking.licensePlate,
      bookingId: booking.bookingId,
    });
  }
  return null;
}

function getPaymentMethodDisplay(method, paymentStatus) {
  const raw = String(method ?? "").trim();
  const label = formatPaymentMethodLabel(method);
  const missingMethod =
    !raw ||
    raw === "—" ||
    raw.toLowerCase() === "pending" ||
    label === "Chưa thanh toán" ||
    label === "Chưa xác định";

  if (isPaidPaymentStatus(paymentStatus) && missingMethod) {
    return "Thanh toán trên hệ thống";
  }

  return label;
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

function getProcessingVehicleKey(vehicle) {
  if (vehicle?.bookingId) return `booking-${vehicle.bookingId}`;
  if (vehicle?.fleetWashLogId) return `fleet-${vehicle.fleetWashLogId}`;
  return `plate-${normalizePlate(vehicle?.licensePlate)}`;
}

/** Tasks API là nguồn trạng thái chính thức của hàng chờ Staff. */
function mergeStaffTasksFromApi(_prev, fromApi) {
  return Array.isArray(fromApi) ? fromApi : [];
}

function plateLookupMessage(status) {
  if (status === "Pending") return "";
  if (status === "Processing") return "";
  if (status !== "Checked-in") {
    return "Xe chưa check-in vào khu vực xưởng.";
  }
  return "";
}

function getBookingStatusLabel(status) {
  const labels = {
    Pending: "Chờ check-in",
    "Checked-in": "Đã check-in",
    Processing: "Đang rửa",
    Completed: "Hoàn thành",
    Cancelled: "Đã hủy",
    "No-show": "Vắng mặt",
  };
  return labels[status] ?? status;
}

function StatusBadge({ status }) {
  const styles = {
    Pending:
      "border-tertiary/40 bg-tertiary/10 text-tertiary",
    "Checked-in":
      "border-primary/40 bg-primary/10 text-primary",
    Processing:
      "border-secondary/40 bg-secondary/10 text-secondary",
    Completed:
      "border-outline-variant bg-surface-variant text-on-surface-variant",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${styles[status] ?? styles.Pending}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {getBookingStatusLabel(status)}
    </span>
  );
}

function RankBadge({ rankName, tierPoints }) {
  return <TierBadge tierName={rankName} tierPoints={tierPoints} />;
}

function isVipQueueCustomer(customer) {
  if (customer?.isVip === true) return true;

  const tierPoints = Number(customer?.customerTierPoints);
  if (Number.isFinite(tierPoints) && tierPoints >= 5000) return true;

  const tierName = String(customer?.rankName ?? customer?.customerTierName ?? "")
    .trim()
    .toLowerCase();
  return ["gold", "platinum", "diamond"].some((tier) =>
    tierName.includes(tier),
  );
}

function resolveEntryBarrierGate({ barrierId, queueLaneType, customer } = {}) {
  const backendGate = gateFromBarrierId(barrierId);
  if (
    backendGate === BARRIER_GATES.ENTRY_REGULAR ||
    backendGate === BARRIER_GATES.ENTRY_VIP
  ) {
    return backendGate;
  }
  if (queueLaneType) return gateFromQueueLaneType(queueLaneType);
  return gateFromQueueLaneType(isVipQueueCustomer(customer) ? "vip" : "regular");
}

function wasBarrierCommandAccepted(result) {
  return result?.skipped !== true || result.reason === "duplicate";
}

function PaymentStatusBadge({ status }) {
  const raw = String(status ?? "").trim();
  const normalized = raw === "—" || raw === "" ? "Chưa thanh toán" : raw;
  const map = {
    "Đã thanh toán": "border-primary/30 bg-primary/15 text-primary",
    Paid: "border-primary/30 bg-primary/15 text-primary",
    Success: "border-primary/30 bg-primary/15 text-primary",
    Completed: "border-primary/30 bg-primary/15 text-primary",
    "Chưa thanh toán": "border-tertiary/40 bg-tertiary/10 text-tertiary",
    Pending: "border-tertiary/40 bg-tertiary/10 text-tertiary",
    Unpaid: "border-tertiary/40 bg-tertiary/10 text-tertiary",
    Failed: "border-error-container/40 bg-error-container/20 text-error",
    Refunded: "border-outline-variant bg-surface-variant text-on-surface-variant",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        map[normalized] ?? "border-outline-variant bg-surface-variant text-on-surface-variant"
      }`}
    >
      <span className="material-symbols-outlined text-[14px]">payments</span>
      {normalized}
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

function PayOsQrModal({ payment, onClose, onPaid, verifying = false }) {
  if (!payment?.url) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
          <div>
            <h3 className="font-sora text-lg font-semibold text-on-surface">
              Thanh toán PayOS
            </h3>
            <p className="text-xs text-on-surface-variant">
              {payment.licensePlate} - Booking #{payment.bookingId || "-"} - {formatVnd(payment.amount)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onPaid}
              disabled={verifying}
            >
              <span className="material-symbols-outlined text-[16px]">
                {verifying ? "sync" : "check_circle"}
              </span>
              {verifying ? "Đang kiểm tra" : "Đã thanh toán"}
            </button>
            <a
              className="flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-surface-variant"
              href={payment.url}
              target="_blank"
              rel="noreferrer"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              Mở tab
            </a>
            <button
              type="button"
              className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-variant"
              onClick={onClose}
              aria-label="Đóng PayOS"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-white">
          <iframe
            title="PayOS checkout"
            src={payment.url}
            className="h-full w-full border-0"
            allow="clipboard-read; clipboard-write; payment *"
          />
        </div>
      </div>
    </div>
  );
}

function ExtraMaterialUsageModal({ booking, form, materials, saving, onChange, onClose, onSubmit }) {
  const selectedMaterial = useMemo(
    () => materials.find((material) => Number(material.materialId) === Number(form.materialId)),
    [form.materialId, materials],
  );
  const canSubmit = Boolean(form.materialId && Number(form.quantity) > 0);

  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="glass-panel soft-shadow w-full max-w-lg overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant bg-surface-container-low p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/15 text-primary">
              <span className="material-symbols-outlined text-[22px]">inventory_2</span>
            </span>
            <div>
              <h3 className="font-sora text-lg font-semibold text-on-surface">
                Báo vật tư phát sinh
              </h3>
              <p className="mt-1 text-xs text-on-surface-variant">
                Booking #{booking.bookingId} · {booking.licensePlate}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClose}
            aria-label="Đóng"
            disabled={saving}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <form className="space-y-4 p-5" onSubmit={onSubmit}>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Vật tư
            </span>
            <select
              className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant"
              value={form.materialId}
              onChange={(event) => onChange({ materialId: event.target.value })}
              required
              disabled={saving}
            >
              <option value="">Chọn vật tư</option>
              {materials.map((material) => (
                <option key={material.materialId} value={material.materialId}>
                  {material.name} ({material.unit})
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Số lượng
            </span>
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant"
              value={form.quantity}
              onChange={(event) => onChange({ quantity: event.target.value })}
              required
              disabled={saving}
            />
            <span className="block rounded-lg bg-primary-container/10 px-3 py-2 text-xs text-primary">
              {selectedMaterial?.unit ? `Đơn vị tính: ${selectedMaterial.unit}` : "Chọn vật tư để xem đơn vị tính"}
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Ghi chú
            </span>
            <textarea
              className="min-h-24 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant"
              value={form.note}
              onChange={(event) => onChange({ note: event.target.value })}
              disabled={saving}
              placeholder="Ví dụ: xe quá bẩn, dùng thêm hóa chất"
            />
          </label>
          <div className="flex justify-end gap-3 border-t border-outline-variant pt-4">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-outline-variant px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              disabled={saving || !canSubmit}
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {saving ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
          </div>
        </form>
      </div>
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
      </div>
    </section>
  );
}

function CheckedInQueuePanel({ items, selectedBookingId, onSelect }) {
  const vipItems = items.filter(isVipQueueCustomer);
  const regularItems = items.filter((item) => !isVipQueueCustomer(item));

  return (
    <section className="glass-panel soft-shadow flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">
            format_list_numbered
          </span>
          <h3 className="font-sora text-lg font-semibold text-on-surface">
            Hai làn xếp hàng cổng vào
          </h3>
        </div>
        <span className="rounded border border-primary/25 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
          {items.length} xe
        </span>
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <QueueLaneColumn
          title="Làn thường"
          icon="directions_car"
          accentClass="text-primary"
          items={regularItems}
          selectedBookingId={selectedBookingId}
          onSelect={onSelect}
        />
        <QueueLaneColumn
          title="Làn VIP"
          icon="workspace_premium"
          accentClass="text-amber-600"
          items={vipItems}
          selectedBookingId={selectedBookingId}
          onSelect={onSelect}
        />
      </div>
    </section>
  );
}

function QueueLaneColumn({
  title,
  icon,
  accentClass,
  items,
  selectedBookingId,
  onSelect,
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low">
      <div className="flex items-center justify-between border-b border-outline-variant px-3 py-2">
        <div className={`flex items-center gap-2 font-semibold ${accentClass}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
          <span>{title}</span>
        </div>
        <span className="rounded-full bg-surface-container-lowest px-2 py-0.5 text-xs font-semibold text-on-surface-variant">
          {items.length}
        </span>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="py-5 text-center text-xs text-on-surface-variant">
            Chưa có xe trong làn.
          </p>
        ) : (
          items.map((item) => {
            const selected = item.bookingId === selectedBookingId;
            return (
              <button
                key={item.bookingId}
                type="button"
                onClick={() => onSelect(item)}
                className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-outline-variant bg-surface-container-lowest hover:border-primary/35"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sora text-base font-bold tracking-wide text-on-surface">
                    {item.licensePlate}
                  </span>
                  <RankBadge
                    rankName={item.rankName}
                    tierPoints={item.customerTierPoints}
                  />
                </div>
                <p className="mt-1 truncate text-xs text-on-surface">
                  {item.customerName && item.customerName !== "—"
                    ? item.customerName
                    : "Khách vãng lai"}
                </p>
                <p className="truncate text-xs text-on-surface-variant">
                  {item.serviceName}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function isPayOsConfigurationError(err) {
  if (!(err instanceof ApiError)) return false;
  const payload = err.payload && typeof err.payload === "object" ? err.payload : {};
  const details = String(payload.details ?? payload.Details ?? "");
  return `${err.message} ${details}`.toLowerCase().includes("payos configuration is missing");
}

function getVehicleTypeId(type) {
  return Number(type?.vehicleTypeId ?? type?.id ?? 0);
}

function normalizeVehicleTypeLabel(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("vi-VN")
    .replace(/\s+/g, " ");
}

function findVehicleTypeIdByName(vehicleTypes, vehicleTypeName) {
  const normalizedName = normalizeVehicleTypeLabel(vehicleTypeName);
  if (!normalizedName) return undefined;

  const exact = vehicleTypes.find((type) => {
    const typeName = normalizeVehicleTypeLabel(
      type?.name ?? type?.vehicleTypeName,
    );
    return typeName === normalizedName;
  });
  if (exact) return getVehicleTypeId(exact) || undefined;

  const partial = vehicleTypes.find((type) => {
    const typeName = normalizeVehicleTypeLabel(
      type?.name ?? type?.vehicleTypeName,
    );
    return (
      typeName &&
      (typeName.includes(normalizedName) || normalizedName.includes(typeName))
    );
  });
  return partial ? getVehicleTypeId(partial) || undefined : undefined;
}

function isFallbackVehicleType(type) {
  return String(type?.name ?? type?.vehicleTypeName ?? "")
    .trim()
    .toLowerCase() === "khác";
}

function getServicePriceForVehicleType(service, vehicleTypeId) {
  if (!vehicleTypeId || !Array.isArray(service?.prices)) return null;
  return (
    service.prices.find((price) => Number(price.vehicleTypeId) === Number(vehicleTypeId)) ?? null
  );
}

function PersonalWalkInPanel({
  draft,
  services,
  vehicleTypes,
  loadingServices,
  loadingVehicleTypes,
  creating,
  onToggleService,
  onVehicleTypeChange,
  onPaymentMethodChange,
  onSubmit,
  onCancel,
}) {
  if (!draft) return null;
  const isRegisteredCustomer = Number(draft.userId) > 0;
  const paymentOptions = isRegisteredCustomer
    ? [
        { value: "Cash", label: "Tiền mặt" },
        { value: "PayOS", label: "PayOS" },
        { value: "Wallet", label: "Ví" },
      ]
    : [
        { value: "Cash", label: "Tiền mặt" },
        { value: "PayOS", label: "PayOS" },
      ];
  const selectedVehicleTypeId = Number(draft.vehicleTypeId) || 0;

  return (
    <section className="glass-panel soft-shadow flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest xl:max-h-[calc(100vh-15rem)]">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary">
            person_add
          </span>
          <div>
            <h3 className="font-sora text-lg font-semibold text-on-surface">
              Walk-in cá nhân
            </h3>
            <p className="text-xs text-on-surface-variant">
              {draft.licensePlate} · chọn dịch vụ để check-in trực tiếp
            </p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-variant"
          onClick={onCancel}
          aria-label="Đóng"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {isRegisteredCustomer ? (
          <div className="rounded-xl border border-primary/25 bg-primary-container/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Khách đã đăng ký
              </p>
              {(draft.customerTierName || draft.customerTierPoints != null) && (
                <RankBadge
                  rankName={draft.customerTierName}
                  tierPoints={draft.customerTierPoints}
                />
              )}
            </div>
            <p className="mt-1 font-semibold text-on-surface">
              {draft.customerName || `Customer #${draft.userId}`}
            </p>
            {draft.phoneNumber && (
              <p className="text-sm text-on-surface-variant">{draft.phoneNumber}</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Khách vãng lai
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Chưa có tài khoản trong hệ thống, booking sẽ gửi userId = 0.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Thanh toán
          </p>
          <div className={`mt-3 grid gap-2 ${paymentOptions.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
            {paymentOptions.map((option) => {
              const selected = draft.paymentMethod === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    selected
                      ? "border-secondary bg-secondary-container/25 text-secondary"
                      : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-secondary/50"
                  }`}
                  onClick={() => onPaymentMethodChange(option.value)}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {selected ? "radio_button_checked" : "radio_button_unchecked"}
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Loại xe
          </label>
          <select
            className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm font-medium text-on-surface outline-none focus:border-secondary"
            value={selectedVehicleTypeId ? String(selectedVehicleTypeId) : ""}
            onChange={(event) => onVehicleTypeChange(event.target.value)}
            disabled={loadingVehicleTypes || creating}
          >
            <option value="">
              {loadingVehicleTypes ? "Đang tải loại xe..." : "Chọn loại xe"}
            </option>
            {vehicleTypes.filter((type) => !isFallbackVehicleType(type)).map((type) => {
              const id = getVehicleTypeId(type);
              if (!id) return null;
              return (
                <option key={id} value={id}>
                  {type.name ?? type.vehicleTypeName ?? `Loại xe ${id}`}
                </option>
              );
            })}
          </select>
        </div>

        {loadingServices ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary-container" />
          </div>
        ) : services.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface-variant">
            Không tải được danh sách dịch vụ cho chi nhánh này.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {services.map((service) => {
              const serviceId = Number(service.serviceId ?? service.id);
              const selected = draft.serviceIds.includes(serviceId);
              const selectedPrice = getServicePriceForVehicleType(service, selectedVehicleTypeId);
              const disabledByVehicleType = selectedVehicleTypeId > 0 && !selectedPrice;
              const minPrice =
                Array.isArray(service.prices) && service.prices.length > 0
                  ? Math.min(...service.prices.map((p) => Number(p.price) || 0))
                  : 0;
              const displayPrice = selectedPrice ? Number(selectedPrice.price) || 0 : minPrice;

              return (
                <button
                  key={serviceId}
                  type="button"
                  className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                    selected
                      ? "border-secondary bg-secondary-container/25"
                      : disabledByVehicleType
                        ? "border-outline-variant bg-surface-container-low opacity-50"
                      : "border-outline-variant bg-surface-container-low hover:border-secondary/50"
                  }`}
                  disabled={disabledByVehicleType}
                  onClick={() => onToggleService(serviceId)}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface">
                      {service.serviceName ?? service.name ?? `Dịch vụ ${serviceId}`}
                    </p>
                    {service.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-on-surface-variant">
                        {service.description}
                      </p>
                    )}
                    {displayPrice > 0 && (
                      <p className="mt-1 text-sm font-semibold text-primary">
                        {selectedPrice ? formatVnd(displayPrice) : `từ ${formatVnd(displayPrice)}`}
                      </p>
                    )}
                    {disabledByVehicleType && (
                      <p className="mt-1 text-xs text-error">
                        Chưa có giá cho loại xe này
                      </p>
                    )}
                  </div>
                  <span
                    className={`material-symbols-outlined shrink-0 ${
                      selected ? "text-secondary" : "text-outline"
                    }`}
                  >
                    {selected ? "radio_button_checked" : "radio_button_unchecked"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

      </div>
      <div className="shrink-0 border-t border-outline-variant bg-surface-container-lowest p-4">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-on-secondary transition-colors hover:bg-secondary/90 disabled:opacity-60"
          onClick={onSubmit}
          disabled={creating || loadingServices || draft.serviceIds.length === 0}
        >
          {creating ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-secondary/30 border-t-on-secondary" />
          ) : (
            <span className="material-symbols-outlined text-lg">login</span>
          )}
          Tạo walk-in personal
        </button>
      </div>
    </section>
  );
}

function hasVehicleReviewCorrection(review) {
  const selectedVehicleTypeId = Number(review.selectedVehicleTypeId) || 0;
  const predictedVehicleTypeId = Number(review.predictedVehicleTypeId) || 0;
  return (
    selectedVehicleTypeId > 0 &&
    (!predictedVehicleTypeId || selectedVehicleTypeId !== predictedVehicleTypeId)
  );
}

function VehicleReviewAutoDismiss({ review, onDismiss }) {
  const confidence = Number(review.confidence);
  const normalizedConfidence =
    Number.isFinite(confidence) && confidence <= 1 ? confidence * 100 : confidence;
  const isFullConfidence =
    Number.isFinite(normalizedConfidence) && normalizedConfidence >= 100;
  const doesNotNeedFeedback =
    review.isOverriddenByHistory ||
    (Number(review.predictedVehicleTypeId) > 0 &&
      !hasVehicleReviewCorrection(review));
  const shouldAutoDismiss =
    review.feedbackStatus === "idle" &&
    isFullConfidence &&
    doesNotNeedFeedback;

  useEffect(() => {
    if (!shouldAutoDismiss) return undefined;

    const timer = window.setTimeout(
      () => onDismiss(review.licensePlate),
      NO_FEEDBACK_REVIEW_TTL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [onDismiss, review.licensePlate, shouldAutoDismiss]);

  return null;
}

function VehicleRecognitionReviewPanel({
  reviews,
  vehicleTypes,
  loadingVehicleTypes,
  onVehicleTypeChange,
  onConfirm,
  onDismiss,
}) {
  const validReviews = reviews.filter((review) =>
    isValidVietnameseLicensePlate(review.licensePlate),
  );
  if (validReviews.length === 0) return null;

  return (
    <section className="glass-panel soft-shadow mb-4 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary">neurology</span>
          <div>
            <h2 className="font-sora text-lg font-semibold text-on-surface">
              Kiểm tra loại xe nhận diện
            </h2>
            <p className="text-xs text-on-surface-variant">
              Áp dụng cho Walk-in, booking đặt trước và xe doanh nghiệp
            </p>
          </div>
        </div>
        <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
          {validReviews.length} xe
        </span>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-2 xl:grid-cols-3">
        {validReviews.map((review) => {
          const selectedVehicleTypeId = Number(review.selectedVehicleTypeId) || 0;
          const hasCorrection = hasVehicleReviewCorrection(review);
          const confidence = Number(review.confidence);
          const confidenceLabel = Number.isFinite(confidence)
            ? `${Math.round(confidence <= 1 ? confidence * 100 : confidence)}%`
            : null;

          return (
            <article
              key={review.licensePlate}
              className={`rounded-xl border p-3 ${
                review.isOverriddenByHistory
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-amber-500/40 bg-amber-500/10"
              }`}
            >
              <VehicleReviewAutoDismiss review={review} onDismiss={onDismiss} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-sora text-lg font-bold tracking-wide text-on-surface">
                      {review.licensePlate}
                    </p>
                    {review.customerType && (
                      <span className="rounded-full border border-outline-variant bg-surface-container-lowest px-2 py-0.5 text-[10px] font-semibold uppercase text-on-surface-variant">
                        {review.customerType}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    {review.isOverriddenByHistory
                      ? "Loại xe từ hồ sơ đã lưu"
                      : "AI dự đoán loại xe"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {review.predictedVehicleTypeName || "Chưa xác định"}
                    {confidenceLabel ? ` · ${confidenceLabel}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-variant"
                  aria-label={`Đóng kiểm tra loại xe ${review.licensePlate}`}
                  onClick={() => onDismiss(review.licensePlate)}
                  disabled={review.feedbackStatus === "submitting"}
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {review.isOverriddenByHistory ? (
                <p className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <span className="material-symbols-outlined text-[17px]">verified</span>
                  Đã đối chiếu theo biển số, không cần gửi feedback.
                </p>
              ) : (
                <>
                  <label className="mt-3 block">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Loại xe Staff xác nhận
                    </span>
                    <select
                      className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm font-medium text-on-surface outline-none focus:border-secondary disabled:opacity-60"
                      value={selectedVehicleTypeId ? String(selectedVehicleTypeId) : ""}
                      disabled={
                        loadingVehicleTypes ||
                        review.feedbackStatus === "submitting" ||
                        review.feedbackStatus === "submitted"
                      }
                      onChange={(event) =>
                        onVehicleTypeChange(review.licensePlate, event.target.value)
                      }
                    >
                      <option value="">
                        {loadingVehicleTypes ? "Đang tải loại xe..." : "Chọn loại xe đúng"}
                      </option>
                      {vehicleTypes
                        .filter((type) => !isFallbackVehicleType(type))
                        .map((type) => {
                          const id = getVehicleTypeId(type);
                          if (!id) return null;
                          return (
                            <option key={id} value={id}>
                              {type.name ?? type.vehicleTypeName ?? `Loại xe ${id}`}
                            </option>
                          );
                        })}
                    </select>
                  </label>

                  <button
                    type="button"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-on-secondary transition-colors hover:bg-secondary/90 disabled:opacity-50"
                    disabled={
                      !hasCorrection ||
                      review.feedbackStatus === "submitting" ||
                      review.feedbackStatus === "submitted"
                    }
                    onClick={() => onConfirm(review.licensePlate)}
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {review.feedbackStatus === "submitting"
                        ? "progress_activity"
                        : review.feedbackStatus === "submitted"
                          ? "task_alt"
                          : "send"}
                    </span>
                    {review.feedbackStatus === "submitting"
                      ? "Đang gửi feedback..."
                      : review.feedbackStatus === "submitted"
                        ? "Đã gửi feedback"
                        : hasCorrection
                          ? "Xác nhận và gửi feedback"
                          : "AI nhận diện đúng — không cần gửi"}
                  </button>

                  {review.feedbackStatus === "error" && (
                    <p className="mt-2 text-xs font-semibold text-error">
                      Gửi feedback thất bại. Kiểm tra kết nối rồi bấm xác nhận lại.
                    </p>
                  )}
                </>
              )}
            </article>
          );
        })}
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
  onReportExtraUsage,
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

  const isCheckedIn = booking.status === "Checked-in";
  const canCheckinNow = canCheckIn(booking);
  const canStart = canStartWash(booking);
  const isProcessing = booking.status === "Processing";

  const safeText = (v, fallback = "—") =>
    v == null || v === "" || v === "—" ? fallback : v;

  return (
    <section className="glass-panel soft-shadow flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest xl:max-h-[calc(100vh-15rem)]">
      <div className="shrink-0 border-b border-outline-variant bg-surface-container-low p-4">
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
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {error && (
          <div className="rounded-lg border border-tertiary/35 bg-tertiary/10 px-3 py-2 text-xs font-medium text-tertiary">
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
          <RankBadge rankName={booking.rankName} tierPoints={booking.customerTierPoints} />
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
            <div className="pt-2">
              <LaneAssignmentBadge booking={booking} />
            </div>
          </div>
        </div>

        <WashTelemetry booking={booking} />

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
            <div className="mt-2">
              <PaymentStatusBadge status={booking.paymentStatus} />
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
            <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              Hình thức
            </p>
            <p className="text-sm font-medium text-on-surface">
              {safeText(
                getPaymentMethodDisplay(booking.paymentMethod, booking.paymentStatus),
                "Chưa chọn",
              )}
            </p>
          </div>
        </div>

      </div>
      <div className="shrink-0 border-t border-outline-variant bg-surface-container-lowest p-4">
        <div className="flex gap-3">
          {isCheckedIn && (
            <button
              type="button"
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold tracking-wide text-on-primary uppercase shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onStartProcessing}
              disabled={confirming || !canStart}
              title={
                !booking.processingLaneId && !booking.processingLaneName
                  ? "Xe đang chờ được phân làn"
                  : !isPaidPaymentStatus(booking.paymentStatus) && Number(booking.finalAmount) > 0
                    ? "Booking chưa hoàn tất thanh toán"
                    : undefined
              }
            >
              {confirming
                ? "Đang xử lý…"
                : canStart
                  ? "Bắt đầu rửa"
                  : "Chưa đủ điều kiện"}
            </button>
          )}
          {isProcessing && (
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center justify-center rounded-xl border border-secondary/35 bg-secondary/10 px-4 py-3 text-sm font-semibold text-secondary">
                Xe đang rửa — hoàn thành ở cột bên phải
              </div>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/20"
                onClick={() => onReportExtraUsage(booking)}
              >
                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                Báo vật tư phát sinh
              </button>
            </div>
          )}
          {booking.status === "Pending" && !isProcessing ? (
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold tracking-wide text-on-primary uppercase shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
              onClick={onCheckin}
              disabled={confirming || checkingIn || !canCheckinNow}
              title={!canCheckinNow ? "Booking chưa hoàn tất thanh toán" : undefined}
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
                  {canCheckinNow ? "Check-in ngay" : "Chưa thanh toán"}
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
        <span className="rounded border border-secondary/25 bg-secondary/10 px-2 py-1 text-xs font-semibold text-secondary">
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
              key={getProcessingVehicleKey(v)}
              className="group relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low p-4 transition-all hover:border-secondary/50"
            >
              <button
                type="button"
                className="mb-3 w-full text-left"
                onClick={() => v.bookingId && onSelect(v)}
                disabled={!v.bookingId}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-sora text-xl font-bold tracking-wide text-on-surface">
                    {v.licensePlate}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-secondary/25 bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold text-secondary uppercase">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
                    Đang rửa
                  </span>
                </div>
                <div className="space-y-1">
                  <LaneAssignmentBadge booking={v} className="mb-2" />
                  <p className="text-sm font-medium text-on-surface">
                    {v.customerName || (v.fleetWashLogId ? "Xe doanh nghiệp" : "—")}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {v.serviceName || (v.fleetWashLogId ? "Dịch vụ Fleet" : "—")}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {getPaymentMethodDisplay(v.paymentMethod, v.paymentStatus)} ·{" "}
                    {formatVnd(v.finalAmount)}
                  </p>
                  <WashDurationBadge booking={v} className="mt-2" />
                </div>
              </button>
              {v.bookingId ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-center text-xs font-semibold tracking-wide text-amber-700 uppercase transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                  onClick={() => onComplete(v)}
                  disabled={completingId === getProcessingVehicleKey(v)}
                  title="Chỉ dùng khi camera cổng ra không nhận diện được biển số"
                >
                  <span className="material-symbols-outlined text-[17px]">warning</span>
                  {completingId === getProcessingVehicleKey(v)
                    ? "Đang xử lý…"
                    : "Hoàn thành thủ công"}
                </button>
              ) : (
                <div className="rounded-xl border border-outline-variant px-3 py-2 text-center text-xs font-medium text-on-surface-variant">
                  Xe Fleet · hoàn thành bằng camera cổng ra
                </div>
              )}
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
  const [laneAssignment, setLaneAssignment] = useState(null);
  const [laneOccupancies, setLaneOccupancies] = useState(null);
  const [toast, setToast] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [extraUsageBooking, setExtraUsageBooking] = useState(null);
  const [extraUsageForm, setExtraUsageForm] = useState({ materialId: "", quantity: "", note: "" });
  const [submittingExtraUsage, setSubmittingExtraUsage] = useState(false);
  const [walkInDraft, setWalkInDraft] = useState(null);
  const [walkInServices, setWalkInServices] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [vehicleReviews, setVehicleReviews] = useState([]);
  const dismissedVehicleReviewUntilRef = useRef(new Map());
  const [loadingWalkInServices, setLoadingWalkInServices] = useState(false);
  const [loadingVehicleTypes, setLoadingVehicleTypes] = useState(false);
  const [creatingWalkIn, setCreatingWalkIn] = useState(false);
  const [payOsPayment, setPayOsPayment] = useState(null);
  const [verifyingPayOsPayment, setVerifyingPayOsPayment] = useState(false);
  const [barrierAlert, setBarrierAlert] = useState(null);
  const taskLaneSnapshotRef = useRef(null);
  const staffTasksRequestRef = useRef(null);

  const showToast = useCallback(
    (message, type = "success") => setToast({ message, type }),
    [],
  );
  const barrierController = useBarrierController({ onNotice: showToast });
  const { executeCommand: executeBarrierCommand } = barrierController;

  const markPayOsPaymentCompleted = useCallback((payment = payOsPayment) => {
    if (!payment?.bookingId) {
      setPayOsPayment(null);
      return;
    }
    const paidPatch = {
      bookingId: Number(payment.bookingId),
      paymentMethod: "PayOS",
      paymentStatus: "Completed",
      processingLaneId: payment.processingLaneId ?? undefined,
      processingLaneName: payment.processingLaneName ?? undefined,
    };
    setSelectedBooking((booking) =>
      Number(booking?.bookingId) === Number(payment.bookingId)
        ? { ...booking, ...paidPatch }
        : booking,
    );
    setStaffTasks((tasks) =>
      tasks.map((task) =>
        Number(task.bookingId) === Number(payment.bookingId)
          ? { ...task, ...paidPatch }
          : task,
      ),
    );
    setPayOsPayment(null);
    publishBookingLaneState({
      ...payment,
      ...paidPatch,
      status: payment.status ?? "Checked-in",
      finalAmount: Number(payment.amount ?? 0),
    });
    showToast(`Đã ghi nhận thanh toán PayOS cho booking #${payment.bookingId}.`);
  }, [payOsPayment, showToast]);

  const verifyPayOsPaymentStatus = useCallback(async (payment = payOsPayment, { silent = false } = {}) => {
    if (!payment?.bookingId) return false;
    if (!silent) setVerifyingPayOsPayment(true);
    try {
      const status = await fetchBookingPaymentStatus(payment.bookingId);
      if (isPaidPaymentStatus(status?.paymentStatus)) {
        markPayOsPaymentCompleted({
          ...payment,
          amount: Number(status?.amount ?? payment.amount ?? 0),
          processingLaneId: status?.processingLaneId,
          processingLaneName: status?.processingLaneName,
        });
        return true;
      }
      if (!silent) {
        showToast("PayOS chưa xác nhận thanh toán. Vui lòng thử lại sau vài giây.", "error");
      }
      return false;
    } catch (err) {
      if (!silent) {
        showToast(
          err instanceof ApiError
            ? err.message
            : "Không thể kiểm tra trạng thái thanh toán PayOS.",
          "error",
        );
      }
      return false;
    } finally {
      if (!silent) setVerifyingPayOsPayment(false);
    }
  }, [payOsPayment, markPayOsPaymentCompleted, showToast]);

  const loadWalkInServices = useCallback(async (branchId) => {
    setLoadingWalkInServices(true);
    try {
      const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
      const data = await apiRequest(`/services${query}`);
      const list = Array.isArray(data) ? data : [];
      setWalkInServices(list.filter((service) => service.isActive !== false));
    } catch (err) {
      setWalkInServices([]);
      showToast(
        err instanceof ApiError
          ? err.message
          : "Không tải được danh sách dịch vụ walk-in.",
        "error",
      );
    } finally {
      setLoadingWalkInServices(false);
    }
  }, [showToast]);

  const loadVehicleTypes = useCallback(async () => {
    setLoadingVehicleTypes(true);
    try {
      const types = await fetchVehicleTypes();
      setVehicleTypes(Array.isArray(types) ? types : []);
    } catch {
      setVehicleTypes([]);
      showToast("Không tải được danh sách loại xe.", "error");
    } finally {
      setLoadingVehicleTypes(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!payOsPayment?.bookingId) return undefined;

    let cancelled = false;
    const pollPayment = async () => {
      try {
        const status = await fetchBookingPaymentStatus(payOsPayment.bookingId);
        if (!cancelled && isPaidPaymentStatus(status?.paymentStatus)) {
          markPayOsPaymentCompleted({
            ...payOsPayment,
            amount: Number(status?.amount ?? payOsPayment.amount ?? 0),
            processingLaneId: status?.processingLaneId,
            processingLaneName: status?.processingLaneName,
          });
        }
      } catch {
        // Payment polling is best-effort while PayOS/webhook finishes.
      }
    };

    const interval = setInterval(pollPayment, 3000);
    const timeout = setTimeout(() => clearInterval(interval), 120000);
    pollPayment();

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [payOsPayment, markPayOsPaymentCompleted]);

  const loadStaffTasks = useCallback(({ signal } = {}) => {
    // Reuse an active refresh so a slow backend cannot create overlapping 30s polls.
    if (staffTasksRequestRef.current) return staffTasksRequestRef.current

    let request
    request = (async () => {
      try {
        const occupanciesPromise = fetchStaffLaneOccupancies({ signal })
          .then((occupancies) => {
            if (!signal?.aborted) setLaneOccupancies(occupancies)
          })
          .catch((err) => {
            if (err?.name === 'AbortError' || err?.name === 'CanceledError') return
            console.warn('Failed to load lane occupancies:', err)
          })
        const data = await fetchStaffTasks({ signal })
        if (signal?.aborted) return

        // The tasks endpoint already contains everything needed to paint the queues.
        // Render it immediately; optional customer/payment enrichment continues below.
        setStaffTasks((prev) => mergeStaffTasksFromApi(prev, data))
        setSelectedBooking((current) => {
          if (!current?.bookingId) return current
          const fresh = data.find(
            (task) => Number(task.bookingId) === Number(current.bookingId),
          )
          return fresh ? { ...current, ...fresh } : current
        })
        setInitialLoading(false)

        const enriched = await enrichStaffTasks(data, { signal })
        if (signal?.aborted) return
        const nextSnapshot = new Map(
          enriched.map((task) => [
            Number(task.bookingId),
            `${task.status}|${task.processingLaneId ?? ''}|${task.processingLaneName ?? ''}`,
          ]),
        )
        if (taskLaneSnapshotRef.current) {
          for (const task of enriched) {
            const previous = taskLaneSnapshotRef.current.get(Number(task.bookingId))
            const current = nextSnapshot.get(Number(task.bookingId))
            if (
              previous !== current &&
              hasAssignedLane(task) &&
              ["assigned", "processing"].includes(getLaneAssignmentState(task))
            ) {
              publishBookingLaneState(task)
            }
          }
        }
        taskLaneSnapshotRef.current = nextSnapshot
        setStaffTasks((prev) => mergeStaffTasksFromApi(prev, enriched))
        setSelectedBooking((current) => {
          if (!current?.bookingId) return current
          const fresh = enriched.find(
            (task) => Number(task.bookingId) === Number(current.bookingId),
          )
          return fresh ? { ...current, ...fresh } : current
        })
        await occupanciesPromise
        return enriched
      } catch (err) {
        if (err?.name === 'AbortError' || err?.name === 'CanceledError') return
        console.warn('Failed to load staff tasks:', err)
        return []
      } finally {
        if (!signal?.aborted) setInitialLoading(false)
        if (staffTasksRequestRef.current === request) {
          staffTasksRequestRef.current = null
        }
      }
    })()

    staffTasksRequestRef.current = request
    return request
  }, [])

  const loadMaterials = useCallback(async () => {
    try {
      const data = await fetchMaterials()
      setMaterials(Array.isArray(data) ? data : [])
    } catch (err) {
      console.warn('Failed to load materials:', err)
      setMaterials([])
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const initialLoadId = window.setTimeout(() => {
      loadStaffTasks({ signal: controller.signal })
      fetchStaffLaneAssignment({ signal: controller.signal })
        .then((a) => {
          if (!controller.signal.aborted) {
            setLaneAssignment(a)
          }
        })
        .catch((err) => {
          if (err?.name === 'AbortError' || err?.name === 'CanceledError') return
        })
      loadVehicleTypes()
      loadMaterials()
    }, 0)

    const interval = setInterval(() => {
      loadStaffTasks({ signal: controller.signal })
    }, 30_000)
    return () => {
      controller.abort()
      window.clearTimeout(initialLoadId)
      clearInterval(interval)
    }
  }, [loadMaterials, loadStaffTasks, loadVehicleTypes])

  useEffect(() => {
    publishLaneDisplayHeartbeat()
    const heartbeat = setInterval(publishLaneDisplayHeartbeat, 10_000)
    return () => clearInterval(heartbeat)
  }, [])

  const checkedInQueue = useMemo(
    () => staffTasks.filter((b) => b.status === "Checked-in"),
    [staffTasks],
  );

  const processingVehicles = (() => {
    const fromTasks = staffTasks.filter((b) => b.status === "Processing");

    // Until the occupancy endpoint responds, preserve the legacy status-based view.
    // Once loaded, LaneOccupancy is authoritative for whether a bay contains a vehicle.
    if (laneOccupancies === null) {
      if (
        selectedBooking?.status === "Processing" &&
        !fromTasks.some(
          (task) => Number(task.bookingId) === Number(selectedBooking.bookingId),
        )
      ) {
        return [...fromTasks, selectedBooking];
      }
      return fromTasks;
    }

    return laneOccupancies.map((occupancy) => {
      const matchingTask =
        (occupancy.bookingId
          ? staffTasks.find(
              (task) => Number(task.bookingId) === Number(occupancy.bookingId),
            )
          : null) ??
        staffTasks.find(
          (task) => normalizePlate(task.licensePlate) === normalizePlate(occupancy.licensePlate),
        );
      const selected =
        occupancy.bookingId &&
        Number(selectedBooking?.bookingId) === Number(occupancy.bookingId)
          ? selectedBooking
          : null;
      const detail = { ...matchingTask, ...selected };

      return {
        ...detail,
        bookingId: occupancy.bookingId,
        fleetWashLogId: occupancy.fleetWashLogId,
        licensePlate: occupancy.licensePlate || detail.licensePlate,
        status: "Processing",
        processingLaneId: occupancy.laneId,
        processingLaneName: occupancy.laneName,
        processingStartTime:
          detail.processingStartTime ?? occupancy.occupiedAt,
        finalAmount: Number(detail.finalAmount ?? 0),
      };
    });
  })();

  const laneLabel = useMemo(
    () => formatStaffStationLabel(laneAssignment),
    [laneAssignment],
  );

  const applySelectedBooking = useCallback(async (booking, options = {}) => {
    setWalkInDraft(null);
    if (options.message !== undefined) setLookupError(options.message);

    let normalized = normalizeStaffTask(booking);
    setSelectedBooking(normalized);

    if (
      normalized.status === "Processing" ||
      normalized.status === "Checked-in"
    ) {
      setStaffTasks((prev) => upsertStaffTaskList(prev, normalized));
    }

    // Enrich name + phone for registered customers (staff-tasks API omits them).
    const missingName =
      !normalized.customerName || normalized.customerName === "—";
    const missingPhone =
      !normalized.phoneMasked || normalized.phoneMasked === "—";
    if ((missingName || missingPhone) && Number(normalized.userId) > 0) {
      try {
        const user = await fetchUserById(Number(normalized.userId));
        const enriched = {
          ...normalized,
          customerName: user?.fullName ?? normalized.customerName,
          phoneNumber: user?.phoneNumber ?? normalized.phoneNumber,
          phoneMasked:
            (user?.phoneNumber ? maskPhoneNumber(user.phoneNumber) : null) ??
            normalized.phoneMasked,
        };
        normalized = enriched;
        setSelectedBooking((prev) =>
          Number(prev?.bookingId) === Number(enriched.bookingId)
            ? enriched
            : prev,
        );
        if (
          enriched.status === "Processing" ||
          enriched.status === "Checked-in"
        ) {
          setStaffTasks((prev) => upsertStaffTaskList(prev, enriched));
        }
      } catch {
        // ignore — keep whatever name/phone we already have
      }
    }
  }, []);

  const toggleWalkInService = useCallback((serviceId) => {
    setWalkInDraft((draft) => {
      if (!draft) return draft;
      const id = Number(serviceId);
      return { ...draft, serviceIds: draft.serviceIds.includes(id) ? [] : [id] };
    });
  }, []);

  const updateWalkInPaymentMethod = useCallback((paymentMethod) => {
    setWalkInDraft((draft) => (draft ? { ...draft, paymentMethod } : draft));
  }, []);

  const recordVehicleRecognition = useCallback((licensePlate, meta = {}) => {
    if (meta?.operationMode === "exit") return;

    const recognition = meta?.vehicleRecognition;
    const primaryResult = recognition?.primaryResult;
    if (!meta?.imageBlob || !primaryResult) return;

    const validLicensePlate = normalizeVietnameseLicensePlate(licensePlate);
    if (!validLicensePlate) return;

    const normalizedLicensePlate = normalizePlate(validLicensePlate);
    const suppressUntil = Number(
      dismissedVehicleReviewUntilRef.current.get(normalizedLicensePlate),
    );
    if (suppressUntil > Date.now()) return;
    dismissedVehicleReviewUntilRef.current.delete(normalizedLicensePlate);

    const predictedVehicleTypeId = findVehicleTypeIdByName(
      vehicleTypes,
      primaryResult.vehicleType,
    );

    setVehicleReviews((reviews) => {
      const existing = reviews.find(
        (review) => normalizePlate(review.licensePlate) === normalizedLicensePlate,
      );
      const keepLockedReview = ["submitting", "submitted"].includes(
        existing?.feedbackStatus,
      );
      const nextReview = keepLockedReview
        ? existing
        : {
            ...existing,
            licensePlate: validLicensePlate,
            imageBlob: meta.imageBlob,
            predictedVehicleTypeId,
            predictedVehicleTypeName: primaryResult.vehicleType || "",
            predictedBrand: primaryResult.predictedBrand,
            predictedModel: primaryResult.predictedModel,
            confidence: primaryResult.confidence,
            isOverriddenByHistory: Boolean(recognition.isOverriddenByHistory),
            selectedVehicleTypeId:
              existing?.selectedVehicleTypeId ?? predictedVehicleTypeId,
            feedbackStatus: "idle",
          };

      return [
        nextReview,
        ...reviews.filter(
          (review) => normalizePlate(review.licensePlate) !== normalizedLicensePlate,
        ),
      ].slice(0, 6);
    });
  }, [vehicleTypes]);

  const updateVehicleReviewContext = useCallback((licensePlate, customerType) => {
    const normalizedLicensePlate = normalizePlate(licensePlate);
    setVehicleReviews((reviews) =>
      reviews.map((review) =>
        normalizePlate(review.licensePlate) === normalizedLicensePlate
          ? { ...review, customerType }
          : review,
      ),
    );
  }, []);

  const updateVehicleReviewType = useCallback((licensePlate, vehicleTypeId) => {
    const normalizedLicensePlate = normalizePlate(licensePlate);
    const nextVehicleTypeId = Number(vehicleTypeId) || undefined;

    setVehicleReviews((reviews) =>
      reviews.map((review) =>
        normalizePlate(review.licensePlate) === normalizedLicensePlate
          ? {
              ...review,
              selectedVehicleTypeId: nextVehicleTypeId,
              feedbackStatus:
                review.feedbackStatus === "error" ? "idle" : review.feedbackStatus,
            }
          : review,
      ),
    );

    setWalkInDraft((draft) =>
      draft && normalizePlate(draft.licensePlate) === normalizedLicensePlate
        ? {
            ...draft,
            vehicleTypeId: nextVehicleTypeId,
            serviceIds: [],
          }
        : draft,
    );
  }, []);

  const confirmVehicleReview = useCallback(async (licensePlate) => {
    const normalizedLicensePlate = normalizePlate(licensePlate);
    const review = vehicleReviews.find(
      (item) => normalizePlate(item.licensePlate) === normalizedLicensePlate,
    );
    if (!review || review.isOverriddenByHistory) return;

    const actualVehicleTypeId = Number(review.selectedVehicleTypeId);
    const predictedVehicleTypeId = Number(review.predictedVehicleTypeId) || undefined;
    const hasCorrection =
      actualVehicleTypeId > 0 &&
      (!predictedVehicleTypeId || actualVehicleTypeId !== predictedVehicleTypeId);
    if (!hasCorrection || !review.imageBlob) return;

    setVehicleReviews((reviews) =>
      reviews.map((item) =>
        normalizePlate(item.licensePlate) === normalizedLicensePlate
          ? { ...item, feedbackStatus: "submitting" }
          : item,
      ),
    );

    try {
      const feedback = await submitVehicleVisionFeedback({
        imageBlob: review.imageBlob,
        licensePlate: review.licensePlate,
        predictedVehicleTypeId,
        actualVehicleTypeId,
      });
      setVehicleReviews((reviews) =>
        reviews.map((item) =>
          normalizePlate(item.licensePlate) === normalizedLicensePlate
            ? {
                ...item,
                feedbackStatus: "submitted",
                feedbackId: feedback.feedbackId,
                feedbackImageUrl: feedback.imageUrl,
              }
            : item,
        ),
      );
      showToast(`Đã gửi phản hồi loại xe ${review.licensePlate} cho AI.`);
    } catch (err) {
      setVehicleReviews((reviews) =>
        reviews.map((item) =>
          normalizePlate(item.licensePlate) === normalizedLicensePlate
            ? { ...item, feedbackStatus: "error" }
            : item,
        ),
      );
      showToast(
        err instanceof ApiError ? err.message : "Không gửi được phản hồi loại xe cho AI.",
        "error",
      );
    }
  }, [vehicleReviews, showToast]);

  const dismissVehicleReview = useCallback((licensePlate) => {
    const normalizedLicensePlate = normalizePlate(licensePlate);
    dismissedVehicleReviewUntilRef.current.set(
      normalizedLicensePlate,
      Date.now() + DISMISSED_REVIEW_SUPPRESSION_MS,
    );
    setVehicleReviews((reviews) =>
      reviews.filter(
        (review) => normalizePlate(review.licensePlate) !== normalizedLicensePlate,
      ),
    );
  }, []);

  const updateWalkInVehicleType = useCallback((vehicleTypeId) => {
    if (!walkInDraft?.licensePlate) return;
    updateVehicleReviewType(walkInDraft.licensePlate, vehicleTypeId);
  }, [updateVehicleReviewType, walkInDraft]);

  const handleCreatePersonalWalkIn = useCallback(async () => {
    if (!walkInDraft) return;
    const branchId = Number(walkInDraft.branchId);
    if (!branchId) {
      setLookupError("Chưa xác định được chi nhánh của nhân viên để tạo walk-in.");
      return;
    }
    if (walkInDraft.serviceIds.length === 0) {
      setLookupError("Vui lòng chọn ít nhất một dịch vụ cho khách walk-in.");
      return;
    }
    if (!Number(walkInDraft.vehicleTypeId)) {
      setLookupError("Vui lòng chọn loại xe để tính đúng giá dịch vụ walk-in.");
      return;
    }

    setCreatingWalkIn(true);
    try {
      const returnUrl = getPayOsCallbackUrl("/dashboard");
      const bookingResult = await createWalkInBooking({
        branchId,
        licensePlate: walkInDraft.licensePlate,
        serviceIds: walkInDraft.serviceIds.map(Number),
        userId: Number(walkInDraft.userId) > 0 ? Number(walkInDraft.userId) : 0,
        vehicleId: Number(walkInDraft.vehicleId) > 0 ? Number(walkInDraft.vehicleId) : undefined,
        vehicleTypeId: Number(walkInDraft.vehicleTypeId),
        pointsToUse: 0,
        paymentMethod: walkInDraft.paymentMethod,
        returnUrl,
        cancelUrl: returnUrl,
      });
      const isPendingPayOs = Boolean(bookingResult?.paymentUrl);
      const normalizedBooking = normalizeStaffTask(bookingResult);
      const booking = {
        ...normalizedBooking,
        rankName:
          normalizedBooking.rankName && normalizedBooking.rankName !== "—"
            ? normalizedBooking.rankName
            : walkInDraft.customerTierName || "—",
        customerTierPoints:
          normalizedBooking.customerTierPoints ?? walkInDraft.customerTierPoints,
        isVip: normalizedBooking.isVip === true || walkInDraft.isVip === true,
        paymentMethod: walkInDraft.paymentMethod,
        paymentStatus: isPendingPayOs ? "Pending" : "Completed",
      };
      if (isPendingPayOs) {
        setPayOsPayment({
          url: String(bookingResult.paymentUrl),
          bookingId: booking.bookingId || bookingResult.bookingId,
          licensePlate: booking.licensePlate || walkInDraft.licensePlate,
          amount: Number(booking.finalAmount ?? bookingResult.finalAmount ?? 0),
          status: booking.status,
        });
        publishLaneDisplayEvent({
          type: "payment",
          plate: booking.licensePlate || walkInDraft.licensePlate,
          bookingId: booking.bookingId || bookingResult.bookingId,
        });
      } else {
        publishBookingLaneState(booking);
      }
      setWalkInDraft(null);
      setPlateInput("");
      setLookupError("");
      showToast(`Đã tạo walk-in personal cho xe ${walkInDraft.licensePlate}.`);
      await loadStaffTasks();
      if (Number(booking.bookingId)) {
        await applySelectedBooking(booking);
      }
    } catch (err) {
      if (isPayOsConfigurationError(err)) {
        setWalkInDraft((draft) => (draft ? { ...draft, paymentMethod: "Cash" } : draft));
        setLookupError("PayOS chưa được cấu hình trên backend. Vui lòng chọn Tiền mặt để tạo walk-in.");
        return;
      }
      setLookupError(
        err instanceof ApiError
          ? err.message
          : "Không thể tạo walk-in personal. Vui lòng thử lại.",
      );
    } finally {
      setCreatingWalkIn(false);
    }
  }, [walkInDraft, loadStaffTasks, applySelectedBooking, showToast]);

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

      const lookup = await smartLookupLicensePlate(plate);

      if (lookup.customerType === "PreBooked" && lookup.booking) {
        const booking = normalizeStaffTask(lookup.booking);
        await applySelectedBooking(booking, {
          message: plateLookupMessage(booking.status),
        });
        return;
      }

      if (lookup.customerType === "Fleet") {
        setWalkInDraft(null);
        const branchId = Number(laneAssignment?.branchId);
        if (!branchId) {
          setSelectedBooking(null);
          setLookupError(
            "Xe doanh nghiệp hợp lệ, nhưng chưa xác định được chi nhánh/làn của nhân viên để check-in.",
          );
          return;
        }

        try {
          await fleetWalkIn({ licensePlate: plate, branchId });
          setSelectedBooking(null);
          setPlateInput("");
          setLookupError("");
          showToast(`Xe doanh nghiệp ${plate} đã được tiếp nhận và ghi nợ công ty.`);
          return;
        } catch (err) {
          setSelectedBooking(null);
          setLookupError(
            err instanceof ApiError && err.status === 404
              ? "Không tìm thấy phương tiện trong đội xe. Vui lòng chuyển sang luồng khách vãng lai cá nhân và thu tiền mặt/chuyển khoản trực tiếp."
              : err instanceof ApiError
              ? err.message
              : "Không thể check-in xe doanh nghiệp. Vui lòng thử lại.",
          );
          return;
        }
      }

      if (lookup.customerType === "WalkIn") {
        const branchId = Number(laneAssignment?.branchId);
        setSelectedBooking(null);
        if (!branchId) {
          setWalkInDraft(null);
          setLookupError(
            "Khách walk-in cá nhân, nhưng chưa xác định được chi nhánh/làn của nhân viên.",
          );
          return;
        }
        setWalkInDraft({
          licensePlate: plate,
          branchId,
          serviceIds: [],
          userId: lookup.walkInCustomer?.userId ?? 0,
          customerName: lookup.walkInCustomer?.customerName ?? "",
          phoneNumber: lookup.walkInCustomer?.phoneNumber ?? "",
          customerTierName: lookup.walkInCustomer?.customerTierName,
          customerTierPoints: lookup.walkInCustomer?.customerTierPoints,
          isVip: lookup.walkInCustomer?.isVip === true,
          vehicleId: lookup.walkInCustomer?.vehicleId,
          vehicleTypeId: lookup.walkInCustomer?.vehicleTypeId,
          paymentMethod: "Cash",
        });
        setLookupError("Khách walk-in cá nhân. Chọn dịch vụ để tạo check-in.");
        setLookupError(
          lookup.walkInCustomer?.userId
            ? "Khách đã đăng ký nhưng chưa có booking. Chọn dịch vụ để tạo walk-in."
            : "Khách walk-in cá nhân. Chọn dịch vụ để tạo check-in.",
        );
        await loadWalkInServices(branchId);
        return;
      }

      setWalkInDraft(null);
      setSelectedBooking(null);
      setLookupError("Không xác định được loại khách hàng cho biển số này.");
    } catch (err) {
      setWalkInDraft(null);
      setLookupError(err instanceof ApiError ? err.message : "Không thể tra cứu. Vui lòng thử lại.");
      setSelectedBooking(null);
    } finally {
      setLoadingLookup(false);
    }
  }, [plateInput, staffTasks, applySelectedBooking, laneAssignment, loadWalkInServices, showToast]);

  const handleCameraPlateDetected = useCallback(async (plateText, meta = {}) => {
    const plate = String(plateText ?? "").trim().toUpperCase();
    if (!plate) {
      if (meta?.operationMode !== "exit") {
        publishLaneDisplayEvent({ type: "error" });
      }
      return {
        status: "needs-action",
        type: "error",
        message: "Camera chưa đọc được biển số.",
      };
    }

    setPlateInput(plate);
    setLookupError("");
    setBarrierAlert(null);
    setLoadingLookup(true);

    if (meta?.operationMode !== "exit") {
      recordVehicleRecognition(plate, meta);
      publishLaneDisplayEvent({ type: "reading", plate });
    }

    let queueLaneValidated =
      meta?.operationMode === "exit" || !meta?.queueLaneType;

    const validatePhysicalQueueLane = (customer) => {
      if (queueLaneValidated) return null;

      const customerIsVip = isVipQueueCustomer(customer);
      const expectedLaneType = customerIsVip ? "vip" : "regular";
      if (meta.queueLaneType === expectedLaneType) {
        queueLaneValidated = true;
        return null;
      }

      const currentLaneLabel =
        meta.queueLaneType === "vip" ? "làn VIP" : "làn thường";
      const expectedLaneLabel =
        expectedLaneType === "vip" ? "làn VIP" : "làn thường";
      const laneCorrectionTitle =
        expectedLaneType === "vip"
          ? "VUI LÒNG CHUYỂN SANG LÀN VIP"
          : "VUI LÒNG CHUYỂN SANG LÀN THƯỜNG";
      const message = `Xe ${plate} đang đứng sai làn (${currentLaneLabel}). Yêu cầu xe chuyển sang ${expectedLaneLabel} rồi quét lại.`;

      setLookupError(message);
      showToast(message, "error");
      publishLaneDisplayEvent({
        type: "assistance",
        plate,
        title: laneCorrectionTitle,
        reasonCode: "wrong_queue_lane",
      });

      return {
        status: "needs-action",
        type: "error",
        message,
      };
    };

    const syncFreshBooking = async (booking) => {
      const freshTasks = await loadStaffTasks();
      const updated = Array.isArray(freshTasks)
        ? freshTasks.find((task) => Number(task.bookingId) === Number(booking.bookingId))
        : null;
      const next = updated ?? booking;
      await applySelectedBooking(next);
      return next;
    };

    const checkInBooking = async (booking) => {
      let next = booking;

      if (next.status === "Pending") {
        if (!canCheckIn(next)) {
          await applySelectedBooking(next);
          publishLaneDisplayEvent({
            type: "payment",
            plate: next.licensePlate || plate,
            bookingId: next.bookingId,
          });
          return next;
        }
        const checkInResult = await staffCheckinBooking(next.bookingId);
        if (checkInResult.isAssigned && checkInResult.barrierCommandId) {
          const entryGate = resolveEntryBarrierGate({
            barrierId: checkInResult.barrierId,
            queueLaneType: meta.queueLaneType,
            customer: next,
          });
          const opened = await executeBarrierCommand({
            gate: entryGate,
            commandId: checkInResult.barrierCommandId,
            licensePlate: checkInResult.licensePlate || next.licensePlate,
            expiresAt: checkInResult.barrierCommandExpiresAt,
            source: "staff-check-in",
          }).then(wasBarrierCommandAccepted).catch(() => false);
          if (!opened) {
            setBarrierAlert({
              type: "error",
              message: `Xe ${checkInResult.licensePlate || next.licensePlate} đã check-in nhưng ESP32 chưa mở được barie ${getBarrierGateLabel(entryGate)}.`,
            });
          }
        }
        const admittedBooking =
          mergeStaffCheckInResult(next, checkInResult) ??
          { ...next, status: "Checked-in" };
        next = await syncFreshBooking(admittedBooking);
      } else {
        next = await syncFreshBooking(next);
      }

      publishBookingLaneState(next);
      return next;
    };

    const fallbackCameraCheckIn = async () => {
      const cameraBooking = await cameraCheckInByPlate(plate);
      if (cameraBooking.barrierCommandId) {
        const entryGate = resolveEntryBarrierGate({
          barrierId: cameraBooking.barrierId,
          queueLaneType: meta.queueLaneType,
          customer: cameraBooking,
        });
        const opened = await executeBarrierCommand({
          gate: entryGate,
          commandId: cameraBooking.barrierCommandId,
          licensePlate: cameraBooking.licensePlate || plate,
          expiresAt: cameraBooking.barrierCommandExpiresAt,
          source: "camera-check-in",
        }).then(wasBarrierCommandAccepted).catch(() => false);
        if (!opened) {
          setBarrierAlert({
            type: "error",
            message: `Xe ${cameraBooking.licensePlate || plate} đã check-in nhưng ESP32 chưa mở được barie ${getBarrierGateLabel(entryGate)}.`,
          });
        }
      }
      const freshTasks = await loadStaffTasks();
      const freshBooking = Array.isArray(freshTasks)
        ? freshTasks.find(
            (task) =>
              Number(task.bookingId) === Number(cameraBooking.bookingId),
          ) ??
          freshTasks.find(
            (task) =>
              normalizePlate(task?.licensePlate ?? task?.plateNumber) ===
              normalizePlate(plate),
          )
        : null;
      const authoritativeBooking = freshBooking ?? cameraBooking;
      await applySelectedBooking(authoritativeBooking);
      publishBookingLaneState(authoritativeBooking);
      const message = getCheckInSuccessMessage(authoritativeBooking);
      showToast(message);
      return { message };
    };

    try {
      if (meta?.operationMode === 'exit') {
        const recentManualCompletion = findRecentManualCompletion(plate);
        if (recentManualCompletion) {
          const message = `Xe ${plate} đã hoàn thành thủ công — Staff cần mở barie cổng ra bằng điều khiển thủ công.`;
          setBarrierAlert({ type: 'manual', message });
          showToast(message);
          return { status: 'needs-action', type: 'warning', message };
        }

        try {
          const completed = await cameraCheckOutByPlate(plate);
          const exitCommandId =
            completed.exitBarrierCommandId ?? completed.barrierCommandId;
          let barrierOpened = null;
          if (exitCommandId) {
            const exitGate = gateFromBarrierId(completed.barrierId) ?? BARRIER_GATES.EXIT;
            barrierOpened = await executeBarrierCommand({
              gate: exitGate,
              commandId: exitCommandId,
              licensePlate: completed.licensePlate || plate,
              expiresAt: completed.barrierCommandExpiresAt,
              source: "camera-check-out",
            }).then(wasBarrierCommandAccepted).catch(() => false);
          }
          const duration = Number(completed.actualDurationMinutes);
          const durationLabel = Number.isFinite(duration) && duration > 0
            ? ` (${duration} phút)`
            : '';
          const message = barrierOpened === true
            ? `Xe ${plate} hoàn tất dịch vụ${durationLabel} — ESP32 đã nhận lệnh mở barie.`
            : barrierOpened === false
              ? `Xe ${plate} hoàn tất dịch vụ${durationLabel} nhưng ESP32 chưa mở được barie.`
              : `Xe ${plate} hoàn tất dịch vụ${durationLabel} — đang chờ lệnh realtime mở barie.`;
          setBarrierAlert({
            type: barrierOpened === true ? 'success' : barrierOpened === false ? 'error' : 'manual',
            message,
            booking: completed,
          });
          setStaffTasks((tasks) =>
            tasks.filter((task) => Number(task.bookingId) !== Number(completed.bookingId)),
          );
          setLaneOccupancies((current) =>
            current?.filter(
              (occupancy) =>
                normalizePlate(occupancy.licensePlate) !== normalizePlate(plate),
            ) ?? current,
          );
          setSelectedBooking((booking) =>
            Number(booking?.bookingId) === Number(completed.bookingId) ? null : booking,
          );
          showToast(message);
          await loadStaffTasks();
          return { message };
        } catch (checkoutError) {
          const rawMessage = checkoutError instanceof ApiError
            ? checkoutError.message
            : 'Không thể check-out xe tại cổng ra.';
          const normalizedMessage = rawMessage.toLowerCase();
          const unpaid = normalizedMessage.includes('unpaid') || normalizedMessage.includes('chưa thanh toán');
          const notFound = normalizedMessage.includes('no active wash session') || normalizedMessage.includes('not found');
          const message = unpaid
            ? `Xe ${plate} chưa thanh toán — barie giữ đóng.`
            : notFound
              ? `Không tìm thấy lượt rửa đang hoạt động cho xe ${plate}.`
              : rawMessage;
          setBarrierAlert({ type: 'error', message });
          setLookupError(message);
          showToast(message, 'error');
          throw checkoutError;
        }
      }

      const normalized = normalizePlate(plate);
      const existing = staffTasks.find(
        (task) => normalizePlate(task.licensePlate) === normalized,
      );

      if (existing) {
        updateVehicleReviewContext(plate, "Booking");
        const laneMismatch = validatePhysicalQueueLane(existing);
        if (laneMismatch) {
          await applySelectedBooking(existing, {
            message: laneMismatch.message,
          });
          return laneMismatch;
        }
        const updated = await checkInBooking(existing);
        return {
          status: updated.status === "Pending" ? "needs-action" : undefined,
          message: `${plate} đang ở hàng đợi Staff (${getBookingStatusLabel(updated.status)}).`,
        };
      }

      const lookup = await smartLookupLicensePlate(plate);
      updateVehicleReviewContext(plate, lookup.customerType);

      if (lookup.customerType === "PreBooked" && lookup.booking) {
        const booking = normalizeStaffTask(lookup.booking);
        const laneMismatch = validatePhysicalQueueLane(booking);
        if (laneMismatch) {
          await applySelectedBooking(booking, {
            message: laneMismatch.message,
          });
          return laneMismatch;
        }

        if (booking.status === "Pending") {
          try {
            const updated = await checkInBooking(booking);
            const message =
              updated.status === "Pending"
                ? `Xe ${plate} chưa hoàn tất thanh toán nên chưa thể check-in.`
                : getCheckInSuccessMessage(updated);
            showToast(message);
            return { message };
          } catch {
            return fallbackCameraCheckIn();
          }
        }

        await applySelectedBooking(booking, {
          message: plateLookupMessage(booking.status),
        });
        publishBookingLaneState(booking);

        return {
          status:
            booking.status === "Checked-in" || booking.status === "Processing"
              ? undefined
              : "needs-action",
          message: `Booking #${booking.bookingId} đang ở trạng thái ${getBookingStatusLabel(booking.status)}.`,
        };
      }

      if (lookup.customerType === "Fleet") {
        const laneMismatch = validatePhysicalQueueLane(lookup);
        if (laneMismatch) return laneMismatch;

        const branchId = Number(laneAssignment?.branchId);
        setWalkInDraft(null);
        setSelectedBooking(null);

        if (!branchId) {
          const message = "Đã nhận diện xe doanh nghiệp nhưng chưa xác định được chi nhánh Staff.";
          setLookupError(message);
          publishLaneDisplayEvent({ type: "error", plate });
          return { status: "needs-action", type: "error", message };
        }

        const fleetResult = await fleetWalkIn({ licensePlate: plate, branchId });
        await loadStaffTasks();
        if (fleetResult?.laneId || fleetResult?.laneName) {
          publishLaneDisplayEvent({
            type: "assigned",
            plate,
            bookingId: fleetResult?.bookingId ?? fleetResult?.fleetWashLogId,
            laneId: fleetResult?.laneId,
            laneName: fleetResult?.laneName,
          });
        } else {
          publishLaneDisplayEvent({ type: "waiting", plate });
        }
        showToast(`Camera AI đã tiếp nhận xe doanh nghiệp ${plate}.`);
        return { message: `Đã tiếp nhận xe doanh nghiệp ${plate}.` };
      }

      if (lookup.customerType === "WalkIn") {
        const laneMismatch = validatePhysicalQueueLane({
          ...lookup,
          ...lookup.walkInCustomer,
        });
        if (laneMismatch) return laneMismatch;

        const branchId = Number(laneAssignment?.branchId);
        setSelectedBooking(null);

        if (!branchId) {
          const message = "Đã nhận diện khách vãng lai nhưng chưa xác định được chi nhánh Staff.";
          setWalkInDraft(null);
          setLookupError(message);
          publishLaneDisplayEvent({ type: "error", plate });
          return { status: "needs-action", type: "error", message };
        }

        const vehicleRecognition = meta?.vehicleRecognition;
        const primaryVisionResult = vehicleRecognition?.primaryResult;
        const predictedVehicleTypeId = findVehicleTypeIdByName(
          vehicleTypes,
          primaryVisionResult?.vehicleType,
        );
        const storedVehicleTypeId =
          Number(lookup.walkInCustomer?.vehicleTypeId) || undefined;
        const selectedVehicleTypeId =
          storedVehicleTypeId ?? predictedVehicleTypeId;

        setWalkInDraft({
          licensePlate: plate,
          branchId,
          serviceIds: [],
          userId: lookup.walkInCustomer?.userId ?? 0,
          customerName: lookup.walkInCustomer?.customerName ?? "",
          phoneNumber: lookup.walkInCustomer?.phoneNumber ?? "",
          customerTierName: lookup.walkInCustomer?.customerTierName,
          customerTierPoints: lookup.walkInCustomer?.customerTierPoints,
          isVip: lookup.walkInCustomer?.isVip === true,
          vehicleId: lookup.walkInCustomer?.vehicleId,
          vehicleTypeId: selectedVehicleTypeId,
          paymentMethod: "Cash",
        });
        if (selectedVehicleTypeId) {
          updateVehicleReviewType(plate, selectedVehicleTypeId);
        }
        setLookupError("Camera đã nhận diện khách vãng lai cá nhân. Chọn dịch vụ để tạo check-in.");
        publishLaneDisplayEvent({
          type: "assistance",
          plate,
          title: "NHÂN VIÊN ĐANG ĐẾN HỖ TRỢ",
          reasonCode: lookup.walkInCustomer?.userId
            ? "customer_without_booking"
            : "walk_in_assistance",
          message: lookup.walkInCustomer?.userId
            ? "Quý khách chưa có lịch rửa hôm nay."
            : "Nhân viên sẽ hỗ trợ tạo lượt rửa cho quý khách",
        });
        await loadWalkInServices(branchId);
        return { status: "needs-action", message: `Đã nhận diện khách vãng lai: ${plate}.` };
      }

      const message = "Tra cứu biển số từ camera không trả về loại khách được hỗ trợ.";
      setSelectedBooking(null);
      setWalkInDraft(null);
      setLookupError(message);
      publishLaneDisplayEvent({ type: "error", plate });
      return { status: "needs-action", type: "error", message };
    } catch (err) {
      if (meta?.operationMode === 'exit') throw err;
      if (meta?.queueLaneType && !queueLaneValidated) {
        const message = `Chưa xác định được hạng của xe ${plate}; giữ nguyên check-in và yêu cầu Staff kiểm tra làn.`;
        setWalkInDraft(null);
        setSelectedBooking(null);
        setLookupError(message);
        publishLaneDisplayEvent({
          type: "assistance",
          plate,
          message: "Vui lòng chờ Staff kiểm tra làn",
        });
        return { status: "needs-action", type: "error", message };
      }
      try {
        return await fallbackCameraCheckIn();
      } catch (fallbackErr) {
        const message =
          fallbackErr instanceof ApiError
            ? fallbackErr.message
            : err instanceof ApiError
              ? err.message
              : "Camera check-in thất bại.";
        setWalkInDraft(null);
        setSelectedBooking(null);
        setLookupError(message);
        publishLaneDisplayEvent({ type: "error", plate });
        throw fallbackErr instanceof Error ? fallbackErr : err;
      }
    } finally {
      setLoadingLookup(false);
    }
  }, [
    applySelectedBooking,
    executeBarrierCommand,
    laneAssignment,
    loadStaffTasks,
    loadWalkInServices,
    recordVehicleRecognition,
    showToast,
    staffTasks,
    updateVehicleReviewContext,
    updateVehicleReviewType,
    vehicleTypes,
  ]);

  const handleStartProcessing = useCallback(async () => {
    if (!selectedBooking || selectedBooking.status !== "Checked-in") return;
    if (!canStartWash(selectedBooking)) {
      showToast(
        !selectedBooking.processingLaneId && !selectedBooking.processingLaneName
          ? "Xe đang chờ được phân làn."
          : "Booking chưa hoàn tất thanh toán.",
        "error",
      );
      return;
    }
    setConfirming(true);
    try {
      await updateStaffBookingStatus(selectedBooking.bookingId, "Processing");
      const freshTasks = await loadStaffTasks();
      let processingBooking = freshTasks?.find(
        (task) => Number(task.bookingId) === Number(selectedBooking.bookingId),
      ) ?? {
        ...selectedBooking,
        status: "Processing",
        completedTime: null,
        actualDurationMinutes: null,
      };
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
  }, [selectedBooking, loadStaffTasks, showToast]);

  const handleCheckin = useCallback(async () => {
    if (!selectedBooking || selectedBooking.status !== "Pending") return;
    if (!canCheckIn(selectedBooking)) {
      showToast("Booking chưa hoàn tất thanh toán nên chưa thể check-in.", "error");
      publishLaneDisplayEvent({
        type: "payment",
        plate: selectedBooking.licensePlate,
        bookingId: selectedBooking.bookingId,
      });
      return;
    }
    setCheckingIn(true);
    try {
      const checkInResult = await staffCheckinBooking(selectedBooking.bookingId);
      if (checkInResult.isAssigned && checkInResult.barrierCommandId) {
        const entryGate = resolveEntryBarrierGate({
          barrierId: checkInResult.barrierId,
          customer: selectedBooking,
        });
        const opened = await executeBarrierCommand({
          gate: entryGate,
          commandId: checkInResult.barrierCommandId,
          licensePlate: checkInResult.licensePlate || selectedBooking.licensePlate,
          expiresAt: checkInResult.barrierCommandExpiresAt,
          source: "staff-check-in",
        }).then(wasBarrierCommandAccepted).catch(() => false);
        if (!opened) {
          setBarrierAlert({
            type: "error",
            message: `Xe ${checkInResult.licensePlate || selectedBooking.licensePlate} đã check-in nhưng ESP32 chưa mở được barie ${getBarrierGateLabel(entryGate)}.`,
          });
        }
      }
      const responseBooking = mergeStaffCheckInResult(
        selectedBooking,
        checkInResult,
      );
      const freshTasks = await loadStaffTasks();
      const freshBooking = freshTasks?.find(
        (t) => Number(t.bookingId) === Number(selectedBooking.bookingId),
      );
      const updated = freshBooking
        ? {
            ...responseBooking,
            ...freshBooking,
            barrierCommandId: checkInResult.barrierCommandId,
            barrierCommandCreated: checkInResult.barrierCommandCreated,
            barrierId: checkInResult.barrierId,
            barrierCommandExpiresAt: checkInResult.barrierCommandExpiresAt,
            admissionStatus: checkInResult.admissionStatus,
          }
        : responseBooking;
      if (updated) {
        setSelectedBooking(updated);
        publishBookingLaneState(updated);
        showToast(getCheckInSuccessMessage(updated));
      } else {
        const message =
          "Backend trả về thành công nhưng booking chưa chuyển sang CheckedIn/Processing. " +
          "Vui lòng kiểm tra lại trạng thái làn trước khi cho xe qua barie.";
        setLookupError(message);
        showToast(message, "error");
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
  }, [selectedBooking, loadStaffTasks, executeBarrierCommand, showToast]);

  const handleComplete = useCallback(
    async (vehicle) => {
      const bookingId = vehicle?.bookingId;
      if (!bookingId) return;
      const task = vehicle;
      const processingKey = getProcessingVehicleKey(vehicle);
      const confirmed = window.confirm(
        `Chỉ dùng khi camera cổng ra không nhận diện được biển số ${task?.licensePlate ?? ""}.\n\n` +
          "Booking sẽ được hoàn thành và làn được giải phóng. Staff phải mở barie cổng ra bằng điều khiển thủ công.\n\nTiếp tục?",
      );
      if (!confirmed) return;

      setCompletingId(processingKey);
      try {
        await updateStaffBookingStatus(bookingId, "Completed");
        rememberManualCompletion(task);
        const message = `Xe ${task?.licensePlate ?? bookingId} đã hoàn thành thủ công — hãy mở barie cổng ra bằng điều khiển thủ công.`;
        setBarrierAlert({ type: "manual", message });
        showToast(message);
        setStaffTasks((prev) =>
          prev.filter((t) => Number(t.bookingId) !== Number(bookingId)),
        );
        setLaneOccupancies((current) =>
          current?.filter(
            (occupancy) => Number(occupancy.bookingId) !== Number(bookingId),
          ) ?? current,
        );
        if (selectedBooking?.bookingId === bookingId) {
          setSelectedBooking(null);
          setPlateInput("");
        }
        await loadStaffTasks();
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
    [selectedBooking, loadStaffTasks, showToast],
  );

  const handleSkip = useCallback(() => {
    setSelectedBooking(null);
    setWalkInDraft(null);
    setPlateInput("");
    setLookupError("");
  }, []);

  const openExtraUsage = useCallback((booking) => {
    setExtraUsageBooking(booking);
    setExtraUsageForm({ materialId: "", quantity: "", note: "" });
  }, []);

  const handleExtraUsageSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (
      !extraUsageBooking?.bookingId
      || submittingExtraUsage
      || !extraUsageForm.materialId
      || Number(extraUsageForm.quantity) <= 0
    ) return;
    setSubmittingExtraUsage(true);
    try {
      await reportStaffExtraMaterialUsage(extraUsageBooking.bookingId, {
        materialId: Number(extraUsageForm.materialId),
        quantity: Number(extraUsageForm.quantity),
        note: extraUsageForm.note.trim() || null,
      });
      setExtraUsageBooking(null);
      setExtraUsageForm({ materialId: "", quantity: "", note: "" });
      showToast("Đã gửi yêu cầu vật tư phát sinh.");
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? err.message
          : "Không gửi được yêu cầu vật tư phát sinh.",
        "error",
      );
    } finally {
      setSubmittingExtraUsage(false);
    }
  }, [extraUsageBooking, extraUsageForm, submittingExtraUsage, showToast]);

  const handleSelectFromQueue = useCallback(
    async (item) => {
      setWalkInDraft(null);
      setPlateInput(item.licensePlate);
      setLookupError("");
      await applySelectedBooking(item);
    },
    [applySelectedBooking],
  );

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
      {payOsPayment && (
        <PayOsQrModal
          payment={payOsPayment}
          onClose={() => setPayOsPayment(null)}
          onPaid={() => verifyPayOsPaymentStatus(payOsPayment)}
          verifying={verifyingPayOsPayment}
        />
      )}
      {extraUsageBooking && (
        <ExtraMaterialUsageModal
          booking={extraUsageBooking}
          form={extraUsageForm}
          materials={materials}
          saving={submittingExtraUsage}
          onChange={(patch) => setExtraUsageForm((form) => ({ ...form, ...patch }))}
          onClose={() => !submittingExtraUsage && setExtraUsageBooking(null)}
          onSubmit={handleExtraUsageSubmit}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sora text-2xl font-semibold text-on-surface">
            Bảng điều khiển Staff
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:border-primary hover:text-primary"
            onClick={() => window.open('/display/lane', 'luxewash-lane-display')}
            title="Mở màn hình chỉ dẫn làn ở cửa sổ riêng"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Màn hình chỉ dẫn
          </button>
          <span className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <span className="material-symbols-outlined text-[16px]">login</span>
            {checkedInQueue.length} check-in
          </span>
          <span className="flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary">
            <span className="material-symbols-outlined text-[16px]">wash</span>
            {processingVehicles.length} đang rửa
          </span>
        </div>
      </div>

      {initialLoading && (
        <div
          className="mb-4 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-primary"
          role="status"
        >
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
          Đang đồng bộ hàng chờ; các chức năng khác đã sẵn sàng.
        </div>
      )}

      <BarrierDevicePanel controller={barrierController} />

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7 2xl:col-span-8">
          <LiveLprFeed
            laneLabel={laneLabel}
            onPlateDetected={handleCameraPlateDetected}
          />
        </div>
        <div className="min-w-0 space-y-4 xl:col-span-5 2xl:col-span-4">
          <PlateLookupPanel
            plateInput={plateInput}
            onPlateChange={setPlateInput}
            onSearch={handleSearch}
            loading={loadingLookup}
            checkedInCount={checkedInQueue.length}
            processingCount={processingVehicles.length}
          />
          {walkInDraft ? (
            <PersonalWalkInPanel
              draft={walkInDraft}
              services={walkInServices}
              vehicleTypes={vehicleTypes}
              loadingServices={loadingWalkInServices}
              loadingVehicleTypes={loadingVehicleTypes}
              creating={creatingWalkIn}
              onToggleService={toggleWalkInService}
              onVehicleTypeChange={updateWalkInVehicleType}
              onPaymentMethodChange={updateWalkInPaymentMethod}
              onSubmit={handleCreatePersonalWalkIn}
              onCancel={() => {
                setWalkInDraft(null);
                setLookupError("");
              }}
            />
          ) : (
            <CustomerInfoPanel
              booking={selectedBooking}
              loading={loadingLookup}
              error={lookupError}
              onStartProcessing={handleStartProcessing}
              onCheckin={handleCheckin}
              onReportExtraUsage={openExtraUsage}
              onSkip={handleSkip}
              onViewDetail={setDetailBooking}
              confirming={confirming}
              checkingIn={checkingIn}
            />
          )}
        </div>
      </div>

      <div className="mt-4">
        <VehicleRecognitionReviewPanel
          reviews={vehicleReviews}
          vehicleTypes={vehicleTypes}
          loadingVehicleTypes={loadingVehicleTypes}
          onVehicleTypeChange={updateVehicleReviewType}
          onConfirm={confirmVehicleReview}
          onDismiss={dismissVehicleReview}
        />
      </div>

      {barrierAlert && (
        <div
          className={`mb-4 flex items-start gap-3 rounded-xl border px-5 py-4 ${
            barrierAlert.type === 'success'
              ? 'border-primary/40 bg-primary/10 text-primary'
              : barrierAlert.type === 'manual'
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-800'
                : 'border-error/50 bg-error-container/30 text-error'
          }`}
          role="alert"
        >
          <span className="material-symbols-outlined text-3xl">
            {barrierAlert.type === 'success'
              ? 'garage_door'
              : barrierAlert.type === 'manual'
                ? 'warning'
                : 'block'}
          </span>
          <div>
            <p className="font-sora text-lg font-bold uppercase">{barrierAlert.message}</p>
            <p className="mt-1 text-sm opacity-85">
              {barrierAlert.type === 'success'
                ? 'Thanh toán hợp lệ, lượt rửa đã hoàn thành và vật tư đã được ghi nhận.'
                : barrierAlert.type === 'manual'
                  ? 'Hệ thống không tự mở barie trong luồng dự phòng này.'
                  : 'Barie vẫn đóng. Vui lòng xử lý với khách hàng trước khi quét lại.'}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div>
          <CheckedInQueuePanel
            items={checkedInQueue}
            selectedBookingId={selectedBooking?.bookingId}
            onSelect={handleSelectFromQueue}
          />
        </div>
        <div>
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
