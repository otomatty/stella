import { createFileRoute } from "@tanstack/react-router";
import { SupportPage } from "@/components/public/SupportPage";

export const Route = createFileRoute("/support")({
  component: SupportPage,
});
