# Documentación de la API y Sockets del Backend

Este documento describe los endpoints de la API REST y los eventos de Socket.IO para la comunicación con el servidor.

## API REST Endpoints

---

### Autenticación

#### `POST /api/login`

Registra un nuevo jugador en el servidor.

*   **Flujo de Trabajo:**
    1.  El cliente conecta por Socket.IO y obtiene su `socket.id`.
    2.  El cliente envía este `socket.id` junto con su nombre a esta ruta.
*   **Request Body (JSON):**
    ```json
    {
      "name": "nombreDelJugador",
      "socketId": "id_del_socket_del_cliente"
    }
    ```
*   **Respuestas:**
    *   **`201 Created` - Éxito:** Devuelve el objeto del jugador recién creado.
    *   **`400 Bad Request` - Error:** Si faltan los campos `name` o `socketId`.
    *   **`409 Conflict` - Error:** Si el nombre de usuario ya está en uso.
    *   **`423 Locked` - Error:** Si la partida ya ha comenzado.

---

### Sala (Room)

#### `GET /api/rooms`

Obtiene la lista de todos los jugadores actualmente en la sala.

*   **Request Body:** Ninguno.
*   **Respuestas:**
    *   **`200 OK` - Éxito:** Devuelve un array con los objetos de los jugadores.
        ```json
        [
          {
            "name": "jugador1",
            "score": 0,
            "role": "admin"
          },
          {
            "name": "jugador2",
            "score": 0,
            "role": "player"
          }
        ]
        ```

#### `POST /api/rooms/start`

Inicia la partida. Solo debería ser llamado por el 'admin' de la sala.

*   **Request Body:** Ninguno.
*   **Respuestas:**
    *   **`200 OK` - Éxito:**
        ```json
        { "message": "La partida ha comenzado." }
        ```
*   **Efecto Secundario:** Emite un evento `updateRoomState` a todos los clientes.

#### `DELETE /api/rooms`

Resetea la sala, eliminando a todos los jugadores y terminando cualquier partida en curso.

*   **Request Body:** Ninguno.
*   **Respuestas:**
    *   **`200 OK` - Éxito:**
        ```json
        { "message": "La sala ha sido vaciada." }
        ```
*   **Efecto Secundario:** Emite eventos `updatePlayerList` y `updateRoomState` a todos los clientes.

#### `DELETE /api/rooms/player/:socketId`

Elimina un jugador específico de la sala. Solo el host puede realizar esta acción.

*   **Parámetros de Ruta:**
    *   `socketId`: El ID de socket del jugador a eliminar.
*   **Request Body (JSON):**
    ```json
    {
      "hostSocketId": "id_del_socket_del_host_actual"
    }
    ```
*   **Respuestas:**
    *   **`200 OK` - Éxito:**
        ```json
        { "message": "Jugador con socketId [socketId] eliminado." }
        ```
    *   **`403 Forbidden` - Error:** Si el solicitante no es el host.
    *   **`404 Not Found` - Error:** Si el jugador a eliminar no se encuentra.
*   **Efecto Secundario:** Emite un evento `updatePlayerList` a todos los clientes y `player-removed` al jugador eliminado.

#### `POST /api/rooms/make-host`

Transfiere el rol de host a otro jugador. Solo el host actual puede realizar esta acción.

*   **Request Body (JSON):**
    ```json
    {
      "currentHostSocketId": "id_del_socket_del_host_actual",
      "targetPlayerSocketId": "id_del_socket_del_jugador_objetivo"
    }
    ```
*   **Respuestas:**
    *   **`200 OK` - Éxito:**
        ```json
        { "message": "Jugador con socketId [socketId] es ahora el host." }
        ```
    *   **`403 Forbidden` - Error:** Si el solicitante no es el host actual.
    *   **`400 Bad Request` - Error:** Si no se pudo transferir el rol de host (ej. jugador no encontrado).
*   **Efecto Secundario:** Emite un evento `updatePlayerList` a todos los clientes.

---

### Juego

#### `GET /api/words`

Devuelve la lista de palabras para la partida.

*   **Respuestas:**
    *   **`200 OK` - Éxito:** Devuelve un objeto con arrays de palabras por dificultad.

#### `POST /api/scores`

Actualiza la puntuación de un jugador.

*   **Request Body (JSON):**
    ```json
    {
      "name": "nombreDelJugador",
      "score": 120
    }
    ```
*   **Efecto Secundario:** Emite un evento `updatePlayerList` a todos los clientes.

---

## Eventos de Socket.IO

El cliente debe escuchar los siguientes eventos para mantener la UI sincronizada.

### `updatePlayerList`

*   **Descripción:** Se emite cada vez que un jugador se une, se va o actualiza su puntuación.
*   **Payload:** `(playerList: Array)` - Un array de objetos, donde cada objeto es un jugador con `name`, `score`, `role`, `socketId` y `isReady`.

### `updateRoomState`

*   **Descripción:** Se emite cuando el estado de la sala cambia (ej: empieza o termina una partida).
*   **Payload:** `(roomState: Object)` - Un objeto que contiene el estado de la sala.
    ```json
    {
      "isPlaying": true
    }
    ```

### `player-removed`

*   **Descripción:** Se emite a un jugador específico cuando ha sido eliminado de la sala por el host.
*   **Payload:** Ninguno.

### `set-ready`

*   **Descripción:** El cliente emite este evento para cambiar su estado de "listo" en la sala.
*   **Payload:** `(isReady: boolean)` - El nuevo estado de "listo" del jugador.
*   **Efecto Secundario (Backend):** Actualiza el estado del jugador y emite un evento `updatePlayerList` a todos los clientes.
