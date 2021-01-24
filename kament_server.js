import { serve } from "https://deno.land/x/sift@0.1.2/mod.ts";
import { kamentApiRoutes } from "./mod.js";

serve(kamentApiRoutes);
