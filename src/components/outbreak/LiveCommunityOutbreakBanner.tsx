import React, { useState, useEffect } from 'react';
import { Radio, AlertTriangle, ShieldAlert, ChevronRight, Building2, X, MapPin } from 'lucide-react';
import { db } from '../../db/db';
import { OutbreakAlert, LanguageCode } from '../../types';

interface LiveCommunityOutbreakBannerProps {
  currentLang: LanguageCode;
  onOpenOutbreaks?: () => void;
}

export const LiveCommunityOutbreakBanner: React.FC<LiveCommunityOutbreakBannerProps> = ({
  currentLang,
  onOpenOutbreaks
}) => {
  const [activeAlerts, setActiveAlerts] = useState<OutbreakAlert[]>([]);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    loadActiveAlerts();
  }, []);

  const loadActiveAlerts = async () => {
    try {
      const alerts = await db.alerts.where('status').equals('active').toArray();
      // Sort Red alerts first
      alerts.sort((a, b) => (b.riskLevel === 'red' ? 1 : 0) - (a.riskLevel === 'red' ? 1 : 0));
      setActiveAlerts(alerts);
    } catch (e) {
      console.warn('Failed to load active outbreak alerts for banner', e);
    }
  };

  if (isDismissed || activeAlerts.length === 0) {
    return null;
  }

  const primaryAlert = activeAlerts[0];
  const isRed = primaryAlert.riskLevel === 'red';

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 border-2 shadow-lg transition-all animate-in slide-in-from-top-3 duration-300 font-sans ${
        isRed
          ? 'bg-gradient-to-r from-red-950 via-red-900 to-rose-900 border-red-500/50 text-white'
          : 'bg-gradient-to-r from-amber-950 via-amber-900 to-orange-900 border-amber-500/50 text-white'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              isRed ? 'bg-red-600 text-white animate-bounce' : 'bg-amber-600 text-white'
            }`}
          >
            <Radio className="w-5 h-5 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-white/20 text-white">
                {isRed ? '🚨 ACTIVE COMMUNITY OUTBREAK' : '⚠️ DISEASE CLUSTER NOTICE'}
              </span>
              <span className="text-xs font-bold text-white/90 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-white/70" />
                {primaryAlert.center?.villageName || 'Local Sector'} (~{primaryAlert.radiusKm} km)
              </span>
              {activeAlerts.length > 1 && (
                <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full text-white/90">
                  +{activeAlerts.length - 1} more
                </span>
              )}
            </div>

            <h4 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
              <span>{primaryAlert.diseaseName?.[currentLang] || primaryAlert.diseaseName?.en}</span>
              <span className="text-xs font-normal text-white/80">({primaryAlert.caseCount} confirmed cases)</span>
            </h4>

            {primaryAlert.contributingFacility && (
              <p className="text-[11px] text-white/80 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-white/70" />
                <span>Verified & broadcasted by <strong>{primaryAlert.contributingFacility.clinicName}</strong></span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {onOpenOutbreaks && (
            <button
              onClick={onOpenOutbreaks}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl shadow-md transition cursor-pointer active:scale-95 ${
                isRed
                  ? 'bg-white text-red-950 hover:bg-red-50'
                  : 'bg-white text-amber-950 hover:bg-amber-50'
              }`}
            >
              <span>{currentLang === 'gu' ? 'સાવચેતીના પગલાં જુઓ' : currentLang === 'hi' ? 'सुरक्षा उपाय देखें' : 'View Safety Measures'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center transition cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
