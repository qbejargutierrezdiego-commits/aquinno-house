package com.aquinnohouse.reservas;

import static org.junit.jupiter.api.Assertions.*;
import java.time.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class SeparacionServiciosTest {
    private LocalDate fecha() {
        LocalDate fecha = LocalDate.now(ZoneId.of("America/Lima")).plusDays(1);
        return fecha.getDayOfWeek() == DayOfWeek.SUNDAY ? fecha.plusDays(1) : fecha;
    }

    @Test
    void reservarOcupaTurnoYCancelarLoLibera() {
        var repositorio = new ReservaRepository();
        var disponibilidad = new DisponibilidadService(repositorio);
        var reservas = new ReservaService(repositorio, disponibilidad);
        var controlador = new ReservaController(reservas, disponibilidad);
        LocalDate fecha = fecha();
        LocalTime hora = LocalTime.of(9, 0);
        assertEquals(18, controlador.consultarDisponibilidad(fecha).size());
        var reserva = controlador.crear(new Reserva(null, "Prueba", "999999999", "clasico", fecha, hora));
        assertFalse(controlador.consultarDisponibilidad(fecha).contains(hora));
        assertEquals(1, controlador.listar().size());
        controlador.cancelar(reserva.id());
        assertTrue(controlador.consultarDisponibilidad(fecha).contains(hora));
        assertTrue(controlador.listar().isEmpty());
    }

    @Test
    void rechazaDomingoYFechaPasada() {
        var servicio = new DisponibilidadService(new ReservaRepository());
        LocalDate domingo = fecha();
        while (domingo.getDayOfWeek() != DayOfWeek.SUNDAY) domingo = domingo.plusDays(1);
        final LocalDate fechaDomingo = domingo;
        assertThrows(ResponseStatusException.class, () -> servicio.consultarDisponibilidad(fechaDomingo));
        assertThrows(ResponseStatusException.class, () -> servicio.consultarDisponibilidad(fecha().minusYears(1)));
    }

    @Test
    void solicitudesSimultaneasNoDuplicanTurno() throws Exception {
        var repositorio = new ReservaRepository();
        var servicio = new ReservaService(repositorio, new DisponibilidadService(repositorio));
        var solicitud = new Reserva(null, "Prueba", "999999999", "clasico", fecha(), LocalTime.of(10, 0));
        var inicio = new CountDownLatch(1);
        var ejecutor = Executors.newFixedThreadPool(2);
        Callable<Boolean> crear = () -> {
            inicio.await();
            try { servicio.crear(solicitud); return true; }
            catch (ResponseStatusException error) {
                assertEquals(409, error.getStatusCode().value());
                return false;
            }
        };
        try {
            var primera = ejecutor.submit(crear);
            var segunda = ejecutor.submit(crear);
            inicio.countDown();
            assertNotEquals(primera.get(5, TimeUnit.SECONDS), segunda.get(5, TimeUnit.SECONDS));
            assertEquals(1, servicio.listar().size());
        } finally { ejecutor.shutdownNow(); }
    }
}
