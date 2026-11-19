/**
 * Utilidades de validación para formularios de BRICOR
 */
const LETRAS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';

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

export function validateName(value) {
  const v = String(value).trim();
  return v.length >= 3 && v.length <= 100 &&
    new RegExp(`^[${LETRAS}0-9 .,&'-]+$`).test(v) && new RegExp(`[${LETRAS}]`).test(v);
}

export function validateDocument(value) {
  const v = String(value).trim();
  const digits = v.replace(/[.\-\s]/g, '');
  return /^[0-9.\-\s]+$/.test(v) && /^[0-9]{6,10}$/.test(digits);
}

export function validateEmailStrict(email) {
  const v = String(email).trim();
  return v.length <= 100 &&
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v);
}

export function validateColombianMobile(phone) {
  const cleaned = String(phone).replace(/[\s-]/g, '').replace(/^\+?57/, '');
  return /^3[0-9]{9}$/.test(cleaned);
}

export function validateAddress(value) {
  const v = String(value).trim();
  return v.length >= 5 && v.length <= 120 &&
    new RegExp(`^[${LETRAS}0-9 #.,°ºª/-]+$`).test(v);
}

export function validateCity(value) {
  const v = String(value).trim();
  return v.length >= 3 && v.length <= 60 && new RegExp(`^[${LETRAS} .'-]+$`).test(v);
}

export function validateCheckoutForm(fields) {
  const errors = {};

  if (!validateRequired(fields.fullName)) {
    errors.fullName = 'El nombre completo o razón social es obligatorio';
  } else if (!validateName(fields.fullName)) {
    errors.fullName = "Usa solo letras, números y . , & ' - (entre 3 y 100 caracteres)";
  }

  if (!validateRequired(fields.documentNumber)) {
    errors.documentNumber = 'El documento de identidad o NIT es obligatorio';
  } else if (!validateDocument(fields.documentNumber)) {
    errors.documentNumber = 'Ingresa solo números (6 a 10 dígitos). Puedes usar puntos y guion, ej. 901.234.567-8';
  }

  if (!validateRequired(fields.email)) {
    errors.email = 'El correo electrónico es obligatorio';
  } else if (!validateEmail(fields.email) || !validateEmailStrict(fields.email)) {
    errors.email = 'Introduce un correo electrónico válido';
  }

  if (!validateRequired(fields.phone)) {
    errors.phone = 'El teléfono de contacto es obligatorio';
  } else if (!validatePhone(fields.phone)) {
    errors.phone = 'Introduce un teléfono válido (al menos 7 dígitos)';
  } else if (!validateColombianMobile(fields.phone)) {
    errors.phone = 'Introduce un celular colombiano de 10 dígitos, ej. 310 000 0000';
  }

  if (!validateRequired(fields.address)) {
    errors.address = 'La dirección de entrega es obligatoria';
  } else if (!validateAddress(fields.address)) {
    errors.address = 'Usa solo letras, números y # . , - / (entre 5 y 120 caracteres)';
  }

  if (!validateRequired(fields.city)) {
    errors.city = 'La ciudad o municipio es obligatorio';
  } else if (!validateCity(fields.city)) {
    errors.city = 'Usa solo letras en la ciudad o municipio';
  }

  if (fields.notes && String(fields.notes).length > 300) {
    errors.notes = 'Las instrucciones no pueden superar 300 caracteres';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}