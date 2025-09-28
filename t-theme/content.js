// Content script загружен
(() => {
    try {
        const attrName = "data-tilda-ext";
        if (!document.documentElement.hasAttribute(attrName)) {
            document.documentElement.setAttribute(attrName, "on");
        }
    } catch (e) {
        // глушим ошибки, чтобы не падать при инициализации
    }
})();



