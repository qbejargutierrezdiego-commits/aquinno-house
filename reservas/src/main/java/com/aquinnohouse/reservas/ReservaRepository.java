package com.aquinnohouse.reservas;

import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Repository;

// Esta anotación sirve para que Spring reconozca y gestione
// esta clase como un repositorio de reservas.
@Repository
public class ReservaRepository {

    // Almacena las reservas en memoria usando su identificador como clave.
    // ConcurrentHashMap permite realizar operaciones individuales de forma
    // segura cuando llegan varias solicitudes al mismo tiempo.
    private final ConcurrentHashMap<Long, Reserva> reservas =
            new ConcurrentHashMap<>();

    // Genera identificadores consecutivos sin repetirlos durante la ejecución,
    // incluso cuando se registran reservas desde solicitudes simultáneas.
    private final AtomicLong secuencia = new AtomicLong(0);

    // Guarda una reserva y devuelve sus datos con el identificador asignado.
    public Reserva guardar(Reserva reserva) {

        // Incrementa la secuencia para obtener el identificador de la nueva cita.
        Long id = secuencia.incrementAndGet();

        // Crea una nueva reserva con el identificador y los datos recibidos.
        // Los campos de un record no se modifican después de crear el objeto.
        Reserva nueva = new Reserva(
                id,
                reserva.nombre(),
                reserva.celular(),
                reserva.servicio(),
                reserva.fecha(),
                reserva.hora()
        );

        // Almacena la reserva usando el identificador como clave.
        reservas.put(id, nueva);

        // Devuelve la reserva registrada.
        return nueva;
    }

    // Devuelve las reservas ordenadas por fecha y hora.
    public List<Reserva> listar() {
        return reservas.values().stream()
                .sorted(Comparator.comparing(Reserva::fecha)
                        .thenComparing(Reserva::hora))
                .toList();
    }

    // Elimina una reserva a partir de su identificador.
    public boolean eliminar(Long id) {

        // Devuelve true si se eliminó una reserva existente.
        // Si el identificador no estaba registrado, devuelve false.
        return reservas.remove(id) != null;
    }
}