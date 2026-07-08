import type { Meta, StoryObj } from "@storybook/react";

import { MotivationCard } from "@/components/dashboard/empty-states";

const meta: Meta<typeof MotivationCard> = {
  title: "Dashboard/MotivationCard",
  component: MotivationCard,
};

export default meta;
type Story = StoryObj<typeof MotivationCard>;

export const Default: Story = {};
