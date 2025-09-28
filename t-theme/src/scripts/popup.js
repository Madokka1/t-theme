class PopupCloseButtonMover {
    constructor() {
        this.observer = null;
        this.checkInterval = null;
        this.movedButtons = new Set(); // Для отслеживания уже перемещенных кнопок
        this.init();
    }

    init() {
        this.startObserver();
        this.startIntervalCheck();
        this.checkOnLoad();
    }

    // Основная функция перемещения
    moveCloseButton() {
        const closeButtons = document.querySelectorAll('.tu-popup-close:not([data-moved])');
        const popupContent = document.querySelector('.tu-popup-content.tu-popup-content-scale');

        if (closeButtons.length > 0 && popupContent) {
            closeButtons.forEach(button => {
                // Проверяем, не перемещена ли уже эта кнопка
                if (!popupContent.contains(button)) {
                    // Сохраняем оригинальные стили
                    const originalStyles = {
                        position: button.style.position,
                        top: button.style.top,
                        right: button.style.right
                    };

                    // Перемещаем кнопку
                    popupContent.appendChild(button);

                    // Настраиваем стили для правильного позиционирования
                    button.style.position = 'absolute';
                    button.style.top = '10px';
                    button.style.right = '10px';
                    button.style.zIndex = '1000';

                    // Помечаем как перемещенную
                    button.setAttribute('data-moved', 'true');
                    this.movedButtons.add(button);

                    console.log('Кнопка закрытия перемещена в попап');
                }
            });
        }
    }

    // Наблюдатель за DOM
    startObserver() {
        this.observer = new MutationObserver((mutations) => {
            let shouldCheck = false;

            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            // Проверяем, относится ли узел к попапу
                            if (this.isPopupRelated(node)) {
                                shouldCheck = true;
                            }
                        }
                    });
                }
            });

            if (shouldCheck) {
                setTimeout(() => this.moveCloseButton(), 50);
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Интервальная проверка на случай, если наблюдатель пропустит изменения
    startIntervalCheck() {
        this.checkInterval = setInterval(() => {
            this.moveCloseButton();
        }, 1000);
    }

    // Проверка при загрузке
    checkOnLoad() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.moveCloseButton(), 2000);
            });
        } else {
            setTimeout(() => this.moveCloseButton(), 1000);
        }
    }

    // Проверка, относится ли элемент к попапу
    isPopupRelated(element) {
        if (element.classList) {
            return Array.from(element.classList).some(className =>
                className.includes('tu-popup') ||
                className.includes('popup')
            );
        }
        return false;
    }

    // Остановка наблюдения
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

// Инициализация
const popupMover = new PopupCloseButtonMover();

// Для использования в расширении Chrome
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PopupCloseButtonMover;
}

// --- Добавление крестика в .tstore__editbox и закрытие попапа ---
class EditboxCloseInjector {
    constructor() {
        this.observer = null;
        this.init();
    }

    init() {
        this.injectForExisting();
        this.observeDom();
    }

    injectForExisting() {
        document.querySelectorAll('.tstore__editbox').forEach((editbox) => {
            this.ensureCloseButton(editbox);
        });
    }

    observeDom() {
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.matches && node.matches('.tstore__editbox')) {
                        this.ensureCloseButton(node);
                    }
                    const boxes = node.querySelectorAll ? node.querySelectorAll('.tstore__editbox') : [];
                    boxes.forEach((box) => this.ensureCloseButton(box));
                }
            }
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    ensureCloseButton(editbox) {
        if (!editbox || editbox.querySelector('.tstore__editbox-close')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tstore__editbox-close';
        btn.setAttribute('aria-label', 'Закрыть');
        btn.innerHTML = '<span class="tstore__editbox-close-line"></span><span class="tstore__editbox-close-line"></span>';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closePopup(editbox);
        });
        editbox.appendChild(btn);
    }

    closePopup(editbox) {
        // 1) Пробуем кликнуть по стандартному оверлею
        const overlay = document.querySelector('.tstore__closelayer');
        if (overlay) {
            overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return;
        }

        // 2) Пробуем вызвать глобальную функцию закрытия, если она есть
        try {
            if (typeof window.tstore__editbox__close === 'function') {
                window.tstore__editbox__close();
                return;
            }
        } catch (e) {}

        // 3) Отправляем ESC
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, which: 27, bubbles: true }));

        // 4) Фолбэк: удаляем DOM-узел (крайняя мера)
        setTimeout(() => {
            if (editbox && editbox.parentNode) {
                editbox.parentNode.removeChild(editbox);
            }
        }, 100);
    }
}

new EditboxCloseInjector();

// --- Аккордеон для .pe-form-group:nth-child(8) (галерея) ---
class GalleryAccordion {
    constructor() {
        this.inited = false;
        this.init();
    }

    init() {
        // Попытка инициализации сразу и после небольших задержек,
        // т.к. DOM может заполняться динамически
        this.tryInit();
        document.addEventListener('DOMContentLoaded', () => this.tryInit());
        setTimeout(() => this.tryInit(), 300);
        setTimeout(() => this.tryInit(), 1000);

        // Также слушаем изменения DOM
        const observer = new MutationObserver(() => this.tryInit());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    tryInit() {
        if (this.inited) return;
        const group = document.querySelector('.tstore__editbox .pe-form-group:nth-child(8)');
        if (!group) return;

        const label = group.querySelector('.pe-label');
        if (!label) return;

        // Оборачиваем контент, кроме label, если ещё не обёрнут
        if (!group.querySelector('.pe-form-group-content')) {
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'pe-form-group-content';

            const children = Array.from(group.children).filter((child) => !child.classList.contains('pe-label'));
            children.forEach((el) => contentWrapper.appendChild(el));

            label.parentNode.insertBefore(contentWrapper, label.nextSibling);
        }

        // Стартовое состояние: открыто
        group.classList.add('tstore_group__wrapper_open');

        // Навешиваем обработчик клика по заголовку
        label.style.cursor = 'pointer';
        label.addEventListener('click', () => {
            group.classList.toggle('tstore_group__wrapper_open');
        }, { passive: true });

        this.inited = true;
    }
}

new GalleryAccordion();