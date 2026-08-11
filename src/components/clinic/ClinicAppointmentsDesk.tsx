import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stethoscope,
  Activity,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  Building2,
  CalendarCheck,
  CalendarX,
  FileText
} from 'lucide-react';
import { db, getAppointmentsForClinic, updateClinicAppointmentStatus } from '../../db/db';
import { ClinicAppointment } from '../../types';
import { ClinicProfile } from './ClinicLogin';

interface ClinicAppointmentsDeskProps {
  clinicProfile: ClinicProfile;
  onIntakePatientForTriage: (patientName: string, age: number, gender: 'Male' | 'Female', phone: string, complaint: string) => void;
  onOpenDoctorStationForPatient?: (patientName: string, age: number, gender: 'Male' | 'Female', phone: string, complaint: string) => void;
}

export function ClinicAppointmentsDesk({
  clinicProfile,
  onIntakePatientForTriage,
  onOpenDoctorStationForPatient
}: ClinicAppointmentsDeskProps) {
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Slot Assignment State for Pending Appointments
  const [slotInputs, setSlotInputs] = useState<Record<number, { slot: string; doctor: string }>>({});

  useEffect(() => {
    loadAppointments();
  }, [clinicProfile.facilityCode]);

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const results = await getAppointmentsForClinic(clinicProfile.facilityCode);
      setAppointments(results);
    } catch (err) {
      console.error('Error loading appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAppointment = async (appId: number) => {
    const slotData = slotInputs[appId] || {
      slot: '10:00 AM',
      doctor: clinicProfile.doctorInCharge
    };

    await updateClinicAppointmentStatus(appId, 'Confirmed', slotData.slot || '10:00 AM', slotData.doctor || clinicProfile.doctorInCharge);
    await loadAppointments();
  };

  const handleCancelAppointment = async (appId: number) => {
    if (confirm('Are you sure you want to cancel this appointment request?')) {
      await updateClinicAppointmentStatus(appId, 'Cancelled');
      await loadAppointments();
    }
  };

  const handleMarkCompleted = async (appId: number) => {
    await updateClinicAppointmentStatus(appId, 'Completed');
    await loadAppointments();
  };

  const filteredAppointments = appointments.filter((app) => {
    if (filterStatus !== 'all' && app.status.toLowerCase() !== filterStatus.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        app.patientName.toLowerCase().includes(q) ||
        app.appointmentId.toLowerCase().includes(q) ||
        app.phone.includes(q) ||
        app.reasonForVisit.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded-full">
              Appointments Desk
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-600 font-mono">
              {clinicProfile.clinicName} ({clinicProfile.facilityCode})
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Online Appointment & Intake Manager
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review online appointment bookings from citizens, assign time slots, and start patient triage on arrival.
          </p>
        </div>

        <button
          onClick={loadAppointments}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search appointments by Patient Name, ID, Phone, or Reason..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'all', label: `All (${appointments.length})` },
            { id: 'pending', label: '⏳ Pending Review' },
            { id: 'confirmed', label: '✅ Confirmed Slots' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                filterStatus === f.id
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Activity className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
            <p>Loading appointments queue...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mx-auto">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">No Appointments Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No citizen appointment bookings match the current filter criteria for this clinic.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAppointments.map((app) => (
              <div key={app.id || app.appointmentId} className="p-5 hover:bg-teal-50/30 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* Left: Patient and Booking Info */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border">
                      {app.appointmentId}
                    </span>
                    <h4 className="font-black text-slate-900 text-base flex items-center gap-1.5">
                      <User className="w-4 h-4 text-teal-700" />
                      {app.patientName}
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      ({app.age}y / {app.gender})
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      app.status === 'Confirmed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : app.status === 'Completed'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : app.status === 'Cancelled'
                        ? 'bg-red-50 text-red-800 border-red-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      {app.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {app.phone || 'No phone'}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      Requested: {app.preferredDate}
                    </span>
                    {app.assignedSlot && (
                      <span className="flex items-center gap-1 font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        <Clock className="w-3 h-3 text-teal-600" />
                        Slot: {app.assignedSlot}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700">
                    <strong>Reason for Consultation:</strong> {app.reasonForVisit}
                  </p>
                </div>

                {/* Right: Actions */}
                <div className="shrink-0 flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  {app.status === 'Pending' && app.id && (
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Time (e.g. 10:30 AM)"
                        defaultValue={slotInputs[app.id]?.slot || '10:30 AM'}
                        onChange={(e) => setSlotInputs({
                          ...slotInputs,
                          [app.id!]: { ...slotInputs[app.id!], slot: e.target.value, doctor: clinicProfile.doctorInCharge }
                        })}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs w-32 font-medium"
                      />
                      <button
                        onClick={() => handleConfirmAppointment(app.id!)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Slot</span>
                      </button>
                      <button
                        onClick={() => handleCancelAppointment(app.id!)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Cancel Appointment"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {app.status === 'Confirmed' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onIntakePatientForTriage(app.patientName, app.age, app.gender, app.phone, app.reasonForVisit)}
                        className="px-4 py-2 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Intake & Start Triage</span>
                      </button>

                      {app.id && (
                        <button
                          onClick={() => handleMarkCompleted(app.id!)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
