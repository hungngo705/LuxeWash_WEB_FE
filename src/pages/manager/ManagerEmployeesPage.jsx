import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createManagerStaff,
  fetchManagerStaffs,
  normalizeManagerStaff,
} from '../../api'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/Toast'

const emptyForm = { fullName: '', phoneNumber: '', password: '' }

export default function ManagerEmployeesPage() {
  const [staffs, setStaffs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const loadStaffs = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchManagerStaffs()
      setStaffs(Array.isArray(data) ? data.map(normalizeManagerStaff) : [])
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách nhân viên')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStaffs()
  }, [loadStaffs])

  const handleSave = async () => {
    if (saving) return

    const fullName = form.fullName.trim()
    const phoneNumber = form.phoneNumber.trim()
    const password = form.password

    if (!fullName) {
      toast.warning('Vui lòng nhập họ tên')
      return
    }
    if (!phoneNumber) {
      toast.warning('Vui lòng nhập số điện thoại')
      return
    }
    if (phoneNumber.length < 9) {
      toast.warning('Số điện thoại không hợp lệ')
      return
    }
    if (!password || password.length < 6) {
      toast.warning('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setSaving(true)
    try {
      await createManagerStaff({ fullName, phoneNumber, password, role: 'Staff' })
      toast.success('Đã thêm nhân viên mới')
      setModalOpen(false)
      setForm(emptyForm)
      await loadStaffs()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không lưu được nhân viên')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Nhân sự"
        title="Nhân viên"
        description="Quản lý tài khoản nhân viên tại chi nhánh của bạn"
        actionLabel="Thêm nhân viên"
        actionIcon="person_add"
        onAction={() => {
          setForm(emptyForm)
          setModalOpen(true)
        }}
      />

      {loadError && (
        <div className="mb-4 flex justify-between rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button type="button" className="text-sm text-error" onClick={loadStaffs}>
            Thử lại
          </button>
        </div>
      )}

      <DataTable
        data={staffs}
        loading={loading}
        minWidth="640px"
        emptyIcon="badge"
        emptyTitle="Chưa có nhân viên"
        emptyMessage="Thêm nhân viên để bắt đầu phân công làn rửa."
        columns={[
          {
            key: 'userId',
            label: 'ID',
            width: '80px',
            render: (staff) => (
              <span className="font-mono text-on-surface-variant">#{staff.userId}</span>
            ),
          },
          {
            key: 'fullName',
            label: 'Họ tên',
            render: (staff) => <span className="font-medium text-on-surface">{staff.fullName}</span>,
          },
          {
            key: 'phoneNumber',
            label: 'Số điện thoại',
            render: (staff) => (
              <span className="text-on-surface-variant">{staff.phoneNumber}</span>
            ),
            tdClassName: 'text-on-surface-variant',
          },
          {
            key: 'status',
            label: 'Trạng thái',
            width: '140px',
            render: (staff) => (
              <StatusBadge status={staff.status === 'Active' ? 'Active' : 'Inactive'} />
            ),
          },
        ]}
      />

      <FormModal
        open={modalOpen}
        title="Thêm nhân viên"
        submitLabel={saving ? 'Đang lưu...' : 'Lưu'}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Họ tên</span>
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.fullName}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="VD: Nguyễn Văn A"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Số điện thoại</span>
            <input
              type="tel"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.phoneNumber}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              placeholder="VD: 0901234567"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Mật khẩu</span>
            <input
              type="password"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
              value={form.password}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Tối thiểu 6 ký tự"
            />
          </label>
        </div>
      </FormModal>
    </div>
  )
}