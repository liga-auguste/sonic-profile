import { Component } from "react";
import type { ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100dvh", gap: 12,
          fontFamily: "var(--mono)", color: "var(--text-dim)", padding: 24,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 13, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            data unavailable
          </div>
          <div style={{ fontSize: 12, maxWidth: 280 }}>
            snapshot failed to load · updates daily at 06:00 UTC
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
