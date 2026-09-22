import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createManagerStaff,
  fetchManagerStaffs,
  normalizeManagerStaff,
} from '../../api'
import FormModal from '../../components/admin/shared/FormModal'
import EmptyState from '../../components/admin/shared/EmptyState'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import { isValidPhoneNumber, isValidPassword, PHONE_ERROR_MESSAGE, PASSWORD_ERROR_MESSAGE } from '../../utils/validation'

const emptyForm = { fullName: '', phoneNumber: '', password: '' }

export default function ManagerEmployeesPage() {
  const [staffs, setStaffs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

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
      showToast('Vui lòng nhập họ tên')
      return
    }
    if (!phoneNumber) {
      showToast('Vui lòng nhập số điện thoại')
      return
    }
    if (!isValidPhoneNumber(phoneNumber)) {
      showToast(PHONE_ERROR_MESSAGE)
      return
    }
    if (!isValidPassword(password)) {
      showToast(PASSWORD_ERROR_MESSAGE)
      return
    }

    setSaving(true)
    try {
      await createManagerStaff({ fullName, phoneNumber, password, role: 'Staff' })
      showToast('Đã thêm nhân viên mới')
      setModalOpen(false)
      setForm(emptyForm)
      await loadStaffs()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không lưu được nhân viên')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Nhân viên"
        description="Quản lý tài khoản nhân viên tại chi nhánh của bạn"
        actionLabel="Thêm nhân viên"
        actionIcon="person_add"
        onAction={() => {
          setForm(emptyForm)
          setModalOpen(true)
        }}
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      {loadError && (
        <div className="mb-4 flex justify-between rounded-lg border border-error-container bg-error-container/30 px-4 py-3">
          <p className="text-sm text-error">{loadError}</p>
          <button type="button" className="text-sm text-error" onClick={loadStaffs}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải...</p>
      ) : staffs.length === 0 && !loadError ? (
        <EmptyState
          icon="badge"
          title="Chưa có nhân viên"
          description="Thêm nhân viên để bắt đầu phân công làn rửa."
        />
      ) : (
        <div className="glass-panel soft-shadow overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Số điện thoại</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {staffs.map((staff) => (
                <tr key={staff.userId} className="hover:bg-surface-container-low/50">
                  <td className="px-4 py-3 text-on-surface-variant">#{staff.userId}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{staff.fullName}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{staff.phoneNumber}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={staff.status === 'Active' ? 'Active' : 'Inactive'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
