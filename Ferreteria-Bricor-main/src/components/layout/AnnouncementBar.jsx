import React from 'react';
import { Truck, ShieldCheck, MapPin } from 'lucide-react';

export default function AnnouncementBar() {
  return (
    <aside className="bricor-announcement" aria-label="Información comercial de servicio">
      <div className="uk-container">
        <div className="bricor-announcement-item">
          <Truck size={13} className="u-color-oxido" />
          <span>Despacho a pie de obra y entregas consolidadas</span>
        </div>
        <div className="bricor-announcement-item uk-visible@m">
          <ShieldCheck size={13} className="u-color-oliva-light" />
          <span>Asesoría técnica para compras mayoristas e instaladores</span>
        </div>
        <div className="bricor-announcement-item uk-visible@s">
          <MapPin size={13} className="u-color-piedra" />
          <span>Retiro en mostrador sin costo</span>
        </div>
      </div>
    </aside>
  );
}
