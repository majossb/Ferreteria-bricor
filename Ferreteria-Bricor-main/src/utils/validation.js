/**
 * Utilidades de validación para formularios de BRICOR
 */

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim());
}

export function validatePhone(phone) {
  const cleaned = String(phone).replace(/[\s-]/g, '');
  return cleaned.length >= 7 && cleaned.length <= 15 && /^[0-9+]+$/.test(cleaned);
}

export function validateRequired(value) {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
}

export function validateCheckoutForm(fields) {
  const errors = {};

  if (!validateRequired(fields.fullName)) {
    errors.fullName = 'El nombre completo o razón social es obligatorio';
  }

  if (!validateRequired(fields.documentNumber)) {
    errors.documentNumber = 'El documento de identidad o NIT es obligatorio';
  }

  if (!validateRequired(fields.email)) {
    errors.email = 'El correo electrónico es obligatorio';
  } else if (!validateEmail(fields.email)) {
    errors.email = 'Introduce un correo electrónico válido';
  }

  if (!validateRequired(fields.phone)) {
    errors.phone = 'El teléfono de contacto es obligatorio';
  } else if (!validatePhone(fields.phone)) {
    errors.phone = 'Introduce un teléfono válido (al menos 7 dígitos)';
  }

  if (!validateRequired(fields.address)) {
    errors.address = 'La dirección de entrega es obligatoria';
  }

  if (!validateRequired(fields.city)) {
    errors.city = 'La ciudad o municipio es obligatorio';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
