package com.aquinnohouse.reservas;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalTime;
import java.util.Set;

// Esta anotación sirve para que Spring reconozca y gestione
// esta clase como un servicio de la aplicación.
@Service
public class ReservaService {

    // Permite acceder al componente que almacena las reservas.
    private final ReservaRepository repositorio;

    private final DisponibilidadService disponibilidad;

    // Spring proporciona el repositorio y el servicio que consulta los horarios.
    public ReservaService(ReservaRepository repositorio, DisponibilidadService disponibilidad) {
        this.repositorio = repositorio;
        this.disponibilidad = disponibilidad;
    }

    // Consulta las reservas almacenadas y las devuelve ordenadas.
    public List<Reserva> listar() {
        return repositorio.listar();
    }

    // Comprueba el identificador y solicita la eliminación de la reserva.
    public void cancelar(Long id) {

        // El identificador debe ser un número positivo.
        if (id == null || id <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El identificador de la reserva no es válido.");
        }

        // El repositorio devuelve false cuando la reserva no existe.
        boolean eliminada = repositorio.eliminar(id);

        if (!eliminada) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "La reserva que deseas cancelar no existe.");
        }
    }

    // Valida los datos y registra una reserva.
    // synchronized permite atender una creación a la vez en este servicio,
    // para que la comprobación del horario y el registro no se intercalen
    // con otra solicitud de creación.
    public synchronized Reserva crear(Reserva solicitud) {

        // La solicitud debe contener los datos de la reserva.
        if (solicitud == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Debes proporcionar los datos de la reserva.");
        }

        // Elimina los espacios al inicio y al final de los datos de contacto.
        String nombre = solicitud.nombre() == null
                ? ""
                : solicitud.nombre().strip();

        String celular = solicitud.celular() == null
                ? ""
                : solicitud.celular().strip();

        // El nombre debe tener entre 2 y 80 caracteres.
        if (nombre.length() < 2 || nombre.length() > 80) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El nombre debe tener entre 2 y 80 caracteres.");
        }

        // El celular peruano debe tener nueve dígitos y comenzar con 9.
        if (!celular.matches("9[0-9]{8}")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El celular debe tener nueve dígitos y comenzar con 9.");
        }

        // Solo se aceptan los servicios ofrecidos por la barbería.
        String servicio = solicitud.servicio();

        if (servicio == null
                || !Set.of("clasico", "moderno", "corte-barba")
                        .contains(servicio)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Selecciona un servicio válido.");
        }

        // La hora debe corresponder a un turno exacto de media hora,
        // desde las 09:00 hasta las 17:30.
        LocalTime hora = solicitud.hora();

        if (hora == null
                || hora.isBefore(LocalTime.of(9, 0))
                || hora.isAfter(LocalTime.of(17, 30))
                || hora.getMinute() % 30 != 0
                || hora.getSecond() != 0
                || hora.getNano() != 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Selecciona un turno de media hora entre las 09:00 y las 17:30.");
        }

        // Reutiliza la consulta para validar la fecha y comprobar
        // que el horario siga libre y todavía no haya pasado.
        List<LocalTime> disponibles = disponibilidad.consultarDisponibilidad(solicitud.fecha());

        if (!disponibles.contains(hora)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El horario ya no está disponible. Selecciona otro.");
        }

        // El identificador se genera en el repositorio.
        // Los datos del cliente se guardan después de superar las validaciones.
        Reserva nueva = new Reserva(
                null,
                nombre,
                celular,
                servicio,
                solicitud.fecha(),
                hora);

        return repositorio.guardar(nueva);
    }
}