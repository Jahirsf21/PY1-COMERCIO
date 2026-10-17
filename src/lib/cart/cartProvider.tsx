import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { CartAction, CartContextValue, CartItem, CartItemValidation, CartProduct, CartQuantityLimits, CartValidationResult } from "@/lib/cart/types"
import { cart_reducer, create_cart_item, get_cart_add_quantity_limits, get_cart_item_id, get_cart_shipping_cost, get_cart_subtotal, get_cart_tax, get_cart_total, get_cart_total_units, get_cart_validation_error, get_stored_cart, is_valid_cart_quantity, parse_cart_data, save_cart } from "@/lib/cart/cart"
import { get_catalog_quantity_limits, get_cart_validation } from "@/lib/catalog/catalog"
import CartContext from "@/lib/cart/cartContext"

/**
 * Provee el estado del carrito y sus acciones a los componentes descendientes.
 * Recupera el carrito de localStorage, lo guarda en cada cambio y valida sus líneas con el catálogo.
 * @param props Propiedades del proveedor.
 * @param props.children Componentes que consumen el contexto.
 * @returns Proveedor del contexto del carrito.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [stored_snapshot] = useState(get_stored_cart)
  const [cart, set_cart] = useState(stored_snapshot.cart)
  const current_cart = useRef(cart)
  const [validation_results, set_validation_results] = useState<Record<string, CartValidationResult>>({})
  const current_validations = useRef<Record<string, CartValidationResult>>({})
  const [validation_version, set_validation_version] = useState(0)
  const validation_generation = useRef(0)
  const [pending_operations, set_pending_operations] = useState(0)
  const [storage_error, set_storage_error] = useState(stored_snapshot.storage_error)
  const [notice, set_notice] = useState<string | null>(stored_snapshot.discarded_items ? "No pudimos recuperar algunos productos de tu carrito." : null)
  const has_user_changes = useRef(false)
  const removal_versions = useRef(new Map<string, number>())
  const clear_version = useRef(0)

  /**
   * Aplica una acción al carrito mediante cart_reducer() y actualiza el estado.
   * Al eliminar o vaciar, retira las validaciones de las líneas eliminadas y aumenta sus versiones de eliminación.
   * @param action Acción que se desea aplicar.
   * @returns true si el carrito cambió; false si no hubo cambios.
   */
  const apply_action = useCallback((action: CartAction): boolean => {
    const next_cart = cart_reducer(current_cart.current, action)
    if (next_cart === current_cart.current) return false
    if (action.type !== "refresh") has_user_changes.current = true
    if (action.type === "remove" || action.type === "clear") {
      if (action.type === "clear") clear_version.current += 1
      else removal_versions.current.set(action.item_id, (removal_versions.current.get(action.item_id) ?? 0) + 1)
      const remaining_item_ids = new Set(next_cart.map((item) => item.id))
      const next_validations = Object.fromEntries(Object.entries(current_validations.current).filter(([item_id]) => remaining_item_ids.has(item_id)))
      current_validations.current = next_validations
      set_validation_results(next_validations)
    }
    current_cart.current = next_cart
    set_cart(next_cart)
    return true
  }, [])

  /**
   * Borra los resultados de validación para volver a validar todas las líneas.
   * @returns No retorna ningún valor.
   */
  const revalidate_cart = useCallback((): void => {
    validation_generation.current += 1
    current_validations.current = {}
    set_validation_results({})
    set_validation_version((previous_version) => previous_version + 1)
  }, [])

  /**
   * Obtiene la versión de eliminación de una línea y del carrito.
   * @param item_id Identificador de la línea.
   * @returns Versión con el formato vaciado:eliminación.
   */
  const get_operation_version = useCallback((item_id: string): string => {
    return `${clear_version.current}:${removal_versions.current.get(item_id) ?? 0}`
  }, [])

  /**
   * Marca una línea con estado error si sigue siendo la misma referencia en el carrito.
   * @param item Línea del carrito.
   * @returns No retorna ningún valor.
   */
  const mark_validation_error = useCallback((item: CartItem): void => {
    if (current_cart.current.find((current_item) => current_item.id === item.id) !== item) return
    const next_validations = { ...current_validations.current, [item.id]: get_cart_validation_error(item) }
    current_validations.current = next_validations
    set_validation_results(next_validations)
    validation_generation.current += 1
    set_validation_version((previous_version) => previous_version + 1)
  }, [])

  /**
   * Consulta los límites de cantidad de una variante y talla mediante get_catalog_quantity_limits().
   * Cuenta la consulta como operación pendiente mientras se resuelve.
   * @param product_id Identificador del producto.
   * @param sku SKU de la variante.
   * @param selected_size Talla seleccionada.
   * @param original_item Línea que se marca con error si falla la consulta.
   * @returns Límites de cantidad, o null si la variante no está disponible.
   * @throws Si falla la consulta al catálogo.
   */
  const lookup_limits = useCallback(async (product_id: string, sku: string, selected_size: string, original_item?: CartItem): Promise<CartQuantityLimits | null> => {
    set_pending_operations((operation_count) => operation_count + 1)
    try {
      return await get_catalog_quantity_limits(product_id, sku, selected_size)
    } catch (error) {
      if (original_item) mark_validation_error(original_item)
      throw error
    } finally {
      set_pending_operations((operation_count) => operation_count - 1)
    }
  }, [mark_validation_error])

  useEffect(() => {
    let is_effect_active = true
    queueMicrotask(() => {
      if (!is_effect_active || (stored_snapshot.storage_error && !has_user_changes.current)) return
      set_storage_error(!save_cart(cart))
    })
    return () => { is_effect_active = false }
  }, [cart, stored_snapshot.storage_error])

  useEffect(() => {
    const pending_items = cart.filter((item) => current_validations.current[item.id]?.item !== item)
    if (pending_items.length === 0) return
    let is_effect_active = true
    const request_generation = validation_generation.current
    get_cart_validation(pending_items)
      .then((received_validations) => {
        if (!is_effect_active || request_generation !== validation_generation.current) return
        const applicable_results = received_validations.filter((validation_result) => current_cart.current.find((item) => item.id === validation_result.original_item.id) === validation_result.original_item)
        if (applicable_results.length === 0) return
        const next_validations = { ...current_validations.current }
        for (const validation_result of applicable_results) next_validations[validation_result.item.id] = validation_result
        current_validations.current = next_validations
        set_validation_results(next_validations)
        apply_action({ type: "refresh", results: applicable_results })
        if (applicable_results.some((validation_result) => validation_result.item.unit_price !== validation_result.original_item.unit_price || validation_result.item.currency !== validation_result.original_item.currency)) {
          set_notice((previous_notice) => previous_notice ?? "Actualizamos los precios. Revisa tu carrito antes de continuar.")
        }
      })
      .catch(() => {
        if (is_effect_active && request_generation === validation_generation.current) for (const item of pending_items) mark_validation_error(item)
      })
    return () => { is_effect_active = false }
  }, [cart, validation_version, apply_action, mark_validation_error])

  const item_validation = useMemo<Record<string, CartItemValidation>>(() => Object.fromEntries(cart.map((item) => {
    const validation_result = validation_results[item.id]
    return [item.id, validation_result?.item === item ? validation_result : { status: "pending", limits: null }]
  })), [cart, validation_results])
  const is_validating = pending_operations > 0 || Object.values(item_validation).some((validation_result) => validation_result.status === "pending")
  const can_checkout = cart.length > 0 && !is_validating && Object.values(item_validation).every((validation_result) => validation_result.status === "valid") &&
    new Set(cart.map((item) => item.currency)).size === 1

  const context_value = useMemo<CartContextValue>(() => ({
    cart,
    subtotal: get_cart_subtotal(cart),
    shipping: get_cart_shipping_cost(cart),
    tax: get_cart_tax(cart),
    total: get_cart_total(cart),
    total_items: get_cart_total_units(cart),
    item_validation,
    is_validating,
    can_checkout,
    storage_error,
    notice,
    revalidate_cart,
    /**
     * Cierra el aviso del carrito.
     * @returns No retorna ningún valor.
     */
    dismiss_notice: () => set_notice(null),
    /**
     * Agrega unidades de una variante y talla al carrito con los límites consultados en el catálogo.
     * @param product Producto que se desea agregar.
     * @param selected_size Talla seleccionada.
     * @param quantity Unidades que se desean agregar; por defecto, el mínimo calculado con get_cart_add_quantity_limits().
     * @returns true si se agregaron las unidades.
     * @throws Si falla la consulta al catálogo.
     */
    add_to_cart: async (product: CartProduct, selected_size: string, quantity?: number) => {
      if (quantity !== undefined && (!Number.isSafeInteger(quantity) || quantity < 1)) return false
      const item_id = get_cart_item_id(product.sku, selected_size)
      const operation_version = get_operation_version(item_id)
      const original_item = current_cart.current.find((item) => item.id === item_id)
      const limits = await lookup_limits(product.product_id, product.sku, selected_size, original_item)
      if (operation_version !== get_operation_version(item_id)) return false
      if (!limits) {
        if (current_cart.current.some((item) => item.id === item_id)) revalidate_cart()
        return false
      }
      const cart_quantity = current_cart.current.find((item) => item.id === item_id)?.quantity ?? 0
      const additional_limits = get_cart_add_quantity_limits(limits, cart_quantity)
      const additional_quantity = quantity ?? additional_limits?.min_quantity ?? 0
      if (!is_valid_cart_quantity(additional_quantity, additional_limits)) {
        if (current_cart.current.some((item) => item.id === item_id)) revalidate_cart()
        return false
      }
      const new_item = parse_cart_data([create_cart_item(product, selected_size, additional_quantity)]).cart[0]
      if (!new_item) return false
      const action_accepted = apply_action({ type: "add", item: new_item, limits })
      if (!action_accepted && current_cart.current.some((item) => item.id === item_id)) revalidate_cart()
      return action_accepted
    },
    /**
     * Actualiza la cantidad de una línea con los límites consultados en el catálogo.
     * @param item_id Identificador de la línea.
     * @param quantity Cantidad nueva.
     * @returns Promesa que finaliza al procesar el cambio.
     * @throws Si falla la consulta al catálogo.
     */
    set_quantity: async (item_id: string, quantity: number) => {
      if (!Number.isSafeInteger(quantity)) return
      const item = current_cart.current.find((cart_item) => cart_item.id === item_id)
      if (!item) return
      const operation_version = get_operation_version(item_id)
      const limits = await lookup_limits(item.product_id, item.sku, item.selected_size, item)
      const latest_item = current_cart.current.find((cart_item) => cart_item.id === item_id)
      if (operation_version !== get_operation_version(item_id) || !latest_item || latest_item.quantity !== item.quantity) return
      const action_accepted = limits ? apply_action({ type: "set_quantity", item_id, quantity, limits }) : false
      if (!action_accepted) revalidate_cart()
    },
    /**
     * Aumenta un paso la cantidad de una línea con los límites consultados en el catálogo.
     * @param item_id Identificador de la línea.
     * @returns true si la cantidad aumentó.
     * @throws Si falla la consulta al catálogo.
     */
    increment_item: async (item_id: string) => {
      const item = current_cart.current.find((cart_item) => cart_item.id === item_id)
      if (!item) return false
      const operation_version = get_operation_version(item_id)
      const limits = await lookup_limits(item.product_id, item.sku, item.selected_size, item)
      if (operation_version !== get_operation_version(item_id)) return false
      const action_accepted = limits ? apply_action({ type: "increment", item_id, limits }) : false
      if (!action_accepted && current_cart.current.some((cart_item) => cart_item.id === item_id)) revalidate_cart()
      return action_accepted
    },
    /**
     * Reduce un paso la cantidad de una línea con los límites consultados en el catálogo.
     * @param item_id Identificador de la línea.
     * @returns true si la cantidad se redujo.
     * @throws Si falla la consulta al catálogo.
     */
    decrement_item: async (item_id: string) => {
      const item = current_cart.current.find((cart_item) => cart_item.id === item_id)
      if (!item) return false
      const operation_version = get_operation_version(item_id)
      const limits = await lookup_limits(item.product_id, item.sku, item.selected_size, item)
      if (operation_version !== get_operation_version(item_id)) return false
      const action_accepted = limits ? apply_action({ type: "decrement", item_id, limits }) : false
      if (!action_accepted && current_cart.current.some((cart_item) => cart_item.id === item_id)) revalidate_cart()
      return action_accepted
    },
    /**
     * Elimina una línea del carrito.
     * @param item_id Identificador de la línea.
     * @returns No retorna ningún valor.
     */
    remove_item: (item_id: string) => {
      apply_action({ type: "remove", item_id })
    },
    /**
     * Vacía el carrito.
     * @returns No retorna ningún valor.
     */
    clear_cart: () => {
      apply_action({ type: "clear" })
    },
  }), [cart, item_validation, is_validating, can_checkout, storage_error, notice, revalidate_cart, apply_action, lookup_limits, get_operation_version])

  return (
    <CartContext.Provider value={context_value}>
      {children}
    </CartContext.Provider>
  )
}
