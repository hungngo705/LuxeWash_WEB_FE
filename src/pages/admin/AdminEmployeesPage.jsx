import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  createEmployee,
  fetchAllBranchesEmployeesSummary,
  fetchAdminBranches,
  transferEmployee,
} from '../../api'
import PageHeader from '../../components/admin/shared/PageHeader'
import { isValidPhoneNumber, isValidPassword, PHONE_ERROR_MESSAGE, PASSWORD_ERROR_MESSAGE } from '../../utils/validation'

const emptyCreate = {
  phoneNumber: '',
  password: '',
  fullName: '',
  role: 'Staff',
  branchId: '',
}

const emptyTransfer = { employeeId: '', branchId: '' }

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('đ', 'd')
    .replaceAll('Đ', 'D')
    .trim()
    .toLowerCase()
}

export default function AdminEmployeesPage() {
  const [branches, setBranches] = useState([])
  const [employees, setEmployees] = useState([])
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [transferForm, setTransferForm] = useState(emptyTransfer)
  const [panel, setPanel] = useState(null)
  const [listSearch, setListSearch] = useState('')
  const [listBranch, setListBranch] = useState('')
  const [listRole, setListRole] = useState('')
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [employeeLoadError, setEmployeeLoadError] = useState('')
  const [creating, setCreating] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadBranchesAndEmployees = useCallback(async () => {
    setLoadingEmployees(true)
    try {
      const [branchList, summaries] = await Promise.all([
        fetchAdminBranches(),
        fetchAllBranchesEmployeesSummary(),
      ])
      setBranches(branchList)
      setEmployeeLoadError('')

      const branchNameById = new Map(branchList.map((branch) => [Number(branch.id), branch.name]))
      const employeeMap = new Map()
      const summaryList = Array.isArray(summaries) ? summaries : []
      summaryList.forEach((summary) => {
        const branchId = Number(summary?.branchId)
        const members = [
          ...(Array.isArray(summary?.managers) ? summary.managers.map((member) => ({ ...member, role: 'Manager' })) : []),
          ...(Array.isArray(summary?.staff) ? summary.staff.map((member) => ({ ...member, role: 'Staff' })) : []),
        ]
        members.forEach((member) => {
          const employeeId = Number(member.userId ?? member.employeeId ?? member.id)
          if (!employeeId) return
          employeeMap.set(employeeId, {
            employeeId,
            fullName: String(member.fullName ?? '—'),
            phoneNumber: String(member.phoneNumber ?? '—'),
            role: String(member.role ?? 'Staff'),
            status: String(member.status ?? 'Active'),
            branchId: Number(member.branchId ?? branchId),
            branchName: branchNameById.get(Number(member.branchId ?? branchId)) ?? `Chi nhánh #${member.branchId ?? branchId}`,
          })
        })
      })
      setEmployees(
        [...employeeMap.values()].sort((a, b) =>
          a.fullName.localeCompare(b.fullName, 'vi'),
        ),
      )
    } catch {
      setEmployeeLoadError('Không tải được danh sách nhân viên và chi nhánh.')
    } finally {
      setLoadingEmployees(false)
    }
  }, [])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadBranchesAndEmployees()
    }, 0)
    return () => window.clearTimeout(loadTimer)
  }, [loadBranchesAndEmployees])

  const selectedEmployee = useMemo(
    () => employees.find(
      (employee) => employee.employeeId === Number(transferForm.employeeId),
    ) ?? null,
    [employees, transferForm.employeeId],
  )


  const visibleEmployees = employees.filter((employee) =>
    (!listBranch || employee.branchId === Number(listBranch)) &&
    (!listRole || employee.role === listRole) &&
    normalizeSearchText(`${employee.fullName} ${employee.phoneNumber} ${employee.branchName}`).includes(normalizeSearchText(listSearch)),
  )

  const openTransfer = (employee) => {
    setTransferForm({ employeeId: String(employee.employeeId), branchId: '' })
    setFormError('')
    setPanel('transfer')
    window.requestAnimationFrame(() => document.getElementById('employee-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (creating) return
    setFormError('')
    if (
      !createForm.phoneNumber.trim() ||
      !createForm.password ||
      !createForm.fullName.trim() ||
      !createForm.branchId
    ) {
      setFormError('Vui lòng điền họ tên, SĐT, mật khẩu và chi nhánh')
      return
    }
    if (!isValidPhoneNumber(createForm.phoneNumber)) {
      setFormError(PHONE_ERROR_MESSAGE)
      return
    }
    if (!isValidPassword(createForm.password)) {
      setFormError(PASSWORD_ERROR_MESSAGE)
      return
    }

    setCreating(true)
    try {
      await createEmployee({
        phoneNumber: createForm.phoneNumber.trim(),
        password: createForm.password,
        fullName: createForm.fullName.trim(),
        role: createForm.role,
        branchId: Number(createForm.branchId),
      })
      showToast('Đã tạo tài khoản nhân viên')
      setCreateForm(emptyCreate)
      setPanel(null)
      await loadBranchesAndEmployees()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Không tạo được nhân viên')
    } finally {
      setCreating(false)
    }
  }

  const handleTransfer = async (e) => {
    e.preventDefault()
    if (transferring) return
    setFormError('')
    const employeeId = Number(transferForm.employeeId)
    const branchId = Number(transferForm.branchId)
    if (!employeeId || !branchId) {
      setFormError('Chọn nhân viên và chi nhánh đích')
      return
    }
    if (selectedEmployee?.branchId === branchId) {
      setFormError('Nhân viên đã thuộc chi nhánh này')
      return
    }

    setTransferring(true)
    try {
      await transferEmployee(employeeId, { branchId })
      showToast('Đã chuyển nhân viên sang chi nhánh mới')
      setEmployees((items) => items.map((employee) =>
        employee.employeeId === employeeId
          ? {
              ...employee,
              branchId,
              branchName: branches.find((branch) => branch.id === branchId)?.name
                ?? employee.branchName,
            }
          : employee,
      ))
      setTransferForm(emptyTransfer)
      setPanel(null)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Không chuyển được nhân viên')
    } finally {
      setTransferring(false)
    }
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Nhân viên"
        description="Danh sách quản lý và nhân viên của tất cả chi nhánh"
        actionLabel="Thêm nhân viên"
        onAction={() => {
          if (creating || transferring) return
          setCreateForm({ ...emptyCreate, branchId: branches.some((branch) => String(branch.id) === listBranch && branch.isActive) ? listBranch : '' })
          setFormError('')
          setShowPassword(false)
          setPanel('create')
          window.requestAnimationFrame(() => document.getElementById('employee-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
        }}
      />

      {toast && (
        <p role="status" className="mb-4 rounded-lg border border-primary/30 bg-primary-container/20 px-4 py-2 text-sm text-primary">
          {toast}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[['Tổng nhân sự', employees.length], ['Quản lý', employees.filter((employee) => employee.role === 'Manager').length], ['Nhân viên', employees.filter((employee) => employee.role === 'Staff').length]].map(([label, count]) => (
          <div key={label} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <p className="text-xs text-on-surface-variant">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-on-surface">{loadingEmployees ? '…' : count}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sora text-lg font-semibold">Danh sách nhân sự</h2>
          <button type="button" disabled={loadingEmployees || creating || transferring} onClick={loadBranchesAndEmployees} className="text-sm text-primary disabled:opacity-50">Làm mới</button>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <input aria-label="Tìm nhân sự" type="search" placeholder="Tên, số điện thoại hoặc chi nhánh…" value={listSearch} onChange={(event) => setListSearch(event.target.value)} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm" />
          <select aria-label="Lọc chi nhánh" value={listBranch} onChange={(event) => setListBranch(event.target.value)} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm">
            <option value="">Tất cả chi nhánh</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{!branch.isActive ? ' (Ngừng hoạt động)' : ''}</option>)}
          </select>
          <select aria-label="Lọc vai trò" value={listRole} onChange={(event) => setListRole(event.target.value)} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm">
            <option value="">Tất cả vai trò</option><option value="Manager">Quản lý</option><option value="Staff">Nhân viên</option>
          </select>
        </div>
        {employeeLoadError && <p role="alert" className="mb-3 text-sm text-error">{employeeLoadError} Hãy bấm Làm mới để thử lại.</p>}
        {loadingEmployees ? <p role="status" className="py-8 text-center text-sm text-on-surface-variant">Đang tải nhân sự…</p> : (
          <>
            <p className="mb-3 text-xs text-on-surface-variant">Hiển thị {visibleEmployees.length} / {employees.length} nhân sự</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container text-xs text-on-surface-variant"><tr>{['Nhân sự', 'Vai trò', 'Chi nhánh', 'Trạng thái', 'Thao tác'].map((title) => <th key={title} className="whitespace-nowrap px-3 py-3 font-medium">{title}</th>)}</tr></thead>
                <tbody>
                  {visibleEmployees.map((employee) => (
                    <tr key={employee.employeeId} className="border-b border-outline-variant/50 last:border-0">
                      <td className="px-3 py-4"><p className="font-semibold">{employee.fullName}</p><p className="text-xs text-on-surface-variant">{employee.phoneNumber}</p></td>
                      <td className="px-3 py-4"><span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs ${employee.role === 'Manager' ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>{employee.role === 'Manager' ? 'Quản lý' : 'Nhân viên'}</span></td>
                      <td className="px-3 py-4">{employee.branchName}</td>
                      <td className="px-3 py-4 text-xs">{{ Active: 'Hoạt động', Inactive: 'Ngừng hoạt động', Banned: 'Đã khóa', Suspended: 'Tạm khóa' }[employee.status] ?? employee.status}</td>
                      <td className="px-3 py-4"><button type="button" disabled={creating || transferring || branches.filter((branch) => branch.isActive && branch.id !== employee.branchId).length === 0} onClick={() => openTransfer(employee)} className="whitespace-nowrap rounded-lg border border-outline-variant px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-40">Chuyển chi nhánh</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleEmployees.length === 0 && <p className="py-8 text-center text-sm text-on-surface-variant">{employees.length ? 'Không tìm thấy nhân sự phù hợp với bộ lọc.' : 'Chưa có nhân sự trong danh sách.'}</p>}
          </>
        )}
      </section>

      {panel && <div id="employee-editor" className="scroll-mt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-on-surface-variant">{panel === 'create' ? 'Thông tin tài khoản và nơi làm việc' : 'Kiểm tra nhân sự và chọn nơi làm việc mới'}</p>
          <button type="button" disabled={creating || transferring} onClick={() => { setPanel(null); setCreateForm(emptyCreate); setFormError('') }} className="px-3 py-2 text-sm text-on-surface-variant disabled:opacity-50">Hủy</button>
        </div>
        {formError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
      {panel === 'create' && <form
        onSubmit={handleCreate}
        className="glass-panel soft-shadow mb-6 grid gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 sm:grid-cols-2"
      >
        <h2 className="font-sora text-lg font-semibold text-on-surface sm:col-span-2">Thêm nhân viên</h2>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Họ tên</span>
          <input
            required
            autoComplete="name"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={createForm.fullName}
            disabled={creating}
            onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Số điện thoại</span>
          <input
            required
            type="tel"
            autoComplete="tel"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={createForm.phoneNumber}
            disabled={creating}
            onChange={(e) => setCreateForm((f) => ({ ...f, phoneNumber: e.target.value }))}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Mật khẩu</span>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={createForm.password}
            disabled={creating}
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
          />
          <span className="block text-xs text-on-surface-variant">{PASSWORD_ERROR_MESSAGE}</span>
          <button type="button" disabled={creating} onClick={() => setShowPassword((value) => !value)} className="text-xs text-primary">{showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</button>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Vai trò</span>
          <select
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={createForm.role}
            disabled={creating}
            onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
          >
            <option value="Staff">Nhân viên (Staff)</option>
            <option value="Manager">Quản lý chi nhánh (Manager)</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Chi nhánh</span>
          <select
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={createForm.branchId}
            disabled={creating}
            onChange={(e) => setCreateForm((f) => ({ ...f, branchId: e.target.value }))}
          >
            <option value="">— Chọn chi nhánh —</option>
            {branches.filter((branch) => branch.isActive).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={creating || loadingEmployees || !createForm.fullName.trim() || !createForm.phoneNumber.trim() || !createForm.password || !createForm.branchId}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60"
        >
          {creating ? 'Đang tạo…' : 'Tạo nhân viên'}
        </button>
      </form>}

      {panel === 'transfer' && <form
        onSubmit={handleTransfer}
        className="glass-panel soft-shadow space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
      >
        <h2 className="font-sora text-lg font-semibold text-on-surface">Chuyển chi nhánh</h2>

        {selectedEmployee && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary-container/10 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-surface">{selectedEmployee.fullName}</p>
              <p className="truncate text-xs text-on-surface-variant">
                Hiện tại: {selectedEmployee.branchName} · {selectedEmployee.phoneNumber}
              </p>
            </div>
            <span className="material-symbols-outlined shrink-0 text-primary">check_circle</span>
          </div>
        )}

        {employeeLoadError && (
          <p className="text-xs text-error">{employeeLoadError}</p>
        )}
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Chi nhánh đích</span>
          <select
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={transferForm.branchId}
            disabled={transferring || !selectedEmployee}
            onChange={(e) => setTransferForm((f) => ({ ...f, branchId: e.target.value }))}
          >
            <option value="">— Chọn —</option>
            {branches.filter((branch) => branch.isActive && branch.id !== selectedEmployee?.branchId).map((b) => (
              <option
                key={b.id}
                value={b.id}
                disabled={selectedEmployee?.branchId === b.id}
              >
                {b.name}
              </option>
            ))}
          </select>
        </label>
        {selectedEmployee && transferForm.branchId && (
          <div className="rounded-lg bg-primary/5 p-4 text-sm">
            <p className="font-semibold">{selectedEmployee.fullName} · {selectedEmployee.role === 'Manager' ? 'Quản lý' : 'Nhân viên'}</p>
            <p className="mt-1">{selectedEmployee.branchName} → {branches.find((branch) => branch.id === Number(transferForm.branchId))?.name}</p>
            <p className="mt-1 text-xs text-on-surface-variant">Vai trò của nhân sự được giữ nguyên sau khi chuyển.</p>
          </div>
        )}
        <button
          type="submit"
          disabled={transferring || loadingEmployees || !selectedEmployee || !transferForm.branchId || selectedEmployee.branchId === Number(transferForm.branchId)}
          className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-60"
        >
          {transferring ? 'Đang chuyển…' : 'Xác nhận chuyển chi nhánh'}
        </button>
      </form>}
      </div>}
    </div>
  )
}
