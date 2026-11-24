import Link from "next/link";
import { Icon } from "./Icon";

export function GameHeader({
  onHome,
  onHelp,
}: {
  onHome?: () => void;
  onHelp?: () => void;
}) {
  const brand = (
    <>
      <span className="brand-icon">
        <Icon name="wave" size={24} />
      </span>
      <span>
        CHART<span className="brand-light">BATTLE</span>
      </span>
    </>
  );
  return (
    <header className="site-header">
      {onHome ? (
        <button
          className="brand brand-button"
          onClick={onHome}
          aria-label="ホームへ"
        >
          {brand}
        </button>
      ) : (
        <Link href="/" className="brand" aria-label="Chart Battle ホーム">
          {brand}
        </Link>
      )}
      <nav aria-label="メインメニュー">
        {onHelp && (
          <button className="text-button" onClick={onHelp}>
            あそび方
          </button>
        )}
        {onHome ? (
          <button className="text-button" onClick={onHome}>
            ホームへ
          </button>
        ) : (
          <span className="demo-label">DEMO</span>
        )}
      </nav>
    </header>
  );
}
