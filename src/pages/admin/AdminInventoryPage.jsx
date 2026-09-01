import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  createAdminMaterial,
  createAdminMaterialUnit,
  fetchAdminBranches,
  fetchAdminInventoryBatches,
  fetchAdminInventoryReport,
  fetchAdminInventoryStocks,
  fetchAdminMaterialUnits,
  fetchAdminMaterials,
  fetchAllServiceMaterials,
  fetchConditionMultipliers,
  fetchServiceMaterials,
  fetchServices,
  fetchVehicleTypes,
  fetchBranchInventorySetting,
  updateAdminMaterial,
  updateAdminMaterialUnit,
  updateBranchInventorySetting,
  updateConditionMultiplier,
  updateServiceMaterial,
  upsertServiceMaterials,
} from '../../api'
import FormModal from '../../components/admin/shared/FormModal'
import PageHeader from '../../components/admin/shared/PageHeader'
import StatusBadge from '../../components/admin/shared/StatusBadge'
import { formatDateTime, formatVnd } from '../../utils/format'

const tabs = [
  { id: 'materials', label: 'Vật tư', icon: 'inventory_2' },
  { id: 'units', label: 'Đơn vị', icon: 'straighten' },
  { id: 'stocks', label: 'Tồn kho', icon: 'warehouse' },
  { id: 'batches', label: 'Lô vật tư', icon: 'inventory' },
  { id: 'service', label: 'Định mức dịch vụ', icon: 'rule_settings' },
  { id: 'multipliers', label: 'Độ dơ xe', icon: 'speed' },
  { id: 'settings', label: 'Cấu hình chi nhánh', icon: 'tune' },
  { id: 'report', label: 'Báo cáo', icon: 'analytics' },
]

const emptyMaterial = {
  name: '',
  category: '',
  unit: '',
  description: '',
  requiresExpiryTracking: false,
  defaultMinStockLevel: 0,
  expiryWarningDays: 30,
  isActive: true,
}

const emptyUnit = {
  code: '',
  displayName: '',
  measurementType: '',
  isActive: true,
}

const fieldClass = 'h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant'
const textareaClass = 'min-h-24 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant'
const labelTextClass = 'text-xs font-semibold uppercase tracking-wide text-on-surface-variant'
const primaryButtonClass = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70'
const secondaryButtonClass = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-60'
const subtleButtonClass = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-container/20 disabled:cursor-wait disabled:opacity-50'
const checkboxClass = 'h-4 w-4 rounded border-outline-variant accent-primary focus:ring-primary/20'
const tableHeadClass = 'border-b border-outline-variant bg-surface-container-low text-xs font-semibold uppercase tracking-wider text-on-surface-variant'
const tableRowClass = 'transition-colors hover:bg-surface-container-low/60'

function num(value) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(Number(value ?? 0))
}

function dateOnly(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function Notice({ message, type = 'success' }) {
  if (!message) return null
  const isError = type === 'error'
  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
        isError
          ? 'border-error-container bg-error-container/25 text-error'
          : 'border-primary/25 bg-primary-container/15 text-primary'
      }`}
    >
      <span className="material-symbols-outlined mt-0.5 text-[18px]">
        {isError ? 'error' : 'check_circle'}
      </span>
      <span className="font-medium">{message}</span>
    </div>
  )
}

function Panel({ children, className = '' }) {
  return (
    <div className={`glass-panel soft-shadow overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest ${className}`}>
      {children}
    </div>
  )
}

function EmptyState({ title, description, icon = 'inventory_2' }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container/15 text-primary">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </span>
      <p className="mt-4 font-sora font-semibold text-on-surface">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm leading-6 text-on-surface-variant">{description}</p>}
    </div>
  )
}

function TableEmpty({ colSpan, title, description, icon }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <EmptyState title={title} description={description} icon={icon} />
      </td>
    </tr>
  )
}

function LoadingState({ label = 'Đang tải dữ liệu...' }) {
  return (
    <Panel>
      <div className="flex items-center justify-center gap-3 px-6 py-12 text-sm font-medium text-on-surface-variant">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-container/30 border-t-primary" />
        {label}
      </div>
    </Panel>
  )
}

function TabBar({ items, activeTab, onChange }) {
  return (
    <Panel className="mb-5">
      <div className="flex gap-2 overflow-x-auto p-2">
        {items.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
                active
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
              }`}
              onClick={() => onChange(tab.id)}
            >
              <span className={`material-symbols-outlined text-[18px] ${active ? 'filled' : ''}`}>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>
    </Panel>
  )
}

function MetricCard({ label, value, icon }) {
  return (
    <Panel>
      <div className="flex items-center gap-4 px-4 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/15 text-primary">
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
          <p className="mt-1 truncate font-sora text-xl font-semibold text-on-surface">{value}</p>
        </div>
      </div>
    </Panel>
  )
}

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState('materials')
  const [materials, setMaterials] = useState([])
  const [materialUnits, setMaterialUnits] = useState([])
  const [stocks, setStocks] = useState([])
  const [batches, setBatches] = useState([])
  const [branches, setBranches] = useState([])
  const [services, setServices] = useState([])
  const [vehicleTypes, setVehicleTypes] = useState([])
  const [multipliers, setMultipliers] = useState([])
  const [serviceUsages, setServiceUsages] = useState([])
  const [report, setReport] = useState(null)
  const [branchSetting, setBranchSetting] = useState(null)
  const [allStocks, setAllStocks] = useState([])
  const [allServiceUsageCount, setAllServiceUsageCount] = useState(0)
  const [filters, setFilters] = useState({
    includeInactive: true,
    branchId: '',
    expiringOnly: false,
    serviceId: '',
    vehicleTypeId: '',
    reportFrom: '',
    reportTo: '',
    settingBranchId: '',
  })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [materialModal, setMaterialModal] = useState(false)
  const [editingMaterialId, setEditingMaterialId] = useState(null)
  const [materialForm, setMaterialForm] = useState(emptyMaterial)
  const [unitForm, setUnitForm] = useState(emptyUnit)
  const [editingUnitId, setEditingUnitId] = useState(null)
  const [usageForm, setUsageForm] = useState({ materialId: '', baseQuantity: '' })
  const [editingUsage, setEditingUsage] = useState(null)
  const [settingForm, setSettingForm] = useState({ allowNegativeStock: false, negativeStockLimit: '' })
  const [savingMaterial, setSavingMaterial] = useState(false)
  const [savingUnit, setSavingUnit] = useState(false)
  const [savingUsage, setSavingUsage] = useState(false)
  const [savingMultiplierId, setSavingMultiplierId] = useState(null)
  const [savingSetting, setSavingSetting] = useState(false)

  const selectedBranchId = filters.branchId ? Number(filters.branchId) : undefined
  const selectedServiceId = filters.serviceId ? Number(filters.serviceId) : undefined

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 2500)
  }

  const loadCommon = useCallback(async () => {
    const [materialData, unitData, branchData, serviceData, typeData] = await Promise.all([
      fetchAdminMaterials(true),
      fetchAdminMaterialUnits(true),
      fetchAdminBranches(),
      fetchServices(),
      fetchVehicleTypes(),
    ])
    setMaterials(Array.isArray(materialData) ? materialData : [])
    setMaterialUnits(Array.isArray(unitData) ? unitData : [])
    setBranches(Array.isArray(branchData) ? branchData : [])
    setServices(Array.isArray(serviceData) ? serviceData : [])
    setVehicleTypes(Array.isArray(typeData) ? typeData : [])
  }, [])

  const loadActive = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await loadCommon()
      if (activeTab === 'stocks') {
        setStocks(await fetchAdminInventoryStocks({ branchId: selectedBranchId }))
      } else if (activeTab === 'batches') {
        setBatches(await fetchAdminInventoryBatches({ branchId: selectedBranchId, expiringOnly: filters.expiringOnly }))
      } else if (activeTab === 'multipliers') {
        setMultipliers(await fetchConditionMultipliers())
      } else if (activeTab === 'service' && selectedServiceId) {
        setServiceUsages(await fetchServiceMaterials(selectedServiceId))
      } else if (activeTab === 'report') {
        setReport(await fetchAdminInventoryReport({
          from: filters.reportFrom || undefined,
          to: filters.reportTo || undefined,
          branchId: selectedBranchId,
        }))
      } else if (activeTab === 'settings' && filters.settingBranchId) {
        const setting = await fetchBranchInventorySetting(filters.settingBranchId)
        setBranchSetting(setting)
        setSettingForm({
          allowNegativeStock: setting.allowNegativeStock === true,
          negativeStockLimit: setting.negativeStockLimit ?? '',
        })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu inventory.')
    } finally {
      setLoading(false)
    }
  }, [
    activeTab,
    filters.expiringOnly,
    filters.reportFrom,
    filters.reportTo,
    filters.settingBranchId,
    loadCommon,
    selectedBranchId,
    selectedServiceId,
  ])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load page data when filters/tab change
    loadActive()
  }, [loadActive])

  const loadMetrics = useCallback(async () => {
    try {
      const [stockData, usageData] = await Promise.all([
        fetchAdminInventoryStocks({}),
        fetchAllServiceMaterials(),
      ])
      setAllStocks(Array.isArray(stockData) ? stockData : [])
      setAllServiceUsageCount(Array.isArray(usageData) ? usageData.length : 0)
    } catch {
      // metric cards fall back to their previous values; page-level error is shown by loadActive
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- summary metrics are independent of the active tab
    loadMetrics()
  }, [loadMetrics])

  const visibleMaterials = useMemo(
    () => materials.filter((m) => filters.includeInactive || m.isActive !== false),
    [materials, filters.includeInactive],
  )

  const visibleUnits = useMemo(
    () => materialUnits.filter((unit) => filters.includeInactive || unit.isActive !== false),
    [materialUnits, filters.includeInactive],
  )

  const activeMaterialCount = useMemo(
    () => materials.filter((material) => material.isActive !== false).length,
    [materials],
  )

  const lowStockCount = useMemo(
    () => allStocks.filter((stock) => stock.isLowStock).length,
    [allStocks],
  )

  const selectedUsageMaterial = useMemo(
    () => materials.find((material) => Number(material.materialId) === Number(usageForm.materialId)),
    [materials, usageForm.materialId],
  )

  const canSaveUnit = Boolean(
    unitForm.displayName.trim()
      && unitForm.measurementType.trim()
      && (editingUnitId || unitForm.code.trim()),
  )

  const canSaveUsage = Boolean(
    selectedServiceId
      && usageForm.materialId
      && Number(usageForm.baseQuantity) > 0,
  )

  const openMaterial = (material) => {
    if (material) {
      setEditingMaterialId(material.materialId)
      setMaterialForm({
        name: material.name ?? '',
        category: material.category ?? '',
        unit: material.unit ?? '',
        description: material.description ?? '',
        requiresExpiryTracking: material.requiresExpiryTracking === true,
        defaultMinStockLevel: Number(material.defaultMinStockLevel ?? 0),
        expiryWarningDays: Number(material.expiryWarningDays ?? 30),
        isActive: material.isActive !== false,
      })
    } else {
      setEditingMaterialId(null)
      setMaterialForm(emptyMaterial)
    }
    setMaterialModal(true)
  }

  const saveMaterial = async () => {
    if (savingMaterial) return
    const payload = {
      name: materialForm.name.trim(),
      category: materialForm.category.trim(),
      unit: materialForm.unit.trim(),
      description: materialForm.description.trim() || null,
      requiresExpiryTracking: materialForm.requiresExpiryTracking,
      defaultMinStockLevel: Number(materialForm.defaultMinStockLevel) || 0,
      expiryWarningDays: Number(materialForm.expiryWarningDays) || 0,
    }
    setSavingMaterial(true)
    try {
      if (editingMaterialId) {
        await updateAdminMaterial(editingMaterialId, { ...payload, isActive: materialForm.isActive })
        showToast('Đã cập nhật vật tư.')
      } else {
        await createAdminMaterial(payload)
        showToast('Đã tạo vật tư.')
      }
      setMaterialModal(false)
      await loadActive()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được vật tư.')
    } finally {
      setSavingMaterial(false)
    }
  }

  const editUnit = (unit) => {
    setEditingUnitId(unit.unitId)
    setUnitForm({
      code: unit.code ?? '',
      displayName: unit.displayName ?? '',
      measurementType: unit.measurementType ?? '',
      isActive: unit.isActive !== false,
    })
  }

  const resetUnitForm = () => {
    setEditingUnitId(null)
    setUnitForm(emptyUnit)
  }

  const saveUnit = async () => {
    if (savingUnit) return
    const payload = {
      displayName: unitForm.displayName.trim(),
      measurementType: unitForm.measurementType.trim(),
      isActive: unitForm.isActive,
    }
    setSavingUnit(true)
    try {
      if (editingUnitId) {
        await updateAdminMaterialUnit(editingUnitId, payload)
        showToast('Đã cập nhật đơn vị.')
      } else {
        await createAdminMaterialUnit({
          code: unitForm.code.trim(),
          displayName: payload.displayName,
          measurementType: payload.measurementType,
        })
        showToast('Đã tạo đơn vị.')
      }
      resetUnitForm()
      await loadActive()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được đơn vị.')
    } finally {
      setSavingUnit(false)
    }
  }

  const saveUsage = async () => {
    if (savingUsage || !canSaveUsage) return
    const targetServiceId = editingUsage?.serviceId ?? selectedServiceId
    if (!targetServiceId || !usageForm.materialId || !usageForm.baseQuantity) return
    const payload = {
      vehicleTypeId: filters.vehicleTypeId ? Number(filters.vehicleTypeId) : null,
      materialId: Number(usageForm.materialId),
      baseQuantity: Number(usageForm.baseQuantity),
    }
    setSavingUsage(true)
    try {
      if (editingUsage) {
        await updateServiceMaterial(targetServiceId, editingUsage.serviceMaterialUsageId, payload)
      } else {
        await upsertServiceMaterials(selectedServiceId, {
          vehicleTypeId: payload.vehicleTypeId,
          items: [{ materialId: payload.materialId, baseQuantity: payload.baseQuantity }],
        })
      }
      setEditingUsage(null)
      setUsageForm({ materialId: '', baseQuantity: '' })
      setServiceUsages(await fetchServiceMaterials(targetServiceId))
      showToast('Đã lưu định mức vật tư.')
      loadMetrics()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được định mức.')
    } finally {
      setSavingUsage(false)
    }
  }

  const editUsage = (usage) => {
    setEditingUsage(usage)
    setUsageForm({
      materialId: String(usage.materialId ?? ''),
      baseQuantity: String(usage.baseQuantity ?? ''),
    })
    setFilters((f) => ({
      ...f,
      serviceId: usage.serviceId ? String(usage.serviceId) : f.serviceId,
      vehicleTypeId: usage.vehicleTypeId ? String(usage.vehicleTypeId) : '',
    }))
  }

  const resetUsageForm = () => {
    setEditingUsage(null)
    setUsageForm({ materialId: '', baseQuantity: '' })
  }

  const saveMultiplier = async (row) => {
    if (savingMultiplierId) return
    setSavingMultiplierId(row.id)
    try {
      await updateConditionMultiplier(row.id, {
        multiplier: Number(row.multiplier),
        description: row.description || null,
        isActive: row.isActive !== false,
      })
      setMultipliers(await fetchConditionMultipliers())
      showToast('Đã cập nhật hệ số.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không cập nhật được hệ số.')
    } finally {
      setSavingMultiplierId(null)
    }
  }

  const saveSetting = async () => {
    if (!filters.settingBranchId || savingSetting) return
    setSavingSetting(true)
    try {
      await updateBranchInventorySetting(filters.settingBranchId, {
        allowNegativeStock: settingForm.allowNegativeStock,
        negativeStockLimit:
          settingForm.allowNegativeStock && settingForm.negativeStockLimit !== ''
            ? Number(settingForm.negativeStockLimit)
            : null,
      })
      showToast('Đã cập nhật cấu hình branch.')
      const setting = await fetchBranchInventorySetting(filters.settingBranchId)
      setBranchSetting(setting)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được cấu hình branch.')
    } finally {
      setSavingSetting(false)
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Quản lý vật tư"
        description="Danh mục, tồn kho, lô vật tư, định mức service và báo cáo lợi nhuận gộp"
        actionLabel={activeTab === 'materials' ? 'Thêm vật tư' : undefined}
        actionIcon="inventory_2"
        onAction={activeTab === 'materials' ? () => openMaterial(null) : undefined}
      />

      <Notice message={toast} />
      <Notice message={error} type="error" />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Vật tư đang dùng', num(activeMaterialCount), 'inventory_2'],
          ['Đơn vị đo', num(materialUnits.length), 'straighten'],
          ['Tồn kho thấp', num(lowStockCount), 'warning'],
          ['Định mức dịch vụ', num(allServiceUsageCount), 'rule_settings'],
        ].map(([label, value, icon]) => (
          <MetricCard key={label} label={label} value={value} icon={icon} />
        ))}
      </div>

      <TabBar items={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab !== 'materials' && activeTab !== 'units' && activeTab !== 'service' && activeTab !== 'multipliers' && activeTab !== 'settings' && (
        <Panel className="mb-4">
          <div className="flex flex-wrap items-end gap-3 p-4">
            <label className="block min-w-52 flex-1 space-y-1 md:flex-none">
              <span className={labelTextClass}>Chi nhánh</span>
              <select
                className={fieldClass}
                value={filters.branchId}
                onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
              >
                <option value="">Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
            {activeTab === 'batches' && (
              <label className="flex h-11 items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm font-medium text-on-surface">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={filters.expiringOnly}
                  onChange={(e) => setFilters((f) => ({ ...f, expiringOnly: e.target.checked }))}
                />
                Sắp hết hạn
              </label>
            )}
            {activeTab === 'report' && (
              <>
                <label className="block min-w-44 space-y-1">
                  <span className={labelTextClass}>Từ ngày</span>
                  <input type="date" className={fieldClass} value={filters.reportFrom} onChange={(e) => setFilters((f) => ({ ...f, reportFrom: e.target.value }))} />
                </label>
                <label className="block min-w-44 space-y-1">
                  <span className={labelTextClass}>Đến ngày</span>
                  <input type="date" className={fieldClass} value={filters.reportTo} onChange={(e) => setFilters((f) => ({ ...f, reportTo: e.target.value }))} />
                </label>
                <button type="button" className={primaryButtonClass} onClick={loadActive}>
                  <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                  Lọc dữ liệu
                </button>
              </>
            )}
          </div>
        </Panel>
      )}

      {loading ? (
        <LoadingState label="Đang tải dữ liệu vật tư..." />
      ) : (
        <>
          {activeTab === 'materials' && (
            <Panel>
              <div className="border-b border-outline-variant p-4">
                <label className="flex items-center gap-2 text-sm text-on-surface">
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    checked={filters.includeInactive}
                    onChange={(e) => setFilters((f) => ({ ...f, includeInactive: e.target.checked }))}
                  />
                  Hiện vật tư đã khóa
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="px-4 py-3">Vật tư</th>
                      <th className="px-4 py-3">Nhóm</th>
                      <th className="px-4 py-3">Đơn vị</th>
                      <th className="px-4 py-3">Tồn tối thiểu</th>
                      <th className="px-4 py-3">Hạn dùng</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {visibleMaterials.map((m) => (
                      <tr key={m.materialId} className={tableRowClass}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-on-surface">{m.name}</p>
                          <p className="text-xs text-on-surface-variant">{m.description || '—'}</p>
                        </td>
                        <td className="px-4 py-3">{m.category}</td>
                        <td className="px-4 py-3">{m.unit}</td>
                        <td className="px-4 py-3">{num(m.defaultMinStockLevel)}</td>
                        <td className="px-4 py-3">{m.requiresExpiryTracking ? `${m.expiryWarningDays} ngày` : 'Không bắt buộc'}</td>
                        <td className="px-4 py-3"><StatusBadge status={m.isActive !== false ? 'Active' : 'Inactive'} /></td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className={subtleButtonClass}
                            disabled={savingMaterial}
                            onClick={() => openMaterial(m)}
                          >
                            Sửa
                          </button>
                        </td>
                      </tr>
                    ))}
                    {visibleMaterials.length === 0 && (
                      <TableEmpty colSpan={7} title="Chưa có vật tư" description="Thêm vật tư đầu tiên để bắt đầu theo dõi tồn kho và định mức sử dụng." />
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {activeTab === 'units' && (
            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
              <Panel>
                <form className="space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); saveUnit() }}>
                  <label className="block space-y-1">
                    <span className={labelTextClass}>Code</span>
                    <input
                      required
                      disabled={Boolean(editingUnitId)}
                      className={fieldClass}
                      placeholder="vd: bottle_500ml"
                      value={unitForm.code}
                      onChange={(e) => setUnitForm((form) => ({ ...form, code: e.target.value }))}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={labelTextClass}>Tên hiển thị</span>
                    <input
                      required
                      className={fieldClass}
                      value={unitForm.displayName}
                      onChange={(e) => setUnitForm((form) => ({ ...form, displayName: e.target.value }))}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={labelTextClass}>Nhóm đo lường</span>
                    <input
                      required
                      className={fieldClass}
                      placeholder="Volume, Weight, Count, Container"
                      value={unitForm.measurementType}
                      onChange={(e) => setUnitForm((form) => ({ ...form, measurementType: e.target.value }))}
                    />
                  </label>
                  {editingUnitId && (
                    <label className="flex items-center gap-2 text-sm text-on-surface">
                      <input
                        type="checkbox"
                        className={checkboxClass}
                        checked={unitForm.isActive}
                        onChange={(e) => setUnitForm((form) => ({ ...form, isActive: e.target.checked }))}
                      />
                      Đang sử dụng
                    </label>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className={primaryButtonClass}
                      disabled={savingUnit || !canSaveUnit}
                    >
                      {savingUnit ? 'Đang lưu...' : editingUnitId ? 'Cập nhật' : 'Thêm đơn vị'}
                    </button>
                    {editingUnitId && (
                      <button
                        type="button"
                        className={secondaryButtonClass}
                        disabled={savingUnit}
                        onClick={resetUnitForm}
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
              </Panel>
              <Panel>
                <div className="border-b border-outline-variant p-4">
                  <label className="flex items-center gap-2 text-sm text-on-surface">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={filters.includeInactive}
                      onChange={(e) => setFilters((f) => ({ ...f, includeInactive: e.target.checked }))}
                    />
                    Hiện đơn vị đã khóa
                  </label>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className={tableHeadClass}>
                      <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Tên hiển thị</th><th className="px-4 py-3">Nhóm</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thao tác</th></tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60">
                      {visibleUnits.map((unit) => (
                        <tr key={unit.unitId} className={`${tableRowClass} ${editingUnitId === unit.unitId ? 'bg-primary/5' : ''}`}>
                          <td className="px-4 py-3 font-mono font-semibold">{unit.code}</td>
                          <td className="px-4 py-3">{unit.displayName}</td>
                          <td className="px-4 py-3">{unit.measurementType}</td>
                          <td className="px-4 py-3"><StatusBadge status={unit.isActive !== false ? 'Active' : 'Inactive'} /></td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className={subtleButtonClass}
                              disabled={savingUnit}
                              onClick={() => editUnit(unit)}
                            >
                              {editingUnitId === unit.unitId ? 'Đang sửa' : 'Sửa'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {visibleUnits.length === 0 && (
                        <TableEmpty colSpan={5} title="Chưa có đơn vị đo" description="Tạo đơn vị đo trước, sau đó gán vào vật tư để tránh nhập sai đơn vị." icon="straighten" />
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          )}

          {activeTab === 'stocks' && (
            <Panel>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className={tableHeadClass}>
                    <tr><th className="px-4 py-3">Kho</th><th className="px-4 py-3">Vật tư</th><th className="px-4 py-3">Tồn</th><th className="px-4 py-3">Cảnh báo</th><th className="px-4 py-3">Cập nhật</th></tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {stocks.map((s) => (
                      <tr key={`${s.warehouseId}-${s.materialId}`} className={tableRowClass}>
                        <td className="px-4 py-3">{s.warehouseName}<p className="text-xs text-on-surface-variant">{s.branchName || '—'}</p></td>
                        <td className="px-4 py-3 font-semibold">{s.materialName}</td>
                        <td className="px-4 py-3">{num(s.currentQuantity)} {s.unit}</td>
                        <td className="px-4 py-3">{s.isLowStock ? <StatusBadge status="Low stock" /> : <StatusBadge status="OK" />}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{formatDateTime(s.updatedAt)}</td>
                      </tr>
                    ))}
                    {stocks.length === 0 && (
                      <TableEmpty colSpan={5} title="Chưa có tồn kho" description="Khi manager nhập batch, tồn kho sẽ hiển thị tại đây." />
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {activeTab === 'batches' && (
            <Panel>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-left text-sm">
                  <thead className={tableHeadClass}>
                    <tr><th className="px-4 py-3">Batch</th><th className="px-4 py-3">Vật tư</th><th className="px-4 py-3">Còn lại</th><th className="px-4 py-3">Giá vốn</th><th className="px-4 py-3">Ngày SX</th><th className="px-4 py-3">Hạn dùng</th><th className="px-4 py-3">NCC</th><th className="px-4 py-3">Trạng thái</th></tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {batches.map((b) => (
                      <tr key={b.materialBatchId} className={tableRowClass}>
                        <td className="px-4 py-3 font-mono font-semibold">{b.batchCode}</td>
                        <td className="px-4 py-3">{b.materialName}<p className="text-xs text-on-surface-variant">{b.warehouseName}</p></td>
                        <td className="px-4 py-3">{num(b.remainingQuantity)} / {num(b.importedQuantity)}</td>
                        <td className="px-4 py-3">{formatVnd(b.unitCost)}</td>
                        <td className="px-4 py-3">{dateOnly(b.manufactureDate) || '—'}</td>
                        <td className="px-4 py-3">{dateOnly(b.expiryDate) || '—'}</td>
                        <td className="px-4 py-3">{b.supplierName || '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                      </tr>
                    ))}
                    {batches.length === 0 && (
                      <TableEmpty colSpan={8} title="Chưa có lô vật tư" description="Các batch nhập kho sẽ xuất hiện cùng ngày sản xuất, hạn dùng và trạng thái." />
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {activeTab === 'service' && (
            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
              <Panel>
                <div className="space-y-3 p-4">
                  <label className="block space-y-1">
                    <span className={labelTextClass}>Dịch vụ</span>
                    <select className={fieldClass} value={filters.serviceId} onChange={(e) => setFilters((f) => ({ ...f, serviceId: e.target.value }))}>
                      <option value="">Chọn dịch vụ</option>
                      {services.map((s) => <option key={s.serviceId} value={s.serviceId}>{s.serviceName}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className={labelTextClass}>Loại xe</span>
                    <select className={fieldClass} value={filters.vehicleTypeId} onChange={(e) => setFilters((f) => ({ ...f, vehicleTypeId: e.target.value }))}>
                      <option value="">Mặc định</option>
                      {vehicleTypes.map((t) => <option key={t.vehicleTypeId ?? t.id} value={t.vehicleTypeId ?? t.id}>{t.name ?? t.vehicleTypeName}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className={labelTextClass}>Vật tư</span>
                    <select className={fieldClass} value={usageForm.materialId} onChange={(e) => setUsageForm((f) => ({ ...f, materialId: e.target.value }))}>
                      <option value="">Chọn vật tư</option>
                      {materials.filter((m) => m.isActive !== false).map((m) => <option key={m.materialId} value={m.materialId}>{m.name} ({m.unit})</option>)}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className={labelTextClass}>Định mức cơ bản</span>
                    <input type="number" min="0" step="0.0001" className={fieldClass} value={usageForm.baseQuantity} onChange={(e) => setUsageForm((f) => ({ ...f, baseQuantity: e.target.value }))} />
                  </label>
                  {selectedUsageMaterial && (
                    <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                      Đơn vị tính: {selectedUsageMaterial.unit}. Nhập lượng tiêu hao cho 1 lượt rửa.
                    </p>
                  )}
                  <button
                    type="button"
                    className={`${primaryButtonClass} w-full`}
                    onClick={saveUsage}
                    disabled={!canSaveUsage || savingUsage}
                  >
                    {savingUsage ? 'Đang lưu...' : editingUsage ? 'Cập nhật định mức' : 'Thêm/cập nhật định mức'}
                  </button>
                  {editingUsage && (
                    <button
                      type="button"
                      className={`${secondaryButtonClass} w-full`}
                      disabled={savingUsage}
                      onClick={resetUsageForm}
                    >
                      Hủy sửa
                    </button>
                  )}
                </div>
              </Panel>
              <Panel>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className={tableHeadClass}>
                      <tr><th className="px-4 py-3">Vật tư</th><th className="px-4 py-3">Dịch vụ</th><th className="px-4 py-3">Loại xe</th><th className="px-4 py-3">Định mức</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Sửa</th></tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60">
                      {serviceUsages.map((u) => (
                        <tr
                          key={u.serviceMaterialUsageId}
                          className={`${tableRowClass} ${editingUsage?.serviceMaterialUsageId === u.serviceMaterialUsageId ? 'bg-primary/5' : ''}`}
                        >
                          <td className="px-4 py-3 font-semibold">{u.materialName}</td>
                          <td className="px-4 py-3">{u.serviceName}</td>
                          <td className="px-4 py-3">{u.vehicleTypeName || 'Mặc định'}</td>
                          <td className="px-4 py-3">{num(u.baseQuantity)} {u.unit}</td>
                          <td className="px-4 py-3"><StatusBadge status={u.isActive ? 'Active' : 'Inactive'} /></td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className={subtleButtonClass}
                              disabled={savingUsage}
                              onClick={() => editUsage(u)}
                            >
                              {editingUsage?.serviceMaterialUsageId === u.serviceMaterialUsageId ? 'Đang sửa' : 'Sửa'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {serviceUsages.length === 0 && (
                        <TableEmpty
                          colSpan={6}
                          title={selectedServiceId ? 'Chưa có định mức' : 'Chọn service để xem định mức'}
                          description={selectedServiceId ? 'Thêm vật tư và số lượng tiêu hao cho service/loại xe đang chọn.' : 'Danh sách định mức sẽ hiển thị sau khi chọn service ở form bên trái.'}
                        />
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          )}

          {activeTab === 'multipliers' && (
            <Panel>
              <div className="divide-y divide-outline-variant/60">
                {multipliers.map((m, index) => (
                  <div key={m.id} className="grid gap-3 p-4 md:grid-cols-[1fr_120px_2fr_120px_100px] md:items-center">
                    <p className="font-semibold text-on-surface">{m.vehicleCondition}</p>
                    <input type="number" step="0.1" className={fieldClass} value={m.multiplier} onChange={(e) => setMultipliers((rows) => rows.map((row, i) => i === index ? { ...row, multiplier: e.target.value } : row))} />
                    <input className={fieldClass} value={m.description ?? ''} onChange={(e) => setMultipliers((rows) => rows.map((row, i) => i === index ? { ...row, description: e.target.value } : row))} />
                    <label className="flex items-center gap-2 text-sm text-on-surface">
                      <input
                        type="checkbox"
                        className={checkboxClass}
                        checked={m.isActive !== false}
                        onChange={(e) => setMultipliers((rows) => rows.map((row, i) => i === index ? { ...row, isActive: e.target.checked } : row))}
                      />
                      Đang áp dụng
                    </label>
                    <button
                      type="button"
                      className={primaryButtonClass}
                      disabled={Boolean(savingMultiplierId)}
                      onClick={() => saveMultiplier(m)}
                    >
                      {savingMultiplierId === m.id ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {activeTab === 'settings' && (
            <Panel>
              <div className="space-y-4 p-4">
                <select className={`${fieldClass} md:w-80`} value={filters.settingBranchId} onChange={(e) => setFilters((f) => ({ ...f, settingBranchId: e.target.value }))}>
                  <option value="">Chọn chi nhánh</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {branchSetting && (
                  <div className="grid gap-3 md:grid-cols-[220px_220px_auto] md:items-end">
                    <label className="flex items-center gap-2 text-sm text-on-surface">
                      <input
                        type="checkbox"
                        className={checkboxClass}
                        checked={settingForm.allowNegativeStock}
                        onChange={(e) => setSettingForm((f) => ({ ...f, allowNegativeStock: e.target.checked }))}
                      />
                      Cho phép âm kho
                    </label>
                    <label className="block space-y-1">
                      <span className={labelTextClass}>Giới hạn âm</span>
                      <input type="number" className={fieldClass} value={settingForm.negativeStockLimit} onChange={(e) => setSettingForm((f) => ({ ...f, negativeStockLimit: e.target.value }))} disabled={!settingForm.allowNegativeStock} />
                    </label>
                    <button
                      type="button"
                      className={primaryButtonClass}
                      disabled={savingSetting}
                      onClick={saveSetting}
                    >
                      {savingSetting ? 'Đang lưu...' : 'Lưu cấu hình'}
                    </button>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {activeTab === 'report' && report && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['Doanh thu', formatVnd(report.revenue), 'payments'],
                ['Chi phí vật tư', formatVnd(report.materialCost), 'inventory_2'],
                ['Lợi nhuận gộp', formatVnd(report.grossProfit), 'trending_up'],
                ['Biên lợi nhuận gộp', `${num(report.grossMargin)}%`, 'percent'],
                ['Dịch vụ hoàn thành', num(report.completedBookings), 'task_alt'],
              ].map(([label, value, icon]) => (
                <MetricCard key={label} label={label} value={value} icon={icon} />
              ))}
            </div>
          )}
        </>
      )}

      <FormModal
        open={materialModal}
        title={editingMaterialId ? 'Sửa vật tư' : 'Thêm vật tư'}
        submitLabel="Lưu"
        submitting={savingMaterial}
        onClose={() => setMaterialModal(false)}
        onSubmit={saveMaterial}
      >
        <div className="-mx-6 -my-4 space-y-5 bg-surface-container-low p-6">
          <label className="block space-y-1.5">
            <span className={labelTextClass}>
              Tên vật tư
            </span>
            <input
              className={fieldClass}
              value={materialForm.name}
              onChange={(e) => setMaterialForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelTextClass}>
                Nhóm
              </span>
              <input
                className={fieldClass}
                placeholder="VD: Hóa chất"
                value={materialForm.category}
                onChange={(e) => setMaterialForm((f) => ({ ...f, category: e.target.value }))}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelTextClass}>
                Đơn vị
              </span>
              <select
                className={fieldClass}
                value={materialForm.unit}
                onChange={(e) => setMaterialForm((f) => ({ ...f, unit: e.target.value }))}
                required
              >
                <option value="">Chọn đơn vị</option>
                {materialForm.unit && !materialUnits.some((unit) => unit.code === materialForm.unit) && (
                  <option value={materialForm.unit}>{materialForm.unit}</option>
                )}
                {materialUnits.filter((unit) => unit.isActive !== false).map((unit) => (
                  <option key={unit.unitId} value={unit.code}>
                    {unit.displayName} ({unit.code})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className={labelTextClass}>
              Mô tả
            </span>
            <textarea
              className={textareaClass}
              value={materialForm.description}
              onChange={(e) => setMaterialForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelTextClass}>
                Tồn tối thiểu
              </span>
              <input
                type="number"
                min="0"
                className={fieldClass}
                value={materialForm.defaultMinStockLevel}
                onChange={(e) => setMaterialForm((f) => ({ ...f, defaultMinStockLevel: e.target.value }))}
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelTextClass}>
                Ngày cảnh báo HSD
              </span>
              <input
                type="number"
                min="0"
                max="3650"
                className={fieldClass}
                value={materialForm.expiryWarningDays}
                onChange={(e) => setMaterialForm((f) => ({ ...f, expiryWarningDays: e.target.value }))}
              />
            </label>
          </div>
          <div className="space-y-3 rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <label className="flex items-center gap-3 text-sm font-medium text-on-surface">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={materialForm.requiresExpiryTracking}
                onChange={(e) => setMaterialForm((f) => ({ ...f, requiresExpiryTracking: e.target.checked }))}
              />
              Theo dõi hạn sử dụng
            </label>
            {editingMaterialId && (
              <label className="flex items-center gap-3 text-sm font-medium text-on-surface">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={materialForm.isActive}
                  onChange={(e) => setMaterialForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Đang sử dụng
              </label>
            )}
          </div>
        </div>
      </FormModal>
    </div>
  )
}
