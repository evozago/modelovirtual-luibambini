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

/**
 * Debounce function to limit the rate at which a function gets called.
 * This is crucial for performance when observing DOM mutations.
 */
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
  
    const debounced = (...args: Parameters<F>) => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => func(...args), waitFor);
    };
  
    return debounced as (...args: Parameters<F>) => void;
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
      
      const isTypeSelected = selectedTypes.includes(type);
      const isCombinedSelected = !!look.combined;
      const isSeparateSelected = !!look.top || !!look.bottom || !!look.shoes;
      
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

const debouncedUpdateButtonsState = debounce(updateButtonsState, 50);

function handleDelegatedButtonClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>('.add-to-look-btn');

  if (!button) {
    return;
  }
  
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const { productType, productImage } = button.dataset;

  if (!productType || !productImage) return;

  const type = productType as ClothingPiece;
  const currentLook = getLookFromStorage();
  
  if (currentLook[type] === productImage) {
    currentLook[type] = null;
  } else {
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
  debouncedUpdateButtonsState();
}

// --- Main script execution ---

function initializeLookBuilder() {
    window.addEventListener('click', handleDelegatedButtonClick, true);
    
    window.addEventListener('storage', debouncedUpdateButtonsState);

    // Use a MutationObserver to detect when new buttons are added to the page
    // by the Shopify theme (e.g., when changing product variants). This ensures
    // the button states are always correct.
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                 const hasRelevantNode = Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === Node.ELEMENT_NODE &&
                    ((node as Element).matches('.add-to-look-btn') || (node as Element).querySelector('.add-to-look-btn'))
                );

                if (hasRelevantNode) {
                    debouncedUpdateButtonsState();
                    break; 
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Set initial state on load
    updateButtonsState();
}

initializeLookBuilder();