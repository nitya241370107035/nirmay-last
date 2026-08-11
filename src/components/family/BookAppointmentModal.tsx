import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Hospital,
  MapPin,
  Phone,
  Stethoscope,
  CheckCircle2,
  X,
  Building2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { db, bookClinicAppointment } from '../../db/db';
import { EnrolledClinic, Patient } from '../../types';

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  selectedPatientId?: number;
  familyId?: number;
  onAppointmentBooked?: () => void;
}

export function BookAppointmentModal({
  isOpen,
  onClose,
  patients,
  selectedPatientId,
  familyId,
  onAppointmentBooked
}: BookAppointmentModalProps) {
  const [clinics, setClinics] = useState<EnrolledClinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<EnrolledClinic | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>('General OPD & Triage');
  const [preferredDate, setPreferredDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [reasonForVisit, setReasonForVisit] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [bookedAptId, setBookedAptId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadClinics();
      if (selectedPatientId && patients.length > 0) {
        const found = patients.find((p) => p.id === selectedPatientId);
        if (found) setSelectedPatient(found);
      } else if (patients.length > 0) {
        setSelectedPatient(patients[0]);
      }
    }
  }, [isOpen, selectedPatientId, patients]);

  const loadClinics = async () => {
    try {
      const allClinics = await db.enrolledClinics.toArray();
      setClinics(allClinics);
      if (allClinics.length > 0 && !selectedClinic) {
        setSelectedClinic(allClinics[0]);
        if (allClinics[0].departments.length > 0) {
          setSelectedDept(allClinics[0].departments[0]);
        }
      }
    } catch (err) {
      console.error('Error loading enrolled clinics:', err);
    }
  };

  const handleSelectClinic = (clinic: EnrolledClinic) => {
    setSelectedClinic(clinic);
    if (clinic.departments.length > 0) {
      setSelectedDept(clinic.departments[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinic) {
      alert('Please select a healthcare clinic.');
      return;
    }
    if (!selectedPatient) {
      alert('Please select a patient.');
      return;
    }
    if (!reasonForVisit.trim()) {
      alert('Please enter reason for visit.');
      return;
    }

    setIsSubmitting(true);
    try {
      const aptId = `APT-${Math.floor(10000 + Math.random() * 90000)}`;
      await db.clinicAppointments.add({
        appointmentId: aptId,
        citizenId: selectedPatient.id,
        familyId: familyId || selectedPatient.familyId,
        patientName: selectedPatient.name,
        age: selectedPatient.age,
        gender: (selectedPatient.gender as any) || 'Male',
        phone: contactPhone || '9876543210',
        clinicFacilityCode: selectedClinic.facilityCode,
        clinicName: selectedClinic.name,
        department: selectedDept,
        preferredDate,
        reasonForVisit: reasonForVisit.trim(),
        status: 'Pending',
        requestedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setBookedAptId(aptId);
      setBookingSuccess(true);
      if (onAppointmentBooked) onAppointmentBooked();
    } catch (err) {
      console.error('Error booking appointment:', err);
      alert('Failed to book appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setBookingSuccess(false);
    setReasonForVisit('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-800">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl border border-white/20">
              <Calendar className="w-6 h-6 text-teal-200" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black">
                Book Clinic & Hospital Appointment
              </h3>
              <p className="text-xs text-teal-100">
                Direct OPD slot reservation with government & enrolled health centers
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {bookingSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-300">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <span className="font-mono text-xs font-bold bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                Booking ID: {bookedAptId}
              </span>
              <h4 className="text-xl font-black text-slate-900 mt-2">
                Appointment Requested Successfully!
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                Your appointment request for <strong>{selectedPatient?.name}</strong> at <strong>{selectedClinic?.name}</strong> on <strong>{preferredDate}</strong> has been submitted. The clinic reception will assign your time slot shortly.
              </p>
            </div>

            <div className="pt-3">
              <button
                onClick={handleResetAndClose}
                className="px-6 py-2.5 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                Done & View Appointments
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
            {/* 1. Patient Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-700" />
                1. Select Patient / Family Member *
              </label>
              <select
                value={selectedPatient?.id || ''}
                onChange={(e) => {
                  const p = patients.find((pat) => pat.id === parseInt(e.target.value));
                  if (p) setSelectedPatient(p);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.age}y / {p.gender}) {p.relationToHead ? `- ${p.relationToHead}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Clinic Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Hospital className="w-3.5 h-3.5 text-teal-700" />
                2. Choose Enrolled Clinic / Hospital *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-2xl">
                {clinics.map((c) => {
                  const isSelected = selectedClinic?.facilityCode === c.facilityCode;
                  return (
                    <button
                      key={c.facilityCode}
                      type="button"
                      onClick={() => handleSelectClinic(c)}
                      className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-500/30'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {c.name}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded">
                          {c.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {c.cityDistrict} ({c.state})
                      </p>
                      <p className="text-[10px] text-teal-700 font-medium mt-0.5">
                        MO: {c.doctorInCharge}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Department & Preferred Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department / Specialty *
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                >
                  {(selectedClinic?.departments || ['General OPD & Triage']).map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Preferred Appointment Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono"
                />
              </div>
            </div>

            {/* 4. Contact Phone & Reason */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Visit / Symptoms *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe your health symptoms or reason for consultation (e.g. Fever for 3 days, cough, routine diabetes review)..."
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-800 to-teal-900 hover:from-teal-700 hover:to-teal-800 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Confirm Appointment Request'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
