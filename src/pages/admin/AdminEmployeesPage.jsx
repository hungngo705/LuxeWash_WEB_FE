import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  createEmployee,
  fetchBranchEmployeesSummary,
  fetchBranches,
  transferEmployee,
} from '../../api'
import PageHeader from '../../components/admin/shared/PageHeader'
import { useToast } from '../../components/ui/Toast'

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
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [sourceBranchId, setSourceBranchId] = useState('')
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [employeeLoadError, setEmployeeLoadError] = useState('')
  const [creating, setCreating] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const toast = useToast()

  const loadBranchesAndEmployees = useCallback(async () => {
    try {
      const branchList = await fetchBranches()
      setBranches(branchList)
      setEmployeeLoadError('')

      const results = await Promise.allSettled(
        branchList.map(async (branch) => ({
          branch,
          summary: await fetchBranchEmployeesSummary(branch.id),
        })),
      )
      const employeeMap = new Map()
      results.forEach((result) => {
        if (result.status !== 'fulfilled') return
        const { branch, summary } = result.value
        const members = [
          ...(Array.isArray(summary?.managers) ? summary.managers : []),
          ...(Array.isArray(summary?.staff) ? summary.staff : []),
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
            branchId: Number(member.branchId ?? branch.id),
            branchName: branch.name,
          })
        })
      })
      setEmployees(
        [...employeeMap.values()].sort((a, b) =>
          a.fullName.localeCompare(b.fullName, 'vi'),
        ),
      )
      if (results.some((result) => result.status === 'rejected')) {
        setEmployeeLoadError('Một số chi nhánh chưa tải được danh sách nhân viên.')
      }
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

  const filteredEmployees = useMemo(() => {
    const query = normalizeSearchText(employeeSearch)
    return employees.filter((employee) => {
      if (sourceBranchId && employee.branchId !== Number(sourceBranchId)) return false
      if (!query) return true
      return normalizeSearchText([
        employee.fullName,
        employee.phoneNumber,
        employee.branchName,
      ].join(' ')).includes(query)
    }).slice(0, 20)
  }, [employeeSearch, employees, sourceBranchId])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (creating) return
    if (!createForm.phoneNumber.trim() || !createForm.password || !createForm.fullName.trim()) {
      toast.warning('Vui lòng điền SĐT, mật khẩu và họ tên')
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
      toast.success('Đã tạo tài khoản nhân viên')
      setCreateForm(emptyCreate)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không tạo được nhân viên')
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
      toast.warning('Chọn nhân viên và chi nhánh đích')
      return
    }
    if (selectedEmployee?.branchId === branchId) {
      toast.warning('Nhân viên đã thuộc chi nhánh này')
      return
    }

    setTransferring(true)
    try {
      await transferEmployee(employeeId, { branchId })
      toast.success('Đã chuyển nhân viên sang chi nhánh mới')
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
      setEmployeeSearch('')
      setSourceBranchId('')
      setEmployeePickerOpen(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không chuyển được nhân viên')
    } finally {
      setTransferring(false)
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <PageHeader
        eyebrow="Nhân sự"
        title="Nhân viên"
        description="Tạo Manager/Staff và chuyển chi nhánh"
      />

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
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Chi nhánh hiện tại</span>
          <select
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
            value={sourceBranchId}
            disabled={transferring || loadingEmployees}
            onChange={(e) => {
              setSourceBranchId(e.target.value)
              setTransferForm((form) => ({ ...form, employeeId: '' }))
              setEmployeeSearch('')
              setEmployeePickerOpen(true)
            }}
          >
            <option value="">— Tất cả chi nhánh —</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </label>

        <div
          className="relative space-y-1"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setEmployeePickerOpen(false)
            }
          }}
        >
          <label
            htmlFor="employee-transfer-search"
            className="block text-xs font-semibold uppercase text-on-surface-variant"
          >
            Tìm nhân viên
          </label>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-on-surface-variant">
              search
            </span>
            <input
              id="employee-transfer-search"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={employeePickerOpen}
              aria-controls="employee-transfer-options"
              autoComplete="off"
              placeholder={loadingEmployees ? 'Đang tải nhân viên…' : 'Nhập tên hoặc số điện thoại'}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-3 outline-none focus:border-primary"
              value={employeeSearch}
              disabled={transferring || loadingEmployees}
              onFocus={() => setEmployeePickerOpen(true)}
              onChange={(e) => {
                setEmployeeSearch(e.target.value)
                setTransferForm((form) => ({ ...form, employeeId: '' }))
                setEmployeePickerOpen(true)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEmployeePickerOpen(false)
              }}
            />
          </div>

          {employeePickerOpen && !loadingEmployees && (
            <div
              id="employee-transfer-options"
              role="listbox"
              className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest p-1 shadow-xl"
            >
              {filteredEmployees.length ? filteredEmployees.map((employee) => (
                <button
                  key={employee.employeeId}
                  type="button"
                  role="option"
                  aria-selected={employee.employeeId === selectedEmployee?.employeeId}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-container-low"
                  onClick={() => {
                    setTransferForm((form) => ({
                      ...form,
                      employeeId: String(employee.employeeId),
                      branchId: Number(form.branchId) === employee.branchId
                        ? ''
                        : form.branchId,
                    }))
                    setEmployeeSearch(employee.fullName)
                    setEmployeePickerOpen(false)
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-on-surface">
                      {employee.fullName}
                    </span>
                    <span className="block truncate text-xs text-on-surface-variant">
                      {employee.phoneNumber} · {employee.role}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-surface-container px-2 py-1 text-[11px] font-medium text-on-surface-variant">
                    {employee.branchName}
                  </span>
                </button>
              )) : (
                <p className="px-3 py-4 text-center text-sm text-on-surface-variant">
                  Không tìm thấy nhân viên phù hợp.
                </p>
              )}
            </div>
          )}
        </div>

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
            disabled={transferring}
            onChange={(e) => setTransferForm((f) => ({ ...f, branchId: e.target.value }))}
          >
            <option value="">— Chọn —</option>
            {branches.map((b) => (
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
        <button
          type="submit"
          disabled={transferring || loadingEmployees || !selectedEmployee}
          className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-60"
        >
          {transferring ? 'Đang chuyển…' : 'Chuyển chi nhánh'}
        </button>
      </form>
    </div>
  )
}