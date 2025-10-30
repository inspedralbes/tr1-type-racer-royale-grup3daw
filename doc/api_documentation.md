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
*   **Payload:** `(playerList: Array)` - Un array de objetos, donde cada objeto es un jugador con `name`, `score` y `role`.

### `updateRoomState`

*   **Descripción:** Se emite cuando el estado de la sala cambia (ej: empieza o termina una partida).
*   **Payload:** `(roomState: Object)` - Un objeto que contiene el estado de la sala.
    ```json
    {
      "isPlaying": true
    }
    ```
