"use client";

export default function TestPage() {
  return (
    <div style={{ padding: "32px" }}>
      <h1>Button Test</h1>
      <button
        onClick={() => {
          console.log("✅ CLICK WORKS IN FRESH PROJECT!");
          alert("Success! Buttons work!");
        }}
        style={{
          backgroundColor: "#059669",
          color: "white",
          padding: "8px 16px",
          borderRadius: "4px",
          border: "none",
          cursor: "pointer"
        }}
      >
        Test Button
      </button>
    </div>
  );
}
