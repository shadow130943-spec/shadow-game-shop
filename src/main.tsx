import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "@/integrations/supabase/client";

// Apply admin-uploaded favicon if one is set in branding_assets
(async () => {
  try {
    const { data } = await supabase
      .from("branding_assets")
      .select("image_url")
      .eq("key", "favicon")
      .maybeSingle();
    if (data?.image_url) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = data.image_url;
    }
  } catch {
    // ignore
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
