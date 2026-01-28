import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Hearthstone.css';

const HearthstoneMiniGame = () => {
    const navigate = useNavigate();
    const gameRef = useRef(null);

    useEffect(() => {
        // === ДАННЫЕ ===
        const HEROES = [
            { id: 1, name: 'Король Лич', emoji: '👑', power: 'Оживление', health: 40 },
            { id: 2, name: 'Миллифисент', emoji: '🦁', power: 'Усиление мехов', health: 40 },
            { id: 3, name: 'Тесс', emoji: '🗡️', power: 'Копирование', health: 40 },
            { id: 4, name: 'Галакронд', emoji: '🐉', power: 'Сила драконов', health: 40 },
            { id: 5, name: 'Рагнарос', emoji: '🔥', power: 'Огненный взрыв', health: 40 },
            { id: 6, name: 'Финли', emoji: '🐟', power: 'Перестановка', health: 45 },
        ];

        const SPELLS = [
            { id: 'spell_banana', name: 'Банан', cost: 1, type: 'Заклинание', desc: 'Дает существу +2/+2', emoji: '🍌' }
        ];

        const MINION_POOL = {
            1: [
                { name: 'Драконёнок', tier: 1, attack: 2, health: 1, emoji: '🐉', type: 'Дракон', desc: 'Боевой клич: +1 Атаки всем драконам' },
                { name: 'Алли-кот', tier: 1, attack: 1, health: 1, emoji: '😺', type: 'Зверь', desc: 'При призыве: +1/+1' },
                { name: 'Микробот', tier: 1, attack: 1, health: 1, emoji: '🤖', type: 'Механизм', desc: 'Предсмертный хрип: призывает бота' },
                { name: 'Вульпера', tier: 1, attack: 1, health: 3, emoji: '🦊', type: 'Зверь', desc: 'В конце хода: +1 Атаки' },
                { name: 'Красный змей', tier: 1, attack: 2, health: 2, emoji: '🐍', type: 'Зверь', desc: 'Яд: смертельный урон' },
                { name: 'Приливень', tier: 1, attack: 2, health: 1, emoji: '🌊', type: 'Мурлок', desc: '+1 Здоровья мурлокам' },
                { name: 'Гоблин', tier: 1, attack: 1, health: 2, emoji: '👺', type: 'Зверь', desc: 'Провокация' },
            ],
            2: [
                { name: 'Жнец душ', tier: 2, attack: 3, health: 3, emoji: '💀', type: 'Демон', desc: 'После атаки: +1/+1' },
                { name: 'Метеор', tier: 2, attack: 1, health: 4, emoji: '☄️', type: 'Элементаль', desc: 'Провокация. 1 урон врагам' },
                { name: 'Крыса', tier: 2, attack: 2, health: 2, emoji: '🐀', type: 'Зверь', desc: 'Призывает зверя при смерти' },
                { name: 'Сталкер', tier: 2, attack: 4, health: 4, emoji: '🕷️', type: 'Зверь', desc: 'Скрытность' },
                { name: 'Механоворон', tier: 2, attack: 2, health: 3, emoji: '🦅', type: 'Механизм', desc: 'При уроне: +2 Атаки' },
                { name: 'Мурлок-разведчик', tier: 2, attack: 3, health: 2, emoji: '🐠', type: 'Мурлок', desc: 'Открывает карту мурлока' },
            ],
            3: [
                { name: 'Гидра', tier: 3, attack: 4, health: 4, emoji: '🦎', type: 'Зверь', desc: 'При уроне: +2/+2' },
                { name: 'Бронедракон', tier: 3, attack: 3, health: 6, emoji: '🛡️', type: 'Дракон', desc: 'Провокация. Баф драконам' },
                { name: 'Механомедведь', tier: 3, attack: 5, health: 5, emoji: '🐻', type: 'Механизм', desc: 'Призывает бота 3/3' },
                { name: 'Огненный элементаль', tier: 3, attack: 6, health: 3, emoji: '🔥', type: 'Элементаль', desc: '3 урона случайному врагу' },
            ],
            4: [
                { name: 'Мехакенг', tier: 4, attack: 6, health: 6, emoji: '🦍', type: 'Механизм', desc: 'Баф механизмов' },
                { name: 'Охотник', tier: 4, attack: 7, health: 4, emoji: '🏹', type: 'Зверь', desc: 'Двойная атака' },
                { name: 'Призыватель бури', tier: 4, attack: 4, health: 8, emoji: '⚡', type: 'Элементаль', desc: '4 урона всем' },
            ],
            5: [
                { name: 'Золотой дракон', tier: 5, attack: 8, health: 8, emoji: '🐲', type: 'Дракон', desc: 'Божественный щит. Баф всем' },
                { name: 'Мега-Механикус', tier: 5, attack: 7, health: 9, emoji: '⚙️', type: 'Механизм', desc: 'Магнитный. Призывает бота' },
                { name: 'Властелин зверей', tier: 5, attack: 9, health: 7, emoji: '🦁', type: 'Зверь', desc: 'Призывает 2 зверей' },
            ],
            6: [
                { name: 'Древний дракон', tier: 6, attack: 10, health: 10, emoji: '🐉', type: 'Дракон', desc: 'Божественный щит. +3/+3 всем' },
                { name: 'Титан элементалей', tier: 6, attack: 12, health: 8, emoji: '💫', type: 'Элементаль', desc: 'Неуязвимость. Тройной урон' },
            ]
        };

        // === СОСТОЯНИЕ ===
        const gameState = {
            round: 1,
            timer: 60,
            timerInterval: null,
            timer: 60,
            timerInterval: null,
            draggedCard: null,
            dragSource: null,
            selectedCard: null, // For click-to-play on mobile
            selectedSource: null,

            player: {
                hero: null,
                health: 40,
                gold: 3,
                tavernTier: 1,
                hand: [],
                board: [],
                shop: [],
                frozenShop: false,
                upgradeCost: 5,
            },

            bots: [],
            currentOpponent: null,
        };

        // Helper to get element by ID safely
        const getEl = (id) => document.getElementById(id);

        // === ИНИЦИАЛИЗАЦИЯ ===
        function init() {
            showHeroSelect();
            setupEventListeners();
            setupTooltips();
        }

        function setupEventListeners() {
            // We use optional chaining or checks in case elements aren't ready, though useEffect guarantees mount
            getEl('refresh-btn')?.addEventListener('click', handleRefresh);
            getEl('freeze-btn')?.addEventListener('click', handleFreeze);
            getEl('upgrade-btn')?.addEventListener('click', handleUpgrade);
            getEl('start-battle-btn')?.addEventListener('click', handleStartBattle);

            const boardMinions = getEl('board-minions');
            if (boardMinions) {
                boardMinions.addEventListener('dragover', handleDragOver);
                boardMinions.addEventListener('drop', handleDrop);
                boardMinions.addEventListener('dragleave', handleDragLeave);
            }
        }

        function setupTooltips() {
            const tooltip = getEl('card-tooltip');
            if (!tooltip) return;

            const handleMouseMove = (e) => {
                if (!tooltip) return;
                tooltip.style.left = (e.clientX + 20) + 'px';
                tooltip.style.top = (e.clientY + 20) + 'px';
            };

            document.addEventListener('mousemove', handleMouseMove);

            // Store for cleanup
            gameState._cleanupMouseMove = () => document.removeEventListener('mousemove', handleMouseMove);
        }

        // === ВЫБОР ГЕРОЯ ===
        function showHeroSelect() {
            const container = getEl('heroes-container');
            if (!container) return;
            container.innerHTML = '';

            const shuffled = [...HEROES].sort(() => Math.random() - 0.5).slice(0, 4);

            shuffled.forEach(hero => {
                const card = document.createElement('div');
                card.className = 'hero-card';
                card.innerHTML = `
                <div class="hero-health">❤️${hero.health}</div>
                <div class="hero-portrait">${hero.emoji}</div>
                <div class="hero-name">${hero.name}</div>
                <div class="hero-power">${hero.power}</div>
            `;
                card.addEventListener('click', () => selectHero(hero));
                container.appendChild(card);
            });
        }

        function selectHero(hero) {
            gameState.player.hero = hero;
            gameState.player.health = hero.health;
            gameState.player.gold = 3;

            getEl('player-avatar').textContent = hero.emoji;
            getEl('player-name').textContent = hero.name;
            getEl('player-avatar').textContent = hero.emoji;
            getEl('player-name').textContent = hero.name;
            // Initial UI update clears textContent anyway, so rely on updateTavernUI except init checks


            createBots();
            switchPhase('tavern');
            startTavernPhase();
        }

        function createBots() {
            const botNames = ['Боб', 'Алекстраза', 'Иллидан', 'Джайна', 'Тралл'];
            const availableHeroes = HEROES.filter(h => h.id !== gameState.player.hero.id);

            gameState.bots = [];
            for (let i = 0; i < 5; i++) {
                const hero = availableHeroes[i % availableHeroes.length];
                gameState.bots.push({
                    name: botNames[i],
                    hero: hero,
                    health: hero.health,
                    tavernTier: 1,
                    board: [],
                    eliminated: false,
                    gold: 3,
                });
            }
        }

        function switchPhase(phase) {
            // Need to scope this better if possible, but document.querySelectorAll is fine for now
            document.querySelectorAll('.hearthstone-page .phase').forEach(p => p.classList.remove('active'));
            const phaseEl = getEl(`${phase}-phase`);
            if (phaseEl) phaseEl.classList.add('active');

            if (phase === 'tavern') {
                updateOpponentsPanel();
            }
        }

        // === ТАВЕРНА ===
        function startTavernPhase() {
            gameState.timer = 60;
            gameState.player.gold = Math.min(10, 3 + gameState.round);

            // Уменьшение стоимости апгрейда
            gameState.player.upgradeCost = Math.max(0, gameState.player.upgradeCost - 1);

            // Восстановление здоровья
            gameState.player.board.forEach(minion => {
                minion.health = minion.maxHealth;
            });

            if (!gameState.player.frozenShop) {
                refreshShop();
            }
            gameState.player.frozenShop = false;

            // ВЫБОР ОППОНЕНТА
            const available = gameState.bots.filter(b => !b.eliminated);
            if (available.length === 0 && gameState.round > 0) {
                endGame(true);
                return;
            }
            if (available.length > 0) {
                // Simple random for now, but ensure we fight someone alive
                gameState.currentOpponent = available[Math.floor(Math.random() * available.length)];
            }

            updateTavernUI();
            startTimer();
            botsRecruit();
        }

        function refreshShop() {
            const tier = gameState.player.tavernTier;
            let shopSize = 3 + (tier > 1 ? 1 : 0) + (tier > 3 ? 1 : 0);

            // Limit shop size to prevent overflow on mobile
            if (shopSize > 5) shopSize = 5;

            gameState.player.shop = [];

            // Add spell chance 
            const SPELL_CHANCE = 0.3; // 30% chance for a spell slot

            for (let i = 0; i < shopSize; i++) {
                if (i === 0 && Math.random() < SPELL_CHANCE) {
                    // Add spell
                    const spell = { ...SPELLS[0] }; // Only banana for now
                    spell.id = Math.random();
                    spell.isSpell = true;
                    gameState.player.shop.push(spell);
                    continue;
                }

                const pool = [];
                for (let t = 1; t <= tier; t++) {
                    if (MINION_POOL[t]) pool.push(...MINION_POOL[t]);
                }

                if (pool.length > 0) {
                    const minion = { ...pool[Math.floor(Math.random() * pool.length)] };
                    minion.id = Math.random();
                    minion.cost = 3;
                    minion.maxHealth = minion.health;
                    gameState.player.shop.push(minion);
                }
            }

            displayShop();
        }

        function displayShop() {
            const container = getEl('shop-minions');
            if (!container) return;
            container.innerHTML = '';

            gameState.player.shop.forEach(minion => {
                if (minion.sold) return;
                const card = createMinionCard(minion, 'shop');
                container.appendChild(card);
            });
        }

        function createMinionCard(minion, location) {
            const card = document.createElement('div');
            card.className = 'minion-card';
            if (minion.sold) card.classList.add('sold');
            if (location === 'shop' && gameState.player.gold < minion.cost) {
                card.classList.add('disabled');
            }
            if (location === 'hand') card.classList.add('hand-card');
            if (location === 'board') card.classList.add('board-minion');
            if (location === 'battle') card.classList.add('battle-minion');

            // Золотая карта
            if (minion.isGolden) {
                card.style.border = '4px solid #ffd700';
                card.style.boxShadow = '0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.4)';
                card.style.background = 'linear-gradient(135deg, #4a3517, #3d2810)';
            }

            card.innerHTML = `
            <div class="minion-tier">${minion.tier}</div>
            <div class="minion-cost">${minion.cost || 0}🪙</div>
            <div class="minion-image">${minion.emoji}</div>
            <div class="minion-name">${minion.name}</div>
            <div class="minion-description">${minion.desc || ''}</div>
            if (!minion.isSpell) {
               card.innerHTML += `
                < div class="minion-stats" >
                    <div class="minion-attack">${minion.attack}</div>
                    <div class="minion-health">${minion.health}</div>
                </div > `;
            }

            card.addEventListener('mouseenter', () => showTooltip(minion));
            card.addEventListener('mouseleave', hideTooltip);
            
            // CLICK TO PLAY HANDLER (Mobile Friendliness)
            card.addEventListener('click', (e) => {
                if (location === 'shop') {
                     // Select shop item
                     if (minion.sold) return;
                     if (gameState.selectedCard && gameState.selectedCard.id === minion.id) {
                         // Deselect
                         gameState.selectedCard = null;
                         gameState.selectedSource = null;
                         document.querySelectorAll('.minion-card').forEach(c => c.classList.remove('selected'));
                     } else {
                         // Select
                         gameState.selectedCard = minion;
                         gameState.selectedSource = 'shop';
                         document.querySelectorAll('.minion-card').forEach(c => c.classList.remove('selected'));
                         card.classList.add('selected');
                         // Auto-buy if user taps twice or logic differs? No, select then tap board.
                     }
                } else if (location === 'hand') {
                     if (gameState.selectedCard && gameState.selectedCard.id === minion.id) {
                         gameState.selectedCard = null;
                         gameState.selectedSource = null;
                         document.querySelectorAll('.minion-card').forEach(c => c.classList.remove('selected'));
                     } else {
                         gameState.selectedCard = minion;
                         gameState.selectedSource = 'hand';
                         document.querySelectorAll('.minion-card').forEach(c => c.classList.remove('selected'));
                         card.classList.add('selected');
                     }
                } else if (location === 'board') {
                    // If we have a spell selected, apply it
                    if (gameState.selectedCard && gameState.selectedCard.isSpell && gameState.selectedSource === 'shop') {
                        buyAndCastSpell(gameState.selectedCard, minion);
                        return;
                    }
                }
            });

            if (location === 'shop' || location === 'hand') {
                card.draggable = true;
                card.addEventListener('dragstart', (e) => handleDragStart(e, minion, location));
                card.addEventListener('dragend', handleDragEnd);
            }

            if (location === 'board') {
                const removeBtn = document.createElement('div');
                removeBtn.className = 'remove-btn';
                removeBtn.textContent = '✕';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sellMinion(minion);
                });
                card.appendChild(removeBtn);
            }

            return card;
        }

        function buyAndCastSpell(spell, targetMinion) {
             if (gameState.player.gold < spell.cost) {
                 alert('Недостаточно золота!');
                 return;
             }
             
             // Effect
             if (spell.id.includes('banana')) {
                 targetMinion.attack += 2;
                 targetMinion.health += 2;
                 targetMinion.maxHealth += 2;
             }
             
             gameState.player.gold -= spell.cost;
             spell.sold = true;
             
             // Deselect
             gameState.selectedCard = null;
             gameState.selectedSource = null;
             document.querySelectorAll('.minion-card').forEach(c => c.classList.remove('selected'));
             
             updateTavernUI();
        }

        function showTooltip(minion) {
            const tooltip = getEl('card-tooltip');
            if (!tooltip) return;
            getEl('tooltip-title').textContent = minion.name;
            getEl('tooltip-type').textContent = `${ minion.type } • Уровень ${ minion.tier } `;
            getEl('tooltip-description').textContent = minion.desc || 'Обычный миньон';
            tooltip.classList.add('show');
        }

        function hideTooltip() {
            const t = getEl('card-tooltip');
            if (t) t.classList.remove('show');
        }

        function sellMinion(minion) {
            gameState.player.board = gameState.player.board.filter(m => m.boardId !== minion.boardId);
            gameState.player.gold += 1;
            updateTavernUI();
        }

        // DRAG & DROP
        function handleDragStart(e, minion, source) {
            gameState.draggedCard = minion;
            gameState.dragSource = source;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        }

        function handleDragEnd(e) {
            e.target.classList.remove('dragging');
        }

        function handleDragOver(e) {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
        }

        function handleDragLeave(e) {
            e.currentTarget.classList.remove('drag-over');
        }

        function handleDrop(e) {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');

            if (!gameState.draggedCard) return;

            const minion = gameState.draggedCard;
            const source = gameState.dragSource;

            if (gameState.player.board.length >= 7) {
                alert('Доска полна!');
                gameState.draggedCard = null;
                gameState.dragSource = null;
                return;
            }

            if (source === 'shop') {
                if (gameState.player.gold < minion.cost) {
                    alert('Недостаточно золота!');
                    gameState.draggedCard = null;
                    gameState.dragSource = null;
                    return;
                }

                gameState.player.gold -= minion.cost;
                minion.sold = true;

                const boardMinion = { ...minion, boardId: Math.random() };
                gameState.player.board.push(boardMinion);

                checkForTriple(boardMinion);
            }
            else if (source === 'hand') {
                gameState.player.hand = gameState.player.hand.filter(m => m.id !== minion.id);

                const boardMinion = { ...minion, boardId: Math.random() };
                gameState.player.board.push(boardMinion);

                checkForTriple(boardMinion);
            }

            gameState.draggedCard = null;
            gameState.dragSource = null;
            updateTavernUI();
        }

        // ТРИПЛЕТЫ
        function checkForTriple(minion) {
            const sameCards = gameState.player.board.filter(m =>
                m.name === minion.name && m.tier === minion.tier && !m.isGolden
            );

            if (sameCards.length >= 3) {
                let removed = 0;
                gameState.player.board = gameState.player.board.filter(m => {
                    if (m.name === minion.name && m.tier === minion.tier && !m.isGolden && removed < 3) {
                        removed++;
                        return false;
                    }
                    return true;
                });

                const goldenMinion = {
                    ...minion,
                    boardId: Math.random(),
                    attack: minion.attack * 2,
                    health: minion.health * 2,
                    maxHealth: minion.maxHealth * 2,
                    isGolden: true,
                    name: '⭐ ' + minion.name
                };

                gameState.player.board.push(goldenMinion);
                showTripleNotification(minion.name);
                discoverCard(minion.tier + 1);
            }
        }

        function discoverCard(tier) {
            if (tier > 6) tier = 6;
            if (gameState.player.hand.length >= 10) return;

            const pool = MINION_POOL[tier] || [];
            if (pool.length === 0) return;

            const discovered = { ...pool[Math.floor(Math.random() * pool.length)] };
            discovered.id = Math.random();
            discovered.cost = 0;
            discovered.maxHealth = discovered.health;

            gameState.player.hand.push(discovered);
            updateTavernUI();
        }

        function showTripleNotification(minionName) {
            const notification = document.createElement('div');
            notification.style.cssText = `
position: fixed;
top: 50 %;
left: 50 %;
transform: translate(-50 %, -50 %);
background: linear - gradient(135deg, #ffd700, #ffa500);
border: 6px solid #ff8c00;
border - radius: 25px;
padding: 40px 60px;
font - family: 'Cinzel', serif;
font - size: 36px;
font - weight: 900;
color: #1a0e08;
z - index: 10001;
text - align: center;
box - shadow: 0 25px 80px rgba(255, 215, 0, 1), inset 0 2px 0 rgba(255, 255, 255, 0.5);
animation: triplePopup 2s ease - out forwards;
`;
            notification.innerHTML = `
    < div style = "font-size: 56px; margin-bottom: 15px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));" >⭐✨⭐</div >
            <div style="text-shadow: 0 2px 4px rgba(255,255,255,0.5);">ЗОЛОТОЙ ТРИПЛЕТ!</div>
            <div style="font-size: 22px; margin-top: 12px; color: #3d2810;">${minionName}</div>
`;

            document.body.appendChild(notification);

            // Cleanup notification after animation
            setTimeout(() => {
                notification.remove();
            }, 2000);
        }

        function updateTavernUI() {
            if (!getEl('footer-player-health')) return; // Check if mounted

            getEl('footer-player-health').textContent = gameState.player.health;
            getEl('footer-player-gold').textContent = gameState.player.gold;
            getEl('footer-tavern-tier').textContent = gameState.player.tavernTier;
            
            getEl('shop-tier').textContent = gameState.player.tavernTier;
            getEl('round-number').textContent = gameState.round;
            getEl('upgrade-cost').textContent = gameState.player.upgradeCost;

            const handContainer = getEl('hand-cards');
            if (handContainer) {
                handContainer.innerHTML = '';
                gameState.player.hand.forEach(minion => {
                    handContainer.appendChild(createMinionCard(minion, 'hand'));
                });
                getEl('hand-count').textContent = gameState.player.hand.length;
            }

            const boardContainer = getEl('board-minions');
            if (boardContainer) {
                boardContainer.innerHTML = '';
                gameState.player.board.forEach(minion => {
                    boardContainer.appendChild(createMinionCard(minion, 'board'));
                });
                for (let i = gameState.player.board.length; i < 7; i++) {
                    const slot = document.createElement('div');
                    slot.className = 'board-slot';
                    slot.textContent = '+';
                    slot.addEventListener('click', () => handleSlotClick());
                    // Drag logic already on container
                    boardContainer.appendChild(slot);
                }
                getEl('board-count').textContent = gameState.player.board.length;
            }

            getEl('refresh-btn')?.classList.toggle('disabled', gameState.player.gold < 1);
            getEl('upgrade-btn')?.classList.toggle('disabled',
                gameState.player.gold < gameState.player.upgradeCost || gameState.player.tavernTier >= 6);
            getEl('freeze-btn')?.classList.toggle('frozen', gameState.player.frozenShop);

            displayShop();
            updateOpponentsPanel();
        }

        function updateOpponentsPanel() {
            const container = getEl('opponents-list');
            if (!container) return;
            container.innerHTML = '';

            // Render bots
            gameState.bots.forEach(bot => {
                const el = document.createElement('div');
                el.className = `opponent - item ${ bot.eliminated ? 'eliminated' : '' } ${ gameState.round > 0 && gameState.currentOpponent?.name === bot.name ? 'next-opponent' : '' } `;
                el.innerHTML = `
    < div class="opponent-avatar" > ${ bot.eliminated ? '💀' : '👤' }</div >
                    <div class="opponent-hp-bar">
                        <div class="opponent-hp-fill" style="width: ${(bot.health / 40) * 100}%"></div>
                    </div>
                    <div class="opponent-health">${bot.health}</div>
                    ${ !bot.eliminated ? `<div class="opponent-tier">⭐${bot.tavernTier}</div>` : '' }
`;
                // Tooltip logic can be added here
                container.appendChild(el);
            });
        }

        function handleRefresh() {
            if (gameState.player.gold >= 1) {
                gameState.player.gold -= 1;
                refreshShop();
                updateTavernUI();
            }
        }

        function handleFreeze() {
            gameState.player.frozenShop = !gameState.player.frozenShop;
            updateTavernUI();
        }

        function handleUpgrade() {
            const cost = gameState.player.upgradeCost;
            if (gameState.player.gold >= cost && gameState.player.tavernTier < 6) {
                gameState.player.gold -= cost;
                gameState.player.tavernTier++;
                updateTavernUI();
            }
        }

        function handleSlotClick() {
             if (!gameState.selectedCard) return;
             
             const minion = gameState.selectedCard;
             const source = gameState.selectedSource;
             
             if (minion.isSpell) {
                 alert('Заклинание нужно применять на существо!');
                 return;
             }

             // Logic same as drop
             if (gameState.player.board.length >= 7) {
                alert('Доска полна!');
                return;
            }

            if (source === 'shop') {
                if (gameState.player.gold < minion.cost) {
                    alert('Недостаточно золота!');
                    return;
                }

                gameState.player.gold -= minion.cost;
                minion.sold = true;

                const boardMinion = { ...minion, boardId: Math.random() };
                gameState.player.board.push(boardMinion);

                checkForTriple(boardMinion);
            }
            else if (source === 'hand') {
                gameState.player.hand = gameState.player.hand.filter(m => m.id !== minion.id);

                const boardMinion = { ...minion, boardId: Math.random() };
                gameState.player.board.push(boardMinion);

                checkForTriple(boardMinion);
            }

            gameState.selectedCard = null;
            gameState.selectedSource = null;
            updateTavernUI();
        }

        function handleStartBattle() {
            clearInterval(gameState.timerInterval);
            startBattle();
        }

        function startTimer() {
            clearInterval(gameState.timerInterval);
            const maxTime = 60;

            const circle = getEl('timer-circle');
            const circumference = 2 * Math.PI * 45; // r=45

            if (circle) {
                circle.style.strokeDasharray = `${ circumference } ${ circumference } `;
                circle.style.strokeDashoffset = 0;
                circle.style.stroke = '#ffd700';
            }

            gameState.timerInterval = setInterval(() => {
                if (!getEl('timer')) {
                    clearInterval(gameState.timerInterval);
                    return;
                }
                gameState.timer--;
                getEl('timer').textContent = gameState.timer;

                // Update SVG circle
                if (circle) {
                    const offset = circumference - (gameState.timer / maxTime) * circumference;
                    circle.style.strokeDashoffset = offset;

                    if (gameState.timer <= 10) {
                        circle.style.stroke = '#ff5252';
                        // Add pulsing effect via class?
                    }
                }

                if (gameState.timer <= 0) {
                    clearInterval(gameState.timerInterval);
                    startBattle();
                }
            }, 1000);
        }

        // === БОЙ ===
        // === БОЙ ===
        function startBattle() {
            if (!gameState.currentOpponent) {
                // Fallback if something went wrong
                const available = gameState.bots.filter(b => !b.eliminated);
                if (available.length === 0) {
                    endGame(true);
                    return;
                }
                gameState.currentOpponent = available[Math.floor(Math.random() * available.length)];
            }

            // Check if game is over (all eliminated)
            const available = gameState.bots.filter(b => !b.eliminated);
            if (available.length === 0 && !gameState.currentOpponent) { // If undefined and no bots
                endGame(true);
                return;
            }

            switchPhase('battle');

            getEl('vs-info').textContent =
                `${ gameState.player.hero.name } VS ${ gameState.currentOpponent.name } `;

            setTimeout(() => simulateBattle(), 1000);
        }

        function simulateBattle() {
            const playerBoard = gameState.player.board.map(m => ({ ...m }));
            const enemyBoard = gameState.currentOpponent.board.map(m => ({ ...m }));

            const playerContainer = getEl('player-battle-board');
            const enemyContainer = getEl('enemy-battle-board');

            if (!playerContainer || !enemyContainer) return;

            playerContainer.innerHTML = '';
            enemyContainer.innerHTML = '';

            const playerCards = [];
            const enemyCards = [];

            playerBoard.forEach(minion => {
                const card = createMinionCard(minion, 'battle');
                playerContainer.appendChild(card);
                playerCards.push({ minion, element: card });
            });

            enemyBoard.forEach(minion => {
                const card = createMinionCard(minion, 'battle');
                enemyContainer.appendChild(card);
                enemyCards.push({ minion, element: card });
            });

            let turn = 0;
            const maxTurns = 30;

            // We use a local variable for interval to avoid collisions
            const battleInterval = setInterval(() => {
                // Safety check in case component unmounted
                if (!getEl('battle-phase')) {
                    clearInterval(battleInterval);
                    return;
                }

                if (playerBoard.length === 0 || enemyBoard.length === 0 || turn >= maxTurns) {
                    clearInterval(battleInterval);
                    setTimeout(() => resolveBattle(playerBoard, enemyBoard), 1000);
                    return;
                }

                if (playerBoard.length > 0 && enemyBoard.length > 0) {
                    const attacker = playerBoard[0];
                    const defender = enemyBoard[0];

                    const attackerCard = playerCards.find(c => c.minion.id === attacker.id);
                    const defenderCard = enemyCards.find(c => c.minion.id === defender.id);

                    if (attackerCard) {
                        attackerCard.element.classList.add('attacking');
                        setTimeout(() => attackerCard.element.classList.remove('attacking'), 700);
                    }

                    if (defenderCard) {
                        const rect = defenderCard.element.getBoundingClientRect();
                        createAttackEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);

                        defenderCard.element.classList.add('hit');
                        setTimeout(() => defenderCard.element.classList.remove('hit'), 500);
                    }

                    defender.health -= attacker.attack;
                    attacker.health -= defender.attack;

                    setTimeout(() => {
                        if (defender.health <= 0) {
                            if (defenderCard) {
                                defenderCard.element.classList.add('dying');
                                setTimeout(() => {
                                    enemyBoard.shift();
                                    const index = enemyCards.indexOf(defenderCard);
                                    if (index > -1) enemyCards.splice(index, 1);
                                    defenderCard.element.remove();
                                }, 1000);
                            }
                        } else {
                            updateCardStats(defenderCard.element, defender);
                        }

                        if (attacker.health <= 0) {
                            if (attackerCard) {
                                attackerCard.element.classList.add('dying');
                                setTimeout(() => {
                                    playerBoard.shift();
                                    const index = playerCards.indexOf(attackerCard);
                                    if (index > -1) playerCards.splice(index, 1);
                                    attackerCard.element.remove();
                                }, 1000);
                            }
                        } else {
                            updateCardStats(attackerCard.element, attacker);
                        }
                    }, 600);
                }

                turn++;
            }, 2200);
        }

        function createAttackEffect(x, y) {
            const effect = document.createElement('div');
            effect.className = 'attack-effect';
            effect.style.left = (x - 50) + 'px';
            effect.style.top = (y - 50) + 'px';
            document.body.appendChild(effect);
            setTimeout(() => effect.remove(), 700);
        }

        function updateCardStats(cardElement, minion) {
            if (!cardElement) return;
            const healthEl = cardElement.querySelector('.minion-health');
            if (healthEl) healthEl.textContent = minion.health;
        }

        function resolveBattle(playerBoard, enemyBoard) {
            let damage = 0;

            if (playerBoard.length === 0 && enemyBoard.length > 0) {
                damage = gameState.player.tavernTier + enemyBoard.length;
                gameState.player.health -= damage;
                showBattleResult(false, damage);
            } else if (enemyBoard.length === 0 && playerBoard.length > 0) {
                damage = gameState.currentOpponent.tavernTier + playerBoard.length;
                gameState.currentOpponent.health -= damage;
                if (gameState.currentOpponent.health <= 0) {
                    gameState.currentOpponent.eliminated = true;
                }
                showBattleResult(true, damage);
            } else {
                showBattleResult(null, 0);
            }
        }

        function showBattleResult(won, damage) {
            const modal = document.createElement('div');
            modal.className = 'modal';

            let title = won === null ? 'Ничья!' : (won ? 'Победа!' : 'Поражение');
            let text = won === null ? 'Никто не получил урона' :
                (won ? `Вы нанесли ${ damage } урона` : `Вы получили ${ damage } урона`);

            modal.innerHTML = `
    < div class="modal-content" >
                <h2 class="modal-title">${title}</h2>
                <p class="modal-text">${text}</p>
                <button class="modal-button" id="continue-btn">Продолжить</button>
            </div >
    `;

            document.body.appendChild(modal);

            const btn = modal.querySelector('#continue-btn');
            if (btn) {
                btn.addEventListener('click', () => {
                    modal.remove();
                    if (gameState.player.health <= 0) {
                        endGame(false);
                    } else if (gameState.bots.filter(b => !b.eliminated).length === 0) {
                        endGame(true);
                    } else {
                        nextRound();
                    }
                });
            }
        }

        function nextRound() {
            gameState.round++;

            // УЛУЧШЕННАЯ ПРОГРЕССИЯ БОТОВ
            gameState.bots.forEach(bot => {
                if (bot.eliminated) return;

                // Золото для ботов
                bot.gold = Math.min(10, 3 + gameState.round);

                // Умная прогрессия тиров (не каждый 2-й ход, а плавно)
                if (gameState.round === 3) bot.tavernTier = 2;
                if (gameState.round === 5) bot.tavernTier = 3;
                if (gameState.round === 7) bot.tavernTier = 4;
                if (gameState.round === 9) bot.tavernTier = 5;
                if (gameState.round === 11) bot.tavernTier = 6;
            });

            switchPhase('tavern');
            startTavernPhase();
        }

        function botsRecruit() {
            gameState.bots.forEach(bot => {
                if (bot.eliminated) return;
                bot.board = [];

                // СБАЛАНСИРОВАННЫЙ РАЗМЕР ДОСКИ
                let boardSize = 3;
                if (gameState.round >= 3) boardSize = 4;
                if (gameState.round >= 5) boardSize = 5;
                if (gameState.round >= 7) boardSize = 6;
                if (gameState.round >= 9) boardSize = 7;

                for (let i = 0; i < boardSize; i++) {
                    const tier = Math.min(bot.tavernTier, 6);
                    const pool = [];

                    for (let t = 1; t <= tier; t++) {
                        if (MINION_POOL[t]) pool.push(...MINION_POOL[t]);
                    }

                    if (pool.length > 0) {
                        const minion = { ...pool[Math.floor(Math.random() * pool.length)] };
                        minion.id = Math.random();

                        let boost = 0;
                        if (gameState.round >= 3) boost = 1;
                        if (gameState.round >= 6) boost = 2;
                        if (gameState.round >= 9) boost = 3;

                        minion.attack += boost;
                        minion.health += boost;
                        minion.maxHealth = minion.health;
                        bot.board.push(minion);
                    }
                }
            });
        }

        function endGame(won) {
            clearInterval(gameState.timerInterval);
            const modal = document.createElement('div');
            modal.className = 'modal';

            const content = won ? `
    < div class="modal-content" >
                <h2 class="modal-title">🏆 ПОБЕДА! 🏆</h2>
                <p class="modal-text">Вы заняли 1 место!</p>
                <p class="modal-text">Раундов: ${gameState.round}</p>
                <button class="modal-button" id="restart-btn">Новая игра</button>
            </div >
    ` : `
    < div class="modal-content" >
                <h2 class="modal-title">Игра окончена</h2>
                <p class="modal-text">Место: ${gameState.bots.filter(b => !b.eliminated).length + 1}</p>
                <p class="modal-text">Раундов: ${gameState.round}</p>
                <button class="modal-button" id="restart-btn">Новая игра</button>
            </div >
    `;

            modal.innerHTML = content;
            document.body.appendChild(modal);

            modal.querySelector('#restart-btn').addEventListener('click', () => {
                modal.remove();
                // Just reload the page or re-init. Re-init is safer to keep SPA feel.
                // Reset state
                init();
            });
        }

        // Start game
        init();

        // Cleanup
        return () => {
            clearInterval(gameState.timerInterval);
            if (gameState._cleanupMouseMove) gameState._cleanupMouseMove();
            // Remove any modals or effects attached to body
            document.querySelectorAll('.modal, .attack-effect, .card-tooltip').forEach(el => el.remove());
        };

    }, []); // Run once on mount

    return (
        <div className="hearthstone-page" ref={gameRef}>
            <button className="hearthstone-exit-btn" onClick={() => navigate('/')}>
                Выйти в меню
            </button>

            {/* Тултип (will be moved by JS) */}
            <div className="card-tooltip" id="card-tooltip">
                <div className="tooltip-title" id="tooltip-title"></div>
                <div className="tooltip-type" id="tooltip-type"></div>
                <div className="tooltip-description" id="tooltip-description"></div>
            </div>

            {/* ВЫБОР ГЕРОЯ */}
            <div className="phase hero-select-phase active" id="hero-select-phase">
                <h1 className="hero-select-title">Выберите героя</h1>
                <div className="heroes-container" id="heroes-container"></div>
            </div>

            {/* ТАВЕРНА */}
            <div className="phase tavern-phase" id="tavern-phase">

                {/* ЛЕВАЯ ПАНЕЛЬ - ОППОНЕНТЫ */}
                <div className="hs-sidebar-left">
                    <div className="opponents-list" id="opponents-list">
                        {/* Filled by JS */}
                    </div>
                </div>

                {/* ЦЕНТРАЛЬНАЯ ПАНЕЛЬ - ИГРА */}
                <div className="tavern-main-area">
                    {/* ВЕРХНЯЯ ИНФО ПАНЕЛЬ: Только лицо и Боб */}
                    <div className="top-info-bar">
                         <div className="hero-stats">
                            <div className="hero-avatar small" id="player-avatar">🧙</div>
                             <div className="hero-info-col">
                                <div className="hero-name-display" id="player-name">Игрок</div>
                            </div>
                        </div>
                        <div className="tavern-controls-top">
                            <div className="bob-face">👨🏻‍🦰</div>
                            <div className="bob-speech">
                                <div className="shop-title">Таверна (Ур. <span id="shop-tier">1</span>)</div>
                                <div className="reroll-cost">Обновить: 1🪙</div>
                            </div>
                        </div>
                    </div>

                    {/* МАГАЗИН */}
                    <div className="shop-zone">
                        <div className="shop-minions" id="shop-minions"></div>
                    </div>

                    {/* СРЕДНЯЯ ЛИНИЯ - УПРАВЛЕНИЕ МАГАЗИНОМ */}
                    <div className="mid-controls">
                        <button className="hs-btn refresh-btn" id="refresh-btn">🔄</button>
                        <button className="hs-btn freeze-btn" id="freeze-btn">❄️</button>
                        <button className="hs-btn upgrade-btn" id="upgrade-btn">
                            <span className="upgrade-icon">⬆️</span>
                            <span className="upgrade-val" id="upgrade-cost">5</span>
                        </button>
                    </div>

                    {/* ДОСКА ИГРОКА */}
                    <div className="player-board-zone">
                        <div className="zone-label board-label">Стол (<span id="board-count">0</span>/7)</div>
                        <div className="board-minions" id="board-minions"></div>
                    </div>

                    {/* РУКА */}
                    <div className="hand-zone">
                        <div className="zone-label hand-label">Рука (<span id="hand-count">0</span>/10)</div>
                        <div className="hand-cards" id="hand-cards"></div>
                    </div>
                </div>

                {/* ПРАВАЯ ПАНЕЛЬ - ДЕЙСТВИЯ */}
                <div className="hs-sidebar-right">
                    <div className="round-display">Раунд <span id="round-number">1</span></div>
                    <div className="turn-timer-container">
                        <svg className="timer-svg" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" stroke="#333" strokeWidth="5" fill="none" />
                            <circle cx="50" cy="50" r="45" stroke="#ffd700" strokeWidth="5" fill="none" strokeDasharray="283" strokeDashoffset="0" id="timer-circle" />
                        </svg>
                        <div className="timer-value" id="timer">60</div>
                    </div>

                    <button className="end-turn-btn" id="start-battle-btn">
                        <div className="btn-text">В БОЙ</div>
                    </button>
                    
                    {/* PLAYER STATS FOOTER */}
                    <div className="player-stats-footer">
                        <div className="hero-details">
                            <div className="health-badge">❤️ <span id="footer-player-health">40</span></div>
                            <div className="gold-badge">🪙 <span id="footer-player-gold">3</span></div>
                            <div className="tier-badge">⭐ <span id="footer-tavern-tier">1</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* БОЙ */}
            <div className="phase battle-phase" id="battle-phase">
                <div className="battle-header">
                    <h2 className="battle-title">⚔️ БОЙ! ⚔️</h2>
                    <div id="vs-info" style={{ marginTop: '12px', fontSize: '22px', color: '#ccc' }}></div>
                </div>

                <div className="battle-main">
                    <div className="battle-side enemy-side" id="enemy-battle-board"></div>
                    <div className="battle-side player-side" id="player-battle-board"></div>
                </div>
            </div>
        </div>
    );
};

export default HearthstoneMiniGame;
