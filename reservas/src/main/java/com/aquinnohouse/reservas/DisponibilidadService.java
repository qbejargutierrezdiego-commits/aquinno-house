package com.aquinnohouse.reservas;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

// Esta anotación permite que Spring gestione el servicio de disponibilidad.
// Consulta los horarios de atención y las reservas existentes por fecha.
@Service
public class DisponibilidadService {

    private final ReservaRepository repositorio;

    // Spring proporciona el mismo repositorio utilizado para gestionar las reservas.
    public DisponibilidadService(ReservaRepository repositorio) {
        this.repositorio = repositorio;
    }

    // Devuelve los horarios disponibles para una fecha de atención.
    public List<LocalTime> consultarDisponibilidad(LocalDate fecha) {

        // Usa la hora de Perú para evaluar las fechas y los horarios.
        ZonedDateTime ahora = ZonedDateTime.now(
                ZoneId.of("America/Lima"));

        // La fecha es obligatoria y no puede ser anterior al día actual.
        if (fecha == null || fecha.isBefore(ahora.toLocalDate())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Selecciona una fecha de hoy en adelante.");
        }

        // La atención se realiza de lunes a sábado.
        if (fecha.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No hay atención los domingos.");
        }

        // Reúne los horarios que ya tienen una reserva en la fecha consultada.
        Set<LocalTime> horariosOcupados = repositorio.listar().stream()
                .filter(reserva -> reserva.fecha().equals(fecha))
                .map(Reserva::hora)
                .collect(Collectors.toSet());

        List<LocalTime> disponibles = new ArrayList<>();

        // Genera turnos de media hora desde las 09:00 hasta las 17:30.
        for (LocalTime hora = LocalTime.of(9, 0); hora.isBefore(LocalTime.of(18, 0)); hora = hora.plusMinutes(30)) {

            // Para el día actual, solo permite horarios que aún no han pasado.
            boolean esHorarioFuturo = fecha.isAfter(ahora.toLocalDate())
                    || hora.isAfter(ahora.toLocalTime());

            // Agrega el turno si está libre y todavía puede reservarse.
            if (esHorarioFuturo && !horariosOcupados.contains(hora)) {
                disponibles.add(hora);
            }
        }

        return disponibles;
    }

}
