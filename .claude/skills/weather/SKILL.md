---
name: weather
description: Consulta el clima actual (temperatura, condición, viento, humedad) sin API key, usando wttr.in. Úsala cuando el usuario pida el clima, temperatura, pronóstico, o "cómo está el clima" en una ciudad o en su ubicación actual (detectada por IP).
---

# Weather

Consulta el clima actual usando `wttr.in`, un servicio gratuito que no requiere API key ni configuración.

## Cómo usar

Ejecuta el script `scripts/weather.sh`:

```bash
# Clima de la ubicación actual (detectada por IP)
.claude/skills/weather/scripts/weather.sh

# Clima de una ciudad específica
.claude/skills/weather/scripts/weather.sh "Ciudad de Mexico"

# Datos crudos en JSON (útil si necesitas parsear campos específicos)
.claude/skills/weather/scripts/weather.sh "Ciudad de Mexico" json
```

El modo por defecto (`full`) devuelve un reporte compacto de una línea con condición, temperatura, sensación térmica, viento y precipitación. El modo `json` devuelve el objeto completo de wttr.in (`format=j1`) con detalles por hora, astronomía, etc., por si se necesita más detalle o graficar algo.

## Notas

- Requiere conexión a internet y `curl` (sin dependencias adicionales).
- Si el usuario da un nombre de ciudad con espacios o acentos, pásalo entre comillas tal cual (wttr.in resuelve el geocoding).
- Si `curl` falla (sin red, o wttr.in caído), informa el error al usuario en vez de inventar datos de clima.
- Presenta el resultado al usuario de forma legible; no es necesario mostrarle el comando crudo salvo que lo pida.
