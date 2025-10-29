
// Este é o script que roda na sua loja online.
// Ele é responsável por toda a interatividade dos botões "Adicionar ao Look".

(() => {
  const STORAGE_KEY = 'lui-bambini-look-builder';

  // Tipos de peças de roupa
  const clothingPieces = ['top', 'bottom', 'shoes', 'combined'];

  function getLook() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const look = saved ? JSON.parse(saved) : {};
      // Garante que a estrutura base exista
      return { top: null, bottom: null, shoes: null, combined: null, ...look };
    } catch (e) {
      console.error('[LookBuilder] Erro ao ler o look do localStorage:', e);
      return { top: null, bottom: null, shoes: null, combined: null };
    }
  }

  function saveLook(look) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(look));
      // Dispara um evento para que o painel do app (se aberto) possa reagir.
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    } catch (e) {
      console.error('[LookBuilder] Erro ao salvar o look no localStorage:', e);
    }
  }

  function updateAllButtons() {
    const look = getLook();
    const buttons = document.querySelectorAll('.add-to-look-btn');

    const hasTop = !!look.top;
    const hasBottom = !!look.bottom;
    const hasShoes = !!look.shoes;
    const hasCombined = !!look.combined;
    const hasSeparatePieces = hasTop || hasBottom || hasShoes;

    buttons.forEach(button => {
      const type = button.dataset.productType;
      const image = button.dataset.productImage;
      if (!type || !image) return;

      const isThisButtonSelected = look[type] === image;

      if (isThisButtonSelected) {
        button.textContent = 'Adicionado ✔';
        button.classList.add('added');
        button.style.backgroundColor = '#16a34a'; // Verde
        button.disabled = false; // Sempre permitir desmarcar
      } else {
        button.textContent = 'Adicionar ao Look';
        button.classList.remove('added');
        button.style.backgroundColor = '#4f46e5'; // Cor original

        let isDisabled = false;
        if (type === 'combined') {
          isDisabled = hasSeparatePieces;
        } else if (['top', 'bottom', 'shoes'].includes(type)) {
          isDisabled = hasCombined || !!look[type];
        }
        
        button.disabled = isDisabled;
        if (isDisabled) {
            button.style.backgroundColor = '#d1d5db'; // Cinza para desabilitado
        }
      }
    });
  }

  function handleClick(event) {
    const button = event.target.closest('.add-to-look-btn');
    if (!button) return;

    // Impede que outros scripts interfiram
    event.preventDefault();
    event.stopPropagation();

    const type = button.dataset.productType;
    const image = button.dataset.productImage;
    if (!type || !image) return;

    const currentLook = getLook();
    const isCurrentlySelected = currentLook[type] === image;

    if (isCurrentlySelected) {
      currentLook[type] = null;
    } else {
      if (type === 'combined') {
        currentLook.top = null;
        currentLook.bottom = null;
        currentLook.shoes = null;
      } else {
        currentLook.combined = null;
      }
      currentLook[type] = image;
    }

    saveLook(currentLook);
    updateAllButtons();
  }

  function initialize() {
    console.log('[LookBuilder] Script da loja inicializado.');
    // Usamos 'mousedown' na fase de captura para garantir que sejamos os primeiros a responder.
    document.body.addEventListener('mousedown', handleClick, true);

    // Observador para lidar com atualizações dinâmicas do tema (troca de variantes, etc.)
    const observer = new MutationObserver(() => {
        // Um simples debounce para evitar múltiplas execuções
        clearTimeout(observer.timeout);
        observer.timeout = setTimeout(updateAllButtons, 50);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    updateAllButtons();
  }

  // Garante que o script rode apenas quando o DOM estiver pronto.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
