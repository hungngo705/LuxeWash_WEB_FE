import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, createManagerLane, fetchManagerLanes, updateManagerLane, deleteManagerLane } from "../../api";
import ConfirmDialog from "../../components/admin/shared/ConfirmDialog";
import FormModal from "../../components/admin/shared/FormModal";
import PageHeader from "../../components/admin/shared/PageHeader";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DataTable from "../../components/ui/DataTable";
import Input from "../../components/ui/Input";
import { useToast } from "../../components/ui/Toast";

const emptyForm = { name: "", isBusinessLane: false };

export default function ManagerLanesPage() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingLane, setEditingLane] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const laneStats = useMemo(() => {
    const active = lanes.filter((lane) => lane.isActive !== false).length;
    const business = lanes.filter((lane) => lane.isBusinessLane).length;

    return {
      total: lanes.length,
      active,
      consumer: Math.max(lanes.length - business, 0),
      business,
    };
  }, [lanes]);

  const loadLanes = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setLanes(await fetchManagerLanes());
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Không tải được danh sách làn rửa",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async manager lanes load
    loadLanes();
  }, [loadLanes]);

  const openCreate = () => {
    if (saving || deleting) return;
    setEditingLane(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (lane) => {
    if (saving || deleting) return;
    setEditingLane(lane);
    setForm({ name: lane.name, isBusinessLane: lane.isBusinessLane, isVipLane: lane.isVipLane });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (saving || deleting) return;
    if (!form.name.trim()) {
      toast.warning("Vui lòng nhập tên làn");
      return;
    }
    if (form.name.trim().length > 50) {
      toast.warning("Tên làn không được dài quá 50 ký tự");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        isBusinessLane: form.isBusinessLane,
      };
      if (editingLane) {
        await updateManagerLane(editingLane.laneId, {
          ...payload,
          branchId: editingLane.branchId,
          isActive: editingLane.isActive,
          isVipLane: form.isVipLane,
        });
      } else {
        await createManagerLane(payload);
      }
      toast.success(editingLane ? "Đã cập nhật làn rửa" : "Đã thêm làn rửa");
      setModalOpen(false);
      await loadLanes();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Không lưu được làn rửa",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting || saving) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setDeleting(true);
    try {
      await deleteManagerLane(target.laneId);
      setLanes((prev) => prev.map((lane) => lane.laneId === target.laneId ? { ...lane, isActive: false } : lane));
      toast.success(`Đã ngừng hoạt động làn “${target.name}”`);
      await loadLanes();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không xóa được làn rửa");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Cơ sở vận hành"
        title="Làn rửa"
        description="Quản lý các làn rửa tại chi nhánh của bạn"
        actionLabel="Thêm làn"
        actionIcon="add_road"
        onAction={openCreate}
        secondary={
          <Link
            to="/manager/incidents"
            className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-primary hover:bg-surface-variant"
          >
            Báo buồng hỏng
          </Link>
        }
      />

      <div className="soft-shadow mb-5 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex flex-col gap-4 border-b border-outline-variant/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined rounded-lg bg-secondary-container/50 p-2 text-secondary">
              garage
            </span>
            <div>
              <h2 className="font-sora text-base font-semibold text-on-surface">
                Thống kê làn
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Theo dõi loại làn và trạng thái hoạt động.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-outline-variant/50 md:grid-cols-4 md:divide-y-0">
          {[
            { label: "Tổng làn", value: laneStats.total, icon: "view_stream" },
            {
              label: "Đang hoạt động",
              value: laneStats.active,
              icon: "check_circle",
            },
            {
              label: "Tiêu dùng",
              value: laneStats.consumer,
              icon: "directions_car",
            },
            {
              label: "Doanh nghiệp",
              value: laneStats.business,
              icon: "business_center",
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3">
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                {item.icon}
              </span>
              <div>
                <p className="text-lg font-semibold leading-6 text-on-surface">
                  {item.value}
                </p>
                <p className="text-xs text-on-surface-variant">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="mb-4 flex justify-between rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button
            type="button"
            className="text-sm text-error"
            onClick={loadLanes}
          >
            Thử lại
          </button>
        </div>
      )}

      <DataTable
        data={lanes}
        loading={loading}
        rowKey="laneId"
        minWidth="640px"
        emptyIcon="garage"
        emptyTitle="Chưa có làn rửa"
        emptyMessage="Tạo làn rửa để bắt đầu phân công cho chi nhánh."
        columns={[
          {
            key: "laneId",
            label: "ID",
            width: "80px",
            render: (row) => (
              <span className="font-mono text-on-surface-variant">
                #{row.laneId}
              </span>
            ),
          },
          {
            key: "name",
            label: "Tên làn",
            render: (row) => (
              <span className="font-medium text-on-surface">{row.name}</span>
            ),
          },
          {
            key: "isBusinessLane",
            label: "Loại làn",
            render: (row) =>
              row.isBusinessLane ? (
                <span className="inline-flex items-center rounded-full border border-secondary/30 bg-secondary-container/40 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-on-secondary-container uppercase">
                  Doanh nghiệp
                </span>
              ) : (
                <span className="text-on-surface-variant">Tiêu dùng</span>
              ),
          },
          {
            key: "isVipLane",
            label: "VIP",
            width: "80px",
            render: (row) => row.isVipLane ? "Có" : "Không",
          },
          {
            key: "isActive",
            label: "Trạng thái",
            width: "140px",
            render: (row) => (
              <StatusBadge
                status={row.isActive !== false ? "Active" : "Inactive"}
              />
            ),
          },
          {
            key: "actions",
            label: "Thao tác",
            width: "170px",
            align: "right",
            renderActions: (row) => (
              <div className="flex justify-end gap-1">
              <button
                type="button"
                aria-label={`Sửa làn ${row.name}`}
                disabled={saving || deleting}
                onClick={() => openEdit(row)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Sửa
              </button>
              <button
                type="button"
                aria-label={`Xóa làn ${row.name}`}
                disabled={saving || deleting || row.isActive === false}
                title={row.isActive === false ? "Làn đã ngừng hoạt động" : "Xóa (ngừng hoạt động làn)"}
                onClick={() => setDeleteTarget(row)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-medium text-error hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Xóa
              </button>
              </div>
            ),
          },
        ]}
      />

      <FormModal
        open={modalOpen}
        title={editingLane ? "Sửa làn rửa" : "Thêm làn rửa"}
        submitting={saving}
        submitLabel={editingLane ? "Lưu thay đổi" : "Thêm làn"}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <Input
            label="Tên làn"
            required
            value={form.name}
            maxLength={50}
            disabled={saving}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="VD: Làn 1..."
            iconLeft="garage"
          />
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary"
              checked={form.isBusinessLane}
              disabled={saving}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  isBusinessLane: e.target.checked,
                }))
              }
            />
            <span className="text-sm font-medium text-on-surface">
              Dành cho doanh nghiệp
            </span>
          </label>
          {editingLane && (
            <>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isVipLane}
                  disabled={saving}
                  onChange={(e) => setForm((prev) => ({ ...prev, isVipLane: e.target.checked }))}
                  className="h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary"
                />
                <span className="text-sm font-medium text-on-surface">Làn VIP</span>
              </label>
              <p className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
                Đổi loại làn có thể ảnh hưởng việc phân xe và công suất phục vụ. Chi nhánh và trạng thái hoạt động được giữ nguyên. Nếu buồng hỏng, hãy dùng chức năng “Báo buồng hỏng”.
              </p>
            </>
          )}
        </div>
      </FormModal>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa làn rửa"
        message={`Làn “${deleteTarget?.name ?? ''}” sẽ được ngừng hoạt động, không xóa dữ liệu lịch sử. Chỉ thực hiện sau khi bảo đảm làn không còn xe và đã xử lý các lịch liên quan; Nếu làn bị hỏng, hãy dùng “Báo buồng hỏng”.`}
        confirmLabel="Xóa (ngừng hoạt động)"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
}
