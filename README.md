# MealWeaver

Aplicación web para planificar menús semanales y mensuales priorizando una alimentación balanceada (rotación proteica, sin repeticiones, ingredientes compartidos en hogar). Web hecha en **Next.js 16** con un backend REST que también sirve a la app **Flutter** (en repo aparte).

> Stack: Next.js 16.2.1 · React 19.2.4 · TypeScript 5 · Tailwind CSS 4 · NextAuth v5 · MongoDB Atlas + Mongoose · UploadThing v7 · Google Gemini · pnpm

---

## Quick start

```bash
pnpm install
cp .env.local.example .env.local   # editar valores (ver "Variables de entorno")
pnpm dev
```

App en [http://localhost:3000](http://localhost:3000).

---

## Variables de entorno

Crear `.env.local` con:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/meal-weaver?retryWrites=true&w=majority
MONGODB_DB_NAME=meal-weaver

# NextAuth v5 — el mismo secret firma los JWT mobile
AUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Opcionales
NEXT_PUBLIC_GEMINI_API_KEY=<key>     # /api/menus/gemini
UPLOADTHING_TOKEN=<token>            # /api/upload — sin esto las imágenes degradan a 503

# CORS para clientes cross-origin (Flutter Web). Native iOS/Android no lo necesita.
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Arquitectura

App híbrida: **una sola API**, dos clientes.

- **Web (este repo)** — Next.js + NextAuth con cookie httpOnly.
- **Mobile (repo Flutter aparte)** — JWT Bearer firmado con `AUTH_SECRET`.

`lib/auth/getAuth.ts` es el helper unificado: chequea cookie NextAuth primero y, si no hay, valida el header `Authorization: Bearer <jwt>`. Todos los handlers en `app/api/*` usan `getAuth(req)`.

```
┌─────────────┐     cookie httpOnly        ┌──────────────────┐
│   Web app   │ ────────────────────────► │                  │
│  (Next.js)  │                            │  /api/*          │
└─────────────┘                            │  getAuth(req)    │
                                           │   ├── cookie?    │
┌─────────────┐     Bearer JWT             │   └── Bearer?    │
│  Flutter    │ ────────────────────────► │                  │
│   (mobile)  │                            └──────────────────┘
└─────────────┘
```

`proxy.ts` (renombre de `middleware.ts` en Next.js 16) maneja:
- Auth redirect para páginas HTML (sin sesión → `/login`).
- CORS + `OPTIONS` preflight para `/api/*`.
- **No** redirige `/api/*` — cada handler resuelve su auth.

---

## Estructura

```
app/
├── (auth)/                login, register
├── (dashboard)/           meals, weekly, monthly, shopping, profile, dashboard
└── api/
    ├── auth/
    │   ├── [...nextauth]/         # web (cookies)
    │   ├── mobile-login/          # mobile (JWT)
    │   ├── me/                    # validar token + user
    │   └── register/              # crea + auto-loguea (devuelve token)
    ├── meals/                     # CRUD
    ├── menus/{weekly,monthly,gemini}/
    ├── shopping-list/
    ├── household/{,join,leave}/
    ├── user/
    └── upload/                    # UploadThing proxy
lib/
├── auth/                  getAuth, getScopeId, issueToken, auth (NextAuth)
├── algorithms/            menuGenerator (rotación proteica)
├── ai/                    gemini integration
└── db/                    mongoose models, connection
components/                ui base + features
proxy.ts                   middleware (auth + CORS)
scripts/test-mobile-api.sh suite de smoke tests para mobile
```

---

## Documentación

- **`CLAUDE.md`** — spec del proyecto: visión, modelos de datos, algoritmo, fases.
- **`CLAUDE_FLUTTER.md`** — guía completa para construir el cliente Flutter contra esta API. Contiene la referencia de endpoints, flujo de auth, modelos Dart sugeridos, estructura de carpetas y roadmap por fases. Pensado para abrirse en el repo Flutter como `CLAUDE.md`.
- **`AGENTS.md`** — notas para agentes que tocan código de Next.js 16 (heads-up sobre breaking changes).

### Endpoints — referencia rápida

| | |
|---|---|
| `POST /api/auth/register` | crear cuenta, devuelve `{token, user}` |
| `POST /api/auth/mobile-login` | login para mobile, devuelve `{token, user}` |
| `GET /api/auth/me` | validar token, devuelve `{user}` |
| `GET/POST/PUT/DELETE /api/meals[/id]` | CRUD comidas |
| `GET/POST/PUT/PATCH /api/menus/weekly` | menú semanal (POST genera, PATCH precios) |
| `GET/POST /api/menus/monthly` | menú mensual |
| `POST /api/menus/gemini` | generar con IA |
| `GET /api/shopping-list?year=&week=` | lista de compras agregada |
| `GET/POST/DELETE /api/household` · `/join` · `/leave` | hogar compartido |
| `GET/PUT /api/user` | perfil + preferencias |
| `POST/DELETE /api/upload` | imágenes (UploadThing) |

Detalles completos (request/response shapes, status codes, token reissue en household) en `CLAUDE_FLUTTER.md`.

---

## Testing

Suite end-to-end del surface mobile (cubre todos los endpoints con Bearer JWT):

```bash
pnpm dev                          # en una terminal
bash scripts/test-mobile-api.sh   # en otra
```

28 assertions: CORS, auth (register/login/me), meals CRUD, menús, shopping list, household + token reissue. Si tocás `proxy.ts`, `getAuth`, `issueToken` o cualquier API route, correr esto antes de mergear.

---

## Convenciones

- **Commits**: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- **Branches**: `feature/<name>`, `fix/<name>`.
- **Componentes**: `PascalCase` (`MealCard.tsx`).
- **Path aliases**: `@/components`, `@/lib`, `@/types`.
- **Iconos**: `lucide-react` (sin emojis en UI).
- **Modo oscuro**: `next-themes` + Tailwind 4 `@custom-variant dark`.

Más detalle en `CLAUDE.md`.

---

## Deploy

Vercel (recomendado para el frontend) + MongoDB Atlas. Setear las mismas variables de entorno en el dashboard de Vercel. Para producción agregar el origin de la app móvil web (si la hubiere) a `ALLOWED_ORIGINS`.

---

**Autor**: Martin Medina (MacroHEX) · **Licencia**: privada
