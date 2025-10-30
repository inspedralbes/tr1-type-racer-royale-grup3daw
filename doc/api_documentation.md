# Documentación de la API y Sockets del Backend

Este documento describe los endpoints de la API REST y los eventos de Socket.IO que el frontend debe utilizar para comunicarse con el servidor.

## API REST Endpoints

A continuación se detallan las rutas HTTP disponibles.

---

### 1. Autenticación de Jugador

*   **Ruta:** `POST /api/login`
*   **Descripción:** Registra un nuevo jugador en el servidor, asociándolo con su conexión de socket activa. El primer jugador en conectarse será el 'host'.
*   **Flujo de Trabajo:** 
    1. El cliente se conecta por Socket.IO y obtiene su `socket.id`.
    2. El cliente envía este `socket.id` junto con su nombre a esta ruta.
*   **Request Body (JSON):**
    ```json
    {
      "name": "nombreDelJugador",
      "socketId": "id_del_socket_del_cliente"
    }
    ```
*   **Respuestas:**
    *   **`200 OK` - Éxito:** Devuelve el objeto del jugador recién creado.
        ```json
        {
          "name": "nombreDelJugador",
          "score": 0,
          "role": "host",
          "socketId": "id_del_socket_del_cliente"
        }
        ```
    *   **`400 Bad Request` - Error:** Si no se proporcionan todos los campos.
        ```json
        {
          "error": "Los campos \"name\" y \"socketId\" son requeridos."
        }
        ```

---

### 2. Obtener Palabras del Juego

*   **Ruta:** `GET /api/words`
*   **Descripción:** Devuelve la lista de palabras que se usarán en la partida. El frontend debe llamar a esta ruta para iniciar el juego.
*   **Request Body:** Ninguno.
*   **Respuestas:**
    *   **`200 OK` - Éxito:** Devuelve un objeto con un array de palabras.
        ```json
        {
          "words": ["palabra1", "ejemplo", "velocidad", "carrera", "..."]
        }
        ```
    *   **`500 Internal Server Error` - Error:** Si el servidor no puede leer el archivo de palabras.
        ```json
        {
          "error": "No se pudo leer el archivo de palabras."
        }
        ```

---

### 3. Actualizar Puntuación

*   **Ruta:** `POST /api/scores`
*   **Descripción:** Actualiza la puntuación de un jugador específico. El servidor notificará a todos los clientes (vía Socket.IO) sobre la lista de jugadores actualizada.
*   **Request Body (JSON):**
    ```json
    {
      "name": "nombreDelJugador",
      "score": 120
    }
    ```
*   **Respuestas:**
    *   **`200 OK` - Éxito:**
        ```json
        {
          "message": "Puntuación actualizada correctamente."
        }
        ```
    *   **`400 Bad Request` - Error:** Si faltan campos.
        ```json
        {
          "error": "Se requieren los campos \"name\" y \"score\"."
        }
        ```
    *   **`404 Not Found` - Error:** Si el jugador no existe.
        ```json
        {
          "error": "Jugador no encontrado."
        }
        ```

---

## Eventos de Socket.IO

El cliente debe conectarse al servidor de Sockets para la comunicación en tiempo real.

### Eventos que el Cliente Escucha (recibe del servidor)

1.  **`updatePlayerList`**
    *   **Descripción:** El servidor emite este evento a **todos** los clientes cada vez que un jugador se une, se va, o actualiza su puntuación. El frontend debe usar esta información para mantener la lista de jugadores actualizada en la UI.
    *   **Payload:** `(playerList: Array)`
        *   El array contiene objetos con el nombre, la puntuación y el rol de cada jugador.
    *   **Ejemplo de Payload:**
        ```json
        [
          { "name": "jugador1", "score": 50, "role": "host" },
          { "name": "jugador2", "score": 95, "role": "client" }
        ]
        ```
    *   **Ejemplo de uso:**
        ```javascript
        socket.on('updatePlayerList', (playerList) => {
          // Actualizar la UI con la nueva lista de jugadores
        });
        ```