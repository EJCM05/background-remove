<p align="center">
    <img src="https://i.postimg.cc/k5Z9kH6p/imagen-sin-fondo-1.png" alt="IMAGENREMOVERDORDELOGOHOATEJCM">
</p>

# Aplicación para Eliminar Fondos || EJCM-HOAT🖌️

Una aplicación web interactiva construida con FastAPI y OpenCV que permite a los usuarios eliminar fondos de imágenes de manera precisa. Los usuarios pueden subir una imagen y utilizar herramientas de selección intuitivas (pincel, borrador, rectángulo, círculo) para definir el área que desean conservar. La imagen resultante se recorta y centra automáticamente en un lienzo limpio.

Desplegado en render: [https://background-remove-zjto.onrender.com](https://background-remove-zjto.onrender.com)

## ✨ Características Principales

*   **Interfaz Moderna y Responsiva:** Construida con Bootstrap 5 y Tailwind CSS para una experiencia de usuario fluida en dispositivos de escritorio y móviles.
*   **Subida de Imágenes:** Sube fácilmente archivos de imagen (JPG, PNG, etc.) desde tu dispositivo.
*   **Múltiples Herramientas de Selección:**
    *   **Pincel:** Pinta sobre el área que deseas conservar.
    *   **Borrador:** Corrige errores en tu selección.
    *   **Rectángulo y Círculo:** Selecciona áreas grandes rápidamente.
*   **Vista Previa en Tiempo Real:** Visualiza el área seleccionada al instante con una superposición interactiva.
*   **Auto-Recorte y Centrado:** El objeto final se recorta y centra automáticamente en un lienzo de salida cuadrado, ¡perfecto para fotos de perfil o catálogos de productos!
*   **Backend Potente con FastAPI:** El procesamiento de imágenes se realiza de forma asíncrona y eficiente en el backend.

## 🛠️ Tecnologías Utilizadas

*   **Backend:** Python, FastAPI, Uvicorn
*   **Procesamiento de Imágenes:** OpenCV, NumPy
*   **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
*   **Frameworks de Estilos:** Bootstrap 5, Tailwind CSS

## 🚀 Empezando

Sigue estos pasos para ejecutar el proyecto en tu máquina local.

### Prerrequisitos

*   Python 3.8 o superior
*   pip (el gestor de paquetes de Python)

### Instalación

1.  **Clona el Repositorio**

    ```bash
    git clone https://github.com/tu-usuario/tu-repositorio.git
    cd tu-repositorio
    ```
2.  **Crea y Activa un Entorno Virtual**

    Es una buena práctica aislar las dependencias del proyecto.

    En macOS/Linux:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

    En Windows:

    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    ```
3.  **Instala las Dependencias**

    Crea un archivo llamado `requirements.txt` en la raíz del proyecto con el siguiente contenido:

    ```text
    fastapi
    uvicorn[standard]
    python-multipart
    opencv-python-headless
    numpy
    aiofiles
    Jinja2
    ```

    Luego, instala todo con un solo comando:

    ```bash
    pip install -r requirements.txt
    ```
4.  **Inicia el Servidor**

    Desde la carpeta raíz del proyecto, ejecuta el siguiente comando:

    ```bash
    uvicorn main:app --reload
    ```

    *   `main`: Se refiere al archivo `main.py`.
    *   `app`: Es el objeto FastAPI creado dentro de `main.py`.
    *   `--reload`: Reinicia automáticamente el servidor cada vez que detecta un cambio en el código.
5.  **Abre la Aplicación**

    Abre tu navegador web y navega a la siguiente dirección:

    ```
    http://127.0.0.1:8000
    ```

    ¡Ahora puedes empezar a usar la aplicación!

## 📁 Estructura del Proyecto

```
/
|-- main.py             # Lógica del backend con FastAPI y OpenCV
|-- requirements.txt    # Dependencias de Python
|-- static/
|   |-- index.html      # Estructura de la página principal
|   |-- script.js       # Lógica del frontend (canvas, herramientas, fetch API)
|-- venv/               # Directorio del entorno virtual (opcional, si se crea)
|-- README.md           # Este archivo
```

## 📝 Endpoint de la API

La aplicación utiliza un único endpoint principal para el procesamiento de imágenes:

**POST /remover-con-pincel/**

*   **Descripción:** Recibe una imagen original y una máscara generada por el usuario. Procesa la imagen para eliminar el fondo de acuerdo con la máscara, recorta el objeto resultante y lo centra en un nuevo lienzo.
*   **Body (multipart/form-data):**
    *   `archivo_imagen`: El archivo de imagen original.
    *   `archivo_mascara`: Un archivo PNG que representa la máscara creada por el usuario.
*   **Respuesta Exitosa (200 OK):** Devuelve la imagen procesada final en formato PNG.