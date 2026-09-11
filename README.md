# Proyecto #1 – Catálogo B2C

**Curso:** IC-8063 Comercio Electrónico
**Profesor:** Ing. Joss Rayn Pecou Johnson
**Grupo:** 60 | II Semestre, 2026 | Centro Académico de Limón

## Estudiantes

- Natalia Granados Rosales | 2021144286
- Deislher Sánchez Funez | 2023032794
- Owen Smith Cerdas | 2024083328

## Sobre el proyecto

Aplicación web SPA (React + Vite) que implementa la arquitectura base de una plataforma de comercio electrónico orientada al consumidor final (B2C), enfocada en el sector de **Moda, Calzado y Accesorios Personales**.

El proyecto contempla:
- Un modelo de datos que soporta canales **B2C**, **B2B** y disponibilidad **multi-sede** por provincia, usando el SKU como identificador de variante de producto.
- Indexación del catálogo en **Algolia**, separando los atributos configurados como *searchable* (`title`, `brand`, `categories`, `keywords`) de las facetas de filtrado (categoría, marca, precio, talla, color, uso recomendado, género, provincia, descuento).
- Búsqueda instantánea (*search-as-you-type*) y navegación por facetas con `react-instantsearch`.
- Vista de detalle de producto con rutas dinámicas (`/producto/:id`).
- Despliegue continuo en GitHub Pages.

## Lecciones aprendidas

- Validar el esquema de producto desde etapas tempranas con datos de prueba evita tener que reestructurar el JSON y reindexar el catálogo una vez avanzada la implementación.
- Separar correctamente los atributos *searchable* de las facetas desde el modelo de datos —en lugar de ajustarlo después en la configuración del índice— simplifica la implementación del buscador y evita reindexaciones innecesarias.
- Precalcular campos derivados (stock total, disponibilidad por canal, estado de descuentos) reduce errores de consistencia frente a calcularlos en el frontend.

## Enlaces

- **Aplicación:** https://jahirsf21.github.io/PY1-COMERCIO/
