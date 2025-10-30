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

export const combineImages = async (...files: File[]): Promise<{ combinedImageBase64: string, mimeType: string }> => {
  return new Promise(async (resolve, reject) => {
    if (files.length === 0) {
      return reject(new Error('Nenhum arquivo fornecido para combinar.'));
    }

    // If only one file, just convert it and return
    if (files.length === 1) {
      const file = files[0];
      try {
        const base64 = await fileToBase64(file);
        return resolve({ combinedImageBase64: base64, mimeType: file.type });
      } catch (error) {
        return reject(error);
      }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Não foi possível obter o contexto do canvas.'));

    const images = files.map(file => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
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
          
          const dataUrl = canvas.toDataURL('image/png');
          resolve({
            combinedImageBase64: dataUrl.split(',')[1],
            mimeType: 'image/png'
          });
        }
      };
      img.onerror = (err) => reject(new Error(`Erro ao carregar a imagem: ${img.src}`));
    });
  });
};