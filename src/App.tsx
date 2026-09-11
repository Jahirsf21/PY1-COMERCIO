import { Routes, Route } from "react-router-dom";
import Catalog from "./features/catalog/Catalog";
import ProductDetailPage from "./features/product-detail/ProductDetailPage";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Catalog />} />
      <Route path="/producto/:productId" element={<ProductDetailPage />} />
    </Routes>
  );
}

export default App;
