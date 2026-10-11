/**
 * Valida el formato de un número de identificación.
 * Las cédulas nacionales deben contener 9 dígitos; las internacionales, 11 o 12 dígitos.
 * @param {string} identification Número de identificación sin espacios ni separadores.
 * @returns {boolean} true si el valor contiene solo dígitos y tiene una longitud permitida.
 */
export function validate_identification(identification: string): boolean {
  const has_valid_length = [9, 11, 12].includes(identification.length);
  const contains_only_digits = !/\D/.test(identification);
  return has_valid_length && contains_only_digits;
}

/**
 * Obtiene el nombre asociado a un número de identificación desde la API de Hacienda de Costa Rica.
 * Omite la consulta cuando el formato de la identificación es inválido.
 * @param {string} identification Número de identificación que se desea consultar.
 * @returns {Promise<string | null>} Nombre registrado, o null si la identificación es inválida, la respuesta no es exitosa o no incluye el nombre.
 * @throws {Error} Si la petición falla o la respuesta no se puede interpretar como JSON.
 */
export async function get_name_from_hacienda(identification: string): Promise<string | null> {
  if (!validate_identification(identification)) return null;

  const response = await fetch(
    `https://api.hacienda.go.cr/fe/ae?identificacion=${encodeURIComponent(identification)}`
  );

  if (!response.ok) return null;

  const data = await response.json();
  return data.nombre ?? null;
}
