
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// --- Script to handle Shopify product page interaction ---
const LOOK_BUILDER_STORAGE_KEY = 'lui-bambini-look-builder';

type ClothingPiece = 'top' | 'bottom' | 'shoes' | 'combined';

interface Look {
  top: string | null;
  bottom: string | null;
  shoes: string | null;
  combined: string | null;
}

function getLookFromStorage(): Look {
  const saved = localStorage.getItem(LOOK_BUILDER_STORAGE_KEY);
  return saved ? JSON.parse(saved) : { top: null, bottom: null, shoes: null, combined: null };
}

function saveLookToStorage(look: Look) {
  localStorage.setItem(LOOK_BUILDER_STORAGE_KEY, JSON.stringify(look));
  // Dispatch a storage event so usePersistentState hook in React updates
  window.dispatchEvent(new Event('storage'));
}

function updateButtonsState() {
  const look = getLookFromStorage();
  const buttons = document.querySelectorAll('.add-to-look-btn');
  
  const selectedTypes: ClothingPiece[] = [];
  if (look.top) selectedTypes.push('top');
  if (look.bottom) selectedTypes.push('bottom');
  if (look.shoes) selectedTypes.push('shoes');
  if (look.combined) selectedTypes.push('combined');

  buttons.forEach(btnEl => {
    const button = btnEl as HTMLButtonElement;
    const { productType, productImage } = button.dataset;
    const type = productType as ClothingPiece;
    
    if (!type) return;

    const isSelected = look[type] === productImage;

    if (isSelected) {
      button.textContent = 'Adicionado ✔';
      button.classList.add('added');
      button.disabled = false;
    } else {
      button.textContent = 'Adicionar ao Look';
      button.classList.remove('added');
      // Disable if another item of the same type is already selected
      const isTypeSelected = selectedTypes.includes(type);
      const isCombinedSelected = !!look.combined;
      const isSeparateSelected = !!look.top || !!look.bottom || !!look.shoes;
      
      // Complex disable logic
      if (type === 'combined') {
        button.disabled = isSeparateSelected;
      } else if (['top', 'bottom', 'shoes'].includes(type)) {
        button.disabled = isCombinedSelected || isTypeSelected;
      } else {
         button.disabled = isTypeSelected;
      }
    }
  });
}

function handleButtonClick(event: MouseEvent) {
  const button = event.currentTarget as HTMLButtonElement;
  const { productType, productImage } = button.dataset;

  if (!productType || !productImage) return;

  const type = productType as ClothingPiece;
  const currentLook = getLookFromStorage();
  
  // If this item is already selected, remove it. Otherwise, add it.
  if (currentLook[type] === productImage) {
    currentLook[type] = null;
  } else {
    // Clear conflicting types
    if (type === 'combined') {
        currentLook.top = null;
        currentLook.bottom = null;
        currentLook.shoes = null;
    } else {
        currentLook.combined = null;
    }
    currentLook[type] = productImage;
  }
  
  saveLookToStorage(currentLook);
  updateButtonsState();
}

// --- Main script execution ---

function initializeLookBuilder() {
    const buttons = document.querySelectorAll('.add-to-look-btn');
    buttons.forEach(button => {
      button.addEventListener('click', handleButtonClick);
    });

    // Listen for changes from the React app (e.g., user removes image in modal)
    window.addEventListener('storage', updateButtonsState);

    // Set initial state on load
    updateButtonsState();
}

// Wait for the full page to load before trying to find the buttons
document.addEventListener('DOMContentLoaded', initializeLookBuilder);
