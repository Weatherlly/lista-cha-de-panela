// Configuração inicial
lucide.createIcons();

// Constantes
const API_BASE_URL = 'http://18.212.217.221:5000';

// Utilidades
const Utils = {
    showLoading: (element) => {
        element.innerHTML = '<div class="loading">Carregando...</div>';
    },

    showError: (element, message) => {
        element.innerHTML = `<div class="error">${message}</div>`;
    },

    isValidName: (name) => {
        return name && name.trim().length >= 2 && name.trim().length <= 50;
    }
};

// Gerenciamento de Estado
const StateManager = {
    getGuestName: () => {
        return sessionStorage.getItem('currentGuest') || localStorage.getItem('currentGuest');
    },

    setGuestName: (name) => {
        sessionStorage.setItem('currentGuest', name);
        localStorage.setItem('currentGuest', name);
    },

    clearGuestName: () => {
        sessionStorage.removeItem('currentGuest');
        localStorage.removeItem('currentGuest');
    }
};

// API Service
const ApiService = {
    get: async (endpoint) => {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    },

    post: async (endpoint, data) => {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }
};

// Página Inicial
const HomePage = {
    init: () => {
        const nameForm = document.getElementById('nameForm');
        if (!nameForm) return;

        nameForm.addEventListener('submit', HomePage.handleFormSubmit);

        // Preencher com nome salvo se existir
        const savedName = StateManager.getGuestName();
        if (savedName) {
            document.getElementById('guestName').value = savedName;
        }
    },

    handleFormSubmit: (e) => {
        e.preventDefault();
        const guestName = document.getElementById('guestName').value.trim();

        if (!Utils.isValidName(guestName)) {
            alert('Por favor, digite um nome válido (2-50 caracteres).');
            return;
        }

        StateManager.setGuestName(guestName);
        window.location.href = 'lista.html';
    }
};

// Página de Lista
const ListPage = {
    init: () => {
        const guestName = StateManager.getGuestName();

        if (!guestName) {
            window.location.href = 'index.html';
            return;
        }

        // Atualizar nome na interface
        const guestNameElement = document.getElementById('currentGuestName');
        if (guestNameElement) {
            guestNameElement.textContent = guestName;
        }

        // Configurar eventos
        const saveButton = document.getElementById('saveButton');
        if (saveButton) {
            saveButton.addEventListener('click', ListPage.handleSaveSelections);
        }

        // Carregar presentes
        ListPage.loadGifts();
    },

    loadGifts: async () => {
        try {
            const presentes = await ApiService.get('/api/presentes');
            ListPage.renderGifts(presentes);
            ListPage.updateCounters(presentes);
        } catch (error) {
            console.error('Erro ao carregar presentes:', error);
            alert('Erro ao carregar a lista de presentes. Tente novamente.');
        }
    },

    renderGifts: (presentes) => {
        const categories = {
            kitchenGifts: presentes.filter(p => p.categoria === 'cozinha'),
            laundryGifts: presentes.filter(p => p.categoria === 'lavanderia'),
            bedroomGifts: presentes.filter(p => p.categoria === 'quarto'),
            utilsGifts: presentes.filter(p => p.categoria === 'utilidades domésticas')
        };

        for (const [containerId, gifts] of Object.entries(categories)) {
            const container = document.getElementById(containerId);
            if (!container) continue;

            container.innerHTML = '';

            gifts.forEach((gift) => {
                const giftElement = ListPage.createGiftElement(gift);
                container.innerHTML += giftElement;
            });
        }

        // Configurar os event listeners após renderizar
        setTimeout(() => {
            ListPage.setupGiftEventListeners();
        }, 100);
    },

    createGiftElement: (gift) => {
        const guestName = StateManager.getGuestName();
        const isReservedByMe = gift.reservadoPor === guestName;
        const isReservedByOther = gift.reservado && !isReservedByMe && gift.permiteMultiplos !== true;

        let statusClass = '';
        if (isReservedByMe) statusClass = 'reserved-by-me';
        else if (isReservedByOther) statusClass = 'reserved-by-other';
        else if (gift.reservado) statusClass = 'reserved';

        // Determinar classes com base no status
        let containerClass = "flex items-center gap-3 py-2 hover:bg-white/60 rounded-lg px-2 transition-all duration-200";
        let textClass = "text-dark-brown hover:text-marsala transition-colors cursor-pointer flex-1 text-left text-sm";
        let checkboxClass = "w-5 h-5 border-2 border-marsala rounded flex items-center justify-center hover:border-golden transition-colors cursor-pointer";

        if (isReservedByMe) {
            containerClass += " bg-golden/10 border border-golden";
            checkboxClass += " bg-marsala border-marsala";
        } else if (isReservedByOther || statusClass === 'reserved') {
            containerClass += " bg-gray-100 opacity-75";
            checkboxClass += " opacity-50 cursor-not-allowed";
            textClass += " cursor-not-allowed";
        }

        return `
        <div class="${containerClass} gift-container" data-id="${gift.id}">
            <div class="${checkboxClass} gift-checkbox" data-gift-id="${gift.id}">
                ${isReservedByMe ? `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check w-3 h-3 text-white">
                        <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                ` : ''}
            </div>
            <span class="${textClass} gift-name" data-gift-id="${gift.id}">
                ${gift.nome}
                ${gift.preco ? `<span class="text-xs opacity-75 ml-2">${gift.preco}</span>` : ''}
            </span>
            ${gift.colorOptions && gift.colorOptions.length > 0 ? `
                <select class="gift-color w-24 px-2 py-1 border border-golden/30 rounded-lg focus:border-golden focus:outline-none text-sm ${isReservedByMe ? '' : 'hidden'}" data-gift-id="${gift.id}">
                    <option value="">Selecione a cor</option>
                    ${gift.colorOptions.map(color => `<option value="${color}">${color}</option>`).join("")}
                </select>
            ` : ''}
            ${`
    <button class="remove-gift text-marsala hover:text-golden ${isReservedByMe ? '' : 'hidden'}" data-gift-id="${gift.id}">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
             viewBox="0 0 24 24" fill="none" stroke="currentColor" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
             class="lucide lucide-x">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
        </svg>
    </button>
`}
            <div class="gift-status text-xs font-medium ml-2 ${isReservedByMe ? 'text-marsala' : isReservedByOther ? 'text-blue-600' : gift.reservado ? 'text-gray-500' : 'text-green-600'}">
                ${isReservedByMe ? '✅ Reservado por você' :
                isReservedByOther ? `Reservado por ${gift.reservadoPor}` :
                    gift.reservado ? 'Reservado' : 'Disponível'}
            </div>
        </div>
    `;
    },
    setupGiftEventListeners: () => {
        document.querySelectorAll('.gift-checkbox').forEach(checkbox => {
            const giftId = checkbox.getAttribute('data-gift-id');
            const giftContainer = checkbox.closest('.gift-container');
            const statusDiv = giftContainer.querySelector('.gift-status');

            checkbox.addEventListener('click', () => {
                if (statusDiv.textContent.includes('você')) {
                    // Já estava reservado por mim → remover
                    ListPage.handleGiftRemoval(giftId);
                } else if (!statusDiv.textContent.includes('Reservado')) {
                    // Estava disponível → reservar
                    ListPage.handleGiftSelection(giftId);
                }
            });
        });

        // Mesma lógica para os nomes
        document.querySelectorAll('.gift-name').forEach(nameElement => {
            const giftId = nameElement.getAttribute('data-gift-id');
            const giftContainer = nameElement.closest('.gift-container');
            const statusDiv = giftContainer.querySelector('.gift-status');

            nameElement.addEventListener('click', () => {
                if (statusDiv.textContent.includes('você')) {
                    ListPage.handleGiftRemoval(giftId);
                } else if (!statusDiv.textContent.includes('Reservado')) {
                    ListPage.handleGiftSelection(giftId);
                }
            });
        });

        // Event listeners para os botões de remover
        document.querySelectorAll('.remove-gift').forEach(button => {
            const giftId = button.getAttribute('data-gift-id');
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                ListPage.handleGiftRemoval(giftId);
            });
        });
    },


    updateCounters: (presentes) => {
        const guestName = StateManager.getGuestName();

        const available = presentes.filter(p => !p.reservado).length;
        const reserved = presentes.filter(p => p.reservadoPor === guestName).length;
        const confirmed = presentes.filter(p => p.reservadoPor === guestName && p.confirmado).length;

        document.getElementById('availableCount').textContent = available;
        document.getElementById('reservedCount').textContent = reserved;
        document.getElementById('confirmedCount').textContent = confirmed;
    },

    handleGiftSelection: async (giftId) => {
        const guestName = StateManager.getGuestName();

        try {
            const result = await ApiService.post('/api/reservar', {
                idPresente: giftId,
                nomeUsuario: guestName
            });

            if (result.success) {
                // Feedback visual imediato SEM recarregar a página toda
                const giftContainer = document.querySelector(`.gift-container[data-id="${giftId}"]`);
                if (giftContainer) {
                    const checkbox = giftContainer.querySelector('.gift-checkbox');
                    const statusDiv = giftContainer.querySelector('.gift-status');
                    const giftName = giftContainer.querySelector('.gift-name');

                    // Atualizar visualmente
                    checkbox.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check w-3 h-3 text-white">
                        <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                `;
                    checkbox.classList.add('bg-marsala', 'border-marsala');
                    checkbox.classList.remove('hover:border-golden');

                    statusDiv.textContent = '✅ Reservado por você';
                    statusDiv.className = 'gift-status text-xs font-medium ml-2 text-marsala';

                    giftName.classList.remove('hover:text-marsala', 'cursor-pointer');
                    giftName.classList.add('cursor-not-allowed');

                    // Mostrar seletor de cor se existir
                    const colorSelect = giftContainer.querySelector('.gift-color');
                    if (colorSelect) {
                        colorSelect.classList.remove('hidden');
                    }

                    // Mostrar botão de remover
                    const removeBtn = giftContainer.querySelector('.remove-gift');
                    if (removeBtn) {
                        removeBtn.classList.remove('hidden');
                    }

                    // Atualizar contadores sem recarregar tudo
                    ListPage.updateCountersAfterReservation();
                }
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert('Erro ao reservar presente. Tente novamente.');
        }
    },
    // Adicionar esta função para atualizar contadores
    updateCountersAfterReservation: async () => {
        try {
            const presentes = await ApiService.get('/api/presentes');
            ListPage.updateCounters(presentes);
        } catch (error) {
            console.error('Erro ao atualizar contadores:', error);
        }
    },
    handleGiftRemoval: async (giftId) => {
        const guestName = StateManager.getGuestName();

        if (confirm('Tem certeza que deseja cancelar a reserva deste presente?')) {
            try {
                const result = await ApiService.post('/api/cancelar-reserva', {
                    nomeUsuario: guestName,
                    presenteId: giftId // Adicionar o ID do presente
                });

                if (result.success) {
                    // Feedback visual imediato
                    const giftContainer = document.querySelector(`.gift-container[data-id="${giftId}"]`);
                    if (giftContainer) {
                        const checkbox = giftContainer.querySelector('.gift-checkbox');
                        const statusDiv = giftContainer.querySelector('.gift-status');
                        const giftName = giftContainer.querySelector('.gift-name');

                        // Restaurar visualmente
                        checkbox.innerHTML = '';
                        checkbox.classList.remove('bg-marsala', 'border-marsala');
                        checkbox.classList.add('hover:border-golden');

                        statusDiv.textContent = 'Disponível';
                        statusDiv.className = 'gift-status text-xs font-medium ml-2 text-green-600';

                        giftName.classList.add('hover:text-marsala', 'cursor-pointer');
                        giftName.classList.remove('cursor-not-allowed');

                        // Esconder seletor de cor
                        const colorSelect = giftContainer.querySelector('.gift-color');
                        if (colorSelect) {
                            colorSelect.classList.add('hidden');
                        }

                        // Esconder botão de remover
                        const removeBtn = giftContainer.querySelector('.remove-gift');
                        if (removeBtn) {
                            removeBtn.classList.add('hidden');
                        }

                        // Atualizar contadores
                        ListPage.updateCountersAfterReservation();
                    }
                } else {
                    alert(result.message);
                }
            } catch (error) {
                alert('Erro ao cancelar reserva. Tente novamente.');
            }
        }
    },
    handleSaveSelections: () => {
        alert('Suas escolhas foram salvas com sucesso!');
        // Aqui você pode implementar lógica adicional se necessário
    }
};

// Inicialização da página apropriada
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('nameForm')) {
        HomePage.init();
    } else if (document.getElementById('currentGuestName')) {
        ListPage.init();
    }
});
