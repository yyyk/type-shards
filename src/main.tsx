import { StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { TooltipProvider } from "@/components/ui/tooltip"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider delay={300}>
      <Suspense fallback={<p>Loading...</p>}>
        <App />
      </Suspense>
    </TooltipProvider>
  </StrictMode>,
)
