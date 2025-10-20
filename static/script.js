// Este es el ÚNICO script que debe estar en tu archivo.
document.addEventListener('DOMContentLoaded', () => {
    // console.log("Paso 1: Script unificado cargado."); // Descomenta esto si vuelves a tener problemas

    // --- Referencias al DOM ---
    const form = document.getElementById('upload-form');
    const imageInput = document.getElementById('image-input');
    const editorArea = document.getElementById('editor-area');
    const brushSizeSlider = document.getElementById('brush-size');
    const canvasContainer = document.getElementById('canvas-container');
    const toolButtons = document.querySelectorAll('.tool-btn');
    const resultArea = document.getElementById('result-area');
    const resultImage = document.getElementById('result-image');
    const downloadLink = document.getElementById('download-link');
    const submitButton = document.getElementById('submit-button');
    const buttonText = document.getElementById('button-text');
    const spinner = document.getElementById('spinner');

    // Canvas y contextos
    const imageCanvas = document.getElementById('image-canvas');
    const maskCanvas = document.getElementById('mask-canvas');
    const previewCanvas = document.getElementById('preview-canvas');
    const imageCtx = imageCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    const previewCtx = previewCanvas.getContext('2d');

    // --- Estado de la aplicación ---
    let currentTool = 'pan'; // Herramienta por defecto es "Mover"
    let isPainting = false;
    let originalImageFile = null;
    let startPos = { x: 0, y: 0 };
    const overlayColor = 'rgba(200, 200, 200, 0.6)';

    // 1. Cargar imagen y crear la capa de superposición
    imageInput.addEventListener('change', (e) => {
        // console.log("Paso 2: 'change' de imageInput disparado.");
        originalImageFile = e.target.files[0];
        if (!originalImageFile) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            // console.log("Paso 3: FileReader 'onload' disparado.");
            const img = new Image();
            img.onload = () => {
                // console.log("Paso 4: Imagen 'onload' disparada. Dimensiones:", img.width, "x", img.height);
                
                // Configurar TODOS los canvas
                [imageCanvas, maskCanvas, previewCanvas].forEach(canvas => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                });
                
                // Calcular y asignar altura (la lógica vital del script de debug)
                const aspectRatio = img.height / img.width;
                const containerWidth = canvasContainer.clientWidth;
                canvasContainer.style.height = `${containerWidth * aspectRatio}px`;
                // console.log("Paso 5: Altura del contenedor asignada:", canvasContainer.style.height);

                // Dibujar la imagen base
                imageCtx.drawImage(img, 0, 0);
                
                // Dibujar la capa de superposición
                maskCtx.fillStyle = overlayColor;
                maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
                
                editorArea.classList.remove('hidden');
                // console.log("Paso 6: Editor visible.");
            };
            img.onerror = () => {
                console.error("ERROR CRÍTICO: La imagen no se pudo cargar.");
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(originalImageFile);
    });

    // 2. Lógica de selección de herramientas Y LIMPIEZA
    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            const toolName = button.id.split('-')[1]; // pan, brush, eraser, etc.

            if (toolName === 'clear') {
                maskCtx.fillStyle = overlayColor;
                maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
                return;
            }

            currentTool = toolName;

            if (currentTool === 'pan') {
                previewCanvas.style.cursor = 'grab';
            } else {
                previewCanvas.style.cursor = 'crosshair';
            }

            // Actualizar UI de los botones
            toolButtons.forEach(btn => {
                if (btn.id !== 'tool-clear') {
                    btn.classList.replace('btn-primary', 'btn-outline-primary');
                }
            });
            button.classList.replace('btn-outline-primary', 'btn-primary');
        });
    });

    // 3. Lógica de pintado (CON CONTROL DE SCROLL)
    
    // MEJORA: Función de coordenadas más robusta para TÁCTIL
    const getPaintPosition = (e) => {
        let event = e;
        // e.touches para touchstart/touchmove (cuando los dedos están en la pantalla)
        if (e.touches && e.touches.length > 0) {
            event = e.touches[0]; 
        // e.changedTouches para touchend (cuando el dedo se levanta)
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            event = e.changedTouches[0]; 
        }
        
        const rect = previewCanvas.getBoundingClientRect();
        const scaleX = previewCanvas.width / rect.width;
        const scaleY = previewCanvas.height / rect.height;
        
        // Comprobar si clientX/clientY existen antes de usarlos
        if (event.clientX === undefined) {
             console.warn("Evento sin coordenadas clientX/clientY:", event);
             return startPos; // Devuelve la última posición conocida si hay un error
        }
        
        return { 
            x: (event.clientX - rect.left) * scaleX, 
            y: (event.clientY - rect.top) * scaleY 
        };
    };

    const startPaint = (e) => {
        if (currentTool === 'pan') {
            isPainting = false;
            previewCanvas.style.cursor = 'grabbing';
            return;
        }

        isPainting = true;
        startPos = getPaintPosition(e);
        if (currentTool === 'brush' || currentTool === 'eraser') {
            maskCtx.beginPath();
            maskCtx.moveTo(startPos.x, startPos.y);
            paint(e); // Dibuja el primer punto
        }
    };

    const stopPaint = (e) => {
        if (currentTool === 'pan') {
            previewCanvas.style.cursor = 'grab';
        }
        
        if (!isPainting) return;
        isPainting = false;
        
        // CORRECCIÓN TÁCTIL: Usar la función mejorada para obtener la posición final
        const endPos = getPaintPosition(e); 
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

        if (currentTool === 'rect' || currentTool === 'circle') {
            maskCtx.globalCompositeOperation = 'destination-out';
            maskCtx.fillStyle = 'white';
            if (currentTool === 'rect') {
                maskCtx.fillRect(startPos.x, startPos.y, endPos.x - startPos.x, endPos.y - startPos.y);
            } else {
                const radius = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2));
                maskCtx.beginPath();
                maskCtx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
                maskCtx.fill();
            }
            maskCtx.globalCompositeOperation = 'source-over';
        }
        
        maskCtx.beginPath(); // Finaliza el trazo actual del pincel/borrador
    };

    const paint = (e) => {
        if (!isPainting) return;
        
        // Prevenir el scroll SOLO si estamos pintando (no en modo "Mover")
        e.preventDefault(); 
        
        const currentPos = getPaintPosition(e);

        // MEJORA: Lógica de pincel/borrador refactorizada
        if (currentTool === 'brush' || currentTool === 'eraser') {
            maskCtx.lineCap = 'round';
            maskCtx.lineJoin = 'round';
            maskCtx.lineWidth = brushSizeSlider.value;
            
            maskCtx.globalCompositeOperation = (currentTool === 'brush') ? 'destination-out' : 'source-over';
            maskCtx.strokeStyle = (currentTool === 'brush') ? 'white' : overlayColor;
            
            maskCtx.lineTo(currentPos.x, currentPos.y);
            maskCtx.stroke();

        } else { // Vista previa para Rectángulo y Círculo
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            previewCtx.strokeStyle = 'rgba(50, 50, 50, 0.8)';
            previewCtx.lineWidth = 2;
            if (currentTool === 'rect') {
                previewCtx.strokeRect(startPos.x, startPos.y, currentPos.x - startPos.x, currentPos.y - startPos.y);
            } else {
                const radius = Math.sqrt(Math.pow(currentPos.x - startPos.x, 2) + Math.pow(currentPos.y - startPos.y, 2));
                previewCtx.beginPath();
                previewCtx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
                previewCtx.stroke();
            }
        }
    };

    // Eventos de Mouse
    previewCanvas.addEventListener('mousedown', startPaint);
    previewCanvas.addEventListener('mouseup', stopPaint);
    previewCanvas.addEventListener('mouseout', stopPaint);
    previewCanvas.addEventListener('mousemove', paint);

    // Eventos Táctiles (Touch)
    previewCanvas.addEventListener('touchstart', startPaint, { passive: false });
    previewCanvas.addEventListener('touchend', stopPaint);
    previewCanvas.addEventListener('touchcancel', stopPaint);
    previewCanvas.addEventListener('touchmove', paint, { passive: false });

    // 4. Enviar formulario (sin cambios)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!originalImageFile) {
            alert('Por favor, selecciona una imagen.'); return;
        }
        buttonText.textContent = 'Procesando...';
        spinner.classList.remove('d-none');
        submitButton.disabled = true;

        maskCanvas.toBlob(async (maskBlob) => {
            const formData = new FormData();
            formData.append('archivo_imagen', originalImageFile);
            formData.append('archivo_mascara', maskBlob, 'mask.png');
            try {
                const response = await fetch('/remover-con-pincel/', { method: 'POST', body: formData });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Error del servidor');
                }
                const imageBlob = await response.blob();
                const imageUrl = URL.createObjectURL(imageBlob);
                resultImage.src = imageUrl;
                downloadLink.href = imageUrl;
                resultArea.classList.remove('hidden');
            } catch (error) {
                console.error('Error al procesar la imagen:', error);
                alert(`Ocurrió un error: ${error.message}`);
            } finally {
                buttonText.textContent = 'Eliminar Fondo';
                spinner.classList.add('d-none');
                submitButton.disabled = false;
            }
        }, 'image/png');
    });
});