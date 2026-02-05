# 🏥 Sistema de Gestión Clínica Life

![Life Clinic Management System Banner](preview/logo.png)

> 🚀 **Demo en Vivo**: [life-clinic-management-system.vercel.app](https://life-clinic-management-system.vercel.app)

Un sistema de gestión clínica moderno, seguro y lleno de funcionalidades, construido con React 19, Firebase y Tailwind CSS. Optimiza las operaciones de tu consultorio con gestión integral de pacientes, programación de citas, historiales clínicos, facturación y control de acceso basado en roles.

---

## 📚 Índice

1. [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
2. [Estructura de Archivos Clave](#-estructura-de-archivos-clave)
3. [Roles y Permisos](#-roles-y-permisos)
4. [Manual de Usuario Paso a Paso](#-manual-de-usuario-paso-a-paso)
    - [Administrador (Dueño/Doctor)](#-administrador-dueñodoctor)
    - [Profesional de Salud](#-profesional-de-salud)
    - [Recepcionista](#-recepcionista)
5. [Instalación y Configuración](#-instalación-y-configuración)

---

## 🏗️ Arquitectura del Proyecto

Este proyecto utiliza una arquitectura **Serverless** basada en Firebase, con un frontend React (Vite).

### Stack Tecnológico
- **Frontend**: React 19, Tailwind CSS 4, Lucide React (Iconos).
- **Backend as a Service (BaaS)**: Firebase (Firestore, Auth, Storage).
- **Enrutamiento**: React Router v7 con protección de rutas (`ProtectedRoute`).
- **Estado Global**: React Context API (`AuthContext` para sesión).

### Modelo de Datos y Seguridad
El sistema es **Multi-Tenant (Multi-Inquilino)** lógico. Cada documento crítico (citas, usuarios, facturas) tiene un campo `businessId`.
- **Firestore Rules**: Las reglas de seguridad (`firestore.rules`) aseguran que un usuario solo pueda leer/ebscribir datos que coincidan con el `businessId` de su organización.
- **Roles**: `admin` (Owner), `doctor` (Profesional), `receptionist` (Recepcionista).

---

## 📂 Estructura de Archivos Clave

```
src/
├── App.jsx                 # Configuración principal de Rutas y Roles
├── components/             # UI Reutilizable
│   ├── ProtectedRoute.jsx  # HOC que valida autenticación y roles antes de mostrar páginas
│   └── ...
├── contexts/
│   └── AuthContext.jsx     # Manejo de sesión (Login, Logout, Usuario actual, BusinessId)
├── hooks/                  # Lógica encapsulada
│   ├── useAuth.js          # Hook para acceder al contexto de usuario
│   └── usePlanLimits.js    # Hook para validar límites del plan (ej. máx empleados)
├── pages/                  # Vistas principales
│   ├── auth/               # Login, Registro, Recuperar contraseña
│   ├── doctor/             # Panel del DOCTOR y ADMINISTRADOR
│   │   ├── Doctor.jsx      # Dashboard principal (KPIs)
│   │   ├── settings/       # Configuración de negocio y equipo
│   │   └── prescriptions/  # Historiales clínicos
│   └── receptionist/       # Panel del RECEPCIONISTA
│       ├── Receptionist.jsx# Dashboard principal
│       ├── billing/        # Facturación y Caja
│       └── token/          # Gestión de Cola/Turnos
└── utils/
    └── firestoreUtils.js   # Helpers para consultas seguras a Firebase
```

---

## 👥 Roles y Permisos

| Rol | Permisos Principales | Ruta Base |
| :--- | :--- | :--- |
| **Administrador (Owner)** | Todo lo del Profesional + Configuración de Negocio + Gestión de Equipo + Finanzas. | `/doctor` |
| **Profesional** | Ver sus Citas, Crear Historiales/Recetas, Ver Cola de Pacientes. | `/doctor` |
| **Recepcionista** | Agendar Citas, Facturación (Caja), Gestión de Cola, CRM Clientes. | `/receptionist` |

---

## 📖 Manual de Usuario Paso a Paso

### 👨‍💼 Administrador (Dueño/Doctor)

El Administrador es el "Dueño" de la clínica. Tiene control total.

**1. Configuración Inicial del Negocio:**
   - Ve a **"Configuración del Negocio"** (icono de engranaje).
   - Define el nombre de la clínica, dirección y horarios de atención.
   - Estos datos aparecerán en las facturas y en la página pública de reservas.

**2. Gestión del Equipo (Agregar Profesionales/Recepcionistas):**
   - Ve a **"Gestión de Equipo"** (icono de usuarios).
   - Haz clic en **"Nuevo Profesional"**.
   - Ingresa Nombre, Email y Rol (`doctor` para colegas, `receptionist` para asistentes).
   - El sistema generará un **Código de Invitación**.
   - **IMPORTANTE**: Copia el enlace y envíaselo a tu empleado. Ellos deben usar ese enlace para registrarse y quedar vinculados a tu clínica.

**3. Ver Métricas Financieras:**
   - Ve a **"Resumen Financiero"** para ver ingresos por día/semana y citas totales.

---

### 👨‍⚕️ Profesional de Salud

El Profesional se enfoca en la atención al paciente.

**1. Atender Citas del Día:**
   - En el Dashboard, verás "Citas de Hoy". Haz clic para ver la lista.
   - Al seleccionar un paciente, puedes ver su historial previo.

**2. Gestión de Cola (Pacientes en Espera):**
   - Ve a **"Cola de Clientes"**. Aquí verás quiénes han llegado a la clínica (check-in realizado por recepción).
   - Llama al siguiente paciente según su número de turno.

**3. Crear Historial Clínico / Receta:**
   - Ve a **"Nuevo Historial"** o desde la cita del paciente.
   - Llena los datos clínicos (diagnóstico, síntomas).
   - Agrega medicamentos desde el buscador.
   - Guarda el historial. Esto queda registrado permanentemente en el perfil del cliente.

---

### 👩‍💼 Recepcionista

El Recepcionista es el primer punto de contacto y maneja el flujo operativo.

**1. Agendar una Cita:**
   - Ve a **"Gestionar Citas"** o "Crear Cita".
   - Selecciona el Profesional y el horario disponible.
   - Ingresa los datos del paciente (o búscalo si ya existe).
   - Confirma la reserva.

**2. Check-in y Turnos (Cuando llega el paciente):**
   - Cuando el paciente llega a la clínica, ve a la cita y marca **"Generar Turno"** o Check-in.
   - Esto asigna un número (ej. A-001) y pone al paciente en la **"Cola de Clientes"** del doctor.

**3. Facturación y Cobro:**
   - Después de la consulta, ve a **"Facturación y Pagos"**.
   - Haz clic en **"Crear Factura"**.
   - Selecciona el paciente. Puedes usar "Autocompletar desde Cita" para jalar los servicios básicos.
   - Agrega items adicionales si es necesario.
   - Registra el pago y descarga el PDF o envíalo por correo.

**4. CRM de Clientes:**
   - En **"CRM de Clientes"** puedes ver la base de datos completa.
   - Accede al perfil de cualquier cliente para ver su historial de visitas, facturas y preferencias.

---

## ⚙️ Instalación y Configuración

### Prerrequisitos
- Node.js (v16+)
- Una cuenta de Google (para Firebase)

### 1. Clonar e Instalar
```bash
git clone https://github.com/tu-usuario/gestion-de-citas.git
cd gestion-de-citas
npm install
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz (básate en `env.example.txt`) y agrega tus credenciales de Firebase:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
...
```

### 3. Ejecutar en Desarrollo
```bash
npm run dev
```
Visita `http://localhost:5173`.

### 4. Deploy (Producción)
La aplicación está configurada para desplegarse fácilmente en **Vercel** o **Netlify**. Asegúrate de agregar las variables de entorno en el panel de control de tu proveedor de hosting.

---

<div align="center">
  <sub>Desarrollado con ❤️ para optimizar la salud.</sub>
</div>
