
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { XIcon } from './Icons';

interface ImageEditorProps {
  image: string;
  onSubmit: (maskBase64: string, prompt: string) => void;
  onCancel: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ image, onSubmit, onCancel }) => {
  const [prompt, setPrompt] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getCanvasCoordinates = (event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in event ? event.touches[0] : null;
    const clientX = touch ? touch.clientX : (event as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (event as React.MouseEvent).clientY;
    
    // Adjust coordinates to be relative to the canvas's intrinsic size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = useCallback((event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const coords = getCanvasCoordinates(event);
    if (coords) {
      isDrawing.current = true;
      lastPos.current = coords;
    }
  }, []);

  const draw = useCallback((event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!isDrawing.current) return;
    const coords = getCanvasCoordinates(event);
    const ctx = maskCanvasRef.current?.getContext('2d');
    if (coords && ctx && lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastPos.current = coords;
    }
  }, []);

  const stopDrawing = useCallback((event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image;
    img.onload = () => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (canvas && maskCanvas) {
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        const width = 512;
        const height = width / aspectRatio;
        
        canvas.width = width;
        canvas.height = height;
        maskCanvas.width = width;
        maskCanvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
            maskCtx.strokeStyle = 'rgba(236, 72, 153, 0.7)'; // Hot pink for visibility
            maskCtx.lineWidth = 25;
            maskCtx.lineCap = 'round';
            maskCtx.lineJoin = 'round';
        }
      }
    };
  }, [image]);
  
  const handleSubmit = () => {
    if (!prompt.trim() || !maskCanvasRef.current) return;

    const finalMaskCanvas = document.createElement('canvas');
    finalMaskCanvas.width = maskCanvasRef.current.width;
    finalMaskCanvas.height = maskCanvasRef.current.height;
    const finalMaskCtx = finalMaskCanvas.getContext('2d');

    if (finalMaskCtx) {
      finalMaskCtx.fillStyle = 'white';
      finalMaskCtx.fillRect(0, 0, finalMaskCanvas.width, finalMaskCanvas.height);
      
      const tempMask = document.createElement('canvas');
      tempMask.width = maskCanvasRef.current.width;
      tempMask.height = maskCanvasRef.current.height;
      const tempCtx = tempMask.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(maskCanvasRef.current, 0, 0);
        tempCtx.globalCompositeOperation = 'source-in';
        tempCtx.fillStyle = 'black';
        tempCtx.fillRect(0, 0, tempMask.width, tempMask.height);
        finalMaskCtx.drawImage(tempMask, 0, 0);
      }
    }
    
    const maskBase64 = finalMaskCanvas.toDataURL('image/png').split(',')[1];
    onSubmit(maskBase64, prompt);
  };
  
  return (
    <div className="flex flex-col h-full animate-fade-in">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Edição Inteligente</h2>
            <button onClick={onCancel} className="p-1 rounded-full hover:bg-gray-200" aria-label="Cancelar edição">
                <XIcon className="w-5 h-5 text-gray-600" />
            </button>
        </div>
        <div 
          className="relative w-full aspect-auto mb-4 cursor-crosshair touch-none"
          style={{ height: canvasRef.current?.height ? `${canvasRef.current.getBoundingClientRect().height}px` : 'auto'}}
        >
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full rounded-lg bg-gray-100" />
            <canvas 
              ref={maskCanvasRef} 
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
        </div>
        <p className="text-sm text-gray-500 mb-2">Use o mouse para marcar a área que deseja alterar na imagem.</p>
        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: adicione um laço de fita no cabelo"
            className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:ring-indigo-500 focus:border-indigo-500"
            rows={2}
        />
        <button
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            className="w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
            Corrigir Imagem com IA
        </button>
    </div>
  );
};
