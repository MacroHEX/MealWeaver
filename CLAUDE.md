# MealWeaver - Especificación del Proyecto

## Visión General

**MealWeaver** es una aplicación web/mobile para planificar menús semanales y mensuales de forma inteligente, priorizando una alimentación saludable y balanceada. Los usuarios pueden crear su lista de comidas favoritas y la app genera automáticamente menús variados, evitando repeticiones y balanceando tipos de proteínas y acompañamientos.

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

### Fase 3 (Actual):
- [ ] **Integración IA con Google Gemini**: recomendaciones inteligentes de menús, sugerencias personalizadas basadas en dieta proteica — usar modelo `gemini-2.5-flash-lite` (más ligero y económico)
- [ ] **Planificador mensual**: vista 4 semanas, generar menú mensual completo
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
```

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

**Última actualización**: 27/03/2026 — Fase 3 iniciada
**Autor**: Martin Medina (MacroHEX)
