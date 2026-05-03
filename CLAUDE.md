# MealWeaver - Especificación del Proyecto

## Visión General

**MealWeaver** es una aplicación web/mobile para planificar menús semanales y mensuales de forma inteligente, priorizando una alimentación saludable y balanceada. Los usuarios pueden crear su lista de comidas favoritas y la app genera automáticamente menús variados, evitando repeticiones y balanceando tipos de proteínas y acompañamientos.

**Arquitectura híbrida**: el backend Next.js sirve a la **web** (con cookies NextAuth) y al cliente **Flutter** (con JWT Bearer) usando los mismos endpoints `/api/*`. Helper unificado en `lib/auth/getAuth.ts`. Plan y referencia de API para Flutter: ver [`CLAUDE_FLUTTER.md`](./CLAUDE_FLUTTER.md).

---

## Stack Tecnológico

- **Framework**: Next.js 16.2.1
- **Runtime**: React 19.2.4
- **Lenguaje**: TypeScript 5
- **Estilos**: Tailwind CSS 4
- **Gestor de paquetes**: pnpm
- **Autenticación**: NextAuth.js
- **State Management**: TanStack Query
- **Database**: MongoDB Atlas + Mongoose (ODM)
- **IA**: Google Gemini API (recomendaciones inteligentes de menús)
- **Almacenamiento de imágenes**: UploadThing SDK v7

---

## Estructura del Proyecto

```
meal-weaver/
├── app/                      # App Router de Next.js
│   ├── layout.tsx           # Layout raíz
│   ├── page.tsx             # Home/Dashboard
│   ├── (auth)/              # Rutas de autenticación
│   ├── (dashboard)/         # Rutas protegidas del dashboard
│   │   ├── meals/           # Gestión de comidas
│   │   ├── weekly/          # Planificador semanal
│   │   └── monthly/         # Planificador mensual
│   └── api/                 # API routes
├── components/              # Componentes reutilizables
│   ├── common/              # Headers, footers, navs
│   ├── meals/               # Componentes de gestión de comidas
│   ├── planner/             # Componentes del planificador
│   └── ui/                  # Componentes base (botones, cards, etc)
├── lib/                     # Utilidades y funciones
│   ├── algorithms/          # Lógica de generación de menús
│   ├── db/                  # Queries/mutations a BD
│   ├── auth/                # Configuración de auth
│   └── utils.ts             # Funciones auxiliares
├── styles/                  # Estilos globales
├── types/                   # Tipos TypeScript
├── public/                  # Assets estáticos
├── template/                # Diseños de referencia (Google Stitch)
├── .env.local              # Variables de entorno (no commitear)
├── next.config.ts          # Configuración Next.js
├── tailwind.config.ts       # Configuración Tailwind
├── tsconfig.json           # Configuración TypeScript
├── CLAUDE.md               # Este archivo
├── AGENTS.md               # Notas de agentes/colaboradores
└── README.md               # Documentación general
```

---

## Funcionalidades Principales

### 1. **Autenticación & Perfil**
- Sign up / Login (NextAuth.js)
- Perfil de usuario
- Preferences: alergias, restricciones alimentarias

### 2. **Gestión de Comidas**
- **Crear comida**: Nombre, tipo, ingredientes, descripción (opcional)
- **Tipos de comida**:
  - Carnes rojas (vacuno)
  - Pollo
  - Pescado/Mariscos
  - Pasta/Fideos
  - Arroz/Granos
  - Sopas/Guisos (con proteína base)
  - Otros (preparaciones especiales)
- **Acciones**: Editar, eliminar, filtrar, buscar
- **Historial**: Ver comidas usadas anteriormente
- **Nota**: Los vegetales se usan como ingredientes en salsas y acompañamientos, no como platos principales

### 3. **Generador de Menús**
- **Algoritmo de balanceo (Dieta Proteica)**:
  - Sin repetir la misma comida en la misma semana
  - **Distribución de proteínas** (semana):
    - ~2 días carnes rojas (vacuno)
    - ~2 días pollo
    - ~1 día pescado/mariscos
    - Puede repetirse proteína pero diferentes preparaciones
  - Variedad de acompañamientos: Arroz, fideos, papas (máximo 2 días repetidos)
  - Vegetales como ingrediente en salsas/acompañamientos (no como plato principal)

- **Opciones de generación**:
  - Generar semana completa
  - Generar día específico
  - Regenerar sólo desayunos/almuerzos/cenas
  - **Modo inteligente (Google Gemini)**: IA analiza preferencias, restricciones y genera recomendaciones personalizadas — usar `gemini-2.5-flash-lite`
  - Modo aleatorio: Algoritmo de balanceo determinístico

- **Google Gemini Integration**:
  - Generar menús semanales inteligentes respetando la rotación proteica
  - Modelo: `gemini-2.5-flash-lite`

### 4. **Planificador Semanal**
- Vista de calendario: Lunes a Domingo
- 3 comidas por día (desayuno, almuerzo, cena)
- **Interacciones**:
  - Drag & drop para mover comidas entre días
  - Click para cambiar comida individual
  - Marcar comida como "cocinada" (checkmark)
  - Ver detalles (ingredientes, calorías, receta)
  - Generar lista de compras

### 5. **Planificador Mensual**
- Vista de 4 semanas
- Generar menú completo del mes de una vez
- Resumen nutricional mensual
- Exportar a PDF/Imagen
- Estadísticas de consumo (qué proteína comiste más, etc)

### 6. **Utilidades**
- **Lista de compras**: Auto-generada desde el menú seleccionado
- **Exportar**: PDF, imagen, copiar al portapapeles
- **Modo oscuro/claro**
- **Responsivo**: Mobile-first design

---

## Modelos de Datos (Schema)

### User
```typescript
{
  id: string
  email: string
  name: string
  avatar?: string
  preferences: {
    theme: 'light' | 'dark'
    caloriesTarget?: number
    restrictions: string[] // alergias, vegetariano, etc
    mealsPerDay: 2 | 3
  }
  createdAt: Date
  updatedAt: Date
}
```

### Meal
```typescript
{
  id: string
  userId: string
  name: string
  type: 'carne_roja' | 'pollo' | 'pescado' | 'pasta' | 'arroz' | 'sopa' | 'otro'
  ingredients: string[]
  description?: string
  imageUrl?: string // URL de UploadThing
  imageKey?: string // UploadThing file key para borrar después
  notes?: string
  createdAt: Date
  updatedAt: Date
}
```

### WeeklyMenu
```typescript
{
  id: string
  userId: string
  year: number
  week: number
  days: DayMenu[]
  createdAt: Date
  updatedAt: Date
}
```

### DayMenu
```typescript
{
  dayOfWeek: 'Monday' | 'Tuesday' | ... | 'Sunday'
  breakfast?: MealId
  lunch?: MealId
  dinner?: MealId
  notes?: string
}
```

### MonthlyMenu
```typescript
{
  id: string
  userId: string
  year: number
  month: number
  weeks: WeeklyMenu[]
  createdAt: Date
  updatedAt: Date
}
```

---

## Algoritmo de Generación de Menús

### Lógica de Balanceo (Dieta Proteica):
1. **Distribución de proteínas** (semana):
   - ~2-3 días carnes rojas (vacuno)
   - ~2 días pollo
   - ~1-2 días pescado/mariscos
   - Puede haber repetición de proteína pero con diferentes preparaciones
   - Total: Mínimo 6 días proteína + 1 día pasta/arroz/otro

2. **Sin repeticiones exactas**: La misma comida no aparece 2 veces en la misma semana (pero sí "Carne con papas" y "Carne con arroz" en diferentes días)

3. **Variedad de acompañamientos**: Máximo 2 días con arroz, 2 con fideos, 1-2 con papas, etc

4. **Inteligencia**: 
   - Considerar comidas relacionadas (ej: si hay "Milanesa de pollo", evitar "Milanesa de carne roja" el día siguiente)
   - Balancear según preferencias de dificultad
   - Priorizar comidas con mayor contenido proteico

5. **Vegetales**: Como ingredientes en salsas/acompañamientos, no como protagonistas

### Implementación:
- Archivo: `/lib/algorithms/menuGenerator.ts`
- Funciones principales:
  - `generateWeeklyMenu(mealsList, preferences): WeeklyMenu`
  - `generateDayMenu(mealsList, usedMeals, preferences): Meal`
  - `validateMenuBalance(menu): boolean`
  - `calculateProteinContent(meals): number`
  - `getProteinDistribution(meals): ProteinStats`

---

## Guía de Estilo & Diseño

### Colores (basado en Google Stitch + tema saludable)
```
Primary (Verde fresco): #10b981
Secondary (Naranja): #f97316
Accent (Azul claro): #06b6d4
Background: #f8fafc (light) / #0f172a (dark)
Text: #1e293b (light) / #f1f5f9 (dark)
```

### Componentes Principales:
- **Tarjetas de comidas**: Border rounded, shadow suave, hover effect
- **Calendario semanal**: Grid 7 columnas, responsive
- **Botones**: Tailwind defaults con custom colors
- **Modales**: Para crear/editar comidas
- **Dropdowns**: Para filtros y selecciones

### Tipografía:
- **Display**: Font moderna (ej: Geist Sans)
- **Body**: Tailwind default (Inter o Figtree)
- **Monospace**: Para datos/listas

---

## Convenciones de Código

### Naming:
- Componentes: `PascalCase` (`MealCard.tsx`, `WeeklyPlanner.tsx`)
- Funciones/variables: `camelCase`
- Tipos: `PascalCase` con prefijo `T` o sufijo `Type` (opcional)
- Archivos: `kebab-case` o `PascalCase` según componente

### Estructura de Componentes:
```typescript
// Componentes funcionales con TypeScript
export interface ComponentProps {
  // Props definidas
}

export const ComponentName: React.FC<ComponentProps> = ({
  prop1,
  prop2,
}) => {
  return <div>Content</div>;
};
```

### Imports:
- Agrupar: React imports, external, internal, styles
- Usar path aliases: `@/components`, `@/lib`, etc

### Git:
- Commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`
- Branch naming: `feature/feature-name`, `fix/bug-name`

---

## Próximos Pasos

### Fase 1 — COMPLETADA ✅ (27/03/2026)
- [x] Estructura base del proyecto (Next.js 16, React 19, Tailwind 4, TypeScript)
- [x] Autenticación con NextAuth v5 (credentials + JWT, login, registro)
- [x] Componentes UI base: Button, Card, Input, Select, Modal, Badge, ThemeToggle, ImageUpload
- [x] Modo oscuro/claro con next-themes (`@custom-variant dark` en Tailwind 4)
- [x] Iconografía con lucide-react (sin emoji)
- [x] Página de gestión de comidas: CRUD completo con filtros, búsqueda y modal
- [x] Ingredientes estructurados: lista dinámica con nombre + cantidad
- [x] Algoritmo de generación de menús (rotación proteica semanal)
- [x] Planificador semanal (grid 7 días, generación automática, edición manual)
- [x] Sistema de Hogar (Household): compartir comidas y menús entre usuarios del mismo hogar vía código de invitación
- [x] Subida de imágenes con UploadThing v7 (server-side UTApi, graceful si no está configurado)
- [x] Proxy de autenticación (Next.js 16: `proxy.ts`)
- [x] MongoDB Atlas + Mongoose con scoping por `scopeId` (householdId ?? userId)

### Fase 2 — COMPLETADA ✅ (27/03/2026)
- [x] **Planificador semanal mejorado**: marcar comida como "cocinada" (checkmark visual)
- [x] **Lista de compras**: auto-generada desde el menú semanal, agrupar por tipo de ingrediente, marcar como comprado, copiar al portapapeles
- [x] **Perfil de usuario**: editar nombre, preferencias (restricciones alimentarias, comidas por día)

### Fase 3 — COMPLETADA ✅ (28/03/2026)
- [x] **Integración IA con Google Gemini**: `POST /api/menus/gemini` — modelo `gemini-2.5-flash-lite`
- [x] **Planificador mensual**: `GET/POST /api/menus/monthly`, vista 4 semanas + generación completa del mes
- [x] **Lista de compras en guaraníes (₲)**: precios por ingrediente con `PATCH /api/menus/weekly`

### Fase 4 — COMPLETADA ✅ (03/05/2026) — API híbrida mobile
- [x] **Auth dual**: cookies para web + JWT Bearer para mobile, vía `lib/auth/getAuth.ts` (helper unificado)
- [x] `POST /api/auth/mobile-login` — login que devuelve `{token, user}` (JWT HS256, 30 días)
- [x] `POST /api/auth/register` reescrito — auto-loguea, devuelve `{token, user}` igual que mobile-login
- [x] `GET /api/auth/me` — validar token al iniciar la app mobile
- [x] **Token reissue**: `POST/DELETE /api/household` y `/join`/`/leave` reemiten token con `householdId` actualizado
- [x] **Proxy** (`proxy.ts`) — excluye `/api/*` del redirect (cada handler maneja su auth) y agrega CORS + `OPTIONS` preflight
- [x] **CORS configurable** vía `ALLOWED_ORIGINS` env var
- [x] **Suite end-to-end** (`scripts/test-mobile-api.sh`) — 28 assertions cubriendo todos los endpoints con Bearer

### Fase 5 — App Flutter (mobile, repo aparte)
- [ ] Inicializar repo Flutter con `CLAUDE_FLUTTER.md` como `CLAUDE.md` raíz
- [ ] Fase 0: DioClient + AuthInterceptor (con captura de token reissue) + GoRouter guard
- [ ] Fase 1: Login/Register
- [ ] Fase 2: Modelos + servicios
- [ ] Fase 3: Widgets base + theme
- [ ] Fase 4-9: meals, dashboard, semanal, mensual, compras, hogar, perfil
- [ ] Fase 10: pulido (animaciones, empty states, PDF export, tests)

> **Plan completo y referencia de API para Flutter**: ver `CLAUDE_FLUTTER.md`.

### Backlog (post-mobile)
- [ ] **Exportar menú**: PDF con diseño / copiar al portapapeles
- [ ] **Estadísticas**: qué proteína se consume más, variedad semanal, resumen nutricional
- [ ] **Notificaciones / recordatorios**: recordar planificar la semana

---

## Variables de Entorno

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/meal-weaver?retryWrites=true&w=majority
MONGODB_DB_NAME=meal-weaver

# NextAuth v5 (usa AUTH_SECRET, no NEXTAUTH_SECRET)
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=http://localhost:3000

# Google Gemini API (recomendaciones inteligentes)
NEXT_PUBLIC_GEMINI_API_KEY=<your-google-gemini-api-key>

# UploadThing v7 (opcional — imagen de comidas)
UPLOADTHING_TOKEN=<your-uploadthing-token>

# CORS — orígenes permitidos para /api/* (comma-separated). Usar "*" para permitir todos (eco del origin).
# Native Flutter (iOS/Android) no envía Origin, así que esto solo aplica a Flutter Web o llamadas cross-origin desde browsers.
ALLOWED_ORIGINS=http://localhost:3000
```

---

## API para clientes mobile (Flutter)

La API es híbrida: la web usa NextAuth con cookies httpOnly, mobile usa JWT Bearer tokens. Todos los endpoints de `/api/*` aceptan ambos via `lib/auth/getAuth.ts`.

### Auth flow mobile

1. **Registro**: `POST /api/auth/register` con `{name, email, password}` → `{token, user}`.
2. **Login**: `POST /api/auth/mobile-login` con `{email, password}` → `{token, user}`.
3. **Validar token al iniciar app**: `GET /api/auth/me` con `Authorization: Bearer <token>` → `{user}`.
4. **Logout**: descartar el token en el cliente (no hay endpoint server-side; los JWT son stateless).

### Importante sobre el JWT
- El JWT contiene `householdId`. Si el usuario entra/sale/crea/borra un hogar, el server reemite un nuevo token en la respuesta — el cliente debe **reemplazar** el token guardado.
- Endpoints que reemiten token: `POST /api/household`, `POST /api/household/join`, `POST /api/household/leave`, `DELETE /api/household`.
- Expiración: 30 días. Si expira, el cliente debe re-loguear.

### Endpoints disponibles
- `GET/POST/PUT/DELETE /api/meals` y `/api/meals/[id]`
- `GET/POST/PUT/PATCH /api/menus/weekly` (PATCH actualiza precios)
- `GET/POST /api/menus/monthly`
- `POST /api/menus/gemini` (genera con IA)
- `GET /api/shopping-list?year=&week=`
- `GET/POST/DELETE /api/household`, `POST /api/household/join`, `POST /api/household/leave`
- `GET/PUT /api/user`
- `POST/DELETE /api/upload` (multipart/form-data con campo `file`)

---

## Recursos Útiles

- **Diseño**: `/template` - Referencia Google Stitch
- **Docs**: Next.js, React, Tailwind CSS, TypeScript
- **DB**: MongoDB Atlas + Mongoose (ODM)
- **IA**: Google Gemini API (https://ai.google.dev/)
- **Almacenamiento**: UploadThing SDK v7 (https://docs.uploadthing.com/)
- **Testing**: Jest + React Testing Library (futuro)

---

## Notas Importantes

- ✅ Mobile-first design
- ✅ Modo oscuro soportado
- ✅ Responsivo en todos los breakpoints
- ✅ Accesibilidad (WCAG 2.1 AA)
- ✅ Performance: Code splitting, lazy loading
- ✅ SEO: Next.js optimizaciones

---

**Última actualización**: 03/05/2026 — Fase 4 (API mobile) completada, plan Flutter listo en `CLAUDE_FLUTTER.md`
**Autor**: Martin Medina (MacroHEX)
