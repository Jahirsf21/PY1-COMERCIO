/**
 * Resultado de leer un JSON guardado en el navegador.
 * ok: el contenido se convirtió y está en data.
 * empty: la clave no existe.
 * invalid_json: el contenido no es un JSON válido.
 * storage_error: el navegador impide leer localStorage.
 */
export type StoredJsonResult =
  | {
    status: "ok"
    data: unknown
  }
  | {
    status: "empty" | "invalid_json" | "storage_error"
  }
