import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  createEmployee,
  fetchBranches,
  transferEmployee,
} from '../../api'
import PageHeader from '../../components/admin/shared/PageHeader'

const emptyCreate = {
  phoneNumber: '',
  password: '',
  fullName: '',
  role: 'Staff',
  branchId: '',
}

export default function AdminEmployeesPage() {
  const [branches, setBranches] = useState([])
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [transferForm, setTransferForm] = useState({ employeeId: '', branchId: '' })
  const [creating, setCreating] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadBranches = useCallback(async () => {
    try {
      setBranches(await fetchBranches())
    } catch {
      // optional for create without branch
    }
  }, [])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (creating) return
    if (!createForm.phoneNumber.trim() || !createForm.password || !createForm.fullName.trim()) {
      showToast('Vui lòng điền SĐT, mật khẩu và họ tên')
      return
    }

    setCreating(true)
    try {
      await createEmployee({
        phoneNumber: createForm.phoneNumber.trim(),
        password: createForm.password,
        fullName: createForm.fullName.trim(),
        role: createForm.role,
        branchId: createForm.branchId ? Number(createForm.branchId) : null,
      })
      showToast('Đã tạo tài khoản nhân viên')
      setCreateForm(emptyCreate)
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không tạo được nhân viên')
    } finally {
      setCreating(false)
    }
  }

  const handleTransfer = async (e) => {
    e.preventDefault()
    if (transferring) return
    const employeeId = Number(transferForm.employeeId)
    const branchId = Number(transferForm.branchId)
    if (!employeeId || !branchId) {
      showToast('Nhập ID nhân viên và chọn chi nhánh')
      return
    }

    setTransferring(true)
    try {
      await transferEmployee(employeeId, { branchId })
      showToast('Đã chuyển nhân viên sang chi nhánh mới')
      setTransferForm({ employeeId: '', branchId: '' })
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không chuyển được nhân viên')
    } finally {
      setTransferring(false)
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <PageHeader
        title="Nhân viên"
        description="Tạo Manager/Staff và chuyển chi nhánh — danh sách staff: GET /manager/staff (role Manager)"
      />

      {toast && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      <form
        onSubmit={handleCreate}
        className="glass-panel soft-shadow mb-6 space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
      >
        <h2 className="font-sora text-lg font-semibold text-on-surface">Tạo nhân viên</h2>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Họ tên</span>
          <input
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={createForm.fullName}
            disabled={creating}
            onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Số điện thoại</span>
          <input
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={createForm.phoneNumber}
            disabled={creating}
            onChange={(e) => setCreateForm((f) => ({ ...f, phoneNumber: e.target.value }))}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Mật khẩu</span>
          <input
            type="password"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={createForm.password}
            disabled={creating}
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Vai trò</span>
          <select
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={createForm.role}
            disabled={creating}
            onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
          >
            <option value="Staff">Staff</option>
            <option value="Manager">Manager</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Chi nhánh (tùy chọn)</span>
          <select
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={createForm.branchId}
            disabled={creating}
            onChange={(e) => setCreateForm((f) => ({ ...f, branchId: e.target.value }))}
          >
            <option value="">— Không gán —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60"
        >
          {creating ? 'Đang tạo…' : 'Tạo nhân viên'}
        </button>
      </form>

      <form
        onSubmit={handleTransfer}
        className="glass-panel soft-shadow space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
      >
        <h2 className="font-sora text-lg font-semibold text-on-surface">Chuyển chi nhánh</h2>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">ID nhân viên (userId)</span>
          <input
            type="number"
            min={1}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={transferForm.employeeId}
            disabled={transferring}
            onChange={(e) => setTransferForm((f) => ({ ...f, employeeId: e.target.value }))}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Chi nhánh đích</span>
          <select
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={transferForm.branchId}
            disabled={transferring}
            onChange={(e) => setTransferForm((f) => ({ ...f, branchId: e.target.value }))}
          >
            <option value="">— Chọn —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={transferring}
          className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-60"
        >
          {transferring ? 'Đang chuyển…' : 'Chuyển chi nhánh'}
        </button>
      </form>
    </div>
  )
}
