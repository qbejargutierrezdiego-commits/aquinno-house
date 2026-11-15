package com.aquinnohouse.reservas;

import java.time.LocalDate;
import java.time.LocalTime;

public record Reserva(
        Long id,
        String nombre,
        String celular,
        String servicio,
        LocalDate fecha,
        LocalTime hora
) {
}