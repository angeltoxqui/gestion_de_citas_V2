import { useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import './DnDCalendar.css'

const locales = {
    'es': es,
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
})

const DragAndDropCalendar = withDragAndDrop(Calendar)

export default function DnDCalendar({ events, onEventDrop, onEventResize, onSelectEvent }) {
    const [view, setView] = useState(Views.WEEK)

    const eventStyleGetter = (event, start, end, isSelected) => {
        let backgroundColor = '#3b82f6' // blue-500 default

        switch (event.status) {
            case 'completed': backgroundColor = '#22c55e'; break; // green-500
            case 'cancelled': backgroundColor = '#ef4444'; break; // red-500
            case 'blocked': backgroundColor = '#ef4444'; break; // red-500
            case 'scheduled': backgroundColor = '#3b82f6'; break;
            default: backgroundColor = '#64748b'; // slate-500
        }

        if (event.type === 'blocked') {
            backgroundColor = '#cbd5e1'; // slate-300 for blocks? Or maybe red/grey pattern
            return {
                style: {
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', // red-500/10
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171', // red-400
                    borderRadius: '8px',
                    display: 'block'
                }
            }
        }

        return {
            style: {
                backgroundColor: `${backgroundColor}20`, // 20% opacity
                border: `1px solid ${backgroundColor}40`,
                color: 'white',
                borderRadius: '6px',
                display: 'block',
                backdropFilter: 'blur(4px)'
            }
        }
    }

    return (
        <div className="h-[600px] bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 calendar-container">
            <DragAndDropCalendar
                defaultDate={new Date()}
                defaultView={Views.WEEK}
                events={events}
                localizer={localizer}
                onEventDrop={onEventDrop}
                onEventResize={onEventResize}
                onSelectEvent={onSelectEvent}
                resizable
                selectable
                style={{ height: '100%' }}
                culture="es"
                messages={{
                    next: "Siguiente",
                    previous: "Anterior",
                    today: "Hoy",
                    month: "Mes",
                    week: "Semana",
                    day: "Día",
                    agenda: "Agenda",
                    date: "Fecha",
                    time: "Hora",
                    event: "Evento"
                }}
                eventPropGetter={eventStyleGetter}
                step={30}
                timeslots={2}
            />
        </div>
    )
}
