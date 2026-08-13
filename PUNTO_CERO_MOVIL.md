# Alienscrapyard - Punto Cero Movil

Fecha: 2026-08-08

## Estado confirmado

- Carga correctamente en escritorio y movil.
- Rondas multijugador mediante authoritative server.
- Construccion de plantillas y validacion de piezas.
- HUD, sonidos, feedback y pantalla de resultado.
- Pieza seleccionada visible sobre el hombro.
- Cinematica con camara virtual y fallback a camara normal.

## Invariantes de compatibilidad

- Mantener sincronizados `scene.json` y `assets/scene/main.composite`.
- El spawn debe usar rangos de dos valores: x `[14, 18]`, y `[1, 1]`, z `[2, 4]`.
- Mantener las versiones bloqueadas de SDK/runtime y asset-packs de `package.json`.
- Los componentes personalizados deben registrarse mediante imports estaticos.
- La camara cinematografica debe crearse de forma diferida y protegida.

## Funciones de la version ampliada aun no incorporadas

- Coreografia de los bloques durante la cinematica.
- Explosion y particulas al terminar la ronda.
- Trofeos flotantes para construcciones perfectas.
- Recolocacion del jugador al salir de los limites de la plataforma.
- Pools completos y auditoria automatica de entidades visuales.

Estas funciones no forman parte del punto cero porque aumentan el coste y el
riesgo movil. Deben recuperarse de una en una y probarse en movil despues de
cada incorporacion.
