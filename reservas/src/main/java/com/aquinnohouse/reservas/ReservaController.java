package com.aquinnohouse.reservas;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

// Esta anotación permite recibir solicitudes web y devolver
// los resultados como datos JSON.
@RestController

// Define la ruta base para las operaciones de reservas.
@RequestMapping("/api/reservas")
public class ReservaController {

    private final ReservaService servicio;

    private final DisponibilidadService disponibilidad;

    // Spring proporciona los dos servicios, cada uno con su responsabilidad.
    public ReservaController(ReservaService servicio, DisponibilidadService disponibilidad) {
        this.servicio = servicio;
        this.disponibilidad = disponibilidad;
    }

    // Atiende las solicitudes GET para consultar todas las reservas.
    @GetMapping
    public List<Reserva> listar() {
        return servicio.listar();
    }

    // Recibe la fecha desde la URL y consulta sus horarios disponibles.
    // La fecha debe tener el formato año-mes-día.
    @GetMapping("/disponibilidad")
    public List<LocalTime> consultarDisponibilidad(
            @RequestParam("fecha")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fecha) {

        return disponibilidad.consultarDisponibilidad(fecha);
    }

    // Recibe los datos JSON y los convierte en un objeto Reserva.
    // El servicio valida la solicitud antes de guardarla.
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Reserva crear(@RequestBody Reserva solicitud) {
        return servicio.crear(solicitud);
    }

    // Obtiene el identificador desde la URL y solicita la cancelación.
    // Si se completa, responde sin contenido y con el estado HTTP 204.
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelar(@PathVariable("id") Long id) {
        servicio.cancelar(id);
    }
}