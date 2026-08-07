const VIETNAM_PROVINCE_CODES = new Set([
  '11', '12', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23',
  '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35',
  '36', '37', '38', '40', '43', '47', '48', '49', '50', '51', '52', '53',
  '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65',
  '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77',
  '78', '79', '80', '81', '82', '83', '84', '85', '86', '88', '89', '90',
  '92', '93', '94', '95', '97', '98', '99',
])

const CIVIL_SERIES_LETTER = '[A-HK-NP-TVX-Z]'
const SPECIAL_SERIES = '(?:LD|DA|HC|KT|MK|NG|NN|QT|CV|CD|TD)'

function compactPlate(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replaceAll('Đ', 'D')
    .replace(/[^A-Z0-9]/g, '')
}

function matchVietnamesePlate(compact) {
  if (compact.length < 7 || compact.length > 10) return null

  const provinceCode = compact.slice(0, 2)
  if (!VIETNAM_PROVINCE_CODES.has(provinceCode)) return null

  const body = compact.slice(2)
  const patterns = [
    new RegExp(`^(${CIVIL_SERIES_LETTER})(\\d{4,5})$`),
    new RegExp(`^(${CIVIL_SERIES_LETTER}\\d)(\\d{4,5})$`),
    new RegExp(`^(${SPECIAL_SERIES})(\\d{4,5})$`),
  ]

  for (const pattern of patterns) {
    const match = body.match(pattern)
    if (match) {
      return {
        provinceCode,
        series: match[1],
        serial: match[2],
      }
    }
  }

  return null
}

function formatSerial(serial) {
  if (serial.length === 5) return `${serial.slice(0, 3)}.${serial.slice(3)}`
  return serial
}

/**
 * Chuẩn hóa biển số dân sự, xe máy và các series đặc biệt phổ biến tại Việt Nam.
 * Trả về chuỗi rỗng nếu kết quả OCR không có định dạng biển số hợp lệ.
 */
export function normalizeVietnameseLicensePlate(value) {
  const match = matchVietnamesePlate(compactPlate(value))
  if (!match) return ''

  return `${match.provinceCode}${match.series}-${formatSerial(match.serial)}`
}

export function isValidVietnameseLicensePlate(value) {
  return Boolean(normalizeVietnameseLicensePlate(value))
}

