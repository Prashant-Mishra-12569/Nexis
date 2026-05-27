export function Orbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      <div
        className="radial-orb animate-float-slow"
        style={{
          width: 520,
          height: 520,
          background: "#00ff9d",
          top: -160,
          left: -120,
          opacity: 0.18,
        }}
      />
      <div
        className="radial-orb animate-float-slow"
        style={{
          width: 600,
          height: 600,
          background: "#00ff9d",
          bottom: -220,
          right: -160,
          opacity: 0.12,
          animationDelay: "-7s",
        }}
      />
      <div
        className="radial-orb"
        style={{
          width: 380,
          height: 380,
          background: "#3b82f6",
          top: "40%",
          left: "60%",
          opacity: 0.08,
        }}
      />
      <div className="absolute inset-0 grid-bg opacity-40" />
    </div>
  );
}
