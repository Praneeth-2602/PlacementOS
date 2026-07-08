import type { Meta, StoryObj } from "@storybook/react";

import { ReadinessGauge } from "@/components/dashboard/readiness-gauge";

const meta: Meta<typeof ReadinessGauge> = {
  title: "Dashboard/ReadinessGauge",
  component: ReadinessGauge,
};

export default meta;
type Story = StoryObj<typeof ReadinessGauge>;

export const Default: Story = { args: { score: 72 } };
export const Low: Story = { args: { score: 35 } };
export const High: Story = { args: { score: 91 } };
