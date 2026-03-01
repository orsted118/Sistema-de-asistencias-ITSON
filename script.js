let alumnos = [];

const ESTADOS_ASISTENCIA = {
    P: { label: "Presente", className: "estado-presente", icon: "bi-check2-circle" },
    R: { label: "Retardo", className: "estado-retardo", icon: "bi-clock-history" },
    F: { label: "Falta", className: "estado-falta", icon: "bi-x-circle" }
};

function normalizarCadena(valor) {
    return typeof valor === "string" ? valor.trim() : "";
}

function normalizarMatricula(valor) {
    return normalizarCadena(valor).toLowerCase();
}

function escaparHtml(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizarAlumno(item) {
    const nombre = item && typeof item.nombre === "string" ? item.nombre.trim() : "";
    const correo = item && typeof item.correo === "string" ? item.correo.trim() : "";
    const matricula = item && typeof item.matricula === "string" ? item.matricula.trim() : "";
    const asistencias = item && Array.isArray(item.asistencias)
        ? item.asistencias.filter(x => x === "P" || x === "R" || x === "F")
        : [];

    if (!nombre || !correo || !matricula) return null;
    return { nombre, correo, matricula, asistencias };
}

function existeMatricula(matricula, indiceExcluir) {
    const matriculaNormalizada = normalizarMatricula(matricula);
    return alumnos.some((alumno, indice) => {
        if (indice === indiceExcluir) return false;
        return normalizarMatricula(alumno.matricula) === matriculaNormalizada;
    });
}

function cargarAlumnos() {
    try {
        const guardados = localStorage.getItem("alumnos");
        if (!guardados) {
            alumnos = [];
            return;
        }

        const parseados = JSON.parse(guardados);
        alumnos = Array.isArray(parseados)
            ? parseados.map(normalizarAlumno).filter(Boolean)
            : [];

        ordenar();
        guardar();
    } catch (error) {
        console.error("No se pudieron cargar los alumnos guardados:", error);
        alumnos = [];
    }
}

window.onload = function () {
    cargarAlumnos();
    render();
    activarEnvioConEnter();
};

function guardar() {
    try {
        localStorage.setItem("alumnos", JSON.stringify(alumnos));
    } catch (error) {
        console.error("No se pudieron guardar los alumnos:", error);
    }
}

function ordenar() {
    alumnos.sort((a, b) =>
        a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase())
    );
}

function limpiarFormulario() {
    const nombreInput = document.getElementById("nombreAlumno");
    const correoInput = document.getElementById("correoAlumno");
    const matriculaInput = document.getElementById("matriculaAlumno");

    if (nombreInput) nombreInput.value = "";
    if (correoInput) correoInput.value = "";
    if (matriculaInput) matriculaInput.value = "";
    if (nombreInput) nombreInput.focus();
}

function agregarAlumno() {
    const nombreInput = document.getElementById("nombreAlumno");
    const correoInput = document.getElementById("correoAlumno");
    const matriculaInput = document.getElementById("matriculaAlumno");

    const nombre = normalizarCadena(nombreInput ? nombreInput.value : "");
    const correo = normalizarCadena(correoInput ? correoInput.value : "");
    const matricula = normalizarCadena(matriculaInput ? matriculaInput.value : "");

    if (!nombre || !correo || !matricula) {
        alert("Completa todos los campos.");
        return;
    }

    if (!correo.includes("@")) {
        alert("Ingresa un correo valido.");
        return;
    }

    if (existeMatricula(matricula)) {
        alert("Esa matricula ya existe. Usa una matricula diferente.");
        return;
    }

    alumnos.push({
        nombre,
        correo,
        matricula,
        asistencias: []
    });

    ordenar();
    guardar();
    render();
    limpiarFormulario();
}

function editarAlumno(index) {
    const alumno = alumnos[index];
    if (!alumno) return;

    const nuevoNombre = prompt("Editar nombre:", alumno.nombre);
    if (nuevoNombre === null) return;

    const nuevoCorreo = prompt("Editar correo:", alumno.correo);
    if (nuevoCorreo === null) return;

    const nuevaMatricula = prompt("Editar matricula:", alumno.matricula);
    if (nuevaMatricula === null) return;

    const nombre = normalizarCadena(nuevoNombre);
    const correo = normalizarCadena(nuevoCorreo);
    const matricula = normalizarCadena(nuevaMatricula);

    if (!nombre || !correo || !matricula) {
        alert("No puedes dejar campos vacios.");
        return;
    }

    if (!correo.includes("@")) {
        alert("Ingresa un correo valido.");
        return;
    }

    if (existeMatricula(matricula, index)) {
        alert("Esa matricula ya pertenece a otro alumno.");
        return;
    }

    alumno.nombre = nombre;
    alumno.correo = correo;
    alumno.matricula = matricula;

    ordenar();
    guardar();
    render();
}

function limpiarListaCompleta() {
    if (alumnos.length === 0) {
        alert("La lista ya esta vacia.");
        return;
    }

    const confirmar = confirm(
        "Se eliminaran todos los alumnos de la lista. Esta accion no se puede deshacer. Deseas continuar?"
    );

    if (!confirmar) return;

    alumnos = [];
    guardar();
    render();
}

function marcar(index, tipo) {
    if (!ESTADOS_ASISTENCIA[tipo]) return;
    if (!alumnos[index] || !Array.isArray(alumnos[index].asistencias)) return;

    alumnos[index].asistencias.push(tipo);
    guardar();
    render();
}

function eliminarAlumno(index) {
    const alumno = alumnos[index];
    if (!alumno) return;

    const confirmar = confirm(`Se eliminara a ${alumno.nombre}. Deseas continuar?`);
    if (!confirmar) return;

    alumnos.splice(index, 1);
    guardar();
    render();
}

function calcularPorcentaje(asistencias) {
    const total = asistencias.length;
    if (total === 0) return 0;
    const presentes = asistencias.filter(x => x === "P").length;
    return Math.round((presentes / total) * 100);
}

function crearHistorialHtml(asistencias) {
    if (!asistencias.length) {
        return '<span class="sin-registros">Sin registros</span>';
    }

    const iconos = asistencias.map(estado => {
        const config = ESTADOS_ASISTENCIA[estado];
        if (!config) return "";

        return `
            <span class="estado-icono ${config.className}" title="${config.label}">
                <i class="bi ${config.icon}"></i>
            </span>
        `;
    }).join("");

    return `<div class="estado-historial">${iconos}</div>`;
}

function actualizarMetricas() {
    const totalAlumnos = alumnos.length;
    const totalAsistencias = alumnos.reduce((total, alumno) => total + alumno.asistencias.length, 0);
    const totalPresentes = alumnos.reduce(
        (total, alumno) => total + alumno.asistencias.filter(x => x === "P").length,
        0
    );
    const promedio = totalAsistencias > 0 ? Math.round((totalPresentes / totalAsistencias) * 100) : 0;

    const metricAlumnos = document.getElementById("metricAlumnos");
    const metricAsistencias = document.getElementById("metricAsistencias");
    const metricPromedio = document.getElementById("metricPromedio");
    const lastUpdateText = document.getElementById("lastUpdateText");

    if (metricAlumnos) metricAlumnos.textContent = String(totalAlumnos);
    if (metricAsistencias) metricAsistencias.textContent = String(totalAsistencias);
    if (metricPromedio) metricPromedio.textContent = `${promedio}%`;

    if (lastUpdateText) {
        const marcaTiempo = new Intl.DateTimeFormat("es-MX", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(new Date());
        lastUpdateText.textContent = `Actualizado: ${marcaTiempo}`;
    }
}

function render() {
    const tbody = document.querySelector("#tablaAsistencia tbody");
    if (!tbody) return;

    if (alumnos.length === 0) {
        tbody.innerHTML = `
            <tr class="estado-vacio">
                <td colspan="9">
                    <i class="bi bi-stars"></i>
                    Aun no hay alumnos en la lista. Registra el primero arriba.
                </td>
            </tr>
        `;
        actualizarMetricas();
        return;
    }

    const filas = alumnos.map((a, i) => {
        const asistencias = Array.isArray(a.asistencias) ? a.asistencias : [];
        const porcentaje = calcularPorcentaje(asistencias);
        const historial = crearHistorialHtml(asistencias);

        return `
            <tr>
                <td>${i + 1}</td>
                <td>${escaparHtml(a.nombre)}</td>
                <td>${escaparHtml(a.correo)}</td>
                <td>${escaparHtml(a.matricula)}</td>
                <td>${historial}</td>
                <td>
                    <div class="celda-acciones">
                        <button class="btn-presente" onclick="marcar(${i}, 'P')" title="Presente">
                            <i class="bi bi-check2"></i>
                        </button>
                        <button class="btn-retardo" onclick="marcar(${i}, 'R')" title="Retardo">
                            <i class="bi bi-clock"></i>
                        </button>
                        <button class="btn-falta" onclick="marcar(${i}, 'F')" title="Falta">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </td>
                <td class="porcentaje">${porcentaje}%</td>
                <td>
                    <button class="btn-editar" onclick="editarAlumno(${i})">
                        <i class="bi bi-pencil-square"></i>
                        Editar
                    </button>
                </td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarAlumno(${i})" title="Eliminar alumno">
                        <i class="bi bi-trash3"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    tbody.innerHTML = filas;
    actualizarMetricas();
}

function exportarExcel() {
    const datos = [
        ["#", "Nombre", "Correo", "Matricula", "Historial", "Porcentaje"]
    ];

    alumnos.forEach((alumno, index) => {
        const asistencias = Array.isArray(alumno.asistencias) ? alumno.asistencias : [];
        const porcentaje = calcularPorcentaje(asistencias);

        datos.push([
            index + 1,
            alumno.nombre,
            alumno.correo,
            alumno.matricula,
            asistencias.join(" "),
            `${porcentaje}%`
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(datos);
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSX.writeFile(wb, "Asistencia.xlsx");
}

function activarEnvioConEnter() {
    const ids = ["nombreAlumno", "correoAlumno", "matriculaAlumno"];
    const inputs = ids
        .map(id => document.getElementById(id))
        .filter(Boolean);

    inputs.forEach((input, index) => {
        input.addEventListener("keydown", event => {
            if (event.key !== "Enter") return;
            event.preventDefault();

            const siguiente = inputs[index + 1];
            if (siguiente) {
                siguiente.focus();
                return;
            }

            agregarAlumno();
        });
    });
}
