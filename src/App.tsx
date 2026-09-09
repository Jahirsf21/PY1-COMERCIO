import { Routes, Route } from "react-router-dom";
import Catalog from "./features/catalog/Catalog";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Catalog />} />
    </Routes>
  );
}

export default App;
