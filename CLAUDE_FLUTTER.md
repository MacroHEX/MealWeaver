# MealWeaver — Especificación de Migración a Flutter

## Visión General

Este documento describe la migración **completa** de MealWeaver (Next.js 16 + MongoDB) a una aplicación **Flutter** multiplataforma (iOS, Android, Web). El backend REST existente se mantiene; Flutter consume los mismos endpoints API.

> **Estrategia**: Flutter como cliente móvil/web + mismo backend Next.js (API routes). No se migra el backend, sólo el frontend.

> **Estado del backend**: ✅ Listo para Flutter. Los cambios necesarios ya están implementados (ver sección [Cambios Implementados en el Backend](#cambios-implementados-en-el-backend)).

---

## Stack Tecnológico Flutter

| Categoría | Tecnología | Motivo |
|---|---|---|
| Framework | Flutter 3.x (Dart 3) | Multiplataforma nativa |
| Estado | Riverpod 2.x | Equivalente a React Query + Context |
| HTTP | Dio + Retrofit | Equivalente a fetch + TanStack Query |
| Autenticación | `flutter_secure_storage` + JWT | Reemplaza NextAuth session cookies |
| Almacenamiento local | `shared_preferences` + `sqflite` | Para shopping list y caché |
| Navegación | GoRouter | App Router equivalente |
| Temas | `ThemeData` + `flex_color_scheme` | Dark/light mode |
| Imágenes | `cached_network_image` + `image_picker` | Para subida de fotos de comidas |
| IA (Gemini) | `google_generative_ai` (Dart SDK) | Misma API, SDK oficial |
| Fechas | `intl` + `table_calendar` | Para planificadores |
| Drag & Drop | `flutter_reorderable_list` | Planner drag-and-drop |
| PDF Export | `pdf` + `printing` | Exportar menús |
| Íconos | `lucide_icons` (port) o `material_symbols` | Equivalente a lucide-react |
| Animaciones | `flutter_animate` | Micro-interacciones |

---

## Estructura del Proyecto Flutter

```
meal_weaver_flutter/
├── lib/
│   ├── main.dart                    # Entry point + ProviderScope
│   ├── app.dart                     # MaterialApp.router con GoRouter
│   │
│   ├── core/
│   │   ├── constants/
│   │   │   ├── app_colors.dart      # Paleta de colores
│   │   │   ├── app_text_styles.dart # Tipografías
│   │   │   └── api_endpoints.dart   # URLs de los endpoints
│   │   ├── theme/
│   │   │   ├── app_theme.dart       # ThemeData light/dark
│   │   │   └── theme_provider.dart  # Riverpod provider del tema
│   │   ├── router/
│   │   │   └── app_router.dart      # GoRouter con rutas protegidas
│   │   ├── network/
│   │   │   ├── dio_client.dart      # Instancia Dio con interceptors
│   │   │   └── auth_interceptor.dart # Inyectar JWT en headers
│   │   └── utils/
│   │       ├── date_utils.dart      # getWeekNumber, formatDate, etc.
│   │       └── debouncer.dart       # Para precios en shopping list
│   │
│   ├── models/                      # Modelos de datos (de types/index.ts)
│   │   ├── user.dart
│   │   ├── meal.dart
│   │   ├── day_menu.dart
│   │   ├── weekly_menu.dart
│   │   ├── monthly_menu.dart
│   │   ├── household.dart
│   │   └── shopping_item.dart
│   │
│   ├── services/                    # Capa de API (de app/api/)
│   │   ├── auth_service.dart        # /api/auth/*
│   │   ├── meal_service.dart        # /api/meals/*
│   │   ├── menu_service.dart        # /api/menus/*
│   │   ├── shopping_service.dart    # /api/shopping-list
│   │   ├── household_service.dart   # /api/household/*
│   │   ├── user_service.dart        # /api/user
│   │   └── gemini_service.dart      # /api/menus/gemini o directo SDK
│   │
│   ├── providers/                   # Riverpod providers (de React Query)
│   │   ├── auth_provider.dart
│   │   ├── meals_provider.dart
│   │   ├── weekly_menu_provider.dart
│   │   ├── monthly_menu_provider.dart
│   │   ├── shopping_provider.dart
│   │   ├── household_provider.dart
│   │   └── user_provider.dart
│   │
│   ├── screens/                     # Pantallas (de app/(dashboard)/)
│   │   ├── auth/
│   │   │   ├── login_screen.dart
│   │   │   └── register_screen.dart
│   │   ├── dashboard/
│   │   │   └── dashboard_screen.dart
│   │   ├── meals/
│   │   │   └── meals_screen.dart
│   │   ├── weekly/
│   │   │   └── weekly_screen.dart
│   │   ├── monthly/
│   │   │   └── monthly_screen.dart
│   │   ├── shopping/
│   │   │   └── shopping_screen.dart
│   │   └── profile/
│   │       └── profile_screen.dart
│   │
│   └── widgets/                     # Widgets reutilizables (de components/)
│       ├── ui/
│       │   ├── app_button.dart      # Button component
│       │   ├── app_card.dart        # Card component
│       │   ├── app_input.dart       # Input component
│       │   ├── app_select.dart      # Select/Dropdown component
│       │   ├── app_modal.dart       # Modal/Dialog component
│       │   ├── app_badge.dart       # Badge component
│       │   └── theme_toggle.dart    # Dark/light toggle
│       ├── common/
│       │   ├── app_navbar.dart      # Navbar + BottomNavigationBar
│       │   └── household_modal.dart # Modal de hogar
│       ├── meals/
│       │   ├── meal_card.dart       # Tarjeta de comida
│       │   └── meal_form.dart       # Formulario crear/editar comida
│       └── planner/
│           ├── weekly_grid.dart     # Grid semanal 7 días
│           └── day_card.dart        # Tarjeta de un día
│
├── test/
│   ├── models/
│   ├── services/
│   └── widgets/
│
├── assets/
│   ├── images/
│   └── icons/
│
├── pubspec.yaml
└── CLAUDE_FLUTTER.md                # Este archivo
```

---

## Modelos de Datos (de `types/index.ts`)

### `lib/models/meal.dart`
```dart
enum MealType {
  carneRoja,
  chancho,
  pollo,
  pescado,
  pasta,
  arroz,
  sopa,
  otro;

  String get label => switch (this) {
    MealType.carneRoja => 'Carne Roja',
    MealType.chancho   => 'Chancho/Cerdo',
    MealType.pollo     => 'Pollo',
    MealType.pescado   => 'Pescado/Mariscos',
    MealType.pasta     => 'Pasta/Fideos',
    MealType.arroz     => 'Arroz/Granos',
    MealType.sopa      => 'Sopas/Guisos',
    MealType.otro      => 'Otro',
  };

  String get apiValue => switch (this) {
    MealType.carneRoja => 'carne_roja',
    MealType.chancho   => 'chancho',
    MealType.pollo     => 'pollo',
    MealType.pescado   => 'pescado',
    MealType.pasta     => 'pasta',
    MealType.arroz     => 'arroz',
    MealType.sopa      => 'sopa',
    MealType.otro      => 'otro',
  };

  Color get color => switch (this) {
    MealType.carneRoja => const Color(0xFFef4444),
    MealType.chancho   => const Color(0xFFec4899),
    MealType.pollo     => const Color(0xFFf97316),
    MealType.pescado   => const Color(0xFF06b6d4),
    MealType.pasta     => const Color(0xFFeab308),
    MealType.arroz     => const Color(0xFF8b5cf6),
    MealType.sopa      => const Color(0xFF84cc16),
    MealType.otro      => const Color(0xFF6b7280),
  };
}

class Ingredient {
  final String name;
  final String quantity;
  const Ingredient({required this.name, required this.quantity});

  factory Ingredient.fromJson(Map<String, dynamic> json) =>
      Ingredient(name: json['name'], quantity: json['quantity']);

  Map<String, dynamic> toJson() => {'name': name, 'quantity': quantity};
}

class Meal {
  final String id;
  final String userId;
  final String scopeId;
  final String name;
  final MealType type;
  final List<Ingredient> ingredients;
  final bool isBreakfast;
  final String? description;
  final String? instructions;
  final String? imageUrl;
  final String? imageKey;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Meal({...});

  factory Meal.fromJson(Map<String, dynamic> json) => Meal(
    id: json['_id'] ?? json['id'],
    userId: json['userId'],
    scopeId: json['scopeId'],
    name: json['name'],
    type: MealType.values.firstWhere((e) => e.apiValue == json['type']),
    ingredients: (json['ingredients'] as List)
        .map((i) => Ingredient.fromJson(i))
        .toList(),
    isBreakfast: json['isBreakfast'] ?? false,
    description: json['description'],
    instructions: json['instructions'],
    imageUrl: json['imageUrl'],
    imageKey: json['imageKey'],
    notes: json['notes'],
    createdAt: DateTime.parse(json['createdAt']),
    updatedAt: DateTime.parse(json['updatedAt']),
  );
}
```

### `lib/models/weekly_menu.dart`
```dart
enum DayOfWeek { monday, tuesday, wednesday, thursday, friday, saturday, sunday }
enum MealTime { breakfast, lunch, dinner }

class DayMenu {
  final DayOfWeek dayOfWeek;
  final String? breakfastId;
  final String? lunchId;
  final String? dinnerId;
  final List<String> cooked; // ["lunch", "dinner"]
  final String? notes;

  // Métodos de conveniencia
  bool get isLunchCooked => cooked.contains('lunch');
  bool get isDinnerCooked => cooked.contains('dinner');
}

class WeeklyMenu {
  final String id;
  final String scopeId;
  final int year;
  final int week;
  final List<DayMenu> days;
  final Map<String, double> prices; // ingrediente → precio en ₲
  final DateTime createdAt;
  final DateTime updatedAt;
}
```

### `lib/models/household.dart`
```dart
class Household {
  final String id;
  final String name;
  final List<String> memberIds;
  final String inviteCode;
  final String createdBy;

  bool isMember(String userId) => memberIds.contains(userId);
  bool isCreator(String userId) => createdBy == userId;
}
```

---

## Configuración de Red (`lib/core/network/`)

### `dio_client.dart`
```dart
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const String kBaseUrl = 'http://localhost:3000'; // Cambiar a producción

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: kBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json'},
  ));

  dio.interceptors.add(ref.read(authInterceptorProvider));
  dio.interceptors.add(LogInterceptor(responseBody: true)); // Solo en dev
  return dio;
});
```

### `auth_interceptor.dart`
```dart
// Inyecta el JWT en cada request y maneja refresh/expiración
class AuthInterceptor extends Interceptor {
  final FlutterSecureStorage _storage;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.read(key: 'jwt_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Limpiar token y redirigir a login
      await _storage.delete(key: 'jwt_token');
      // Navegar a /login via GoRouter
    }
    handler.next(err);
  }
}
```

---

## Cambios Implementados en el Backend

Todos los cambios necesarios para soportar Flutter ya están en el backend. No hay nada más que modificar en Next.js.

### Archivos nuevos creados:
- `lib/auth/issueToken.ts` — Firma JWT (HS256, 30 días) usando `AUTH_SECRET`
- `lib/auth/getAuth.ts` — Helper unificado: acepta NextAuth session cookie **O** `Authorization: Bearer <token>`
- `app/api/auth/mobile-login/route.ts` — Endpoint de login para móvil

### Archivos modificados:
- `lib/auth/getScopeId.ts` — Ahora acepta `{ id, householdId }` genérico
- Todos los 11 API routes — Reemplazado `auth()` por `getAuth(req)` (web sigue funcionando igual)

### Endpoints de household actualizados (devuelven nuevo token):
| Endpoint | Cuándo devuelve `token` |
|---|---|
| `POST /api/household` | Al crear hogar → token con nuevo `householdId` |
| `POST /api/household/join` | Al unirse → token con nuevo `householdId` |
| `POST /api/household/leave` | Al salir → token con `householdId: null` |
| `DELETE /api/household` | Al eliminar → token con `householdId: null` |

Flutter debe guardar el nuevo token recibido en estas respuestas para que las siguientes requests usen el `scopeId` correcto.

---

## Autenticación (`lib/services/auth_service.dart`)

El backend ya tiene `POST /api/auth/mobile-login` implementado. Devuelve:
```json
{
  "token": "<JWT HS256 30d>",
  "user": { "id": "...", "email": "...", "name": "...", "householdId": "..." }
}
```

El token debe enviarse en **todas** las requests como `Authorization: Bearer <token>`.

### Flutter `auth_service.dart`
```dart
class AuthService {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  Future<AuthResult> login(String email, String password) async {
    final response = await _dio.post('/api/auth/mobile-login', data: {
      'email': email,
      'password': password,
    });
    final token = response.data['token'] as String;
    await _storage.write(key: 'jwt_token', value: token);
    return AuthResult.fromJson(response.data);
  }

  Future<void> register(String name, String email, String password) async {
    await _dio.post('/api/auth/register', data: {
      'name': name,
      'email': email,
      'password': password,
    });
    // register no hace login automático — llamar login() después
  }

  Future<void> logout() async {
    await _storage.delete(key: 'jwt_token');
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'jwt_token');
    return token != null;
  }

  /// Llamar después de join/leave/create/delete household para actualizar el token local
  Future<void> updateToken(String newToken) async {
    await _storage.write(key: 'jwt_token', value: newToken);
  }
}
```

---

## Providers Riverpod (equivalente a TanStack Query)

### `lib/providers/meals_provider.dart`
```dart
// Equivalente a useQuery(['meals'], fetchMeals)
@riverpod
Future<List<Meal>> meals(MealsRef ref, {String? typeFilter, String? search}) async {
  final mealService = ref.read(mealServiceProvider);
  return mealService.getMeals(type: typeFilter, search: search);
}

// Equivalente a useMutation para crear comida
@riverpod
class MealNotifier extends _$MealNotifier {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  Future<void> createMeal(CreateMealDto dto) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await ref.read(mealServiceProvider).createMeal(dto);
      ref.invalidate(mealsProvider); // Refetch como en React Query
    });
  }

  Future<void> updateMeal(String id, UpdateMealDto dto) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await ref.read(mealServiceProvider).updateMeal(id, dto);
      ref.invalidate(mealsProvider);
    });
  }

  Future<void> deleteMeal(String id) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await ref.read(mealServiceProvider).deleteMeal(id);
      ref.invalidate(mealsProvider);
    });
  }
}
```

### `lib/providers/weekly_menu_provider.dart`
```dart
@riverpod
Future<WeeklyMenu?> weeklyMenu(WeeklyMenuRef ref, {required int year, required int week}) async {
  return ref.read(menuServiceProvider).getWeeklyMenu(year: year, week: week);
}

@riverpod
class WeeklyMenuNotifier extends _$WeeklyMenuNotifier {
  Future<void> generateMenu(int year, int week) async { ... }
  Future<void> generateWithAI(int year, int week) async { ... }
  Future<void> updateMealSlot(String day, String mealTime, String? mealId) async { ... }
  Future<void> toggleCooked(String day, String mealTime) async { ... }
}
```

---

## Navegación (`lib/core/router/app_router.dart`)

```dart
import 'package:go_router/go_router.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isLoggedIn = authState.value ?? false;
      final isAuthRoute = state.matchedLocation.startsWith('/login') ||
          state.matchedLocation.startsWith('/register');

      if (!isLoggedIn && !isAuthRoute) return '/login';
      if (isLoggedIn && isAuthRoute) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login',     builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register',  builder: (_, __) => const RegisterScreen()),
      ShellRoute(
        builder: (_, __, child) => AppScaffold(child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/meals',     builder: (_, __) => const MealsScreen()),
          GoRoute(path: '/weekly',    builder: (_, __) => const WeeklyScreen()),
          GoRoute(path: '/monthly',   builder: (_, __) => const MonthlyScreen()),
          GoRoute(path: '/shopping',  builder: (_, __) => const ShoppingScreen()),
          GoRoute(path: '/profile',   builder: (_, __) => const ProfileScreen()),
        ],
      ),
    ],
  );
});
```

---

## Pantallas — Mapeo Completo

### 1. `LoginScreen` ← `app/(auth)/login/page.tsx`
- `TextField` para email (con teclado email)
- `TextField` para password (obscureText)
- Botón "Iniciar sesión" → llama `AuthNotifier.login()`
- Link "¿No tenés cuenta? Registrate" → `GoRouter.push('/register')`
- Mostrar error si credenciales inválidas
- Deshabilitar botón mientras `isLoading`

### 2. `RegisterScreen` ← `app/(auth)/register/page.tsx`
- `TextField` para nombre, email, contraseña, confirmar contraseña
- Validar que contraseñas coincidan localmente antes de llamar API
- `AuthNotifier.register()` → redirige a login

### 3. `DashboardScreen` ← `app/(dashboard)/dashboard/page.tsx`
- Mostrar menú del día actual (desayuno, almuerzo, cena)
- Cards con `MealCard` para cada slot del día
- Si no hay menú → botón "Generar semana"
- Próximos días (mañana, pasado) como preview
- Floating action si no hay comida marcada como cocinada

### 4. `MealsScreen` ← `app/(dashboard)/meals/page.tsx`
- `GridView.builder` con `MealCard` (2 columnas en mobile, 4 en tablet)
- Barra de búsqueda con `TextField` + `ref.invalidate` debounced
- Chips de filtro por tipo (horizontal `SingleChildScrollView`)
- FAB para crear comida → `showModalBottomSheet` con `MealForm`
- Pull-to-refresh con `RefreshIndicator`
- Swipe-to-delete o menú contextual (editar/eliminar)

### 5. `WeeklyScreen` ← `app/(dashboard)/weekly/page.tsx`
- Header con `<` semana anterior, "Esta semana", semana siguiente `>`
- `WeeklyGrid` widget (7 días × 3 slots)
- Botones: "Generar menú" / "Generar con IA"
- Tap en slot → `showDialog` con lista de comidas para seleccionar
- Long-press en slot → marcar/desmarcar como cocinado
- Link "Ver lista de compras" → `/shopping?week=W&year=Y`

### 6. `MonthlyScreen` ← `app/(dashboard)/monthly/page.tsx`
- `ListView` con cards por semana del mes
- Header mes/año con navegación `<` `>`
- Cada semana: `GridView` compacto de 7 días con pill de comida
- Botón "Generar mes completo"
- Tap en semana → navegar a `/weekly` con esa semana

### 7. `ShoppingScreen` ← `app/(dashboard)/shopping/page.tsx`
- Lista de ingredientes agrupados (de `GET /api/shopping-list`)
- `CheckboxListTile` por ingrediente
- Campo de precio por ingrediente (TextField numérico)
- `LinearProgressIndicator` mostrando % comprado
- Total estimado en ₲ (guaraníes)
- Botón "Copiar al portapapeles"
- Persistencia de checkboxes en `shared_preferences` con key `shopping_<year>_<week>`

### 8. `ProfileScreen` ← `app/(dashboard)/profile/page.tsx`
- Editar nombre de usuario
- Toggle tema oscuro/claro
- `MultiSelectChip` para restricciones alimentarias
- Selector "Comidas por día" (2 o 3)
- Sección Hogar (Household): ver miembros / crear / unirse
- Botón "Cerrar sesión"

---

## Widgets — Mapeo Completo

### `AppButton` ← `components/ui/Button.tsx`
```dart
class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant; // primary, outline, danger, ghost
  final bool isLoading;
  final Widget? icon;
  final bool fullWidth;

  // Variantes: ElevatedButton, OutlinedButton, TextButton con estilos custom
}
```

### `AppCard` ← `components/ui/Card.tsx`
```dart
class AppCard extends StatelessWidget {
  final Widget child;
  final bool hoverable; // En Flutter: InkWell con splash
  final EdgeInsets? padding;
}
```

### `AppModal` ← `components/ui/Modal.tsx`
```dart
// Usar showDialog() con AlertDialog custom o showModalBottomSheet en mobile
Future<T?> showAppModal<T>(BuildContext context, {
  required String title,
  required Widget body,
  String? size, // 'sm' | 'lg' | 'xl'
}) { ... }
```

### `MealCard` ← `components/meals/MealCard.tsx`
```dart
class MealCard extends StatelessWidget {
  final Meal meal;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  // Imagen con CachedNetworkImage o gradiente fallback
  // Badge con tipo de comida (color según MealType)
  // Lista de primeros 3 ingredientes
  // Botones editar/eliminar en esquina
}
```

### `MealForm` ← `components/meals/MealForm.tsx`
```dart
class MealForm extends StatefulWidget {
  final Meal? initial; // null = crear, non-null = editar

  // Campos:
  // - TextFormField: nombre
  // - DropdownButtonFormField: tipo
  // - TextFormField: descripción
  // - TextFormField: instrucciones
  // - Lista dinámica de ingredientes (nombre + cantidad)
  //   con botón "+" para agregar y "x" para eliminar
  // - SwitchListTile: "Es para desayuno"
  // - ImagePicker: seleccionar/tomar foto → upload a UploadThing
  // - Botón "Guardar"
}
```

### `WeeklyGrid` ← `components/planner/WeeklyGrid.tsx`
```dart
class WeeklyGrid extends StatelessWidget {
  final WeeklyMenu menu;
  final Map<String, Meal> mealsMap; // id → Meal para lookup

  // ListView horizontal de DayCard (en mobile)
  // GridView 7 columnas (en tablet/desktop)
}

class DayCard extends StatelessWidget {
  final DayMenu day;
  final Map<String, Meal> mealsMap;
  final Function(MealTime, String?) onMealChange;
  final Function(MealTime) onToggleCooked;

  // 3 slots: desayuno / almuerzo / cena
  // Cada slot: nombre de comida, ícono, check si está cocinado
  // Tap → showDialog con MealPicker
}
```

### `HouseholdModal` ← `components/common/HouseholdModal.tsx`
```dart
// showDialog con TabBar: "Mi Hogar" / "Crear" / "Unirse"
// Tab "Mi Hogar": lista de miembros con avatar + badge Admin
// Tab "Crear": TextField nombre + botón crear
// Tab "Unirse": TextField código 6 chars + botón unirse
// Mostrar código de invitación con botón copiar
```

### `AppNavbar` ← `components/common/Navbar.tsx`
```dart
// En mobile: BottomNavigationBar con 5 ítems:
//   Dashboard, Comidas, Semanal, Mensual, Compras
// En tablet/desktop: NavigationRail o Drawer lateral
// FloatingActionButton o ícono para HouseholdModal
// Ícono de perfil → /profile
```

---

## Algoritmo de Generación de Menús (Port de `menuGenerator.ts`)

El algoritmo es lógica pura — portarlo directamente a Dart:

### `lib/core/algorithms/menu_generator.dart`
```dart
// Grupos de proteína para evitar repetición consecutiva
enum ProteinGroup { carne, pollo, pescado, pasta, arroz, sopa, otro }

extension MealTypeGroup on MealType {
  ProteinGroup get group => switch (this) {
    MealType.carneRoja || MealType.chancho => ProteinGroup.carne,
    MealType.pollo   => ProteinGroup.pollo,
    MealType.pescado => ProteinGroup.pescado,
    MealType.pasta   => ProteinGroup.pasta,
    MealType.arroz   => ProteinGroup.arroz,
    MealType.sopa    => ProteinGroup.sopa,
    MealType.otro    => ProteinGroup.otro,
  };
}

class MenuGenerator {
  // Mínimos semanales por tipo
  static const Map<MealType, int> _weeklyMinimums = {
    MealType.carneRoja: 2,
    MealType.chancho:   1,
    MealType.pollo:     2,
    MealType.pescado:   1,
  };

  // Máximos semanales por tipo
  static const Map<MealType, int> _weeklyMaximums = {
    MealType.carneRoja: 3,
    MealType.chancho:   2,
    MealType.pollo:     3,
    MealType.pescado:   2,
    MealType.pasta:     2,
    MealType.arroz:     2,
    MealType.sopa:      2,
  };

  static WeeklyMenu generateWeeklyMenu(
    List<Meal> meals,
    int year,
    int week, {
    int mealsPerDay = 3,
  }) {
    final lunchMeals = meals.where((m) => !m.isBreakfast).toList();
    final breakfastMeals = meals.where((m) => m.isBreakfast).toList();

    // 1. Construir pool semanal de 7 almuerzos con mínimos garantizados
    final weekPool = _buildWeekPool(lunchMeals);

    // 2. Ordenar pool evitando proteínas consecutivas (algoritmo greedy)
    final arranged = _arrangePool(weekPool);

    // 3. Asignar desayunos aleatoriamente
    final days = <DayMenu>[];
    for (int i = 0; i < 7; i++) {
      final breakfast = mealsPerDay == 3
          ? _pickBreakfast(breakfastMeals, days)
          : null;
      days.add(DayMenu(
        dayOfWeek: DayOfWeek.values[i],
        breakfastId: breakfast?.id,
        lunchId: arranged[i].id,
        dinnerId: arranged[i].id, // Cena = mismo que almuerzo
        cooked: [],
      ));
    }

    return WeeklyMenu(
      id: '',
      scopeId: '',
      year: year,
      week: week,
      days: days,
      prices: {},
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }

  static List<Meal> _buildWeekPool(List<Meal> available) {
    final pool = <Meal>[];
    final typeCounts = <MealType, int>{};
    final usedIds = <String>{};

    // Agregar mínimos primero
    for (final entry in _weeklyMinimums.entries) {
      final ofType = available
          .where((m) => m.type == entry.key && !usedIds.contains(m.id))
          .toList()..shuffle();
      final toAdd = ofType.take(entry.value);
      pool.addAll(toAdd);
      for (final m in toAdd) {
        usedIds.add(m.id);
        typeCounts[m.type] = (typeCounts[m.type] ?? 0) + 1;
      }
    }

    // Completar hasta 7 respetando máximos
    while (pool.length < 7) {
      final remaining = available
          .where((m) => !usedIds.contains(m.id))
          .where((m) => (typeCounts[m.type] ?? 0) < (_weeklyMaximums[m.type] ?? 999))
          .toList()..shuffle();
      if (remaining.isEmpty) break;
      final pick = remaining.first;
      pool.add(pick);
      usedIds.add(pick.id);
      typeCounts[pick.type] = (typeCounts[pick.type] ?? 0) + 1;
    }

    return pool;
  }

  static List<Meal> _arrangePool(List<Meal> pool) {
    final arranged = <Meal>[];
    final remaining = List<Meal>.from(pool);
    ProteinGroup? lastGroup;

    while (remaining.isNotEmpty) {
      // Buscar comida de grupo diferente al anterior
      final pick = remaining.firstWhere(
        (m) => m.type.group != lastGroup,
        orElse: () => remaining.first,
      );
      arranged.add(pick);
      lastGroup = pick.type.group;
      remaining.remove(pick);
    }

    return arranged;
  }

  static Meal? _pickBreakfast(List<Meal> breakfasts, List<DayMenu> usedDays) {
    if (breakfasts.isEmpty) return null;
    breakfasts.shuffle();
    return breakfasts.first;
  }
}
```

---

## Integración Google Gemini

### Opción A: Via endpoint backend (recomendada, sin exponer API key)
```dart
// En meal_service.dart
Future<WeeklyMenu> generateWithGemini(int year, int week) async {
  final response = await _dio.post('/api/menus/gemini', data: {
    'year': year,
    'week': week,
  });
  return WeeklyMenu.fromJson(response.data);
}
```

### Opción B: Directo desde Flutter (para demos)
```dart
// pubspec.yaml: google_generative_ai: ^0.4.0
import 'package:google_generative_ai/google_generative_ai.dart';

class GeminiService {
  late final GenerativeModel _model;

  GeminiService(String apiKey) {
    _model = GenerativeModel(
      model: 'gemini-2.5-flash-lite', // Mismo modelo que en el backend
      apiKey: apiKey,
    );
  }

  Future<WeeklyMenu> generateMenu(List<Meal> meals, int year, int week) async {
    final mealsJson = meals.map((m) => {'id': m.id, 'name': m.name, 'type': m.type.apiValue}).toList();
    final prompt = '''
Eres un nutricionista experto. Genera un menú semanal balanceado en JSON.
Reglas:
- Distribución proteica: ~2-3 días carne roja, ~2 días pollo, ~1 día pescado
- Sin repetir la misma comida en la misma semana
- La cena siempre es la misma que el almuerzo (mismo meal ID)
- Formato: {"days": [{"dayOfWeek": "Monday", "lunchId": "...", "dinnerId": "..."},...]}

Comidas disponibles: ${jsonEncode(mealsJson)}
    ''';

    final response = await _model.generateContent([Content.text(prompt)]);
    // Parsear JSON de response.text
    return _parseGeminiResponse(response.text!, year, week);
  }
}
```

---

## Lista de Compras — Implementación Detallada

### `ShoppingScreen`
```dart
class ShoppingScreen extends ConsumerStatefulWidget { ... }

class _ShoppingScreenState extends ConsumerState<ShoppingScreen> {
  late int _year, _week;
  Map<String, bool> _checked = {};      // Persistir en SharedPreferences
  Map<String, double> _prices = {};     // Persistir en DB via PATCH /api/menus/weekly
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _year = getWeekYear(now);
    _week = getWeekNumber(now);
    _loadCheckedState();
  }

  Future<void> _loadCheckedState() async {
    final prefs = await SharedPreferences.getInstance();
    final key = 'shopping_${_year}_$_week';
    final data = prefs.getString(key);
    if (data != null) {
      setState(() => _checked = Map<String, bool>.from(jsonDecode(data)));
    }
  }

  Future<void> _saveCheckedState() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('shopping_${_year}_$_week', jsonEncode(_checked));
  }

  void _onPriceChanged(String ingredient, double price) {
    setState(() => _prices[ingredient] = price);
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 800), () {
      ref.read(menuServiceProvider).updatePrices(_year, _week, _prices);
    });
  }

  double get _totalEstimated => _prices.values.fold(0, (a, b) => a + b);
  double get _totalSpent {
    return _prices.entries
        .where((e) => _checked[e.key] == true)
        .fold(0.0, (a, e) => a + e.value);
  }

  @override
  Widget build(BuildContext context) {
    final shoppingAsync = ref.watch(shoppingListProvider(year: _year, week: _week));
    return shoppingAsync.when(
      loading: () => const CircularProgressIndicator(),
      error: (e, _) => Text('Error: $e'),
      data: (items) => _buildList(items),
    );
  }

  // Total mostrado en ₲ (guaraníes, sin decimales)
  String _formatGuarani(double amount) =>
      '₲ ${amount.toInt().toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => '.')}';
}
```

---

## Tema y Colores (`lib/core/theme/`)

### `app_colors.dart`
```dart
class AppColors {
  // Primario - Verde esmeralda
  static const primary    = Color(0xFF10b981);
  static const secondary  = Color(0xFFf97316);
  static const accent     = Color(0xFF06b6d4);

  // Light mode
  static const bgLight    = Color(0xFFf8fafc);
  static const textLight  = Color(0xFF1e293b);

  // Dark mode
  static const bgDark     = Color(0xFF0f172a);
  static const textDark   = Color(0xFFf1f5f9);

  // Tipos de comida (mismo que MealType.color)
  static const carneRoja  = Color(0xFFef4444);
  static const chancho    = Color(0xFFec4899);
  static const pollo      = Color(0xFFf97316);
  static const pescado    = Color(0xFF06b6d4);
  static const pasta      = Color(0xFFeab308);
  static const arroz      = Color(0xFF8b5cf6);
  static const sopa       = Color(0xFF84cc16);
  static const otro       = Color(0xFF6b7280);
}
```

### `app_theme.dart`
```dart
ThemeData lightTheme = ThemeData(
  colorScheme: ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    brightness: Brightness.light,
  ),
  scaffoldBackgroundColor: AppColors.bgLight,
  fontFamily: 'Inter',
  // ... cardTheme, inputDecorationTheme, elevatedButtonTheme
);

ThemeData darkTheme = ThemeData(
  colorScheme: ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    brightness: Brightness.dark,
  ),
  scaffoldBackgroundColor: AppColors.bgDark,
  fontFamily: 'Inter',
);
```

---

## `pubspec.yaml`

```yaml
name: meal_weaver
description: Planificador de menús semanales inteligente
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # Estado
  flutter_riverpod: ^2.6.1
  riverpod_annotation: ^2.6.1

  # Red
  dio: ^5.7.0
  retrofit: ^4.4.1           # Generación de código para servicios

  # Auth & Storage
  flutter_secure_storage: ^9.2.2
  shared_preferences: ^2.3.2

  # Navegación
  go_router: ^14.8.1

  # Tema
  flex_color_scheme: ^8.0.2

  # Imágenes
  cached_network_image: ^3.4.1
  image_picker: ^1.1.2

  # Calendario/Fechas
  intl: ^0.19.0
  table_calendar: ^3.1.2

  # IA
  google_generative_ai: ^0.4.6

  # PDF Export
  pdf: ^3.11.1
  printing: ^5.14.0

  # Utilidades
  flutter_animate: ^4.5.0    # Animaciones

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^5.0.0
  build_runner: ^2.4.13
  riverpod_generator: ^2.6.1
  retrofit_generator: ^9.1.4
  json_serializable: ^6.8.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
  fonts:
    - family: Inter
      fonts:
        - asset: assets/fonts/Inter-Regular.ttf
        - asset: assets/fonts/Inter-Medium.ttf
          weight: 500
        - asset: assets/fonts/Inter-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/Inter-Bold.ttf
          weight: 700
```

---

## Plan de Implementación — Fases

### Fase 0 — Setup (Día 1)
- [ ] `flutter create meal_weaver --org com.macrohex`
- [ ] Configurar `pubspec.yaml` con todas las dependencias
- [ ] Setup GoRouter con rutas placeholder
- [ ] Setup Riverpod (ProviderScope en main.dart)
- [ ] Configurar DioClient con base URL
- [ ] Implementar AppTheme (light/dark)
- [x] ~~Modificar backend: Agregar `POST /api/auth/mobile-login`~~ **YA IMPLEMENTADO**
- [x] ~~Modificar backend: Proxy UploadThing para Flutter~~ **YA IMPLEMENTADO** (`POST /api/upload`)

### Fase 1 — Autenticación (Día 2)
- [ ] `LoginScreen` con form validation
- [ ] `RegisterScreen`
- [ ] `AuthService` con flutter_secure_storage
- [ ] `AuthInterceptor` en Dio
- [ ] `authProvider` con estado de sesión
- [ ] GoRouter redirect guard basado en auth

### Fase 2 — Modelos y Servicios (Día 2-3)
- [ ] Todos los modelos Dart con `fromJson`/`toJson`
- [ ] `MealService` (CRUD meals)
- [ ] `MenuService` (weekly/monthly get + generate)
- [ ] `ShoppingService`
- [ ] `HouseholdService`
- [ ] `UserService`

### Fase 3 — Widgets Base (Día 3)
- [ ] `AppButton`, `AppCard`, `AppInput`, `AppSelect`
- [ ] `AppModal` helper
- [ ] `AppBadge`
- [ ] `ThemeToggle`
- [ ] `AppNavbar` con BottomNavigationBar + NavigationRail

### Fase 4 — Gestión de Comidas (Día 4)
- [ ] `MealCard` widget
- [ ] `MealForm` con ImagePicker
- [ ] `MealsScreen` con grid, filtros, búsqueda
- [ ] Upload de imagen a UploadThing
- [ ] CRUD completo funcional

### Fase 5 — Dashboard (Día 4)
- [ ] `DashboardScreen` con menú del día
- [ ] Slots desayuno/almuerzo/cena del día actual
- [ ] Preview de próximos días
- [ ] Link a planificador semanal

### Fase 6 — Planificador Semanal (Día 5)
- [ ] `WeeklyGrid` + `DayCard`
- [ ] Navegación semanas anterior/siguiente
- [ ] Generación automática (algoritmo local o via API)
- [ ] Generación con IA (Gemini)
- [ ] `MealPickerDialog` para cambiar comida en slot
- [ ] Toggle cocinado (long-press o swipe)

### Fase 7 — Lista de Compras (Día 5-6)
- [ ] `ShoppingScreen` con CheckboxListTile
- [ ] Persistencia en SharedPreferences
- [ ] Campos de precio por ingrediente
- [ ] Debounced save a la API
- [ ] Total en ₲ (guaraníes)
- [ ] Copiar al portapapeles
- [ ] Progress indicator

### Fase 8 — Planificador Mensual (Día 6)
- [ ] `MonthlyScreen` con vista de 4 semanas
- [ ] Generación completa del mes
- [ ] Navegación mes anterior/siguiente
- [ ] Tap semana → WeeklyScreen

### Fase 9 — Perfil y Hogar (Día 7)
- [ ] `ProfileScreen` con edición de nombre y preferencias
- [ ] `HouseholdModal` con tabs crear/unirse/ver
- [ ] Mostrar código de invitación
- [ ] Lista de miembros del hogar

### Fase 10 — Pulido (Día 8)
- [ ] Exportar menú a PDF con `pdf` + `printing`
- [ ] Animaciones de transición entre pantallas
- [ ] Estados vacíos (empty states) con ilustraciones
- [ ] Mensajes de error amigables
- [ ] Loading skeletons en lugar de spinners
- [ ] Testing de widgets principales

---

## Consideraciones Especiales de Migración

### 1. Imágenes (UploadThing)
UploadThing no tiene SDK oficial para Flutter/Dart, pero el backend ya tiene un **proxy implementado** en `POST /api/upload`. Flutter sube imágenes a ese proxy con `multipart/form-data` y recibe la URL final.

```dart
// upload_service.dart
Future<UploadResult> uploadImage(File imageFile) async {
  final formData = FormData.fromMap({
    'file': await MultipartFile.fromFile(
      imageFile.path,
      filename: path.basename(imageFile.path),
      contentType: DioMediaType('image', 'jpeg'),
    ),
  });
  final response = await _dio.post('/api/upload', data: formData);
  return UploadResult(
    url: response.data['url'] as String,
    key: response.data['key'] as String,
  );
}

Future<void> deleteImage(String key) async {
  await _dio.delete('/api/upload', queryParameters: {'key': key});
}
```

El endpoint ya acepta Bearer JWT — no hay cambios adicionales en el backend.

### 2. ScopeId y Household
El `scopeId` es manejado 100% en el backend. Flutter sólo envía requests y el backend determina el scope basado en el JWT. Sin cambios necesarios en Flutter.

### 3. Precios en Guaraníes (₲)
- Mostrar siempre con símbolo ₲ y puntos de miles (sin decimales)
- `NumberFormat.currency(symbol: '₲ ', decimalDigits: 0, locale: 'es_PY')`
- El backend guarda los precios como `number` (enteros)

### 4. Semana ISO
- Usar el mismo cálculo ISO week que el backend: la semana 1 es la que contiene el primer jueves del año
- Importar `package:intl/intl.dart` y usar `DateFormat('w').format(date)` para ISO week

### 5. Modo Oscuro
- Persistir preferencia en `UserPreferences` via API (ya implementado en backend)
- Al iniciar: cargar preferencia del perfil si está logueado, sino `ThemeMode.system`

### 6. Navegación Bottom Bar (Mobile)
- 5 ítems: Dashboard, Comidas, Semanal, Mensual, Compras
- En tablet (>= 600px): usar `NavigationRail` en lugar de BottomNavigationBar
- Usar `LayoutBuilder` para decidir qué usar

### 7. Responsive Design
```dart
// Breakpoints (equivalente a Tailwind md:, lg:)
class Breakpoints {
  static const mobile  = 600.0;  // < 600: mobile
  static const tablet  = 900.0;  // 600-900: tablet
  static const desktop = 1200.0; // > 1200: desktop
}

// Uso en WeeklyGrid
LayoutBuilder(builder: (context, constraints) {
  if (constraints.maxWidth < Breakpoints.mobile) {
    return _buildHorizontalScroll(); // Mobile: scroll horizontal
  }
  return _buildGrid7Columns();       // Tablet+: grid 7 columnas
})
```

---

## Comandos de Desarrollo

```bash
# Crear proyecto
flutter create meal_weaver --org com.macrohex

# Instalar dependencias
flutter pub get

# Generar código (Riverpod, Retrofit, JSON)
dart run build_runner build --delete-conflicting-outputs

# Correr en desarrollo
flutter run -d chrome           # Web
flutter run -d android          # Android
flutter run -d ios              # iOS (requiere Mac)

# Tests
flutter test

# Build producción
flutter build apk --release     # Android APK
flutter build ios --release     # iOS IPA
flutter build web --release     # Web
```

---

## Notas del Agente

- **Backend listo**: `POST /api/auth/mobile-login` y `POST /api/upload` ya aceptan Bearer JWT. Todos los endpoints API también.
- **Household**: Después de `POST /api/household`, `POST /api/household/join`, `POST /api/household/leave` y `DELETE /api/household`, la respuesta incluye un campo `token` con el JWT actualizado. Flutter **debe guardarlo** para que el scopeId sea correcto en las siguientes requests.
- **Nunca** hardcodear la URL base — usar `--dart-define=BASE_URL=https://...` o `flutter_dotenv`
- El algoritmo de generación de menús puede correr **localmente en Flutter** (sin necesidad de API) para mejor UX offline — sólo sincronizar resultado con `PUT /api/menus/weekly`
- Mantener paridad 1:1 con los `apiValue` de `MealType` (ej: `"carne_roja"`, no `"carneRoja"`)
- Los IDs de MongoDB son strings (ObjectId serializado) — tratar siempre como `String` en Dart
- El endpoint de register (`POST /api/auth/register`) **no** hace login automático — llamar `POST /api/auth/mobile-login` después

---

**Creado**: 28/03/2026
**Versión**: 1.1 (backend implementado)
**Autor**: Claude (basado en análisis completo del proyecto MealWeaver Next.js)
**Estado**: ✅ Backend listo — Flutter puede arrancar desde Fase 0 sin tocar el backend
