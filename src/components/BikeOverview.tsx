import type { BikeData, CategoryId } from "../domain/models";
import { categorySymbols } from "./categorySymbols";
export function BikeOverview({
  data,
  category,
  selectComponent,
}: {
  data: BikeData;
  category: CategoryId | null;
  selectComponent: (id: string) => void;
}) {
  const visibleSlots = data.slots.filter(
    (item) => !category || item.categoryId === category,
  );
  return (
    <>
      <div className="eyebrow">
        {category ? "ASSEMBLY INSPECTOR" : "BIKE OVERVIEW"}
        <span className="live-dot" />
      </div>
      <div className="overview-illustration" aria-hidden="true">
        {category ? categorySymbols[category] : "◇"}
        <span>01</span>
      </div>
      <h2>
        {category
          ? data.categories.find((item) => item.id === category)?.name
          : "Built for the ride.\nKnown down to the part."}
      </h2>
      <p className="overview-description">
        {category
          ? "Select a component on the bike or below to inspect its identity, usage and service history."
          : "A living record of your Hightower. Explore an assembly to see the components that make it yours."}
      </p>
      {category ? (
        <div className="assembly-list">
          {visibleSlots.map((item) => (
            <button key={item.id} onClick={() => selectComponent(item.id)}>
              <span>{item.name}</span>
              <span>↗</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <dl className="bike-overview-stats">
            <div>
              <dt>Components</dt>
              <dd>
                {data.slots.length}
                <span> individually addressable</span>
              </dd>
            </div>
            <div>
              <dt>Ride time</dt>
              <dd>
                {data.usage.cumulativeHours}
                <span> hours · mock usage</span>
              </dd>
            </div>
            <div>
              <dt>Known drivetrain</dt>
              <dd className="text-value">
                {data.bike.drivetrainDescription ?? "Not specified"}
              </dd>
            </div>
          </dl>
          <button
            className="start-card"
            onClick={() => selectComponent("suspension.fork")}
          >
            <span className="mini-label">FIRST VERTICAL SLICE</span>
            <strong>
              Get to know your fork <span>↗</span>
            </strong>
            <p>Fox 36 Performance Elite</p>
          </button>
        </>
      )}
      <div className="scope-note">
        <strong>Ready for real-world detail.</strong>
        <p>
          Unknown specifications stay unknown. The initial fork flow shows how
          component history and service calculations connect.
        </p>
      </div>
    </>
  );
}
