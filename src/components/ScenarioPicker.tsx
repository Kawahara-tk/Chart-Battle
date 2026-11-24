import { MOCK_SCENARIOS } from "@/lib/market/mock-data";
import type { ScenarioId } from "@/lib/market/types";
import { Icon } from "./Icon";

const previews = {
  rising:
    "M2 31C10 31 10 22 18 25S30 22 35 21S45 15 50 18S58 10 66 12S72 6 78 5",
  spike: "M2 30C12 30 15 27 22 29S30 2 39 3S43 30 53 29S66 34 78 27",
  calm: "M2 22C9 15 14 27 21 21S32 17 39 23S48 16 56 21S68 25 78 20",
};

export function ScenarioPicker({
  selected,
  onSelect,
}: {
  selected: ScenarioId;
  onSelect: (id: ScenarioId) => void;
}) {
  return (
    <section className="scenario-section" aria-labelledby="scenario-title">
      <div className="section-label">
        <h2 id="scenario-title">市場を選ぶ</h2>
        <span>3つのモック市場</span>
      </div>
      <div className="scenario-list">
        {MOCK_SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            className={`scenario-card ${scenario.id === selected ? "is-selected" : ""}`}
            aria-pressed={scenario.id === selected}
            onClick={() => onSelect(scenario.id)}
          >
            <div className="scenario-top">
              <span className="scenario-symbol">{scenario.symbol}</span>
              <svg
                width="80"
                height="38"
                viewBox="0 0 80 38"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d={previews[scenario.id]}
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
              {scenario.id === selected && (
                <span className="selected-check">
                  <Icon name="check" size={12} />
                </span>
              )}
            </div>
            <strong>{scenario.name}</strong>
            <span className="scenario-name">{scenario.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
