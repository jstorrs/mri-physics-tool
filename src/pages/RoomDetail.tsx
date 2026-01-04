import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export default function RoomDetail() {
  const navigate = useNavigate();
  const { orgId, siteId, roomId } = useParams<{
    orgId: string;
    siteId: string;
    roomId: string;
  }>();

  // Data
  const room = useLiveQuery(
    () => roomId ? db.rooms.get(roomId) : undefined,
    [roomId]
  );

  const equipment = useLiveQuery(
    () => roomId ? db.equipment.where('roomId').equals(roomId).sortBy('name') : [],
    [roomId]
  );

  // Navigation
  const handleBack = () => {
    navigate(`/organizations/${orgId}/sites/${siteId}/rooms`);
  };

  const headerTitle = room?.name || 'Room';

  return (
    <>
      {/* Header */}
      <header className="drill-header">
        <button className="drill-header__back" onClick={handleBack}>
          ‹
        </button>
        <h1 className="drill-header__title">{headerTitle}</h1>
      </header>

      {/* Room Info */}
      {room && (
        <div className="room-info">
          {room.address && (
            <p className="room-info__detail">
              <strong>Location:</strong> {room.address}
            </p>
          )}
          {room.contactName && (
            <p className="room-info__detail">
              <strong>Contact:</strong> {room.contactName}
              {room.contactPhone && ` • ${room.contactPhone}`}
            </p>
          )}
          {room.notes && (
            <p className="room-info__detail">
              <strong>Notes:</strong> {room.notes}
            </p>
          )}
        </div>
      )}

      {/* Equipment Section */}
      <section className="room-section">
        <h2 className="room-section__title">Equipment</h2>
        <div className="drill-list">
          {equipment?.length === 0 && (
            <p className="room-section__empty">No equipment added yet</p>
          )}
          {equipment?.map(item => (
            <div key={item.id} className="drill-item">
              <span className="drill-item__text">{item.name}</span>
              {item.type && (
                <span className="drill-item__meta">{item.type}</span>
              )}
            </div>
          ))}
          <div className="drill-item drill-item--add">
            <span className="drill-item__text">+ Add Equipment</span>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="room-section">
        <h2 className="room-section__title">Recent Events</h2>
        <p className="room-section__empty">Events will be shown here</p>
      </section>
    </>
  );
}
