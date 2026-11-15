"use strict";
// Define la dirección de la API dentro del mismo servidor de la página.
const URL_RESERVAS = "/api/reservas";

// Envía una solicitud al servidor y procesa su respuesta.
async function solicitarAPI(ruta = "", opciones = {}) {
    let respuesta;

    try {
        respuesta = await fetch(URL_RESERVAS + ruta, opciones);
    } catch {
        throw new Error(
            "No se pudo conectar con el servidor. Comprueba que esté encendido."
        );
    }

    // Comprueba si el servidor rechazó la solicitud.
    if (!respuesta.ok) {
        let mensaje = "No se pudo completar la operación.";

        if (respuesta.status === 400) {
            mensaje = "Revisa los datos ingresados y la fecha seleccionada.";
        } else if (respuesta.status === 404) {
            mensaje = "La reserva solicitada no existe.";
        } else if (respuesta.status === 409) {
            mensaje = "El horario ya no está disponible. Selecciona otro.";
        }

        throw new Error(mensaje);
    }

    // Una cancelación correcta devuelve el estado 204, sin contenido.
    if (respuesta.status === 204) {
        return null;
    }

    // Convierte la respuesta JSON en datos que JavaScript puede utilizar.
    return respuesta.json();
}
// Se definen los servicios y sus precios de demostración.
const servicios = {
    clasico: { nombre: "Corte clásico", precio: 25 },
    moderno: { nombre: "Corte moderno", precio: 30 },
    "corte-barba": { nombre: "Corte y barba", precio: 40 }
};

// Se establece la clave utilizada para guardar las reservas.
const claveReservas = "aquinno-house-reservas";

// Se obtienen los elementos del formulario y de la lista.
const formulario = document.querySelector("#formularioReserva");
const campoNombre = document.querySelector("#nombre");
const campoCelular = document.querySelector("#celular");
const campoServicio = document.querySelector("#servicio");
const campoFecha = document.querySelector("#fecha");
const campoHorario = document.querySelector("#horario");
const estadoHorarios = document.querySelector("#estadoHorarios");
const mensajeReserva = document.querySelector("#mensajeReserva");
const listaReservas = document.querySelector("#listaReservas");
const sinReservas = document.querySelector("#sinReservas");

// Se obtienen los elementos del modal de confirmación.
const elementoModal = document.querySelector("#modalConfirmacion");
const confirmacionNombre = document.querySelector("#confirmacionNombre");
const confirmacionServicio = document.querySelector("#confirmacionServicio");
const confirmacionFecha = document.querySelector("#confirmacionFecha");
const confirmacionHora = document.querySelector("#confirmacionHora");
const confirmacionPrecio = document.querySelector("#confirmacionPrecio");

// Se prepara el modal si los componentes de Bootstrap están disponibles.
const modalConfirmacion = window.bootstrap?.Modal
    ? new window.bootstrap.Modal(elementoModal)
    : null;

// Se obtiene la fecha local sin convertirla a la zona horaria UTC.
function obtenerFechaLocal(fecha = new Date()) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

// Se construye una fecha y hora en la zona local del navegador.
function crearFechaHora(fecha, horario = "00:00") {
    return new Date(`${fecha}T${horario}:00`);
}

// Se verifica que la fecha exista y no corresponda al pasado o al domingo.
function esFechaPermitida(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const fechaSeleccionada = crearFechaHora(fecha);

    return (
        !Number.isNaN(fechaSeleccionada.getTime()) &&
        obtenerFechaLocal(fechaSeleccionada) === fecha &&
        fecha >= obtenerFechaLocal() &&
        fechaSeleccionada.getDay() !== 0
    );
}

// Se generan 18 horarios, desde las 09:00 hasta las 17:30.
function generarHorarios() {
    const horarios = [];

    for (let minutos = 9 * 60; minutos < 18 * 60; minutos += 30) {
        const hora = String(Math.floor(minutos / 60)).padStart(2, "0");
        const minuto = String(minutos % 60).padStart(2, "0");

        horarios.push(`${hora}:${minuto}`);
    }

    return horarios;
}

const horariosAtencion = generarHorarios();

// Se muestra la hora en un formato fácil de leer.
function formatearHora(horario) {
    return crearFechaHora("2000-01-01", horario).toLocaleTimeString("es-PE", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

// Se presenta la fecha utilizando el formato local.
function formatearFecha(fecha) {
    return crearFechaHora(fecha).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

// Se muestra un mensaje sin interpretar su contenido como HTML.
function mostrarMensaje(texto, tipo = "danger") {
    mensajeReserva.className = `alert alert-${tipo} mt-3`;
    mensajeReserva.textContent = texto;
}

// Se retira el mensaje anterior.
function limpiarMensaje() {
    mensajeReserva.className = "mt-3";
    mensajeReserva.textContent = "";
}

// Se recuperan las reservas y se comprueba su estructura básica.
function leerReservas() {
    try {
        const contenido = localStorage.getItem(claveReservas);
        const reservas = contenido === null ? [] : JSON.parse(contenido);

        const datosValidos =
            Array.isArray(reservas) &&
            reservas.every((reserva) =>
                reserva !== null &&
                typeof reserva === "object" &&
                typeof reserva.id === "string" &&
                typeof reserva.nombre === "string" &&
                typeof reserva.celular === "string" &&
                Object.hasOwn(servicios, reserva.servicio) &&
                /^\d{4}-\d{2}-\d{2}$/.test(reserva.fecha) &&
                horariosAtencion.includes(reserva.horario) &&
                Number.isFinite(reserva.precio)
            );

        if (!datosValidos) {
            throw new Error("Los datos guardados no son válidos.");
        }

        return reservas;
    } catch {
        mostrarMensaje(
            "No se pudieron leer las reservas guardadas. " +
            "Se debe revisar el almacenamiento del navegador antes de continuar."
        );

        return null;
    }
}

// Se guardan los cambios y se informa si falla el almacenamiento.
function guardarReservas(reservas) {
    try {
        localStorage.setItem(claveReservas, JSON.stringify(reservas));
        return true;
    } catch {
        mostrarMensaje(
            "No se pudieron guardar los cambios. " +
            "Comprueba que el navegador permita el almacenamiento local."
        );

        return false;
    }
}

// Se comprueba si una fecha y hora ya tienen una reserva.
function estaOcupado(reservas, fecha, horario) {
    return reservas.some((reserva) =>
        reserva.fecha === fecha && reserva.horario === horario
    );
}

// Se actualizan los horarios según la fecha, la hora actual y las reservas.
function actualizarHorarios() {
    const horarioAnterior = campoHorario.value;

    campoFecha.min = obtenerFechaLocal();
    campoHorario.replaceChildren(new Option("Selecciona un horario", ""));
    campoHorario.disabled = true;

    if (!campoFecha.value) {
        campoHorario.options[0].textContent = "Selecciona primero una fecha";
        estadoHorarios.textContent =
            "Las citas duran 30 minutos. El último horario comienza a las 5:30 p. m.";
        return;
    }

    if (!esFechaPermitida(campoFecha.value)) {
        estadoHorarios.textContent =
            "Selecciona una fecha válida, desde hoy, de lunes a sábado.";
        return;
    }

    const reservas = leerReservas();

    if (reservas === null) {
        estadoHorarios.textContent = "No se pudo consultar la disponibilidad.";
        return;
    }

    const ahora = new Date();
    let disponibles = 0;

    horariosAtencion.forEach((horario) => {
        const ocupado = estaOcupado(reservas, campoFecha.value, horario);
        const pasado = crearFechaHora(campoFecha.value, horario) <= ahora;

        let etiqueta = formatearHora(horario);

        if (ocupado) {
            etiqueta += " — Ocupado";
        } else if (pasado) {
            etiqueta += " — Horario pasado";
        } else {
            disponibles++;
        }

        const opcion = new Option(etiqueta, horario);
        opcion.disabled = ocupado || pasado;
        campoHorario.add(opcion);
    });

    campoHorario.disabled = disponibles === 0;

    const opcionAnterior = Array.from(campoHorario.options).find(
        (opcion) => opcion.value === horarioAnterior && !opcion.disabled
    );

    if (opcionAnterior) {
        campoHorario.value = horarioAnterior;
    }

    estadoHorarios.textContent = disponibles > 0
        ? `Horarios disponibles: ${disponibles}. Las citas duran 30 minutos.`
        : "No quedan horarios disponibles para esta fecha.";
}

// Se genera el texto utilizado en los mensajes y en la lista.
function obtenerResumen(reserva) {
    const servicio = servicios[reserva.servicio];

    return (
        `${reserva.nombre} · ${servicio.nombre} · ` +
        `${formatearFecha(reserva.fecha)} · ` +
        `${formatearHora(reserva.horario)} · ` +
        `S/ ${reserva.precio.toFixed(2)}`
    );
}

// Se completa el modal únicamente después de guardar la reserva.
function mostrarConfirmacion(reserva) {
    // Se conserva una confirmación visible si Bootstrap no pudo cargarse.
    if (!modalConfirmacion) {
        mostrarMensaje(
            `Reserva confirmada: ${obtenerResumen(reserva)}.`,
            "success"
        );
        return;
    }

    confirmacionNombre.textContent = reserva.nombre;
    confirmacionServicio.textContent = servicios[reserva.servicio].nombre;
    confirmacionFecha.textContent = formatearFecha(reserva.fecha);
    confirmacionHora.textContent = formatearHora(reserva.horario);
    confirmacionPrecio.textContent = `S/ ${reserva.precio.toFixed(2)}`;

    modalConfirmacion.show();
}

// Se muestran las reservas mediante elementos creados de forma segura.
function mostrarReservas() {
    const reservas = leerReservas();

    listaReservas.replaceChildren();

    if (reservas === null) {
        sinReservas.hidden = false;
        sinReservas.textContent = "No se pudo cargar la lista de reservas.";
        return;
    }

    sinReservas.textContent =
        "Aún no hay reservas registradas en este navegador.";
    sinReservas.hidden = reservas.length > 0;

    reservas.sort((primera, segunda) =>
        `${primera.fecha} ${primera.horario}`.localeCompare(
            `${segunda.fecha} ${segunda.horario}`
        )
    );

    reservas.forEach((reserva) => {
        const elemento = document.createElement("li");
        elemento.className = "list-group-item";

        const resumen = document.createElement("p");
        resumen.className = "mb-3";
        resumen.textContent = obtenerResumen(reserva);

        const botonCancelar = document.createElement("button");
        botonCancelar.type = "button";
        botonCancelar.className = "btn btn-outline-dark btn-sm";
        botonCancelar.textContent = "Cancelar";

        botonCancelar.setAttribute(
            "aria-label",
            `Cancelar la reserva de ${reserva.nombre} del ` +
            `${formatearFecha(reserva.fecha)} a las ${formatearHora(reserva.horario)}`
        );

        botonCancelar.addEventListener("click", () => {
            cancelarReserva(reserva.id);
        });

        elemento.append(resumen, botonCancelar);
        listaReservas.append(elemento);
    });
}

// Se solicita confirmación antes de eliminar una reserva.
function cancelarReserva(id) {
    const reservas = leerReservas();

    if (reservas === null) {
        return;
    }

    const reserva = reservas.find((elemento) => elemento.id === id);

    if (!reserva) {
        mostrarReservas();
        actualizarHorarios();
        mostrarMensaje("La reserva ya no está registrada.", "warning");
        return;
    }

    const confirmado = window.confirm(
        `¿Se desea cancelar esta reserva?\n\n${obtenerResumen(reserva)}`
    );

    if (!confirmado) {
        return;
    }

    // Se consultan nuevamente los datos antes de guardar la cancelación.
    const reservasActuales = leerReservas();

    if (reservasActuales === null) {
        return;
    }

    const reservasRestantes = reservasActuales.filter(
        (elemento) => elemento.id !== id
    );

    if (!guardarReservas(reservasRestantes)) {
        return;
    }

    mostrarReservas();
    actualizarHorarios();
    mostrarMensaje("La reserva se canceló correctamente.", "success");
}

// Se validan los datos y la disponibilidad antes de guardar.
function confirmarReserva(evento) {
    evento.preventDefault();
    limpiarMensaje();

    campoNombre.value = campoNombre.value.trim();
    campoCelular.value = campoCelular.value.trim();
    campoFecha.min = obtenerFechaLocal();

    if (!formulario.reportValidity()) {
        mostrarMensaje("Revisa los campos obligatorios y sus formatos.");
        return;
    }

    if (campoNombre.value.length < 2) {
        mostrarMensaje("El nombre debe tener al menos dos caracteres.");
        campoNombre.focus();
        return;
    }

    if (!/^9[0-9]{8}$/.test(campoCelular.value)) {
        mostrarMensaje(
            "El celular debe tener nueve dígitos y comenzar con 9."
        );
        campoCelular.focus();
        return;
    }

    if (!Object.hasOwn(servicios, campoServicio.value)) {
        mostrarMensaje("Selecciona uno de los servicios disponibles.");
        return;
    }

    if (!esFechaPermitida(campoFecha.value)) {
        actualizarHorarios();
        mostrarMensaje(
            "La fecha debe ser válida, desde hoy, de lunes a sábado."
        );
        return;
    }

    const horario = campoHorario.value;

    if (
        !horariosAtencion.includes(horario) ||
        crearFechaHora(campoFecha.value, horario) <= new Date()
    ) {
        actualizarHorarios();
        mostrarMensaje("Selecciona un horario disponible que no haya pasado.");
        return;
    }

    const reservas = leerReservas();

    if (reservas === null) {
        return;
    }

    if (estaOcupado(reservas, campoFecha.value, horario)) {
        actualizarHorarios();
        mostrarMensaje(
            "Ese horario ya está ocupado. Selecciona otro horario."
        );
        return;
    }

    const nuevaReserva = {
        id: crypto.randomUUID(),
        nombre: campoNombre.value,
        celular: campoCelular.value,
        servicio: campoServicio.value,
        fecha: campoFecha.value,
        horario: horario,
        precio: servicios[campoServicio.value].precio
    };

    if (!guardarReservas([...reservas, nuevaReserva])) {
        return;
    }

    formulario.reset();
    mostrarReservas();
    actualizarHorarios();
    mostrarConfirmacion(nuevaReserva);
}

// Se selecciona el servicio correspondiente al pulsar una tarjeta.
document.querySelectorAll("[data-servicio]").forEach((boton) => {
    boton.addEventListener("click", () => {
        campoServicio.value = boton.dataset.servicio;
        limpiarMensaje();
        window.location.hash = "reservas";
        campoNombre.focus({ preventScroll: true });
    });
});

// Se actualizan los horarios al cambiar la fecha.
campoFecha.addEventListener("change", () => {
    limpiarMensaje();
    actualizarHorarios();
});

// Se retiran los mensajes anteriores cuando se corrigen los campos.
formulario.addEventListener("input", limpiarMensaje);

// Se controla el envío y se conserva la validación del navegador.
formulario.noValidate = true;
formulario.addEventListener("submit", confirmarReserva);

// Se devuelve el foco al formulario después de cerrar el modal.
elementoModal.addEventListener("hidden.bs.modal", () => {
    formulario.querySelector('button[type="submit"]').focus({
        preventScroll: true
    });
});

// Se sincronizan los cambios realizados desde otra pestaña del mismo sitio.
window.addEventListener("storage", (evento) => {
    if (evento.key === claveReservas || evento.key === null) {
        mostrarReservas();
        actualizarHorarios();
    }
});

// Se revisa la disponibilidad cuando se regresa a la página.
window.addEventListener("focus", () => {
    mostrarReservas();
    actualizarHorarios();
});

// Se carga el estado inicial de la página.
mostrarReservas();
actualizarHorarios();