
export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix e.g. "data:image/png;base64,"
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
  
export const urlToDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};


export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
};


export const combineImages = async (...dataUrls: string[]): Promise<{ combinedImageBase64: string, mimeType: string }> => {
  return new Promise(async (resolve, reject) => {
    if (dataUrls.length === 0) {
      return reject(new Error('Nenhuma URL de dados fornecida para combinar.'));
    }
    
    const mimeType = dataUrls[0].match(/data:(.*);/)?.[1] || 'image/png';

    // If only one file, just convert it and return
    if (dataUrls.length === 1) {
        const base64 = dataUrls[0].split(',')[1];
        return resolve({ combinedImageBase64: base64, mimeType });
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Não foi possível obter o contexto do canvas.'));

    const images = dataUrls.map(url => {
      const img = new Image();
      img.src = url;
      return img;
    });

    let loadedCount = 0;
    const totalImages = images.length;

    images.forEach(img => {
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          const gap = 20; // Gap between images
          const totalHeight = images.reduce((sum, i) => sum + i.height, 0) + (gap * (totalImages - 1));
          const maxWidth = Math.max(...images.map(i => i.width));

          canvas.width = maxWidth;
          canvas.height = totalHeight;

          let currentY = 0;
          images.forEach(loadedImg => {
            const x = (maxWidth - loadedImg.width) / 2; // Center horizontally
            ctx.drawImage(loadedImg, x, currentY);
            currentY += loadedImg.height + gap;
          });
          
          const finalDataUrl = canvas.toDataURL('image/png');
          resolve({
            combinedImageBase64: finalDataUrl.split(',')[1],
            mimeType: 'image/png'
          });
        }
      };
      img.onerror = (err) => reject(new Error(`Erro ao carregar a imagem: ${img.src}`));
    });
  });
};