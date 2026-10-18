# Proyecto II: Checkout, Órdenes y Procesamiento de Pago Sandbox

**Curso:** IC-8063 Comercio Electrónico  
**Profesor:** Ing. Joss Rayn Pecou Johnson  
**Grupo:** 60 | II Semestre, 2026 | Centro Académico de Limón

Este proyecto extiende la aplicación de comercio electrónico desarrollada durante el Proyecto I y complementada en el Laboratorio 3. Incorpora el proceso transaccional completo, desde el carrito de compras hasta la confirmación de una orden. Su propósito es implementar una experiencia de checkout, generar y gestionar una orden de compra y simular la interacción con un servicio de procesamiento de pagos en ambiente Sandbox.

## Enlaces

- **Aplicación desplegada (GitHub Pages):** https://jahirsf21.github.io/PY1-COMERCIO/
- **Tablero de Jira:** [PY2-COMERCIO](https://jahirsf.atlassian.net/jira/software/projects/SCRUM/list?jql=project+%3D+SCRUM+ORDER+BY+cf%5B10019%5D+ASC&atlOrigin=eyJpIjoiODMwYWI3OWY1YTQwNDdkNjgyNTY0NmVkMmUyNWVjOWUiLCJwIjoiaiJ9)
- **Documentación externa:** [enlace](#)

## Integrantes

| Nombre | Carné |
|---|---|
| Natalia Granados Rosales | 2021144286 |
| Deislher Sánchez Funez | 2023032794 |
| Owen Smith Cerdas | 2024083328 |

## Funcionalidades

**Heredadas del Proyecto I y del Laboratorio 3**
- Catálogo de moda, calzado y accesorios indexado en Algolia.
- Búsqueda instantánea, filtros por facetas y ordenamiento por precio.
- Vista de detalle de producto con selección de talla y color.
- Carrito de compras persistente con validación de disponibilidad y cantidades.

**Nuevas del Proyecto II**
- Checkout con los datos del comprador y la entrega. 
- Resumen de la compra con productos, subtotal y total.
- Generación de órdenes de compra persistentes.
- Pago con tarjeta en un servicio Sandbox que simula una pasarela de pago.
- Estados de la orden y del pago que se actualizan según el resultado.
- Manejo de errores en validaciones, pagos rechazados y fallas del servicio.

## Tecnologías utilizadas

- **React 19** con **TypeScript** y **Vite**.
- **React Router** para la navegación.
- **Algolia** (`algoliasearch` y `react-instantsearch`) para la búsqueda del catálogo.
- **Tailwind CSS**, **Base UI** y **shadcn** para la interfaz; **lucide-react** para los íconos.
- **localStorage** para guardar el carrito, el formulario de checkout y las órdenes.
- **GitHub Pages** (`gh-pages`) para el despliegue.

## Instalación y ejecución local

**Requisitos:** Node.js 20.19 o superior (se recomienda 22 LTS) y pnpm.

```bash
git clone https://github.com/Jahirsf21/PY1-COMERCIO.git
cd PY1-COMERCIO
pnpm install
```

Crea un archivo `.env` en la raíz con las credenciales de Algolia:

```env
VITE_ALGOLIA_APPLICATION_ID=
VITE_ALGOLIA_SEARCH_API_KEY=
VITE_ALGOLIA_MAIN_INDEX=
VITE_ALGOLIA_PRICE_ASC_INDEX=
VITE_ALGOLIA_PRICE_DESC_INDEX=
# Solo para cargar el catálogo con pnpm seed-algolia
VITE_ALGOLIA_ADMIN_API_KEY=
```

| Comando | Descripción |
|---|---|
| `pnpm dev` | Ejecuta la aplicación en modo desarrollo. |
| `pnpm build` | Genera la versión de producción en `dist/`. |
| `pnpm preview` | Sirve localmente la versión de producción. |
| `pnpm deploy` | Publica la versión de producción en GitHub Pages. |
| `pnpm seed-algolia` | Carga `data/records.json` en el índice de Algolia. |

## Estructura del proyecto

```
src/
├── assets/              Fuentes y logos de las tarjetas aceptadas
├── components/          Encabezados y componentes de interfaz compartidos (ui/)
├── features/
│   ├── catalog/         Catálogo, búsqueda y filtros
│   ├── product-detail/  Detalle de producto
│   ├── cart/            Página del carrito
│   ├── checkout/        Formulario de checkout y resumen de la orden
│   └── payments/        Página y formulario de pago
├── lib/
│   ├── algolia/         Cliente de Algolia
│   ├── cart/            Lógica y contexto del carrito
│   ├── checkout/        Validaciones y tipos del checkout
│   ├── identification/  Validación de identificaciones y consulta a Hacienda
│   ├── orders/          Lógica, tipos y contexto de las órdenes
│   ├── payments/        Servicio de pago Sandbox y validación de tarjetas
│   └── shared/          Utilidades y tipos compartidos
└── mocks/
    └── cards.ts         Tarjetas de prueba del Sandbox
data/records.json        Catálogo de productos
scripts/seed-algolia.mjs Carga del catálogo en Algolia
```

## Cómo probar el servicio de pago Sandbox

Usa estas tarjetas en la pantalla de pago. El titular puede ser cualquier nombre válido, por ejemplo "Ana Pérez". Todas las tarjetas manejan colones (CRC).

| Marca | Número | Vencimiento | CVV | Saldo | Resultado esperado |
|---|---|---|---|---|---|
| Visa | 4111 1111 1111 1111 | 12/29 | 123 | ₡500 000 | Aprobada |
| Mastercard | 5555 5555 5555 4444 | 08/28 | 456 | ₡15 000 | Fondos insuficientes (si el total supera el saldo) |
| Visa | 4012 8888 8888 1881 | 05/30 | 789 | ₡1 000 000 | Error de pasarela |
| American Express | 3782 822463 10005 | 03/27 | 1234 | ₡250 000 | Aprobada |
| Mastercard | 5105 1051 0510 5100 | 01/25 | 321 | ₡300 000 | Rechazada por vencida |

Cualquier otro número, o un vencimiento o CVV que no coincida con la tabla, devuelve "La información de la tarjeta no es válida.".

> **Importante:** estas tarjetas son ficticias y solo funcionan en el Sandbox. No ingreses tarjetas reales; la aplicación no procesa pagos reales ni guarda los datos de la tarjeta.

## Estados de la orden y del pago

| Estado de la orden | Significado |
|---|---|
| Pendiente (`PENDING`) | La orden se generó y espera un pago aprobado. |
| Confirmada (`CONFIRMED`) | El pago fue aprobado; la orden ya no se puede volver a pagar. |

| Estado del pago | Significado | Efecto en la orden |
|---|---|---|
| Pendiente (`PENDING`) | El pago se está procesando. | Se bloquean nuevos intentos. |
| Aprobado (`APPROVE`) | La pasarela aprobó el pago. | Pasa a Confirmada. |
| Rechazado (`DECLINED`) | Datos inválidos, tarjeta vencida o fondos insuficientes. | Sigue Pendiente; se puede reintentar. |
| Error (`ERROR`) | La pasarela no respondió o el pago se interrumpió al recargar la página. | Sigue Pendiente; se puede reintentar. |

Cada orden tiene un solo pago; cada reintento reemplaza al intento fallido anterior.

## Flujo de compra

1. Busca y filtra productos en el catálogo (`/`).
2. Abre un producto, elige talla y color y agrégalo al carrito.
3. Revisa el carrito (`/carrito`) y continúa al checkout.
4. Completa los datos del comprador y la entrega (`/checkout`) y genera la orden de compra.
5. En la pantalla de pago (`/pedido/:orderId/pago`), ingresa una tarjeta de prueba y paga.
6. Si el pago se aprueba, la orden queda confirmada. Si se rechaza o falla, corrige los datos o usa otra tarjeta y vuelve a intentarlo.

## Manejo de errores

Los formularios de checkout y de pago validan cada campo y muestran el error debajo del campo correspondiente antes de enviar los datos. Los pagos rechazados y los errores de la pasarela muestran un mensaje claro y dejan la orden pendiente para reintentar. Las fallas al guardar datos en el navegador se notifican sin dejar la orden en un estado inconsistente. Para más detalle, consulta la [documentación externa](#).
