document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias al DOM ---
    const form = document.getElementById('upload-form');
    const imageInput = document.getElementById('image-input');
    const editorArea = document.getElementById('editor-area');
    const brushSizeSlider = document.getElementById('brush-size');
    const canvasContainer = document.getElementById('canvas-container');
    const toolButtons = document.querySelectorAll('.tool-btn');
    const toolClearButton = document.getElementById('tool-clear');
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
    let currentTool = 'brush';
    let isPainting = false;
    let originalImageFile = null;
    let startPos = { x: 0, y: 0 };
    const overlayColor = 'rgba(90, 90, 90, 0.6)';

    // 1. Cargar imagen y crear la capa de superposición
    imageInput.addEventListener('change', (e) => {
        originalImageFile = e.target.files[0];
        if (!originalImageFile) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                [imageCanvas, maskCanvas, previewCanvas].forEach(canvas => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                });
                const aspectRatio = img.height / img.width;
                const containerWidth = canvasContainer.clientWidth;
                canvasContainer.style.height = `${containerWidth * aspectRatio}px`;
                imageCtx.drawImage(img, 0, 0);
                maskCtx.fillStyle = overlayColor;
                maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
                editorArea.classList.remove('hidden');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(originalImageFile);
    });

    // 2. Lógica de selección de herramientas
    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentTool = button.id.split('-')[1];
            toolButtons.forEach(btn => btn.classList.replace('btn-primary', 'btn-outline-primary'));
            button.classList.replace('btn-outline-primary', 'btn-primary');
        });
    });

    toolClearButton.addEventListener('click', () => {
        location.reload();
    });


    // 3. Lógica de pintado, borrado y dibujado (CORREGIDA)
    const getPaintPosition = (e) => {
        const event = e.touches ? e.touches[0] : e;
        const rect = previewCanvas.getBoundingClientRect();
        const scaleX = previewCanvas.width / rect.width;
        const scaleY = previewCanvas.height / rect.height;
        return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
    };

    const startPaint = (e) => {
        isPainting = true;
        startPos = getPaintPosition(e);
        // Para pincel y borrador, preparamos el trazo continuo
        if (currentTool === 'brush' || currentTool === 'eraser') {
            maskCtx.beginPath();
            maskCtx.moveTo(startPos.x, startPos.y);
            paint(e); // Dibuja el primer punto
        }
    };

    const stopPaint = (e) => {
        if (!isPainting) return;
        isPainting = false;
        const endPos = getPaintPosition(e);
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

        // Solo dibujamos la forma final para rectángulo y círculo al soltar el clic
        if (currentTool === 'rect' || currentTool === 'circle') {
            maskCtx.globalCompositeOperation = 'destination-out';
            maskCtx.fillStyle = 'white';
            if (currentTool === 'rect') {
                maskCtx.fillRect(startPos.x, startPos.y, endPos.x - startPos.x, endPos.y - startPos.y);
            } else { // circle
                const radius = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2));
                maskCtx.beginPath();
                maskCtx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
                maskCtx.fill();
            }
            maskCtx.globalCompositeOperation = 'source-over';
        }
    };

    const paint = (e) => {
        if (!isPainting) return;
        e.preventDefault();
        const currentPos = getPaintPosition(e);

        if (currentTool === 'brush' || currentTool === 'eraser') {
            maskCtx.lineCap = 'round';
            maskCtx.lineJoin = 'round';
            maskCtx.lineWidth = brushSizeSlider.value;
            
            // PINCEL: Borra la capa (destination-out)
            if (currentTool === 'brush') {
                maskCtx.globalCompositeOperation = 'destination-out';
                maskCtx.strokeStyle = 'white'; // El color no importa, solo la forma
            } 
            // BORRADOR: Restaura la capa (source-over)
            else {
                maskCtx.globalCompositeOperation = 'source-over';
                maskCtx.strokeStyle = overlayColor;
            }
            maskCtx.lineTo(currentPos.x, currentPos.y);
            maskCtx.stroke();

        } else { // Vista previa para Rectángulo y Círculo
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            previewCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            previewCtx.lineWidth = 2;
            if (currentTool === 'rect') {
                previewCtx.strokeRect(startPos.x, startPos.y, currentPos.x - startPos.x, currentPos.y - startPos.y);
            } else { // circle
                const radius = Math.sqrt(Math.pow(currentPos.x - startPos.x, 2) + Math.pow(currentPos.y - startPos.y, 2));
                previewCtx.beginPath();
                previewCtx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
                previewCtx.stroke();
            }
        }
    };

    previewCanvas.addEventListener('mousedown', startPaint);
    previewCanvas.addEventListener('mouseup', stopPaint);
    previewCanvas.addEventListener('mouseout', stopPaint);
    previewCanvas.addEventListener('mousemove', paint);

    // 4. Enviar formulario
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
// CÓDIGO DE DIAGNÓSTICO - NO BORRAR LOS #

document.addEventListener('DOMContentLoaded', () => {
    // console.log("Paso 1: El script se ha cargado correctamente.");

    // Referencias al DOM
    const form = document.getElementById('upload-form');
    const imageInput = document.getElementById('image-input');
    const editorArea = document.getElementById('editor-area');
    const canvasContainer = document.getElementById('canvas-container'); // Contenedor
    const imageCanvas = document.getElementById('image-canvas');

    if (!imageInput) console.error("ERROR CRÍTICO: No se encuentra el input de la imagen con id='image-input'");
    if (!canvasContainer) console.error("ERROR CRÍTICO: No se encuentra el div con id='canvas-container'");
    if (!imageCanvas) console.error("ERROR CRÍTICO: No se encuentra el canvas con id='image-canvas'");

    // 1. Cargar y mostrar la imagen
    imageInput.addEventListener('change', (e) => {
        // console.log("Paso 2: Se ha seleccionado un archivo. El evento 'change' se disparó.");
        
        const originalImageFile = e.target.files[0];
        if (!originalImageFile) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            // console.log("Paso 3: FileReader ha leído la imagen en memoria.");
            const img = new Image();
            img.onload = () => {
                // console.log("Paso 4: La imagen se ha decodificado y está lista para ser dibujada.");
                // console.log(" -> Dimensiones originales de la imagen:", img.width, "x", img.height);

                // Configurar resolución interna de los canvas
                imageCanvas.width = img.width;
                imageCanvas.height = img.height;
                // (El mask-canvas se configura igual, lo omitimos para simplificar la prueba)

                // Calcular y asignar altura al contenedor
                const aspectRatio = img.height / img.width;
                const containerWidth = canvasContainer.clientWidth;
                const containerHeight = containerWidth * aspectRatio;
                
                // console.log(" -> Ancho del contenedor (div):", containerWidth, "px");
                // console.log(" -> Altura CALCULADA para el contenedor:", containerHeight, "px");

                canvasContainer.style.height = `${containerHeight}px`;
                // console.log("Paso 5: Se ha asignado la altura al div contenedor. DEBERÍAS VER UN ESPACIO EN BLANCO AHORA.");

                // Dibujar la imagen
                const imageCtx = imageCanvas.getContext('2d');
                imageCtx.drawImage(img, 0, 0);
                // console.log("Paso 6: La imagen ha sido dibujada en el canvas. DEBERÍAS VER LA IMAGEN AHORA.");

                editorArea.classList.remove('hidden');
            };
            img.onerror = () => {
                console.error("ERROR CRÍTICO: La imagen no se pudo cargar. El archivo puede estar corrupto o no es una imagen válida.");
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(originalImageFile);
    });
});