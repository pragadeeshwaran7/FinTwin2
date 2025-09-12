import React from "react";
import { MCPProvider } from './context/MCPProvider.jsx';
import Routes from "./Routes";

function App() {
  return (
    <Routes />
  );
}

function App() {
  return (
    <MCPProvider>
      {/* Your existing app content */}
      <div className="App">
        {/* Your routing and components */}
      </div>
    </MCPProvider>
  );
}

export default App;
