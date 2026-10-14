import type { BuyerInfo, IdentificationType } from "@/lib/checkout/types";

/**
 * Verifica que un valor contenga únicamente dígitos después de eliminar los espacios externos.
 * @param numeric_text Valor cuyo contenido se desea comprobar.
 * @returns true si el valor contiene uno o más dígitos; false si está vacío o incluye otros caracteres.
 */
export function validate_number(numeric_text: string): boolean {
  return /^\d+$/.test(numeric_text.trim());
}

/**
 * Verifica que un texto contenga únicamente letras de la A a la Z y espacios en blanco.
 * Admite vocales con tilde y la letra ñ, tanto en mayúsculas como en minúsculas.
 * @param text Texto cuyo contenido se desea comprobar.
 * @returns true si el texto no está vacío y todos sus caracteres están permitidos.
 */
export function validate_text(text: string): boolean {
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(text);
}

/**
 * Valida la longitud de un número de teléfono de Costa Rica.
 * Ignora los espacios al inicio y al final, sin comprobar el contenido numérico.
 * @param phone_number Número de teléfono cuya longitud se desea comprobar.
 * @returns true si el valor tiene exactamente 8 caracteres después de eliminar los espacios externos.
 */
export function validate_phone_length(phone_number: string): boolean {
  return phone_number.trim().length === 8;
}

/**
 * Valida la longitud de una identificación según el tipo seleccionado.
 * Nacional admite 9 caracteres; Extranjero admite 11 o 12. Ignora los espacios externos.
 * @param identification Número de identificación cuya longitud se desea comprobar.
 * @param identification_type Tipo de identificación de la persona compradora.
 * @returns true si la longitud corresponde a Nacional o Extranjero; false para Otro o una longitud inválida.
 */
export function validate_identification_length(identification: string, identification_type: IdentificationType): boolean {
  const identification_length = identification.trim().length;
  if (identification_type === "Nacional") return identification_length === 9;
  if (identification_type === "Extranjero") return [11, 12].includes(identification_length);
  return false;
}

/**
 * Valida que una identificación contenga solo dígitos y tenga la longitud correspondiente a su tipo.
 * Exige 9 dígitos para Nacional y 11 o 12 para Extranjero, después de eliminar los espacios externos.
 * @param identification Número de identificación sin espacios internos ni separadores.
 * @param identification_type Tipo de identificación de la persona compradora.
 * @returns true si el contenido y la longitud son válidos; false para Otro o un formato inválido.
 */
export function validate_identification(identification: string, identification_type: IdentificationType): boolean {
  return validate_number(identification) && validate_identification_length(identification, identification_type);
}

/**
 * Valida el tipo de identificación seleccionado por la persona compradora.
 * Admite Nacional, Extranjero y Otro; rechaza los valores vacíos y los tipos no disponibles.
 * @param identification_type Tipo de identificación que se desea validar.
 * @returns Resultado de la validación.
 *   valid: true si el tipo seleccionado es Nacional, Extranjero u Otro.
 *   error: motivo del rechazo cuando valid es false.
 */
export function validate_identification_type(identification_type: string): { valid: boolean; error?: string } {
  if (!identification_type.trim()) {
    return { valid: false, error: "El tipo de identificación es obligatorio." };
  }
  if (identification_type !== "Nacional" && identification_type !== "Extranjero" && identification_type !== "Otro") {
    return { valid: false, error: "El tipo de identificación debe ser Nacional, Extranjero u Otro." };
  }
  return { valid: true };
}

/**
 * Valida el número de identificación de la persona compradora según el tipo seleccionado.
 * Requiere un valor numérico de 9 dígitos para Nacional, o de 11 o 12 para Extranjero.
 * Para Otro exige un valor numérico de entre 1 y 12 dígitos.
 * @param identification Número de identificación sin letras, espacios internos ni separadores.
 * @param identification_type Tipo de identificación de la persona compradora.
 * @returns Resultado de la validación.
 *   valid: true si la identificación está presente y cumple el formato de su tipo.
 *   error: primer requisito incumplido, cuando valid es false.
 */
export function validate_identification_number(identification: string, identification_type: IdentificationType): { valid: boolean; error?: string } {
  if (!identification.trim()) {
    return { valid: false, error: "El número de identificación es obligatorio." };
  }
   const identification_type_result = validate_identification_type(identification_type);
   if (!identification_type_result.valid) return identification_type_result;
  if (!validate_number(identification)) {
    return { valid: false, error: "El número de identificación debe contener solo dígitos, sin guiones ni espacios entre ellos." };
  }
  if (identification_type === "Otro") {
    return identification.trim().length <= 12 ? { valid: true } : { valid: false, error: "El número de identificación debe contener como máximo 12 dígitos." };
  }
  if (!validate_identification_length(identification, identification_type)) {
    return {
      valid: false,
      error: identification_type === "Nacional" ? "La identificación nacional debe tener exactamente 9 dígitos." : "La identificación extranjera debe tener 11 o 12 dígitos.",
    };
  }
  return { valid: true };
}

/**
 * Valida el nombre completo de la persona compradora.
 * Requiere al menos 2 caracteres después de eliminar los espacios externos y admite solo letras y espacios.
 * @param full_name Nombre completo que se desea validar.
 * @returns Resultado de la validación.
 *   valid: true si el nombre está presente y cumple el contenido y la longitud permitidos.
 *   error: primer requisito incumplido, cuando valid es false.
 */
export function validate_full_name(full_name: string): { valid: boolean; error?: string } {
  const trimmed_full_name = full_name.trim();
  if (!trimmed_full_name) {
    return { valid: false, error: "El nombre completo es obligatorio." };
  }
  if (!validate_text(trimmed_full_name)) {
    return { valid: false, error: "El nombre completo debe contener únicamente letras y espacios." };
  }
  if (trimmed_full_name.length < 2) {
    return { valid: false, error: "El nombre completo debe tener al menos 2 caracteres." };
  }
  return { valid: true };
}

/**
 * Valida el formato de un correo electrónico y comprueba si el campo es obligatorio.
 * Elimina los espacios externos y permite valores vacíos únicamente cuando el campo es opcional.
 * @param email Dirección de correo electrónico que se desea validar; vacía por defecto.
 * @param required Indica si el campo es obligatorio; true por defecto.
 * @param field_name Nombre usado en los mensajes de error; correo electrónico por defecto.
 * @returns Resultado de la validación.
 *   valid: true si el correo tiene un formato válido o está vacío y es opcional.
 *   error: motivo del rechazo cuando valid es false.
 */
export function validate_email(email: string = "", required: boolean = true, field_name: string = "correo electrónico"): { valid: boolean; error?: string } {
  const trimmed_email = email.trim();
  if (!trimmed_email) {
    return required ? { valid: false, error: `El ${field_name} es obligatorio.` } : { valid: true };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed_email)) {
    return { valid: false, error: `El ${field_name} debe tener un formato válido, por ejemplo: nombre@dominio.com.` };
  }
  return { valid: true };
}

/**
 * Valida el contenido y la longitud de un número de teléfono de Costa Rica.
 * Exige exactamente 8 dígitos sin espacios internos ni separadores; permite valores vacíos si el campo es opcional.
 * @param phone_number Número de teléfono que se desea validar; vacío por defecto.
 * @param required Indica si el campo es obligatorio; true por defecto.
 * @param field_name Nombre usado en los mensajes de error; número de teléfono por defecto.
 * @returns Resultado de la validación.
 *   valid: true si el teléfono cumple el formato requerido o está vacío y es opcional.
 *   error: primer requisito incumplido, cuando valid es false.
 */
export function validate_phone_number(phone_number: string = "", required: boolean = true, field_name: string = "número de teléfono"): { valid: boolean; error?: string } {
  const trimmed_phone_number = phone_number.trim();
  if (!trimmed_phone_number) {
    return required ? { valid: false, error: `El ${field_name} es obligatorio.` } : { valid: true };
  }
  if (!validate_number(trimmed_phone_number)) {
    return { valid: false, error: `El ${field_name} debe contener solo dígitos, sin guiones ni espacios entre ellos.` };
  }
  if (!validate_phone_length(trimmed_phone_number)) {
    return { valid: false, error: `El ${field_name} debe tener exactamente 8 dígitos.` };
  }
  return { valid: true };
}

/**
 * Valida los datos de identificación y contacto de la persona compradora.
 * El nombre, el tipo y número de identificación, el correo y el teléfono principales son obligatorios.
 * Los contactos alternativos son opcionales, pero deben tener un formato válido cuando contienen un valor.
 * @param buyer Información de la persona compradora que se desea validar.
 * @returns Resultado de la validación.
 *   valid: true si todos los campos obligatorios y los contactos alternativos proporcionados son válidos.
 *   error: mensaje del primer campo inválido, siguiendo el orden de nombre, identificación, correos y teléfonos.
 */
export function validate_buyer_info(buyer: BuyerInfo): { valid: boolean; error?: string } {
  const validations = [
    validate_full_name(buyer.full_name),
    validate_identification_type(buyer.identification_type),
    validate_identification_number(buyer.identification_number, buyer.identification_type),
    validate_email(buyer.email),
    validate_email(buyer.alternative_email, false, "correo electrónico alternativo"),
    validate_phone_number(buyer.phone_number),
    validate_phone_number(buyer.alternative_phone_number, false, "número de teléfono alternativo"),
  ];

  return validations.find((validation) => !validation.valid) ?? { valid: true };
}

/**
 * Obtiene el nombre registrado para una identificación desde la API de Hacienda de Costa Rica.
 * Elimina los espacios externos y consulta únicamente identificaciones válidas de tipo Nacional o Extranjero.
 * No realiza la petición cuando el tipo seleccionado es Otro.
 * @param identification Número de identificación que se desea consultar, sin espacios internos ni separadores.
 * @param identification_type Tipo de identificación de la persona compradora.
 * @returns Nombre asociado a la identificación, o null si no se consulta la API, la respuesta no es exitosa o no incluye un nombre.
 * @throws Si ocurre un error de red o la respuesta no se puede interpretar como JSON.
 */
export async function get_name_from_hacienda(identification: string, identification_type: IdentificationType): Promise<string | null> {
  if (identification_type === "Otro") return null;
  const identification_number = identification.trim();
  if (!validate_identification(identification_number, identification_type)) return null;
  const response = await fetch(
    `https://api.hacienda.go.cr/fe/ae?identificacion=${encodeURIComponent(identification_number)}`
  );
  if (!response.ok) return null;
  const taxpayer_data = await response.json();
  return taxpayer_data.nombre ?? null;
}
