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
const botonEnviar = formulario.querySelector('button[type="submit"]');

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

// Se convierte una reserva del servicio al formato que usa la página.
// El servicio envía la hora como HH:mm:ss, por eso se conservan solo HH:mm.
function normalizarReserva(reserva) {
    return {
        id: reserva.id,
        nombre: reserva.nombre,
        celular: reserva.celular,
        servicio: reserva.servicio,
        fecha: reserva.fecha,
        horario: String(reserva.hora).slice(0, 5),
        precio: servicios[reserva.servicio]?.precio ?? 0
    };
}

// Se consultan al servicio todas las reservas registradas.
async function obtenerReservas() {
    const datos = await solicitarAPI();

    return datos.map(normalizarReserva);
}

// Se consultan al servicio los horarios libres de una fecha.
async function obtenerDisponibles(fecha) {
    const datos = await solicitarAPI(
        `/disponibilidad?fecha=${encodeURIComponent(fecha)}`
    );

    return datos.map((hora) => String(hora).slice(0, 5));
}

// Se evita que una respuesta lenta reemplace a una consulta más reciente.
let consultaHorarios = 0;

// Se actualizan los horarios según la disponibilidad que informa el servicio.
async function actualizarHorarios() {
    const consulta = ++consultaHorarios;
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

    estadoHorarios.textContent = "Consultando disponibilidad...";

    let libres;

    try {
        libres = await obtenerDisponibles(campoFecha.value);
    } catch (error) {
        if (consulta === consultaHorarios) {
            estadoHorarios.textContent = error.message;
        }
        return;
    }

    // Si el usuario cambió la fecha mientras se esperaba, se descarta esta respuesta.
    if (consulta !== consultaHorarios) {
        return;
    }

    const ahora = new Date();
    let disponibles = 0;

    horariosAtencion.forEach((horario) => {
        const libre = libres.includes(horario);
        const pasado = crearFechaHora(campoFecha.value, horario) <= ahora;

        let etiqueta = formatearHora(horario);

        if (libre) {
            disponibles++;
        } else if (pasado) {
            etiqueta += " — Horario pasado";
        } else {
            etiqueta += " — Ocupado";
        }

        const opcion = new Option(etiqueta, horario);
        opcion.disabled = !libre;
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
        `${reserva.nombre} · ${servicio ? servicio.nombre : reserva.servicio} · ` +
        `${formatearFecha(reserva.fecha)} · ` +
        `${formatearHora(reserva.horario)} · ` +
        `S/ ${reserva.precio.toFixed(2)}`
    );
}

// Se completa el modal únicamente después de que el servicio confirma la reserva.
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

// Se muestran las reservas que devuelve el servicio.
async function mostrarReservas() {
    let reservas;

    try {
        reservas = await obtenerReservas();
    } catch (error) {
        listaReservas.replaceChildren();
        sinReservas.hidden = false;
        sinReservas.textContent = error.message;
        return;
    }

    listaReservas.replaceChildren();

    sinReservas.textContent = "Aún no hay reservas registradas.";
    sinReservas.hidden = reservas.length > 0;

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
            cancelarReserva(reserva);
        });

        elemento.append(resumen, botonCancelar);
        listaReservas.append(elemento);
    });
}

// Se solicita confirmación y luego se pide al servicio cancelar la reserva.
async function cancelarReserva(reserva) {
    const confirmado = window.confirm(
        `¿Se desea cancelar esta reserva?\n\n${obtenerResumen(reserva)}`
    );

    if (!confirmado) {
        return;
    }

    try {
        await solicitarAPI(`/${reserva.id}`, { method: "DELETE" });
    } catch (error) {
        await mostrarReservas();
        await actualizarHorarios();
        mostrarMensaje(error.message, "warning");
        return;
    }

    await mostrarReservas();
    await actualizarHorarios();
    mostrarMensaje("La reserva se canceló correctamente.", "success");
}

// Se validan los datos en la página y se envía la reserva al servicio,
// que vuelve a validar y decide si el horario sigue libre.
async function confirmarReserva(evento) {
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

    const solicitud = {
        nombre: campoNombre.value,
        celular: campoCelular.value,
        servicio: campoServicio.value,
        fecha: campoFecha.value,
        hora: horario
    };

    botonEnviar.disabled = true;

    let creada;

    try {
        creada = await solicitarAPI("", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(solicitud)
        });
    } catch (error) {
        botonEnviar.disabled = false;
        await actualizarHorarios();
        mostrarMensaje(error.message);
        return;
    }

    botonEnviar.disabled = false;

    formulario.reset();
    await mostrarReservas();
    await actualizarHorarios();
    mostrarConfirmacion(normalizarReserva(creada));
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
    botonEnviar.focus({ preventScroll: true });
});

// Se revisa de nuevo el servicio cuando se regresa a la página.
window.addEventListener("focus", () => {
    mostrarReservas();
    actualizarHorarios();
});

// Se carga el estado inicial de la página.
mostrarReservas();
actualizarHorarios();