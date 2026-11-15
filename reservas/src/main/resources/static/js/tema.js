"use strict";

// Aplica el tema antes de dibujar la página para evitar un destello claro.
(() => {
    const raiz = document.documentElement;
    const preferencia = window.matchMedia("(prefers-color-scheme: dark)");
    const clave = "aquinno-house-tema";
    let elegido = null;
    try {
        const guardado = localStorage.getItem(clave);
        if (guardado === "dark" || guardado === "light") elegido = guardado;
    } catch { /* El tema funciona aunque el navegador no permita guardar preferencias. */ }

    function aplicar(tema) {
        raiz.setAttribute("data-bs-theme", tema);
        const boton = document.querySelector("#cambiarTema");
        if (boton) {
            boton.setAttribute("aria-pressed", String(tema === "dark"));
            boton.setAttribute("aria-label", tema === "dark" ? "Activar modo claro" : "Activar modo oscuro");
            boton.textContent = tema === "dark" ? "☀ Modo claro" : "☾ Modo oscuro";
        }
    }

    aplicar(elegido || (preferencia.matches ? "dark" : "light"));
    document.addEventListener("DOMContentLoaded", () => {
        aplicar(raiz.getAttribute("data-bs-theme"));
        document.querySelector("#cambiarTema")?.addEventListener("click", () => {
            elegido = raiz.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
            aplicar(elegido);
            try { localStorage.setItem(clave, elegido); } catch { /* Conserva la elección durante esta visita. */ }
        });
    });

    // Sigue los cambios del dispositivo hasta que el usuario elija un tema.
    preferencia.addEventListener("change", evento => {
        if (!elegido) aplicar(evento.matches ? "dark" : "light");
    });
})();
