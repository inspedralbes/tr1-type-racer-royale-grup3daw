# Credenciales de Desarrollo

Este archivo contiene las credenciales para los servicios del entorno de desarrollo.

## MySQL

-   **Host**: `mysql` (desde otro contenedor) o `localhost:3306` (desde el anfitrión)
-   **Root Password**: `root_password`
-   **Database**: `db_dev`
-   **User**: `user_dev`
-   **Password**: `password_dev`

## MongoDB

La base de datos MongoDB en el entorno de desarrollo no requiere autenticación.

-   **Host**: `mongo` (desde otro contenedor) o `localhost:27017` (desde el anfitrión)

## Adminer (Gestor de MySQL)

-   **URL**: `http://localhost:8080`
-   **Sistema**: `MySQL`
-   **Servidor**: `mysql`
-   **Usuario**: `root` o `user_dev`
-   **Contraseña**: `root_password` o `password_dev`

## Mongo Express (Gestor de MongoDB)

Mongo Express tiene su propia capa de autenticación para acceder a la interfaz web.

-   **URL**: `http://localhost:8081`
-   **Usuario**: `admin`
-   **Contraseña**: `pass`

Una vez dentro, no se necesitan más credenciales para conectar con la base de datos MongoDB.
