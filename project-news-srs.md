# Project News — Especificación Técnica v1.0
### Newsletter semanal automatizada de SEO, Data, Google e IA Search

---

## 1. Visión general

**Project News** es una newsletter semanal generada de forma automática que rastrea las fuentes más relevantes del sector SEO/GEO/Search, extrae las noticias con mayor impacto, y las publica en tres formatos: una página web propia, un post de LinkedIn y un mensaje de Slack.

El objetivo no es competir en volumen con SEOFOMO, Search Engine Land, etc., sino ofrecer una capa de curación con criterio propio (15 años de experiencia en el sector aplicados como filtro de relevancia) sobre el ruido diario del ecosistema.

**Principios de diseño:**
- Curación 100% automática vía IA, con un **modo preview** en las primeras semanas para validar calidad antes de publicar sin supervisión.
- Prioriza señal sobre volumen: mejor 8-12 noticias bien filtradas que 30 genéricas.
- Un único pipeline de datos alimenta los tres formatos de salida (web, LinkedIn, Slack), evitando triplicar el trabajo editorial.

---

## 2. Fuentes (v1)

### 2.1 Oficiales
| Fuente | Tipo | Ingesta |
|---|---|---|
| Google Search Central Blog | Blog oficial | RSS |
| Google Search Status Dashboard | Dashboard de incidencias/updates | Scraping ligero (Firecrawl) |
| Google Search Central on X | Anuncios rápidos | API/scraping |
| OpenAI Blog | Cambios que afectan a AI search | RSS |
| Anthropic News | Cambios que afectan a AI search | RSS |

### 2.2 Agregadoras / newsletters de referencia
| Fuente | Tipo | Ingesta |
|---|---|---|
| SEOFOMO | Newsletter semanal | RSS/scraping web |
| Search Engine Land | Medio especializado | RSS |
| Search Engine Journal | Medio especializado | RSS |
| Search Engine Roundtable (Barry Schwartz) | Blog — suele confirmar primero | RSS |
| Moz Blog | Blog especializado | RSS |
| Ahrefs Blog | Blog especializado | RSS |

### 2.3 Voces individuales
| Fuente | Foco | Ingesta |
|---|---|---|
| Glenn Gabe | Algoritmo/penalizaciones | X/blog scraping |
| Lily Ray | E-E-A-T, YMYL, algoritmo | X/blog scraping |
| Marie Haynes | Algoritmo, calidad | X/blog scraping |
| Mike King (iPullRank) | GEO/AI search, técnico | Blog RSS + X |
| Gianluca Fiorelli | Internacional, estrategia | X/LinkedIn |
| Aleyda Solis | Estrategia, internacional | X/LinkedIn/newsletter |

> Lista de arranque, no cerrada. Tras 3-4 semanas revisamos qué fuentes generan señal real (noticias que efectivamente se seleccionan) frente a las que solo aportan ruido, y ajustamos.

---

## 3. Arquitectura del pipeline

```
[Fuentes] → [Ingesta] → [Deduplicación/Agrupación] → [Scoring IA] → [Extracción/Redacción IA] → [Generación de outputs] → [Publicación]
```

### 3.1 Ingesta
- RSS parser programado (diario) para todas las fuentes que lo soportan.
- Firecrawl para fuentes sin RSS (páginas de status, algunas cuentas de X/LinkedIn).
- Cada ítem ingerido se guarda en crudo (título, cuerpo, URL, fuente, fecha) antes de cualquier procesado.

### 3.2 Deduplicación y agrupación por tema
- Antes de puntuar, se agrupan ítems que hablan del mismo evento (ej. 5 fuentes cubriendo el cambio de `goto` tracking) usando similitud semántica (embeddings) para no duplicar noticias en el output final.
- Cada grupo conserva sus fuentes originales para poder citar varias si aporta autoridad.

### 3.3 Scoring de relevancia (IA)
- Un prompt de Claude puntúa cada grupo de noticias en una escala (ej. 0-10) según: impacto para profesionales SEO/GEO, novedad/confirmación oficial vs especulación, y alcance (¿afecta a todos los sitios o a un nicho muy concreto?).
- Solo pasan al siguiente paso los grupos por encima de un umbral configurable (ajustable según cuántas noticias quieras por edición — SEOFOMO ronda 10-12).

### 3.4 Extracción y redacción (IA)
- Para cada noticia seleccionada, un segundo prompt genera el formato "titular + una frase de qué implica" (el mismo patrón que usa SEOFOMO: *"Qué pasó — qué significa"*).
- Aquí es donde se aplica tu criterio editorial vía prompt: tono, qué destacar, qué ángulo priorizar (ej. impacto práctico > curiosidad).

### 3.5 Generación de outputs
A partir del mismo set de noticias de la semana, se generan tres piezas:
- **Web**: formato largo, con categorías, enlaces a fuentes originales, e imagen de cabecera.
- **LinkedIn**: gancho inicial + lista resumida (5-8 ítems máx) + CTA a la web.
- **Slack**: versión directa, sin adornos, pensada para consumo rápido interno.

### 3.6 Publicación
- Cron semanal (mismo día/hora cada semana, ej. domingo noche o lunes temprano, como SEOFOMO).
- **Modo preview** (fase inicial): el sistema genera el borrador y te lo envía (email o Slack) para aprobar antes de publicar.
- **Modo autónomo** (una vez validada la calidad): publicación directa sin intervención.

---

## 4. Stack técnico

| Componente | Elección | Motivo |
|---|---|---|
| Frontend/Web | Next.js + Vercel | Mismo patrón que tu web personal, despliegue simple, cron nativo (Vercel Cron) |
| Base de datos | Supabase (Postgres) | Histórico de artículos ingeridos, ediciones publicadas, fuentes |
| IA (scoring + redacción) | Claude API | Mismo patrón que el chatbot de tu web y PatternScope |
| Scraping | Firecrawl | Ya integrado en tu stack vía PatternScope |
| RSS parsing | Librería estándar (ej. `rss-parser` en Node) | Ligero, sin dependencias pesadas |
| Automatización | Vercel Cron / GitHub Actions | Ejecución semanal programada |
| Publicación LinkedIn | API de LinkedIn (o exportar texto para publicar manualmente en fase 1) | Empezar simple, automatizar cuando el output sea fiable |
| Publicación Slack | Slack Incoming Webhook | Trivial de integrar |

> Nota: PatternScope y Project News son proyectos independientes por decisión tuya, pero comparten filosofía de stack (Claude API + Firecrawl), así que en el futuro sería fácil extraer un paquete común si interesa.

---

## 5. Modelo de datos (borrador)

```
sources
  id, name, type (official/aggregator/individual), url, rss_url, active

raw_items
  id, source_id, title, body_raw, url, published_at, ingested_at

topic_groups
  id, week_id, representative_title, relevance_score, status (pending/selected/rejected)

topic_group_items
  topic_group_id, raw_item_id   -- relación N:N para agrupar duplicados

weekly_issues
  id, week_start_date, status (draft/preview/published), web_url

issue_items
  weekly_issue_id, topic_group_id, headline, implication_summary, category
```

---

## 6. Fases de implementación

**Fase 1 — MVP del pipeline (2-3 semanas)**
- Ingesta RSS de las ~10 fuentes principales.
- Scoring y extracción con Claude (prompts v1, iterables).
- Generación del output web (página simple, sin diseño final).
- Modo preview vía email/Slack para tu aprobación manual.

**Fase 2 — Publicación completa**
- Diseño final de la web (inspirado en el formato SEOFOMO que compartiste).
- Generación automática del post de LinkedIn y mensaje de Slack.
- Cron semanal en producción.

**Fase 3 — Refinamiento**
- Ajuste de fuentes según señal real (quitar ruido, añadir las que faltaban).
- Métricas: qué noticias generan más clics/engagement, para afinar el scoring.
- Posible expansión: sección de "jobs/events/tools" como hace SEOFOMO, si aporta valor.

---

## 7. Decisiones abiertas para la Fase 1

- Umbral de noticias por edición (¿fijo en ~10, o variable según la semana?).
- Nombre y dominio final del proyecto.
- Canal de aprobación en modo preview: ¿email, Slack, o revisión directa en un panel simple?
- Si quieres publicar en LinkedIn desde el primer día o empezar copiando el texto generado manualmente hasta confiar en la calidad.
