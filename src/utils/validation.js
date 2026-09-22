// Mirrors the validation rules enforced by the backend DTOs (see
// BLL/DTOs/Auth/AuthDTOs.cs, BLL/DTOs/HR/StaffManagementDTOs.cs,
// BLL/DTOs/HR/CreateEmployeeDTO.cs, BLL/DTOs/Business/BusinessDTOs.cs,
// BLL/DTOs/Core/ProfileDTOs.cs). Keep these in sync with the backend
// regexes so the client never accepts input the server will reject.

// Backend: ^0[35789][0-9]{8}$
export const PHONE_REGEX = /^0[35789][0-9]{8}$/

// Backend: ^(?=.*[A-Z])(?=.*\d).{8,}$  (>= 8 chars, at least 1 uppercase, 1 digit)
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/

// Backend uses the [EmailAddress] data annotation; this is a standard
// permissive equivalent for client-side use.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PHONE_ERROR_MESSAGE = 'Số điện thoại không hợp lệ (VD: 09xxxxxxxx, 03/05/07/08/09).'
export const PASSWORD_ERROR_MESSAGE = 'Mật khẩu cần tối thiểu 8 ký tự, có ít nhất 1 chữ hoa và 1 chữ số.'
export const EMAIL_ERROR_MESSAGE = 'Email không hợp lệ.'

export function isValidPhoneNumber(value) {
  return PHONE_REGEX.test(String(value ?? '').trim())
}

export function isValidPassword(value) {
  return PASSWORD_REGEX.test(String(value ?? ''))
}

export function isValidEmail(value) {
  return EMAIL_REGEX.test(String(value ?? '').trim())
}
