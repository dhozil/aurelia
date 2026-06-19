import { createFileRoute } from "@tanstack/react-router";
import AureliaApp from "@/components/aurelia/AureliaApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurelia — The Golden Oracle of Web3" },
      {
        name: "description",
        content:
          "Aurelia is an AI Oracle on GenLayer that lets you talk to the blockchain in natural language.",
      },
      { property: "og:title", content: "Aurelia — The Golden Oracle of Web3" },
      {
        property: "og:description",
        content: "Ask anything. Understand everything. The blockchain speaks through Aurelia.",
      },
    ],
  }),
  component: AureliaApp,
});
