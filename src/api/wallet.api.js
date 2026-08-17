import { apiRequest } from './client'

/** @param {Record<string, unknown>} item */
export function normalizeWallet(item) {
  return {
    walletId: Number(item.walletId ?? item.id ?? 0),
    userId: Number(item.userId ?? 0),
    balance: Number(item.balance ?? 0),
    totalPoints: Number(item.totalPoints ?? item.totalPoint ?? 0),
    promotionPoints: Number(item.promotionPoints ?? item.promotionPoint ?? 0),
    currency: String(item.currency ?? 'VND'),
    isActive: item.isActive !== false,
    updatedAt: item.updatedAt != null ? String(item.updatedAt) : null,
  }
}

export async function fetchMyWallet() {
  const data = await apiRequest('/wallets/me')
  if (data && typeof data === 'object') {
    return normalizeWallet(/** @type {Record<string, unknown>} */ (data))
  }
  return normalizeWallet({})
}

/** @param {{ amount: number; returnUrl: string; cancelUrl: string }} payload */
export function createWalletTopUp(payload) {
  return apiRequest('/wallets/top-up', {
    method: 'POST',
    body: JSON.stringify({
      amount: Number(payload.amount),
      returnUrl: payload.returnUrl,
      cancelUrl: payload.cancelUrl,
    }),
  })
}
