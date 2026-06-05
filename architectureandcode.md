# Arquitectura y Código Fuente: Sistema de Rastreo Nutricional NutriTrack Pro

Este documento describe la arquitectura técnica, la lógica de negocio y el código fuente completo del sistema NutriTrack Pro.

---

## 1. Arquitectura General del Sistema

El sistema opera bajo una arquitectura de **Cliente-Servidor** desacoplada:

- **Base de Datos (SQL Relacional):** Utilizamos SQLite gestionado a través de **Prisma ORM**. La base de datos almacena perfiles de usuarios, catálogos de alimentos y, lo más importante, tablas de requerimientos nutricionales (RDA, AI, UL, AMDR) pobladas dinámicamente.
- **Backend (API REST):** Construido con **NestJS**. Se encarga de la persistencia de datos y del cálculo matemático complejo de metas nutricionales personalizadas.
- **Frontend (SPA):** Desarrollado en **React (Vite)**. Implementa un sistema visual de **Semáforo Nutricional** y una gestión dinámica de registros diarios agrupados por tiempos de comida.

---

## 2. Modelado de Datos (Backend - Prisma)

### 2.1 Esquema de Base de Datos
Archivo: `backend/prisma/schema.prisma`
Define las tablas relacionales y cómo se comunican entre sí.

```prisma
model Food {
  id                Int      @id @default(autoincrement())
  group             String
  name              String
  baseAmount        Float
  kcal              Float
  carbs             Float
  protein           Float
  fat               Float
  // ... (otros 29 campos nutricionales)
  logEntries        LogEntry[]
}

model User {
  id            String     @id @default(uuid())
  age           Int
  gender        String     // "M" | "F"
  weight        Float
  activityLevel String     // "LIGERA", "MODERADA", "VIGOROSA"
  dailyLogs     DailyLog[]
}

model LogEntry {
  id          String    @id @default(uuid())
  dailyLogId  String
  foodId      Int
  mealType    String    @default("Almuerzo") // Desayuno, Almuerzo, Cena, Snack
  inputAmount Float
  inputType   InputType // GRAMS | HOUSEHOLD
  // ...
}

model EnergyRequirement {
  id        Int      @id @default(autoincrement())
  age       Int
  gender    String
  light     Float?   // Kcal/kg/día
  moderate  Float
  vigorous  Float?
}

model NutrientRequirement {
  nutrient  String
  minAge    Int
  maxAge    Int
  gender    String
  value     Float
  type      String   // RDA, AI, UL, AMDR_MIN, AMDR_MAX
}
```

---

## 3. Lógica de Negocio y Cálculos (Backend)

### 3.1 El Cerebro: DailyLogService
Archivo: `backend/src/features/daily-log/daily-log.service.ts`
Aquí ocurre la magia del cálculo nutricional reactivo.

**Cómo funciona:**
1.  **Cálculo de Energía:** El sistema identifica la edad y género, busca el factor `Kcal/kg` en SQL y lo multiplica por el peso del usuario.
2.  **Cálculo de Macros:** Los Carbohidratos y Grasas se calculan como un porcentaje (%) de la energía total (AMDR), convirtiendo calorías a gramos (9 cal/g para grasa, 4 cal/g para carbos).
3.  **Cálculo de Micros:** Mapea automáticamente los RDA, AI y UL según el rango de edad exacto.

```typescript
// Implementación crítica del cálculo de metas
private async calculateTargets(user: any) {
    if (!user) return null;

    // Consulta SQL de requerimientos
    const [energyReq, nutrientReqs] = await Promise.all([
      this.prisma.energyRequirement.findFirst({ where: { age: user.age, gender: user.gender } }),
      this.prisma.nutrientRequirement.findMany({ 
        where: { minAge: { lte: user.age }, maxAge: { gte: user.age }, 
        OR: [{ gender: user.gender }, { gender: 'BOTH' }] } 
      })
    ]);

    const targets: any = { kcal: { target: 2000 } };
    
    // Energía Dinámica
    if (energyReq) {
      const kcalPerKg = user.activityLevel === 'LIGERA' ? energyReq.light :
                        user.activityLevel === 'VIGOROSA' ? energyReq.vigorous :
                        energyReq.moderate;
      targets.kcal.target = kcalPerKg * user.weight;
    }

    // Macros y Micros Reactivos
    nutrientReqs.forEach(req => {
      let val = req.value;
      if (req.unit === 'g/kg/day') val = req.value * user.weight;
      if (req.unit === '%') val = (targets.kcal.target * (req.value / 100)) / (req.nutrient.includes('fat') ? 9 : 4);
      
      if (!targets[req.nutrient]) targets[req.nutrient] = {};
      targets[req.nutrient][req.type.toLowerCase()] = val;
    });

    return targets;
}
```

---

## 4. Frontend e Interfaz Visual (React)

### 4.1 El Semáforo Nutricional (ProgressBar)
Archivo: `frontend/src/App.tsx`
El componente visual interpreta los límites (Bounds) y aplica colores semánticos:

- **Rojo (`bg-rose-500`):** Déficit severo (menor al RDA).
- **Ámbar (`bg-amber-500`):** Nivel aceptable pero no óptimo.
- **Verde (`bg-emerald-500`):** Rango óptimo (Dentro del AMDR).
- **Rojo Oscuro (`bg-rose-600`):** Exceso peligroso (Supera el UL).

```tsx
const ProgressBar = ({ label, current, bounds, unit }: any) => {
    const rda = bounds.rda || bounds.ai || bounds.target || 0;
    const amdrMin = bounds.amdr_min || 0;
    const limit = bounds.amdr_max || bounds.ul || 0;
    
    // Lógica de color semántico
    if (rda > 0 && current < rda) color = 'bg-rose-500'; 
    else if (current >= rda && current < amdrMin) color = 'bg-amber-500'; 
    else if (current >= amdrMin && (limit === 0 || current <= limit)) color = 'bg-emerald-500';
    else if (limit > 0 && current > limit) color = 'bg-rose-600';
    
    // Renderizado...
};
```

### 4.2 Organización por Tiempos de Comida
El registro cronológico (`Timeline`) agrupa dinámicamente los alimentos. Soporta "Desayuno", "Almuerzo", "Cena" y permite añadir tiempos personalizados (ej. "Media mañana") de forma flexible.

---

## 5. Flujo de Datos (Data Flow)

1.  **Entrada:** El usuario ingresa un alimento y selecciona "Almuerzo".
2.  **API:** Se envía `POST /daily-log/entry`. El servidor guarda la porción y el tipo de comida.
3.  **Recálculo:** El servidor consulta la tabla `NutrientRequirement` para el perfil del usuario y devuelve las metas exactas en gramos/mg.
4.  **UI:** React recibe las metas, actualiza el estado global (Zustand) y el semáforo visual se ajusta instantáneamente, cambiando colores según los nuevos totales.

---
*NutriTrack Pro - Documentación Técnica*
