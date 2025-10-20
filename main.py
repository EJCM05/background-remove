import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, File, UploadFile, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import Annotated
import io

# REMOVEDOR DE FONDO HECHO POR EBER JOSUE COLMENARES MENDOZA - IG:HOATSOLUCIONESTECH 

app = FastAPI(
    title="Removedor de Fondo - HOAT",
    description="Sube una imagen y pinta sobre las áreas que quieres hacer transparentes."
)

# --- AÑADE ESTE BLOQUE COMPLETO PARA PRODUCCIÓN ---
# Esto permite que tu app en Render reciba peticiones de cualquier navegador
origins = [
    # "*", # Permite todas las conexiones.
    # Cuando tengas tu URL final, puedes reemplazar "*" por ella:
    "https://background-remove-zjto.onrender.com/" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Permite POST, GET, etc.
    allow_headers=["*"], # Permite todas las cabeceras
)
# --- FIN DEL BLOQUE CORS ---


app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static")

MAX_DIMENSION = 1024 # Máxima dimensión para redimensionar la imagen de entrada
OUTPUT_CANVAS_SIZE = 1024 # TAMAÑO DE SALIDA CORREGIDO A 1024x1024

def resize_image_if_needed(image, max_dim=MAX_DIMENSION):
    """Redimensiona una imagen si excede las dimensiones máximas, manteniendo la proporción."""
    h, w = image.shape[:2]
    if h > max_dim or w > max_dim:
        if h > w:
            new_h = max_dim
            new_w = int(w * (max_dim / h))
        else:
            new_w = max_dim
            new_h = int(h * (max_dim / w))
        return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return image

@app.get("/", response_class=HTMLResponse)
async def leer_raiz(request: Request):
    """Sirve la página principal (index.html)."""
    return templates.TemplateResponse("index.html", {"request": request})
# REMOVEDOR DE FONDO HECHO POR EBER JOSUE COLMENARES MENDOZA - IG:HOATSOLUCIONESTECH s
@app.post("/remover-con-pincel/",
          summary="Elimina un área de una imagen usando una máscara de pincel y centra el resultado",
          tags=["Procesamiento de Imágenes"])
async def remover_fondo_con_pincel(
    archivo_imagen: Annotated[UploadFile, File(description="La imagen a procesar.")],
    archivo_mascara: Annotated[UploadFile, File(description="La máscara pintada por el usuario.")]
):
    try:
        contenido_imagen = await archivo_imagen.read()
        np_array_imagen = np.frombuffer(contenido_imagen, np.uint8)
        # Decodifica la imagen. Acepta JPG, PNG, WEBP, etc.
        imagen = cv2.imdecode(np_array_imagen, cv2.IMREAD_UNCHANGED)

        contenido_mascara = await archivo_mascara.read()
        np_array_mascara = np.frombuffer(contenido_mascara, np.uint8)
        mascara = cv2.imdecode(np_array_mascara, cv2.IMREAD_UNCHANGED)

        if imagen is None or mascara is None:
            raise HTTPException(status_code=400, detail="No se pudo decodificar la imagen o la máscara.")

        # --- LÓGICA DE OPTIMIZACIÓN DE FORMATO ---
        # Asegura que la imagen de entrada sea siempre BGRA (4 canales)
        if len(imagen.shape) == 2: # Si es Grayscale
            imagen = cv2.cvtColor(imagen, cv2.COLOR_GRAY2BGRA)
        elif len(imagen.shape) == 3 and imagen.shape[2] == 3: # Si es BGR (ej. un JPG)
            imagen = cv2.cvtColor(imagen, cv2.COLOR_BGR2BGRA)
        # Si ya tiene 4 canales (BGRA), no se hace nada.
        # --- FIN DE LA LÓGICA ---

        imagen_redimensionada = resize_image_if_needed(imagen)
        h_resized, w_resized = imagen_redimensionada.shape[:2]

        mascara_redimensionada = cv2.resize(mascara, (w_resized, h_resized), interpolation=cv2.INTER_AREA)
        
        # La lógica de la máscara (eliminar donde el overlay NO es transparente) es correcta
        eliminar_area_booleana = (mascara_redimensionada[:, :, 3] > 0)
        
        imagen_final = imagen_redimensionada.copy()
        
        imagen_final[eliminar_area_booleana, 3] = 0 # Establecer el alfa a 0 donde queremos eliminar

        # --- Lógica de centrado ---
        alpha_channel = imagen_final[:, :, 3]
        _, thresholded_alpha = cv2.threshold(alpha_channel, 0, 255, cv2.THRESH_BINARY)
        
        contours, _ = cv2.findContours(thresholded_alpha, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w_obj, h_obj = cv2.boundingRect(largest_contour)

            objeto_recortado = imagen_final[y:y+h_obj, x:x+w_obj]

            # El canvas de salida ahora es de 1024x1024
            output_canvas = np.zeros((OUTPUT_CANVAS_SIZE, OUTPUT_CANVAS_SIZE, 4), dtype=np.uint8)

            scale_factor = 1.0
            # Escalar si es más grande que el 90% del canvas de salida
            if w_obj > OUTPUT_CANVAS_SIZE * 0.9 or h_obj > OUTPUT_CANVAS_SIZE * 0.9:
                scale_factor = min((OUTPUT_CANVAS_SIZE * 0.9) / w_obj, (OUTPUT_CANVAS_SIZE * 0.9) / h_obj)
            
            w_scaled = int(w_obj * scale_factor)
            h_scaled = int(h_obj * scale_factor)
            
            objeto_escalado = cv2.resize(objeto_recortado, (w_scaled, h_scaled), interpolation=cv2.INTER_AREA)

            paste_x = (OUTPUT_CANVAS_SIZE - w_scaled) // 2
            paste_y = (OUTPUT_CANVAS_SIZE - h_scaled) // 2
            
            # Lógica de pegado con transparencia (Alpha blending)
            for c in range(0, 3): # BGR
                output_canvas[paste_y:paste_y+h_scaled, paste_x:paste_x+w_scaled, c] = \
                    objeto_escalado[:, :, c] * (objeto_escalado[:, :, 3] / 255.0) + \
                    output_canvas[paste_y:paste_y+h_scaled, paste_x:paste_x+w_scaled, c] * (1.0 - objeto_escalado[:, :, 3] / 255.0)
            output_canvas[paste_y:paste_y+h_scaled, paste_x:paste_x+w_scaled, 3] = \
                output_canvas[paste_y:paste_y+h_scaled, paste_x:paste_x+w_scaled, 3] * (1.0 - objeto_escalado[:, :, 3] / 255.0) + \
                objeto_escalado[:, :, 3]

            imagen_final = output_canvas
        else:
            # Si no hay nada seleccionado, devuelve un canvas transparente
            imagen_final = np.zeros((OUTPUT_CANVAS_SIZE, OUTPUT_CANVAS_SIZE, 4), dtype=np.uint8)

        # Codifica la imagen final SIEMPRE como PNG para la transparencia
        _, buffer = cv2.imencode(".png", imagen_final)
        return StreamingResponse(io.BytesIO(buffer.tobytes()), media_type="image/png")

    except Exception as e:
        print(f"Error de procesamiento con pincel: {e}")
        raise HTTPException(status_code=500, detail=f"Ocurrió un error interno: {e}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    
# Creado por EBER JOSUE COLMENARES MENDOZA - IG:HOATSOLUCIONESTECH