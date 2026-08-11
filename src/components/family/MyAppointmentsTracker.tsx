import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Hospital,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stethoscope,
  PlusCircle,
  RefreshCw
} from 'lucide-react';
import { db } from '../../db/db';
import { ClinicAppointment } from '../../types';

interface MyAppointmentsTrackerProps {
  familyId?: number;
  onOpenBookModal: () => void;
}

export function MyAppointmentsTracker({ familyId, onOpenBookModal }: MyAppointmentsTrackerProps) {
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAppointments();
  }, [familyId]);

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      let results: ClinicAppointment[] = [];
      if (familyId) {
        results = await db.clinicAppointments
          .where('familyId')
          .equals(familyId)
          .reverse()
          .sortBy('requestedAt');
      } else {
        results = await db.clinicAppointments.reverse().sortBy('requestedAt');
      }
      setAppointments(results);
    } catch (err) {
      console.error('Error loading my appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (confirm('Do you want to cancel this appointment request?')) {
      await db.clinicAppointments.update(id, {
        status: 'Cancelled',
        updatedAt: new Date().toISOString()
      });
      await loadAppointments();
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4 font-sans text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-800 rounded-2xl border border-teal-200">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base">
              My Clinic & OPD Appointments
            </h3>
            <p className="text-xs text-slate-500">
              Live status of consultations requested at community and hospital clinics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAppointments}
            className="p-2 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition"
            title="Refresh Appointments"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenBookModal}
            className="px-3.5 py-2 bg-teal-800 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Book New Appointment</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="p-8 text-center text-slate-500 space-y-2">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-medium">No clinic appointments booked yet.</p>
          <button
            onClick={onOpenBookModal}
            className="text-xs font-bold text-teal-800 hover:underline"
          >
            + Book your first clinic appointment
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {appointments.map((app) => (
            <div
              key={app.id || app.appointmentId}
              className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-teal-50/30 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-extrabold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    {app.appointmentId}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {app.patientName}
                  </h4>
                  <span className="text-xs text-slate-500">
                    ({app.age}y / {app.gender})
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      app.status === 'Confirmed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : app.status === 'Completed'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : app.status === 'Cancelled'
                        ? 'bg-red-50 text-red-800 border-red-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {app.status === 'Pending' && 'Pending Clinic Review'}
                    {app.status === 'Confirmed' && 'Slot Confirmed'}
                    {app.status === 'Completed' && 'Completed'}
                    {app.status === 'Cancelled' && 'Cancelled'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600">
                  <span className="font-medium text-teal-900 flex items-center gap-1">
                    <Hospital className="w-3.5 h-3.5 text-teal-700" />
                    {app.clinicName}
                  </span>
                  <span>•</span>
                  <span>{app.department}</span>
                  <span>•</span>
                  <span className="font-bold text-slate-800">Date: {app.preferredDate}</span>
                  {app.assignedSlot && (
                    <span className="font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded">
                      Time: {app.assignedSlot}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 italic">
                  "{app.reasonForVisit}"
                </p>
              </div>

              {app.status === 'Pending' && app.id && (
                <button
                  onClick={() => handleCancel(app.id!)}
                  className="text-xs text-red-600 hover:text-red-800 font-bold px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-xl transition cursor-pointer self-end sm:self-center"
                >
                  Cancel Request
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
