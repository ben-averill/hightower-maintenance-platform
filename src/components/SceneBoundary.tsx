import { Component, type ReactNode } from "react";

export class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="canvas-fallback">
        <strong>3D view unavailable</strong>
        <p>Your component list and service records are still available.</p>
      </div>
    ) : (
      this.props.children
    );
  }
}
