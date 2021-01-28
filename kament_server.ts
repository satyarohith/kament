import { serve } from "https://deno.land/x/sift@0.1.3/mod.ts";
import { kamentApiRoutes } from "./mod.ts";

serve(kamentApiRoutes);
