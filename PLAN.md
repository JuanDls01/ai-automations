# Plan: AI Automations CLI

## Context

Repositorio de automatizaciones con IA que funciona como CLI interactiva. El objetivo es tener scripts que:

1. **Ejecuten de forma interactiva**: `ai-auto` → muestra menu de comandos
2. **Ejecuten directamente**: `ai-auto progress-summary --from 2025-01-01 --to 2025-01-31`

**Primer caso de uso**: Comando `progress-summary` que recopila datos de GitLab y Asana para generar un resumen de weekly meeting agrupado por temas.

**Stack**: TypeScript, Vercel AI SDK (Google provider), Commander, Inquirer.

## Output Esperado

El comando `progress-summary` genera un resumen para la weekly con este formato:

```markdown
**Completado:**

- [AT CCW] - [Auth]: Implementacion de login con OAuth (MR !123 merged, tarea entregada a QA, paso de Code Review a Integracion)
- [Pagos]: Fix de calculo de impuestos (TASK-456, paso de En Desarrollo a completada)
- [Front CCW] - [Infra]: Migracion de base de datos a nueva version (MR !130 merged)

**En progreso:**

- [AT CCW] - [Auth]: Flujo de reset password (en code review, MR !140)
- [Dashboard]: Refactor de componentes principales (en desarrollo)

**Bloqueantes:**

- [Pagos]: Integracion con proveedor X (en pausa, depende de TASK-789)
```

**Caracteristicas del output**:

- Formato: `[Proyecto] - [Tema]: Descripcion` cuando hay proyecto de GitLab, `[Tema]: Descripcion` cuando solo viene de Asana
- Agrupado por tema/area (la IA infiere los temas del contexto)
- Tres secciones: Completado, En progreso, Bloqueantes
- Cada bullet incluye referencia a MR o tarea de Asana cuando aplica
- Para "completado" incluye transiciones de seccion si estan disponibles (ej: "paso de Code Review a Integracion")
- Para "en progreso" indica el estado actual (en desarrollo, code review, etc.)
- Para "bloqueantes" indica la razon o dependencia si existe
- Output a terminal directamente

## Data Sources

### GitLab

**Proposito**: Fuente de informacion sobre MRs y puente para enriquecer datos de Asana.

**Filtrado**: Se consultan solo los project IDs configurados para evitar llamadas lentas.

**Datos a extraer por MR**:

- Titulo
- Descripcion (contiene referencia a tarea de Asana tipicamente)
- Proyecto
- URL
- Fecha de merge (si aplica)
- Estado

**Categorias**:

1. **MRs merged en el periodo**: Van a "Completado"
2. **MRs abiertos actualmente**: Van a "En progreso"

**Enriquecimiento con Asana**: De los MRs merged, se extrae la URL/ID de la tarea de Asana de la descripcion. Luego se consulta esa tarea en Asana para obtener:

- Seccion actual (si esta en QA PO, significa que fue desplegada y entregada)
- Assignee actual (si cambio de persona, fue pasada al PO)

Esto permite detectar tareas que el usuario desplego y entrego sin necesidad de consultar la seccion QA PO completa.

**Configuracion necesaria**:

- `GITLAB_TOKEN`: Personal access token con scope `read_api`
- `gitlab.url`: URL de la instancia de GitLab (default: `https://gitlab.com`)
- `gitlab.projectIds`: Lista de project IDs especificos donde buscar MRs

**API calls necesarios**:

```
# Por cada project ID configurado:
GET /projects/{id}/merge_requests
  ?author_username={username}
  &state=merged
  &updated_after={from}
  &updated_before={to}

GET /projects/{id}/merge_requests
  ?author_username={username}
  &state=opened
```

### Asana

**Proposito**: Fuente principal de informacion sobre tareas. El usuario trabaja con un solo proyecto (board) con columnas de estado.

**Configuracion**: Un solo proyecto de Asana. El usuario se auto-detecta con `/users/me` a partir del token.

**Columnas relevantes y su mapeo**:

| Columna Asana | Categoria en el summary |
| ------------- | ----------------------- |
| (completadas) | Completado              |
| EN DESARROLLO | En progreso             |
| CODE REVIEW   | En progreso             |
| INTEGRACION   | En progreso             |
| EN PAUSA      | Bloqueantes             |

**Datos a extraer por tarea**:

- Nombre de la tarea
- Descripcion de la tarea (contexto para la IA)
- Seccion actual
- Fecha de completado (si aplica)
- Subtareas (para mas detalle)
- Dependencias de Asana (para bloqueantes)

**Categorias**:

1. **Completado**: Tareas con `completed=true` y `completed_at` dentro del rango de fechas
2. **En progreso**: Tareas asignadas al usuario en secciones "EN DESARROLLO", "CODE REVIEW", "INTEGRACION" (estado actual, no depende del rango)
3. **Bloqueantes**: Tareas asignadas al usuario en seccion "EN PAUSA" + sus dependencias de Asana si existen

**Tareas referenciadas desde MRs**: Ademas de las queries directas, se consultan tareas individuales que se encontraron como referencia en las descripciones de MRs de GitLab. Esto enriquece los MRs con contexto de la tarea (estado actual, assignee).

**Configuracion necesaria**:

- `ASANA_TOKEN`: Personal access token
- `asana.projectId`: ID del proyecto (uno solo)
- `asana.sectionMapping`: Mapeo configurable de nombres de secciones a categorias (con defaults)

**API calls necesarios**:

```
GET /users/me                                    → obtener user GID
GET /projects/{id}/sections                      → obtener secciones y sus GIDs

# Completadas en el rango:
GET /workspaces/{id}/tasks/search
  ?assignee={userId}
  &completed=true
  &completed_on.after={from}
  &completed_on.before={to}
  &opt_fields=name,notes,completed_at,memberships.section.name

# En progreso (tareas en secciones especificas):
GET /sections/{sectionGid}/tasks
  ?opt_fields=name,notes,assignee,assignee.name,memberships.section.name
  # Filtrar por assignee = usuario en codigo

# Bloqueadas + dependencias:
GET /sections/{enPausaGid}/tasks
  ?opt_fields=name,notes,assignee,assignee.name,dependencies
  # Filtrar por assignee = usuario en codigo

# Tarea individual (referenciada desde MR):
GET /tasks/{taskGid}
  ?opt_fields=name,notes,assignee,assignee.name,memberships.section.name,completed
```

## AI Agent

### Estrategia

Single-call con `generateText()`. Los datos de Asana y GitLab ya vienen pre-categorizados (completado/en progreso/bloqueante), asi que la IA se enfoca en:

1. **Agrupar por tema/area**: Inferir temas a partir de nombres y descripciones de tareas y MRs
2. **Sintetizar**: Combinar tareas de Asana con MRs de GitLab cuando se refieren al mismo trabajo
3. **Formatear**: Generar el output en el formato bullet-list definido
4. **Correlacionar**: Si una tarea de Asana y un MR de GitLab son sobre lo mismo, mencionarlos juntos en un solo bullet

### Input al AI Agent

El prompt recibe un JSON estructurado con toda la data pre-procesada:

```typescript
interface ProgressData {
  dateRange: {
    from: string; // ISO date
    to: string;
  };

  completed: {
    asanaTasks: Array<{
      name: string;
      description: string;
      completedAt: string;
      subtasks?: string[];
      sectionTransitions?: Array<{ from: string; to: string; at: string }>;
    }>;
    mergedMRs: Array<{
      title: string;
      description: string;
      project: string;
      url: string;
      mergedAt: string;
      linkedAsanaTask?: {
        name: string;
        currentSection: string;
        currentAssignee: string;
      };
    }>;
  };

  inProgress: {
    asanaTasks: Array<{
      name: string;
      description: string;
      section: string; // "EN DESARROLLO" | "CODE REVIEW" | "INTEGRACION"
    }>;
    openMRs: Array<{
      title: string;
      description: string;
      project: string;
      url: string;
    }>;
  };

  blocked: {
    asanaTasks: Array<{
      name: string;
      description: string;
      dependencies?: Array<{
        name: string;
        assignee?: string;
      }>;
    }>;
  };
}
```

### System Prompt

```
Eres un asistente que genera resumenes de progreso semanal para meetings de equipo.

Recibes datos estructurados de Asana (tareas) y GitLab (merge requests) de un desarrollador.

Tu trabajo:
1. Agrupar los items por tema o area de trabajo (infiere los temas de los nombres y descripciones)
2. Sintetizar: si una tarea de Asana y un MR de GitLab son sobre lo mismo, combinalos en un solo bullet
3. Si un MR merged tiene una tarea de Asana asociada que ahora esta en QA/PO o asignada a otra persona, mencionar que fue entregada
4. Si una tarea completada tiene sectionTransitions, usar esa info para describir brevemente el recorrido o la transicion mas relevante
5. Generar el resumen en este formato exacto:

**Completado:**
- [Proyecto] - [Tema]: Descripcion concisa (referencia a MR o tarea)

**En progreso:**
- [Proyecto] - [Tema]: Descripcion concisa (estado actual: en desarrollo/code review/integracion)

**Bloqueantes:**
- [Tema]: Descripcion concisa (razon del bloqueo si se conoce)

Reglas:
- Cada bullet comienza con [Proyecto] cuando hay un MR o proyecto de GitLab asociado. Si solo viene de Asana, omitir [Proyecto]
- Los temas deben ser cortos (1-2 palabras): [Auth], [Pagos], [Dashboard], [Infra], etc.
- Cada bullet debe ser conciso pero informativo (1 linea)
- Incluir el nombre del proyecto de GitLab entre brackets cuando el item tenga un MR asociado
- Incluir referencias a MRs (!numero) y tareas cuando existan
- Para "en progreso", mencionar el estado actual entre parentesis
- Para "bloqueantes", mencionar la dependencia o razon entre parentesis
- Si hay sectionTransitions en una tarea completada, mencionar brevemente la transicion relevante
- Si no hay items en una seccion, omitir esa seccion
- Escribir en espanol
```

### Provider

```typescript
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const { text } = await generateText({
  model: google('gemini-2.0-flash'),
  system: SYSTEM_PROMPT,
  prompt: `Datos del periodo ${data.dateRange.from} al ${data.dateRange.to}:\n\n${JSON.stringify(data, null, 2)}`,
});
```

## Flujo de Ejecucion

```
1. Resolver parametros
   ├── --from y --to proporcionados? → usar directamente
   └── No? → prompt interactivo para fechas

2. Validar configuracion
   ├── Tokens disponibles? (ASANA_TOKEN, GITLAB_TOKEN, GOOGLE_GENERATIVE_AI_API_KEY)
   ├── Project IDs configurados?
   └── Si falta algo → error con instrucciones claras

3. Fetch de datos (en paralelo donde sea posible, con spinners)
   ├── GitLab: MRs merged en rango (por project IDs configurados)
   ├── GitLab: MRs abiertos actualizados en el rango (por project IDs configurados)
   ├── Asana: tareas completadas en rango
   ├── Asana: tareas en progreso (secciones EN DESARROLLO, CODE REVIEW, INTEGRACION)
   └── Asana: tareas bloqueadas (seccion EN PAUSA) + dependencias

4. Enriquecimiento
   ├── De MRs merged, extraer URLs de tareas de Asana de las descripciones
   │   └── Fetch individual de cada tarea referenciada → seccion actual + assignee
   └── De tareas completadas, fetch de stories (cambios de seccion en el rango)
       └── Permite describir transiciones como "paso de Code Review a Integracion"

5. Construir ProgressData
   └── Mapear y combinar todos los datos al tipo ProgressData

6. Generar summary con AI
   ├── Construir prompt con system prompt + ProgressData como JSON
   ├── Llamar generateText() con Gemini via Vercel AI SDK
   └── Recibir markdown string

7. Output
   └── Imprimir summary en terminal
```

## Arquitectura

### Estructura del Proyecto

```
ai-automations/
├── src/
│   ├── index.ts                    # Entry point CLI
│   ├── cli.ts                      # Setup Commander + menu interactivo
│   ├── commands/
│   │   ├── index.ts                # Registro de comandos
│   │   ├── base-command.ts         # Clase base para dual-mode
│   │   └── progress-summary/
│   │       ├── index.ts            # Definicion del comando
│   │       ├── handler.ts          # Logica de ejecucion (fetch + AI)
│   │       ├── prompts.ts          # Prompts interactivos
│   │       └── types.ts            # Tipos (ProgressData, etc.)
│   ├── integrations/
│   │   ├── gitlab/
│   │   │   ├── client.ts           # GitLab API client
│   │   │   └── types.ts            # Tipos de GitLab
│   │   └── asana/
│   │       ├── client.ts           # Asana API client
│   │       └── types.ts            # Tipos de Asana
│   ├── ai/
│   │   ├── provider.ts             # Vercel AI SDK setup (Google)
│   │   └── prompts.ts              # System prompt y template
│   ├── config/
│   │   ├── manager.ts              # Gestion de configuracion
│   │   └── schema.ts               # Validacion con Zod
│   └── utils/
│       ├── logger.ts               # Logger con chalk
│       └── spinner.ts              # Loading indicators con ora
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── .env.example
```

### Bibliotecas Clave

**CLI & UX:**

- `commander` - Parseo de comandos y argumentos
- `@inquirer/prompts` - Prompts interactivos
- `chalk` - Colores en terminal
- `ora` - Spinners

**Integraciones:**

- `@gitbeaker/rest` - GitLab API client oficial
- `asana` - Asana API client oficial

**AI & Core:**

- `ai` + `@ai-sdk/google` - Vercel AI SDK con Gemini
- `zod` - Validacion de schemas
- `date-fns` - Manipulacion de fechas

**Build:**

- `tsx` - Ejecutar TypeScript en dev
- `tsup` - Bundler para build

### Configuracion

**Via `.env`**:

```env
ASANA_TOKEN=xxxxx
GITLAB_TOKEN=glpat-xxxxx
GOOGLE_GENERATIVE_AI_API_KEY=xxxxx
GITLAB_URL=https://gitlab.com
```

**Via config file** (`~/.ai-automations/config.json`):

```json
{
  "asana": {
    "projectId": "67890",
    "sectionMapping": {
      "inProgress": ["EN DESARROLLO", "CODE REVIEW", "INTEGRACION"],
      "blocked": ["EN PAUSA"]
    }
  },
  "gitlab": {
    "projectIds": [42, 43, 44]
  }
}
```

**Prioridad**: CLI flags → ENV vars → Config file → Interactive prompts

## Pasos de Implementacion

### Fase 1: Limpieza y Setup ✅

1. ~~Eliminar archivos de exploracion (test-_.ts, check-_.ts, inspect-\*.ts)~~
2. ~~Limpiar src/ si tiene codigo de prueba~~
3. ~~Actualizar `package.json` con dependencies correctas (reemplazar @ai-sdk/anthropic por @ai-sdk/google)~~
4. ~~Verificar tsconfig.json y tsup.config.ts~~

### Fase 2: Integraciones (con inputs hardcodeados) ✅

1. **Asana client** ✅:
   - ~~Implementar auto-deteccion de usuario (`/users/me`)~~
   - ~~Implementar query de tareas completadas en rango~~
   - ~~Implementar query de tareas en progreso (por secciones)~~
   - ~~Implementar query de tareas bloqueadas + dependencias~~
   - ~~Implementar fetch de tarea individual (para enriquecimiento desde MRs)~~
   - ~~Implementar fetch de stories/transiciones de seccion por tarea~~
   - ~~Probar con project ID hardcodeado y token de .env~~
2. **GitLab client** ✅:
   - ~~Implementar query de MRs merged en rango~~
   - ~~Implementar query de MRs abiertos (filtrados por updated_after)~~
   - ~~Implementar extraccion de URL de tarea de Asana desde descripcion del MR~~
   - ~~Probar con project IDs hardcodeados y token de .env~~
3. ~~**Tipos**: definir interfaces para cada integracion y ProgressData~~

### Fase 3: AI Agent (con datos simulados) ✅

1. ~~Implementar provider con @ai-sdk/google~~
2. ~~Crear system prompt y template~~
3. ~~Probar con ProgressData hardcodeado/simulado primero~~
4. ~~Probar con datos reales de Fase 2~~
5. ~~Iterar sobre el prompt hasta que el output sea el esperado~~

### Fase 4: Handler (conectar todo) ✅

1. ~~Implementar handler que ejecuta el flujo completo:~~
   ~~fetch GitLab → fetch Asana → enriquecer MRs con Asana → fetch stories completadas → construir ProgressData → AI → output~~
2. ~~Probar end-to-end con rango de fechas hardcodeado~~
3. ~~Validar el flujo completo~~

### Fase 5: CLI ← SIGUIENTE

1. Implementar base-command con patron dual-mode
2. Implementar cli.ts con Commander
3. Crear entry point index.ts
4. Implementar config manager
5. Crear prompts interactivos para fechas
6. Conectar el handler al comando progress-summary

### Fase 6: Testing & Polish

1. Probar modo interactivo y directo
2. Manejo de errores (tokens faltantes, APIs caidas)
3. Spinners durante fetch
4. `.env.example` actualizado

## Checklist de Funcionalidad

- [x] Asana client auto-detecta usuario con /users/me
- [x] Asana client obtiene tareas completadas del periodo (con descripcion)
- [x] Asana client obtiene tareas en progreso por seccion (con descripcion)
- [x] Asana client obtiene tareas bloqueadas + dependencias
- [x] Asana client puede fetch de tarea individual por GID
- [x] Asana client obtiene stories/transiciones de seccion por tarea
- [x] GitLab client obtiene MRs merged del periodo (por project IDs)
- [x] GitLab client obtiene MRs abiertos filtrados por fecha (por project IDs)
- [x] GitLab client extrae URLs de Asana de descripciones de MRs
- [x] Enriquecimiento: MRs merged se enriquecen con estado de tarea Asana
- [x] Enriquecimiento: tareas completadas se enriquecen con transiciones de seccion
- [x] Datos se mapean correctamente a ProgressData
- [x] AI genera summary con formato [Proyecto] - [Tema]: Descripcion
- [x] Handler conecta todo el flujo end-to-end
- [ ] Menu interactivo muestra "progress-summary"
- [ ] Flags CLI funcionan (`--from`, `--to`)
- [ ] Config manager lee tokens de ENV y config file
- [ ] Output se imprime en terminal
- [ ] Spinners se muestran durante fetch
- [ ] Errores se manejan con mensajes claros

## Consideraciones de Seguridad

- Tokens via ENV vars, nunca hardcodeados
- `.env` en `.gitignore`
- Nunca loggear tokens
- Validar inputs con Zod

## Extensibilidad Futura

Para agregar un nuevo comando:

1. Crear carpeta `src/commands/nuevo-comando/`
2. Crear clase que extienda `BaseCommand`
3. Implementar metodos requeridos
4. Registrar en `src/commands/index.ts`

**Ideas de comandos futuros**: `standup-notes`, `sprint-summary`, `code-review-summary`
