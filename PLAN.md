# Plan: AI Automations CLI

## Context

Crear un repositorio de automatizaciones con IA que funcione como una CLI interactiva similar a `npx @vercel/ai-sdk` o `create-next-app`. El objetivo es tener scripts que:

1. **Ejecuten de forma interactiva**: `ai-auto` → muestra menú de comandos
2. **Ejecuten directamente**: `ai-auto progress-summary --from 2024-01-01 --to 2024-01-31`

**Primer caso de uso**: Comando `progress-summary` que recopila datos de GitLab, Asana y repositorios locales para generar un resumen bullet-point del trabajo realizado entre dos fechas usando IA generativa (Vercel AI SDK).

**Stack decidido**:

- TypeScript (type safety, mantenibilidad)
- Modo híbrido: interactivo + línea de comandos directa
- Usuario tiene token de Asana, creará token de GitLab

## Arquitectura

### Estructura del Proyecto

```
ai-automations/
├── src/
│   ├── index.ts                    # Entry point CLI
│   ├── cli.ts                      # Setup Commander + menú interactivo
│   ├── commands/
│   │   ├── index.ts                # Registro de comandos
│   │   ├── base-command.ts         # Clase base para dual-mode
│   │   └── progress-summary/
│   │       ├── index.ts            # Definición del comando
│   │       ├── handler.ts          # Lógica de ejecución
│   │       ├── prompts.ts          # Prompts interactivos
│   │       └── types.ts            # Tipos específicos
│   ├── integrations/
│   │   ├── gitlab/
│   │   │   └── client.ts           # GitLab API client
│   │   ├── asana/
│   │   │   └── client.ts           # Asana API client
│   │   └── git/
│   │       └── client.ts           # Git local operations
│   ├── ai/
│   │   ├── provider.ts             # Vercel AI SDK setup
│   │   └── prompts.ts              # AI prompt templates
│   ├── config/
│   │   ├── manager.ts              # Gestión de configuración
│   │   └── schema.ts               # Validación con Zod
│   └── utils/
│       ├── logger.ts               # Logger con chalk
│       ├── spinner.ts              # Loading indicators
│       └── date.ts                 # Utilidades de fechas
├── package.json
├── tsconfig.json
├── tsup.config.ts                  # Build configuration
└── .env.example
```

### Bibliotecas Clave

**CLI & UX:**

- `commander` - Parseo de comandos y argumentos
- `@inquirer/prompts` - Prompts interactivos (versión moderna)
- `chalk` - Colores en terminal
- `ora` - Spinners elegantes
- `listr2` - Task runner con progress
- `boxen` - Cajas decorativas

**Integraciones:**

- `@gitbeaker/rest` - GitLab API client oficial
- `asana` - Asana API client oficial
- `simple-git` - Git local operations

**AI & Core:**

- `ai` - Vercel AI SDK
- `@ai-sdk/anthropic` - Provider para Claude
- `zod` - Validación de schemas
- `conf` - Config management con encriptación
- `date-fns` - Manipulación de fechas

**Build:**

- `tsx` - Ejecutar TypeScript directamente en dev
- `tsup` - Bundler rápido para build

### Patrón Dual-Mode

**Clase Base** (`src/commands/base-command.ts`):

Todos los comandos extienden `BaseCommand` que provee:

1. **Método `executeDirect(options)`**: Ejecuta con argumentos CLI
2. **Método `executeInteractive()`**: Ejecuta con prompts
3. **Router automático**: Detecta si hay argumentos o usa modo interactivo
4. **Registro automático**: Se auto-registran en Commander

**Ejemplo de uso**:

```typescript
// Modo interactivo
ai-auto
→ Muestra menú → Selecciona "progress-summary" → Prompts para fechas

// Modo directo
ai-auto progress-summary --from 2024-01-01 --to 2024-01-31
→ Ejecuta inmediatamente con esos parámetros
```

### Configuración

**Ubicación**: `~/.ai-automations/config.json` (gestionado por `conf`)

**Contenido**:

```json
{
  "tokens": {
    "gitlab": "glpat-xxxxx",
    "asana": "xxxxx"
  },
  "ai": {
    "provider": "anthropic",
    "apiKey": "sk-ant-xxxxx"
  },
  "defaults": {
    "gitlabUrl": "https://gitlab.com",
    "localRepos": ["/path/to/repo1", "/path/to/repo2"]
  }
}
```

**Prioridad**: CLI flags → ENV vars → Config file → Interactive prompts

## Implementación del Comando `progress-summary`

### Flujo de Ejecución

1. **Recopilar parámetros**:
   - Modo interactivo: Prompt para rango de fechas, fuentes de datos, repos locales
   - Modo directo: Leer de flags `--from`, `--to`, etc.

2. **Fetch de datos** (en paralelo con `listr2` mostrando progress):
   - **GitLab**: Commits y Merge Requests del período
   - **Asana**: Tareas completadas del período
   - **Git Local**: Commits de repos locales

3. **Agregación**: Combinar todos los datos en una estructura unificada

4. **Generación AI**:
   - Construir prompt con todos los datos
   - Llamar a Vercel AI SDK (Claude via Anthropic)
   - Recibir summary en formato markdown bullet-list

5. **Output**: Mostrar en consola con `boxen` o guardar en archivo

### Integraciones

**GitLab** (`src/integrations/gitlab/client.ts`):

```typescript
- Usa @gitbeaker/rest
- Métodos: getCommits(from, to), getMergeRequests(from, to)
- Filtra por proyectos configurados o del usuario
```

**Asana** (`src/integrations/asana/client.ts`):

```typescript
- Usa SDK oficial de Asana
- Método: getCompletedTasks(from, to)
- Filtra por workspace y usuario actual
```

**Git Local** (`src/integrations/git/client.ts`):

```typescript
- Usa simple-git
- Método: getCommits(repoPath, from, to)
- Itera sobre repos configurados
```

**AI Provider** (`src/ai/provider.ts`):

```typescript
- Usa Vercel AI SDK con Anthropic provider
- generateProgressSummary(aggregatedData)
- Prompt: agrupa por tema, destaca logros, 3-5 bullets
```

## Archivos Críticos a Crear

1. **`package.json`**: Dependencies, scripts, bin config
2. **`src/cli.ts`**: Setup de Commander + menú interactivo principal
3. **`src/commands/base-command.ts`**: Patrón abstracto para dual-mode
4. **`src/config/manager.ts`**: Gestión de config y tokens encriptados
5. **`src/commands/progress-summary/index.ts`**: Primer comando completo
6. **`src/commands/progress-summary/handler.ts`**: Lógica de fetch + agregación
7. **`src/commands/progress-summary/prompts.ts`**: Prompts interactivos
8. **`src/integrations/gitlab/client.ts`**: Cliente GitLab API
9. **`src/integrations/asana/client.ts`**: Cliente Asana API
10. **`src/integrations/git/client.ts`**: Cliente git local
11. **`src/ai/provider.ts`**: Integración Vercel AI SDK
12. **`tsconfig.json`**: Config TypeScript strict
13. **`tsup.config.ts`**: Build config para ESM

## Pasos de Implementación

### Fase 1: Setup Inicial

1. Crear `package.json` con dependencies
2. Configurar TypeScript (`tsconfig.json`)
3. Configurar build (`tsup.config.ts`)
4. Crear estructura de carpetas
5. Setup de utilidades básicas (logger, date helpers)

### Fase 2: CLI Core

1. Implementar `base-command.ts` con patrón dual-mode
2. Implementar `cli.ts` con Commander
3. Crear entry point `index.ts`
4. Implementar config manager con `conf`
5. Crear `commands/index.ts` (registry)

### Fase 3: Integraciones

1. GitLab client + types
2. Asana client + types
3. Git local client + types
4. AI provider con Vercel AI SDK

### Fase 4: Progress Summary Command

1. Definir tipos (`progress-summary/types.ts`)
2. Crear prompts interactivos (`progress-summary/prompts.ts`)
3. Implementar handler con data fetching (`progress-summary/handler.ts`)
4. Conectar todo en command (`progress-summary/index.ts`)
5. Crear AI prompt template (`ai/prompts.ts`)

### Fase 5: Testing & Polish

1. Probar en dev mode: `npm run dev`
2. Probar link local: `npm run link:local && ai-auto`
3. Validar modo interactivo
4. Validar modo directo
5. Crear `.env.example` y README.md

## Verificación

### Desarrollo

```bash
# Instalar
npm install

# Ejecutar en dev
npm run dev
npm run dev progress-summary --from 2024-01-01 --to 2024-01-31

# Link local para probar como CLI instalado
npm run link:local
ai-auto
ai-auto progress-summary -i
```

### Testing del Comando Progress Summary

**Modo Interactivo**:

```bash
ai-auto
→ Seleccionar "progress-summary"
→ Elegir rango (Last 7 days / Custom)
→ Seleccionar fuentes (GitLab, Asana, Git)
→ Ingresar repos locales si aplica
→ Elegir formato output (console/file/clipboard)
→ Ver progress bars mientras fetcha
→ Ver summary generado por IA
```

**Modo Directo**:

```bash
ai-auto progress-summary \
  --from 2024-01-01 \
  --to 2024-01-31 \
  --no-gitlab \
  --repos /path/to/repo1 /path/to/repo2
```

### Checklist de Funcionalidad

- [ ] Menú interactivo muestra "progress-summary"
- [ ] Prompts de fecha funcionan (presets + custom)
- [ ] Prompts de fuentes permiten seleccionar múltiples
- [ ] Flags CLI funcionan (`--from`, `--to`, `--no-gitlab`, etc.)
- [ ] Config manager guarda y recupera tokens
- [ ] GitLab client fetcha commits y MRs correctamente
- [ ] Asana client fetcha tareas completadas
- [ ] Git local lee commits de repos especificados
- [ ] AI genera summary coherente agrupado por temas
- [ ] Output se muestra en formato bonito (boxen)
- [ ] Spinners/progress se muestran durante fetch
- [ ] Errores se manejan gracefully (missing tokens, API errors)

## Extensibilidad Futura

Para agregar un nuevo comando:

1. Crear carpeta `src/commands/nuevo-comando/`
2. Crear clase que extienda `BaseCommand`
3. Implementar métodos requeridos
4. Registrar en `src/commands/index.ts`

**Todo el scaffolding dual-mode es automático** gracias al patrón `BaseCommand`.

## Consideraciones de Seguridad

- Tokens se guardan encriptados via `conf` package
- `.env` en `.gitignore`
- Nunca loggear tokens
- Validar inputs con Zod antes de usar
- Sanitizar outputs de IA antes de ejecutar comandos

## Next Steps Post-MVP

- Comando `config` para gestionar configuración interactivamente
- Más comandos: `repo-stats`, `code-review-summary`, `standup-notes`
- Tests con vitest
- Publicar a npm
- CI/CD con GitHub Actions
- Documentación completa en README
