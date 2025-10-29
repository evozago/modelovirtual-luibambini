// This file has two jobs:
// 1. Render the React App when on the main app page (which has an element with id="root").
// 2. Run a script on the Shopify store pages to make the "Add to Look" buttons work.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- Part 1: Shopify Store Interaction Script ---

const ShopifyLookBuilder = (() => {
  const STORAGE_KEY = 'lui-bambini-look-builder';

  type ClothingPiece = 'top' | 'bottom' | 'shoes' | 'combined';
  interface Look {
    top: string | null;
    bottom: string | null;
    shoes: string | null;
    combined: string | null;
  }

  function getLook(): Look {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { top: null, bottom: null, shoes: null, combined: null };
  }

  function saveLook(look: Look) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(look));
    // Dispatch a custom event that the React app's hook can listen to,
    // forcing it to update even though it's in the same tab.
    window.dispatchEvent(new Event('storage'));
  }

  function updateAllButtons() {
    const look = getLook();
    const buttons = document.querySelectorAll<HTMLButtonElement>('.add-to-look-btn');

    const hasTop = !!look.top;
    const hasBottom = !!look.bottom;
    const hasShoes = !!look.shoes;
    const hasCombined = !!look.combined;
    const hasSeparatePieces = hasTop || hasBottom || hasShoes;

    buttons.forEach(button => {
      const type = button.dataset.productType as ClothingPiece;
      const image = button.dataset.productImage;
      if (!type || !image) return;

      const isThisButtonSelected = look[type] === image;

      if (isThisButtonSelected) {
        button.textContent = 'Adicionado ✔';
        button.classList.add('added');
        button.disabled = false; // Always allow un-selecting
      } else {
        button.textContent = 'Adicionar ao Look';
        button.classList.remove('added');

        // Logic to disable buttons based on current selection
        let isDisabled = false;
        if (type === 'combined') {
          isDisabled = hasSeparatePieces; // Disable combined if any separate piece is selected
        } else if (['top', 'bottom', 'shoes'].includes(type)) {
          isDisabled = hasCombined || !!look[type]; // Disable if combined is selected, or if this type is already filled by another item
        }
        button.disabled = isDisabled;
      }
    });
  }

  const debouncedUpdate = (() => {
      let timeout: number;
      return () => {
          clearTimeout(timeout);
          timeout = window.setTimeout(updateAllButtons, 50);
      };
  })();

  function handleClick(event: MouseEvent) {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.add-to-look-btn');
    if (!button) return;

    // This is the most aggressive event stopping. It prevents any other script
    // on the page from interfering with our button.
    event.preventDefault();
    event.stopImmediatePropagation();

    const type = button.dataset.productType as ClothingPiece;
    const image = button.dataset.productImage;
    if (!type || !image) return;

    const currentLook = getLook();
    const isCurrentlySelected = currentLook[type] === image;

    if (isCurrentlySelected) {
      // If clicking an already added item, remove it.
      currentLook[type] = null;
    } else {
      // If adding a new item...
      if (type === 'combined') {
        // Clear all separate items when adding a combined look
        currentLook.top = null;
        currentLook.bottom = null;
        currentLook.shoes = null;
      } else {
        // Clear combined look when adding a separate piece
        currentLook.combined = null;
      }
      currentLook[type] = image; // Add the new piece
    }

    saveLook(currentLook);
    updateAllButtons(); // Update immediately on click
  }
  
  function run() {
    console.log('[LookBuilder] Initializing on page.');

    // Listen for clicks on the entire window during the "capture" phase.
    // This allows our script to be the first to react to a click.
    window.addEventListener('click', handleClick, true);
    
    // Also listen for our custom storage event to keep buttons in sync.
    window.addEventListener('storage', debouncedUpdate);

    // Watch for the theme dynamically adding/removing content (like changing variants)
    // and re-check our button states to keep them accurate.
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                 const hasRelevantNode = Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === Node.ELEMENT_NODE &&
                    ((node as Element).matches('.add-to-look-btn') || (node as Element).querySelector('.add-to-look-btn'))
                );
                if (hasRelevantNode) {
                    debouncedUpdate();
                    break;
                }
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Set the initial state for all buttons when the page loads.
    updateAllButtons();
  }

  function initialize() {
    // This script might run before the DOM is fully loaded.
    // We ensure we only start working once everything is ready.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }
  
  // Expose only the initialize function to the outside.
  return { initialize };
})();

// --- Part 2: Execution Logic ---

const rootElement = document.getElementById('root');

if (rootElement) {
  // We found a #root element, so this is our main app page (index.html).
  // Render the React application.
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // Also run the Shopify script on this page for the simulation to work.
  ShopifyLookBuilder.initialize();

} else if (window.self === window.top) {
  // There's no #root element, and we are not inside an iframe (like the theme editor).
  // This means we are on the live Shopify store.
  ShopifyLookBuilder.initialize();
}
